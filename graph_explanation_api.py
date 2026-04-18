"""
Graph Explanation API - LLM-powered explanations for simulation charts
Uses GROQ API to explain charts in natural language
Runs on port 8003 - Separate from other APIs
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
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent


def _load_local_env(env_path: Path) -> None:
    """Load environment variables from .env file"""
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

# LLM Configuration
GROQ_API_KEY = os.getenv("GRAPH_EXPLANATION_GROQ_API_KEY", os.getenv("GROQ_API_KEY", ""))
GROQ_MODEL = os.getenv("GRAPH_EXPLANATION_GROQ_MODEL", os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"))

frontend_origins_env = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173,http://127.0.0.1:3000,http://127.0.0.1:3001",
)
allowed_origins = [origin.strip() for origin in frontend_origins_env.split(",") if origin.strip()]

_GROQ_REQUEST_LOCK = threading.Lock()


# ─────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────

class ChartDataPoint(BaseModel):
    """Single data point in chart"""
    label: str
    value: float


class SimulationContext(BaseModel):
    """Simulation context for LLM understanding"""
    location: Optional[str] = None
    outdoorTempC: Optional[float] = None
    humidity: Optional[float] = None
    servers: Optional[int] = None
    workloadPercent: Optional[float] = None
    itLoadKW: Optional[float] = None
    duration: Optional[str] = None
    coolingTechnique: Optional[str] = None


class GraphExplanationRequest(BaseModel):
    """Request to explain a graph"""
    chartTitle: str
    chartType: str
    xAxis: str
    yAxis: str
    data: List[ChartDataPoint]
    simulationContext: Optional[SimulationContext] = None


class GraphExplanationResponse(BaseModel):
    """Response with graph explanation"""
    explanation: str
    keyInsight: Optional[str] = None
    model_used: str
    tokens_used: Optional[Dict[str, int]] = None


class LLMGraphPayload(BaseModel):
    """Structured payload returned by the LLM."""
    explanation: str
    key_insight: Optional[str] = None


# ─────────────────────────────────────────────────────────────────
# LLM Functions
# ─────────────────────────────────────────────────────────────────

def _build_graph_explanation_prompt(req: GraphExplanationRequest) -> tuple[str, str]:
    """Build system and user prompts for graph explanation"""

    technique_label = req.simulationContext.coolingTechnique if req.simulationContext and req.simulationContext.coolingTechnique else "this technique"
    chart_kind = req.chartType.lower()
    chart_title_lower = req.chartTitle.lower()
    is_summary_chart = chart_kind in {"summary", "radar"} or any(
        term in chart_title_lower for term in ("summary", "overview", "assessment", "radar", "projection")
    )

    metric_notes: list[str] = []
    if is_summary_chart:
        label_map = {
            "energy (kwh)": "Energy shows the total electrical energy used by the simulation.",
            "it energy (kwh)": "IT Energy shows the energy used by the IT equipment itself.",
            "fan energy (kwh)": "Fan Energy shows the energy used by fans in the cooling system.",
            "water (l)": "Water shows the amount of water used by the cooling process.",
            "carbon (kg)": "Carbon shows the estimated carbon emissions for the simulation.",
            "cost (usd)": "Cost shows the annual operating cost in US dollars.",
            "avg pue": "PUE means Power Usage Effectiveness, and lower values are generally better.",
            "avg wue": "WUE means Water Usage Effectiveness, and lower values are generally better.",
            "cooling capacity avg": "Cooling Capacity Avg shows the average cooling capacity available.",
            "humidity deviation": "Humidity Deviation shows how far humidity is from the desired level.",
            "average temp": "Average Temp shows the average temperature measured in the chart.",
            "average rh": "Average RH means average relative humidity.",
            "humidity ok": "Humidity OK means the humidity check passed.",
            "heat balance": "Heat Balance shows whether the system is matching cooling to heat load.",
            "energy efficiency ok": "Energy Efficiency OK shows whether the energy check passed.",
            "inlet temperature ok": "Inlet Temperature OK shows whether rack inlet temperature stayed within the limit.",
        }

        for point in req.data:
            note = label_map.get(point.label.lower())
            if note:
                metric_notes.append(f"- {point.label}: {note}")
    
    system_prompt = """You are an AI assistant specialized in explaining data center cooling simulation results.
Your role is to produce strict, graph-grounded, user-friendly explanations in simple English with enough detail for a student to understand the graph.

