import os
import json
from datetime import datetime
from typing import Optional
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

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

# ── Load .env ─────────────────────────────────────────────────────────────────
from pathlib import Path

def _load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v

_load_env(Path(__file__).resolve().parent / ".env")
_load_env(Path(__file__).resolve().parent / ".env.local")

MODEL_PATH = os.getenv("MODEL_PATH", "cooling_recommender_rf.pkl")
WEIGHT_COST = float(os.getenv("WEIGHT_COST", "0.5"))
WEIGHT_EMISSIONS = float(os.getenv("WEIGHT_EMISSIONS", "0.3"))
WEIGHT_WATER = float(os.getenv("WEIGHT_WATER", "0.2"))
MAX_ALLOWED_VIOLATIONS = int(os.getenv("MAX_ALLOWED_VIOLATIONS", "0"))

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
# Dedicated key for ML justification + future impact — separate from advisory/chat key
ML_GROQ_API_KEY = (
    os.getenv("ML_GROQ_API_KEY")
    or os.getenv("GRAPH_EXPLANATION_GROQ_API_KEY")
    or os.getenv("GROQ_API_KEY", "")
)
GROQ_MODEL_CHAIN = [m.strip() for m in os.getenv("GROQ_MODEL_CHAIN", "").split(",") if m.strip()] or [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-8b-8192",
    "gemma2-9b-it",
]


def _groq_call(prompt: str, system: str, max_tokens: int = 700) -> str:
    """Shared Groq API caller using ML_GROQ_API_KEY with model fallback chain."""
    if not ML_GROQ_API_KEY:
        return ""
    model_errors = []
    for model_name in GROQ_MODEL_CHAIN:
        body = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.25,
            "max_tokens": max_tokens,
        }
        req = urlrequest.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {ML_GROQ_API_KEY}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 FYP-ML-Recommender/1.0",
            },
            method="POST",
        )
        try:
            with urlrequest.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            text = data["choices"][0]["message"]["content"].strip()
            if text:
                print(f"[ML LLM] Used model: {model_name}")
                return text
        except Exception as e:
            model_errors.append(f"{model_name}: {e}")
            continue
    raise RuntimeError(" | ".join(model_errors))


