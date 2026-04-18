# Graph Explanation Feature - Quick Start Checklist ✅

## ✅ What Has Been Created

1. **Backend API** → `graph_explanation_api.py`
   - Separate, clean FastAPI module
   - Uses GROQ API (free tier)
   - Explains graphs in natural language
   - Runs on port 8003

2. **React Component** → `GraphWithExplanation.tsx`
   - Displays graph + AI explanation side-by-side
   - Auto-fetches explanation on mount
   - Shows key insights and data summary
   - Fully responsive (mobile + desktop)

3. **Configuration** → `.env` updated
   - `GRAPH_EXPLANATION_API_PORT=8003`
   - `VITE_GRAPH_EXPLANATION_API_URL=http://localhost:8003/api`

4. **Documentation** → `GRAPH_EXPLANATION_INTEGRATION.md`
   - Complete integration guide
   - Code examples
   - Troubleshooting

5. **Testing** → `test_graph_explanation_api.py`
   - Automated API tests
   - Ready to run

---

## 🚀 Next Steps (DO THIS NOW)

### Step 1: Test the API (2 minutes)

**Terminal 1** - Start the new API:
```powershell
.\start-graph-explanation-api.ps1
```

You should see:
```
Starting Graph Explanation API on port 8003...
Using GROQ model: llama-3.1-8b-instant
GROQ API Key configured: True
INFO:     Uvicorn running on http://0.0.0.0:8003
```

### Step 2: Verify it Works (1 minute)

**Terminal 2** - Run tests:
```powershell
python test_graph_explanation_api.py
```

You should see:
```
✅ Health Check: PASSED
✅ Single Graph: PASSED
✅ Cost Comparison: PASSED
✅ Multiple Graphs: PASSED
```

### Step 3: Integrate into Your UI (10 minutes)

Open `src/pages/SimulationDetail.tsx` and add the component to your Charts tab.

**Example:**
```tsx
import { GraphWithExplanation } from "../components/simulation/GraphWithExplanation";

// Inside your charts rendering:
<GraphWithExplanation
  chartTitle="Energy Consumption"
  chartType="bar"
  xAxis="Cooling Technique"
  yAxis="Energy (kWh)"
  data={[
    { label: "Air-Side", value: 1200 },
    { label: "Chilled Water", value: 1800 },
    { label: "Evaporative", value: 1400 },
  ]}
  chart={<YourExistingChartComponent />}
  simulationContext={{
    location: "Karachi",
    outdoorTempC: 31,
  }}
/>
```

See `GRAPH_EXPLANATION_INTEGRATION.md` for full examples.

---

## 📋 File Structure

```
fyp-softwaretesting/
├── graph_explanation_api.py              ← New API backend
├── start-graph-explanation-api.ps1       ← Startup script
├── test_graph_explanation_api.py         ← Test script
├── GRAPH_EXPLANATION_INTEGRATION.md      ← Full integration guide
├── .env                                  ← Updated with API config
└── src/
    └── components/
        └── simulation/
            └── GraphWithExplanation.tsx  ← New React component
```

---

## 🎯 How It Works (User Flow)

1. User selects a saved simulation
2. Charts are displayed in SimulationDetail page
3. **Each chart now has an AI explanation panel**:
   - Left: Your existing chart
   - Right: AI explanation + key insight
4. Click "Get Insight" to regenerate
5. See why each technique performed differently

---

## 🔌 API Endpoints

### Single Graph Explanation
```
POST http://localhost:8003/api/explain-graph
```

Request:
```json
{
  "chartTitle": "Energy Consumption",
  "chartType": "bar",
  "xAxis": "Technique",
  "yAxis": "kWh",
  "data": [
    {"label": "Air", "value": 1200},
    {"label": "Chilled", "value": 1800}
  ],
  "simulationContext": {
    "location": "Karachi",
    "outdoorTempC": 31
  }
}
```

Response:
```json
{
  "explanation": "This graph shows energy consumption...",
  "keyInsight": "Air is 33% better than Chilled Water.",
  "model_used": "llama-3.1-8b-instant",
  "tokens_used": {"prompt_tokens": 245, "completion_tokens": 89}
}
```

### Multiple Graphs + Overall Summary
```
POST http://localhost:8003/api/explain-graphs
```

---

## 💡 Tips

### For Best Results:
- ✅ Provide context (location, temperature, servers, etc.)
- ✅ Use consistent units in data (all kWh, all $, etc.)
- ✅ Include at least 2-3 data points per chart
- ✅ Give descriptive chart titles

### What to Avoid:
- ❌ Mixing different units in one chart
- ❌ Leaving simulationContext completely null
- ❌ Sending single data point

---

## 🧪 Example Chart Data

**Energy Comparison:**
```tsx
data: [
  { label: "Air-Side Economizer", value: 1200 },
  { label: "Chilled Water", value: 1800 },
  { label: "Evaporative Cooling", value: 1400 },
]
```

**Cost Comparison:**
```tsx
data: [
  { label: "Air-Side", value: 45000 },
  { label: "Chilled", value: 68000 },
  { label: "Evaporative", value: 52000 },
]
```

**PUE Comparison:**
```tsx
data: [
  { label: "Air-Side", value: 1.35 },
  { label: "Chilled", value: 1.67 },
  { label: "Evaporative", value: 1.48 },
]
```

---

## ⚙️ Configuration

All settings in `.env`:
```env
# Graph Explanation API
GRAPH_EXPLANATION_API_PORT=8003
VITE_GRAPH_EXPLANATION_API_URL=http://localhost:8003/api

# GROQ (set earlier)
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to get explanation" | Check if `graph_explanation_api.py` is running |
| "GROQ_API_KEY not configured" | Add key to `.env` and restart API |
| Slow response | GROQ usually takes 2-5 seconds (free tier) |
| Empty explanation | Ensure data has ≥2 points and context is provided |
| Port 8003 already in use | Change `GRAPH_EXPLANATION_API_PORT` in `.env` |

---

## 📊 Before & After

**Before:** User sees chart alone, has to interpret manually

**After:** 
- Chart is displayed
- AI automatically explains what it shows
- Highlights best/worst performer
- Shows why it matters
- Suggests next decision

---

## 🎉 What You Now Have

- ✅ Separate graph explanation API (clean architecture)
- ✅ React component for side-by-side display
- ✅ Auto-fetching explanations
- ✅ Key insights extraction
- ✅ Full CORS support
- ✅ Error handling
- ✅ Token usage tracking
- ✅ Fully responsive UI

---

## 📝 For Your FYP Report

**Methodology section:**
> "An LLM-based interpretation layer was integrated to automatically explain simulation graphs. The system sends chart metadata, numerical values, and simulation context to a GROQ-powered API, which returns concise natural language explanations. This improves result interpretability and supports non-technical decision-making."

---

## 🎬 Demo Flow

1. Start all APIs (advisory, recommendations, frontend, **graph explanation**)
2. Create or load a simulation
3. View results
4. Charts show with AI explanations on the side
5. Click "Get Insight" to regenerate
6. Explanations compare techniques and recommend best choice

---

## ✨ Ready to Go!

Everything is set up. Just:
1. Start the API: `.\start-graph-explanation-api.ps1`
2. Test it: `python test_graph_explanation_api.py`
3. Integrate: Add `<GraphWithExplanation>` to your charts
4. Done!

Questions? Check `GRAPH_EXPLANATION_INTEGRATION.md` for full details.
