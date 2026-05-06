# Supabase Data Persistence - Verification Checklist

## What Was Fixed
The `saveSimulationResults` function now correctly handles the new API response format from the optimized air-side economizer service that uses weekly aggregation instead of hourly data.

## How to Verify the Fix

### Step 1: Run a Simulation
1. Go to http://localhost:3000/input-management
2. Select "Air-Side Economization" component
3. Choose either "📅 1 Month Demo" or "📊 Full Year" mode
4. Click "Run Simulation"

### Step 2: Check Browser Console Logs
Open DevTools (F12) and look for these logs:

```
🔍 FIELD EXTRACTION TRACE — saveSimulationResults
━━━ Raw resultData keys: [status, simulationWeeks, executionTimeSeconds, weeklyResults, annualSummary]
━━━ weeklyResults length: 52 (or 4 for month mode)
━━━ annualSummary: present
━━━ energy_consumed_kwh resolved: [ACTUAL NUMBER] from: annualSummary.totalITEnergyKWh (AirSideEconomizerService)
━━━ cooling_efficiency resolved: [ACTUAL PUE VALUE] from: annualSummary.averagePUE (AirSideEconomizerService)
```

**✅ GOOD**: If you see actual numbers and the source mentions "AirSideEconomizerService"
**❌ BAD**: If you see "DEFAULT 0" or "DEFAULT 1.0" - means the new fields weren't found

### Step 3: Check Supabase Database
1. Open Supabase dashboard
2. Go to `simulation_results` table
3. Find the most recent simulation record
4. Verify these columns are populated:
   - `energy_consumed_kwh`: Should be a large number (e.g., 250000+), NOT 0
   - `cooling_efficiency`: Should be between 1.0-2.0 (PUE value), NOT 1.0
   - `result_data`: Should contain JSON with `weeklyResults` array and `annualSummary` object

### Step 4: Verify Data Structure
In the `result_data` JSON column, you should see:
```json
{
  "status": "success",
  "simulationWeeks": 52,
  "executionTimeSeconds": X,
  "weeklyResults": [
    {
      "week": 1,
      "itLoadKW": X,
      "coolingLoadKW": X,
      "coolingMode": "FULL_ECON",
      "pue": X,
      "cue": X,
      ...
    },
    ...
  ],
  "annualSummary": {
    "totalITEnergyKWh": X,
    "totalCoolingEnergyKWh": X,
    "totalCarbonKg": X,
    "peakCoolingKW": X,
    "peakPUE": X,
    "averagePUE": X,
    "estimatedOpExUSD": X
  }
}
```

## Expected Values

### Month Mode (4 weeks)
- `simulationWeeks`: 4
- `weeklyResults` length: 4
- `energy_consumed_kwh`: ~30,000-40,000 kWh
- `cooling_efficiency` (PUE): ~1.15-1.20
- Execution time: ~30-45 seconds

### Year Mode (52 weeks)
- `simulationWeeks`: 52
- `weeklyResults` length: 52
- `energy_consumed_kwh`: ~250,000-350,000 kWh
- `cooling_efficiency` (PUE): ~1.15-1.20
- Execution time: ~3-5 minutes

## Troubleshooting

### Issue: Console shows "DEFAULT 0" for energy_consumed_kwh
**Cause**: The API response doesn't have the expected fields
**Solution**: 
1. Check that the backend is running the new `AirSideEconomizerService`
2. Verify the API endpoint is `/api/simulation/run-full-year`
3. Check backend logs for any errors

### Issue: Supabase shows NULL values
**Cause**: The extraction logic didn't find the fields
**Solution**:
1. Check browser console for the extraction trace
2. Verify the response structure matches what's expected
3. Look for any API errors in the network tab

### Issue: weeklyResults not being saved
**Cause**: The array might be too large and getting stripped
**Solution**:
1. Check the `stripHourlyForStorage` function is sampling correctly
2. Verify `weeklyResults` is in the `hourlyKeys` array (it should be)
3. Check Supabase storage limits

## Files Modified
- `src/services/simulationService.ts` - Updated `saveSimulationResults` function to handle new API response format

## Related Files (No Changes Needed)
- `cooling-air-economizer/api/src/main/java/com/example/coolingeconomizer/service/AirSideEconomizerService.java` - Already returns correct structure
- `cooling-air-economizer/api/src/main/java/com/example/coolingeconomizer/controller/SimulationController.java` - Already calls correct service
