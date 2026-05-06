# Data Flow: From API Response to Supabase

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                                        │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ AirSideEconomization.tsx                                            │ │
│ │ - User selects "Month" or "Year" mode                              │ │
│ │ - Sends simulationMode to store                                    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STORE (Redux/Zustand)                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ store.ts                                                            │ │
│ │ - Adds simulationMode to payload                                   │ │
│ │ - Sends 8760 hourly weather records                                │ │
│ │ - Calls /api/simulation/run-full-year                              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ BACKEND API (Spring Boot)                                               │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ SimulationController.java                                           │ │
│ │ - Receives simulationMode and 8760 weather records                 │ │
│ │ - Calls AirSideEconomizerService.runFullYearSimulation()           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ AirSideEconomizerService.java                                       │ │
│ │ STEP 1: CloudSim Workload Generation                               │ │
│ │   - Generates 52 weeks (or 4 weeks) of hourly IT loads             │ │
│ │   - Returns: double[] weeklyHourlyITLoads (672 or 8736 hours)      │ │
│ │                                                                     │ │
│ │ STEP 1.5: Aggregate Workload to Weekly                             │ │
│ │   - Converts 168 hourly loads → 1 weekly average                   │ │
│ │   - Returns: double[] weeklyITLoads (52 or 4 values)               │ │
│ │                                                                     │ │
│ │ STEP 1.6: Aggregate Weather to Weekly                              │ │
│ │   - Converts 8760 hourly weather → 52 weekly averages              │ │
│ │   - Returns: List<WeatherData> weeklyWeatherData (52 or 4 values)  │ │
│ │                                                                     │ │
│ │ STEP 2: Physics Calculations (Lock-Step)                           │ │
│ │   - For each week (52 or 4):                                       │ │
│ │     - Get weekly IT load from aggregated CloudSim                  │ │
│ │     - Get weekly weather from aggregated data                      │ │
│ │     - Run physics calculation                                      │ │
│ │     - Store result in weeklyResults list                           │ │
│ │                                                                     │ │
│ │ STEP 3: Build Response                                             │ │
│ │   - Returns: {                                                     │ │
│ │       status: "success",                                           │ │
│ │       simulationWeeks: 52 (or 4),                                  │ │
│ │       executionTimeSeconds: X,                                     │ │
│ │       weeklyResults: [ {...}, {...}, ... ],  ← 52 or 4 records    │ │
│ │       annualSummary: {                                             │ │
│ │         totalITEnergyKWh: X,                                       │ │
│ │         totalCoolingEnergyKWh: X,                                  │ │
│ │         totalCarbonKg: X,                                          │ │
│ │         peakCoolingKW: X,                                          │ │
│ │         peakPUE: X,                                                │ │
│ │         averagePUE: X,                                             │ │
│ │         estimatedOpExUSD: X                                        │ │
│ │       }                                                            │ │
│ │     }                                                              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React) - Response Handler                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ store.ts (API call handler)                                         │ │
│ │ - Receives response with weeklyResults and annualSummary           │ │
│ │ - Calls saveSimulationResults(simulationId, resultData)            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ SUPABASE PERSISTENCE (TypeScript)                                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ simulationService.ts - saveSimulationResults()                      │ │
│ │                                                                     │ │
│ │ FIELD EXTRACTION (NOW FIXED):                                      │ │
│ │ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ │ energy_consumed_kwh:                                            │ │
│ │ │   resultData.annualSummary?.totalITEnergyKWh ← NEW              │ │
│ │ │   (was falling back to 0)                                       │ │
│ │ │                                                                 │ │
│ │ │ cooling_efficiency:                                             │ │
│ │ │   resultData.annualSummary?.averagePUE ← NEW                    │ │
│ │ │   (was falling back to 1.0)                                     │ │
│ │ │                                                                 │ │
│ │ │ temperature_stability:                                          │ │
│ │ │   resultData.weeklyResults ← NEW                                │ │
│ │ │   (was falling back to 100)                                     │ │
│ │ │                                                                 │ │
│ │ │ result_data:                                                    │ │
│ │ │   Full response including weeklyResults and annualSummary       │ │
│ │ │   (sampled if > 200 records)                                    │ │
│ │ └─────────────────────────────────────────────────────────────────┘ │
│ │                                                                     │ │
│ │ SUPABASE INSERT:                                                    │ │
│ │   INSERT INTO simulation_results (                                 │ │
│ │     simulation_id,                                                 │ │
│ │     user_id,                                                       │ │
│ │     energy_consumed_kwh,        ← NOW HAS ACTUAL VALUE             │ │
│ │     cooling_efficiency,         ← NOW HAS ACTUAL PUE               │ │
│ │     temperature_stability,      ← NOW HAS ACTUAL VALUE             │ │
│ │     cost_saving_percent,                                           │ │
│ │     runtime_minutes,                                               │ │
│ │     recommendation,                                                │ │
│ │     result_data,                ← INCLUDES weeklyResults           │ │
│ │     completed_at                                                   │ │
│ │   ) VALUES (...)                                                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ SUPABASE DATABASE                                                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ simulation_results table                                            │ │
│ │ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ │ id: UUID                                                        │ │
│ │ │ simulation_id: integer                                          │ │
│ │ │ user_id: UUID                                                  │ │
│ │ │ energy_consumed_kwh: 250000.50 ← ACTUAL VALUE (was 0)          │ │
│ │ │ cooling_efficiency: 1.15 ← ACTUAL PUE (was 1.0)                │ │
│ │ │ temperature_stability: 95.5 ← ACTUAL VALUE (was 100)           │ │
│ │ │ cost_saving_percent: 15.0                                      │ │
│ │ │ runtime_minutes: 4.5                                           │ │
│ │ │ recommendation: "Simulation completed successfully"             │ │
│ │ │ result_data: {                                                 │ │
│ │ │   "status": "success",                                         │ │
│ │ │   "simulationWeeks": 52,                                       │ │
│ │ │   "executionTimeSeconds": 270,                                 │ │
│ │ │   "weeklyResults": [ {...}, {...}, ... ],                      │ │
│ │ │   "annualSummary": { ... }                                     │ │
│ │ │ }                                                              │ │
│ │ │ completed_at: 2026-05-03T12:34:56Z                             │ │
│ │ └─────────────────────────────────────────────────────────────────┘ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Changes Made