def _llm_justification(
    recommended: str,
    current: str,
    best_row: dict,
    alternatives: list[dict],
    scenario: dict,
    simulation_context: dict,
) -> list[str]:
    """Use Groq LLM (ML_GROQ_API_KEY) to generate authoritative, data-grounded justification."""
    if not ML_GROQ_API_KEY:
        return []

    ctx = simulation_context or {}

    # ── Current technique failure evidence ────────────────────────────────────
    airflow_pct      = ctx.get("airflow_violation_pct")
    total_viol_hrs   = ctx.get("total_violation_hours")
    hotspots         = ctx.get("hotspot_racks")
    total_racks      = ctx.get("total_racks")
    max_rack_kw      = ctx.get("max_rack_load_kw")
    violation_msg    = ctx.get("violation_message", "")
    cooling_status   = ctx.get("cooling_adequacy_status", "")
    critical_hrs     = ctx.get("critical_hours")
    failed_gates     = ctx.get("failed_gates") or []

    # ── Current technique real metrics ────────────────────────────────────────
    curr_cost      = ctx.get("current_annual_cost")
    curr_emissions = ctx.get("current_annual_emissions")
    curr_water     = ctx.get("current_annual_water")
    curr_pue       = ctx.get("current_pue")

    # ── Build detailed head-to-head comparison lines ─────────────────────────
    alt_lines = []
    for alt in alternatives:
        cost_diff  = best_row["annual_cost"] - alt["annual_cost"]
        emis_diff  = best_row["annual_emissions_kg"] - alt["annual_emissions_kg"]
        water_diff = best_row["annual_water_liters"] - alt["annual_water_liters"]

        cost_verdict  = f"SAVES ${abs(cost_diff):,.0f}/yr" if cost_diff < 0 else f"costs ${abs(cost_diff):,.0f}/yr MORE"
        emis_verdict  = f"LOWER by {abs(emis_diff):,.0f} kg CO2/yr" if emis_diff < 0 else f"higher by {abs(emis_diff):,.0f} kg CO2/yr"
        water_verdict = f"LESS by {abs(water_diff):,.0f} L/yr" if water_diff < 0 else f"more by {abs(water_diff):,.0f} L/yr"

        # Add feasibility note for the alternative
        alt_feasible = alt.get("feasible", True)
        alt_violations = alt.get("violations", 0)
        feasibility_note = ""
        if not alt_feasible or int(alt_violations) > 0:
            feasibility_note = f" [NOTE: {alt['tech']} has {alt_violations} violations — NOT feasible]"

        alt_lines.append(
            f"\n{recommended} vs {alt['tech']}{feasibility_note}:\n"
            f"  Cost:      {recommended} {cost_verdict} (${best_row['annual_cost']:,.0f} vs ${alt['annual_cost']:,.0f})\n"
            f"  Emissions: {recommended} emissions {emis_verdict} ({best_row['annual_emissions_kg']:,.0f} vs {alt['annual_emissions_kg']:,.0f} kg CO2)\n"
            f"  Water:     {recommended} uses water {water_verdict} ({best_row['annual_water_liters']:,.0f} vs {alt['annual_water_liters']:,.0f} L)\n"
            f"  Feasible:  {recommended}=YES(0 violations) vs {alt['tech']}={'YES' if alt_feasible else 'NO'}({alt_violations} violations)"
        )

    # ── Build failure section ─────────────────────────────────────────────────
    failure_block = ""
    if airflow_pct not in (None, 0, "0", "0.0", 0.0):
        failure_block += f"- Airflow violations: {airflow_pct}% of all hours ({total_viol_hrs} hours) — current technique is physically incapable\n"
    if hotspots and int(hotspots) > 0:
        failure_block += f"- Rack hotspots: {hotspots} out of {total_racks} racks overheating (peak rack load: {max_rack_kw:.1f} kW)\n"
    if violation_msg:
        failure_block += f"- Simulation alert: {str(violation_msg)[:180]}\n"
    if cooling_status and cooling_status not in ("OK", "ADEQUATE"):
        failure_block += f"- Cooling adequacy: {cooling_status}\n"
    if critical_hrs:
        failure_block += f"- Critical failure hours: {critical_hrs}\n"
    if failed_gates:
        failure_block += f"- Phase 4 compliance gates FAILED: {', '.join(failed_gates)}\n"

    # ── Build current metrics section ─────────────────────────────────────────
    current_block = ""
    if curr_cost:      current_block += f"- Annual operating cost: ${float(curr_cost):,.0f}\n"
    if curr_emissions: current_block += f"- Annual carbon emissions: {float(curr_emissions):,.0f} kg CO2\n"
    if curr_water:     current_block += f"- Annual water usage: {float(curr_water):,.0f} liters\n"
    if curr_pue:       current_block += f"- Power Usage Effectiveness (PUE): {float(curr_pue):.2f}\n"

    alt1 = alternatives[0] if alternatives else None
    alt2 = alternatives[1] if len(alternatives) > 1 else None
    alt1_name = alt1["tech"] if alt1 else "N/A"
    alt2_name = alt2["tech"] if alt2 else "N/A"

    # ── Per-metric win/loss summary for each alternative ─────────────────────
    def metric_comparison(alt: dict) -> str:
        if not alt:
            return ""
        c_diff  = best_row["annual_cost"] - alt["annual_cost"]
        e_diff  = best_row["annual_emissions_kg"] - alt["annual_emissions_kg"]
        w_diff  = best_row["annual_water_liters"] - alt["annual_water_liters"]
        en_diff = best_row.get("energy_kwh", 0) - alt.get("energy_kwh", 0)
        feas    = alt.get("feasible", True)
        viols   = int(alt.get("violations", 0))

        lines = [f"  vs {alt['tech']} ({'INFEASIBLE — ' + str(viols) + ' violations' if not feas or viols > 0 else 'feasible'}):"]
        lines.append(f"    Cost:      {'SAVES' if c_diff < 0 else 'COSTS MORE'} ${abs(c_diff):,.0f}/yr  →  ${best_row['annual_cost']:,.0f} vs ${alt['annual_cost']:,.0f}")
        lines.append(f"    Emissions: {'LOWER' if e_diff < 0 else 'HIGHER'} by {abs(e_diff):,.0f} kg CO2/yr  →  {best_row['annual_emissions_kg']:,.0f} vs {alt['annual_emissions_kg']:,.0f} kg CO2")
        lines.append(f"    Water:     {'LESS' if w_diff < 0 else 'MORE'} by {abs(w_diff):,.0f} L/yr  →  {best_row['annual_water_liters']:,.0f} vs {alt['annual_water_liters']:,.0f} L")
        if en_diff != 0:
            lines.append(f"    Energy:    {'LOWER' if en_diff < 0 else 'HIGHER'} by {abs(en_diff):,.0f} kWh/yr  →  {best_row.get('energy_kwh',0):,.0f} vs {alt.get('energy_kwh',0):,.0f} kWh")

        lines.append(f"    Violations: {best_row.get('violations',0)} vs {viols}")
        return "\n".join(lines)

    comparison_block = "\n\n".join(filter(None, [
        metric_comparison(alt1) if alt1 else "",
        metric_comparison(alt2) if alt2 else "",
    ]))

    # ── Count how many metrics recommended wins ───────────────────────────────
    wins = []
    for alt in alternatives:
        w = []
        if best_row["annual_cost"] < alt["annual_cost"]: w.append("cost")
        if best_row["annual_emissions_kg"] < alt["annual_emissions_kg"]: w.append("emissions")
        if best_row["annual_water_liters"] < alt["annual_water_liters"]: w.append("water")
        if best_row.get("energy_kwh", 0) < alt.get("energy_kwh", 0): w.append("energy")
        wins.append(f"{recommended} beats {alt['tech']} on: {', '.join(w) if w else 'feasibility'}")

    wins_block = "\n".join(wins)

    # ── Same-technique branch: current == recommended ─────────────────────────
    if recommended == current:
        prompt = f"""You are a senior data center cooling engineer writing a formal ML-backed recommendation report.

The ML model has confirmed that {recommended} — the technique currently in use — is already the optimal choice for this site. Your job is to write a confident 6-8 sentence paragraph that validates this decision, explains why no switch is needed, and shows how {recommended} outperforms both alternatives. Every claim must cite exact numbers from the data below.

════════════════════════════════════════════════
CURRENT & RECOMMENDED TECHNIQUE: {recommended}
════════════════════════════════════════════════
Annual operating cost:  ${best_row['annual_cost']:,.0f}
Annual CO2 emissions:   {best_row['annual_emissions_kg']:,.0f} kg
Annual water usage:     {best_row['annual_water_liters']:,.0f} liters
Annual energy:          {best_row.get('energy_kwh', 0):,.0f} kWh
Constraint violations:  {best_row.get('violations', 0)}  (fully feasible)

════════════════════════════════════════════════
FULL METRIC-BY-METRIC COMPARISON VS ALTERNATIVES
════════════════════════════════════════════════
{comparison_block}

════════════════════════════════════════════════
METRIC WIN SUMMARY
════════════════════════════════════════════════
{wins_block}

════════════════════════════════════════════════
SITE OPERATING CONDITIONS
════════════════════════════════════════════════
Outdoor temperature:  {scenario.get('tempC', 'N/A')}°C
Relative humidity:    {scenario.get('rh', 'N/A')}%
Average IT load:      {scenario.get('itLoadKW', 'N/A')} kW
Electricity tariff:   ${scenario.get('electricityPrice', 'N/A')}/kWh
Grid carbon factor:   {scenario.get('carbonFactor', 'N/A')} kgCO2/kWh

════════════════════════════════════════════════
REQUIRED PARAGRAPH STRUCTURE (6-8 sentences)
════════════════════════════════════════════════
S1 — CONFIRM THE DECISION: State that the ML model has validated {recommended} as the optimal technique already in use. Open with its strongest metric advantage over the most expensive alternative using exact numbers.
S2 — CURRENT PERFORMANCE: Present all four metrics of {recommended} — cost, emissions, water, energy — and state it has {best_row.get('violations', 0)} violations. Frame this as proof the current setup is working correctly.
S3 — BEAT {alt1_name}: Compare {recommended} against {alt1_name} with exact numbers. If {alt1_name} is infeasible, state its violation count and explain it cannot be deployed. Cover cost, emissions, and feasibility.
S4 — BEAT {alt2_name}: Compare {recommended} against {alt2_name} with exact numbers. Cover cost, emissions, and any tradeoffs — always resolve in favor of {recommended}.
S5 — SITE CONDITIONS FIT: Explain why {scenario.get('tempC','N/A')}°C temperature, {scenario.get('rh','N/A')}% humidity, and {scenario.get('itLoadKW','N/A')} kW IT load make {recommended} the right fit for this specific site.
S6/S7 — OPTIMIZATION CLOSE: Recommend focusing on optimization — setpoint tuning, maintenance, and control improvements — to extract further performance gains. Close with a confident statement that no technique switch is needed.

════════════════════════════════════════════════
STRICT RULES
════════════════════════════════════════════════
- NEVER say the current technique is "failing" or has problems — it is confirmed as the best choice
- NEVER frame this as a switch recommendation — the message is "you are already using the right technique"
- Use ONLY numbers from the data above — never invent figures
- No bullet points, no headers, no markdown — flowing professional paragraph only
- Every sentence must contain at least one specific number
- Return ONLY the paragraph, nothing else"""

        try:
            text = _groq_call(
                prompt=prompt,
                system=(
                    "You are a senior data center cooling engineer validating an existing infrastructure decision. "
                    "Write a confident, positive paragraph confirming the current technique is optimal. "
                    "Never suggest the current technique is failing. Use only the data provided."
                ),
                max_tokens=900,
            )
            sentences = [s.strip() for s in text.replace("\n", " ").split(". ") if s.strip()]
            sentences = [s if s.endswith(".") else s + "." for s in sentences]
            return sentences[:8]
        except Exception as e:
            print(f"[LLM justification (same-technique) failed]: {e}")
            return []

    # ── Different-technique branch: current != recommended ────────────────────
    prompt = f"""You are a senior data center cooling engineer writing a formal ML-backed recommendation report for a data center manager making a critical infrastructure and budget decision.

The ML model has definitively selected {recommended} as the optimal cooling technique over {current}. Your job is to write a detailed, multi-metric justification of 8-10 sentences that proves {recommended} is superior to BOTH alternatives across every dimension. Every single claim must cite exact numbers from the data below. Do not hedge — be decisive and authoritative.

════════════════════════════════════════════════
CURRENT TECHNIQUE IN USE: {current}
════════════════════════════════════════════════
{current_block if current_block else "No simulation metrics available for current technique."}

════════════════════════════════════════════════
SIMULATION FAILURE / RISK FINDINGS
════════════════════════════════════════════════
{failure_block if failure_block else "No critical failures detected — current technique is operational but the ML model identifies a better option."}

════════════════════════════════════════════════
ML-RECOMMENDED TECHNIQUE: {recommended}
════════════════════════════════════════════════
Annual operating cost:  ${best_row['annual_cost']:,.0f}
Annual CO2 emissions:   {best_row['annual_emissions_kg']:,.0f} kg
Annual water usage:     {best_row['annual_water_liters']:,.0f} liters
Annual energy:          {best_row.get('energy_kwh', 0):,.0f} kWh
Constraint violations:  {best_row.get('violations', 0)}  (fully feasible)

════════════════════════════════════════════════
FULL METRIC-BY-METRIC COMPARISON
════════════════════════════════════════════════
{comparison_block}

════════════════════════════════════════════════
METRIC WIN SUMMARY
════════════════════════════════════════════════
{wins_block}

════════════════════════════════════════════════
SITE OPERATING CONDITIONS
════════════════════════════════════════════════
Outdoor temperature:  {scenario.get('tempC', 'N/A')}°C
Relative humidity:    {scenario.get('rh', 'N/A')}%
Average IT load:      {scenario.get('itLoadKW', 'N/A')} kW
Electricity tariff:   ${scenario.get('electricityPrice', 'N/A')}/kWh
Water tariff:         ${scenario.get('waterPrice', 'N/A')}/L
Grid carbon factor:   {scenario.get('carbonFactor', 'N/A')} kgCO2/kWh

════════════════════════════════════════════════
REQUIRED PARAGRAPH STRUCTURE (8-10 sentences)
════════════════════════════════════════════════
S1 — OPEN WITH THE STRONGEST EVIDENCE: If there are airflow violations, hotspots, or cooling failures — open with those exact numbers and make clear the current technique is failing. If no failures, open with the biggest cost or emissions advantage of {recommended} over the most expensive alternative.
S2 — CURRENT TECHNIQUE RISK: Quantify the financial and operational risk of staying with {current}. Use its actual cost, emissions, PUE, and any failure findings with exact numbers.
S3 — INTRODUCE THE RECOMMENDATION: Present {recommended} with all four metrics — cost, emissions, water, energy — and state it has {best_row.get('violations',0)} violations. Frame this as the complete solution.
S4 — DOMINATE {alt1_name} ON ITS WEAKEST POINTS: Lead with the metrics where {recommended} clearly beats {alt1_name}. If {alt1_name} is infeasible, open with that — state its violation count and explain it cannot be deployed regardless of any metric. If {recommended} loses on one metric vs {alt1_name}, frame it as an acceptable tradeoff given the overall advantage (e.g. "while {recommended} uses X more liters of water, it saves $Y in operating cost and Z kg CO2 — a clear net win").
S5 — COMPLETE THE {alt1_name} CASE: Cover remaining metrics. Always end this sentence with a conclusion that favors {recommended}.
S6 — DOMINATE {alt2_name} ON ITS WEAKEST POINTS: Same approach — lead with where {recommended} wins. If {recommended} loses on a metric, frame it as a justified tradeoff with exact numbers showing the net benefit.
S7 — COMPLETE THE {alt2_name} CASE: Cover remaining metrics. Always end with a conclusion favoring {recommended}.
S8 — SITE CONDITIONS FIT: Explain why {scenario.get('tempC','N/A')}°C temperature, {scenario.get('rh','N/A')}% humidity, {scenario.get('itLoadKW','N/A')} kW IT load, and ${scenario.get('electricityPrice','N/A')}/kWh electricity make {recommended} the optimal technical fit for this specific site.
S9/S10 — DECISIVE CLOSE: One or two sentences. State clearly that {recommended} is the right decision — financially, operationally, and environmentally. Leave no doubt.

════════════════════════════════════════════════
STRICT RULES
════════════════════════════════════════════════
- Use ONLY numbers from the data above — never invent or estimate figures
- No bullet points, no headers, no markdown — flowing professional paragraph only
- Do NOT start with "Based on", "In conclusion", or "The simulation shows"
- Every sentence must contain at least one specific number
- CRITICAL: Never present a weakness of {recommended} without immediately following it with a stronger counterpoint that justifies the recommendation. Every tradeoff must be resolved in favor of {recommended}.
- Be decisive — this is a formal engineering recommendation, not a balanced analysis
- Return ONLY the justification paragraph, nothing else"""

    try:
        text = _groq_call(
            prompt=prompt,
            system=(
                "You are a senior data center cooling engineer writing formal infrastructure recommendations. "
                "Write precise, authoritative, multi-metric justifications using only the data provided. "
                "Never invent numbers. Your job is to build the strongest possible case for the recommended technique. "
                "When the recommended technique has a weakness on one metric, always frame it as an acceptable tradeoff "
                "by immediately citing the stronger advantages — never leave a weakness unresolved. "
                "The recommendation must sound decisive and final, not balanced or neutral."
            ),
            max_tokens=900,
        )
        sentences = [s.strip() for s in text.replace("\n", " ").split(". ") if s.strip()]
        sentences = [s if s.endswith(".") else s + "." for s in sentences]
        return sentences[:10]
    except Exception as e:
        print(f"[LLM justification failed]: {e}")
        return []



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
    simulation_context: Optional[dict] = Field(
        default=None,
        description="Optional simulation findings: airflow_violation_pct, cooling_adequacy_status, hotspot_racks, violation_message",
    )


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


