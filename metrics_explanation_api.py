"""
Metrics Explanation API - LLM-powered explanations for simulation KPI metrics
Uses GROQ API to explain detailed metrics in natural language
Runs on port 8005
"""

import os
import json
import re
import time
import threading
from typing import Any, Dict, Optional, List
from pathlib import Path
from urllib import request as urlrequest
from urllib.error import URLError, HTTPError

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent


def _load_local_env(env_path: Path) -> None:
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key or key in os.environ:
            continue
        if len(value) >= 2 and ((value[0] == '"' and value[-1] == '"') or (value[0] == "'" and value[-1] == "'")):
            value = value[1:-1]
        os.environ[key] = value


_load_local_env(BASE_DIR / ".env")
_load_local_env(BASE_DIR / ".env.local")

GROQ_API_KEY = os.getenv("GRAPH_EXPLANATION_GROQ_API_KEY") or os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GRAPH_EXPLANATION_GROQ_MODEL") or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

frontend_origins_env = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173,http://127.0.0.1:3000,http://127.0.0.1:3001",
)
allowed_origins = [o.strip() for o in frontend_origins_env.split(",") if o.strip()]

_GROQ_LOCK = threading.Lock()


# â”€â”€ Pydantic models â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class MetricItem(BaseModel):
    label: str
    value: Any
    unit: str = ""


class SimulationContext(BaseModel):
    technique: Optional[str] = None
    location: Optional[str] = None
    outdoorTempC: Optional[float] = None
    humidity: Optional[float] = None
    servers: Optional[int] = None
    workloadPercent: Optional[float] = None
    itLoadKW: Optional[float] = None
    totalHours: Optional[int] = None
    rackAnalysis: Optional[Dict[str, Any]] = None  # air-side rack hotspot summary
    projection: Optional[Dict[str, Any]] = None    # 5-year financial & emissions projection
    coolingAssessment: Optional[Dict[str, Any]] = None  # evaporative cooling assessment


class MetricsExplanationRequest(BaseModel):
    technique: str
    metrics: List[MetricItem]
    simulationContext: Optional[SimulationContext] = None


class MetricsExplanationResponse(BaseModel):
    explanation: str
    keyInsight: Optional[str] = None
    model_used: str
    tokens_used: Optional[Dict[str, int]] = None


# â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _parse_llm_json(text: str) -> Dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except Exception:
        pass
    # Find first balanced JSON object
    depth = 0
    start = None
    in_str = False
    esc = False
    for i, ch in enumerate(cleaned):
        if start is None:
            if ch == "{":
                start = i
                depth = 1
            continue
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(cleaned[start:i + 1])
                except Exception:
                    break
    return {"explanation": cleaned, "key_insight": None}


def _call_groq(system_prompt: str, user_prompt: str):
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not configured")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FYP-Graph-Explanation/1.0",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 2200,
    }
    req_obj = urlrequest.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with _GROQ_LOCK:
        last_err = None
        for attempt in range(4):
            try:
                with urlrequest.urlopen(req_obj, timeout=30) as resp:
                    raw = json.loads(resp.read().decode("utf-8"))
                content = raw["choices"][0]["message"]["content"].strip()
                parsed = _parse_llm_json(content)
                usage = raw.get("usage", {})
                return (
                    parsed.get("explanation", content),
                    parsed.get("key_insight") or parsed.get("keyInsight"),
                    usage.get("prompt_tokens", 0),
                    usage.get("completion_tokens", 0),
                )
            except HTTPError as e:
                error_body = ""
                try:
                    error_body = e.read().decode("utf-8")
                except Exception:
                    error_body = str(e)
                if e.code == 429 and attempt < 3:
                    last_err = e
                    time.sleep(2 ** attempt)
                    continue
                if e.code == 401 or e.code == 403:
                    raise HTTPException(
                        status_code=500,
                        detail=f"GROQ API authentication failed (HTTP {e.code}). Check GRAPH_EXPLANATION_GROQ_API_KEY in .env.local. Detail: {error_body[:200]}",
                    )
                raise HTTPException(status_code=500, detail=f"GROQ API error {e.code}: {error_body[:200]}")
            except URLError as e:
                last_err = e
                if attempt < 3:
                    time.sleep(2 ** attempt)
                    continue
                raise HTTPException(status_code=500, detail=str(e))
        raise HTTPException(status_code=500, detail=str(last_err))


