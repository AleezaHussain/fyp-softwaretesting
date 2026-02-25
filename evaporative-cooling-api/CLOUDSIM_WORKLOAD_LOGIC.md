# CloudSim Dynamic Workload Logic - Evaporative Cooling API

## Overview

The evaporative cooling system uses CloudSim Plus to generate dynamic IT workload patterns that drive the cooling physics calculations. Here's the complete logic breakdown:

---

## 1. Infrastructure Setup

### Hosts (Physical Servers)
```java
private List<Host> createHosts() {
    int totalServers = request.it_load.servers;  // From user config
    
    for each server:
        - Cores: 4 per server
        - MIPS per core: 1000
        - RAM: 16 GB (16384 MB)
        - Storage: 1 TB
        - Bandwidth: 10 Gbps
        
        Power Model:
        - Max Power: 507W (100% utilization)
        - Idle Power: 100W (0% utilization)
        - Linear interpolation between idle and max
}
```

**Power Calculation Formula:**
```
Power(W) = IdlePower + (MaxPower - IdlePower) × CPU_Utilization
Power(W) = 100 + (507 - 100) × CPU_Utilization
Power(W) = 100 + 407 × CPU_Utilization
```

---

## 2. Virtual Machines (VMs)

```java
private List<Vm> createVms() {
    // One VM per host (1:1 mapping)
    for each host:
        VM specs:
        - MIPS: 1000
        - PEs (cores): 4
        - RAM: 8 GB (8192 MB)
        - Bandwidth: 1000 Mbps
        - Storage: 10 GB
}
```

**Purpose:** VMs act as the execution environment for workload tasks (Cloudlets)

---

## 3. Cloudlets (Workload Tasks)

```java
private List<Cloudlet> createCloudlets(int vmCount) {
    // 2 cloudlets per VM
    int totalCloudlets = vmCount × 2;
    
    for each cloudlet:
        - Length: Long.MAX_VALUE (infinite duration)
        - PEs required: 4
        - Utilization Model: UtilizationModelDynamic
            - Initial utilization: 0.1 (10%)
            - Max utilization: 0.95 (95%)
}
```

### Dynamic Utilization Model

**UtilizationModelDynamic** is the key to dynamic workload:

```java
UtilizationModelDynamic utilizationModel = new UtilizationModelDynamic(0.1);
utilizationModel.setMaxResourceUtilization(0.95);
```

**How it works:**
- Starts at 10% CPU utilization
- Randomly varies between 10% and 95% over time
- CloudSim Plus internally uses stochastic patterns
- Each cloudlet has independent utilization trajectory
- Utilization changes are event-driven within CloudSim

---

## 4. Lock-Step Execution

### Initialization Phase
```java
public void startSync() {
    simulation.startSync();  // Prepares event queue without running
}
```

**What happens:**
1. Datacenter is registered
2. Hosts are powered on
3. VMs are allocated to hosts
4. Cloudlets are submitted to VMs
5. Initial events are queued (Time 0)
6. Simulation is READY but NOT running

### Hourly Advancement
```java
public HourlyResult advanceOneHour(int hour) {
    simulation.runFor(3600.0);  // Advance exactly 1 hour
    
    // Query current state
    double totalPowerW = 0.0;
    for (Host host : hosts) {
        totalPowerW += host.getPowerModel().getPower();
    }
    
    return totalPowerW / 1000.0;  // Convert to kW
}
```

**What happens each hour:**
1. CloudSim processes all events in the next 3600 seconds
2. Cloudlet utilization changes based on internal stochastic model
3. VM CPU usage reflects cloudlet demands
4. Host CPU utilization aggregates VM usage
5. Power model calculates current power based on utilization
6. IT load (kW) is returned to physics model

---

## 5. IT Load Calculation

### Per-Host Power
```
Host_Power(W) = 100 + 407 × Host_CPU_Utilization
```

### Total IT Load
```
Total_IT_Load(kW) = Σ(Host_Power) / 1000

Where:
- Σ = Sum across all active hosts
- Host_Power varies each hour based on cloudlet utilization
```

### Example Scenario
```
Servers: 10
Hour 1: Avg utilization = 30%
  → Per-host: 100 + 407×0.30 = 222.1W
  → Total: 10 × 222.1 = 2,221W = 2.22 kW

Hour 2: Avg utilization = 75%
  → Per-host: 100 + 407×0.75 = 405.25W
  → Total: 10 × 405.25 = 4,052.5W = 4.05 kW

Hour 3: Avg utilization = 15%
  → Per-host: 100 + 407×0.15 = 161.05W
  → Total: 10 × 161.05 = 1,610.5W = 1.61 kW
```