def _build_user_reasons(scenario: dict, best: dict, alternatives: list[dict], simulation_context: Optional[dict] = None) -> list[str]:
    reasons = [
        f"Based on your current conditions, the suggested cooling technique is {best['tech']}.",
        f"Feasibility check result: {best['tech']} is valid for this scenario with {best['violations']} constraint violations.",
    ]

    # Add simulation-specific findings if available
    ctx = simulation_context or {}
    airflow_pct = ctx.get("airflow_violation_pct")
    cooling_status = ctx.get("cooling_adequacy_status")
    hotspot_racks = ctx.get("hotspot_racks")
    violation_msg = ctx.get("violation_message")

    if airflow_pct is not None and float(airflow_pct) > 0:
        reasons.append(
            f"Your current simulation recorded {airflow_pct}% airflow violations — "
            f"the current technique cannot meet cooling demands at this IT density. "
            f"{best['tech']} is recommended as a more capable alternative."
        )

    if cooling_status and cooling_status != "OK" and cooling_status != "ADEQUATE":
        reasons.append(
            f"Cooling adequacy status from simulation: {cooling_status}. "
            f"{best['tech']} is better suited to meet your thermal requirements."
        )

    if hotspot_racks and int(hotspot_racks) > 0:
        reasons.append(
            f"{hotspot_racks} rack hotspots detected in simulation — "
            f"{best['tech']} provides more effective heat removal for high-density racks."
        )

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


