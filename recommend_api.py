import os
from datetime import datetime
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from sklearn.compose import _column_transformer as _ct
    if not hasattr(_ct, "_RemainderColsList"):
        class _RemainderColsList(list):
            pass

        _ct._RemainderColsList = _RemainderColsList
except Exception:
    pass


MODEL_PATH = os.getenv("MODEL_PATH", "cooling_recommender_rf.pkl")
WEIGHT_COST = float(os.getenv("WEIGHT_COST", "0.5"))
WEIGHT_EMISSIONS = float(os.getenv("WEIGHT_EMISSIONS", "0.3"))
WEIGHT_WATER = float(os.getenv("WEIGHT_WATER", "0.2"))
MAX_ALLOWED_VIOLATIONS = int(os.getenv("MAX_ALLOWED_VIOLATIONS", "0"))


class ScenarioInput(BaseModel):
    tempC: float
    rh: float
    itLoadKW: float
    electricityPrice: float
    waterPrice: float
    carbonFactor: float


class TechniqueResult(BaseModel):
    tech: str = Field(description="AirEconomizer | Evaporative | ChilledWater")
    feasible: bool = True
    energy_kwh: float = 0.0
    water_liters: float = 0.0
    cost: float = 0.0
    emissions_kg: float = 0.0
    violations: int = 0


class RecommendRequest(BaseModel):
    scenario: ScenarioInput
    current_technique: Optional[str] = Field(default=None, description="User's currently used cooling technique")
    technique_results: Optional[list[TechniqueResult]] = None
    simulation_hourly: Optional[dict] = Field(
        default=None,
        description="Optional hourly series from simulation. Expected keys: tempC, rh, itLoadKW (arrays).",
    )
    metrics_unit: str = Field(default="annual", description="annual or hourly")


def _to_float(value: float, default: float = 0.0) -> float:
    try:
        numeric = float(value)
        return numeric if np.isfinite(numeric) else default
    except Exception:
        return default


def _annualize(value: float, metrics_unit: str) -> float:
    numeric = _to_float(value)
    if metrics_unit == "hourly":
        return numeric * 24 * 365
    return numeric


def _normalize(values: list[float]) -> np.ndarray:
    arr = np.array(values, dtype=float)
    low = arr.min()
    high = arr.max()
    if high - low < 1e-12:
        return np.zeros_like(arr)
    return (arr - low) / (high - low)


def _mean_or_none(values: Optional[list[float]]) -> Optional[float]:
    if not values:
        return None
    cleaned = [float(v) for v in values if np.isfinite(float(v))]
    if not cleaned:
        return None
    return float(np.mean(cleaned))


def _enrich_rows(rows: list[TechniqueResult], metrics_unit: str) -> list[dict]:
    prepared = [
        {
            "tech": row.tech,
            "feasible": row.feasible,
            "energy_kwh": _to_float(row.energy_kwh),
            "water_liters": _to_float(row.water_liters),
            "cost": _to_float(row.cost),
            "emissions_kg": _to_float(row.emissions_kg),
            "violations": int(row.violations),
        }
        for row in rows
    ]

    cost_n = _normalize([row["cost"] for row in prepared])
    emissions_n = _normalize([row["emissions_kg"] for row in prepared])
    water_n = _normalize([row["water_liters"] for row in prepared])

    for idx, row in enumerate(prepared):
        row["score"] = WEIGHT_COST * cost_n[idx] + WEIGHT_EMISSIONS * emissions_n[idx] + WEIGHT_WATER * water_n[idx]
        row["annual_cost"] = _annualize(row["cost"], metrics_unit)
        row["annual_emissions_kg"] = _annualize(row["emissions_kg"], metrics_unit)
        row["annual_water_liters"] = _annualize(row["water_liters"], metrics_unit)

    return prepared


def _choose_best(prepared_rows: list[dict]) -> dict:
    feasible_rows = [row for row in prepared_rows if row["feasible"]]
    pool = feasible_rows if feasible_rows else prepared_rows
    return min(pool, key=lambda row: row["score"])


def _is_row_feasible(row: dict) -> bool:
    return bool(row.get("feasible", False)) and int(row.get("violations", 0)) <= MAX_ALLOWED_VIOLATIONS


def _find_row_by_tech(prepared_rows: list[dict], tech_name: str) -> Optional[dict]:
    for row in prepared_rows:
        if str(row.get("tech")) == str(tech_name):
            return row
    return None


def _money(value: float) -> str:
    return f"${value:,.0f}"


def _num(value: float) -> str:
    return f"{value:,.0f}"