Hard constraints (must follow all):
1. Use ONLY the provided chart data and explicit simulation context.
2. Do NOT provide causes, reasons, hypotheses, or external domain assumptions.
3. Do NOT use speculative terms such as: may, might, could, likely, probably, suggests, due to, because.
4. Do NOT introduce new metrics, units, thresholds, or values.
5. Use plain, friendly English that describes what the chart shows.
6. Explain what the important metrics mean in simple terms, not just their raw numbers.
7. Explain what the chart means for the technique being shown, such as whether the technique is performing well, poorly, or steadily based on the data.
8. If acronyms appear such as PUE, CUE, COP, or WUE, briefly explain them in the explanation.
9. If the chart is a summary/overview/assessment, describe the metrics directly instead of forcing a best/worst comparison.
10. Write in long paragraph form, not as short bullet-style statements.
11. Prefer 3 clear paragraphs when possible: first explain what the chart is showing, second explain the metrics in simple terms, and third explain what it means for the technique and simulation.
12. Keep explanation around 180 to 260 words when there is enough data.
13. If information is missing, state that it is not available in the graph data.
14. For summary charts, explain each check or metric in flow, and say what PASS and FAIL mean in plain English.
15. Return valid JSON only with this exact structure: {"explanation": "...", "key_insight": "..."}.
16. Keep the long explanation in the explanation field and the short takeaway in the key_insight field.
17. Do not wrap the JSON in markdown fences or add any extra text.
18. Never swap axes: X-axis is always the horizontal category/dimension named in the input, and Y-axis is always the vertical measured value/unit named in the input.
19. If you mention axis names in the explanation, repeat them exactly as provided and keep the same orientation."""

    # Build context string
    context_lines = []
    if req.simulationContext:
        ctx = req.simulationContext
        if ctx.location:
            context_lines.append(f"- Location: {ctx.location}")
        if ctx.outdoorTempC:
            context_lines.append(f"- Outdoor Temperature: {ctx.outdoorTempC}°C")
        if ctx.humidity:
            context_lines.append(f"- Humidity: {ctx.humidity}%")
        if ctx.servers:
            context_lines.append(f"- Number of Servers: {ctx.servers}")
        if ctx.workloadPercent:
            context_lines.append(f"- Workload: {ctx.workloadPercent}%")
        if ctx.itLoadKW:
            context_lines.append(f"- IT Load: {ctx.itLoadKW} kW")
        if ctx.coolingTechnique:
            context_lines.append(f"- Cooling Technique: {ctx.coolingTechnique}")

    context_str = "\n".join(context_lines) if context_lines else "No additional context provided"

    # Build data string
    data_lines = [f"- {point.label}: {point.value}" for point in req.data]
    data_str = "\n".join(data_lines)

    user_prompt = f"""Please explain the following graph from a data center cooling simulation:

Graph Title: {req.chartTitle}
Graph Type: {req.chartType}
X-Axis: {req.xAxis}
Y-Axis: {req.yAxis}

Simulation Context:
{context_str}

Chart Data:
{data_str}

Technique Context:
This chart belongs to the {technique_label} simulation.
If the chart is a cooling assessment or summary chart, explain the checks in plain English and describe what the result means for {technique_label}.

Metric Guide:
{chr(10).join(metric_notes) if metric_notes else "No extra metric guide available."}

Provide an explanation that includes:
1. What this graph shows in simple English
2. What is happening in the graph overall
3. What the main metrics mean and why they matter
4. What this means for the technique shown in the chart
5. The most important numbers shown in the chart
6. A clear, user-friendly takeaway from the chart data
7. Simulation context only when it helps explain the chart

For summary-style charts like cooling assessment:
- Explain what each check means in plain English.
- Explain PASS as the check being met and FAIL as the check not being met.
- Describe whether the current technique is meeting the assessment checks or not.
- Mention the most important failing checks first if any exist.
- Keep the explanation in flow: start with the overall result, then explain each check, then conclude with what it means for the technique.
- Do not compare different units against each other.

For regular comparison charts:
- Explain which values are higher or lower in a natural flow.
- Explain what that means for the technique shown.
- Keep the explanation readable like a short report, not a list.

