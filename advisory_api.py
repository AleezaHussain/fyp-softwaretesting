import os
import json
import re
import time
from datetime import datetime
from typing import Any, Dict, Optional, Tuple
from pathlib import Path
from urllib import request as urlrequest
from urllib.error import URLError, HTTPError
from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from supabase import create_client, Client
except ImportError:
    Client = None

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
_load_local_env(BASE_DIR / ".env.local")  # also load .env.local

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openrouter").strip().lower()
LLM_PROVIDER_CHAIN = os.getenv("LLM_PROVIDER_CHAIN", "").strip().lower()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_MODEL_CHAIN = os.getenv("GROQ_MODEL_CHAIN", "").strip()
XAI_API_KEY = os.getenv("XAI_API_KEY", os.getenv("GROK_API_KEY", ""))
XAI_MODEL = os.getenv("XAI_MODEL", os.getenv("GROK_MODEL", "grok-3-mini"))
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", os.getenv("OLLAMA_MODEL_NAME", "llama3.1:8b"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
supabase_client: Optional[Client] = None

def _init_supabase() -> Optional[Client]:
    """Initialize Supabase client if credentials are available."""
    global supabase_client
    if SUPABASE_URL and SUPABASE_ANON_KEY and Client is not None:
        try:
            supabase_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            return supabase_client
        except Exception as e:
            print(f"Warning: Failed to initialize Supabase: {e}")
            return None
    return None

_init_supabase()

TECHNIQUE_SAMPLE_FILES = {
    "air": BASE_DIR / "air-side output.txt",
    "evaporative": BASE_DIR / "evaporative-output.txt",
    "chilled": BASE_DIR / "chilled-output.txt",
}
METHODOLOGY_TEXT_FILE = BASE_DIR / "cooling_methodology.txt"
METHODOLOGY_PDF_FILE = BASE_DIR / "Coolience research paper.pdf"

frontend_origins_env = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173,http://127.0.0.1:3000,http://127.0.0.1:3001",
)
allowed_origins = [origin.strip() for origin in frontend_origins_env.split(",") if origin.strip()]


class AdvisoryAskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    simulationId: str = Field(..., min_length=1)
    simulation: Optional[Dict[str, Any]] = None  # Optional - can load from Supabase
    methodology: Optional[Dict[str, Any]] = None
    parameters: Optional[Dict[str, Any]] = None


class AdvisoryAskResponse(BaseModel):
    answer: str
    metadata: Dict[str, Any]