def _build_user_reasons(scenario: dict, best: dict, alternatives: list[dict]) -> list[str]:
    reasons = [
        f"Based on your current conditions, the suggested cooling technique is {best['tech']}.",
        f"Feasibility check result: {best['tech']} is valid for this scenario with {best['violations']} constraint violations.",
    ]

    if scenario["carbonFactor"] >= 0.5:
        reasons.append(
            f"Because your grid carbon level is high, this supports keeping {best['tech']} to better control environmental impact."
        )
    if scenario["electricityPrice"] >= 0.15:
        reasons.append(
            f"Because your electricity price is high, this supports keeping {best['tech']} for lower expected running cost."
        )
    if scenario["rh"] >= 70:
        reasons.append(
            f"Because humidity is high, {best['tech']} is preferred for more stable performance in humid conditions."
        )
    if scenario["itLoadKW"] >= 1400:
        reasons.append(
            f"Because IT load is high, {best['tech']} is preferred for better reliability under heavy thermal demand."
        )

    for alt in alternatives:
        cost_diff = alt["annual_cost"] - best["annual_cost"]
        emis_diff = alt["annual_emissions_kg"] - best["annual_emissions_kg"]
        water_diff = alt["annual_water_liters"] - best["annual_water_liters"]

        cost_text = (
            f"can save about {_money(cost_diff)} per year"
            if cost_diff > 0
            else f"may cost about {_money(abs(cost_diff))} more per year"
        )
        emis_text = (
            f"reduce emissions by about {_num(emis_diff)} kg CO2 per year"
            if emis_diff > 0
            else f"increase emissions by about {_num(abs(emis_diff))} kg CO2 per year"
        )
        water_text = (
            f"save about {_num(water_diff)} liters of water per year"
            if water_diff > 0
            else f"use about {_num(abs(water_diff))} more liters of water per year"
        )

        reasons.append(
            f"Compared with {alt['tech']}, choosing {best['tech']} {cost_text}, {emis_text}, and {water_text}."
        )

    return reasons[:8]


def _build_future_impact_paragraph(best: dict) -> str:
    year_1_cost = best["annual_cost"]
    year_1_emissions = best["annual_emissions_kg"]
    year_1_water = best["annual_water_liters"]

    year_3_cost = 3 * year_1_cost
    year_3_emissions = 3 * year_1_emissions
    year_3_water = 3 * year_1_water

    year_5_cost = 5 * year_1_cost
    year_5_emissions = 5 * year_1_emissions
    year_5_water = 5 * year_1_water

    return (
        f"If similar conditions continue, using {best['tech']} is expected to result in around {_money(year_1_cost)} annual operating cost, "
        f"{_num(year_1_emissions)} kg CO2 emissions, and {_num(year_1_water)} liters of water use in Year 1. "
        f"Over 3 years, this becomes approximately {_money(year_3_cost)} cost, {_num(year_3_emissions)} kg CO2, and {_num(year_3_water)} liters water. "
        f"Over 5 years, it reaches approximately {_money(year_5_cost)} cost, {_num(year_5_emissions)} kg CO2, and {_num(year_5_water)} liters water. "
        "This provides a long-term view for budget planning, sustainability targets, and cooling reliability."
    )


def _build_comparison_table(prepared_rows: list[dict]) -> list[dict]:
    ordered = sorted(prepared_rows, key=lambda row: row["score"])
    return [
        {
            "tech": row["tech"],
            "feasible": row["feasible"],
            "score": row["score"],
            "cost": row["cost"],
            "emissions_kg": row["emissions_kg"],
            "water_liters": row["water_liters"],
            "violations": row["violations"],
            "annual_cost": row["annual_cost"],
            "annual_emissions_kg": row["annual_emissions_kg"],
            "annual_water_liters": row["annual_water_liters"],
        }
        for row in ordered
    ]