def _build_future_impact_paragraph(best: dict, alternatives: list[dict] = None, scenario: dict = None) -> str:
    """LLM-generated future impact narrative using ML_GROQ_API_KEY. Falls back to rule-based if key missing."""
    y1_cost  = best["annual_cost"]
    y1_emis  = best["annual_emissions_kg"]
    y1_water = best["annual_water_liters"]
    y3_cost  = 3 * y1_cost
    y3_emis  = 3 * y1_emis
    y3_water = 3 * y1_water
    y5_cost  = 5 * y1_cost
    y5_emis  = 5 * y1_emis
    y5_water = 5 * y1_water

    # Build 5-year savings vs alternatives
    savings_lines = []
    if alternatives:
        for alt in alternatives:
            diff_5yr = (alt["annual_cost"] - y1_cost) * 5
            if diff_5yr > 0:
                savings_lines.append(
                    f"- vs {alt['tech']}: saves ${diff_5yr:,.0f} over 5 years (${alt['annual_cost']:,.0f}/yr vs ${y1_cost:,.0f}/yr)"
                )
            elif diff_5yr < 0:
                savings_lines.append(
                    f"- vs {alt['tech']}: costs ${abs(diff_5yr):,.0f} more over 5 years — but {alt['tech']} is infeasible or has violations"
                )

    savings_block = "\n".join(savings_lines) if savings_lines else "No alternative comparison available."

    sc = scenario or {}

    if not ML_GROQ_API_KEY:
        # Fallback: rule-based paragraph
        return (
            f"If similar conditions continue, {best['tech']} is projected to cost {_money(y1_cost)}/yr, "
            f"emit {_num(y1_emis)} kg CO2, and use {_num(y1_water)} L water in Year 1. "
            f"Over 3 years: {_money(y3_cost)} cost, {_num(y3_emis)} kg CO2, {_num(y3_water)} L water. "
            f"Over 5 years: {_money(y5_cost)} cost, {_num(y5_emis)} kg CO2, {_num(y5_water)} L water. "
            + (" ".join(savings_lines) + " " if savings_lines else "")
            + "This provides a long-term view for budget planning, sustainability targets, and cooling reliability."
        )

    prompt = f"""You are a senior data center infrastructure analyst writing a forward-looking impact assessment for a data center manager.

The ML model has recommended {best['tech']} as the optimal cooling technique. Write a compelling 5-6 sentence future impact narrative that makes a strong case for this choice over the next 1, 3, and 5 years. Use only the numbers provided below.

=== RECOMMENDED TECHNIQUE: {best['tech']} ===
Year 1:  Cost ${y1_cost:,.0f} | Emissions {y1_emis:,.0f} kg CO2 | Water {y1_water:,.0f} L
Year 3:  Cost ${y3_cost:,.0f} | Emissions {y3_emis:,.0f} kg CO2 | Water {y3_water:,.0f} L
Year 5:  Cost ${y5_cost:,.0f} | Emissions {y5_emis:,.0f} kg CO2 | Water {y5_water:,.0f} L

=== 5-YEAR COST COMPARISON VS ALTERNATIVES ===
{savings_block}

=== SITE CONDITIONS ===
Avg temp: {sc.get('tempC', 'N/A')}°C | Humidity: {sc.get('rh', 'N/A')}% | IT load: {sc.get('itLoadKW', 'N/A')} kW
Electricity: ${sc.get('electricityPrice', 'N/A')}/kWh | Carbon intensity: {sc.get('carbonFactor', 'N/A')} kgCO2/kWh

=== REQUIRED STRUCTURE ===
S1: Open with Year 1 projections — state cost, emissions, and water with exact numbers. Frame this as the immediate financial and environmental impact.
S2: Project to Year 3 — state the cumulative cost, emissions, and water. Connect to budget planning cycles.
S3: Project to Year 5 — state the 5-year totals. Highlight the long-term cost savings vs the best alternative using exact numbers from the comparison.
S4: Connect to sustainability — explain how the emissions trajectory supports carbon reduction targets given the {sc.get('carbonFactor', 'N/A')} kgCO2/kWh grid intensity.
S5: Close with a confident forward-looking statement — why {best['tech']} is the right long-term infrastructure investment for this data center's operating profile.

=== RULES ===
- Use ONLY numbers from the data above — never invent figures
- No bullet points, no headers — flowing professional sentences
- Do NOT start with "Based on" or "In conclusion"
- Be optimistic and forward-looking — champion {best['tech']} as the right long-term choice
- Return ONLY the paragraph text"""

    try:
        text = _groq_call(
            prompt=prompt,
            system=(
                "You are a senior data center infrastructure analyst. Write compelling, "
                "forward-looking impact assessments using only the data provided. "
                "Always champion the recommended technique as the right long-term investment."
            ),
            max_tokens=500,
        )
        return text
    except Exception as e:
        print(f"[LLM future impact failed]: {e}")
        # Fallback to rule-based
        return (
            f"If similar conditions continue, {best['tech']} is projected to cost {_money(y1_cost)}/yr, "
            f"emit {_num(y1_emis)} kg CO2, and use {_num(y1_water)} L water in Year 1. "
            f"Over 3 years: {_money(y3_cost)} cost, {_num(y3_emis)} kg CO2, {_num(y3_water)} L water. "
            f"Over 5 years: {_money(y5_cost)} cost, {_num(y5_emis)} kg CO2, {_num(y5_water)} L water. "
            + (" ".join(savings_lines) + " " if savings_lines else "")
            + "This provides a long-term view for budget planning, sustainability targets, and cooling reliability."
        )