METRIC_GUIDE = {
    "pue": "Power Usage Effectiveness â€” ratio of total facility power to IT power. Ideal is 1.0; 1.2 is excellent; 1.5 is average; above 1.8 is poor.",
    "cue": "Carbon Usage Effectiveness â€” kg of CO2 emitted per kWh of IT energy. Lower is better. Below 0.3 is excellent; above 0.6 is concerning.",
    "wue": "Water Usage Effectiveness â€” litres of water used per kWh of IT energy. 0 is ideal (no water); below 0.5 is good; above 2.0 is high.",
    "cop": "Coefficient of Performance â€” cooling output divided by compressor power input. Higher is better. COP above 5 is excellent; below 3 is poor.",
    "capex": "Capital Expenditure â€” upfront cost to install the cooling system. Air-side is cheapest (~$45k); chilled water is most expensive (~$630k).",
    "opex": "Operating Expenditure â€” annual running cost including electricity and maintenance.",
    "lccp": "Life-Cycle Cost of Plant â€” total cost over the plant lifetime including CAPEX and all OpEx.",
    "npv": "Net Present Value â€” present value of future savings minus CAPEX. Positive means profitable; negative means costs exceed savings.",
    "payback": "Payback Period â€” years until CAPEX is recovered from annual savings. Under 5 years is excellent; over 15 years is poor.",
    "carbon tax": "Annual cost of carbon emissions at the regulatory carbon price ($254/ton CO2 at IPCC 2030 pathway).",
    "energy savings": "Percentage of energy saved compared to a PUE 1.8 baseline mechanical-only system. Above 30% is excellent.",
    "carbon savings": "kg of CO2 avoided compared to the baseline system. Higher is better.",
    "annual cost": "Total annual operating expenditure. Compare against baseline to assess cost-effectiveness.",
    "cooling load": "Total annual cooling energy delivered. Should be close to IT energy for efficient systems.",
    "water usage": "Total annual water consumed by the cooling system. Zero is ideal for water-scarce regions.",
    "it energy": "Energy consumed by IT equipment only. The baseline load the cooling system must serve.",
    "cooling energy": "Energy consumed by the cooling system itself. Should be a small fraction of IT energy.",
    "fan energy": "Energy consumed by fans. In evaporative cooling this should be near-zero overhead.",
    "dx backup": "Energy consumed by mechanical DX backup. Zero means pure evaporative mode was sufficient.",
    "failure hours": "Hours where cooling was insufficient. Zero is required for reliable operation.",
    "max inlet temp": "Maximum rack inlet temperature. Must stay below 27Â°C for ASHRAE Class A1 compliance.",
    "cooling cap avg": "Average cooling capacity. Must exceed average IT heat load to avoid thermal deficit.",
}


