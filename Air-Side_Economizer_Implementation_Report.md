# Air-Side Economizer Implementation Report
**Data Center Cooling Optimization using CloudSim Plus**

---

**Student:** Aleeza Hussain  
**Course:** Final Year Project - Software Testing  
**Date:** September 24, 2025  
**Repository:** fyp-softwaretesting (Branch: aleeza)

---

## Executive Summary

This report presents the comprehensive implementation of an air-side economizer simulation system for data center cooling optimization. The project integrates thermal modeling, psychrometric controls, dynamic airflow optimization, and economic analysis within the CloudSim Plus framework to achieve significant energy and cost savings.

**Key Achievements:**
- **Energy Savings:** 27-65% reduction depending on climate conditions
- **CO2 Reduction:** 1.6-3.9 tonnes/year environmental impact reduction
- **Fan Efficiency:** 57% improvement through dynamic airflow scaling
- **Economic Viability:** 9-21 year payback periods with size-scaled CAPEX modeling

---

## 1. Project Overview

### 1.1 Objective
Develop a sophisticated air-side economizer simulation that addresses real-world data center cooling challenges through:
- Accurate thermal modeling integration
- Weather-responsive control algorithms  
- Dynamic airflow optimization
- Realistic economic analysis with size-appropriate scaling

### 1.2 System Architecture

The implementation consists of five core components:

1. **CloudSim Plus 8.0.0** - Discrete event simulation framework
2. **Thermal Integration Module** - Server/rack thermal modeling
3. **Economizer Control Logic** - Psychrometric-based mode switching
4. **Dynamic Airflow Optimization** - Smart CFM scaling algorithms
5. **Economic Analysis Engine** - ROI and CAPEX calculations

---

## 2. Technical Implementation

### 2.1 Psychrometric Control Algorithms

#### Enthalpy Calculation Formula
The system uses psychrometric principles to determine economizer operating conditions:

```java
// Saturation pressure calculation (Magnus formula)
double esat = 610.78 * Math.exp(17.2694 * tempC / (tempC + 238.3));

// Actual water vapor pressure
double e = (relativeHumidity / 100.0) * esat;

// Humidity ratio (kg water / kg dry air)
double W = 0.622 * e / (101325 - e);

// Specific enthalpy calculation (kJ/kg dry air)
double enthalpy = 1.005 * tempC + W * (2501 + 1.88 * tempC);
```

#### Control Decision Logic
- **Economizer Enable:** `enthalpy < 55.0 kJ/kg` (lockout threshold)
- **Temperature Zones:** 
  - Cold: `T < 15°C` → Full economizer
  - Mild: `15°C ≤ T < 25°C` → Partial economizer
  - Hot: `T ≥ 25°C` → Mechanical dominant

### 2.2 Dynamic Airflow Optimization

#### Smart Airflow Calculation
Traditional data centers use fixed CFM/kW ratios, leading to significant over-airing:

```java
// Dynamic scaling approach
double requiredCFM = totalITLoad_kW * 110;  // Base cooling requirement
double designMargin = 1.15;                 // 15% safety factor
double optimizedAirflow = requiredCFM * designMargin;

// Traditional approach (wasteful)
double traditionalAirflow = totalITLoad_kW * 320; // Fixed CFM/kW
```

**Results:**
- **Optimized:** 425 CFM for 3.36 kW system
- **Traditional:** 912 CFM for same system
- **Improvement:** 53% airflow reduction

#### Rack Thermal Index (RTI) Optimization
```java
double RTI = actualAirflow / requiredAirflow;
// Target RTI: 1.1-1.2 (optimal efficiency)
// Achieved RTI: 1.15 vs 2.46 traditional (58% improvement)
```

### 2.3 Component-Wise Energy Modeling

#### Fan Energy Calculation
```java
// Supply fan power
double supplyFanPower = (airflow_CFM * fanEfficiency_W_per_CFM * (1 + filterPenalty)) / 1000;

// Return fan power  
double returnFanPower = (airflow_CFM * returnFanEfficiency_W_per_CFM) / 1000;
```

#### Mechanical Cooling Energy
```java
// Chiller energy based on Coefficient of Performance (COP)
double chillerPower = thermalLoad_kW / COP;

// Pump energy (percentage of cooling load)
double pumpPower = chillerPower * 0.04; // 4% typical pump power fraction
```

#### Annual Energy Calculation
```java
// Mode-specific energy calculation
double totalEnergy = (econHours * econPower) + (partialHours * partialPower) + (mechHours * mechPower);
```

---

## 3. Control Algorithms

### 3.1 Weather-Responsive Mode Switching

The system implements temperature-based operating hour distribution:

