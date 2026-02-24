# CHILLED WATER COOLING SYSTEM - COMPLETE METHODOLOGY

## Engineering-Grade Tool for Edge Data Center Cooling Analysis with CloudSim Integration

---

## OVERVIEW

This system provides a complete life-cycle analysis of chilled water cooling systems for edge data centers, integrating CloudSim Plus for workload simulation with detailed thermodynamic and economic models.

### Three-Phase Implementation

1. **Step 1**: Data Ingestion & Physical Boundary Configuration
2. **Step 2**: 8760-Hour Co-Simulation Engine (CloudSim + Chilled Water Physics)
3. **Step 3**: Life-Cycle Analysis & Sustainability KPIs

---

## STEP 1: DATA INGESTION & PHYSICAL BOUNDARY CONFIGURATION

### Purpose
Configure the edge data center scenario with precise numerical inputs from manufacturer datasheets.

### Inputs

#### 1.1 Site & Location
- **weatherDataFile**: Path to 8760-hour EPW (EnergyPlus Weather) file
- **elevationMeters**: Site elevation (impacts air density and fan power)

#### 1.2 Thermal Boundaries (ASHRAE Recommended)
- **maxInletTempC**: Maximum rack inlet temperature (default: 27.0°C)
- **minInletTempC**: Minimum rack inlet temperature (default: 18.0°C)
- **maxDewPointC**: Maximum dew point to prevent condensation (default: 15.0°C)
- **maxRelativeHumidity**: Maximum RH% (default: 60%)
- **minRelativeHumidity**: Minimum RH% to prevent static discharge (default: 20%)

#### 1.3 Infrastructure (CloudSim Mapping)
- **totalRacks**: Number of server racks
- **serversPerRack**: Servers per rack
- **serverMaxPowerW**: Maximum server power (W) - for CloudSim PowerModelHost
- **serverIdlePowerW**: Idle server power (W)
- **serverFanPowerW**: Internal server fan power (W) - part of IT load per ASHRAE 90.4
- **upsLossFraction**: UPS efficiency loss (default: 0.09 = 9%)
- **pduLossFraction**: PDU efficiency loss (default: 0.02 = 2%)

#### 1.4 Chilled Water System Specifications
- **chillerReferenceCop**: Baseline chiller COP at reference conditions (default: 6.0)
- **chillerReferenceLoadKW**: Reference load for COP rating (default: 100 kW)
- **chillerPerformanceCoeffs**: Six EIR coefficients [a, b, c, d, e, f]
- **coolingTowerFanPowerKw**: Cooling tower fan power (default: 5.0 kW)
- **pumpPowerKw**: Chilled water pump power (default: 3.0 kW)

#### 1.5 Water Loop Configuration
- **chilledWaterSupplyTempC**: Supply temperature (default: 7.0°C)
- **chilledWaterReturnTempC**: Return temperature (default: 17.0°C, ΔT = 10°C)
- **designFlowRateLps**: Design flow rate (liters per second)

#### 1.6 Economic Parameters
- **electricityRateUsdKwh**: Electricity cost ($/kWh)
- **demandChargeUsdKw**: Peak demand charge ($/kW)
- **carbonFactorKgKwh**: Grid carbon intensity (kg CO2/kWh)
- **waterCostUsdPerM3**: Water cost ($/m³)

### Formulas (Step 1)

#### Total IT Load Calculation
```
Total Servers = totalRacks × serversPerRack

Server Power (W) = serverIdlePowerW + (serverMaxPowerW - serverIdlePowerW) × Utilization + serverFanPowerW

Total Server Power (kW) = (Server Power × Total Servers) / 1000

UPS Losses (kW) = Total Server Power × upsLossFraction

PDU Losses (kW) = Total Server Power × pduLossFraction

Total IT Load (kW) = Total Server Power + UPS Losses + PDU Losses
```

#### Thermal Compliance Check
```
isCompliant = (ambientTempC >= minInletTempC) AND 
              (ambientTempC <= maxInletTempC) AND 
              (dewPointC <= maxDewPointC)
```

