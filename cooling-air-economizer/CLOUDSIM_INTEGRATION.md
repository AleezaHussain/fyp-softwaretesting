# CloudSim Evaporative Cooling Integration

## Complete 4-Layer Architecture

This document describes the complete integration of CloudSim Plus with the evaporative cooling simulation system, implementing a comprehensive 4-layer architecture for AI-aware data center cooling analysis.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 4: Simulation Runner                    │
│                    (COOlienceSimRunner.java)                     │
│  • Orchestrates all components                                   │
│  • Manages simulation lifecycle                                  │
│  • Exports results for cooling analysis                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Layer 3: Sustainability & Carbon Tracking           │
│                  (SustainabilityDatacenter.java)                 │
│  • Facility-level carbon accounting                              │
│  • Multi-year financial projections (2025-2030)                  │
│  • Carbon tax escalation & grid decarbonization                  │
│  • PUE tracking and optimization                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Layer 2: Thermal & Power Modeling                   │
│    (ThermalEvaporativeHost.java + AIWorkloadPowerModel.java)    │
│  • Workload-specific power multipliers (1.0x - 1.8x)             │
│  • Heat generation calculations                                  │
│  • Rack-level power density tracking                             │
│  • Thermal dynamics simulation                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Layer 1: AI Workload Generation                     │
│                  (CloudSimWorkloadService.java)                  │
│  • AI Training: 85-95% sustained utilization                     │
│  • AI Inference: Bursty spikes (25% → 85-95%)                    │
│  • Mixed: 60% enterprise + 40% AI training                       │
│  • Enterprise: 50-65% traditional workload                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: AI Workload Generation

**File:** `CloudSimWorkloadService.java`

### Purpose
Generates realistic AI/ML workload profiles using CloudSim Plus simulation.

### AI Workload Modes

#### 1. AI_TRAINING (Power Multiplier: 1.80x)
- **Characteristics:** Sustained high load, 85-95% utilization
- **Use Case:** Model training, batch processing
- **Implementation:** Long-running cloudlets with high CPU utilization
- **Heat Profile:** Consistent high heat generation

```java
// Example usage
CloudSimWorkloadService.WorkloadConfig config = new CloudSimWorkloadService.WorkloadConfig();
config.workloadMode = CloudSimWorkloadService.AIWorkloadMode.AI_TRAINING;
config.numberOfServers = 50;
config.simulationHours = 24;

CloudSimWorkloadService.WorkloadResult result = service.generateWorkloadProfile(config);
```

#### 2. AI_INFERENCE (Power Multiplier: 1.40x)
- **Characteristics:** Bursty spikes, 25% baseline → 85-95% bursts
- **Use Case:** Real-time inference, API serving
- **Implementation:** Baseline cloudlet + multiple burst cloudlets
- **Heat Profile:** Variable heat with periodic spikes

#### 3. MIXED (Power Multiplier: 1.30x)
- **Characteristics:** 60% enterprise + 40% AI training
- **Use Case:** Hybrid data centers
- **Implementation:** Mixed cloudlet distribution
- **Heat Profile:** Moderate sustained load with AI peaks

#### 4. ENTERPRISE (Power Multiplier: 1.0x)
- **Characteristics:** Traditional workload, 50-65% utilization
- **Use Case:** Standard enterprise applications
- **Implementation:** Moderate continuous load
- **Heat Profile:** Steady-state heat generation

### Output
- `hourlyITLoadKW[]`: Total facility load by hour
- `rackITLoadKW[][]`: Per-rack load by hour
- `hourlyUtilization[]`: Average utilization by hour
- `hostUtilization[][]`: Per-host utilization

---

## Layer 2: Thermal & Power Modeling

**Files:** `ThermalEvaporativeHost.java`, `AIWorkloadPowerModel.java`

### ThermalEvaporativeHost

Extends CloudSim's Host class with thermal modeling capabilities:

