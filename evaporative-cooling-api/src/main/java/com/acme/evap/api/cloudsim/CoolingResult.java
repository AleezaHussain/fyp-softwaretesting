package com.acme.evap.api.cloudsim;

/**
 * PHASE 2: Cooling Result Data Class
 * 
 * Contains all calculated cooling performance parameters
 */
public class CoolingResult {
    
    public final double supplyTempC;           // Supply air temperature (°C)
    public final double supplyHumidityPercent; // Supply air humidity (%)
    public final double coolingCapacityKW;     // Cooling capacity (kW)
    public final double waterEvaporationLph;   // Water evaporation rate (L/h)
    public final double airflowCFM;            // Airflow rate (CFM)
    public final double actualEffectiveness;   // Actual saturation effectiveness (0-1)
    public final double wetBulbTempC;          // Wet bulb temperature (°C)
    
    /**
     * Constructor
     */
    public CoolingResult(double supplyTempC,
                        double supplyHumidityPercent,
                        double coolingCapacityKW,
                        double waterEvaporationLph,
                        double airflowCFM,
                        double actualEffectiveness,
                        double wetBulbTempC) {
        this.supplyTempC = supplyTempC;
        this.supplyHumidityPercent = supplyHumidityPercent;
        this.coolingCapacityKW = coolingCapacityKW;
        this.waterEvaporationLph = waterEvaporationLph;
        this.airflowCFM = airflowCFM;
        this.actualEffectiveness = actualEffectiveness;
        this.wetBulbTempC = wetBulbTempC;
    }
    
    /**
     * Get wet bulb depression (dry bulb - wet bulb)
     */
    public double getWetBulbDepressionC(double dryBulbTempC) {
        return dryBulbTempC - wetBulbTempC;
    }
    
    /**
     * Check if cooling is adequate for given heat load
     */
    public boolean isAdequateFor(double heatLoadKW) {
        return coolingCapacityKW >= heatLoadKW;
    }
    
    /**
     * Get cooling margin (capacity - load)
     */
    public double getCoolingMarginKW(double heatLoadKW) {
        return coolingCapacityKW - heatLoadKW;
    }
    
    /**
     * Get cooling utilization percentage
     */
    public double getCoolingUtilizationPercent(double heatLoadKW) {
        if (coolingCapacityKW <= 0) return 0.0;
        return Math.min(100.0, (heatLoadKW / coolingCapacityKW) * 100.0);
    }
    
    @Override
    public String toString() {
        return String.format(
            "CoolingResult[Supply=%.1f°C, RH=%.1f%%, Capacity=%.1fkW, Water=%.1fL/h, Airflow=%.0fCFM, Eff=%.1f%%]",
            supplyTempC, supplyHumidityPercent, coolingCapacityKW, 
            waterEvaporationLph, airflowCFM, actualEffectiveness * 100
        );
    }
}