app = FastAPI(title="Advisory LLM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _fallback_answer(req: AdvisoryAskRequest) -> str:
    technique = req.simulation.get("coolingTechnique") or req.simulation.get("simulation_type") or "Unknown"
    status = req.simulation.get("status", "unknown")

    return (
        "Live LLM response is unavailable right now. "
        f"Selected simulation {req.simulationId} ({technique}) is loaded with status {status}. "
        "Your question was received; check active LLM provider settings and retry."
    )


def _normalize_technique(raw_technique: str) -> str:
    text = (raw_technique or "").strip().lower()
    if "air" in text:
        return "air"
    if "evap" in text:
        return "evaporative"
    if "chilled" in text or "water" in text:
        return "chilled"
    return "air"


def _extract_reference_snapshot(payload: Dict[str, Any]) -> Dict[str, Any]:
    # Keep this compact to avoid sending huge context windows to the model.
    snapshot: Dict[str, Any] = {}

    if isinstance(payload.get("summary"), dict):
        snapshot["summary"] = payload["summary"]
    elif isinstance(payload.get("results"), dict):
        snapshot["results"] = payload["results"]

    hourly = payload.get("hourlyResults") or payload.get("hourly_data") or []
    if isinstance(hourly, list) and hourly:
        snapshot["hourly_preview"] = hourly[:6]
        snapshot["hourly_points"] = len(hourly)

    return snapshot


def _load_reference_parameters(technique: str) -> Dict[str, Any]:
    path = TECHNIQUE_SAMPLE_FILES.get(technique)
    if not path or not path.exists():
        return {
            "note": f"No reference parameter file found for technique '{technique}'.",
        }

    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
        parsed = json.loads(text)
        return {
            "technique": technique,
            "source_file": str(path.name),
            "reference": _extract_reference_snapshot(parsed),
        }
    except Exception as exc:
        return {
            "technique": technique,
            "source_file": str(path.name),
            "note": f"Failed to parse reference parameter file: {exc}",
        }


def _load_methodology_context() -> Dict[str, Any]:
    if METHODOLOGY_TEXT_FILE.exists():
        try:
            text = METHODOLOGY_TEXT_FILE.read_text(encoding="utf-8", errors="ignore")
            return {
                "source_file": METHODOLOGY_TEXT_FILE.name,
                "text": text,
                "chars": len(text),
                "lines": text.count("\n") + 1,
            }
        except Exception as exc:
            return {
                "note": f"Methodology text file exists but could not be read: {exc}",
            }

    if METHODOLOGY_PDF_FILE.exists():
        return {
            "source_file": METHODOLOGY_PDF_FILE.name,
            "note": (
                "Methodology PDF is present but not parsed to text yet. "
                "Provide a text or JSON methodology file named cooling_methodology.txt for grounded prompts."
            ),
        }

    return {
        "note": "No methodology file found. Add cooling_methodology.txt in project root.",
    }


def _truncate_text(value: str, max_chars: int, label: str) -> str:
    if len(value) <= max_chars:
        return value
    return (
        value[:max_chars]
        + f"\\n... [truncated {label}: {len(value) - max_chars} chars omitted]"
    )


def _extract_key_metrics(simulation: Dict[str, Any]) -> str:
    """
    Extract real metrics from simulation data.
    Handles all 3 technique structures:
      - Air Economizer:  result_data.summary  +  result_data.rawAirEconomizerData.summary
      - Chilled Water:   result_data (flat fields) + result_data.results.annual/metrics/economics
      - Evaporative:     result_data (flat fields) + result_data.evaporativeResults
    """
    metrics: list[str] = []
    seen: set[str] = set()

    def _add(label: str, value, fmt: str = "") -> None:
        key = label.lower()
        if value is None or key in seen:
            return
        seen.add(key)
        try:
            fval = float(value)
            if fmt == "$":
                metrics.append(f"{label}: ${fval:,.2f}")
            elif fmt == "%":
                metrics.append(f"{label}: {fval:.1f}%")
            elif fmt == "kwh":
                metrics.append(f"{label}: {fval:,.0f} kWh")
            elif fmt == "kg":
                metrics.append(f"{label}: {fval:,.0f} kg")
            elif fmt == "L":
                metrics.append(f"{label}: {fval:,.0f} liters")
            elif fmt == "yrs":
                metrics.append(f"{label}: {fval:.1f} years")
            else:
                metrics.append(f"{label}: {fval:.2f}")
        except (ValueError, TypeError):
            metrics.append(f"{label}: {value}")

    # ── AIR ECONOMIZER ────────────────────────────────────────────────────────
    # Primary source: result_data.summary  (always present for air)
    air_summary = simulation.get("summary", {})
    if isinstance(air_summary, dict) and air_summary:
        _add("Average PUE",           air_summary.get("averagePUE"),              "")
        _add("Average CUE",           air_summary.get("averageCUE"),              "")
        _add("Total energy used",     air_summary.get("totalEnergy_kWh"),         "kwh")
        _add("IT energy",             air_summary.get("totalItEnergy_kWh"),       "kwh")
        _add("Cooling energy",        air_summary.get("totalCoolingEnergy_kWh"),  "kwh")
        _add("Electricity cost",      air_summary.get("electricityCostUSD"),      "$")
        _add("Estimated OpEx",        air_summary.get("estimatedOpExUSD"),        "$")
        _add("Annual OpEx",           air_summary.get("annualOpExUSD"),           "$")
        _add("Annual savings",        air_summary.get("annualSavingsUSD"),        "$")
        _add("Carbon emissions",      air_summary.get("totalCarbonEmissions_kg"), "kg")
        _add("Carbon savings",        air_summary.get("carbonSavings_kg"),        "kg")
        _add("Water usage",           air_summary.get("waterUsage_liters"),       "L")
        _add("Payback period",        air_summary.get("paybackPeriodYears"),      "yrs")
        _add("Energy savings",        air_summary.get("energySavingsPercent"),    "%")
        _add("Capital cost (CAPEX)",  air_summary.get("totalCapexUSD"),           "$")

    # Also pull from results.annual / results.metrics / results.economics (air new format)
    results_block = simulation.get("results", {})
    if isinstance(results_block, dict):
        annual = results_block.get("annual", {})
        if isinstance(annual, dict):
            _add("Total energy used",  annual.get("energyConsumption_kWh"), "kwh")
            _add("Annual cost",        annual.get("cost_USD"),              "$")
            _add("Water usage",        annual.get("waterUsage_L"),          "L")
            _add("Carbon emissions",   annual.get("carbonEmissions_kg"),    "kg")

        rm = results_block.get("metrics", {})
        if isinstance(rm, dict):
            _add("Average PUE",  rm.get("pue"),        "")
            _add("Average COP",  rm.get("averageCOP"), "")
            _add("Average WUE",  rm.get("wue"),        "")
            _add("Average CUE",  rm.get("cue"),        "")

        econ = results_block.get("economics", {})
        if isinstance(econ, dict):
            _add("Capital cost (CAPEX)",  econ.get("capex_USD"),           "$")
            _add("Annual OpEx",           econ.get("opex_annual_USD"),     "$")
            _add("Payback period",        econ.get("paybackPeriod_years"), "yrs")
            _add("NPV",                   econ.get("npv_USD"),             "$")
            _add("Annual savings",        econ.get("annualSavings_USD"),   "$")

    # ── CHILLED WATER ─────────────────────────────────────────────────────────
    # Flat fields directly on result_data after merge
    _add("Average PUE",       simulation.get("pue") or simulation.get("averagePUE"),  "")
    _add("Average COP",       simulation.get("averageCOP"),                           "")
    _add("Average WUE",       simulation.get("wue"),                                  "")
    _add("Total energy used", simulation.get("totalEnergy_kWh") or simulation.get("totalEnergyConsumption"), "kwh")
    _add("Annual cost",       simulation.get("estimatedCost") or simulation.get("opex_annual_USD"),          "$")
    _add("Annual savings",    simulation.get("annualSavingsUSD"),                     "$")
    _add("Carbon emissions",  simulation.get("totalCarbonEmissions_kg") or simulation.get("carbonFootprint") or simulation.get("annual_emissions_kg"), "kg")
    _add("Water usage",       simulation.get("waterUsage_L") or simulation.get("annual_water_liters"),       "L")
    _add("Payback period",    simulation.get("paybackPeriod_years"),                  "yrs")
    _add("Capital cost",      simulation.get("capex_USD"),                            "$")
    _add("NPV",               simulation.get("npv_USD"),                              "$")

    # Chilled water nested economics block
    cw_econ = simulation.get("economics", {})
    if isinstance(cw_econ, dict):
        _add("Capital cost (CAPEX)", cw_econ.get("capex_USD"),           "$")
        _add("Annual OpEx",          cw_econ.get("opex_annual_USD"),     "$")
        _add("Annual savings",       cw_econ.get("annualSavingsUSD"),    "$")
        _add("Payback period",       cw_econ.get("paybackPeriod_years"), "yrs")
        _add("NPV",                  cw_econ.get("npv_USD"),             "$")

    # ── EVAPORATIVE ───────────────────────────────────────────────────────────
    _add("IT energy",      simulation.get("it_kwh"),          "kwh")
    _add("Fan energy",     simulation.get("fan_kwh"),          "kwh")
    _add("Pump energy",    simulation.get("pump_kwh"),         "kwh")
    _add("Water evaporated", simulation.get("evaporation_liters") or simulation.get("waterConsumption"), "L")

    evap_res = simulation.get("evaporativeResults", {})
    if isinstance(evap_res, dict):
        _add("IT energy",          evap_res.get("itEnergy"),           "kwh")
        _add("Fan energy",         evap_res.get("fanEnergy"),          "kwh")
        _add("Water evaporation",  evap_res.get("waterEvaporation"),   "L")
        _add("Cooling failure hrs",evap_res.get("coolingFailureHours"),"")

    # Cooling adequacy status
    ca = simulation.get("coolingAdequacy", {})
    if isinstance(ca, dict) and ca.get("status"):
        metrics.append(f"Cooling adequacy status: {ca['status']}")

    # ── ML RECOMMENDATION (all techniques) ───────────────────────────────────
    ml = simulation.get("mlRecommendation", {})
    if not isinstance(ml, dict):
        ml = {}
    rec = ml.get("model_recommendation") or ml.get("current_technique")
    if rec:
        metrics.append(f"ML recommended technique: {rec}")

    # ── AIRFLOW VIOLATIONS (air economizer) ───────────────────────────────────
    av = simulation.get("airflowViolations", {})
    if isinstance(av, dict) and av.get("percentageHours"):
        metrics.append(f"Airflow violation rate: {av['percentageHours']}% of hours ({av.get('totalViolationHours')} hours)")

    return "\n".join(metrics) if metrics else "Simulation data available for analysis"


def _extract_specific_hour(simulation: Dict[str, Any], question: str) -> str:
    """If user asks about a specific hour, extract that hour's data from hourlyData."""
    import re
    # Detect hour number in question
    match = re.search(r'\b(?:hour|hr)\s*#?\s*(\d+)\b', question, re.IGNORECASE)
    if not match:
        match = re.search(r'\b(\d+)(?:st|nd|rd|th)?\s*hour\b', question, re.IGNORECASE)
    if not match:
        return ""

    hour_num = int(match.group(1))

    # Resolve hourlyData list
    hourly = (
        simulation.get("hourlyData")
        or simulation.get("hourlyResults")
        or (simulation.get("results", {}) or {}).get("hourlyResults")
        or (simulation.get("rawEvaporativeData", {}) or {}).get("hourly_data")
        or (simulation.get("rawAirEconomizerData", {}) or {}).get("hourlyResults")
        or []
    )

    if not isinstance(hourly, list) or len(hourly) == 0:
        return ""

    # Find the matching hour entry
    hour_data = None
    for h in hourly:
        if isinstance(h, dict):
            h_val = h.get("hour") or h.get("timestampHour") or h.get("timestamp")
            if h_val is not None and int(h_val) == hour_num:
                hour_data = h
                break

    # Fallback to index if not found by hour field
    if hour_data is None and hour_num < len(hourly):
        hour_data = hourly[hour_num]

    if not hour_data:
        return f"Hour {hour_num} not found in simulation data (total hours: {len(hourly)})."

    lines = [f"DATA FOR HOUR {hour_num}:"]
    field_map = [
        ("pue",                "PUE"),
        ("itLoadKW",           "IT Load (kW)"),
        ("itLoad_kW",          "IT Load (kW)"),
        ("fanPowerKW",         "Fan Power (kW)"),
        ("fanPower_kW",        "Fan Power (kW)"),
        ("mechPower_kW",       "Mechanical Power (kW)"),
        ("totalElectricalKW",  "Total Electrical (kW)"),
        ("totalPower_kW",      "Total Power (kW)"),
        ("inletTempC",         "Inlet Temp (°C)"),
        ("outdoorTempC",       "Outdoor Temp (°C)"),
        ("ambientTempC",       "Ambient Temp (°C)"),
        ("supplyTempC",        "Supply Temp (°C)"),
        ("coolingMode",        "Cooling Mode"),
        ("mode",               "Cooling Mode"),
        ("coolingCapacityKW",  "Cooling Capacity (kW)"),
        ("coolingLoad_kW",     "Cooling Load (kW)"),
        ("waterEvaporationLph","Water Evaporation (L/hr)"),
        ("dxPowerKW",          "DX Backup Power (kW)"),
        ("q_free_kW",          "Free Cooling (kW)"),
        ("airflowViolation",   "Airflow Violation"),
        ("violationMsg",       "Violation Message"),
    ]
    seen_labels = set()
    for field, label in field_map:
        if label in seen_labels:
            continue
        val = hour_data.get(field)
        if val is not None:
            seen_labels.add(label)
            if isinstance(val, float):
                lines.append(f"  {label}: {val:.4f}")
            else:
                lines.append(f"  {label}: {val}")

    return "\n".join(lines)


    """
    Compute stats from hourly data for all 3 techniques.
    - Evaporative: result_data.hourlyData  (keys: pue, fanPowerKW, inletTempC, coolingMode, itLoadKW...)
    - Air Economizer: result_data.hourlyResults (keys: pue, fanPower_kW, itLoad_kW, mode, outdoorTempC...)
    - Chilled Water: result_data.results.hourlyResults
    """
    # Resolve hourly list from multiple possible locations
    hourly = (
        simulation.get("hourlyData")
        or simulation.get("hourlyResults")
        or (simulation.get("results", {}) or {}).get("hourlyResults")
        or (simulation.get("rawEvaporativeData", {}) or {}).get("hourly_data")
        or (simulation.get("rawAirEconomizerData", {}) or {}).get("hourlyResults")
        or (simulation.get("rawChilledWaterData", {}) or {}).get("results", {}).get("hourlyResults")
        or []
    )

    if not isinstance(hourly, list) or len(hourly) == 0:
        return ""

    stats: list[str] = []
    total = len(hourly)

    def _vals(keys):
        for h in hourly:
            for k in keys:
                v = h.get(k)
                if v is not None:
                    try:
                        yield float(v)
                    except (ValueError, TypeError):
                        pass
                    break

    # PUE stats
    pues = list(_vals(["pue", "PUE"]))
    if pues:
        stats.append(f"Hourly PUE — min: {min(pues):.2f}, max: {max(pues):.2f}, avg: {sum(pues)/len(pues):.2f} (over {total} hours)")

    # Inlet / supply temp
    temps = list(_vals(["inletTempC", "inlet_temp_c", "supplyTempC"]))
    if temps:
        stats.append(f"Inlet temperature — min: {min(temps):.1f}°C, max: {max(temps):.1f}°C, avg: {sum(temps)/len(temps):.1f}°C")

    # Fan power
    fan = list(_vals(["fanPowerKW", "fanPower_kW", "fan_power_kw"]))
    if fan:
        stats.append(f"Fan power — avg: {sum(fan)/len(fan):.2f} kW, peak: {max(fan):.2f} kW")

    # IT load
    it = list(_vals(["itLoadKW", "itLoad_kW", "it_load_kw"]))
    if it:
        stats.append(f"IT load — avg: {sum(it)/len(it):.1f} kW, peak: {max(it):.1f} kW")

    # Cooling modes (evaporative / air)
    modes: dict[str, int] = {}
    for h in hourly:
        m = h.get("coolingMode") or h.get("mode")
        if m:
            modes[m] = modes.get(m, 0) + 1
    if modes:
        mode_str = ", ".join(f"{m}: {c} hrs" for m, c in sorted(modes.items(), key=lambda x: -x[1]))
        stats.append(f"Cooling modes: {mode_str}")

    # Outdoor temp (air economizer)
    outdoor = list(_vals(["outdoorTempC", "outdoor_temp_c", "ambientTempC"]))
    if outdoor:
        stats.append(f"Outdoor temperature — min: {min(outdoor):.1f}°C, max: {max(outdoor):.1f}°C")

    return "\n".join(stats) if stats else ""


def _detect_question_keywords(question: str) -> Tuple[str, list]:
    """Detect what the user is asking about to select relevant context."""
    q_lower = question.lower()
    
    keyword_categories = {
        "energy": ["energy", "kwh", "consumption", "power", "efficiency", "watt"],
        "cost": ["cost", "price", "expense", "roi", "payback", "opex", "financial", "saving"],
        "thermal": ["temperature", "thermal", "inlet", "cool", "adequate", "overheat", "ashrae"],
        "carbon": ["carbon", "co2", "emission", "environmental", "sustainability", "green"],
        "water": ["water", "evaporation", "humid", "wue", "moisture", "gallons", "liters"],
        "comparison": ["compare", "versus", "vs", "better", "worse", "recommend", "technique"],
    }
    
    matched_categories = []
    for category, keywords in keyword_categories.items():
        if any(kw in q_lower for kw in keywords):
            matched_categories.append(category)
    
    primary_category = matched_categories[0] if matched_categories else "general"
    return primary_category, matched_categories


def _is_downside_question(question: str) -> bool:
    """Detect if user is explicitly asking for risks/problems/worst parts."""
    q_lower = question.lower()
    downside_terms = [
        "worst",
        "weakness",
        "downside",
        "risk",
        "problem",
        "issue",
        "bad",
        "limitation",
        "drawback",
        "concern",
        "negative",
        "why is it bad",
    ]
    return any(term in q_lower for term in downside_terms)


def _load_methodology_section(technique: str, category: str) -> str:
    """Load relevant methodology section based on cooling technique and question category."""
    technique_map = {
        "evaporative": BASE_DIR / "evaporative-output.txt",
        "chilled_water": BASE_DIR / "chilled-output.txt",
        "air": BASE_DIR / "air-side output.txt",
        "air_economizer": BASE_DIR / "air-side output.txt",
        "air-side": BASE_DIR / "air-side output.txt",
    }
    
    filepath = technique_map.get(technique.lower().replace("_", " ").strip())
    if not filepath or not filepath.exists():
        return ""
    
    try:
        text = filepath.read_text(encoding="utf-8", errors="ignore")
        # Extract first ~2000 chars of methodology (summary)
        return text[:2000]
    except Exception:
        return ""


def _fetch_simulation_from_supabase(simulation_id: str) -> Optional[Dict[str, Any]]:
    """Fetch simulation data from Supabase database."""
    if not supabase_client:
        return None
    
    try:
        # Query simulations table
        response = supabase_client.table("simulations").select("*").eq("id", int(simulation_id)).execute()
        simulations = response.data if response.data else []
        
        if not simulations:
            return None
        
        sim = simulations[0]
        
        # Query simulation_results
        results_response = supabase_client.table("simulation_results").select("*").eq("simulation_id", int(simulation_id)).execute()
        results = results_response.data if results_response.data else []
        
        # Combine data
        combined = {
            "id": sim.get("id"),
            "name": sim.get("name"),
            "simulation_type": sim.get("simulation_type"),
            "status": sim.get("status"),
            "results": results[0] if results else {}
        }
        
        return combined
    except Exception as e:
        print(f"Warning: Supabase query failed: {e}")
        return None


def _build_prompt(req: AdvisoryAskRequest) -> str:
    # Try to fetch from Supabase first
    db_sim = _fetch_simulation_from_supabase(req.simulationId)
    
    if db_sim:
        # result_data is the real payload for all techniques
        raw_row = db_sim.get("results", {})
        if isinstance(raw_row, dict):
            rd = raw_row.get("result_data")
            sim_data = dict(rd) if isinstance(rd, dict) else dict(raw_row)
        else:
            sim_data = {}
        technique = _normalize_technique(str(db_sim.get("simulation_type", "")))
    elif req.simulation:
        # Fall back to request body if provided
        sim_data = req.simulation
        technique_raw = str(
            req.simulation.get("coolingTechnique")
            or req.simulation.get("simulation_type")
            or ""
        )
        technique = _normalize_technique(technique_raw)
    else:
        # No data available
        return (
            "I don't have access to this simulation's data. "
            "Please either include the simulation data in your request or make sure the simulation ID exists in the database."
        )
    
    # Detect what the user is asking about
    primary_category, all_categories = _detect_question_keywords(req.question)
    downside_mode = _is_downside_question(req.question)
    
    # Extract metrics relevant to the question
    key_metrics = _extract_key_metrics(sim_data)
    hourly_stats = _extract_hourly_stats(sim_data)
    specific_hour = _extract_specific_hour(sim_data, req.question)
    print(f"[DEBUG] specific_hour extracted: {specific_hour[:200] if specific_hour else 'NONE'}")

    # Load relevant methodology section
    methodology_snippet = _load_methodology_section(technique, primary_category)

    # Build context based on question type
    context_lines = [
        f"COOLING TECHNIQUE: {technique}",
        f"QUESTION ABOUT: {', '.join(all_categories) if all_categories else 'simulation performance'}",
        "",
        "KEY RESULTS:",
        key_metrics,
    ]

    if specific_hour:
        context_lines.extend([
            "",
            specific_hour,
        ])
    elif hourly_stats:
        context_lines.extend([
            "",
            "HOURLY ANALYSIS:",
            hourly_stats,
        ])
    
    if methodology_snippet:
        context_lines.extend([
            "",
            f"REFERENCE INFORMATION:",
            methodology_snippet[:1500],  # Limit methodology to 1500 chars
        ])
    
    response_style = (
        "11. CRITICAL: The user asked for negatives/risks. Lead with the WORST issue first.\n"
        "12. Mention only drawbacks, constraints, failure points, and business risk impact unless the user asks for positives.\n"
        "13. Do not soften the answer with positive framing like 'good news' or 'overall strong performance'.\n"
        "14. Do NOT include benefits, savings opportunities, upside, or improvement suggestions unless explicitly asked.\n"
        "15. End with the key risk impact, not with a positive conclusion.\n"
    ) if downside_mode else (
        "11. Keep a balanced practical tone focused on business impact.\n"
    )

    return (
        "You are a helpful data center cooling advisor speaking to a manager or decision-maker. "
        "Your job is to answer questions in a FRIENDLY, CLEAR, and PRACTICAL way.\n\n"
        + "\n".join(context_lines) +
        f"\n\nUSER QUESTION: {req.question}\n\n"
        "RESPONSE FORMAT INSTRUCTIONS:\n"
        "1. Answer DIRECTLY and CONVERSATIONALLY - like you're explaining to a colleague\n"
        "2. Use specific NUMBERS from the results to support your answer\n"
        "3. Use simple language - avoid technical jargon and acronyms (explain if you use them)\n"
        "4. Break long answers into SHORT PARAGRAPHS with clear sections\n"
        "5. Use real-world comparisons when helpful (e.g., 'enough to power X homes')\n"
        "6. Focus on BUSINESS IMPACT: savings, efficiency, reliability\n"
        "7. If unclear, say 'I need more information about...'\n"
        "8. DO NOT mention simulation IDs, methodology files, or technical process details\n"
        "9. DO NOT include disclaimers like 'keep in mind these are estimates'\n"
        "10. DO NOT mention 'based on simulation results' - just give practical insights\n"
        "11. If the user asks about a specific hour but no 'DATA FOR HOUR X' section is provided in context, respond ONLY with: 'I could not find that hour in the simulation data. Could you please provide a valid hour number? The simulation covers hours 0 to 8759.'\n"
        "12. If the user's question contains a typo or unclear hour reference (like 'q0', 'hour x', 'hour abc'), respond ONLY with: 'It looks like the hour number might have a typo. Could you please re-enter a valid hour number between 0 and 8759?'\n"
        + response_style
    )


def _extract_hourly_stats(simulation: Dict[str, Any]) -> str:
    """Compute aggregate stats from hourly data for all 3 techniques."""
    hourly = (
        simulation.get("hourlyData")
        or simulation.get("hourlyResults")
        or (simulation.get("results", {}) or {}).get("hourlyResults")
        or (simulation.get("rawEvaporativeData", {}) or {}).get("hourly_data")
        or (simulation.get("rawAirEconomizerData", {}) or {}).get("hourlyResults")
        or []
    )
    if not isinstance(hourly, list) or len(hourly) == 0:
        return ""

    stats: list[str] = []
    total = len(hourly)

    def _vals(keys):
        for h in hourly:
            for k in keys:
                v = h.get(k)
                if v is not None:
                    try:
                        yield float(v)
                    except (ValueError, TypeError):
                        pass
                    break

    pues = list(_vals(["pue", "PUE"]))
    if pues:
        stats.append(f"Hourly PUE — min: {min(pues):.2f}, max: {max(pues):.2f}, avg: {sum(pues)/len(pues):.2f} (over {total} hours)")

    temps = list(_vals(["inletTempC", "inlet_temp_c", "supplyTempC"]))
    if temps:
        stats.append(f"Inlet temperature — min: {min(temps):.1f}°C, max: {max(temps):.1f}°C, avg: {sum(temps)/len(temps):.1f}°C")

    fan = list(_vals(["fanPowerKW", "fanPower_kW"]))
    if fan:
        stats.append(f"Fan power — avg: {sum(fan)/len(fan):.2f} kW, peak: {max(fan):.2f} kW")

    it = list(_vals(["itLoadKW", "itLoad_kW"]))
    if it:
        stats.append(f"IT load — avg: {sum(it)/len(it):.1f} kW, peak: {max(it):.1f} kW")

    modes: dict[str, int] = {}
    for h in hourly:
        m = h.get("coolingMode") or h.get("mode")
        if m:
            modes[m] = modes.get(m, 0) + 1
    if modes:
        stats.append("Cooling modes: " + ", ".join(f"{m}: {c} hrs" for m, c in sorted(modes.items(), key=lambda x: -x[1])))

    outdoor = list(_vals(["outdoorTempC", "ambientTempC"]))
    if outdoor:
        stats.append(f"Outdoor temperature — min: {min(outdoor):.1f}°C, max: {max(outdoor):.1f}°C")

    return "\n".join(stats) if stats else ""


def _extract_retry_seconds(detail: str) -> int:
    if not detail:
        return 0

    try:
        payload = json.loads(detail)
        retry_text = (
            payload.get("error", {})
            .get("details", [{}])[-1]
            .get("retryDelay", "")
        )
        if retry_text.endswith("s"):
            return max(0, int(float(retry_text[:-1])))
    except Exception:
        pass

    match = re.search(r"retry in\s+([0-9]+(?:\.[0-9]+)?)s", detail, re.IGNORECASE)
    if match:
        return max(0, int(float(match.group(1))))
    return 0


def _provider_chain() -> list[str]:
    provider_alias = {
        "grok": "xai",
        "xai": "xai",
        "ollama": "ollama",
        "groq": "groq",
        "openrouter": "openrouter",
        "gemini": "gemini",
    }
    allowed = set(provider_alias.values())
    configured = [provider_alias.get(p.strip().lower(), "") for p in LLM_PROVIDER_CHAIN.split(",") if p.strip()]
    if configured:
        deduped = []
        for p in configured:
            if p in allowed and p not in deduped:
                deduped.append(p)
        return deduped

    active = provider_alias.get(LLM_PROVIDER, "")
    if active in allowed:
        return [active]

    return ["ollama", "xai", "groq", "openrouter", "gemini"]


def _groq_model_chain() -> list[str]:
    if GROQ_MODEL_CHAIN:
        models = [m.strip() for m in GROQ_MODEL_CHAIN.split(",") if m.strip()]
        if models:
            return models
    return [GROQ_MODEL]


def _call_openrouter(system_prompt: str, prompt: str) -> tuple[str, str]:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "FYP Advisory Assistant",
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }

    req_obj = urlrequest.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    with urlrequest.urlopen(req_obj, timeout=45) as response:
        raw = response.read().decode("utf-8")
        data = json.loads(raw)

    answer = data["choices"][0]["message"]["content"].strip()
    if not answer:
        raise ValueError("OpenRouter returned an empty response")
    return answer, OPENROUTER_MODEL


