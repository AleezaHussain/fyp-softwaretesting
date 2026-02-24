package com.acme.chilledwatersystem;

/**
 * Phase 2 Part 2: Hourly Simulation Result
 * 
 * Captures all metrics for a single hour of the 8760-hour simulation.
 * Provides detailed breakdown of IT load, cooling power, costs, and compliance.
 */
public class HourlyResult {
    
    private final int hour;
    private final double itLoadKw;
    private final double chillerPowerKw;
    private final double fanPowerKw;
    private final double pumpPowerKw;
    private final double totalCoolingKw;
    private final double totalFacilityKw;
    private final double pue;
    private final double hourlyCostUsd;
    private final double rackInletTempC;
    private final double ambientTempC;
    private final double wetBulbTempC;
    private final boolean thermalCompliance;
    private final String tariffPeriod; // "PEAK", "OFF_PEAK", "PARTIAL_PEAK"
    private final double carbonKg;
    
    public HourlyResult(int hour, double itLoadKw, double chillerPowerKw, 
                       double fanPowerKw, double pumpPowerKw, double hourlyCostUsd,
                       double rackInletTempC, double ambientTempC, double wetBulbTempC,
                       String tariffPeriod, double carbonKg) {
        this.hour = hour;
        this.itLoadKw = itLoadKw;
        this.chillerPowerKw = chillerPowerKw;
        this.fanPowerKw = fanPowerKw;
        this.pumpPowerKw = pumpPowerKw;
        this.totalCoolingKw = chillerPowerKw + fanPowerKw + pumpPowerKw;
        
        // Add fixed edge overhead (7.2 kW for lighting, controls, UPS losses)
        double edgeOverheadKw = 7.2;
        this.totalFacilityKw = itLoadKw + totalCoolingKw + edgeOverheadKw;
        
        // Calculate PUE
        this.pue = (itLoadKw > 0) ? (totalFacilityKw / itLoadKw) : 1.0;
        
        this.hourlyCostUsd = hourlyCostUsd;
        this.rackInletTempC = rackInletTempC;
        this.ambientTempC = ambientTempC;
        this.wetBulbTempC = wetBulbTempC;
        this.tariffPeriod = tariffPeriod;
        this.carbonKg = carbonKg;
        
        // ASHRAE Recommended: 18-27°C rack inlet
        this.thermalCompliance = (rackInletTempC >= 18.0 && rackInletTempC <= 27.0);
    }
    
    // Getters
    public int getHour() {
        return hour;
    }
    
    public double getItLoadKw() {
        return itLoadKw;
    }
    
    public double getChillerPowerKw() {
        return chillerPowerKw;
    }
    
    public double getFanPowerKw() {
        return fanPowerKw;
    }
    
    public double getPumpPowerKw() {
        return pumpPowerKw;
    }
    
    public double getTotalCoolingKw() {
        return totalCoolingKw;
    }
    
    public double getTotalFacilityKw() {
        return totalFacilityKw;
    }
    
    public double getPue() {
        return pue;
    }
    
    public double getHourlyCostUsd() {
        return hourlyCostUsd;
    }
    
    public double getRackInletTempC() {
        return rackInletTempC;
    }
    
    public double getAmbientTempC() {
        return ambientTempC;
    }
    
    public double getWetBulbTempC() {
        return wetBulbTempC;
    }
    
    public boolean isThermalCompliance() {
        return thermalCompliance;
    }
    
    public String getTariffPeriod() {
        return tariffPeriod;
    }
    
    public double getCarbonKg() {
        return carbonKg;
    }
    
    @Override
    public String toString() {
        return String.format(
            "Hour %d | IT: %.1f kW | Cooling: %.1f kW | PUE: %.2f | Cost: $%.2f | Temp: %.1f°C | %s",
            hour, itLoadKw, totalCoolingKw, pue, hourlyCostUsd, rackInletTempC, 
            thermalCompliance ? "✓" : "✗ EXCURSION"
        );
    }
}