```java
public class ThermalEvaporativeHost extends HostSimple {
    private double ambientTempC = 25.0;
    private double inletTempC = 18.0;
    private double exhaustTempC = 30.0;
    private double thermalMassKJperK = 15.0;
    
    // Thermal dynamics
    public void updateThermalState(double timeStepSeconds, double coolingCapacityKW);
    public double calculateHeatGeneration();
    public double getRequiredAirflowCFM();
}
```

### AIWorkloadPowerModel

Applies workload-specific power multipliers:

```java
public class AIWorkloadPowerModel extends PowerModelLinear {
    // Factory methods for different workload types
    public static AIWorkloadPowerModel forAITraining(double maxPowerW);    // 1.80x
    public static AIWorkloadPowerModel forAIInference(double maxPowerW);   // 1.40x
    public static AIWorkloadPowerModel forMixed(double maxPowerW);         // 1.30x
    public static AIWorkloadPowerModel forEnterprise(double maxPowerW);    // 1.0x
}
```

### Power Calculation

```
P_host(t) = P_idle + (P_max - P_idle) × utilization(t) × workload_multiplier
```

Where:
- `P_idle` = 100W (server idle power)
- `P_max` = 507W (server maximum power)
- `utilization(t)` = CPU utilization at time t (0-1)
- `workload_multiplier` = 1.0x - 1.8x (based on workload type)

---

## Layer 3: Sustainability & Carbon Tracking

**File:** `SustainabilityDatacenter.java`

### Purpose
Facility-level carbon accounting and multi-year financial projections.

### Key Features

#### 1. Carbon Accounting
```java
datacenter.setGridCarbonIntensity(0.45);        // 450g CO2/kWh
datacenter.setGridDecarbonizationRate(0.02);    // 2% annual reduction
datacenter.setCarbonTaxRate(50.0);              // $50/ton CO2
datacenter.setCarbonTaxEscalationRate(0.15);    // 15% annual increase
```

#### 2. Financial Projections (2025-2030)
```java
datacenter.setElectricityTariff(0.12);          // $0.12/kWh
datacenter.setEnergyEscalationRate(0.03);       // 3% annual increase
datacenter.setSimulationStartYear(2025.0);
```

#### 3. PUE Tracking
```java
datacenter.setBaselinePUE(1.8);                 // Mechanical-only baseline
datacenter.updateFacilityMetrics(simTime);      // Update hourly
```

### Output Metrics

- **Energy:** Total kWh, hourly breakdown
- **Carbon:** Total kg CO2, hourly emissions
- **Cost:** Energy cost, carbon tax, total OPEX
- **Efficiency:** PUE, CUE (Carbon Usage Effectiveness)
- **Projections:** 5-year financial forecasts

---

## Layer 4: Simulation Runner

**File:** `COOlienceSimRunner.java`

### Purpose
Orchestrates all components and manages the simulation lifecycle.

### Execution Flow

```java
// 1. Initialize CloudSim engine
CloudSimPlus simulation = new CloudSimPlus();

// 2. Create Sustainability Datacenter with Thermal Hosts
SustainabilityDatacenter datacenter = createSustainabilityDatacenter(config);

// 3. Create broker and VMs
DatacenterBroker broker = new DatacenterBrokerSimple(simulation);
List<Vm> vms = createVMs(config);
broker.submitVmList(vms);

// 4. Generate AI workload
CloudSimWorkloadService workloadService = new CloudSimWorkloadService();
WorkloadResult workloadResult = workloadService.generateWorkloadProfile(workloadConfig);

// 5. Run simulation
simulation.start();

// 6. Collect results
COOlienceResults results = collectResults(workloadResult, config);

// 7. Calculate multi-year projections
calculateMultiYearProjections(results, config);
```

### Configuration

