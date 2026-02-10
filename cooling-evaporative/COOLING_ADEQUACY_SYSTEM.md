# 🔥 Cooling Adequacy Assessment System

## Overview

This system transforms your evaporative cooling model from a **calculator** into an **engineering decision system**. Instead of just computing energy and water consumption, it now answers the critical question:

> **"Given the current setup + climate, is cooling sufficient or not — and why?"**

## Core Concept

**Cooling adequacy ≠ energy consumption**

High energy use does not automatically mean cooling is insufficient. Cooling adequacy is about **thermal balance** and **compliance with engineering standards**.

## The 4 Engineering Checks

Every simulation run evaluates these four critical checks:

### ✅ CHECK 1: Heat Balance (Most Critical)
```java
boolean heatBalanced = Q_cooling_total >= Q_heat_generated_total;
```
- **Purpose**: Verify cooling capacity meets heat load
- **Failure**: Cooling insufficient ❌

### ✅ CHECK 2: Rack Inlet Temperature Compliance
```java
boolean inletTempOk = T_inlet_max <= 27.0; // ASHRAE Class A1
```
- **Purpose**: Ensure server inlet temperatures within safe limits
- **Standards**: 18°C ≤ T_inlet ≤ 27°C (ASHRAE)
- **Failure**: Local hotspots ❌

### ✅ CHECK 3: Humidity Feasibility (Evaporative-Specific)
```java
boolean evapEffective = (RH <= 80%) && ((T_dry - T_wet) > 5.0);
```
- **Purpose**: Verify evaporative cooling can work in current climate
- **Limits**: RH ≤ 80% AND wet-bulb depression > 5°C
- **Failure**: Climate limited ❌

### ✅ CHECK 4: Energy Efficiency Sanity Check
```java
boolean energyEfficient = PUE_avg <= 1.5;
```
- **Purpose**: Flag inefficient designs
- **Limit**: PUE ≤ 1.5 (acceptable), PUE ≤ 1.3 (good)
- **Failure**: Bad engineering choices ⚠️

## Assessment Status Logic

```java
if (!heatBalanced) {
    verdict = "INSUFFICIENT_COOLING";
} else if (!inletTempOk) {
    verdict = "LOCAL_HOTSPOTS";
} else if (!evapEffective) {
    verdict = "CLIMATE_LIMITED";
} else {
    verdict = "COOLING_SUFFICIENT";
}
```

## Output Structure

### JSON Assessment Output
```json
{
  "cooling_assessment": {
    "status": "INSUFFICIENT_COOLING",
    "confidence": 0.92,
    "checks": {
      "heat_balance": false,
      "inlet_temperature_ok": false,
      "humidity_ok": true,
      "energy_efficiency_ok": false
    },
    "key_metrics": {
      "max_inlet_temp_c": 31.8,
      "cooling_capacity_kw": 180.2,
      "heat_load_kw": 214.6,
      "pue_avg": 1.62,
      "max_humidity_percent": 75.0,
      "min_wetbulb_depression_c": 8.5
    },
    "engineering_notes": [
      "Cooling capacity is 16% lower than IT heat load during peak hours",
      "Evaporative cooling effectiveness reduced due to high humidity",
      "Rack inlet temperatures exceeded ASHRAE recommended limits for 4 hours"
    ],
    "recommendations": [
      "Increase cold aisle airflow by ~20%",
      "Add supplemental DX cooling during peak humidity hours",
      "Reduce rack power density or increase rack spacing"
    ]
  }
}
```

## Status Meanings

| Status | Meaning | Action Required |
|--------|---------|----------------|
| 🟢 **COOLING_SUFFICIENT** | System meets all requirements | Monitor and optimize |
| 🟠 **CLIMATE_LIMITED** | Evap cooling limited by weather | Consider hybrid cooling |
| 🟠 **LOCAL_HOTSPOTS** | Temperature compliance issues | Improve airflow distribution |
| 🔴 **INSUFFICIENT_COOLING** | Thermal capacity inadequate | Add cooling capacity |

## Engineering Standards

### Temperature Limits (ASHRAE)
- **Recommended**: 18°C - 25°C
- **Allowable**: 18°C - 27°C
- **Maximum**: 27°C (Class A1)

### Humidity Limits (Evaporative)
- **Effective Operation**: RH ≤ 80%
- **Minimum Wet-bulb Depression**: 5°C
- **Optimal Range**: RH 40-70%

### Energy Efficiency (PUE)
- **Excellent**: PUE ≤ 1.3
- **Good**: PUE ≤ 1.4
- **Acceptable**: PUE ≤ 1.5
- **Poor**: PUE > 1.5

## Usage

### Running Assessment
```bash
# Compile and run
mvn compile exec:java

# Test assessment system
mvn compile exec:java -Dexec.mainClass="com.acme.evap.CoolingAdequacyTest"
```

### Output Files
- **CSV Metrics**: `target/evap_metrics_[scenario].csv`
- **JSON Assessment**: `target/cooling_assessment_[scenario].json`
- **Summary**: `target/evap_summaries.csv`

### Integration with Frontend
The JSON assessment files can be consumed by your React frontend to display:
- Status badges (🟢🟠🔴)
- Check results (✅❌)
- Engineering explanations
- Actionable recommendations

## Key Benefits

✅ **Matches real HVAC validation logic**  
✅ **Climate-aware** (critical for evap cooling)  
✅ **Explains why energy is high**  
✅ **Prevents false "looks fine" results**  
✅ **Scales to liquid/DX/hybrid cooling**  
✅ **Professional engineering tool feel**  

## Example Console Output

```
🔥 COOLING ADEQUACY ASSESSMENT:
Status: CLIMATE_LIMITED (Confidence: 85.0%)

Checks:
  ✓ Heat Balance: PASS
  ✓ Inlet Temperature: PASS
  ✓ Humidity Feasibility: FAIL
  ✓ Energy Efficiency: PASS

Key Metrics:
  Max Inlet Temp: 26.0°C
  Cooling Capacity: 180.0 kW
  Heat Load: 175.0 kW
  Average PUE: 1.35

Engineering Notes:
  • Heat balance maintained - total cooling capacity meets or exceeds heat generation
  • High ambient humidity (85.0%) reduces evaporative cooling effectiveness
  • Low wet-bulb depression (3.0°C) limits evaporative cooling potential

Recommendations:
  🔧 Switch to indirect evaporative cooling (IEC) for high humidity periods
  🔧 Consider dew-point cooling or M-cycle IEC for better humidity tolerance
  🔧 Add DX cooling backup for low wet-bulb depression conditions
```

This system now answers the three critical engineering questions:
1. **Does this setup meet cooling demand?**
2. **If not, what exactly fails?**
3. **What should the engineer change?**