def _build_prompts(req: MetricsExplanationRequest):
    technique = req.technique or "this cooling technique"

    ctx_lines = []
    rack_section = ""
    if req.simulationContext:
        c = req.simulationContext
        if c.location:
            ctx_lines.append(f"Location: {c.location}")
        if c.outdoorTempC is not None:
            ctx_lines.append(f"Outdoor Temperature: {c.outdoorTempC}Â°C")
        if c.humidity is not None:
            ctx_lines.append(f"Humidity: {c.humidity}%")
        if c.servers is not None:
            ctx_lines.append(f"Servers: {c.servers}")
        if c.itLoadKW is not None:
            ctx_lines.append(f"IT Load: {c.itLoadKW} kW")
        if c.totalHours is not None:
            ctx_lines.append(f"Simulation Duration: {c.totalHours} hours")

        # Build rack analysis section for air-side
        if c.rackAnalysis:
            ra = c.rackAnalysis
            total = ra.get("totalRacks", 0)
            hotspots = ra.get("hotspotRacks", 0)
            max_kw = ra.get("maxRackLoadKW", 0)
            avg_kw = ra.get("averageRackLoadKW", 0)
            imbalance = ra.get("loadImbalanceFactor", 0)
            threshold = ra.get("hotspotThresholdKW", 26.8)
            violations = ra.get("airflowViolationCount", 0)
            rack_section = (
                f"\nRack Hotspot Analysis:\n"
                f"- Total racks: {total}\n"
                f"- Hotspot racks (peak load > {threshold} kW): {hotspots} / {total} ({round(hotspots/total*100) if total else 0}%)\n"
                f"- Maximum rack load: {max_kw:.1f} kW (threshold: {threshold} kW)\n"
                f"- Average rack load: {avg_kw:.1f} kW\n"
                f"- Load imbalance factor: {imbalance:.4f} (0 = perfectly balanced, 1 = fully imbalanced)\n"
                f"- Racks with airflow CFM violations: {violations}\n"
                f"- Interpretation: A hotspot means the rack generates more heat than air-side cooling can safely remove. "
                f"Airflow violations mean the required CFM to cool that rack exceeds the physical system limit, "
                f"indicating liquid cooling or rack redistribution is needed."
            )

        # Build 5-year projection section
        projection_section = ""
        if c.projection:
            p = c.projection
            fy = p.get("forecastYears", 5)
            total_energy = p.get("totalEnergy_kWh")
            total_cost = p.get("totalCost_USD")
            total_savings = p.get("totalSavings_USD")
            total_carbon_tax = p.get("totalCarbonTax_USD")
            total_emissions = p.get("totalEmissions_tCO2")
            npv = p.get("npvSavings_USD")
            payback = p.get("adjustedPaybackYears")
            y1 = p.get("year1") or {}
            y5 = p.get("year5") or {}

            # Compute escalation percentages where both years are available
            cost_escalation = ""
            if y1.get("totalCostUSD") and y5.get("totalCostUSD"):
                pct = ((y5["totalCostUSD"] - y1["totalCostUSD"]) / y1["totalCostUSD"]) * 100
                cost_escalation = f" (Year 1: ${y1['totalCostUSD']:.0f} â†’ Year 5: ${y5['totalCostUSD']:.0f}, +{pct:.1f}% escalation)"
            carbon_escalation = ""
            if y1.get("carbonTaxUSD") and y5.get("carbonTaxUSD"):
                pct = ((y5["carbonTaxUSD"] - y1["carbonTaxUSD"]) / y1["carbonTaxUSD"]) * 100
                carbon_escalation = f" (Year 1: ${y1['carbonTaxUSD']:.0f} â†’ Year 5: ${y5['carbonTaxUSD']:.0f}, +{pct:.1f}% escalation)"
            savings_escalation = ""
            if y1.get("costSavingsUSD") and y5.get("costSavingsUSD"):
                pct = ((y5["costSavingsUSD"] - y1["costSavingsUSD"]) / y1["costSavingsUSD"]) * 100
                savings_escalation = f" (Year 1: ${y1['costSavingsUSD']:.0f} â†’ Year 5: ${y5['costSavingsUSD']:.0f}, +{pct:.1f}% growth)"
            emissions_escalation = ""
            if y1.get("emissionsTonsCO2") and y5.get("emissionsTonsCO2"):
                pct = ((y5["emissionsTonsCO2"] - y1["emissionsTonsCO2"]) / y1["emissionsTonsCO2"]) * 100
                emissions_escalation = f" (Year 1: {y1['emissionsTonsCO2']:.3f} t â†’ Year 5: {y5['emissionsTonsCO2']:.3f} t, +{pct:.1f}%)"

            # Payback interpretation
            if payback is not None:
                if payback >= 999:
                    payback_interp = "CAPEX is NOT recovered within the forecast horizon â€” the investment is not financially viable at this workload density"
                elif payback > 15:
                    payback_interp = f"payback of {payback} years is commercially poor (benchmark: under 5 years is excellent, over 15 years is poor)"
                elif payback > 5:
                    payback_interp = f"payback of {payback} years is commercially marginal (benchmark: under 5 years is excellent)"
                else:
                    payback_interp = f"payback of {payback} years is commercially excellent (benchmark: under 5 years)"
            else:
                payback_interp = "payback period not available"

            # NPV interpretation
            if npv is not None:
                if npv >= 0:
                    npv_interp = f"positive NPV of ${npv:,.0f} means the discounted savings exceed CAPEX â€” the investment is profitable"
                else:
                    npv_interp = f"negative NPV of ${npv:,.0f} means discounted savings do NOT recover CAPEX â€” the investment loses money in present-value terms"
            else:
                npv_interp = "NPV not available"

            projection_section = (
                f"\n5-Year Financial & Emissions Projection ({fy} years):\n"
                + (f"- Total facility energy over {fy} years: {total_energy:,.0f} kWh\n" if total_energy else "")
                + (f"- Total operating cost over {fy} years: ${total_cost:,.0f}{cost_escalation}\n" if total_cost else "")
                + (f"- Total cost savings vs PUE 1.8 baseline: ${total_savings:,.0f}{savings_escalation}\n" if total_savings else "")
                + (f"- Total carbon tax liability: ${total_carbon_tax:,.0f}{carbon_escalation}\n" if total_carbon_tax else "")
                + (f"- Total CO2 emissions: {total_emissions:.3f} tonnes{emissions_escalation}\n" if total_emissions else "")
                + (f"- NPV of savings: {npv_interp}\n" if npv is not None else "")
                + (f"- Adjusted payback period: {payback_interp}\n" if payback is not None else "")
                + "- Benchmarks: payback < 5 yrs = excellent, 5-10 yrs = good, 10-15 yrs = marginal, > 15 yrs = poor; "
                  "positive NPV = profitable investment; carbon tax escalates 15%/yr under IPCC 2030 pathway"
            )

        # Build cooling assessment section for evaporative simulations
        cooling_assessment_section = ""
        if c.coolingAssessment:
            ca = c.coolingAssessment
            status = ca.get("status", "UNKNOWN")
            confidence = ca.get("confidence")
            checks = ca.get("checks", {})
            key_m = ca.get("key_metrics", {})
            hourly_f = ca.get("hourly_failures", {})
            recs = ca.get("recommendations", [])
            notes = ca.get("engineering_notes", [])

            checks_str = "\n".join(
                f"  - {k.replace('_', ' ')}: {'PASS' if v else 'FAIL'}"
                for k, v in checks.items()
            )
            key_m_lines = []
            for k, v in key_m.items():
                if v is None or v == 1.7976931348623157e+308:
                    continue
                label = k.replace("_", " ")
                if k == "max_inlet_temp_c":
                    interp = f" [ASHRAE A1 limit: 27Â°C â€” {'EXCEEDED by ' + str(round(v - 27, 1)) + 'Â°C' if v > 27 else 'compliant'}]"
                elif k == "pue_avg":
                    interp = f" [Benchmark: 1.0 ideal, 1.2 excellent, 1.5 average]"
                elif k == "cooling_capacity_avg_kw" and key_m.get("heat_load_avg_kw"):
                    deficit = v - key_m["heat_load_avg_kw"]
                    interp = f" [{'deficit of ' + str(round(abs(deficit), 2)) + ' kW â€” system undersized' if deficit < 0 else 'surplus of ' + str(round(deficit, 2)) + ' kW â€” system adequate'}]"
                else:
                    interp = ""
                key_m_lines.append(f"  - {label}: {round(v, 4) if isinstance(v, float) else v}{interp}")

            cooling_assessment_section = (
                f"\nCooling Assessment:\n"
                f"- Overall status: {status}"
                + (f" (confidence: {round(confidence * 100, 0):.0f}%)" if confidence is not None else "")
                + f"\n- Compliance checks:\n{checks_str}\n"
                + (f"- Key assessment metrics:\n" + "\n".join(key_m_lines) + "\n" if key_m_lines else "")
                + (f"- Temperature violations: {hourly_f.get('temperature_violations', 0)} hrs\n" if hourly_f else "")
                + (f"- Capacity violations: {hourly_f.get('capacity_violations', 0)} hrs\n" if hourly_f else "")
                + (f"- Humidity violations: {hourly_f.get('humidity_violations', 0)} hrs\n" if hourly_f else "")
                + (f"- Engineering notes: {'; '.join(notes)}\n" if notes else "")
                + (f"- Recommendations: {'; '.join(recs)}\n" if recs else "")
            )

    ctx_str = "\n".join(ctx_lines) if ctx_lines else "No additional context provided."

    # â”€â”€ Group metrics by section so the LLM knows which section each belongs to â”€â”€
    SECTION_KEYWORDS = {
        "Performance":  ["pue", "cue", "wue", "cop", "availability", "failure hours", "sim hours", "energy savings %", "carbon sav"],
        "Energy":       ["total electricity", "it energy", "fan energy", "dx backup", "pump energy", "auxiliary", "cooling energy", "energy sav", "total energy"],
        "Cost":         ["cost", "opex", "capex", "lccp", "npv", "payback", "savings", "elec cost", "carbon tax", "annual op"],
        "Emissions":    ["co2", "carbon", "emission", "cue"],
        "Water":        ["water", "wue", "evaporation", "makeup", "blowdown"],
        "Runtime":      ["runtime"],
    }

    def _section_for(label: str) -> str:
        lbl = label.lower()
        for section, keywords in SECTION_KEYWORDS.items():
            if any(kw in lbl for kw in keywords):
                return section
        return "Other"

    from collections import defaultdict
    grouped: dict = defaultdict(list)
    for m in req.metrics:
        unit_str = f" {m.unit}" if m.unit else ""
        key = m.label.lower().replace("_", " ").replace("avg ", "").strip()
        guide_text = ""
        for guide_key, guide_val in METRIC_GUIDE.items():
            if guide_key in key:
                guide_text = f" [Benchmark: {guide_val}]"
                break
        section = _section_for(m.label)
        grouped[section].append(f"  â€¢ {m.label}: {m.value}{unit_str}{guide_text}")

    metrics_str_grouped = ""
    for section, lines in grouped.items():
        metrics_str_grouped += f"\n[{section}]\n" + "\n".join(lines) + "\n"

    # â”€â”€ Technique-specific context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    technique_context = {
        "Air-Side Economizer": (
            "Air-side economization uses outdoor air directly to cool the data center, bypassing mechanical "
            "refrigeration when ambient conditions permit. It is the lowest-CAPEX option but is constrained by "
            "outdoor temperature and AI workload heat density. Key concerns are airflow violations (when rack "
            "heat density exceeds what air movement can remove) and PUE degradation during mechanical backup hours."
        ),
        "Chilled Water": (
            "Chilled water cooling uses a mechanical refrigeration cycle (chiller + cooling tower + CRAH units) "
            "to maintain precise temperature control regardless of ambient conditions. It is the industry standard "
            "for mission-critical AI deployments. Key metrics are COP (chiller efficiency), WUE (water consumption), "
            "NPV and payback period (financial viability), and ASHRAE Phase 4 compliance gates."
        ),
        "Evaporative Cooling": (
            "Direct evaporative cooling lowers supply air temperature through water evaporation, requiring only "
            "fan power with no compressor. It achieves near-ideal PUE but is constrained by ambient wet-bulb "
            "temperature. Key concerns are inlet temperature compliance (must stay below 27 degrees C for ASHRAE A1), "
            "DX backup activation hours, and water consumption in water-scarce regions."
        ),
    }.get(technique, f"{technique} cooling system.")

    # â”€â”€ Paragraph 4 topic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if "Air" in technique:
        para4_topic = (
            "operational reliability and environmental impact â€” cover carbon emissions (CUE value and total kg CO2), "
            "water usage (zero is ideal for air-side), energy savings percentage vs PUE 1.8 baseline, "
            "carbon savings in kg, and the airflow/rack hotspot situation if rack data is provided"
        )
    elif "Chilled" in technique:
        para4_topic = (
            "water consumption, carbon emissions, and ASHRAE Phase 4 compliance gates â€” "
            "state the WUE value and total water litres, explain the carbon footprint (CO2 total and per kWh IT), "
            "and for each Phase 4 gate state whether it passes or fails and explain the physical reason"
        )
    else:
        para4_topic = (
            "water consumption, carbon emissions, and operational reliability â€” "
            "state total water litres and WUE, explain CO2 total and CO2/kWh IT, "
            "state availability percentage and failure hours, and explain what these mean for deployment readiness"
        )

    # â”€â”€ Extra paragraphs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    has_projection = bool(getattr(req.simulationContext, "projection", None))
    has_cooling_assessment = bool(getattr(req.simulationContext, "coolingAssessment", None))
    extra_paras = (1 if has_projection else 0) + (1 if has_cooling_assessment else 0)
    para_count_map = {0: "four", 1: "five", 2: "six"}
    para_count = para_count_map.get(extra_paras, "six")

    projection_para_instruction = ""
    if has_projection:
        projection_para_instruction = """
Paragraph 5 - 5-Year Financial and Emissions Projection: Using ONLY the projection data provided above:
  a) State the total 5-year operating cost and explain what drives it (electricity price escalation plus carbon tax growth).
  b) Compare Year 1 vs Year 5 total cost and carbon tax - state the exact values and percentage increase for each.
  c) State total 5-year savings vs the PUE 1.8 baseline and assess whether they justify the CAPEX.
  d) State the adjusted payback period and judge it: under 5 years = excellent, 5-10 = good, 10-15 = marginal, over 15 = poor, 999 = not achieved within forecast horizon.
  e) State the NPV of savings and explain whether the investment is profitable in present-value terms.
  f) State total CO2 emissions over the forecast period and explain the trend.
  g) End with a one-sentence financial viability verdict."""

    cooling_assessment_para_instruction = ""
    if has_cooling_assessment:
        next_para = 5 + (1 if has_projection else 0)
        cooling_assessment_para_instruction = f"""
Paragraph {next_para} - Cooling Assessment: Using ONLY the cooling assessment data provided above:
  a) State the overall status (ADEQUATE or INSUFFICIENT_COOLING) and confidence percentage, and explain what this verdict means for deployment.
  b) For EACH compliance check, state PASS or FAIL and explain the physical consequence of that result.
  c) State the maximum inlet temperature, compare it to the 27 degrees C ASHRAE A1 limit, and explain the risk if exceeded.
  d) Compare average cooling capacity to average heat load - state the exact kW deficit or surplus and what it means.
  e) State temperature, capacity, and humidity violation hours and explain the operational risk each represents.
  f) Quote each engineering note and explain what it means for the operator.
  g) Quote each recommendation and justify it from the specific metric values that triggered it."""

    # â”€â”€ System prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    system_prompt = f"""You are a senior data center cooling engineer writing a rigorous technical analysis for a final-year engineering project report. Your analysis will be read by an academic examiner who expects precise numerical justification for every claim.

