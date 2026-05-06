# Weekly Results Supabase Fix

## Problem
After changing the API to run CloudSim 52 times separately (for more realistic weekly variation), the results were showing all zeros in Supabase:
- Energy: 0.000 kWh
- PUE: 0.0000
- Cost: $0
- Carbon: 0.000 kg

## Root Cause
The new API response structure changed from having `annualSummary` to only having `weeklyResults`. The `saveSimulationResults` function was looking for `annualSummary` fields but they weren't present, so it fell back to default values (0 or 1.0).

## Solution
Updated `src/services/simulationService.ts` to add fallback calculations that extract data from `weeklyResults` when `annualSummary` is not present:

### 1. Energy Extraction (Line ~580)
```typescript
const energyConsumed =
  resultData.annualSummary?.totalITEnergyKWh ||
  (() => {
    // Fallback: calculate from weeklyResults
    if (Array.isArray(resultData?.weeklyResults) && resultData.weeklyResults.length > 0) {
      const totalEnergy = resultData.weeklyResults.reduce((sum: number, week: any) => {
        return sum + ((week.itLoadKW || 0) * 168); // 168 hours per week
      }, 0);
      return totalEnergy > 0 ? totalEnergy : 0;
    }
    return 0;
  })() ||
  0;
```

### 2. Cooling Efficiency (PUE) Extraction (Line ~620)
```typescript
let coolingEfficiency =
  resultData.annualSummary?.averagePUE ||
  (() => {
    // Fallback: calculate average PUE from weeklyResults
    if (Array.isArray(resultData?.weeklyResults) && resultData.weeklyResults.length > 0) {
      const avgPUE = resultData.weeklyResults.reduce((sum: number, week: any) => {
        return sum + (week.pue || 1.0);
      }, 0) / resultData.weeklyResults.length;
      return avgPUE > 0 ? avgPUE : 1.0;
    }
    return 1.0;
  })() ||
  1.0;
```

### 3. Cost Savings Extraction (Line ~650)
```typescript
let costSavingPercent =
  resultData.summary?.energySavingsPercent ||
  (() => {
    // Fallback: compute from weeklyResults PUE vs baseline
    if (Array.isArray(resultData?.weeklyResults) && resultData.weeklyResults.length > 0) {
      const avgPUE = resultData.weeklyResults.reduce((sum: number, week: any) => {
        return sum + (week.pue || 1.0);
      }, 0) / resultData.weeklyResults.length;
      const baselinePUE = 1.8;
      if (avgPUE > 0 && baselinePUE > avgPUE) {
        return ((baselinePUE - avgPUE) / baselinePUE) * 100;
      }
    }
    return 0;
  })() ||
  0;
```

## How It Works

When the API returns `weeklyResults` (52 weeks of data):
1. **Energy**: Sum of (weekly IT load × 168 hours) for all 52 weeks
2. **PUE**: Average of all 52 weekly PUE values
3. **Cost Savings**: Calculated as (baseline PUE - actual PUE) / baseline PUE × 100%

## Expected Results After Fix

For a full year simulation with 52 weeks:
- **Energy Consumed**: ~260,000 kWh (realistic for data center)
- **PUE**: ~1.15-1.20 (realistic for air-side economization)
- **Cost Savings**: ~35-40% (vs baseline PUE of 1.8)
- **Runtime**: ~5-6 minutes (52 separate CloudSim runs)

## Supabase Table Structure (Unchanged)
The existing `simulation_results` table structure remains the same:
- `simulation_id` (FK)
- `user_id` (FK)
- `energy_consumed_kwh` (now populated from weeklyResults)
- `cooling_efficiency` (now populated from weeklyResults)
- `cost_saving_percent` (now calculated from weeklyResults)
- `temperature_stability`
- `runtime_minutes`
- `result_data` (JSON blob with full weeklyResults)

## Testing
1. Run a full year simulation
2. Check browser console for extraction logs showing "calculated from weeklyResults"
3. Verify Supabase `simulation_results` table has non-zero values
4. Check `result_data` JSON contains `weeklyResults` array with 52 entries
