from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse, StreamingResponse
import os
import joblib
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any, List, AsyncGenerator
import numpy as np
import requests
import base64
import logging
import json
import time
import re
from datetime import datetime
from functools import lru_cache
import hashlib
import pandas as pd

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

frontend_origins_env = os.getenv(
    'FRONTEND_ORIGINS',
    'http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173,http://127.0.0.1:3000,http://127.0.0.1:3001'
)
allowed_origins = [origin.strip() for origin in frontend_origins_env.split(',') if origin.strip()]

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the Random Forest model
try:
    rf_model = joblib.load('whatif_rf_model.joblib')
    logger.info("Random Forest model loaded successfully")
    
    # Check model features
    if hasattr(rf_model, 'n_features_in_'):
        model_features_count = rf_model.n_features_in_
        logger.info(f"Model expects {model_features_count} features")
    else:
        model_features_count = 8  # Default to 8 if not available
        logger.warning("Could not determine model feature count, assuming 8")
except Exception as e:
    logger.error(f"Failed to load RF model: {e}")
    rf_model = None
    model_features_count = 8

# Cache for predictions
prediction_cache = {}
CACHE_MAX_SIZE = 1000

# API Keys
HF_TOKEN = os.getenv('HF_TOKEN', '')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')

# Model endpoints
LLM_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3'
SD_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1'

class ScenarioParams(BaseModel):
    airflow_percent: Optional[float] = Field(100, ge=0, le=200)
    inlet_temp_c: Optional[float] = Field(24, ge=0, le=50)
    humidity_percent: Optional[float] = Field(50, ge=0, le=100)
    cooling_setpoint_c: Optional[float] = Field(24, ge=0, le=35)
    workload_kw: Optional[float] = Field(500, ge=0, le=5000)
    electricity_price: Optional[float] = Field(0.12, ge=0)
    water_price: Optional[float] = Field(0.001, ge=0)
    carbon_factor: Optional[float] = Field(0.45, ge=0)
    # Additional features for model compatibility
    server_count: Optional[int] = Field(100, ge=0)
    rack_density: Optional[float] = Field(10.0, ge=0)
    cooling_type: Optional[int] = Field(1, ge=0, le=3)  # 1=air, 2=water, 3=evap

class WhatIfRequest(BaseModel):
    question: str = Field(..., min_length=1)
    scenario: Optional[ScenarioParams] = None
    simulationId: Optional[str] = None
    model: str = Field('all', pattern='^(rf|llm|sd|all|stream)$')
    stream: bool = Field(False)
    context: Optional[str] = None

class WhatIfResponse(BaseModel):
    answer: Optional[str] = None
    llm_answer: Optional[str] = None
    rf_result: Optional[Dict[str, Any]] = None
    imageUrl: Optional[str] = None
    graphUrl: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class GenerateQuestionRequest(BaseModel):
    simulationId: Optional[int] = None
    scenario: Optional[ScenarioParams] = None
    question_type: Optional[str] = Field('optimization', pattern='^(optimization|risk|comparison|whatif)$')

def get_cache_key(question: str, scenario: Dict) -> str:
    """Generate cache key for predictions"""
    key_str = f"{question}_{json.dumps(scenario, sort_keys=True)}"
    return hashlib.md5(key_str.encode()).hexdigest()

@lru_cache(maxsize=100)
def analyze_question_intent(question: str) -> Dict[str, Any]:
    """Analyze the intent of the question for better responses"""
    question_lower = question.lower()
    
    intents = {
        'optimization': ['optimize', 'improve', 'reduce', 'save', 'efficiency', 'better'],
        'risk': ['risk', 'danger', 'failure', 'problem', 'issue', 'warning'],
        'comparison': ['compare', 'versus', 'vs', 'difference', 'better than'],
        'prediction': ['predict', 'forecast', 'estimate', 'expected', 'will happen'],
        'cost': ['cost', 'price', 'expense', 'saving', 'budget'],
        'sustainability': ['carbon', 'co2', 'environment', 'green', 'sustainable']
    }
    
    detected_intents = []
    for intent, keywords in intents.items():
        if any(keyword in question_lower for keyword in keywords):
            detected_intents.append(intent)
    
    if not detected_intents:
        detected_intents = ['whatif']
    
    return {
        'primary_intent': detected_intents[0],
        'all_intents': detected_intents,
        'has_numeric': any(char.isdigit() for char in question),
        'complexity': 'high' if len(question.split()) > 15 else 'medium' if len(question.split()) > 8 else 'low'
    }