MANDATORY RULES — violating any rule will make the analysis unacceptable:
1. Cover EVERY metric listed under each section heading without exception. If you skip a metric, the analysis fails.
2. For every single metric: state the exact numerical value with its unit, then in the same sentence or the next sentence explain whether it is excellent / good / average / concerning / poor and WHY — using the benchmark range provided.
3. NEVER use hedging language: may, might, could, likely, probably, suggests, appears, seems, indicates.
4. Write in flowing academic paragraphs — absolutely no bullet points or numbered lists inside paragraphs.
5. Target 750-950 words total across all paragraphs. With {para_count} paragraphs this means 150-200 words per paragraph.
6. Return ONLY valid JSON with no text outside it: {{"explanation": "...", "key_insight": "..."}}
7. key_insight = one precise sentence identifying the single metric that most determines deployment viability, with its value.
8. Do NOT wrap JSON in markdown fences.
9. Every number must be immediately followed by a justification sentence explaining its engineering significance.
10. Paragraph 2 MUST name and justify every metric in the Performance and Energy groups.
11. Paragraph 3 MUST name and justify every metric in the Cost group.
12. Paragraph 4 MUST name and justify every metric in the Emissions and Water groups.
13. Use specific comparisons: e.g. "a PUE of 1.009 means only 0.9% of facility power is cooling overhead, placing this system in the top 1% of global data centres" or "a payback of 43 years means the CAPEX of $25,000 will not be recovered within any commercially viable planning horizon"."""

    # â”€â”€ User prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    user_prompt = f"""Write a detailed technical analysis of the following simulation results for the {technique} cooling technique.