```java
COOlienceConfig config = new COOlienceConfig();

// Infrastructure
config.numberOfServers = 50;
config.serversPerRack = 10;
config.serverMaxPowerW = 507.0;
config.serverIdlePowerW = 100.0;

// Workload
config.workloadMode = AIWorkloadMode.AI_TRAINING;
config.simulationHours = 24; // Can be extended to 8760
config.computeIntensityFactor = 1.2;

// Sustainability
config.electricityTariff = 0.12;
config.carbonTaxRate = 50.0;
config.gridCarbonIntensity = 0.45;
config.simulationStartYear = 2025.0;
```

### Running the Simulation

#### Standalone Execution
```bash
cd cooling-air-economizer
mvn clean compile
mvn exec:java -Dexec.mainClass="com.acme.aireconcalc.cloudsim.COOlienceSimRunner"
```

#### Programmatic Usage
```java
COOlienceSimRunner runner = new COOlienceSimRunner();
COOlienceResults results = runner.runSimulation(config);

// Export for evaporative cooling analysis
runner.exportToCSV(results, "workload_profile.csv");
```

---

## Integration with Evaporative Cooling API

### Data Flow

```
COOlienceSimRunner
    ↓ (generates)
Workload Profile CSV
    ↓ (uploaded to)
Evaporative Cooling API
    ↓ (processes)
EvaporativeCoolingService
    ↓ (produces)
Simulation Results
```

### Workload Profile Format

```csv
hour,it_load_kw,utilization_percent,rack_0_kw,rack_1_kw,rack_2_kw,rack_3_kw,rack_4_kw
0,26.76,85.2,5.35,5.35,5.35,5.35,5.36
1,27.12,86.4,5.42,5.42,5.42,5.42,5.44
2,26.89,85.6,5.38,5.38,5.38,5.38,5.37
...
```

### API Integration

```java
// 1. Generate workload profile
COOlienceSimRunner runner = new COOlienceSimRunner();
COOlienceResults results = runner.runSimulation(config);
runner.exportToCSV(results, "workload_profile.csv");

// 2. Upload to evaporative cooling API
// Frontend uploads CSV + configuration
// API endpoint: POST /api/simulations/evaporative-cooling

// 3. API processes simulation
EvaporativeCoolingService service = new EvaporativeCoolingService();
SimulationResponse response = service.runSimulation(weatherFile, request);

// 4. Results include:
// - Hourly cooling performance
// - PUE, WUE, CUE metrics
// - Cooling adequacy assessment
// - 5-year financial projections
```

---

## Expected Output

### Console Output

```
╔════════════════════════════════════════════════════════════╗
║     COOlience Multi-Year Simulation Runner                 ║
║     AI Workload → Thermal → Sustainability                 ║
╚════════════════════════════════════════════════════════════╝

🚀 Starting COOlience Simulation...
   Servers: 50
   Workload: AI_TRAINING
   Duration: 24 hours

📋 Step 1: Initializing CloudSim engine...
📋 Step 2: Creating Sustainability Datacenter...
   ✓ Created 50 ThermalEvaporativeHosts
   ✓ Configured sustainability tracking
📋 Step 3: Creating broker and VMs...
   ✓ Created 50 VMs
📋 Step 4: Generating AI workload...
📋 Step 5: Running simulation...
📋 Step 6: Collecting results...
📋 Step 7: Calculating 5-year projections...

✅ Simulation completed!

╔════════════════════════════════════════════════════════════╗
║              SIMULATION RESULTS SUMMARY                    ║
╚════════════════════════════════════════════════════════════╝

📊 WORKLOAD PROFILE:
   Mode: AI_TRAINING
   Duration: 24 hours
   Racks: 5
   Servers per Rack: 10

⚡ IT LOAD STATISTICS:
   Average: 26.76 kW
   Minimum: 25.12 kW
   Maximum: 28.45 kW
   Total Energy: 642.24 kWh

🌍 SUSTAINABILITY METRICS:
   Total Carbon: 288.01 kg CO2
   Carbon Tax: $14.40
   Average PUE: 1.80

📈 5-YEAR PROJECTIONS (2025-2030):
   Year | Energy (kWh) | Energy Cost ($) | Carbon (kg) | Carbon Tax ($) | Total OPEX ($)
   -----|--------------|-----------------|-------------|----------------|---------------
   2025 |       642.24 |           77.07 |      288.01 |          14.40 |          91.47
   2026 |       661.51 |           81.85 |      282.25 |          16.56 |          98.41
   2027 |       681.35 |           86.91 |      276.61 |          19.04 |         105.95
   2028 |       701.79 |           92.27 |      271.07 |          21.90 |         114.17
   2029 |       722.85 |           97.94 |      265.65 |          25.19 |         123.13
   2030 |       744.53 |          103.94 |      260.34 |          28.97 |         132.91
```

