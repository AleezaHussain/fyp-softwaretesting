# Supabase Data Persistence - Weekly vs Full Year Verification

## What Was Enhanced
The `saveSimulationResults` function now includes:
1. **Simulation mode detection** - Automatically identifies if running in MONTH (4 weeks) or YEAR (52 weeks) mode
2. **Enhanced logging** - Detailed console output showing exactly what's being saved to Supabase
3. **Complete field extraction** - Handles both `weeklyResults` and `annualSummary` from the new API
4. **Success confirmation** - Logs confirmation after successful Supabase insert

## Supabase Table Structure

### simulation_results table
The data is saved with these key fields:

```
simulation_id (int)           - Links to simulations table
user_id (uuid)                - User who ran the simulation
energy_consumed_kwh (numeric) - Total energy (IT + cooling)
cooling_efficiency (numeric)  - PUE value (1.0-2.0 range)
temperature_stability (numeric) - Stability percentage
cost_saving_percent (numeric) - Cost savings percentage
runtime_minutes (numeric)     - How long simulation took
recommendation (text)         - Recommendation text
result_data (jsonb)          - Full API response (includes weeklyResults + annualSummary)
completed_at (timestamp)     - When simulation completed
```

## How Data Flows

### Month Mode (4 weeks)
```
Frontend: simulationMode = "month"
    ↓
Backend: /api/simulation/run-full-year?simulationMode=month
    ↓
AirSideEconomizerService: 
  - Generates 4 weeks of CloudSim workload
  - Aggregates 672 hours of weather data to 4 weekly values
  - Runs physics calculations for 4 weeks
    ↓
Response:
{
  "status": "success",
  "simulationWeeks": 4,
  "executionTimeSeconds": 35,
  "weeklyResults": [ 4 records ],
  "annualSummary": {
    "totalITEnergyKWh": 30000,
    "totalCoolingEnergyKWh": 5000,
    "averagePUE": 1.15,
    ...
  }
}
    ↓
saveSimulationResults:
  - Detects: "MONTH (4 weeks)"
  - Extracts: energy_consumed_kwh = 30000
  - Extracts: cooling_efficiency = 1.15
  - Saves to Supabase with full result_data
```

### Year Mode (52 weeks)
```
Frontend: simulationMode = "year" (or not specified)
    ↓
Backend: /api/simulation/run-full-year?simulationMode=year
    ↓
AirSideEconomizerService:
  - Generates 52 weeks of CloudSim workload
  - Aggregates 8760 hours of weather data to 52 weekly values
  - Runs physics calculations for 52 weeks
    ↓
Response:
{
  "status": "success",
  "simulationWeeks": 52,
  "executionTimeSeconds": 240,
  "weeklyResults": [ 52 records ],
  "annualSummary": {
    "totalITEnergyKWh": 260000,
    "totalCoolingEnergyKWh": 45000,
    "averagePUE": 1.15,
    ...
  }
}
    ↓
saveSimulationResults:
  - Detects: "YEAR (52 weeks)"
  - Extracts: energy_consumed_kwh = 260000
  - Extracts: cooling_efficiency = 1.15
  - Saves to Supabase with full result_data
```

## Console Logs to Expect

### During Simulation (Frontend)
```
[STORE] Payload created with simulationMode: month
[STORE] Calling API: /api/simulation/run-full-year
[API] Response received: status=success, simulationWeeks=4
```

### During Save (Frontend)
```
🔍 FIELD EXTRACTION TRACE — saveSimulationResults
━━━ Raw resultData keys: [status, simulationWeeks, executionTimeSeconds, weeklyResults, annualSummary]
━━━ weeklyResults length: 4
━━━ annualSummary: present
━━━ Detected Simulation Mode: MONTH (4 weeks)
━━━ energy_consumed_kwh resolved: 30000 from: annualSummary.totalITEnergyKWh (AirSideEconomizerService)
━━━ cooling_efficiency resolved: 1.15 from: annualSummary.averagePUE (AirSideEconomizerService)

💾 SUPABASE — FINAL INSERT PAYLOAD
━━━ TABLE: simulation_results ━━━
simulation_id: 123
user_id: abc-def-ghi
energy_consumed_kwh: 30000
cooling_efficiency: 1.15
cost_saving_percent: 0
runtime_minutes: 0.5
temperature_stability: 100
result_data keys: [status, simulationWeeks, executionTimeSeconds, weeklyResults, annualSummary]
━━━ SIMULATION MODE DETAILS ━━━
simulationWeeks: 4
weeklyResults count: 4
annualSummary present: true
  - totalITEnergyKWh: 30000
  - totalCoolingEnergyKWh: 5000
  - averagePUE: 1.15
  - estimatedOpExUSD: 1500

✅ [SUPABASE SUCCESS] simulation_results inserted successfully
   - Simulation ID: 123
   - Mode: MONTH (4 weeks)
   - Energy (kWh): 30000
   - PUE: 1.15
   - Runtime (min): 0.5
```