=== TECHNIQUE BACKGROUND ===
{technique_context}

=== SIMULATION CONTEXT ===
{ctx_str}
{rack_section}
{projection_section}
{cooling_assessment_section}

=== METRICS (grouped by section - cover EVERY metric in EVERY section) ===
{metrics_str_grouped}

=== INSTRUCTIONS ===
Write exactly {para_count} paragraphs as follows:

Paragraph 1 - Overview and PUE:
Introduce the {technique} technique and its operating principle in one sentence. State the PUE value and judge it against the benchmark (1.0 = ideal, 1.1 or below = world-class, 1.2 or below = excellent, 1.5 or below = average, above 1.8 = poor) — explain what the PUE value means in terms of how many watts of cooling overhead exist per watt of IT work. State the total energy and runtime as context. Conclude with a one-sentence verdict on what these headline numbers indicate about the system's suitability for the simulated workload.

Paragraph 2 - Performance and Energy Metrics:
Cover EVERY metric in the [Performance] and [Energy] sections. For each metric: state the exact value with unit, classify it (excellent/good/average/concerning/poor), and explain its physical meaning. For example: what does a PUE Average of X mean for the fraction of facility power going to cooling? What does Fan Energy of X kWh mean relative to total electricity — is the cooling overhead negligible or significant? What does DX Backup of 0 kWh confirm about the operating mode? What does Availability of X% mean for server uptime? What does Failure Hours of X mean for the number of hours servers were at thermal risk?