#### Cold Conditions (T < 15°C)
- **Economizer Hours:** 8,760 (100% free cooling)
- **Partial Hours:** 0
- **Mechanical Hours:** 0
- **Expected Outcome:** Maximum energy savings

#### Mild Conditions (15°C ≤ T < 25°C)  
- **Economizer Hours:** 2,628 (30% of year)
- **Partial Hours:** 4,380 (50% of year) 
- **Mechanical Hours:** 1,752 (20% of year)
- **Expected Outcome:** Balanced operation with partial economizer dominant

#### Hot/Humid Conditions (T ≥ 25°C)
- **Economizer Hours:** 0
- **Partial Hours:** 1,752 (20% of year)
- **Mechanical Hours:** 7,008 (80% of year)
- **Expected Outcome:** Mechanical cooling dominant, limited economizer benefit

### 3.2 Partial Economizer Control Parameters

For partial economizer operation:
- **Outside Air Fraction:** 0.6 (60% outside air)
- **Mechanical Trim Fraction:** 0.4 (40% mechanical assist)
- **Supply Temperature:** 25°C (ASHRAE optimized)

---

## 4. Economic Analysis Model

### 4.1 Size-Scaled CAPEX Calculation

Traditional fixed CAPEX assumptions are unrealistic for small systems. The implementation uses component-based scaling:

```java
// Component-based CAPEX model
double scaledCAPEX = fixedCosts + (ITload_kW * costPerKW) + (airflow_CFM * costPerCFM);

// For 3kW system:
// Fixed costs: $1,500 (sensors, commissioning)
// IT load cost: 3.36 kW × $2,500 = $8,407
// Airflow cost: 425 CFM × $6.0 = $2,550
// Total: $12,457 vs $22,000 fixed assumption (43% reduction)
```

### 4.2 Return on Investment Analysis

```java
// Annual savings calculation
double annualSavings_kWh = baselineEnergy - testSystemEnergy;
double annualSavings_USD = annualSavings_kWh * electricityRate_USD_per_kWh;

// Payback period
double paybackPeriod = capitalCost_USD / annualSavings_USD;
```

---

## 5. Testing Framework & Validation

### 5.1 Comprehensive Test Scenarios

The system was validated using three critical test cases:

#### Test 1: Cold-Edge Sanity (8°C/40% RH)
- **Expected:** Full economizer operation
- **Result:** 8,760 economizer hours ✓
- **Energy Savings:** 8,628 kWh/yr (65% reduction)
- **CO2 Savings:** 3.9 tonnes/yr
- **Payback:** 9.0 years

#### Test 2: Hot/Humid Fallback (30°C/80% RH)
- **Expected:** Mechanical cooling dominant
- **Result:** 7,008 mechanical hours ✓
- **Energy Savings:** 3,635 kWh/yr (27% reduction)
- **CO2 Savings:** 1.6 tonnes/yr
- **Payback:** 21.3 years

#### Test 4: Dynamic Scaling OFF (22°C/40% RH, Fixed 350 CFM/kW)
- **Expected:** Higher fan energy consumption
- **Result:** 997 CFM total airflow (2.7x over-airing)
- **Fan Energy:** 6,897 kWh/yr vs 2,941 kWh/yr (57% penalty)
- **Validation:** Dynamic scaling provides significant efficiency improvement

### 5.2 Performance Metrics Comparison

| Metric | Dynamic ON | Dynamic OFF | Improvement |
|--------|------------|-------------|-------------|
| **Airflow Efficiency** | 1.2x over-airing | 2.7x over-airing | **58% better** |
| **Fan Energy** | 2,941 kWh/yr | 6,897 kWh/yr | **57% reduction** |
| **Total Cooling Energy** | 7,124 kWh/yr | 11,079 kWh/yr | **36% reduction** |
| **CO2 Impact** | 2.8 tonnes/yr savings | 3.5 tonnes/yr savings | Climate dependent |

---

## 6. Technical Innovations

### 6.1 Component-Breakdown Energy Calculation
- **Challenge:** Traditional PUE calculations incorrectly include IT energy in cooling CO2 calculations
- **Solution:** Separate cooling-only energy tracking for accurate emission factors
- **Impact:** Mathematically consistent CO2 calculations

### 6.2 Thermal-Aware Airflow Scaling
- **Challenge:** Fixed CFM/kW ratios cause excessive over-airing (2.9x excess)
- **Solution:** Dynamic scaling based on actual server thermal requirements
- **Impact:** 53% fan energy reduction while maintaining cooling performance

### 6.3 Climate-Adaptive Operating Hours
- **Challenge:** Static economizer hours don't reflect realistic weather patterns
- **Solution:** Temperature-based mode distribution with realistic partial operation
- **Impact:** 22°C conditions produce balanced 50% partial mode operation

