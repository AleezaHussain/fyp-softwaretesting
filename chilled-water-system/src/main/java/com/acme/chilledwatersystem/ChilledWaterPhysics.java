package com.acme.chilledwatersystem;

/**
 * Step 2: Chilled Water Physics Engine
 * 
 * Implements the Electric Input Ratio (EIR) framework for chiller efficiency
 * calculations. This model accounts for:
 * - Variable outdoor conditions (ambient and wet-bulb temperature)
 * - Part-load performance degradation
 * - Equipment fouling and degradation over time
 * - Auxiliary equipment (pumps, cooling tower fans)
 */
public class ChilledWaterPhysics {
    private final EdgeDataCenterScenario scenario;
    
    // EIR Coefficients (from manufacturer data or DOE-2 curves)
    // EIR = (a + b*Tchw + c*Tchw²) * (d + e*Tcond + f*Tcond²)
    private double[] eirCoefficients;
    
    // Degradation tracking
    private double currentFoulingFactor; // 1.0 = clean, >1.0 = degraded
    private double totalOperatingHours;
    
    // Reference conditions
    private double referenceCOP;
    private double referenceLoadKW;
    
    public ChilledWaterPhysics(EdgeDataCenterScenario scenario) {
        this.scenario = scenario;
        this.eirCoefficients = scenario.getChillerPerformanceCoeffs();
        this.referenceCOP = scenario.getChillerReferenceCop();
        this.referenceLoadKW = scenario.getChillerReferenceLoadKW();
        this.currentFoulingFactor = 1.0; // Start with clean equipment
        this.totalOperatingHours = 0.0;
    }
    
    /**
     * Calculate chiller power consumption (Phase 2 Part 2 compatibility method)
     * Simplified version that returns just the chiller power
     */
    public double calculateChillerPower(double itLoadKW, double ambientTempC, double wetbulbTempC) {
        CoolingMetrics metrics = calculateCooling(itLoadKW, ambientTempC, wetbulbTempC);
        return metrics.chillerPowerKW;
    }
    
    /**
     * Calculate cooling power and metrics for one hour
     * This is the core physics calculation called by the orchestrator
     */
    public CoolingMetrics calculateCooling(double itLoadKW, double ambientTempC, double wetbulbTempC) {
        CoolingMetrics metrics = new CoolingMetrics();
        
        // 1. Calculate chiller load (heat that must be removed)
        double chillerLoadKW = itLoadKW; // IT load is the heat to be removed
        
        // 2. Calculate condenser temperature (cooling tower approach)
        double condenserApproachC = 5.0; // Typical cooling tower approach temperature
        double condenserTempC = ambientTempC + condenserApproachC;
        
        // 3. Calculate chiller COP using EIR framework
        double loadFraction = chillerLoadKW / referenceLoadKW;
        loadFraction = Math.max(0.1, Math.min(1.0, loadFraction)); // Clamp to 10-100%
        
        double chillerCOP = calculateChillerCOP(
            scenario.getChilledWaterSupplyTempC(),
            condenserTempC,
            loadFraction
        );
        
        // Apply fouling degradation
        chillerCOP = chillerCOP / currentFoulingFactor;
        
        // 4. Calculate chiller power consumption
        double chillerPowerKW = chillerLoadKW / chillerCOP;
        
        // 5. Calculate pump power (variable speed, cubic law)
        // Pump power scales with flow rate cubed
        double pumpPowerKW = scenario.getPumpPowerKw() * Math.pow(loadFraction, 3);
        
        // Apply fouling to pump (increased resistance)
        pumpPowerKW = pumpPowerKW * currentFoulingFactor;
        
        // 6. Calculate cooling tower fan power (variable speed)
        // Fan power also scales with cubic law
        double towerFanPowerKW = scenario.getCoolingTowerFanPowerKw() * Math.pow(loadFraction, 3);
        
        // Apply fouling to tower fans (clogged coils increase fan power)
        towerFanPowerKW = towerFanPowerKW * Math.pow(currentFoulingFactor, 1.5);
        
        // 7. Calculate rack inlet temperature
        // This is the temperature of air entering the server racks
        double supplyAirTempC = scenario.getChilledWaterSupplyTempC() + 3.0; // CRAH approach
        double rackInletTempC = supplyAirTempC + (loadFraction * 2.0); // Load-dependent rise
        
        // Populate metrics
        metrics.chillerPowerKW = chillerPowerKW;
        metrics.pumpPowerKW = pumpPowerKW;
        metrics.towerFanPowerKW = towerFanPowerKW;
        metrics.chillerCOP = chillerCOP;
        metrics.rackInletTempC = rackInletTempC;
        metrics.ambientTempC = ambientTempC;
        metrics.wetbulbTempC = wetbulbTempC;
        metrics.condenserTempC = condenserTempC;
        metrics.loadFraction = loadFraction;
        metrics.foulingFactor = currentFoulingFactor;
        
        return metrics;
    }
    