app = FastAPI(title="Cooling Recommender API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # allow all origins (dev); tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    artifact = joblib.load(MODEL_PATH)
except Exception as exc:
    artifact = None
    load_error = str(exc)
else:
    load_error = None


@app.get("/health")
def health() -> dict:
    if artifact is None:
        return {"status": "error", "model_loaded": False, "model_path": MODEL_PATH, "error": load_error}
    return {"status": "ok", "model_loaded": True, "model_path": MODEL_PATH, "features": artifact.get("feature_cols")}


@app.post("/recommend")
def recommend(payload: RecommendRequest) -> dict:
    if artifact is None:
        raise HTTPException(status_code=500, detail=f"Model failed to load from '{MODEL_PATH}': {load_error}")

    model = artifact["model"]
    feature_cols = artifact["feature_cols"]

    scenario_dict = payload.scenario.model_dump()

    if not payload.simulation_hourly:
        raise HTTPException(
            status_code=422,
            detail=(
                "simulation_hourly is required. Run simulation first and provide hourly arrays "
                "for tempC, rh, and itLoadKW."
            ),
        )

    avg_temp = _mean_or_none(payload.simulation_hourly.get("tempC"))
    avg_rh = _mean_or_none(payload.simulation_hourly.get("rh"))
    avg_it = _mean_or_none(payload.simulation_hourly.get("itLoadKW"))

    if avg_temp is None or avg_rh is None or avg_it is None:
        raise HTTPException(
            status_code=422,
            detail=(
                "simulation_hourly must include non-empty numeric arrays for tempC, rh, and itLoadKW."
            ),
        )

    scenario_dict["tempC"] = avg_temp
    scenario_dict["rh"] = avg_rh
    scenario_dict["itLoadKW"] = avg_it

    n_hours = len(payload.simulation_hourly.get("tempC") or [])
    print(f"\n{'='*60}")
    print(f"  🔧 ML RECOMMEND — AVERAGES FROM simulation_hourly ({n_hours} hours)")
    print(f"{'='*60}")
    print(f"  avg tempC        : {avg_temp:.2f} °C")
    print(f"  avg rh           : {avg_rh:.2f} %")
    print(f"  avg itLoadKW     : {avg_it:.4f} kW")
    print(f"  electricityPrice : {scenario_dict.get('electricityPrice', 'N/A')} USD/kWh")
    print(f"  waterPrice       : {scenario_dict.get('waterPrice', 'N/A')} USD/L")
    print(f"  carbonFactor     : {scenario_dict.get('carbonFactor', 'N/A')} kgCO2/kWh")
    print(f"{'='*60}\n")

    frame = pd.DataFrame([scenario_dict])[feature_cols]

    prediction = str(model.predict(frame)[0])
    print(f"  🤖 ML prediction : {prediction}")
    print(f"  current_technique: {payload.current_technique or 'not provided'}\n")
    response = {
        "current_technique": payload.current_technique,
        "generated_at_utc": datetime.utcnow().isoformat() + "Z",
        "model_recommendation": prediction,
        "why_this_is_recommended": [
            f"Recommended technique: {prediction}.",
            "This recommendation uses average hourly values from simulation for temperature, humidity, and IT load, plus your electricity/water/carbon settings.",
        ],
        "future_impact_paragraph": (
            "Future impact details are available when technique comparison metrics are provided in the request."
        ),
    }

    if payload.technique_results:
        metrics_unit = payload.metrics_unit.lower().strip()
        if metrics_unit not in {"hourly", "annual"}:
            metrics_unit = "annual"

        prepared = _enrich_rows(payload.technique_results, metrics_unit)
        comparison_table = _build_comparison_table(prepared)

        model_row = _find_row_by_tech(prepared, prediction)
        feasible_rows = [row for row in prepared if _is_row_feasible(row)]

        if model_row and _is_row_feasible(model_row):
            final_choice = model_row
            decision_source = "ml_feasible"
        elif feasible_rows:
            final_choice = min(feasible_rows, key=lambda row: row["score"])
            decision_source = "fallback_scoring_due_to_infeasible_ml"
        else:
            final_choice = model_row if model_row else _choose_best(prepared)
            decision_source = "ml_no_feasible_options"

        alternatives = sorted(
            [row for row in prepared if row["tech"] != final_choice["tech"]],
            key=lambda row: row["score"],
        )

        user_reasons = _build_user_reasons(scenario_dict, final_choice, alternatives)
        if payload.current_technique:
            if payload.current_technique == final_choice["tech"]:
                user_reasons.insert(
                    0,
                    f"Your current technique is {payload.current_technique}, and the recommendation is to continue using the same technique.",
                )
                user_reasons.insert(
                    1,
                    f"No switch is needed right now because {payload.current_technique} already matches the best option for your current conditions.",
                )
                user_reasons.insert(
                    2,
                    f"Recommended action: keep {payload.current_technique} and focus on optimization (setpoints, control tuning, and maintenance) to improve performance further.",
                )
            else:
                user_reasons.insert(
                    0,
                    f"Your current technique is {payload.current_technique}, but the suggested technique is {final_choice['tech']} for better overall performance.",
                )
        if decision_source == "fallback_scoring_due_to_infeasible_ml":
            user_reasons.insert(
                0,
                f"The initial recommendation was {prediction}, but that option was not feasible for this case, so the best feasible alternative was selected.",
            )
        elif decision_source == "ml_feasible":
            user_reasons.insert(
                0,
                f"Recommended technique is {prediction}, and it is feasible for this case, so it remains the final recommendation.",
            )
        else:
            user_reasons.insert(
                0,
                f"Recommended technique is {prediction}. No feasible alternatives were available, so it is retained.",
            )

        future_paragraph = _build_future_impact_paragraph(final_choice)

        response.update(
            {
                "model_recommendation": final_choice["tech"],
                "why_this_is_recommended": user_reasons,
                "future_impact_paragraph": future_paragraph,
                "comparison_table": comparison_table,
            }
        )
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")