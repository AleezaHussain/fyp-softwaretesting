"""
Raw Data Explanation API - LLM-powered explanations for hourly simulation data
Uses GROQ API to explain raw hourly records in natural language
Runs on port 8006
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


# ── Pydantic models ──────────────────────────────────────────────

class SimulationContext(BaseModel):
    technique: Optional[str] = None
    location: Optional[str] = None
    outdoorTempC: Optional[float] = None
    humidity: Optional[float] = None
    servers: Optional[int] = None
    totalHours: Optional[int] = None


class RawDataExplanationRequest(BaseModel):
    technique: str
    fields: List[str]                        # column names
    sampleRows: List[Dict[str, Any]]         # first 24 rows max
    totalRows: Optional[int] = None          # total hourly records
    simulationContext: Optional[SimulationContext] = None
    extraArrays: Optional[Dict[str, Any]] = None  # yearly projection + ML comparison


class RawDataExplanationResponse(BaseModel):
    fieldExplanations: Dict[str, str]        # field name → plain English meaning
    patternSummary: str                      # what the sample data shows
    keyInsight: Optional[str] = None
    model_used: str
    tokens_used: Optional[Dict[str, int]] = None


# ── Field guide — plain English meanings for known fields ────────

FIELD_GUIDE: Dict[str, str] = {
    # Air-side
    "timestampHour": "The simulation hour (0 = first hour of the year).",
    "outdoorTempC": "Outdoor dry-bulb temperature in °C at that hour.",
    "outdoorRH": "Outdoor relative humidity as a percentage.",
    "itLoad_kW": "IT equipment power consumption in kilowatts at that hour.",
    "requiredAirflow_CFM": "Volume of air (cubic feet per minute) needed to remove the IT heat.",
    "airflowViolation": "True if required airflow exceeds the 10,000 CFM physical limit.",
    "mode": "Economizer operating mode: FULL_ECON, PARTIAL_TRIM, or MECHANICAL_ONLY.",
    "coolingLoad_kW": "Total cooling load that must be removed in kilowatts.",
    "q_free_kW": "Heat removed by free outdoor-air cooling in kilowatts.",
    "mech_load_kW": "Heat that must be handled by mechanical (compressor) cooling.",
    "fanPower_kW": "Electrical power consumed by fans in kilowatts.",
    "mechPower_kW": "Electrical power consumed by the mechanical compressor.",
    "totalPower_kW": "Total facility power (IT + cooling) in kilowatts.",
    "pue": "Power Usage Effectiveness — total power divided by IT power. Closer to 1.0 is better.",
    "cue": "Carbon Usage Effectiveness — kg of CO2 per kWh of IT energy.",
    "violationMsg": "Engineering warning message when an airflow violation occurs.",
    # Evaporative
    "hour": "Simulation hour index (0–8759 for a full year).",
    "ambientTempC": "Outdoor ambient temperature in °C.",
    "ambientHumidity": "Outdoor relative humidity percentage.",
    "itLoadKW": "IT equipment power in kilowatts.",
    "totalElectricalKW": "Total electrical power drawn by the facility.",
    "fanPowerKW": "Fan power in kilowatts.",
    "dxPowerKW": "DX (direct expansion) compressor backup power — zero in pure evaporative mode.",
    "pumpPowerKW": "Pump power in kilowatts — zero in evaporative-only mode.",
    "coolingCapacityKW": "Cooling capacity delivered by the evaporative system in kilowatts.",
    "waterEvaporationLph": "Water evaporated per hour in litres.",
    "inletTempC": "Estimated rack inlet air temperature in °C. Should stay below 27°C (ASHRAE A1).",
    "coolingMode": "Evaporative mode: DEC (Direct) or IEC (Indirect).",
    "supplyTempC": "Temperature of supply air delivered to the white space in °C.",
    "supplyHumidity": "Humidity of supply air as a percentage.",
    # Chilled water
    "ambientTemp_C": "Outdoor ambient temperature in °C.",
    "chillerPower_kW": "Electrical power consumed by the chiller compressor.",
    "cop": "Coefficient of Performance — cooling output divided by compressor power. Higher is better.",
    "waterUsage_L": "Water consumed by the cooling tower in litres at that hour.",
    "cost_USD": "Estimated operating cost for that hour in US dollars.",
    "carbonEmissions_kg": "CO2 emissions for that hour in kilograms.",
}


# ── Helpers ──────────────────────────────────────────────────────

def _parse_llm_json(text: str) -> Dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except Exception:
        pass
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
    return {"field_explanations": {}, "pattern_summary": cleaned, "key_insight": None}


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
        "temperature": 0.0,
        "max_tokens": 1100,
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
                    parsed.get("field_explanations", {}),
                    parsed.get("pattern_summary", ""),
                    parsed.get("key_insight"),
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


def _build_prompts(req: RawDataExplanationRequest):
    technique = req.technique or "this cooling technique"
    total = req.totalRows or len(req.sampleRows)
    sample_count = len(req.sampleRows)

    ctx_lines = []
    if req.simulationContext:
        c = req.simulationContext
        if c.location:
            ctx_lines.append(f"Location: {c.location}")
        if c.outdoorTempC is not None:
            ctx_lines.append(f"Outdoor Temperature: {c.outdoorTempC}°C")
        if c.humidity is not None:
            ctx_lines.append(f"Humidity: {c.humidity}%")
        if c.servers is not None:
            ctx_lines.append(f"Servers: {c.servers}")
        if c.totalHours is not None:
            ctx_lines.append(f"Total Simulation Hours: {c.totalHours}")
    ctx_str = "\n".join(ctx_lines) if ctx_lines else "No additional context."

    # Build field guide for the fields present
    guide_lines = []
    for f in req.fields:
        if f in FIELD_GUIDE:
            guide_lines.append(f"- {f}: {FIELD_GUIDE[f]}")
        else:
            guide_lines.append(f"- {f}: (no guide available)")
    guide_str = "\n".join(guide_lines)

    # Compact sample — show first 6 rows only to keep prompt small
    sample_preview = req.sampleRows[:6]
    sample_str = json.dumps(sample_preview, indent=2)

    # Extra arrays context (yearly projection + ML comparison)
    extra_str = ""
    if req.extraArrays:
        yearly = req.extraArrays.get("yearlyProjection")
        ml = req.extraArrays.get("mlComparison")
        if yearly:
            extra_str += f"\n\n5-Year Projection data ({len(yearly)} years):\n{json.dumps(yearly, indent=2)}"
        if ml:
            extra_str += f"\n\nML Technique Comparison ({len(ml)} techniques):\n{json.dumps(ml, indent=2)}"

    system_prompt = """You are an AI assistant specialized in explaining data center cooling simulation raw data.