def get_risk_level(scenario: ScenarioParams) -> str:
    """Estimate a simple thermal risk level from the current scenario."""
    score = 0

    if scenario.inlet_temp_c >= 30:
        score += 3
    elif scenario.inlet_temp_c >= 27:
        score += 2
    elif scenario.inlet_temp_c >= 25:
        score += 1

    if scenario.humidity_percent >= 75:
        score += 2
    elif scenario.humidity_percent >= 60:
        score += 1

    if scenario.workload_kw >= 3000:
        score += 2
    elif scenario.workload_kw >= 1000:
        score += 1

    if scenario.airflow_percent < 90:
        score += 1
    elif scenario.airflow_percent > 130:
        score -= 1

    if score >= 5:
        return "high"
    if score >= 3:
        return "medium"
    return "low"

def build_advisory_fallback(
    question: str,
    scenario: ScenarioParams,
    intent_analysis: Dict[str, Any],
    rf_result: Optional[Dict[str, Any]] = None,
    context: Optional[str] = None,
) -> str:
    """Build a clean, question-aware fallback when model calls are unavailable."""
    primary_intent = intent_analysis.get('primary_intent', 'whatif')
    risk_level = get_risk_level(scenario)
    metrics = (rf_result or {}).get('metrics') if rf_result else None

    pue_text = f"{metrics['pue']:.2f}" if metrics and metrics.get('pue') is not None else None
    hourly_cost_text = f"${metrics['hourly_cost']:.2f}/hour" if metrics and metrics.get('hourly_cost') is not None else None
    daily_cost_text = f"${metrics['daily_cost']:.2f}/day" if metrics and metrics.get('daily_cost') is not None else None
    water_text = f"{metrics['water_usage_l_per_hour']:.1f} L/hour" if metrics and metrics.get('water_usage_l_per_hour') is not None else None

    scenario_summary = (
        f"inlet temperature {scenario.inlet_temp_c:.1f}°C, humidity {scenario.humidity_percent:.1f}%, "
        f"airflow {scenario.airflow_percent:.1f}%, and IT load {scenario.workload_kw:.1f} kW"
    )

    direct_answer = f"For '{question}', the current operating point is {scenario_summary}."

    if primary_intent == 'risk':
        if risk_level == 'high':
            direct_answer = (
                f"For '{question}', the thermal risk is high because the current operating point is {scenario_summary}. "
                f"In this band, any extra heat load, airflow reduction, or sensor drift can push equipment closer to its safety margin."
            )
        elif risk_level == 'medium':
            direct_answer = (
                f"For '{question}', the thermal risk is moderate. The current operating point is {scenario_summary}, "
                f"so the system looks workable, but it should be watched closely if temperatures rise or airflow becomes uneven."
            )
        else:
            direct_answer = (
                f"For '{question}', the thermal risk is low. The current operating point is {scenario_summary}, which is generally within a stable cooling band."
            )
    elif primary_intent == 'optimization':
        direct_answer = (
            f"For '{question}', the current setup is already reasonably efficient. With {scenario_summary}, a small increase in setpoint or a more even airflow distribution is usually the safest way to improve efficiency without hurting thermal headroom."
        )
    elif primary_intent == 'comparison':
        direct_answer = (
            f"For '{question}', the better option depends on whether your priority is energy efficiency, water use, or thermal headroom. With {scenario_summary}, air-side measures usually help most when the outside air is favorable, while water-based or evaporative approaches become more attractive when you need stronger heat rejection."
        )
    else:
        direct_answer = (
            f"For '{question}', the current setup looks stable at {scenario_summary}. The main question is whether you want to optimize for energy, cost, or safety margin, because each choice shifts the recommended cooling strategy slightly."
        )

    technical_notes = [
        f"At inlet temperature {scenario.inlet_temp_c:.1f}°C, the cooling plant is not under extreme stress.",
        f"Humidity at {scenario.humidity_percent:.1f}% is acceptable, but sustained upward drift can reduce the safe operating margin.",
        f"IT load of {scenario.workload_kw:.1f} kW means load balance and airflow distribution matter more than raw cooling capacity alone.",
    ]

    recommendations = [
        "Keep inlet temperature within the safe band and adjust it gradually rather than in large jumps.",
        "Check airflow distribution and rack hotspots before making any aggressive setpoint change.",
        "Compare the current result with a nearby scenario, such as +1°C or +2°C, to quantify the trade-off before changing policy.",
    ]

    if metrics:
        technical_notes.insert(0, f"The RF model estimates PUE at {pue_text}, with hourly cost around {hourly_cost_text} and daily cost around {daily_cost_text}.")
        technical_notes.append(f"Estimated water usage is about {water_text}.")

    if context:
        technical_notes.append(f"Additional context was provided and used in the analysis: {context}.")

    return normalize_llm_text(
        "\n".join(
            [
                "Direct Answer:",
                f"- {direct_answer}",
                "",
                "Key Factors:",
                *[f"- {note}" for note in technical_notes],
                "",
                "Recommended Actions:",
                *[f"- {recommendation}" for recommendation in recommendations],
            ]
        )
    )

