package com.acme.chilledwatersystem;

import java.time.LocalDateTime;

/**
 * Phase 5 Part 5 - Section 5.1: Real-Time Telemetry Data
 * 
 * Represents live sensor data from Building Management Systems (BMS) and DCIM.
 * Supports integration via BACnet, SNMP, Modbus protocols.
 */
public class TelemetryData {
    
    private final LocalDateTime timestamp;
    
    // IT Load Telemetry
    private double actualITLoadKW;
    private double[] rackTemperaturesC; // Per-rack inlet temperatures
    private double[] rackPowerKW; // Per-rack power draw
    
    // Cooling System Telemetry
    private double chillerPowerKW;
    private double chillerCOP;
    private double chilledWaterSupplyTempC;
    private double chilledWaterReturnTempC;
    private double chilledWaterFlowRateLPS;
    private double condenserInletTempC;
    private double condenserOutletTempC;
    
    // Auxiliary Equipment
    private double pumpPowerKW;
    private double pumpFlowRateLPS;
    private double pumpPressureKPa;
    private double fanPowerKW;
    private double coolingTowerFanSpeedPercent;
    
    // Environmental
    private double ambientTempC;
    private double ambientHumidityPercent;
    private double wetBulbTempC;
    
    // Grid & Energy
    private double gridCarbonIntensityKgKWh;
    private double electricityRateUsdKWh;
    private double totalFacilityPowerKW;
    
    // Calculated Metrics
    private double measuredPUE;
    private double thermalMarginC; // Distance from ASHRAE limit
    