Your role is to explain what each data column means and what patterns are visible in the sample rows.

Hard rules:
1. Use ONLY the provided field names, values, and context.
2. Do NOT speculate or invent values.
3. Do NOT use: may, might, could, likely, probably, suggests, due to, because.
4. Explain each field in one clear sentence in plain English.
5. Write pattern_summary as exactly 4 separate paragraphs, each separated by a blank line (\\n\\n).
   Each paragraph must be 2-4 complete sentences. Do NOT run paragraphs together.
6. If yearly projection data is provided, Paragraph 4 must analyse the cost and emissions trend.
7. If ML comparison data is provided, add it as Paragraph 5.
8. Return valid JSON only with this exact structure:
   {
     "field_explanations": { "fieldName": "one sentence explanation", ... },
     "pattern_summary": "Paragraph 1 text.\\n\\nParagraph 2 text.\\n\\nParagraph 3 text.\\n\\nParagraph 4 text.",
     "key_insight": "one sentence most important observation"
   }
9. Do not wrap JSON in markdown fences.
10. field_explanations must contain an entry for every field listed.
11. pattern_summary MUST use \\n\\n between paragraphs — never run all text together on one line.
12. Each paragraph in pattern_summary must start with a capital letter and end with a period."""

    user_prompt = f"""Explain the raw simulation data for the {technique} cooling technique.