Paragraph 3 - Financial Metrics:
Cover EVERY metric in the [Cost] section. For each: state the exact value and justify it. Is the annual electricity cost reasonable for a facility of this IT load? Is the OpEx per kWh IT competitive against industry benchmarks? Is the payback period commercially viable — state the exact years and classify against the benchmark (under 5 = excellent, 5-10 = good, 10-15 = marginal, over 15 = poor, 999 = not achieved)? Is the NPV positive or negative and what does that mean for the investment case? Does the CAPEX represent good value given the annual savings?

Paragraph 4 - {para4_topic.capitalize()}:
Cover EVERY metric in the [Emissions] and [Water] sections. For each: state the exact value and justify it. Then address the specific operational and compliance topics listed above for this technique.
{projection_para_instruction}
{cooling_assessment_para_instruction}

key_insight: one sentence identifying the single most critical finding - the metric that most determines whether this technique should be deployed.

Return JSON: {{"explanation": "...", "key_insight": "..."}}"""

    return system_prompt, user_prompt


# â”€â”€ FastAPI app â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app = FastAPI(
    title="Metrics Explanation API",
    description="LLM-powered explanation of simulation KPI metrics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "Metrics Explanation API",
        "groq_configured": bool(GROQ_API_KEY),
        "model": GROQ_MODEL,
    }


@app.post("/api/explain-metrics", response_model=MetricsExplanationResponse)
async def explain_metrics(request: MetricsExplanationRequest):
    if not request.metrics:
        raise HTTPException(status_code=400, detail="No metrics provided")
    try:
        system_prompt, user_prompt = _build_prompts(request)
        explanation, key_insight, prompt_tokens, completion_tokens = _call_groq(system_prompt, user_prompt)
        return MetricsExplanationResponse(
            explanation=explanation.strip(),
            keyInsight=key_insight.strip() if key_insight else None,
            model_used=GROQ_MODEL,
            tokens_used={"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("METRICS_EXPLANATION_API_PORT", 8005))
    print(f"\n{'='*55}")
    print(f"Metrics Explanation API  â†’  http://localhost:{port}")
    print(f"Endpoint: POST /api/explain-metrics")
    print(f"GROQ model: {GROQ_MODEL}")
    print(f"GROQ key prefix: {GROQ_API_KEY[:12]}..." if GROQ_API_KEY else "GROQ key: NOT SET")
    print(f"{'='*55}\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