def _build_comparison_table(prepared_rows: list[dict], recommended_tech: str) -> list[dict]:
    """Build comparison table — recommended technique first, others sorted by cost."""
    rec_rows  = [r for r in prepared_rows if r["tech"] == recommended_tech]
    other_rows = sorted(
        [r for r in prepared_rows if r["tech"] != recommended_tech],
        key=lambda r: r["annual_cost"],
    )
    ordered = rec_rows + other_rows
    return [
        {
            "tech": row["tech"],
            "feasible": row["feasible"],
            "score": round(row["score"], 4),
            "cost": round(row["cost"], 2),
            "emissions_kg": round(row["emissions_kg"], 2),
            "water_liters": round(row["water_liters"], 2),
            "violations": row["violations"],
            "annual_cost": round(row["annual_cost"], 2),
            "annual_emissions_kg": round(row["annual_emissions_kg"], 2),
            "annual_water_liters": round(row["annual_water_liters"], 2),
            "is_recommended": row["tech"] == recommended_tech,
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
        comparison_table = _build_comparison_table(prepared, prediction)

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

        user_reasons = _build_user_reasons(scenario_dict, final_choice, alternatives, payload.simulation_context)
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

        future_paragraph = _build_future_impact_paragraph(final_choice, alternatives, scenario_dict)

        # Try LLM-generated justification — richer and more natural
        llm_reasons = _llm_justification(
            recommended=final_choice["tech"],
            current=payload.current_technique or "Unknown",
            best_row=final_choice,
            alternatives=alternatives,
            scenario=scenario_dict,
            simulation_context=payload.simulation_context or {},
        )
        print(f"[DEBUG] LLM reasons count: {len(llm_reasons)}")
        if llm_reasons:
            print(f"[DEBUG] LLM first sentence: {llm_reasons[0][:100]}")
            decision_sentence = user_reasons[0] if user_reasons else f"Recommended technique is {final_choice['tech']}."
            user_reasons = [decision_sentence] + llm_reasons
        else:
            print("[DEBUG] LLM returned empty — using hardcoded reasons")

        response.update(
            {
                "model_recommendation": final_choice["tech"],
                "why_this_is_recommended": user_reasons,
                "future_impact_paragraph": future_paragraph,
                "comparison_table": _build_comparison_table(prepared, final_choice["tech"]),
            }
        )
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")