### Outputs (Step 1)
- EdgeDataCenterScenario object with all configured parameters
- Total design IT power (kW)
- Total server count
- Water loop ΔT

---

## STEP 2: 8760-HOUR CO-SIMULATION ENGINE

### Purpose
Tight integration between CloudSim Plus workload simulation and chilled water physics, advancing hour-by-hour to prevent "thermal drift".

### CloudSim Integration

#### Server Power Model
```java
// CloudSim PowerModelHostSimple
Host.setPowerModel(new PowerModelHostSimple(maxPowerWatts, idlePowerWatts))

// Power calculation per host
hostPowerW = host.getPowerModel().getPower()  // Based on CPU utilization
```

#### Workload Simulation
- CloudSim advances by 3600 seconds (1 hour) per timestep
- VMs and Cloudlets execute on hosts
- Host utilization drives power consumption
- Power models convert utilization to heat load

### Chilled Water Physics (EIR Framework)

#### 2.1 Chiller COP Calculation

**Electric Input Ratio (EIR) Method** (DOE-2 / EnergyPlus)

```
EIR = (a + b×Tchw + c×Tchw²) × (d + e×Tcond + f×Tcond²) × PLR_modifier

COP = COP_reference / EIR

Where:
- Tchw = Chilled water supply temperature (°C)
- Tcond = Condenser temperature (°C) = Ambient + 5°C (cooling tower approach)
- a, b, c, d, e, f = EIR coefficients from manufacturer data
- PLR_modifier = Part-load ratio modifier
```

**Part-Load Ratio (PLR) Modifier:**
```
PLR_modifier = 0.2 + 0.5×LoadFraction + 0.3×LoadFraction²

LoadFraction = ActualLoad / ReferenceLoad  (clamped to 0.1 - 1.0)
```

**COP with Fouling:**
```
Actual_COP = Calculated_COP / FoulingFactor

Where FoulingFactor = 1.0 (clean) to 1.3 (degraded)
```

#### 2.2 Chiller Power Consumption
```
Chiller Power (kW) = IT Load (kW) / Chiller COP
```

#### 2.3 Auxiliary Equipment Power

**Pump Power (Variable Speed, Cubic Law):**
```
Pump Power (kW) = Design Pump Power × LoadFraction³ × FoulingFactor
```

**Cooling Tower Fan Power (Variable Speed, Cubic Law):**
```
Tower Fan Power (kW) = Design Tower Power × LoadFraction³ × FoulingFactor^1.5
```

#### 2.4 Equipment Degradation (Fouling)
```
Fouling Increase = (Operating Hours / 1000) × 0.08  (max 30%)

FoulingFactor = 1.0 + Fouling Increase

Maintenance Reset: Every 2000 hours → FoulingFactor = 1.0
```

#### 2.5 Rack Inlet Temperature
```
Supply Air Temp (°C) = Chilled Water Supply + 3.0  (CRAH approach)

Rack Inlet Temp (°C) = Supply Air Temp + (LoadFraction × 2.0)
```

#### 2.6 Total Cooling Power
```
Total Cooling (kW) = Chiller Power + Pump Power + Tower Fan Power
```

### Time-of-Use (TOU) Tariffs

```
Hour of Day = (hour - 1) % 24
Day of Week = ((hour - 1) / 24) % 7

If Weekday AND (12:00 ≤ Hour < 18:00):
    Tariff Rate = Base Rate × 1.5  (Peak)
Else If (22:00 ≤ Hour OR Hour < 6:00):
    Tariff Rate = Base Rate × 0.7  (Off-Peak)
Else:
    Tariff Rate = Base Rate  (Partial-Peak)
```

### Hourly Cost Calculation
```
Edge Overhead (kW) = 7.2  (lighting, controls, network)

Total Facility Power (kW) = IT Load + Cooling Power + Edge Overhead

Hourly Cost ($) = Total Facility Power × Tariff Rate × Timestep (1 hour)
```

### Hourly Carbon Emissions
```
Hourly Carbon (kg CO2) = Total Facility Power × Carbon Factor (kg/kWh)
```

### Hourly PUE
```
PUE = Total Facility Power / IT Load
```

