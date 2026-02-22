# Air-Side Economizer Cooling System - Complete Methodology

## Executive Summary

This document provides a comprehensive technical methodology for the **Air-Side Economizer Cooling System** backend, detailing all physics-based formulas, rules, conditions, and algorithms used in the simulation engine.

**System Purpose**: Simulate data center cooling performance using outdoor air (free cooling) combined with mechanical cooling, optimized for AI workloads with CloudSim integration.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Physics Engine](#core-physics-engine)
3. [CloudSim Workload Integration](#cloudsim-workload-integration)
4. [Economizer Control Logic](#economizer-control-logic)
5. [Energy Calculations](#energy-calculations)
6. [Financial Projections](#financial-projections)
7. [Key Formulas Reference](#key-formulas-reference)

---

## 1. System Architecture

### 1.1 Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/TypeScript)               │
│  - User inputs (servers, fans, weather, economizer limits)  │
│  - Weather data upload (CSV with temp/humidity)             │
│  - CloudSim configuration (AI workload modes)               │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP POST
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Spring Boot/Java)                  │
│  - EconomizerController: Request handling                   │
│  - SimulationRequest: Data model                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           CloudSim Workload Generator (Optional)             │
│  - CloudSimWorkloadService: AI workload simulation          │
│  - Generates hourly IT load profiles (kW)                   │
│  - Modes: AI_TRAINING, AI_INFERENCE, MIXED, ENTERPRISE      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Core Physics Engine                             │
│  - AirEconomizerModel: Hourly cooling calculations          │
│  - Psychrometrics: Thermodynamic properties                 │
│  - ProjectionEngine: Multi-year financial forecasts         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Results & Metrics                         │
│  - Hourly: PUE, CUE, cooling modes, power breakdown         │
│  - Annual: Energy, cost, emissions, ROI                     │
│  - 5-year: Projections with escalation & climate impact     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Files

| File | Purpose |
|------|---------|
| `AirEconomizerModel.java` | Core physics engine - hourly cooling calculations |
| `CloudSimWorkloadService.java` | AI workload generation using CloudSim Plus |
| `EconomizerInputs.java` | Input parameters data structure |
| `ProjectionEngine.java` | Multi-year financial & climate projections |
| `Psychrometrics.java` | Thermodynamic calculations |
| `EconomizerController.java` | API endpoint & orchestration |

---

## 2. Core Physics Engine

### 2.1 IT Load Calculation

**Two Methods:**

#### Method A: Synthetic Utilization (Traditional)
```java
P_IT(t) = N × Factor × [P_idle + (P_max - P_idle) × u(t)]
```

Where:
- `N` = Number of servers
- `Factor` = Compute intensity factor (1.0 = standard, >1.0 = AI/HPC)
- `P_idle` = Server idle power (W)
- `P_max` = Server maximum power (W)
- `u(t)` = CPU utilization at time t (0-1)

**Example:**
```
50 servers × 1.2 × [100W + (507W - 100W) × 0.85]
= 50 × 1.2 × [100 + 345.95]
= 50 × 1.2 × 445.95
= 26,757W = 26.76 kW
```

#### Method B: CloudSim-Generated Load (AI-Aware)
```java
P_IT(t) = CloudSim.hourlyITLoadKW[t]
```

CloudSim simulates:
- VM scheduling on physical hosts
- Cloudlet (task) execution
- Dynamic CPU utilization based on workload mode
- Power consumption using linear power model

---

### 2.2 Required Airflow Calculation

**Heat Removal Constraint:**

```java
V_req (CFM) = (P_IT_kW × 3160) / (ρ × Cp × ΔT)
```

**Constants:**
- `ρ` (rho) = 1.2 kg/m³ (air density at ~20°C)
- `Cp` = 1.006 kJ/(kg·K) (specific heat of air)
- `ΔT` = T_return - T_supply = 30°C - 18°C = 12°C

**Derivation:**
```
Q (kW) = ṁ × Cp × ΔT
ṁ (kg/s) = ρ × V (m³/s)
V (CFM) = V (m³/s) × 2118.88

Solving for V:
V_CFM = (Q_kW × 1000) / (ρ × Cp × ΔT × 2118.88 / 60)
      = Q_kW × 3160 / (ρ × Cp × ΔT)
```

**Airflow Violation Check:**
```java
if (V_req > V_max) {
    VIOLATION: Recommend liquid cooling (direct-to-chip)
}
```

---

### 2.3 Economizer Mode Decision Logic

**Three Operating Modes:**

```
┌─────────────────────────────────────────────────────────────┐
│  Mode Selection Decision Tree                                │
└─────────────────────────────────────────────────────────────┘

Is T_outdoor ≤ T_max_econ (24°C)?
    ├─ NO  → MECHANICAL_ONLY (0% outdoor air)
    └─ YES → Is RH_outdoor ≤ RH_max_econ (60%)?
              ├─ YES → FULL_ECON (100% outdoor air)
              └─ NO  → PARTIAL_TRIM (20% outdoor air)
```

**Code Implementation:**
```java
boolean tempOK = weather.dryBulbC <= in.economizerMaxOutdoorTemp;
boolean humidityOK = weather.relativeHumidity <= in.economizerMaxHumidity;

if (tempOK && humidityOK) {
    mode = "FULL_ECON";
    oaFraction = 1.0;
} else if (tempOK) {
    mode = "PARTIAL_TRIM";
    oaFraction = in.minOutdoorAirFraction; // typically 0.2
} else {
    mode = "MECHANICAL_ONLY";
    oaFraction = 0.0;
}
```

**Rationale:**
- **Temperature**: Primary constraint - outdoor air must be cooler than return air
- **Humidity**: Secondary constraint - high humidity reduces evaporative cooling effectiveness and risks condensation
- **Partial Mode**: Maintains minimum ventilation while limiting moisture ingress

---

## 3. CloudSim Workload Integration

### 3.1 Architecture

```
CloudSim Simulation
    ├─ Hosts (Physical Servers)
    │   ├─ PEs (CPU Cores) with MIPS rating
    │   ├─ RAM, Storage, Bandwidth
    │   └─ Linear Power Model: P = P_idle + (P_max - P_idle) × CPU_util
    │
    ├─ VMs (Virtual Machines)
    │   ├─ 1:1 mapping with Hosts
    │   └─ TimeShared Cloudlet Scheduler
    │
    └─ Cloudlets (Tasks/Workloads)
        ├─ Length (MI - Million Instructions)
        ├─ CPU Utilization Model (time-varying)
        └─ RAM/BW Utilization Models
```

### 3.2 AI Workload Modes

#### AI_TRAINING (Sustained High Load)
```java
// Daily cycle with sine wave + stochastic noise
double hourOfDay = (time / 3600.0) % 24.0;
double dailyCycle = Math.sin(((hourOfDay - 6.0) / 12.0) * Math.PI);
double noise = 0.95 + (Math.random() * 0.10); // ±5%

double util = baseUtil + (dailyVariance × dailyCycle);
util = util × noise;
util = clamp(util, 0.1, 1.0);
```

**Characteristics:**
- Base utilization: 85-95%
- Daily variance: ±15%
- Peaks at noon, low at midnight
- Simulates: Model training, batch processing

#### AI_INFERENCE (Bursty Spikes)
```java
// Baseline cloudlet (25% utilization, runs entire simulation)
// + Multiple burst cloudlets (85-95% utilization, 5-15 min each)

int numBursts = 3 + random(3); // 3-5 bursts per server
for each burst:
    length = (300 + random(600)) × MIPS; // 5-15 minutes
    utilization = 0.85 + random(0.10);
```

**Characteristics:**
- Baseline: 25% utilization
- Bursts: 85-95% utilization
- Burst frequency: 3-5 per server per simulation
- Simulates: Real-time inference, API serving

#### MIXED (Hybrid Workload)
```java
// 60% servers: Enterprise workload (50-65% utilization)
// 40% servers: AI training workload (80-90% utilization)
```

#### ENTERPRISE (Traditional)
```java
// All servers: Moderate utilization (50-65%)
// Constant throughout simulation
```

### 3.3 Power Sampling

**Hourly Sampling Process:**
```java
for each hour:
    for each host:
        cpuUtil = host.getCpuPercentUtilization();
        powerW = host.getPowerModel().getPower(cpuUtil);
        
        // Add stochastic noise (±5%)
        noise = 0.95 + random(0.10);
        powerW = powerW × computeIntensityFactor × noise;
        
        store(hour, host, powerW);
```

**Aggregation:**
```java
hourlyITLoadKW[hour] = sum(all host powers) / 1000.0;
```

---

## 4. Economizer Control Logic

### 4.1 Free Cooling Capacity

**Available Temperature Differential:**
```java
ΔT_free = T_return - T_outdoor
if (ΔT_free < 0) ΔT_free = 0; // No free cooling if outdoor hotter
```

**Heat Removed by Free Cooling:**
```java
Q_free (kW) = oaFraction × ρ × (V_CFM / 2118.88) × Cp × ΔT_free
```

Where:
- `oaFraction` = Outdoor air fraction (0, 0.2, or 1.0 based on mode)
- `V_CFM` = Required airflow
- `2118.88` = Conversion factor (CFM to m³/s)

**Example (FULL_ECON mode):**
```
Outdoor: 15°C, Return: 30°C
ΔT_free = 30 - 15 = 15°C
V_req = 220 CFM (from IT load)

Q_free = 1.0 × 1.2 × (220 / 2118.88) × 1.006 × 15
       = 1.0 × 1.2 × 0.1038 × 1.006 × 15
       = 1.88 kW
```

### 4.2 Mechanical Cooling Load

**Remaining Heat to Remove:**
```java
Q_mech (kW) = Q_IT - Q_free
if (Q_mech < 0) Q_mech = 0;
```

**Mechanical Power Consumption:**
```java
P_mech (kW) = Q_mech / COP
```

Where:
- `COP` = Coefficient of Performance = 3.0 (constant chiller efficiency)

**Example:**
```
Q_IT = 26.76 kW
Q_free = 1.88 kW
Q_mech = 26.76 - 1.88 = 24.88 kW

P_mech = 24.88 / 3.0 = 8.29 kW
```

---

## 5. Energy Calculations

### 5.1 Fan Power

**Weighted Fan Efficiency:**
```java
totalFans = bestQuantity + averageQuantity + legacyQuantity;
weightedSum = (bestQuantity × bestEfficiency) +
              (averageQuantity × averageEfficiency) +
              (legacyQuantity × legacyEfficiency);

fanEff = weightedSum / totalFans; // W/CFM
```

**Fan Power with Filter Penalty:**
```java
filterFactor = (mode == "MECHANICAL_ONLY") ? 1.0 : 1.15;
P_fan (kW) = (V_CFM × fanEff × filterFactor) / 1000.0;
```

**Rationale:**
- **Filter Penalty (15%)**: Outdoor air requires filtration (MERV filters)
- **Mechanical Mode**: Recirculated air, no additional filtration needed

**Example:**
```
V_CFM = 220
fanEff = 0.60 W/CFM (best-in-class)
mode = FULL_ECON → filterFactor = 1.15

P_fan = (220 × 0.60 × 1.15) / 1000
      = 151.8 / 1000
      = 0.152 kW
```

### 5.2 Total Power & Efficiency Metrics

**Total Facility Power:**
```java
P_total (kW) = P_IT + P_fan + P_mech
```

**Power Usage Effectiveness (PUE):**
```java
PUE = P_total / P_IT
```

**Ideal PUE Values:**
- **1.0**: Perfect efficiency (impossible - no cooling overhead)
- **1.05-1.15**: Excellent (full economizer in cool climate)
- **1.3-1.5**: Good (mixed economizer/mechanical)
- **1.8-2.0**: Poor (mechanical-only, old systems)

**Carbon Usage Effectiveness (CUE):**
```java
CUE (kgCO2/kWh_IT) = (P_total × carbonIntensity) / P_IT
```

**Example:**
```
P_IT = 26.76 kW
P_fan = 0.152 kW
P_mech = 8.29 kW
P_total = 35.20 kW

PUE = 35.20 / 26.76 = 1.32

carbonIntensity = 0.055 kg/kWh
CUE = (35.20 × 0.055) / 26.76 = 0.072 kgCO2/kWh_IT
```

---

## 6. Financial Projections

### 6.1 Annual Metrics

**Annual Energy Consumption:**
```java
E_annual (kWh) = Σ(P_total[hour]) for 8760 hours
```

**Annual Energy Cost:**
```java
Cost_energy ($) = E_annual × electricityTariff
```

**Annual Carbon Emissions:**
```java
Emissions (kg) = E_annual × carbonIntensity
Emissions (tons) = Emissions (kg) / 1000
```

**Annual Carbon Tax:**
```java
CarbonTax ($) = Emissions (tons) × carbonTaxRate
```

**Total Annual OpEx:**
```java
OpEx ($) = Cost_energy + CarbonTax
```

### 6.2 CAPEX Calculation

**Air-Side Economizer CAPEX:**
```java
CAPEX ($) = fixedCost + (airflowCapacity_CFM × costPerCFM)
```

**Default Values:**
- Fixed cost: $20,000 (dampers, controls, installation)
- Cost per CFM: $2.50

**Example:**
```
V_max = 2000 CFM
CAPEX = 20,000 + (2000 × 2.5)
      = 20,000 + 5,000
      = $25,000
```

### 6.3 Multi-Year Projections

**Energy Cost Escalation:**
```java
adjustedRate[year] = baseRate × (1 + escalationRate)^year
```

**Climate Change Impact:**
```java
temperatureOffset[year] = climateChangeOffsetC × year
coolingLoadMultiplier[year] = 1.0 + (temperatureOffset × 0.03)
adjustedEnergy[year] = baseEnergy × coolingLoadMultiplier
```

**Rationale**: 3% cooling load increase per 1°C temperature rise

**Carbon Tax Escalation:**
```java
adjustedCarbonTax[year] = baseTax × (1 + 0.15)^year
```

**Rationale**: 15% annual increase (EU ETS historical trend)

**Net Present Value (NPV):**
```java
NPV = Σ(savings[year] / (1 + discountRate)^year)
```

**Discount rate**: 8% (typical corporate hurdle rate)

**Adjusted Payback Period:**
```java
for each year:
    cumulativeSavings += savings[year];
    if (cumulativeSavings >= CAPEX):
        payback = year + (remainingCAPEX / savings[year]);
        break;
```

---

## 7. Key Formulas Reference

### 7.1 Thermodynamics

| Formula | Description | Units |
|---------|-------------|-------|
| `Q = ṁ × Cp × ΔT` | Heat transfer | kW |
| `ṁ = ρ × V` | Mass flow rate | kg/s |
| `V_CFM = (Q_kW × 3160) / (ρ × Cp × ΔT)` | Required airflow | CFM |
| `PUE = P_total / P_IT` | Power usage effectiveness | dimensionless |

### 7.2 Power Models

| Component | Formula | Typical Values |
|-----------|---------|----------------|
| Server | `P = P_idle + (P_max - P_idle) × util` | Idle: 100W, Max: 507W |
| Fan | `P = V_CFM × W/CFM × filterFactor` | 0.35-1.0 W/CFM |
| Chiller | `P = Q_cooling / COP` | COP = 3.0 |

### 7.3 Economic Models

| Metric | Formula | Notes |
|--------|---------|-------|
| Annual OpEx | `E_kWh × $/kWh + CO2_tons × $/ton` | Includes carbon tax |
| CAPEX | `$20k + CFM × $2.5` | Air-side economizer |
| NPV | `Σ(CF_t / (1+r)^t)` | r = 8% discount rate |
| Payback | `CAPEX / annual_savings` | Simple payback |

---

## 8. Validation & Assumptions

### 8.1 Key Assumptions

1. **Air Properties**:
   - Density: 1.2 kg/m³ (at 20°C, sea level)
   - Specific heat: 1.006 kJ/(kg·K)
   - Constant across temperature range

2. **Temperature Setpoints**:
   - Supply air: 18°C (ASHRAE A2 class)
   - Return air: 30°C (typical data center)
   - ΔT: 12°C (design condition)

3. **Mechanical Cooling**:
   - COP: 3.0 (constant, conservative)
   - Real chillers: COP varies with load (2.5-5.0)

4. **Fan Efficiency**:
   - Best-in-class: 0.35 W/CFM (EC fans)
   - Average: 0.60 W/CFM
   - Legacy: 1.0 W/CFM (AC fans)

5. **Filter Penalty**:
   - 15% additional fan power when using outdoor air
   - Accounts for MERV 13-16 filters

### 8.2 Limitations

1. **Simplified Psychrometrics**: Does not account for:
   - Humidity ratio changes
   - Enthalpy-based control
   - Wet-bulb temperature

2. **Constant COP**: Real chillers have:
   - Part-load efficiency curves
   - Ambient temperature dependency

3. **No Thermal Mass**: Ignores:
   - Building thermal inertia
   - Equipment heat capacity
   - Transient effects

4. **Steady-State Hourly**: Assumes:
   - Instantaneous equilibrium
   - No sub-hourly dynamics

### 8.3 Validation Approach

**Benchmark Comparison:**
- PUE range: 1.05-1.8 (matches industry data)
- Free cooling hours: Climate-dependent (validated against ASHRAE TC 9.9)
- Energy savings: 30-60% vs mechanical-only (consistent with literature)

**Physical Constraints:**
- Airflow limits enforced
- Temperature/humidity bounds checked
- Power conservation verified

---

## 9. References

1. **ASHRAE TC 9.9**: Thermal Guidelines for Data Processing Environments (2021)
2. **CloudSim Plus**: https://cloudsimplus.org
3. **ASHRAE Handbook - HVAC Systems and Equipment** (2020)
4. **EU ETS Carbon Pricing**: European Commission (2024)
5. **Data Center Efficiency Best Practices**: DOE Better Buildings Program

---

## Appendix A: Code Structure

```
cooling-air-economizer/
├── src/main/java/com/acme/aireconcalc/
│   ├── AirEconomizerModel.java          # Core physics engine
│   ├── EconomizerInputs.java            # Input parameters
│   ├── ProjectionEngine.java            # Financial projections
│   ├── Psychrometrics.java              # Thermodynamic calculations
│   ├── WeatherData.java                 # Weather data structure
│   └── cloudsim/
│       ├── CloudSimWorkloadService.java # AI workload generation
│       └── RackLoadAggregator.java      # Rack-level analysis
│
└── api/src/main/java/com/example/coolingeconomizer/
    ├── EconomizerController.java        # REST API endpoint
    └── model/
        └── SimulationRequest.java       # Request/response models
```

---

## Appendix B: Example Calculation

**Scenario**: 50 servers, AI training workload, cool climate

**Inputs:**
- Servers: 50 × Fujitsu TX1330 M6 (507W max, 100W idle)
- Utilization: 85% (AI training)
- Outdoor: 15°C, 50% RH
- Economizer limits: 24°C, 60% RH
- Fan efficiency: 0.60 W/CFM
- Electricity: $0.15/kWh
- Carbon intensity: 0.055 kg/kWh

**Step 1: IT Load**
```
P_IT = 50 × 1.2 × [100 + (507-100) × 0.85]
     = 50 × 1.2 × 445.95
     = 26,757W = 26.76 kW
```

**Step 2: Required Airflow**
```
V_req = (26.76 × 3160) / (1.2 × 1.006 × 12)
      = 84,561.6 / 14.486
      = 5,838 CFM
```

**Step 3: Economizer Mode**
```
15°C ≤ 24°C? YES
50% ≤ 60%? YES
→ FULL_ECON (100% outdoor air)
```

**Step 4: Free Cooling**
```
ΔT_free = 30 - 15 = 15°C
Q_free = 1.0 × 1.2 × (5838/2118.88) × 1.006 × 15
       = 1.0 × 1.2 × 2.756 × 1.006 × 15
       = 49.88 kW

Q_mech = 26.76 - 49.88 = 0 kW (free cooling exceeds load)
P_mech = 0 kW
```

**Step 5: Fan Power**
```
P_fan = (5838 × 0.60 × 1.15) / 1000
      = 4,030 / 1000
      = 4.03 kW
```

**Step 6: Metrics**
```
P_total = 26.76 + 4.03 + 0 = 30.79 kW
PUE = 30.79 / 26.76 = 1.15
CUE = (30.79 × 0.055) / 26.76 = 0.063 kgCO2/kWh_IT
```

**Annual (8760 hours at this condition):**
```
Energy = 30.79 × 8760 = 269,720 kWh
Cost = 269,720 × 0.15 = $40,458
Emissions = 269,720 × 0.055 = 14,835 kg = 14.8 tons CO2
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-22  
**Author**: Air Economizer Simulation Engine