### Before (Broken)
```typescript
// Would extract from hourlyProfile/hourlyResults
const hourlyProfile = resultData?.hourlyProfile ?? resultData?.hourlyResults ?? [];
// Falls back to 0 because annualSummary doesn't exist in old API
const energyConsumed = resultData.summary?.totalEnergyKWh ?? 0;
```

### After (Fixed)
```typescript
// Now also checks for weeklyResults
const hourlyProfile = resultData?.hourlyProfile ?? resultData?.hourlyResults ?? resultData?.weeklyResults ?? [];
// Now checks annualSummary from new API
const energyConsumed = 
  resultData.summary?.totalEnergyKWh ||
  resultData.annualSummary?.totalITEnergyKWh || // NEW
  0;
```

## Data Aggregation Strategy

### CloudSim Workload
```
8760 hourly loads (from CloudSim)
    ↓
Aggregate to 52 weekly averages
    ↓
Each week = average of 168 hourly loads
```

### Weather Data
```
8760 hourly weather records (from frontend)
    ↓
Aggregate to 52 weekly averages
    ↓
Each week = average of 168 hourly records
```

### Physics Calculations
```
For each of 52 weeks:
  - Get weekly IT load (from aggregated CloudSim)
  - Get weekly weather (from aggregated data)
  - Run physics calculation
  - Store 1 result per week
    ↓
52 weekly results
    ↓
Compute annual summary (totals, peaks, averages)
```

## Performance Impact

### Month Mode (4 weeks)
- CloudSim: 672 hours (4 × 168)
- Physics: 4 iterations
- Time: ~30-45 seconds
- Data saved: 4 weekly records + 1 annual summary

### Year Mode (52 weeks)
- CloudSim: 8736 hours (52 × 168)
- Physics: 52 iterations
- Time: ~3-5 minutes
- Data saved: 52 weekly records + 1 annual summary

## Supabase Storage Optimization

The `stripHourlyForStorage` function samples large arrays to keep storage lean:
- If array > 200 records: sample every Nth record to keep ~120 points
- Preserves data for charting while reducing storage
- Applied to: `hourlyResults`, `hourlyProfile`, `weeklyResults`, etc.

This ensures the full `result_data` JSON can be stored without hitting Supabase size limits.