Simulation Context:
{ctx_str}

Total hourly records: {total}
Sample hourly rows (first {sample_count}):
{sample_str}

Column names and their guide:
{guide_str}{extra_str}

Instructions:
- field_explanations: for each column, one plain-English sentence explaining what it measures and its unit.
- pattern_summary: write EXACTLY 4 paragraphs separated by blank lines (\\n\\n between each paragraph).
  Paragraph 1: Describe what the hourly sample rows show overall — are values stable, rising, or falling? State specific numbers from the sample.
  Paragraph 2: Highlight the most important columns (PUE, mode, violations, inlet temp, COP) and explain what their specific values mean for system performance.
  Paragraph 3: Explain what this hourly data tells us about how the {technique} system is behaving in terms of efficiency and reliability.
  Paragraph 4: {"Analyse the cost and emissions trend across the " + str(len(req.extraArrays.get("yearlyProjection", [])) if req.extraArrays else 0) + " projected years — state Year 1 vs final year cost and emissions explicitly." if req.extraArrays and req.extraArrays.get("yearlyProjection") else "Summarise the key operational characteristics of this simulation run."}
  {"Paragraph 5: Explain which technique the ML model recommends and why, based on the scores — state the recommended technique name and its score explicitly." if req.extraArrays and req.extraArrays.get("mlComparison") else ""}
- key_insight: one sentence with the single most important observation from this data.

CRITICAL: Use \\n\\n (blank line) between every paragraph. Do NOT run all paragraphs together as one block of text.

Return JSON: {{"field_explanations": {{...}}, "pattern_summary": "Para 1 text.\\n\\nPara 2 text.\\n\\nPara 3 text.\\n\\nPara 4 text.", "key_insight": "..."}}"""

    return system_prompt, user_prompt


# ── FastAPI app ──────────────────────────────────────────────────

app = FastAPI(
    title="Raw Data Explanation API",
    description="LLM-powered explanation of hourly simulation raw data",
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
        "service": "Raw Data Explanation API",
        "groq_configured": bool(GROQ_API_KEY),
        "model": GROQ_MODEL,
    }


@app.post("/api/explain-raw-data", response_model=RawDataExplanationResponse)
async def explain_raw_data(request: RawDataExplanationRequest):
    if not request.fields:
        raise HTTPException(status_code=400, detail="No fields provided")
    if not request.sampleRows:
        raise HTTPException(status_code=400, detail="No sample rows provided")

    # Cap sample at 24 rows to keep prompt size reasonable
    request.sampleRows = request.sampleRows[:24]

    try:
        system_prompt, user_prompt = _build_prompts(request)
        field_explanations, pattern_summary, key_insight, pt, ct = _call_groq(system_prompt, user_prompt)

        # Fill in any missing fields from the static guide
        for f in request.fields:
            if f not in field_explanations:
                field_explanations[f] = FIELD_GUIDE.get(f, f"Value recorded for each simulation hour.")

        return RawDataExplanationResponse(
            fieldExplanations=field_explanations,
            patternSummary=pattern_summary.strip() if pattern_summary else "",
            keyInsight=key_insight.strip() if key_insight else None,
            model_used=GROQ_MODEL,
            tokens_used={"prompt_tokens": pt, "completion_tokens": ct},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("RAWDATA_EXPLANATION_API_PORT", 8006))
    print(f"\n{'='*55}")
    print(f"Raw Data Explanation API  →  http://localhost:{port}")
    print(f"Endpoint: POST /api/explain-raw-data")
    print(f"GROQ model: {GROQ_MODEL}")
    print(f"{'='*55}\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
