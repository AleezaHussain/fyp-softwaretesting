# Chilled Water Cooling System - Data Flow Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER STARTS HERE                                │
│                    http://localhost:3000/input-management                │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: WELCOME                                                         │
│  ────────────────                                                        │
│  • Introduction to simulation                                            │
│  • Overview of cooling techniques                                        │
│  • Click "Get Started" button                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: COOLING TECHNIQUE SELECTION                                     │
│  ─────────────────────────────────                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Air-Side    │  │ Evaporative  │  │ Chilled Water│ ← USER SELECTS   │
│  │ Economizer   │  │   Cooling    │  │   Cooling    │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                              ↓                            │
│                                    selectedTechnique = "water"           │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3: CONFIGURATION (ChilledWaterCooling.tsx)                        │
│  ──────────────────────────────────────────────                         │
│                                                                          │
│  1️⃣ WEATHER DATA UPLOAD                                                 │
│     • Drag & drop EPW or CSV file                                       │
│     • Parse 8760 hourly data points                                     │
│     • Extract location & elevation                                      │
│     ✅ weatherData: Array[8760]                                         │
│                                                                          │
│  2️⃣ CLIMATE SCENARIO                                                    │
│     • Warming Delta slider (0.0 - 1.5°C)                                │
│     ✅ warmingDelta: 1.0                                                │
│                                                                          │
│  3️⃣ SITE ALTITUDE                                                       │
│     • Number input with meters/feet toggle                              │
│     ✅ altitude: 1524.0 (meters)                                        │
│                                                                          │
│  4️⃣ IT INFRASTRUCTURE                                                   │
│     • Racks, servers, power profile                                     │
│     • Workload type (AI Training/Inference/Enterprise)                  │
│     • CPU utilization slider                                            │
│     ✅ totalServers: 50                                                 │
│     ✅ totalITLoadKW: 185.5                                             │
│                                                                          │
│  5️⃣ WATER STRESS LEVEL                                                  │
│     • Dropdown (Low to Very High)                                       │
│     ✅ wueThreshold: 2.0 L/kWh                                          │
│                                                                          │
│  6️⃣ MECHANICAL SPECS                                                    │
│     • Chiller type (Air/Water-cooled)                                   │
│     • Supply water temperature (5-15°C)                                 │
│     • Fouling factor (1.0-1.3)                                          │
│     ✅ chillerRefCOP: 5.3                                               │
│     ✅ supplyWaterTempC: 7.0                                            │
│                                                                          │
│  7️⃣ ECONOMIC & ENVIRONMENTAL                                            │
│     • Electricity rate + TOU pricing                                    │
│     • Carbon intensity                                                  │
│     • Refrigerant type                                                  │
│     • Carbon tax (IPCC pathway or manual)                               │
│     ✅ baseElectricityRate: 0.12 $/kWh                                  │
│     ✅ carbonTax2030: 254 $/ton                                         │
│                                                                          │
│  📦 ALL DATA STORED IN: configRef.current                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4: REVIEW & RUN SIMULATION                                        │
│  ─────────────────────────────────                                      │
│  • Display summary of all inputs                                        │
│  • Show estimated benefits                                              │
│  • User clicks: "Run Simulation" button                                 │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  handleSubmit() function triggered                              │    │
│  │                                                                  │    │
│  │  if (selectedTechnique === "water") {                           │    │
│  │    // 🌊 CHILLED WATER PATH                                     │    │
│  │    const apiRequest = transformConfigToApiRequest(config);      │    │
│  │    const response = await runChilledWaterSimulation(apiRequest);│    │
│  │    navigate("/dashboard");                                      │    │
│  │  }                                                               │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND API SERVICE (chilledWaterApi.ts)                              │
│  ────────────────────────────────────────────                           │
│                                                                          │
│  transformConfigToApiRequest(config)                                    │
│  ↓                                                                       │
│  {                                                                       │
│    weatherData: { ... 8760 data points ... },                           │
│    climateScenario: { warmingDelta: 1.0 },                              │
│    siteParameters: { altitude: 1524.0 },                                │
│    itInfrastructure: { totalServers: 50, ... },                         │
│    waterStress: { wueThreshold: 2.0 },                                  │
│    mechanicalSpecs: { chillerRefCOP: 5.3, ... },                        │
│    economicEnvironmental: { carbonTax2030: 254, ... }                   │
│  }                                                                       │
│  ↓                                                                       │
│  HTTP POST Request                                                       │
│  URL: http://localhost:8080/api/v1/chilled-water/simulate               │
│  Headers: Content-Type: application/json                                │
│  Body: JSON payload (above)                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                            🌐 NETWORK CALL
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND REST CONTROLLER (ChilledWaterController.java)                  │
│  ────────────────────────────────────────────────────────               │
│                                                                          │
│  @PostMapping("/api/v1/chilled-water/simulate")                         │
│  public ResponseEntity<SimulationResponse> runSimulation(               │
│      @Valid @RequestBody SimulationRequest request                      │
│  ) {                                                                     │
│      // 1. Validate request                                             │
│      // 2. Call service layer                                           │
│      SimulationResponse response = service.runSimulation(request);      │
│      return ResponseEntity.ok(response);                                │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND SERVICE LAYER (ChilledWaterSimulationService.java)             │
│  ─────────────────────────────────────────────────────────────          │
│                                                                          │
│  FOR EACH HOUR (0 to 8759):                                             │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  1. Get weather data for hour                                   │    │
│  │     weather = weatherData[hour]                                 │    │
│  │     ambientTemp = weather.dry_bulb_c + warmingDelta             │    │
│  │                                                                  │    │
│  │  2. Calculate IT load                                            │    │
│  │     avgPower = idlePower + (maxPower - idlePower) * utilization│    │
│  │     itLoad = totalServers * avgPower / 1000                     │    │
│  │                                                                  │    │
│  │  3. Calculate cooling load                                       │    │
│  │     coolingLoad = itLoad * 0.4  // 40% of IT load               │    │
│  │                                                                  │    │
│  │  4. Calculate chiller COP                                        │    │
│  │     tempFactor = 1.0 + (supplyTemp - 7.0) * 0.02                │    │
│  │     ambientFactor = 1.0 - (ambientTemp - 25.0) * 0.015          │    │
│  │     foulingAdjustment = 1.0 / foulingFactor                     │    │
│  │     cop = refCOP * tempFactor * ambientFactor * foulingAdjust   │    │
│  │                                                                  │    │
│  │  5. Calculate chiller power                                      │    │
│  │     chillerPower = coolingLoad / cop                             │    │
│  │                                                                  │    │
│  │  6. Calculate water usage (if water-cooled)                      │    │
│  │     if (chillerType == "water_cooled_screw")                     │    │
│  │       waterUsage = coolingLoad * 1.8  // L/kWh                   │    │
│  │                                                                  │    │
│  │  7. Calculate electricity cost                                   │    │
│  │     hourlyRate = getElectricityRate(hour, touEnabled, ...)      │    │
│  │     cost = (itLoad + chillerPower) * hourlyRate                 │    │
│  │                                                                  │    │
│  │  8. Calculate carbon emissions                                   │    │
│  │     carbon = (itLoad + chillerPower) * carbonIntensity          │    │
│  │                                                                  │    │
│  │  9. Store hourly result                                          │    │
│  │     hourlyResults.add(new HourlyResult(...))                     │    │
│  │                                                                  │    │
│  │  10. Accumulate totals                                           │    │
│  │      totalEnergy += (itLoad + chillerPower)                      │    │
│  │      totalCooling += coolingLoad                                 │    │
│  │      totalWater += waterUsage                                    │    │
│  │      totalCost += cost                                           │    │
│  │      totalCarbon += carbon                                       │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  AFTER 8760 HOURS:                                                       │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  • Calculate annual metrics:                                     │    │
│  │    - PUE = totalEnergy / (itLoad * 8760)                         │    │
│  │    - WUE = totalWater / totalEnergy                              │    │
│  │    - Average COP                                                 │    │
│  │                                                                  │    │
│  │  • Validate Phase 4 gates:                                       │    │
│  │    - Thermal Compliance: PASS/FAIL                               │    │
│  │    - Water Constraint: WUE <= threshold                          │    │
│  │    - Carbon Liability: < 30% of OpEx                             │    │
│  │    - Economic Viability: NPV > 0                                 │    │
│  │                                                                  │    │
│  │  • Build response object                                         │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND RESPONSE (JSON)                                                │
│  ──────────────────────────                                             │
│  {                                                                       │
│    "status": "success",                                                 │
│    "simulationId": "uuid-here",                                         │
│    "executionTime": 1234,                                               │
│    "results": {                                                         │
│      "annual": {                                                        │
│        "energyConsumption_kWh": 1234567.89,                             │
│        "coolingLoad_kWh": 456789.12,                                    │
│        "waterUsage_L": 987654.32,                                       │
│        "cost_USD": 148148.15,                                           │
│        "carbonEmissions_kg": 308641.97                                  │
│      },                                                                 │
│      "metrics": {                                                       │
│        "pue": 1.35,                                                     │
│        "wue": 0.8,                                                      │
│        "averageCOP": 4.8,                                               │
│        "peakCoolingLoad_kW": 75.5                                       │
│      },                                                                 │
│      "economics": {                                                     │
│        "capex_USD": 500000,                                             │
│        "opex_annual_USD": 148148.15,                                    │
│        "lccp_USD": 2500000,                                             │
│        "npv_USD": 125000,                                               │
│        "paybackPeriod_years": 3.4                                       │
│      },                                                                 │
│      "phase4Gates": {                                                   │
│        "thermalCompliance": "PASS",                                     │
│        "waterConstraint": "PASS",                                       │
│        "carbonLiability": "PASS",                                       │
│        "economicViability": "PASS"                                      │
│      },                                                                 │
│      "hourlyResults": [ ... 8760 entries ... ]                         │
│    }                                                                    │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                            🌐 NETWORK RESPONSE
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND API SERVICE (chilledWaterApi.ts)                              │
│  ────────────────────────────────────────────────                       │
│  • Receives response                                                    │
│  • Validates status code                                                │
│  • Parses JSON                                                          │
│  • Returns typed response                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND INPUT MANAGEMENT (handleSubmit)                               │
│  ───────────────────────────────────────────────                        │
│  • Store results in state:                                              │
│    updateSimulationInput({                                              │
│      coolingTechnique: "water",                                         │
│      chilledWaterConfig: config,                                        │
│      chilledWaterResults: response.results                              │
│    })                                                                    │
│  • Navigate to dashboard:                                               │
│    navigate("/dashboard")                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD PAGE (http://localhost:3000/dashboard)                       │
│  ───────────────────────────────────────────────────                    │
│                                                                          │
│  📊 DISPLAY RESULTS:                                                    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Annual Metrics                                                 │    │
│  │  • Energy Consumption: 1,234,567.89 kWh                         │    │
│  │  • Cooling Load: 456,789.12 kWh                                 │    │
│  │  • Water Usage: 987,654.32 L                                    │    │
│  │  • Total Cost: $148,148.15                                      │    │
│  │  • Carbon Emissions: 308,641.97 kg CO₂                          │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Performance Metrics                                            │    │
│  │  • PUE: 1.35                                                    │    │
│  │  • WUE: 0.8 L/kWh                                               │    │
│  │  • Average COP: 4.8                                             │    │
│  │  • Peak Cooling Load: 75.5 kW                                   │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Phase 4 Gates                                                  │    │
│  │  ✅ Thermal Compliance: PASS                                    │    │
│  │  ✅ Water Constraint: PASS                                      │    │
│  │  ✅ Carbon Liability: PASS                                      │    │
│  │  ✅ Economic Viability: PASS                                    │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  📈 CHARTS:                                                             │
│  • Hourly energy consumption                                            │
│  • COP variation over time                                              │
│  • Cost breakdown                                                       │
│  • Carbon emissions timeline                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                            ✅ USER SEES RESULTS
```

---

## Key Decision Points

### 1. Cooling Technique Selection (Step 2)
```
if (selectedTechnique === "air") {
  → Use Air-Side Economizer flow
  → Call existing air-side API
}
else if (selectedTechnique === "evaporative") {
  → Use Evaporative Cooling flow
  → Call existing evaporative API
}
else if (selectedTechnique === "water") {
  → Use Chilled Water Cooling flow ✅
  → Call NEW chilled water API
  → POST to http://localhost:8080/api/v1/chilled-water/simulate
}
```

### 2. Data Transformation (Before API Call)
```
Frontend Config → transformConfigToApiRequest() → Backend API Format
```

### 3. Backend Processing (8760-hour loop)
```
For each hour:
  1. Get weather data
  2. Apply warming delta
  3. Calculate IT load
  4. Calculate cooling load
  5. Calculate COP (temperature-dependent)
  6. Calculate chiller power
  7. Calculate water usage
  8. Calculate cost (TOU-aware)
  9. Calculate emissions
  10. Store hourly result
```

### 4. Phase 4 Gate Validation
```
Gate 1: Thermal Compliance
  → Check if server temps < 27°C (ASHRAE A2)

Gate 2: Water Constraint
  → Check if WUE <= threshold (based on water stress level)

Gate 3: Carbon Liability
  → Check if carbon cost < 30% of annual OpEx

Gate 4: Economic Viability
  → Check if NPV > 0
```

---

## Data Size Reference

- **Weather Data**: 8,760 hourly records (1 year)
- **Price Profile**: 24 hourly rates
- **Hourly Results**: 8,760 records returned
- **Total Request Size**: ~500 KB - 2 MB (depending on weather data)
- **Total Response Size**: ~1 MB - 5 MB (with hourly results)

---

## Timing Reference

- **Frontend Processing**: < 100 ms (data transformation)
- **Network Latency**: 10-50 ms (local)
- **Backend Processing**: 1-5 seconds (8760-hour simulation)
- **Total Time**: ~2-6 seconds end-to-end

---

## Error Handling Points

1. **Frontend Validation**: Missing required fields
2. **Network Error**: Backend not running
3. **Backend Validation**: Invalid data format
4. **Simulation Error**: Calculation failure
5. **Response Parsing**: Invalid JSON

Each error is caught and displayed to the user with a clear message.