Important: Do not explain causes or reasons. Do not use assumptions. Keep the explanation detailed but still easy to read.
Important: Do not answer in a single short sentence. Use at least two full sentences, and preferably two paragraphs.
Important: Follow the order of the listed data points exactly.
Important: Mention only the labels and values that appear in the chart data.
Important: For summary-style charts, explain the metric set without comparing unlike units.
Important: If a metric abbreviation is used, explain it briefly in the same sentence.
Important: Do not combine this chart with any other chart or technique not listed here.
Important: Do not reverse axis meaning. Use X-axis exactly as {req.xAxis} and Y-axis exactly as {req.yAxis}.
Important: The explanation field must be detailed and flow naturally; the key_insight field must be one concise sentence."""

    return system_prompt, user_prompt


def _call_groq_api(system_prompt: str, user_prompt: str) -> tuple[LLMGraphPayload, int, int]:
    """Call GROQ API and return structured explanation + token usage"""
    
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not configured in environment")
    
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
        "max_tokens": 900,
    }
    
    req_obj = urlrequest.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    with _GROQ_REQUEST_LOCK:
        last_error: Optional[Exception] = None
        for attempt in range(4):
            try:
                with urlrequest.urlopen(req_obj, timeout=30) as response:
                    raw = response.read().decode("utf-8")
                    data = json.loads(raw)

                response_text = data["choices"][0]["message"]["content"].strip()

                if not response_text:
                    raise ValueError("Empty response from GROQ API")

                cleaned_text = response_text.strip()
                if cleaned_text.startswith("```"):
                    cleaned_text = re.sub(r"^```(?:json)?\s*", "", cleaned_text, flags=re.IGNORECASE)
                    cleaned_text = re.sub(r"\s*```$", "", cleaned_text)

                json_text = cleaned_text
                if not json_text.lstrip().startswith("{"):
                    start = json_text.find("{")
                    end = json_text.rfind("}")
                    if start != -1 and end != -1 and end > start:
                        json_text = json_text[start : end + 1]

                try:
                    parsed = json.loads(json_text)
                    payload = LLMGraphPayload(**parsed)
                except Exception:
                    payload = LLMGraphPayload(explanation=response_text, key_insight=None)

                if not payload.explanation.strip():
                    payload = LLMGraphPayload(explanation=response_text, key_insight=None)

                payload.explanation = payload.explanation.strip()
                if payload.key_insight:
                    payload.key_insight = payload.key_insight.strip() or None

                # Extract token usage
                usage = data.get("usage", {})
                prompt_tokens = usage.get("prompt_tokens", 0)
                completion_tokens = usage.get("completion_tokens", 0)

                return payload, prompt_tokens, completion_tokens

            except HTTPError as e:
                error_detail = e.read().decode("utf-8") if hasattr(e, "read") else str(e)
                if e.code == 429 and attempt < 3:
                    last_error = e
                    time.sleep(2 ** attempt)
                    continue
                raise HTTPException(status_code=e.code, detail=f"GROQ API error: {error_detail}")
            except URLError as e:
                last_error = e
                if attempt < 3:
                    time.sleep(2 ** attempt)
                    continue
                raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")
            except json.JSONDecodeError as e:
                raise HTTPException(status_code=500, detail=f"Invalid JSON response: {str(e)}")

        if last_error is not None:
            raise HTTPException(status_code=500, detail=f"Connection error: {str(last_error)}")

        raise HTTPException(status_code=500, detail="Unknown GROQ API error")


def _build_key_insight(req: GraphExplanationRequest) -> str:
    """Return a concise takeaway only for charts that support a valid comparison."""
    title = req.chartTitle.lower()
    chart_type = req.chartType.lower()

    summary_style_titles = (
        "summary",
        "overview",
        "assessment",
        "cost structure",
        "compliance gates",
        "performance radar",
        "projection",
    )
    if chart_type in {"summary", "radar"} or any(term in title for term in summary_style_titles):
        labels = {point.label.upper() for point in req.data}
        if {"PASS", "FAIL"}.issubset(labels):
            pass_count = next((point.value for point in req.data if point.label.upper() == "PASS"), 0)
            fail_count = next((point.value for point in req.data if point.label.upper() == "FAIL"), 0)
            if fail_count > 0:
                return f"This summary shows {fail_count:.0f} failed checks and {pass_count:.0f} passed checks, so the technique is not meeting every requirement yet."
            return f"This summary shows {pass_count:.0f} passed checks and no failed checks, so the technique is meeting the listed requirements."

        top_point = max(req.data, key=lambda point: point.value)
        return f"{top_point.label} is the strongest value in this summary, so it is the clearest point to focus on first."

    if chart_type == "pie":
        total = sum(point.value for point in req.data if point.value > 0)
        if total <= 0:
            return ""
        dominant = max(req.data, key=lambda point: point.value)
        share = dominant.value / total * 100
        return f"{dominant.label} accounts for {share:.1f}% of the total shown in this chart."

    comparative_titles = ("comparison", "compare", "vs", "per hour", "over time", "distribution")
    if not any(term in title for term in comparative_titles):
        return ""

    if len(req.data) < 2:
        return ""

    values = [point.value for point in req.data]
    highest = max(req.data, key=lambda point: point.value)
    lowest = min(req.data, key=lambda point: point.value)

    if highest.label == lowest.label or highest.value == lowest.value:
        return ""

    difference = highest.value - lowest.value
    percent = ((difference / lowest.value) * 100) if lowest.value != 0 else 0
    unit = req.yAxis.strip()
    unit_suffix = f" {unit}" if unit else ""

    return (
        f"{lowest.label} is the lowest at {lowest.value:.2f}{unit_suffix}, while "
        f"{highest.label} is the highest at {highest.value:.2f}{unit_suffix}. "
        f"The gap is {difference:.2f}{unit_suffix} ({percent:.1f}%)."
    )


def _build_fallback_explanation(req: GraphExplanationRequest) -> str:
    """Return a concise explanation when the LLM call is unavailable."""
    if not req.data:
        return (
            f"The {req.chartTitle.lower()} chart cannot be interpreted because no chart values were provided. "
            "Please verify the simulation output and try again."
        )

    sorted_points = sorted(req.data, key=lambda point: point.value)
    lowest = sorted_points[0]
    highest = sorted_points[-1]
    difference = highest.value - lowest.value
    percent = ((difference / lowest.value) * 100) if lowest.value else 0

    context_bits: list[str] = []
    if req.simulationContext:
        if req.simulationContext.location:
            context_bits.append(req.simulationContext.location)
        if req.simulationContext.outdoorTempC is not None:
            context_bits.append(f"{req.simulationContext.outdoorTempC}°C outdoor temperature")
        if req.simulationContext.humidity is not None:
            context_bits.append(f"{req.simulationContext.humidity}% humidity")

    context_sentence = " ".join(context_bits)
    if context_sentence:
        context_sentence = f" Under {context_sentence},"

    return (
        f"This {req.chartType} chart compares {req.chartTitle.lower()} across the available cooling techniques. "
        f"{lowest.label} has the lowest value at {lowest.value:.2f}, while {highest.label} has the highest value at {highest.value:.2f}. "
        f"The gap between them is {difference:.2f}, or about {percent:.1f}% relative to the lowest value.{context_sentence} "
        "The lower value indicates the stronger performer for this metric, so the data points should be used to choose the most efficient cooling option for the simulation scenario."
    )


def _is_strict_graph_grounded(explanation: str) -> bool:
    """Return True when explanation avoids speculative/causal language."""
    text = explanation.lower()
    banned_patterns = [
        r"\bbecause\b",
        r"\bdue to\b",
        r"\bcaused by\b",
        r"\bmay\b",
        r"\bmight\b",
        r"\bcould\b",
        r"\blikely\b",
        r"\bprobably\b",
        r"\bsuggests?\b",
        r"\bpossibly\b",
        r"\bpotentially\b",
        r"\breason\b",
        r"\bwhy\b",
    ]
    return not any(re.search(pattern, text) for pattern in banned_patterns)


# ─────────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Graph Explanation API",
    description="LLM-powered graph explanation for cooling simulations",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Graph Explanation API",
        "groq_configured": bool(GROQ_API_KEY),
        "model": GROQ_MODEL,
    }


@app.post("/api/explain-graph", response_model=GraphExplanationResponse)
async def explain_graph(request: GraphExplanationRequest):
    """
    Explain a single chart/graph using LLM
    
    Takes chart metadata, data points, and simulation context.
    Returns natural language explanation of the graph.
    """
    try:
        # Build prompts
        system_prompt, user_prompt = _build_graph_explanation_prompt(request)
        
        # Call GROQ API
        payload, prompt_tokens, completion_tokens = _call_groq_api(system_prompt, user_prompt)

        explanation = payload.explanation.strip()
        key_insight = payload.key_insight.strip() if payload.key_insight else None
        
        return GraphExplanationResponse(
            explanation=explanation,
            keyInsight=key_insight,
            model_used=GROQ_MODEL,
            tokens_used={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
            }
        )

    except HTTPException as exc:
        raise exc
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error explaining graph: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("GRAPH_EXPLANATION_API_PORT", 8003))
    print(f"\n{'='*60}")
    print(f"Starting Graph Explanation API on port {port}...")
    print(f"{'='*60}")
    print(f"GROQ Model: {GROQ_MODEL}")
    print(f"GROQ API Key configured: {bool(GROQ_API_KEY)}")
    print(f"API will be at: http://localhost:{port}/api/explain-graph")
    print(f"Health check at: http://localhost:{port}/health")
    print(f"{'='*60}\n")
    
    uvicorn.run(app, host="0.0.0.0", port=port)