---

## 6. Why This Creates Dynamic Workload

### Stochastic Variation
- **UtilizationModelDynamic** uses internal randomness
- Each cloudlet has independent utilization trajectory
- Multiple cloudlets per VM create aggregated variation
- Utilization changes are time-dependent (event-driven)

### Event-Driven Nature
- CloudSim processes discrete events (task start, task end, utilization change)
- Events are scheduled at different times for different cloudlets
- `runFor(3600)` processes all events in that hour
- Each hour has different event patterns → different utilization

### Temporal Realism
- Captures realistic data center behavior:
  - Morning: Low utilization (users logging in)
  - Midday: High utilization (peak workload)
  - Night: Medium utilization (batch jobs)
  - Weekend: Lower utilization

---

## 7. Current Limitations & Potential Improvements

### Current Approach
✅ Simple and functional
✅ Provides variation across hours
✅ Lock-step integration works correctly

### Limitations
⚠️ **No time-of-day patterns** - Utilization is purely random
⚠️ **No workload profiles** - Can't specify "batch job at 2 AM"
⚠️ **Fixed cloudlet count** - Doesn't model dynamic VM scaling
⚠️ **No seasonal patterns** - Summer vs winter workload differences

### Potential Enhancements

#### 1. Time-Based Utilization Patterns
```java
// Add diurnal pattern
double baseUtilization = 0.1 + 0.6 * Math.sin(2 * Math.PI * hour / 24);
utilizationModel.setUtilization(baseUtilization + randomVariation);
```

#### 2. Workload Profiles
```java
// Define workload types
enum WorkloadType {
    WEB_SERVER,      // High during business hours
    BATCH_PROCESSING, // High at night
    AI_TRAINING,     // Sustained high load
    EDGE_COMPUTING   // Bursty, event-driven
}
```

#### 3. Google Cluster Trace Integration
```java
// Use real data center traces
loadGoogleClusterTrace("cluster-trace-v3.csv");
// Map trace data to cloudlet submission times
```

#### 4. Seasonal Patterns
```java
// Adjust workload based on month
double seasonalFactor = getSeasonalFactor(month);
utilizationModel.setMaxResourceUtilization(0.95 * seasonalFactor);
```

---

## 8. Integration with Physics Model

### Data Flow
```
CloudSim (DES)                    Physics Model
     │                                  │
     ├─ Hour 0: startSync()            │
     │                                  │
     ├─ Hour 1: runFor(3600)           │
     │    └─ IT Load: 2.5 kW ─────────>│
     │                                  ├─ Calculate cooling
     │                                  ├─ Water usage
     │                                  └─ PUE/WUE
     │                                  │
     ├─ Hour 2: runFor(3600)           │
     │    └─ IT Load: 4.2 kW ─────────>│
     │                                  ├─ Calculate cooling
     │                                  └─ ...
     │                                  │
     └─ Hour 8760: runFor(3600)        │
          └─ IT Load: 3.1 kW ─────────>│
                                        └─ Final metrics
```

### Key Benefits
1. **Temporal Accuracy:** PUE/WUE react to real-time load spikes
2. **Peak Detection:** Identifies worst-case cooling scenarios
3. **Resource Realism:** Captures stochastic data center behavior
4. **Thermal Feedback Ready:** Foundation for bidirectional coupling

---

## 9. Verification & Debugging

### Check Dynamic Behavior
```bash
# Look for varying IT loads in logs
Hour 0024: IT Load=2.22 kW, Util=30.0%, CloudSim Time=86400s
Hour 0048: IT Load=4.05 kW, Util=75.0%, CloudSim Time=172800s
Hour 0072: IT Load=1.61 kW, Util=15.0%, CloudSim Time=259200s
```

### Expected Patterns
- IT load should vary between ~1 kW (idle) and ~5 kW (peak)
- Utilization should range from 10% to 95%
- CloudSim time should increment by 3600s each hour

### Troubleshooting
**If IT load is constant:**
- Check that `startSync()` is called before loop
- Verify cloudlets have `Long.MAX_VALUE` length
- Ensure `UtilizationModelDynamic` is used (not static)

---

## Summary

The current CloudSim workload logic uses:
- **Stochastic utilization models** for dynamic variation
- **Lock-step execution** for temporal accuracy
- **Power models** for realistic IT load calculation
- **Event-driven simulation** for hour-by-hour changes

This provides a solid foundation for realistic cooling simulations with room for enhancement through workload profiles, time-based patterns, and real trace data integration.
