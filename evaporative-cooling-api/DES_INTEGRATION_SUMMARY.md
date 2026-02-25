# DES Integration Summary - Evaporative Cooling API

## ✅ Status: COMPLETE & RUNNING

All DES integration code is implemented, compiled, and deployed successfully.

## Key Files & Their Roles

### 1. EvaporativeSimulationOrchestrator.java
**Location:** `evaporative-cooling-api/src/main/java/com/acme/evap/api/service/`

**Purpose:** Core DES engine that runs CloudSim Plus simulation

**Key Methods:**
- `initializeCloudSim()` - Creates hosts, VMs, cloudlets, datacenter
- `runAnnualSimulation()` - Executes 8760-hour DES loop
- `advanceCloudSimOneHour()` - Calls `simulation.runFor(3600)` to advance time
- `executeHourlyStep()` - Queries server utilization and power after each hour

**CloudSim Components:**
- Hosts: Based on `request.it_load.servers` count
- Power Model: 507W max, 100W idle per server
- VMs: One per host (1000 MIPS, 4 PEs)
- Cloudlets: 2 per VM with dynamic utilization (10-95%)

### 2. SimulationRequest.java
**Location:** `evaporative-cooling-api/src/main/java/com/acme/evap/api/dto/`

**Purpose:** Request DTO with DES mode flag

**Key Field:**
```java
public static class SimulationConfig {
    public Boolean use_des_mode = true;  // Boolean wrapper to detect null
}
```

**Why Boolean (not boolean):**
- Primitive `boolean` defaults to `false` when missing from JSON
- Wrapper `Boolean` allows null detection
- Service can default to `true` when field is missing

### 3. EvaporativeCoolingService.java
**Location:** `evaporative-cooling-api/src/main/java/com/acme/evap/api/service/`

**Purpose:** Main service that routes to DES or pre-calculated mode

**Key Methods:**

#### Line 73: Default DES to true if missing
```java
if (request.simulation.use_des_mode == null) {
    request.simulation.use_des_mode = true;
    System.out.println("⚙️ DES mode not specified - defaulting to TRUE");
}
```

#### Line 203: Check DES mode flag
```java
if (request.simulation.use_des_mode) {
    return runSimulationWithDES(weatherData, request);
}
```

#### Line 245: Run DES simulation
```java
private SimulationResponse runSimulationWithDES(...) {
    EvaporativeSimulationOrchestrator orchestrator = 
        new EvaporativeSimulationOrchestrator(request);
    orchestrator.runAnnualSimulation();
    List<HourlyResult> desResults = orchestrator.getResults();
    // Process each hour with DES workload
}
```

#### Line 273: Process DES results
```java
private void runHourlySimulationWithDES(..., HourlyResult desResult) {
    double itLoadKW = desResult.itLoadKW;  // From CloudSim
    // Calculate cooling physics with dynamic IT load
}
```

## How It Works

### DES Mode (Slow, Realistic)
1. Frontend sends request (with or without `use_des_mode` field)
2. Backend defaults to `true` if missing
3. Creates `EvaporativeSimulationOrchestrator`
4. Calls `simulation.startSync()` to initialize CloudSim
5. Loops 8760 times:
   - Calls `simulation.runFor(3600)` to advance 1 hour
   - Queries host power consumption
   - Calculates IT load from actual server utilization
6. Passes dynamic IT load to cooling physics
7. Returns results with realistic workload variations

**Time:** ~5-10 minutes (8760 discrete event steps)

### Pre-calculated Mode (Fast, Static)
1. Frontend explicitly sets `use_des_mode: false`
2. Calls `generateCloudSimWorkload()` once at start
3. Pre-calculates 8760 hourly IT loads
4. Loops through hours with static workload array
5. Returns results quickly

**Time:** ~30 seconds (simple array lookup)

## Current Configuration

**Default Mode:** DES (true)
- All simulations use DES unless explicitly disabled
- Provides realistic dynamic workload behavior
- Matches chilled water and air economizer timing

## API Endpoints

No changes to endpoints. Mode controlled via request body:

```json
POST http://localhost:8082/api/simulation/run

{
  "simulation": {
    "time_horizon_hours": 8760,
    "use_des_mode": true  // Optional, defaults to true
  },
  "it_load": {
    "servers": 90,
    "workload_type": "ai_training"
  },
  ...
}
```

## Verification

✅ Code compiled successfully
✅ No diagnostics/errors
✅ API running on port 8082
✅ DES orchestrator class exists
✅ Service methods integrated
✅ Default mode set to true

## Comparison with Other Systems

| System | DES Mode | Time | Workload Driver |
|--------|----------|------|-----------------|
| Chilled Water | Always On | ~10 min | CloudSim (full lockstep) |
| Air Economizer | Always On | ~5-10 min | CloudSim workload service |
| Evaporative | Default On | ~5-10 min | CloudSim DES orchestrator |

All three systems now use discrete event simulation for realistic workload dynamics!