### Outputs (Step 2)
For each of 8760 hours:
- IT load (kW)
- Chiller power (kW), COP
- Pump power (kW)
- Tower fan power (kW)
- Total cooling power (kW)
- Rack inlet temperature (°C)
- Ambient & wet-bulb temperature (°C)
- Hourly cost ($)
- Hourly carbon (kg CO2)
- PUE
- Thermal compliance (boolean)
- Fouling factor

---

## STEP 3: LIFE-CYCLE ANALYSIS & SUSTAINABILITY KPIs

### Purpose
Transform 8760 hours of simulation data into engineering-grade decision metrics following ISO/IEC 30134 and NIST Handbook 135.

### 3.1 Annual Aggregation

```
Annual IT Energy (kWh) = Σ(hourly IT load)

Annual Cooling Energy (kWh) = Σ(hourly cooling power)

Annual Edge Overhead (kWh) = 7.2 kW × 8760 hours

Annual Total Energy (kWh) = IT + Cooling + Edge Overhead

Annual Energy Cost ($) = Σ(hourly costs)

Annual Carbon (kg) = Σ(hourly carbon)

Annual Water (L) = Σ(cooling power × 1.8 L/kWh)  (evaporation estimate)

Thermal Excursion Hours = Count(rack inlet temp outside 18-27°C)

Peak Demand (kW) = Max(total facility power)
```

### 3.2 Sustainability KPIs (ISO/IEC 30134)

#### PUE (Power Usage Effectiveness) - ISO/IEC 30134-2
```
PUE = Annual Total Energy / Annual IT Energy

PUE Improvement (%) = ((Baseline PUE - Actual PUE) / Baseline PUE) × 100
```

#### WUE (Water Usage Effectiveness) - ISO/IEC 30134-9
```
WUE (L/kWh) = Annual Water (L) / Annual IT Energy (kWh)
```

#### CUE (Carbon Usage Effectiveness) - ISO/IEC 30134-8
```
CUE (kg CO2/kWh) = Annual Carbon (kg) / Annual IT Energy (kWh)
```

#### Energy Efficiency
```
Energy Efficiency = 1 / PUE
```

### 3.3 Financial Metrics (NIST Handbook 135)

#### Annual OPEX
```
Annual OPEX ($) = Energy Cost + Maintenance Cost + Water Cost

Where:
- Maintenance Cost = Annual fixed maintenance
- Water Cost = (Water Volume in m³) × Water Rate ($/m³)
```

#### Annual Savings
```
Annual Savings ($) = Baseline Annual OPEX - Chilled Water Annual OPEX
```

#### Simple Payback Period
```
Differential CAPEX ($) = Chilled Water CAPEX - Baseline CAPEX

Simple Payback (years) = Differential CAPEX / Annual Savings
```

#### Net Present Value (NPV)
```
NPV = -Differential CAPEX + Σ(PV of annual savings over horizon)

For each year t (1 to horizon):
    Escalated Savings = Annual Savings × (1 + Escalation Rate)^t
    Present Value = Escalated Savings / (1 + Discount Rate)^t
    NPV += Present Value

Where:
- Escalation Rate = Annual electricity price increase (e.g., 3%)
- Discount Rate = Time value of money (e.g., 5%)
- Horizon = Analysis period (e.g., 15 years)
```

#### Total Cost of Ownership (TCO)
```
TCO = Initial CAPEX + Σ(escalated annual OPEX over horizon)

For each year t (1 to horizon):
    Escalated OPEX = Annual OPEX × (1 + Escalation Rate)^t
    TCO += Escalated OPEX
```

#### Levelized Cost of Energy (LCOE)
```
LCOE ($/kWh) = TCO / (Annual IT Energy × Horizon Years)
```

#### Return on Investment (ROI)
```
Total Savings = Annual Savings × Horizon Years

ROI (%) = ((Total Savings - Differential CAPEX) / Differential CAPEX) × 100
```

### 3.4 Compliance Assessment

#### Thermal Compliance (ASHRAE TC 9.9)
```
Thermal Compliance (%) = ((8760 - Excursion Hours) / 8760) × 100

Thermal Compliant = (Excursion Hours < 88)  // <1% threshold
```

