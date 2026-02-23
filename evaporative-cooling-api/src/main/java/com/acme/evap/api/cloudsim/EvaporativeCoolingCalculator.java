package com.acme.evap.api.cloudsim;

/**
 * PHASE 2: Evaporative Cooling Calculator
 * 
 * Performs psychrometric calculations for evaporative cooling:
 * - Supply temperature calculation
 * - Cooling capacity calculation
 * - Water evaporation rate
 * - Velocity-dependent effectiveness
 */
public class EvaporativeCoolingCalculator {
    
    // Physical constants
    private static final double AIR_DENSITY = 1.2;        // kg/m³
    private static final double SPECIFIC_HEAT = 1.006;    // kJ/(kg·K)
    private static final double LATENT_HEAT = 2260.0;     // kJ/kg
    private static final double CFM_TO_M3S = 0.000471947; // Conversion factor
    
    /**
     * Calculate evaporative cooling performance
     * 
     * @param dryBulbTempC Ambient dry bulb temperature (°C)
     * @param relativeHumidity Ambient relative humidity (%)
     * @param pressureKPa Atmospheric pressure (kPa)
     * @param heatLoadKW IT heat load (kW)
     * @param saturationEffectiveness Base saturation effectiveness (0-1)
     * @param maxAirflowCFM Maximum airflow capacity (CFM)
     * @param faceVelocityMs Face velocity through media (m/s)
     * @param cpuUtilization Current CPU utilization (0-1)
     * @return Cooling result with all calculated parameters
     */
    public CoolingResult calculateCooling(double dryBulbTempC,
                                         double relativeHumidity,
                                         double pressureKPa,
                                         double heatLoadKW,
                                         double saturationEffectiveness,
                                         double maxAirflowCFM,
                                         double faceVelocityMs,
                                         double cpuUtilization) {
        
        // Calculate wet bulb temperature
        double wetBulbTempC = calculateWetBulbTemp(dryBulbTempC, relativeHumidity);
        
        // PHASE 1: Velocity-dependent effectiveness
        // As airflow increases (higher utilization), face velocity increases
        // and effectiveness decreases due to reduced dwell time
        double currentFaceVelocity = faceVelocityMs * Math.sqrt(cpuUtilization);
        double referenceFaceVelocity = faceVelocityMs;
        
        double velocityAdjustmentFactor = 1.0;
        if (currentFaceVelocity > referenceFaceVelocity) {
            // 5% degradation per m/s above reference
            velocityAdjustmentFactor = 1.0 - 0.05 * (currentFaceVelocity - referenceFaceVelocity);
            velocityAdjustmentFactor = Math.max(0.5, velocityAdjustmentFactor);
        }
        
        double actualEffectiveness = saturationEffectiveness * velocityAdjustmentFactor;
        
        // Calculate supply temperature (Direct Evaporative Cooling)
        // T_supply = T_db - η × (T_db - T_wb)
        double supplyTempC = dryBulbTempC - actualEffectiveness * (dryBulbTempC - wetBulbTempC);
        
        // Calculate supply humidity (increases with evaporative cooling)
        double supplyHumidityPercent = Math.min(95.0, relativeHumidity + (actualEffectiveness * 25.0));
        
        // Calculate airflow (scales with utilization)
        double airflowCFM = maxAirflowCFM * Math.sqrt(cpuUtilization);
        double airflowM3s = airflowCFM * CFM_TO_M3S;
        
        // Calculate cooling capacity
        // Q = ṁ × Cp × ΔT where ṁ = ρ × V̇
        double tempDifferential = dryBulbTempC - supplyTempC;
        double coolingCapacityKW = airflowM3s * AIR_DENSITY * SPECIFIC_HEAT * tempDifferential;
        
        // Ensure minimum cooling capacity
        coolingCapacityKW = Math.max(coolingCapacityKW, heatLoadKW * 0.3);
        
        // Calculate water evaporation rate
        // Water evaporation (L/h) = (Cooling capacity × 3600) / Latent heat
        double waterEvaporationLph = (coolingCapacityKW * 3600.0) / LATENT_HEAT;
        
        // Account for cycles of concentration (blowdown)
        double cyclesOfConcentration = 7.0;  // Typical value
        double blowdownFraction = 1.0 / (cyclesOfConcentration - 1.0);
        waterEvaporationLph *= (1.0 + blowdownFraction);
        
        return new CoolingResult(
            supplyTempC,
            supplyHumidityPercent,
            coolingCapacityKW,
            waterEvaporationLph,
            airflowCFM,
            actualEffectiveness,
            wetBulbTempC
        );
    }
    
    /**
     * Calculate wet bulb temperature (simplified approximation)
     */
    private double calculateWetBulbTemp(double dryBulbC, double relativeHumidity) {
        return dryBulbC * Math.atan(0.151977 * Math.sqrt(relativeHumidity + 8.313659)) +
               Math.atan(dryBulbC + relativeHumidity) - 
               Math.atan(relativeHumidity - 1.676331) +
               0.00391838 * Math.pow(relativeHumidity, 1.5) * 
               Math.atan(0.023101 * relativeHumidity) - 4.686035;
    }
}