def _call_groq(system_prompt: str, prompt: str) -> tuple[str, str]:
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FYP-Advisory-API/1.0",
    }
    model_errors: list[str] = []

    for model_name in _groq_model_chain():
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }

        req_obj = urlrequest.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urlrequest.urlopen(req_obj, timeout=45) as response:
                raw = response.read().decode("utf-8")
                data = json.loads(raw)

            answer = data["choices"][0]["message"]["content"].strip()
            if not answer:
                raise ValueError("Groq returned an empty response")
            return answer, model_name
        except HTTPError as exc:
            detail = exc.read().decode("utf-8") if hasattr(exc, "read") else str(exc)
            model_errors.append(f"{model_name}: HTTP {exc.code} {detail}")
        except URLError as exc:
            model_errors.append(f"{model_name}: {str(exc)}")
        except Exception as exc:
            model_errors.append(f"{model_name}: {str(exc)}")

    raise RuntimeError("Groq model chain failed: " + " | ".join(model_errors))


def _call_xai(system_prompt: str, prompt: str) -> tuple[str, str]:
    headers = {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    payload = {
        "model": XAI_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }

    req_obj = urlrequest.Request(
        "https://api.x.ai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    with urlrequest.urlopen(req_obj, timeout=60) as response:
        raw = response.read().decode("utf-8")
        data = json.loads(raw)

    answer = data["choices"][0]["message"]["content"].strip()
    if not answer:
        raise ValueError("xAI/Grok returned an empty response")
    return answer, XAI_MODEL


def _call_ollama(system_prompt: str, prompt: str) -> tuple[str, str]:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "options": {
            "temperature": 0.2,
        },
    }

    req_obj = urlrequest.Request(
        f"{OLLAMA_API_URL}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urlrequest.urlopen(req_obj, timeout=90) as response:
        raw = response.read().decode("utf-8")
        data = json.loads(raw)

    message = data.get("message", {})
    answer = str(message.get("content", "")).strip()
    if not answer:
        raise ValueError("Ollama returned an empty response")
    return answer, OLLAMA_MODEL


def _call_gemini(system_prompt: str, prompt: str) -> tuple[str, str]:
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            f"System Instruction: {system_prompt}\n\n"
                            f"User Prompt:\n{prompt}"
                        )
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
        },
    }

    for attempt in range(2):
        req_obj = urlrequest.Request(
            (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{quote(GEMINI_MODEL, safe='-._~')}:generateContent?key={GEMINI_API_KEY}"
            ),
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlrequest.urlopen(req_obj, timeout=60) as response:
                raw = response.read().decode("utf-8")
                data = json.loads(raw)

            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError(json.dumps(data, ensure_ascii=True))

            parts = candidates[0].get("content", {}).get("parts", [])
            answer = "\n".join(part.get("text", "") for part in parts if part.get("text", "")).strip()
            if not answer:
                raise ValueError(json.dumps(data, ensure_ascii=True))
            return answer, GEMINI_MODEL
        except HTTPError as exc:
            detail = exc.read().decode("utf-8") if hasattr(exc, "read") else str(exc)
            retry_after = _extract_retry_seconds(detail)
            if exc.code == 429 and attempt == 0 and retry_after > 0 and retry_after <= 90:
                time.sleep(retry_after + 1)
                continue
            raise

    raise RuntimeError("Gemini retry attempts exhausted")


@app.get("/api/health")
def health() -> Dict[str, Any]:
    chain = _provider_chain()
    active = chain[0] if chain else "unknown"

    return {
        "status": "healthy",
        "provider": active,
        "provider_chain": chain,
        "openrouter_configured": bool(OPENROUTER_API_KEY),
        "ollama_configured": bool(OLLAMA_API_URL),
        "ollama_model": OLLAMA_MODEL,
        "xai_configured": bool(XAI_API_KEY),
        "groq_configured": bool(GROQ_API_KEY),
        "groq_model_chain": _groq_model_chain(),
        "gemini_configured": bool(GEMINI_API_KEY),
        "model": OPENROUTER_MODEL,
        "active_model": (
            XAI_MODEL if active == "xai" else GROQ_MODEL if active == "groq" else GEMINI_MODEL if active == "gemini" else OPENROUTER_MODEL
        ),
        "provider_ready": bool(chain),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.post("/api/advisory/ask", response_model=AdvisoryAskResponse)
def advisory_ask(req: AdvisoryAskRequest) -> AdvisoryAskResponse:
    prompt = _build_prompt(req)

    system_prompt = "You provide grounded analysis of selected cooling simulations."
    chain = _provider_chain()
    if not chain:
        return AdvisoryAskResponse(
            answer=_fallback_answer(req),
            metadata={
                "source": "fallback",
                "reason": "No valid providers configured. Use LLM_PROVIDER_CHAIN with groq,openrouter,gemini.",
                "simulationId": req.simulationId,
            },
        )

    errors: list[str] = []

    for provider in chain:
        if provider == "ollama":
            try:
                answer, model = _call_ollama(system_prompt, prompt)
                return AdvisoryAskResponse(
                    answer=answer,
                    metadata={
                        "source": provider,
                        "model": model,
                        "provider_chain": chain,
                        "simulationId": req.simulationId,
                    },
                )
            except HTTPError as exc:
                detail = exc.read().decode("utf-8") if hasattr(exc, "read") else str(exc)
                errors.append(f"{provider}: HTTP {exc.code} {detail}")
            except URLError as exc:
                errors.append(f"{provider}: {str(exc)}")
            except Exception as exc:
                errors.append(f"{provider}: {str(exc)}")
            continue

        if provider == "xai" and not XAI_API_KEY:
            errors.append("xai: XAI_API_KEY (or GROK_API_KEY) missing")
            continue

        if provider == "groq" and not GROQ_API_KEY:
            errors.append("groq: GROQ_API_KEY missing")
            continue

        if provider == "openrouter" and not OPENROUTER_API_KEY:
            errors.append("openrouter: OPENROUTER_API_KEY missing")
            continue

        if provider == "gemini" and not GEMINI_API_KEY:
            errors.append("gemini: GEMINI_API_KEY missing")
            continue

        try:
            if provider == "xai":
                answer, model = _call_xai(system_prompt, prompt)
            elif provider == "groq":
                answer, model = _call_groq(system_prompt, prompt)
            elif provider == "openrouter":
                answer, model = _call_openrouter(system_prompt, prompt)
            else:
                answer, model = _call_gemini(system_prompt, prompt)

            return AdvisoryAskResponse(
                answer=answer,
                metadata={
                    "source": provider,
                    "model": model,
                    "provider_chain": chain,
                    "simulationId": req.simulationId,
                },
            )
        except HTTPError as exc:
            detail = exc.read().decode("utf-8") if hasattr(exc, "read") else str(exc)
            errors.append(f"{provider}: HTTP {exc.code} {detail}")
        except URLError as exc:
            errors.append(f"{provider}: {str(exc)}")
        except Exception as exc:
            errors.append(f"{provider}: {str(exc)}")

    return AdvisoryAskResponse(
        answer=_fallback_answer(req),
        metadata={
            "source": "fallback",
            "reason": " | ".join(errors) if errors else "All providers failed",
            "provider_chain": chain,
            "simulationId": req.simulationId,
        },
    )


def _resolve_simulation_payload(simulation_id: str, simulation: Optional[Dict[str, Any]]) -> Tuple[Dict[str, Any], str, str]:
    db_sim = _fetch_simulation_from_supabase(simulation_id)

    if db_sim:
        sim_name = db_sim.get("name") or f"Simulation {simulation_id}"
        technique = _normalize_technique(str(db_sim.get("simulation_type", "")))
        sim_data = db_sim.get("results", {})
        if isinstance(sim_data, dict) and isinstance(sim_data.get("result_data"), dict):
            merged = dict(sim_data)
            merged.update(sim_data.get("result_data", {}))
            sim_data = merged
        return sim_data if isinstance(sim_data, dict) else {}, technique, str(sim_name)

    if simulation:
        technique_raw = str(simulation.get("coolingTechnique") or simulation.get("simulation_type") or "")
        technique = _normalize_technique(technique_raw)
        sim_name = str(simulation.get("name") or f"Simulation {simulation_id}")
        result_blob = simulation.get("result") if isinstance(simulation.get("result"), dict) else simulation
        if isinstance(result_blob, dict) and isinstance(result_blob.get("result_data"), dict):
            merged = dict(result_blob)
            merged.update(result_blob.get("result_data", {}))
            result_blob = merged
        return result_blob if isinstance(result_blob, dict) else {}, technique, sim_name

    raise HTTPException(
        status_code=404,
        detail=(
            "Simulation data not found. Provide simulation in request or ensure simulation ID exists in database."
        ),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")