    /**
     * Calculate chiller COP using EIR (Energy Input Ratio) framework
     * Based on DOE-2 / EnergyPlus methodology
     * 
     * EIR = f(Tchw, Tcond) * f(PLR)
     * COP = COP_ref / EIR
     */
    private double calculateChillerCOP(double chilledWaterTempC, double condenserTempC, double loadFraction) {
        // EIR coefficients: a, b, c, d, e, f
        double a = eirCoefficients[0];
        double b = eirCoefficients[1];
        double c = eirCoefficients[2];
        double d = eirCoefficients[3];
        double e = eirCoefficients[4];
        double f = eirCoefficients[5];
        
        // Temperature-dependent EIR modifier
        double tchw = chilledWaterTempC;
        double tcond = condenserTempC;
        
        double eirChw = a + b * tchw + c * tchw * tchw;
        double eirCond = d + e * tcond + f * tcond * tcond;
        double eirTemp = eirChw * eirCond;
        
        // Part-load ratio (PLR) modifier
        // Chillers are less efficient at low loads
        double plrModifier = calculatePLRModifier(loadFraction);
        
        // Combined EIR
        double eir = eirTemp * plrModifier;
        
        // COP = Reference COP / EIR
        double cop = referenceCOP / eir;
        
        // Clamp to reasonable range (2.0 to 8.0)
        cop = Math.max(2.0, Math.min(cop, 8.0));
        
        return cop;
    }
    
    /**
     * Calculate part-load ratio modifier
     * Chillers typically have reduced efficiency at low loads
     */
    private double calculatePLRModifier(double loadFraction) {
        // Quadratic curve: efficiency drops at low loads
        // Based on typical chiller performance curves
        double a = 0.2;
        double b = 0.5;
        double c = 0.3;
        
        return a + b * loadFraction + c * loadFraction * loadFraction;
    }
    
    /**
     * Increment equipment fouling/degradation
     * Simulates coil fouling, filter clogging, and general wear
     * 
     * @param hours Number of operating hours to add
     */
    public void incrementFouling(double hours) {
        totalOperatingHours += hours;
        
        // Fouling increases power consumption by up to 30% over 10,000 hours
        // Linear degradation model: +8% per 1000 hours, max 30%
        double foulingIncrease = (totalOperatingHours / 1000.0) * 0.08;
        foulingIncrease = Math.min(foulingIncrease, 0.30); // Cap at 30%
        
        currentFoulingFactor = 1.0 + foulingIncrease;
    }
    
    /**
     * Reset fouling (simulates maintenance/cleaning)
     */
    public void performMaintenance() {
        currentFoulingFactor = 1.0;
        System.out.printf("Maintenance performed at hour %.0f - Equipment restored to clean condition\n", 
            totalOperatingHours);
    }
    
    /**
     * Reset all state (for new simulation run)
     */
    public void reset() {
        currentFoulingFactor = 1.0;
        totalOperatingHours = 0.0;
    }
    
    // Getters
    public double getCurrentFoulingFactor() {
        return currentFoulingFactor;
    }
    
    public double getTotalOperatingHours() {
        return totalOperatingHours;
    }
    
    /**
     * Inner class to hold cooling calculation results
     */
    public static class CoolingMetrics {
        public double chillerPowerKW;
        public double pumpPowerKW;
        public double towerFanPowerKW;
        public double chillerCOP;
        public double rackInletTempC;
        public double ambientTempC;
        public double wetbulbTempC;
        public double condenserTempC;
        public double loadFraction;
        public double foulingFactor;
        
        public double getTotalCoolingKW() {
            return chillerPowerKW + pumpPowerKW + towerFanPowerKW;
        }
        
        @Override
        public String toString() {
            return String.format(
                "Chiller: %.2f kW (COP=%.2f), Pump: %.2f kW, Tower: %.2f kW, Total: %.2f kW, Inlet: %.2f°C",
                chillerPowerKW, chillerCOP, pumpPowerKW, towerFanPowerKW, 
                getTotalCoolingKW(), rackInletTempC
            );
        }
    }
}