### Methodology Dashboard

```
Sim Time (Years) | IT Load (kW) | Cooling Mode | PUE  | Water (kg/s) | Carbon Tax ($)
-----------------|--------------|--------------|------|--------------|---------------
2025.1           | 100.0        | DEC          | 1.15 | 0.042        | $50.00
2027.5           | 180.0        | IEC/DX       | 1.35 | 0.015        | $78.20
2030.0           | 297.0        | DX ONLY      | 1.55 | 0.000        | $135.00
```

---

## Validation & Testing

### Four Engineering Checks

1. **Heat Balance Check**
   - Cooling capacity ≥ Heat load
   - Margin: 10-20% recommended

2. **Inlet Temperature Check**
   - Max inlet temp ≤ 27°C (ASHRAE A2)
   - Typical range: 18-27°C

3. **Humidity Check**
   - Relative humidity: 20-80%
   - Avoid condensation risk

4. **Energy Efficiency Check**
   - PUE ≤ 1.5 (target)
   - Compare against baseline (1.8)

### Test Scenarios

```java
// Scenario 1: AI Training (High Density)
config.workloadMode = AIWorkloadMode.AI_TRAINING;
config.computeIntensityFactor = 1.8;
// Expected: High cooling demand, potential DX backup usage

// Scenario 2: AI Inference (Bursty)
config.workloadMode = AIWorkloadMode.AI_INFERENCE;
config.computeIntensityFactor = 1.4;
// Expected: Variable cooling demand, good evap performance

// Scenario 3: Enterprise (Baseline)
config.workloadMode = AIWorkloadMode.ENTERPRISE;
config.computeIntensityFactor = 1.0;
// Expected: Steady cooling demand, excellent evap performance
```

---

## Dependencies

### Maven Dependencies (pom.xml)

```xml
<dependencies>
    <!-- CloudSim Plus -->
    <dependency>
        <groupId>org.cloudsimplus</groupId>
        <artifactId>cloudsim-plus</artifactId>
        <version>7.3.0</version>
    </dependency>
    
    <!-- Spring Boot (for API) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- JSON Processing -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
</dependencies>
```

---

## Future Enhancements

### 1. Weather Integration
- Sync CloudSim clock with weather CSV
- Dynamic cooling mode selection based on ambient conditions
- Real-time temperature offset application

### 2. Advanced Thermal Modeling
- Transient thermal analysis
- Rack-level hot spot detection
- CFD integration for airflow optimization

### 3. Machine Learning Integration
- Predictive workload forecasting
- Cooling optimization using RL
- Anomaly detection for thermal events

### 4. Extended Scenarios
- Multi-datacenter federation
- Renewable energy integration
- Demand response optimization

---

## References

1. **CloudSim Plus Documentation:** https://cloudsimplus.org
2. **ASHRAE TC 9.9:** Thermal Guidelines for Data Processing Environments (2021)
3. **Methodology Document:** `METHODOLOGY.md`
4. **API Documentation:** `evaporative-cooling-api/README.md`

---

## Support

For questions or issues:
- Check the methodology document: `METHODOLOGY.md`
- Review API documentation: `evaporative-cooling-api/README.md`
- Examine example configurations in `COOlienceSimRunner.java`

---

**Last Updated:** 2025-02-23  
**Version:** 1.0  
**Status:** ✅ Complete - All 4 layers integrated