#### Water Compliance
```
Water Stress Threshold = 2.0 L/kWh

Water Compliant = (WUE < Water Stress Threshold)
```

#### Reliability
```
Reliability (%) = Thermal Compliance (%)

Reliability Compliant = Thermal Compliant
```

### 3.5 Go/No-Go Decision Logic

**Three Criteria:**

1. **Thermal Compliance**: Excursion hours < 88 (99% uptime)
2. **Water Constraint**: WUE < 2.0 L/kWh (for water-stressed regions)
3. **Financial Viability**: NPV > 0 AND Payback < 10 years

**Scoring:**
- Score = 0 (initialize)
- If Criterion 1 PASS: Score += 1
- If Criterion 2 PASS: Score += 1
- If Criterion 3 PASS: Score += 1

**Recommendation:**
- Score ≥ 3: **GO** - System is technically and financially viable
- Score = 2: **CONDITIONAL GO** - Review marginal criteria
- Score < 2: **NO-GO** - System does not meet minimum requirements

### Outputs (Step 3)

#### Annual Metrics
- IT energy, cooling energy, total energy (kWh)
- Peak demand (kW)
- Water consumption (L, m³)
- Carbon emissions (kg, metric tons)
- Energy cost, maintenance cost, water cost, total OPEX ($)
- Thermal excursion hours

#### Sustainability KPIs
- PUE, WUE, CUE
- PUE improvement vs baseline (%)
- Energy efficiency (%)
- Total carbon footprint (metric tons)

#### Financial Metrics
- Annual savings ($)
- Simple payback (years)
- NPV ($)
- TCO ($)
- LCOE ($/kWh)
- ROI (%)

#### Compliance Assessment
- Thermal compliance (%, boolean)
- Water compliance (boolean)
- Reliability (%, boolean)

#### Recommendation
- Go/No-Go decision with justification

---

## COMPLETE WORKFLOW

### Input → Process → Output

```
INPUTS:
├── EdgeDataCenterScenario
│   ├── Infrastructure (racks, servers, power specs)
│   ├── Thermal boundaries (ASHRAE limits)
│   ├── Chiller specs (EIR coefficients, COP)
│   ├── Economic parameters (rates, costs)
│   └── Weather data (8760 hours)
│
├── EconomicConfig
│   ├── CAPEX (chilled water vs baseline)
│   ├── OPEX (maintenance, water)
│   ├── Financial parameters (discount, escalation)
│   └── Baseline comparison (PUE, OPEX)
│
└── CarbonConfig
    ├── Grid carbon factor
    ├── Water carbon factor
    └── Carbon pricing

PROCESS:
├── Step 1: Configuration & Validation
│   └── Load inputs, validate thermal boundaries
│
├── Step 2: 8760-Hour Co-Simulation
│   ├── For each hour (1 to 8760):
│   │   ├── Get weather data
│   │   ├── CloudSim: Calculate IT load from workload
│   │   ├── Physics: Calculate chiller COP (EIR method)
│   │   ├── Physics: Calculate cooling power
│   │   ├── Update equipment degradation (fouling)
│   │   ├── Calculate costs (TOU tariffs)
│   │   ├── Calculate carbon emissions
│   │   ├── Check thermal compliance
│   │   └── Store hourly results
│   └── Maintenance every 2000 hours
│
└── Step 3: Life-Cycle Analysis
    ├── Aggregate 8760 hourly results
    ├── Calculate sustainability KPIs (PUE, WUE, CUE)
    ├── Calculate financial metrics (NPV, Payback, TCO)
    ├── Assess compliance (thermal, water, reliability)
    └── Generate Go/No-Go recommendation

OUTPUTS:
├── Hourly Results (8760 rows)
│   ├── IT load, cooling power, temperatures
│   ├── Costs, carbon, PUE
│   └── Compliance flags
│
├── Annual Summary
│   ├── Total energy, water, carbon
│   ├── Peak demand
│   └── Total costs
│
├── Sustainability KPIs
│   ├── PUE, WUE, CUE
│   └── Improvement vs baseline
│
├── Financial Analysis
│   ├── NPV, Payback, TCO, LCOE, ROI
│   └── Annual savings
│
├── Compliance Report
│   ├── Thermal excursions
│   ├── Water usage
│   └── Reliability metrics
│
└── Engineering Recommendation
    └── GO / CONDITIONAL GO / NO-GO with justification
```

