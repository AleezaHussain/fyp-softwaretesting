import os
from datetime import datetime
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
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
    technique_results: Optional[list[TechniqueResult]] = None
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


def _money(value: float) -> str:
    return f"${value:,.0f}"


def _num(value: float) -> str:
    return f"{value:,.0f}"


def _build_user_reasons(scenario: dict, best: dict, alternatives: list[dict]) -> list[str]:
    reasons = [
        f"{best['tech']} is selected because it gives the best overall balance for your current conditions.",
        f"It is feasible for this scenario with {best['violations']} safety/performance violations.",
    ]

    if scenario["carbonFactor"] >= 0.5:
        reasons.append("Carbon intensity is high, so cleaner operation is prioritized to reduce environmental impact.")
    if scenario["electricityPrice"] >= 0.15:
        reasons.append("Electricity price is high, so lower running-cost operation is prioritized.")
    if scenario["rh"] >= 70:
        reasons.append("Humidity is high, so the recommendation favors techniques with better stability in humid conditions.")
    if scenario["itLoadKW"] >= 1400:
        reasons.append("IT load is high, so reliability under heavier thermal demand is prioritized.")

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

        reasons.append(f"Compared to {alt['tech']}, this choice {cost_text}, {emis_text}, and {water_text}.")

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
    frame = pd.DataFrame([scenario_dict])[feature_cols]

    prediction = str(model.predict(frame)[0])

    response = {
        "generated_at_utc": datetime.utcnow().isoformat() + "Z",
        "recommended_technique": prediction,
        "why_this_is_recommended": [
            f"{prediction} is recommended because it best fits the current operating conditions.",
            "The recommendation is based on practical outcomes such as cost, emissions, water usage, and feasibility."
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
        best = _choose_best(prepared)
        alternatives = sorted([row for row in prepared if row["tech"] != best["tech"]], key=lambda row: row["score"])

        user_reasons = _build_user_reasons(scenario_dict, best, alternatives)
        future_paragraph = _build_future_impact_paragraph(best)
        comparison_table = _build_comparison_table(prepared)

        response.update(
            {
                "recommended_technique": best["tech"],
                "why_this_is_recommended": user_reasons,
                "future_impact_paragraph": future_paragraph,
                "comparison_table": comparison_table,
            }
        )

    return response