### 6.4 Size-Scaled Economic Analysis
- **Challenge:** Fixed CAPEX assumptions unrealistic for small systems
- **Solution:** Component-based scaling (IT load + airflow + fixed costs)
- **Impact:** Realistic $12.5k CAPEX for 3kW system vs $22k oversized assumption

---

## 7. Results Summary

### 7.1 Energy Performance by Climate

| Climate Condition | Temperature | Energy Reduction | Annual Savings | CO2 Reduction |
|-------------------|-------------|------------------|----------------|---------------|
| **Cold** | 8°C/40% RH | 65% | 8,628 kWh/yr | 3.9 tonnes/yr |
| **Mild** | 22°C/40% RH | 46% | 6,132 kWh/yr | 2.8 tonnes/yr |
| **Hot/Humid** | 30°C/80% RH | 27% | 3,635 kWh/yr | 1.6 tonnes/yr |

### 7.2 Economic Viability Analysis

| Climate | Annual Savings (USD) | CAPEX (USD) | Payback Period |
|---------|---------------------|-------------|----------------|
| **Cold** | $1,387 | $12,457 | **9.0 years** |
| **Mild** | $985 | $12,457 | **12.6 years** |
| **Hot/Humid** | $584 | $12,457 | **21.3 years** |

### 7.3 Environmental Impact

- **Grid Emission Factor:** 0.45 kg CO2/kWh (Pakistan grid)
- **Baseline Emissions:** 6.0 tonnes CO2/year
- **Optimized Emissions:** 2.1-4.3 tonnes CO2/year
- **Total Reduction:** 1.6-3.9 tonnes CO2/year

---

## 8. Implementation Details

### 8.1 System Parameters

#### Environmental Constraints
| Parameter | Value | Engineering Basis |
|-----------|-------|-------------------|
| **Lockout Enthalpy** | 55.0 kJ/kg | Industry standard for humid climates |
| **Supply Temperature** | 25.0°C | ASHRAE optimized setpoint |
| **Grid Emission Factor** | 0.45 kg CO2/kWh | Pakistan grid average |

#### Equipment Specifications
| Component | Efficiency | Rationale |
|-----------|------------|-----------|
| **Fan Efficiency** | 80% | Modern EC fan performance |
| **Filter Penalty** | 10% | MERV filter pressure drop |
| **Baseline COP** | 3.5 | Standard chiller efficiency |
| **Optimized COP** | 4.0 | Improved system efficiency |
| **Server Fan Power** | 18% of IT load | PUE definition compliance |

### 8.2 Software Architecture

#### Core Classes
- **App.java** - Main simulation controller with test parameter management
- **AirEconomizerModel.java** - Core economizer calculations and energy modeling
- **EconomizerInputs.java** - Input parameter definitions and validation
- **ThermalIntegrator.java** - Server thermal load calculations

#### Key Libraries
- **CloudSim Plus 8.0.0** - Discrete event simulation framework
- **Java Math Libraries** - Psychrometric calculations
- **Maven Build System** - Dependency management and compilation

---

## 9. Conclusions

### 9.1 Technical Achievements

The implementation successfully demonstrates:

1. **Accurate Thermal Modeling** - Integration with CloudSim Plus for realistic server thermal behavior
2. **Psychrometric Controls** - Enthalpy-based economizer lockout with weather adaptation
3. **Dynamic Optimization** - 57% fan energy reduction through intelligent airflow scaling
4. **Economic Realism** - Size-appropriate CAPEX scaling for viable small system deployments

### 9.2 Practical Impact

The system provides data center operators with:

- **Climate-Sensitive Design** - Optimal economizer configuration for different geographic locations
- **Efficiency Optimization** - Significant reduction in over-airing and fan energy waste  
- **Economic Guidance** - Realistic payback periods and investment scaling
- **Environmental Benefits** - Substantial CO2 reduction potential

### 9.3 Future Enhancements

Potential areas for expansion include:

- **Multi-Zone Modeling** - Extension to larger data center facilities
- **Real-Time Weather Integration** - Dynamic TMY3 weather data incorporation
- **Advanced Control Strategies** - Machine learning-based optimization
- **Humidity Control** - Integrated humidification/dehumidification modeling

---

## 10. References & Technical Standards

- **ASHRAE TC 9.9** - Data Center Thermal Management Guidelines
- **CloudSim Plus Documentation** - Simulation framework technical reference
- **ASHRAE Standard 90.1** - Energy efficiency standards
- **PUE Guidelines** - The Green Grid power usage effectiveness standards
- **Psychrometric Principles** - HVAC engineering fundamentals

---

**End of Report**

*This implementation represents a comprehensive approach to data center economizer optimization, combining theoretical thermal engineering principles with practical software simulation to achieve measurable energy and environmental benefits.*