---

## KEY STANDARDS & METHODOLOGIES

1. **ASHRAE TC 9.9**: Thermal guidelines for data centers (18-27°C recommended)
2. **ASHRAE 90.4**: Energy standard for data centers (IT vs facility energy separation)
3. **ISO/IEC 30134-2**: PUE measurement standard
4. **ISO/IEC 30134-8**: CUE measurement standard
5. **ISO/IEC 30134-9**: WUE measurement standard
6. **NIST Handbook 135**: Life-cycle costing methodology
7. **DOE-2 / EnergyPlus**: EIR chiller performance curves

---

## VALIDATION & TESTING

### Unit Tests
- EIR calculation accuracy
- Fouling degradation model
- NPV calculation with escalation
- Thermal compliance checking

### Integration Tests
- CloudSim + Physics synchronization
- 8760-hour simulation completion
- CSV export functionality

### Demo Programs
- **Step1Demo**: Configuration and infrastructure setup
- **Step2Demo**: Co-simulation with CloudSim
- **Step3Demo**: Complete life-cycle analysis

---

## USAGE EXAMPLE

```java
// Step 1: Configure scenario
EdgeDataCenterScenario scenario = new EdgeDataCenterScenario();
scenario.setTotalRacks(2);
scenario.setServersPerRack(10);
scenario.setChillerReferenceCop(6.0);

// Step 2: Run simulation
SimulationOrchestrator orchestrator = new SimulationOrchestrator(
    cloudSim, physics, envEngine, scenario
);
orchestrator.runAnnualSimulation();

// Step 3: Analyze results
LifeCycleAnalyzer analyzer = new LifeCycleAnalyzer(
    scenario, economicConfig, carbonConfig
);
ScenarioSummary summary = analyzer.analyze(results);
summary.printReport();
```

---

## LIMITATIONS & ASSUMPTIONS

1. **Weather Data**: Synthetic sinusoidal profile if EPW file not provided
2. **Water Consumption**: Estimated at 1.8 L/kWh (typical evaporation rate)
3. **Edge Overhead**: Fixed at 7.2 kW (lighting, controls, network)
4. **Fouling Model**: Linear degradation, 8% per 1000 hours, max 30%
5. **Maintenance**: Assumed every 2000 hours, instant restoration
6. **CloudSim Integration**: Requires CloudSim Plus 8.x or higher

---

## FILE STRUCTURE

```
chilled-water-system/
├── src/main/java/com/acme/chilledwatersystem/
│   ├── EdgeDataCenterScenario.java      (Step 1: Inputs)
│   ├── EdgeInfraManager.java            (Step 1: CloudSim setup)
│   ├── EnvironmentEngine.java           (Step 1: Weather)
│   ├── CoolingCostCalculator.java       (Step 1: Cost logic)
│   ├── ChilledWaterPhysics.java         (Step 2: EIR physics)
│   ├── SimulationOrchestrator.java      (Step 2: Co-simulation)
│   ├── LifeCycleAnalyzer.java           (Step 3: Analysis)
│   ├── ScenarioSummary.java             (Step 3: Report)
│   ├── EconomicConfig.java              (Step 3: Economics)
│   ├── CarbonConfig.java                (Step 3: Carbon)
│   ├── Step1Demo.java                   (Demo: Step 1)
│   ├── Step2Demo.java                   (Demo: Step 2)
│   └── Step3Demo.java                   (Demo: Complete)
└── METHODOLOGY.md                        (This document)
```

---

## REFERENCES

- ASHRAE TC 9.9 Thermal Guidelines
- ISO/IEC 30134 Series (Data Center KPIs)
- NIST Handbook 135 (Life-Cycle Costing)
- DOE-2 Engineering Manual (EIR Method)
- CloudSim Plus Documentation

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-24  
**Author**: Chilled Water System Development Team
