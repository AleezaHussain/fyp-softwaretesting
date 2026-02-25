# DES Integration for Evaporative Cooling API - Complete

## Overview

Discrete Event Simulation (DES) has been successfully integrated into the evaporative cooling API, providing dynamic workload simulation similar to the chilled water system.

## What Changed

### 1. New DES Orchestrator
**File:** `EvaporativeSimulationOrchestrator.java`

- Creates CloudSim Plus infrastructure (hosts, VMs, cloudlets)
- Runs 8760-hour simulation using `runFor(3600)` for each hour
- Queries real-time server utilization and power consumption
- Returns hourly IT load based on actual discrete events

### 2. Updated SimulationRequest DTO
**File:** `SimulationRequest.java`

Added new flag to `SimulationConfig`:
```java
public boolean use_des_mode = false;
```

### 3. Enhanced EvaporativeCoolingService
**File:** `EvaporativeCoolingService.java`

- Checks `use_des_mode` flag
- Routes to DES path if enabled
- Falls back to pre-calculated workload if disabled (default)
- New methods:
  - `runSimulationWithDES()` - DES simulation flow
  - `runHourlySimulationWithDES()` - Hourly physics with DES workload

### 4. Updated SimulationState
**File:** `SimulationState.java`

Added simplified method for DES results:
```java
public void addHourlyResult(int hour, double itLoadKW, double totalHeatLoadKW, 
                           double fanPowerKW, double waterUsageL, 
                           double supplyTempC, String coolingMode, double serverUtilization)
```

## How to Use

### Frontend Configuration

Add the `use_des_mode` flag to your simulation request:

```json
{
  "simulation": {
    "time_horizon_hours": 8760,
    "time_step_seconds": 3600,
    "use_des_mode": true
  },
  "it_load": {
    "total_it_power_kw": 100,
    "servers": 90,
    "racks": 10,
    "workload_type": "ai_training"
  },
  ...
}
```

### Modes Comparison

| Mode | Speed | Workload Type | Use Case |
|------|-------|---------------|----------|
| **Pre-calculated** (default) | Fast (~30s) | Static profile | Quick analysis, what-if scenarios |
| **DES Mode** | Slow (~5-10min) | Dynamic events | Realistic workload dynamics, research |

## Technical Details

### DES Flow

1. **Initialization:**
   - Create CloudSim Plus simulation
   - Build hosts with power models
   - Create VMs and cloudlets
   - Call `startSync()` to register datacenter

2. **8760-Hour Loop:**
   - For each hour:
     - Call `simulation.runFor(3600)` to advance 1 hour
     - Query host power consumption
     - Calculate IT load from actual server utilization
     - Run evaporative cooling physics with dynamic load

3. **Results:**
   - Hourly IT load varies based on CloudSim events
   - Server utilization reflects actual VM/cloudlet scheduling
   - Cooling requirements adapt to real workload dynamics

### Key Differences from Chilled Water

| Aspect | Chilled Water | Evaporative (DES) |
|--------|---------------|-------------------|
| CloudSim Integration | Full lockstep | Workload driver only |
| Physics Coupling | Tight (thermal feedback) | Loose (load input) |
| Complexity | High (chiller, towers, CRAH) | Medium (evap cooling) |
| Simulation Time | ~10-15 min | ~5-10 min |

## Performance Impact

- **Pre-calculated mode:** ~30 seconds (default)
- **DES mode:** ~5-10 minutes (8760 × runFor calls)

The DES mode is approximately 10-20x slower but provides realistic workload dynamics.

## API Endpoints

No changes to API endpoints. The mode is controlled via the request body:

```bash
POST http://localhost:8082/api/simulation/run
Content-Type: multipart/form-data

- weatherFile: [CSV file]
- config: {
    "simulation": {
      "use_des_mode": true
    },
    ...
  }
```

## Status

✅ **COMPLETE** - DES integration compiled and deployed successfully.

The evaporative cooling API now supports both:
1. Fast pre-calculated workload (default)
2. Slow DES-driven dynamic workload (opt-in)

## Next Steps

To enable DES mode in the frontend:
1. Add a toggle/checkbox in the UI: "Use Dynamic Workload (DES)"
2. Set `simulation.use_des_mode = true` when enabled
3. Show a warning about increased simulation time
4. Display server utilization metrics in results