    public TelemetryData(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    /**
     * Validate telemetry data for anomalies
     */
    public ValidationResult validate() {
        ValidationResult result = new ValidationResult();
        result.isValid = true;
        
        // Check for sensor failures (out of range values)
        if (actualITLoadKW < 0 || actualITLoadKW > 1000) {
            result.isValid = false;
            result.errors.add("IT Load out of range: " + actualITLoadKW + " kW");
        }
        
        if (chilledWaterSupplyTempC < 0 || chilledWaterSupplyTempC > 20) {
            result.isValid = false;
            result.errors.add("Chilled water supply temp out of range: " + chilledWaterSupplyTempC + "°C");
        }
        
        if (chillerCOP < 0.5 || chillerCOP > 10.0) {
            result.isValid = false;
            result.errors.add("Chiller COP out of range: " + chillerCOP);
        }
        
        // Check for thermal violations
        if (rackTemperaturesC != null) {
            for (int i = 0; i < rackTemperaturesC.length; i++) {
                if (rackTemperaturesC[i] > 27.0) {
                    result.warnings.add(String.format("Rack %d exceeds ASHRAE limit: %.1f°C", i, rackTemperaturesC[i]));
                }
            }
        }
        
        // Check for efficiency degradation
        if (chillerCOP < 3.0) {
            result.warnings.add("Low chiller COP detected: " + String.format("%.2f", chillerCOP) + " - possible fouling");
        }
        
        return result;
    }
    
    /**
     * Calculate thermal margin to ASHRAE limits
     */
    public double calculateThermalMargin() {
        if (rackTemperaturesC == null || rackTemperaturesC.length == 0) {
            return 0.0;
        }
        
        double maxRackTemp = 0.0;
        for (double temp : rackTemperaturesC) {
            if (temp > maxRackTemp) {
                maxRackTemp = temp;
            }
        }
        
        // ASHRAE Recommended upper limit: 27°C
        return 27.0 - maxRackTemp;
    }
    
    /**
     * Calculate measured PUE from telemetry
     */
    public double calculateMeasuredPUE() {
        if (actualITLoadKW > 0) {
            return totalFacilityPowerKW / actualITLoadKW;
        }
        return 1.0;
    }
    
    // Getters and Setters
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public double getActualITLoadKW() {
        return actualITLoadKW;
    }
    
    public void setActualITLoadKW(double actualITLoadKW) {
        this.actualITLoadKW = actualITLoadKW;
    }
    
    public double[] getRackTemperaturesC() {
        return rackTemperaturesC;
    }
    
    public void setRackTemperaturesC(double[] rackTemperaturesC) {
        this.rackTemperaturesC = rackTemperaturesC;
        this.thermalMarginC = calculateThermalMargin();
    }
    
    public double[] getRackPowerKW() {
        return rackPowerKW;
    }
    
    public void setRackPowerKW(double[] rackPowerKW) {
        this.rackPowerKW = rackPowerKW;
    }
    
    public double getChillerPowerKW() {
        return chillerPowerKW;
    }
    
    public void setChillerPowerKW(double chillerPowerKW) {
        this.chillerPowerKW = chillerPowerKW;
    }
    
    public double getChillerCOP() {
        return chillerCOP;
    }
    
    public void setChillerCOP(double chillerCOP) {
        this.chillerCOP = chillerCOP;
    }
    
    public double getChilledWaterSupplyTempC() {
        return chilledWaterSupplyTempC;
    }
    
    public void setChilledWaterSupplyTempC(double chilledWaterSupplyTempC) {
        this.chilledWaterSupplyTempC = chilledWaterSupplyTempC;
    }
    
    public double getChilledWaterReturnTempC() {
        return chilledWaterReturnTempC;
    }
    
    public void setChilledWaterReturnTempC(double chilledWaterReturnTempC) {
        this.chilledWaterReturnTempC = chilledWaterReturnTempC;
    }
    
    public double getChilledWaterFlowRateLPS() {
        return chilledWaterFlowRateLPS;
    }
    
    public void setChilledWaterFlowRateLPS(double chilledWaterFlowRateLPS) {
        this.chilledWaterFlowRateLPS = chilledWaterFlowRateLPS;
    }
    
    public double getCondenserInletTempC() {
        return condenserInletTempC;
    }
    
    public void setCondenserInletTempC(double condenserInletTempC) {
        this.condenserInletTempC = condenserInletTempC;
    }
    
    public double getCondenserOutletTempC() {
        return condenserOutletTempC;
    }
    
    public void setCondenserOutletTempC(double condenserOutletTempC) {
        this.condenserOutletTempC = condenserOutletTempC;
    }
    
    public double getPumpPowerKW() {
        return pumpPowerKW;
    }
    
    public void setPumpPowerKW(double pumpPowerKW) {
        this.pumpPowerKW = pumpPowerKW;
    }
    
    public double getPumpFlowRateLPS() {
        return pumpFlowRateLPS;
    }
    
    public void setPumpFlowRateLPS(double pumpFlowRateLPS) {
        this.pumpFlowRateLPS = pumpFlowRateLPS;
    }
    
    public double getPumpPressureKPa() {
        return pumpPressureKPa;
    }
    
    public void setPumpPressureKPa(double pumpPressureKPa) {
        this.pumpPressureKPa = pumpPressureKPa;
    }
    
    public double getFanPowerKW() {
        return fanPowerKW;
    }
    
    public void setFanPowerKW(double fanPowerKW) {
        this.fanPowerKW = fanPowerKW;
    }
    
    public double getCoolingTowerFanSpeedPercent() {
        return coolingTowerFanSpeedPercent;
    }
    
    public void setCoolingTowerFanSpeedPercent(double coolingTowerFanSpeedPercent) {
        this.coolingTowerFanSpeedPercent = coolingTowerFanSpeedPercent;
    }
    
    public double getAmbientTempC() {
        return ambientTempC;
    }
    
    public void setAmbientTempC(double ambientTempC) {
        this.ambientTempC = ambientTempC;
    }
    
    public double getAmbientHumidityPercent() {
        return ambientHumidityPercent;
    }
    
    public void setAmbientHumidityPercent(double ambientHumidityPercent) {
        this.ambientHumidityPercent = ambientHumidityPercent;
    }
    
    public double getWetBulbTempC() {
        return wetBulbTempC;
    }
    
    public void setWetBulbTempC(double wetBulbTempC) {
        this.wetBulbTempC = wetBulbTempC;
    }
    
    public double getGridCarbonIntensityKgKWh() {
        return gridCarbonIntensityKgKWh;
    }
    
    public void setGridCarbonIntensityKgKWh(double gridCarbonIntensityKgKWh) {
        this.gridCarbonIntensityKgKWh = gridCarbonIntensityKgKWh;
    }
    
    public double getElectricityRateUsdKWh() {
        return electricityRateUsdKWh;
    }
    
    public void setElectricityRateUsdKWh(double electricityRateUsdKWh) {
        this.electricityRateUsdKWh = electricityRateUsdKWh;
    }
    
    public double getTotalFacilityPowerKW() {
        return totalFacilityPowerKW;
    }
    
    public void setTotalFacilityPowerKW(double totalFacilityPowerKW) {
        this.totalFacilityPowerKW = totalFacilityPowerKW;
        this.measuredPUE = calculateMeasuredPUE();
    }
    
    public double getMeasuredPUE() {
        return measuredPUE;
    }
    
    public double getThermalMarginC() {
        return thermalMarginC;
    }
    
    @Override
    public String toString() {
        return String.format(
            "Telemetry[%s | IT: %.1f kW | Chiller: %.1f kW (COP %.2f) | PUE: %.3f | Margin: %.1f°C]",
            timestamp, actualITLoadKW, chillerPowerKW, chillerCOP, measuredPUE, thermalMarginC
        );
    }
    
    /**
     * Inner class for validation results
     */
    public static class ValidationResult {
        public boolean isValid = true;
        public java.util.List<String> errors = new java.util.ArrayList<>();
        public java.util.List<String> warnings = new java.util.ArrayList<>();
        
        public boolean hasWarnings() {
            return !warnings.isEmpty();
        }
        
        public void printResults() {
            if (!isValid) {
                System.out.println("❌ VALIDATION FAILED:");
                for (String error : errors) {
                    System.out.println("  ERROR: " + error);
                }
            }
            
            if (hasWarnings()) {
                System.out.println("⚠️  WARNINGS:");
                for (String warning : warnings) {
                    System.out.println("  " + warning);
                }
            }
            
            if (isValid && !hasWarnings()) {
                System.out.println("✅ Telemetry validation passed");
            }
        }
    }
}