## Verification Steps

### 1. Run Month Mode Simulation
```
1. Go to http://localhost:3000/input-management
2. Select Air-Side Economization
3. Click "📅 1 Month Demo (~30 sec)"
4. Click "Run Simulation"
5. Wait for completion
```

### 2. Check Console Logs
```
Open DevTools (F12) → Console tab
Look for:
- "Detected Simulation Mode: MONTH (4 weeks)"
- "weeklyResults count: 4"
- "✅ [SUPABASE SUCCESS]"
```

### 3. Check Supabase
```
1. Open Supabase dashboard
2. Go to simulation_results table
3. Find the most recent record
4. Verify:
   - energy_consumed_kwh: ~30,000 (NOT 0)
   - cooling_efficiency: ~1.15 (NOT 1.0)
   - result_data contains:
     * "simulationWeeks": 4
     * "weeklyResults": [4 records]
     * "annualSummary": { ... }
```

### 4. Run Full Year Simulation
```
1. Go to http://localhost:3000/input-management
2. Select Air-Side Economization
3. Click "📊 Full Year (~3-5 min)"
4. Click "Run Simulation"
5. Wait for completion
```

### 5. Check Console Logs Again
```
Look for:
- "Detected Simulation Mode: YEAR (52 weeks)"
- "weeklyResults count: 52"
- "✅ [SUPABASE SUCCESS]"
```

### 6. Check Supabase Again
```
1. Find the new record in simulation_results
2. Verify:
   - energy_consumed_kwh: ~260,000 (NOT 0)
   - cooling_efficiency: ~1.15 (NOT 1.0)
   - result_data contains:
     * "simulationWeeks": 52
     * "weeklyResults": [52 records]
     * "annualSummary": { ... }
```

## Expected Values

### Month Mode
| Field | Expected Value | Range |
|-------|---|---|
| energy_consumed_kwh | ~30,000-40,000 | 25,000-50,000 |
| cooling_efficiency (PUE) | ~1.15 | 1.10-1.20 |
| runtime_minutes | ~0.5-0.75 | 0.3-1.0 |
| weeklyResults count | 4 | Exactly 4 |
| simulationWeeks | 4 | Exactly 4 |

### Year Mode
| Field | Expected Value | Range |
|-------|---|---|
| energy_consumed_kwh | ~260,000-350,000 | 200,000-400,000 |
| cooling_efficiency (PUE) | ~1.15 | 1.10-1.20 |
| runtime_minutes | ~3-5 | 2-8 |
| weeklyResults count | 52 | Exactly 52 |
| simulationWeeks | 52 | Exactly 52 |

## Troubleshooting

### Issue: Console shows "DEFAULT 0" for energy_consumed_kwh
**Cause**: API response doesn't have annualSummary
**Solution**:
1. Check backend logs for errors
2. Verify API endpoint is `/api/simulation/run-full-year`
3. Ensure AirSideEconomizerService is being called

### Issue: Supabase shows NULL values
**Cause**: Extraction logic didn't find the fields
**Solution**:
1. Check console for extraction trace
2. Verify response structure in Network tab
3. Look for any API errors

### Issue: weeklyResults not in result_data
**Cause**: Data might be getting stripped during storage optimization
**Solution**:
1. Check if weeklyResults array is > 200 items (shouldn't be for 4 or 52 weeks)
2. Verify stripHourlyForStorage function includes weeklyResults
3. Check Supabase storage limits

## Files Modified
- `src/services/simulationService.ts` - Enhanced logging and mode detection

## Related Files (No Changes)
- `cooling-air-economizer/api/src/main/java/com/example/coolingeconomizer/service/AirSideEconomizerService.java`
- `cooling-air-economizer/api/src/main/java/com/example/coolingeconomizer/controller/SimulationController.java`
