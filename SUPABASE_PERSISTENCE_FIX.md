# Supabase Data Persistence Fix - Air-Side Economizer Weekly Aggregation

## Issue Identified
The new optimized air-side economizer API (`/api/simulation/run-full-year`) returns a different response structure than what the `saveSimulationResults` function was expecting:

**Old API Response Structure:**
```json
{
  "status": "success",
  "summary": { ... },
  "hourlyProfile": [ ... ],  // 8760 hourly records
  "tcoForecast": [ ... ]
}
```

**New API Response Structure (Weekly Aggregation):**
```json
{
  "status": "success",
  "simulationWeeks": 52,
  "executionTimeSeconds": X,
  "weeklyResults": [ ... ],  // 52 weekly records (NEW)
  "annualSummary": {         // NEW structure
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

## Root Cause
The `saveSimulationResults` function in `src/services/simulationService.ts` was looking for:
- `hourlyProfile` or `hourlyResults` (for hourly data arrays)
- `summary.totalEnergyKWh` or `summary.averagePUE` (for metrics)

But the new API returns:
- `weeklyResults` (for weekly aggregated data)
- `annualSummary.totalITEnergyKWh` and `annualSummary.averagePUE` (for metrics)

This caused the function to fall back to default values (0 or 1.0) instead of extracting the actual simulation results.

## Changes Made

### 1. Updated Field Extraction Logging (Line 533-560)
Added logging for `weeklyResults` and `annualSummary` to trace which fields are being extracted:
```typescript
console.log(
  "━━━ weeklyResults length:",
  resultData?.weeklyResults?.length ?? "N/A",
);
console.log(
  "━━━ annualSummary:",
  resultData?.annualSummary ? "present" : "absent",
);
```

### 2. Updated Energy Extraction (Line 565-580)
Added fallback to `annualSummary.totalITEnergyKWh`:
```typescript
const energyConsumed =
  resultData.totalEnergyConsumption ||
  resultData.energy?.electricity_kwh_total ||
  resultData.summary?.totalEnergy_kWh ||
  resultData.summary?.totalEnergyKWh ||
  resultData.annualSummary?.totalITEnergyKWh || // NEW
  0;
```

### 3. Updated Cooling Efficiency Extraction (Line 600-620)
Added fallback to `annualSummary.averagePUE`:
```typescript
let coolingEfficiency =
  resultData.mlRecommendation?.pue ||
  resultData.summary?.averagePUE ||
  resultData.annualSummary?.averagePUE || // NEW
  resultData.performance?.pue_average ||
  resultData.cooling_efficiency ||
  resultData.results?.metrics?.pue ||
  1.0;
```

### 4. Updated Hourly Profile Extraction (Line 665-690)
Added fallback to `weeklyResults`:
```typescript
const hourlyProfile: any[] =
  resultData?.hourlyProfile ?? resultData?.hourlyResults ?? resultData?.weeklyResults ?? [];
```

### 5. Updated Storage Optimization (Line 741-770)
Added `weeklyResults` to the list of arrays to sample:
```typescript
const hourlyKeys = ["hourlyResults", "hourlyProfile", "weeklyResults", "hourlyEnergyUse", ...];
```

Also added sampling logic for `rawAirEconomizerData.weeklyResults`:
```typescript
if (stripped.rawAirEconomizerData?.weeklyResults?.length > 200) {
  stripped.rawAirEconomizerData = { ...stripped.rawAirEconomizerData };
  stripped.rawAirEconomizerData.weeklyResults = sampleArray(stripped.rawAirEconomizerData.weeklyResults);
}
```

## Impact
✅ **Energy Consumption**: Now correctly extracts from `annualSummary.totalITEnergyKWh` instead of defaulting to 0
✅ **Cooling Efficiency (PUE)**: Now correctly extracts from `annualSummary.averagePUE` instead of defaulting to 1.0
✅ **Weekly Data**: Now correctly handles `weeklyResults` array for storage optimization
✅ **Supabase Persistence**: All simulation results will now be correctly saved to the `simulation_results` table

## Verification
When you run a simulation now, check the browser console for:
```
🔍 FIELD EXTRACTION TRACE — saveSimulationResults
━━━ weeklyResults length: 52 (or 4 for month mode)
━━━ annualSummary: present
━━━ energy_consumed_kwh resolved: [actual value] from: annualSummary.totalITEnergyKWh (AirSideEconomizerService)
━━━ cooling_efficiency resolved: [actual value] from: annualSummary.averagePUE (AirSideEconomizerService)
```

Then check Supabase `simulation_results` table to confirm:
- `energy_consumed_kwh` is populated with actual value (not 0)
- `cooling_efficiency` is populated with actual PUE value (not 1.0)
- `result_data` contains the full response including `weeklyResults` and `annualSummary`