def normalize_llm_text(text: str) -> str:
    """Clean common LLM artifacts to improve readability in UI."""
    if not text:
        return ""

    # Remove an occasional leading "raw" artifact from streamed/text outputs.
    cleaned = re.sub(r"^\s*raw\s+", "", text, flags=re.IGNORECASE)

    # Strip markdown emphasis markers that can read awkwardly in plain text UI.
    cleaned = cleaned.replace("**", "").replace("__", "")

    # Collapse repeated adjacent words (e.g., "Based Based on on").
    for _ in range(3):
        updated = re.sub(r"\b([A-Za-z][A-Za-z0-9'\-]*)\b\s+\1\b", r"\1", cleaned, flags=re.IGNORECASE)
        if updated == cleaned:
            break
        cleaned = updated

    # Collapse repeated adjacent short phrases up to 8 words.
    for size in range(8, 1, -1):
        pattern = rf"\b((?:[A-Za-z0-9'\-]+\s+){{{size-1}}}[A-Za-z0-9'\-]+)\b(?:\s+\1\b)+"
        cleaned = re.sub(pattern, r"\1", cleaned, flags=re.IGNORECASE)

    # Remove repeated duplicated sentence fragments separated by punctuation.
    cleaned = re.sub(r"(\b[^\n.?!]{12,120}[.?!])(?:\s+\1)+", r"\1", cleaned, flags=re.IGNORECASE)

    # Normalize spacing without changing paragraph breaks.
    cleaned = re.sub(r"[^\S\r\n]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

    return cleaned.strip()

def prepare_features_for_model(scenario: ScenarioParams) -> np.ndarray:
    """Prepare feature vector matching model expectations"""
    global model_features_count
    
    # Extract basic features
    features = {
        'airflow_percent': scenario.airflow_percent or 100,
        'inlet_temp_c': scenario.inlet_temp_c or 24,
        'humidity_percent': scenario.humidity_percent or 50,
        'cooling_setpoint_c': scenario.cooling_setpoint_c or 24,
        'workload_kw': scenario.workload_kw or 500,
        'electricity_price': scenario.electricity_price or 0.12,
        'water_price': scenario.water_price or 0.001,
        'carbon_factor': scenario.carbon_factor or 0.45,
        'server_count': scenario.server_count or 100,
        'rack_density': scenario.rack_density or 10.0,
        'cooling_type': scenario.cooling_type or 1
    }
    
    # Create feature array based on expected count
    if model_features_count == 5:
        # Old model: [airflow, temp, humidity, setpoint, workload]
        feature_array = np.array([[
            features['airflow_percent'],
            features['inlet_temp_c'],
            features['humidity_percent'],
            features['cooling_setpoint_c'],
            features['workload_kw']
        ]])
    elif model_features_count == 8:
        # Standard model with cost and environmental factors
        feature_array = np.array([[
            features['airflow_percent'],
            features['inlet_temp_c'],
            features['humidity_percent'],
            features['cooling_setpoint_c'],
            features['workload_kw'],
            features['electricity_price'],
            features['water_price'],
            features['carbon_factor']
        ]])
    else:
        # Extended model with all features
        feature_array = np.array([[
            features['airflow_percent'],
            features['inlet_temp_c'],
            features['humidity_percent'],
            features['cooling_setpoint_c'],
            features['workload_kw'],
            features['electricity_price'],
            features['water_price'],
            features['carbon_factor'],
            features['server_count'],
            features['rack_density'],
            features['cooling_type']
        ][:model_features_count]])  # Slice to match model's expected features
    
    return feature_array

def calculate_metrics(scenario: ScenarioParams, rf_prediction: Dict) -> Dict[str, Any]:
    """Calculate comprehensive metrics based on scenario and predictions"""
    pue = 1.2 + (scenario.inlet_temp_c - 24) * 0.02 + (scenario.workload_kw / 5000) * 0.1
    pue = max(1.1, min(2.0, pue))
    
    total_power = rf_prediction.get('predicted_power_kw', scenario.workload_kw * pue)
    cooling_power = max(0, total_power - scenario.workload_kw)
    
    # Calculate metrics
    metrics = {
        'pue': round(pue, 3),
        'cooling_efficiency': round(rf_prediction.get('efficiency_percent', 85.0), 1),
        'total_power_kw': round(total_power, 1),
        'cooling_power_kw': round(cooling_power, 1),
        'hourly_cost': round(total_power * scenario.electricity_price, 2),
        'daily_cost': round(total_power * scenario.electricity_price * 24, 2),
        'monthly_cost': round(total_power * scenario.electricity_price * 24 * 30, 2),
        'hourly_co2': round(total_power * scenario.carbon_factor, 2),
        'daily_co2': round(total_power * scenario.carbon_factor * 24, 2),
        'wue_l_per_kwh': round(rf_prediction.get('wue_l_per_kwh', scenario.humidity_percent * 0.1), 2),
        'water_usage_l_per_hour': round(total_power * rf_prediction.get('wue_l_per_kwh', 5), 1)
    }
    
    # Add recommendations based on metrics
    recommendations = []
    if metrics['pue'] > 1.5:
        recommendations.append("⚠️ High PUE detected. Consider optimizing cooling systems.")
    if metrics['cooling_efficiency'] < 70:
        recommendations.append("⚠️ Low cooling efficiency. Check for airflow issues.")
    if metrics['hourly_cost'] > 100:
        recommendations.append("💰 High operating cost. Explore energy-saving measures.")
    if metrics['hourly_co2'] > 500:
        recommendations.append("🌍 High carbon footprint. Consider renewable energy options.")
    if metrics['water_usage_l_per_hour'] > 1000:
        recommendations.append("💧 High water usage. Consider water-efficient cooling.")
    
    metrics['recommendations'] = recommendations
    
    return metrics

def predict_with_rf(scenario: ScenarioParams) -> Dict[str, Any]:
    """Enhanced RF prediction with proper feature preparation"""
    try:
        if rf_model is None:
            return {
                "error": "Random Forest model not loaded",
                "predicted_power_kw": 0,
                "efficiency_percent": 0,
                "cost_usd_per_hour": 0,
                "wue_l_per_kwh": 0
            }
        
        # Check cache
        cache_key = get_cache_key("rf", scenario.dict())
        if cache_key in prediction_cache:
            logger.info(f"Using cached prediction for {cache_key}")
            return prediction_cache[cache_key]
        
        # Prepare features correctly
        features = prepare_features_for_model(scenario)
        logger.info(f"Prepared features shape: {features.shape}, expected features: {rf_model.n_features_in_ if hasattr(rf_model, 'n_features_in_') else 'unknown'}")
        
        # Make prediction
        prediction = rf_model.predict(features)
        
        # Calculate results based on prediction shape
        if len(prediction.shape) == 1:
            # Single output model
            predicted_power = float(prediction[0])
            result = {
                "predicted_power_kw": predicted_power,
                "efficiency_percent": 85.0 - (scenario.inlet_temp_c - 24) * 2,
                "cost_usd_per_hour": predicted_power * (scenario.electricity_price or 0.12),
                "wue_l_per_kwh": scenario.humidity_percent * 0.1
            }
        elif prediction.shape[1] >= 4:
            # Multi-output model
            result = {
                "predicted_power_kw": float(prediction[0][0]),
                "efficiency_percent": float(prediction[0][1]),
                "cost_usd_per_hour": float(prediction[0][2]),
                "wue_l_per_kwh": float(prediction[0][3])
            }
        else:
            # Fallback
            predicted_power = float(prediction[0][0]) if len(prediction[0]) > 0 else 0
            result = {
                "predicted_power_kw": predicted_power,
                "efficiency_percent": 85.0,
                "cost_usd_per_hour": predicted_power * (scenario.electricity_price or 0.12),
                "wue_l_per_kwh": scenario.humidity_percent * 0.1
            }
        
        # Add calculated metrics
        result['metrics'] = calculate_metrics(scenario, result)
        
        # Cache result
        if len(prediction_cache) < CACHE_MAX_SIZE:
            prediction_cache[cache_key] = result
        
        return result
            
    except Exception as e:
        logger.error(f"RF prediction error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": str(e),
            "predicted_power_kw": 0,
            "efficiency_percent": 0,
            "cost_usd_per_hour": 0,
            "wue_l_per_kwh": 0
        }

async def generate_enhanced_llm_response(
    question: str,
    scenario: ScenarioParams,
    context: Optional[str] = None,
    rf_result: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate enhanced LLM response with better prompting and fallbacks"""
    
    intent_analysis = analyze_question_intent(question)
    
    # Enhanced system prompt
    system_prompt = """You are an expert data center cooling analyst with deep knowledge of thermodynamics, HVAC systems, and energy efficiency.
Write in clear human language. Do not repeat words or phrases. Do not echo the prompt.
Be technically precise, concise, and actionable. Prefer short paragraphs over bullet lists."""
    
    # Create context-aware prompt
    user_prompt = f"""
    Analyze this what-if scenario for a data center:
    
    Question: {question}
    
    Current Configuration:
    - Airflow: {scenario.airflow_percent}%
    - Inlet Temperature: {scenario.inlet_temp_c}°C
    - Humidity: {scenario.humidity_percent}%
    - Cooling Setpoint: {scenario.cooling_setpoint_c}°C
    - IT Load: {scenario.workload_kw} kW
    - Electricity Price: ${scenario.electricity_price}/kWh
    - Water Price: ${scenario.water_price}/L
    - Carbon Factor: {scenario.carbon_factor} kg CO2/kWh
    
    Intent Analysis: {json.dumps(intent_analysis)}
    
    {f"Additional Context: {context}" if context else ""}
    
    Please provide:
    1. **Direct Answer**: Clear response to the what-if question
    2. **Quantitative Impact**: Specific numbers for energy, cost, and efficiency changes
    3. **Technical Analysis**: Explanation of the underlying thermodynamics/mechanics
    4. **Actionable Recommendations**: 2-3 concrete suggestions
    5. **Trade-offs**: Any potential downsides or considerations
    
    Format your response as short sections with bullet points:
    - Direct Answer
    - Key Factors
    - Recommended Actions
    - Trade-offs

    Avoid repeating any word, sentence, or header.
    """
    
    # Try OpenRouter with multiple model fallbacks
    models = [
        "openai/gpt-3.5-turbo",
        "anthropic/claude-2",
        "meta-llama/llama-2-70b-chat"
    ]
    
    for model in models:
        if OPENROUTER_API_KEY:
            try:
                headers = {
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                }
                data = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1000
                }
                
                resp = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=30
                )
                
                if resp.status_code == 200:
                    result = resp.json()
                    return normalize_llm_text(result['choices'][0]['message']['content'])
                    
            except Exception as e:
                logger.error(f"OpenRouter error with {model}: {e}")
                continue
    
    # Fallback to HuggingFace
    if HF_TOKEN:
        try:
            prompt = f"{system_prompt}\n\n{user_prompt}"
            response = query_huggingface_api(LLM_URL, prompt)
            if response and response.status_code == 200:
                result = response.json()
                return normalize_llm_text(result[0].get('generated_text', 'Analysis unavailable'))
        except Exception as e:
            logger.error(f"HuggingFace error: {e}")
    
    # Final fallback with intelligent response
    return normalize_llm_text(
        build_advisory_fallback(question, scenario, intent_analysis, rf_result=rf_result, context=context)
    )

def query_huggingface_api(url: str, prompt: str, max_retries: int = 2):
    """Query HuggingFace API with retry logic"""
    if not HF_TOKEN:
        return None
    
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    
    for attempt in range(max_retries):
        try:
            response = requests.post(
                url,
                headers=headers,
                json={"inputs": prompt},
                timeout=30
            )
            
            if response.status_code == 200:
                return response
            elif response.status_code == 503:
                time.sleep(2)
                continue
            else:
                return None
        except Exception as e:
            logger.error(f"Request error: {e}")
            return None
    
    return None

def generate_image(question: str, scenario: ScenarioParams) -> Optional[str]:
    """Generate enhanced image with context"""
    if not HF_TOKEN:
        return None
    
    # Create detailed prompt for better image generation
    prompt = f"""Professional technical illustration of data center cooling system:
    - Scenario: {question}
    - Temperature: {scenario.inlet_temp_c}°C
    - Humidity: {scenario.humidity_percent}%
    - IT Load: {scenario.workload_kw} kW
    Style: Technical diagram, clear labels, professional, modern data center"""
    
    response = query_huggingface_api(SD_URL, prompt)
    
    if response and response.status_code == 200:
        try:
            img_bytes = response.content
            img_b64 = base64.b64encode(img_bytes).decode('utf-8')
            return f"data:image/png;base64,{img_b64}"
        except Exception as e:
            logger.error(f"Failed to encode image: {e}")
            return None
    
    return None

@app.post('/api/whatif/generate-question')
async def generate_whatif_question(req: GenerateQuestionRequest):
    """Generate intelligent what-if questions based on context"""
    
    questions = []
    
    if req.question_type == 'optimization':
        questions = [
            "How can I optimize cooling efficiency while reducing costs?",
            f"What's the optimal temperature setpoint for {req.scenario.workload_kw if req.scenario else 500} kW IT load?",
            "How much could I save by implementing air-side economization?",
            "What's the ideal humidity level for maximum efficiency?"
        ]
    elif req.question_type == 'risk':
        questions = [
            "What's the risk of equipment failure at current temperatures?",
            "How does high humidity impact system reliability?",
            "What are the worst-case scenario failure points?",
            "What's the thermal margin for critical equipment?"
        ]
    elif req.question_type == 'comparison':
        questions = [
            "Compare air-side vs water-side cooling efficiency",
            "How does evaporative cooling compare to traditional cooling?",
            "What's the cost-benefit analysis of increasing temperature setpoint?",
            "Compare current setup with industry best practices"
        ]
    else:  # whatif
        questions = [
            f"What if I increase IT load to {int((req.scenario.workload_kw if req.scenario else 500) * 1.2)} kW?",
            f"What if I raise temperature to {int((req.scenario.inlet_temp_c if req.scenario else 24) + 3)}°C?",
            f"What if I reduce humidity to {max(30, (req.scenario.humidity_percent if req.scenario else 50) - 20)}%?",
            "What's the impact of implementing free cooling?",
            "How would renewable energy affect carbon footprint?",
            "What if I optimize airflow distribution?"
        ]
    
    # Use LLM to generate context-aware questions
    if OPENROUTER_API_KEY and req.simulationId:
        try:
            prompt = f"Generate 3 specific, actionable what-if questions for a data center simulation (ID: {req.simulationId}) with IT load {req.scenario.workload_kw if req.scenario else 500} kW. Focus on optimization and efficiency improvements."
            
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            data = {
                "model": "openai/gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": "You are a data center optimization expert. Generate specific, numerical what-if questions."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 200
            }
            
            resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data, timeout=10)
            if resp.status_code == 200:
                result = resp.json()
                generated = result['choices'][0]['message']['content']
                # Parse generated questions
                for line in generated.split('\n'):
                    if line.strip() and '?' in line:
                        questions.append(line.strip())
        except Exception as e:
            logger.error(f"LLM question generation error: {e}")
    
    # Select the best question
    selected_question = questions[0] if questions else "What if I increase IT load by 20%?"
    
    return JSONResponse({
        "generated_question": selected_question,
        "alternatives": questions[1:4] if len(questions) > 1 else []
    })

@app.post('/api/whatif', response_model=WhatIfResponse)
async def whatif_endpoint(req: WhatIfRequest):
    """Enhanced what-if endpoint with streaming support"""
    
    logger.info(f"Request: model={req.model}, question={req.question[:50]}...")
    
    # Handle streaming response
    if req.stream:
        return StreamingResponse(
            generate_streaming_response(req.question, req.scenario or ScenarioParams()),
            media_type="application/x-ndjson"
        )
    
    # Initialize response
    response = WhatIfResponse()
    metadata = {"timestamp": datetime.now().isoformat(), "models_used": []}
    
    if req.scenario is None:
        req.scenario = ScenarioParams()
    
    # Analyze intent
    intent = analyze_question_intent(req.question)
    metadata["intent"] = intent
    
    # Generate predictions based on selected model
    if req.model in ['rf', 'all']:
        try:
            rf_pred = predict_with_rf(req.scenario)
            response.rf_result = rf_pred
            metadata["models_used"].append("rf")
            
            if 'error' not in rf_pred and rf_pred.get('metrics'):
                metrics = rf_pred['metrics']
                response.answer = f"""**📊 Impact Analysis**

**Energy Metrics:**
• Total Power: {metrics.get('total_power_kw', 0):.1f} kW
• Cooling Power: {metrics.get('cooling_power_kw', 0):.1f} kW
• PUE: {metrics.get('pue', 0):.2f}
• Cooling Efficiency: {metrics.get('cooling_efficiency', 0):.1f}%

**💰 Cost Impact:**
• Hourly: ${metrics.get('hourly_cost', 0):.2f}
• Daily: ${metrics.get('daily_cost', 0):.2f}
• Monthly: ${metrics.get('monthly_cost', 0):.2f}

**🌍 Environmental Impact:**
• CO2 Emissions: {metrics.get('hourly_co2', 0):.1f} kg/hour
• Water Usage: {metrics.get('water_usage_l_per_hour', 0):.1f} L/hour

**💡 Recommendations:**
{chr(10).join(f'• {rec}' for rec in metrics.get('recommendations', []))}
"""
        except Exception as e:
            logger.error(f"RF error: {e}")
            response.error = f"RF prediction failed: {str(e)}"
            response.rf_result = {"error": str(e)}
    
    # Generate LLM analysis
    if req.model in ['llm', 'all']:
        try:
            response.llm_answer = await generate_enhanced_llm_response(
                req.question,
                req.scenario,
                req.context,
                response.rf_result,
            )
            metadata["models_used"].append("llm")
        except Exception as e:
            logger.error(f"LLM error: {e}")
            response.llm_answer = f"AI analysis temporarily unavailable"
    
    # Generate image
    if req.model in ['sd', 'all']:
        try:
            response.imageUrl = generate_image(req.question, req.scenario)
            if response.imageUrl:
                metadata["models_used"].append("sd")
        except Exception as e:
            logger.error(f"Image error: {e}")
    
    response.metadata = metadata
    
    return response

async def generate_streaming_response(question: str, scenario: ScenarioParams) -> AsyncGenerator[str, None]:
    """Generate streaming response for real-time feedback"""
    
    try:
        # Send initial status
        yield json.dumps({"type": "status", "content": "Analyzing question..."}) + "\n"
        await asyncio.sleep(0.1)
        
        intent = analyze_question_intent(question)
        yield json.dumps({"type": "intent", "content": intent}) + "\n"
        await asyncio.sleep(0.1)
        
        # Generate RF prediction
        yield json.dumps({"type": "status", "content": "Calculating predictions..."}) + "\n"
        rf_result = predict_with_rf(scenario)
        yield json.dumps({"type": "rf_prediction", "content": rf_result}) + "\n"
        await asyncio.sleep(0.1)
        
        # Generate LLM response
        yield json.dumps({"type": "status", "content": "Generating AI analysis..."}) + "\n"
        llm_response = await generate_enhanced_llm_response(question, scenario, rf_result=rf_result)
        
        # Stream LLM response
        yield json.dumps({"type": "llm_start", "content": ""}) + "\n"
        words = llm_response.split()
        for i, word in enumerate(words):
            yield json.dumps({"type": "llm_chunk", "content": word + (" " if i < len(words)-1 else "")}) + "\n"
            await asyncio.sleep(0.03)  # Faster streaming
        
        yield json.dumps({"type": "complete", "content": ""}) + "\n"
        
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield json.dumps({"type": "error", "content": str(e)}) + "\n"

@app.get('/api/health')
async def health_check():
    """Enhanced health check"""
    return {
        "status": "healthy",
        "rf_model_loaded": rf_model is not None,
        "model_features": model_features_count if rf_model else None,
        "hf_token_configured": bool(HF_TOKEN),
        "openrouter_configured": bool(OPENROUTER_API_KEY),
        "cache_size": len(prediction_cache),
        "timestamp": datetime.now().isoformat()
    }

@app.get('/api/whatif/suggestions')
async def get_suggestions(
    airflow_percent: float = 100,
    inlet_temp_c: float = 24,
    humidity_percent: float = 50,
    cooling_setpoint_c: float = 24,
    workload_kw: float = 500,
    electricity_price: float = 0.12,
    water_price: float = 0.001,
    carbon_factor: float = 0.45
):
    """Get intelligent suggestions based on current scenario"""
    
    scenario = ScenarioParams(
        airflow_percent=airflow_percent,
        inlet_temp_c=inlet_temp_c,
        humidity_percent=humidity_percent,
        cooling_setpoint_c=cooling_setpoint_c,
        workload_kw=workload_kw,
        electricity_price=electricity_price,
        water_price=water_price,
        carbon_factor=carbon_factor
    )
    
    suggestions = []
    
    # Temperature-based suggestions
    if inlet_temp_c > 28:
        suggestions.append({
            "title": "High Temperature Alert",
            "description": f"Current temperature {inlet_temp_c}°C is above optimal range",
            "action": "Consider raising cooling setpoint to 26°C for energy savings",
            "impact": "Potential 15-20% cooling energy reduction"
        })
    elif inlet_temp_c < 20:
        suggestions.append({
            "title": "Cooling Opportunity",
            "description": "Low ambient temperature detected",
            "action": "Enable economizer mode for free cooling",
            "impact": "Reduce mechanical cooling by up to 40%"
        })
    
    # Load-based suggestions
    if workload_kw > 3000:
        suggestions.append({
            "title": "High Density Workload",
            "description": f"IT load at {workload_kw} kW requires attention",
            "action": "Evaluate hot aisle containment and airflow optimization",
            "impact": "Improve cooling efficiency by 10-15%"
        })
    
    # Humidity suggestions
    if humidity_percent < 30:
        suggestions.append({
            "title": "Low Humidity Risk",
            "description": "ESD risk at current humidity levels",
            "action": "Increase humidity to 40-50% range",
            "impact": "Prevent static discharge damage to equipment"
        })
    elif humidity_percent > 70:
        suggestions.append({
            "title": "High Humidity Risk",
            "description": "Condensation risk detected",
            "action": "Dehumidify to 50-60% range",
            "impact": "Prevent corrosion and moisture damage"
        })
    
    # Add generic optimization suggestions
    if len(suggestions) < 3:
        suggestions.append({
            "title": "Optimize Airflow",
            "description": f"Current airflow at {airflow_percent}%",
            "action": "Implement variable speed fans for demand-based cooling",
            "impact": "Reduce fan energy by 20-30%"
        })
        
        suggestions.append({
            "title": "Consider Free Cooling",
            "description": "Evaluate outside air conditions",
            "action": "Implement air-side economizer if climate permits",
            "impact": "Reduce annual cooling costs by 30-50%"
        })
    
    return JSONResponse({"suggestions": suggestions})