package com.acme.evap.api.service;

import java.util.ArrayList;
import java.util.List;

/**
 * Tracks simulation state across 8760 hours
 * Accumulates metrics for final results and cooling adequacy assessment
 */
public class SimulationState {
    
    private List<HourlyData> hourlyData = new ArrayList<>();
    
    // Cumulative totals
    private double totalElectricityKWh = 0.0;
    private double totalFanKWh = 0.0;
    private double totalDXKWh = 0.0;
    private double totalPumpKWh = 0.0;
    private double totalITKWh = 0.0;
    private double totalWaterLiters = 0.0;
    
    // Peak/extreme values for assessment
    private double maxInletTempC = 0.0;
    private double maxHumidity = 0.0;
    private double minWetBulbDepressionC = Double.MAX_VALUE;
    private double maxPUE = 0.0;
    
    // Violation counters
    private int temperatureViolations = 0;
    private int humidityViolations = 0;
    private int capacityViolations = 0;
    private List<Integer> criticalHours = new ArrayList<>();
    
    public void addHourlyData(int hour, EvaporativeCoolingService.WeatherPoint weather, 
                             double itLoadKW, double totalElectricalKW, double fanPowerKW,
                             double dxPowerKW, double pumpPowerKW, 
                             EvaporativeCoolingService.EvapCoolingResult evapResult,
                             double pue, double inletTempC, String coolingMode) {
        
        HourlyData data = new HourlyData();
        data.hour = hour;
        data.ambientTempC = weather.dryBulbTempC;
        data.ambientHumidity = weather.relativeHumidity;
        data.itLoadKW = itLoadKW;
        data.totalElectricalKW = totalElectricalKW;
        data.fanPowerKW = fanPowerKW;
        data.dxPowerKW = dxPowerKW;
        data.pumpPowerKW = pumpPowerKW;
        data.coolingCapacityKW = evapResult.coolingCapacityKW;
        data.waterEvaporationLph = evapResult.waterEvaporationLph;
        data.pue = pue;
        data.inletTempC = inletTempC;
        data.coolingMode = coolingMode;
        data.supplyTempC = evapResult.supplyTempC;
        data.supplyHumidity = evapResult.supplyHumidity;
        
        hourlyData.add(data);
        
        // Update cumulative totals
        totalElectricityKWh += totalElectricalKW;
        totalFanKWh += fanPowerKW;
        totalDXKWh += dxPowerKW;
        totalPumpKWh += pumpPowerKW;
        totalITKWh += itLoadKW;
        totalWaterLiters += evapResult.waterEvaporationLph;
        
        // Update peak values
        maxInletTempC = Math.max(maxInletTempC, inletTempC);
        maxHumidity = Math.max(maxHumidity, evapResult.supplyHumidity);
        maxPUE = Math.max(maxPUE, pue);
        
        // Calculate wet bulb depression
        double wetBulbTempC = calculateWetBulbTemp(weather.dryBulbTempC, weather.relativeHumidity);
        double wetBulbDepressionC = weather.dryBulbTempC - wetBulbTempC;
        minWetBulbDepressionC = Math.min(minWetBulbDepressionC, wetBulbDepressionC);
        
        // Check for violations
        boolean hasViolations = false;
        
        if (inletTempC > 27.0) { // ASHRAE limit
            temperatureViolations++;
            hasViolations = true;
        }
        
        if (evapResult.supplyHumidity > 80.0) {
            humidityViolations++;
            hasViolations = true;
        }
        
        if (evapResult.coolingCapacityKW < (itLoadKW * 1.1)) { // 10% margin
            capacityViolations++;
            hasViolations = true;
        }
        
        if (hasViolations) {
            criticalHours.add(hour);
        }
    }
    
    // Simplified wet bulb calculation
    private double calculateWetBulbTemp(double dryBulbC, double relativeHumidity) {
        return dryBulbC * Math.atan(0.151977 * Math.sqrt(relativeHumidity + 8.313659)) +
               Math.atan(dryBulbC + relativeHumidity) - Math.atan(relativeHumidity - 1.676331) +
               0.00391838 * Math.pow(relativeHumidity, 1.5) * Math.atan(0.023101 * relativeHumidity) - 4.686035;
    }
    
    // Getters for simulation results
    public double getTotalElectricityKWh() { return totalElectricityKWh; }
    public double getTotalFanKWh() { return totalFanKWh; }
    public double getTotalDXKWh() { return totalDXKWh; }
    public double getTotalPumpKWh() { return totalPumpKWh; }
    public double getTotalITKWh() { return totalITKWh; }
    public double getTotalAuxiliaryKWh() { return totalFanKWh + totalPumpKWh; }
    public double getTotalWaterLiters() { return totalWaterLiters; }
    public double getTotalEvaporationLiters() { return totalWaterLiters * 0.8; } // Simplified
    public double getTotalBlowdownLiters() { return totalWaterLiters * 0.15; } // Simplified
    public double getTotalMakeupLiters() { return totalWaterLiters; }
    
    public double getMaxInletTempC() { return maxInletTempC; }
    public double getMaxHumidity() { return maxHumidity; }
    public double getMinWetBulbDepressionC() { return minWetBulbDepressionC; }
    public double getMaxPUE() { return maxPUE; }
    
    public double getAveragePUE() {
        return hourlyData.stream().mapToDouble(d -> d.pue).average().orElse(1.0);
    }
    
    public double getAverageCoolingCapacityKW() {
        return hourlyData.stream().mapToDouble(d -> d.coolingCapacityKW).average().orElse(0.0);
    }
    
    public double getAverageHeatLoadKW() {
        return hourlyData.stream().mapToDouble(d -> d.itLoadKW * 1.1).average().orElse(0.0); // IT + losses
    }
    
    public double getAverageAmbientTempC() {
        return hourlyData.stream().mapToDouble(d -> d.ambientTempC).average().orElse(25.0);
    }
    
    public String getPrimaryCoolingMode() {
        // Return most common cooling mode
        return hourlyData.stream()
            .collect(java.util.stream.Collectors.groupingBy(d -> d.coolingMode, 
                     java.util.stream.Collectors.counting()))
            .entrySet().stream()
            .max(java.util.Map.Entry.comparingByValue())
            .map(java.util.Map.Entry::getKey)
            .orElse("DEC");
    }
    
    public double getAvailabilityPercent() {
        long availableHours = hourlyData.stream()
            .filter(d -> d.inletTempC <= 27.0 && d.coolingCapacityKW >= d.itLoadKW)
            .count();
        return (double) availableHours / hourlyData.size() * 100.0;
    }
    
    public int getCoolingFailureHours() {
        return (int) hourlyData.stream()
            .filter(d -> d.coolingCapacityKW < d.itLoadKW)
            .count();
    }
    
    public int getTemperatureViolations() { return temperatureViolations; }
    public int getHumidityViolations() { return humidityViolations; }
    public int getCapacityViolations() { return capacityViolations; }
    public List<Integer> getCriticalHours() { return criticalHours; }
    
    private static class HourlyData {
        int hour;
        double ambientTempC;
        double ambientHumidity;
        double itLoadKW;
        double totalElectricalKW;
        double fanPowerKW;
        double dxPowerKW;
        double pumpPowerKW;
        double coolingCapacityKW;
        double waterEvaporationLph;
        double pue;
        double inletTempC;
        String coolingMode;
        double supplyTempC;
        double supplyHumidity;
    }
}