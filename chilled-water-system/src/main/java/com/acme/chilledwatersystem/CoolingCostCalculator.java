package com.acme.chilledwatersystem;

/**
 * Step 1.3: The Cost & Efficiency Controller (CoolingCostCalculator)
 * 
 * Implements the Electric Input Ratio (EIR) framework for chiller efficiency
 * and calculates cooling energy costs based on numerical inputs.
 */
public class CoolingCostCalculator {
    private final EdgeDataCenterScenario scenario;
    
    // Accumulated metrics
    private double totalCoolingEnergyKWh;
    private double totalCoolingCostUSD;
    private double totalCarbonKg;
    private double totalWaterCostUSD;
    private double peakDemandKW;
    
    public CoolingCostCalculator(EdgeDataCenterScenario scenario) {
        this.scenario = scenario;
        this.totalCoolingEnergyKWh = 0.0;
        this.totalCoolingCostUSD = 0.0;
        this.totalCarbonKg = 0.0;
        this.totalWaterCostUSD = 0.0;
        this.peakDemandKW = 0.0;
    }

    /**
     * Calculate chiller COP using EIR (Energy Input Ratio) framework
     * EIR = (a + b*Tchw + c*Tchw²) * (d + e*Tcond + f*Tcond²)
     * COP = 1 / EIR
     * 
     * @param chilledWaterTempC Chilled water supply temperature
     * @param condenserTempC Condenser temperature (typically ambient + 5°C)
     * @param loadFraction Fraction of design load (0.0 to 1.0)
     * @return Chiller COP
     */
    public double calculateChillerCOP(double chilledWaterTempC, double condenserTempC, double loadFraction) {
        double[] coeffs = scenario.getChillerPerformanceCoeffs();
        
        // EIR curve coefficients
        double a = coeffs[0];
        double b = coeffs[1];
        double c = coeffs[2];
        double d = coeffs[3];
        double e = coeffs[4];
        double f = coeffs[5];
        
        // Calculate EIR
        double tchw = chilledWaterTempC;
        double tcond = condenserTempC;
        
        double eirChw = a + b * tchw + c * tchw * tchw;
        double eirCond = d + e * tcond + f * tcond * tcond;
        double eir = eirChw * eirCond;
        
        // Part-load adjustment (chillers are less efficient at low loads)
        double partLoadFactor = 0.2 + 0.8 * loadFraction; // Simple linear model
        eir = eir / partLoadFactor;
        
        // COP = 1 / EIR
        double cop = 1.0 / eir;
        
        // Clamp to reasonable range
        cop = Math.max(2.0, Math.min(cop, 8.0));
        
        return cop;
    }

    /**
     * Calculate hourly cooling cost
     * 
     * @param itLoadKW IT load that must be cooled
     * @param ambientTempC Ambient temperature
     * @param wetbulbTempC Wet bulb temperature
     * @return HourlyCoolingResult with detailed breakdown
     */
    public HourlyCoolingResult calculateHourlyCost(double itLoadKW, double ambientTempC, double wetbulbTempC) {
        HourlyCoolingResult result = new HourlyCoolingResult();
        
        // 1. Calculate chiller load (IT load + UPS/PDU losses that must be cooled)
        double chillerLoadKW = itLoadKW; // Already includes UPS/PDU losses from EdgeInfraManager
        
        // 2. Calculate condenser temperature (ambient + approach temperature)
        double condenserApproachC = 5.0; // Cooling tower approach
        double condenserTempC = ambientTempC + condenserApproachC;
        
        // 3. Calculate chiller COP
        double loadFraction = chillerLoadKW / scenario.getChillerReferenceLoadKW();
        loadFraction = Math.min(1.0, Math.max(0.1, loadFraction)); // Clamp to 10-100%
        
        double chillerCOP = calculateChillerCOP(
            scenario.getChilledWaterSupplyTempC(),
            condenserTempC,
            loadFraction
        );
        
        // 4. Calculate chiller power consumption
        double chillerPowerKW = chillerLoadKW / chillerCOP;
        
        // 5. Calculate auxiliary equipment power
        double pumpPowerKW = scenario.getPumpPowerKw() * loadFraction; // Variable speed pumps
        double towerFanPowerKW = scenario.getCoolingTowerFanPowerKw() * loadFraction; // Variable speed fans
        
        // 6. Total cooling power
        double totalCoolingPowerKW = chillerPowerKW + pumpPowerKW + towerFanPowerKW;
        
        // 7. Calculate hourly energy (1-hour timestep)
        double timestep = scenario.getTimestepHours();
        double coolingEnergyKWh = totalCoolingPowerKW * timestep;
        
        // 8. Calculate cost
        double hourlyCostUSD = coolingEnergyKWh * scenario.getElectricityRateUsdKwh();
        
        // 9. Calculate carbon emissions
        double hourlyCarbonKg = coolingEnergyKWh * scenario.getCarbonFactorKgKwh();
        
        // 10. Update peak demand
        if (totalCoolingPowerKW > peakDemandKW) {
            peakDemandKW = totalCoolingPowerKW;
        }
        
        // 11. Accumulate totals
        totalCoolingEnergyKWh += coolingEnergyKWh;
        totalCoolingCostUSD += hourlyCostUSD;
        totalCarbonKg += hourlyCarbonKg;
        
        // 12. Populate result
        result.itLoadKW = itLoadKW;
        result.chillerLoadKW = chillerLoadKW;
        result.chillerPowerKW = chillerPowerKW;
        result.chillerCOP = chillerCOP;
        result.pumpPowerKW = pumpPowerKW;
        result.towerFanPowerKW = towerFanPowerKW;
        result.totalCoolingPowerKW = totalCoolingPowerKW;
        result.coolingEnergyKWh = coolingEnergyKWh;
        result.hourlyCostUSD = hourlyCostUSD;
        result.hourlyCarbonKg = hourlyCarbonKg;
        result.ambientTempC = ambientTempC;
        result.wetbulbTempC = wetbulbTempC;
        result.condenserTempC = condenserTempC;
        
        return result;
    }

    /**
     * Calculate total facility PUE (Power Usage Effectiveness)
     */
    public double calculatePUE(double itLoadKW, double coolingPowerKW) {
        if (itLoadKW <= 0) {
            return 1.0;
        }
        
        double totalFacilityPowerKW = itLoadKW + coolingPowerKW;
        return totalFacilityPowerKW / itLoadKW;
    }

    /**
     * Calculate demand charge based on peak demand
     */
    public double calculateDemandCharge() {
        return peakDemandKW * scenario.getDemandChargeUsdKw();
    }

    /**
     * Get total cost including energy and demand charges
     */
    public double getTotalCostUSD() {
        return totalCoolingCostUSD + calculateDemandCharge() + totalWaterCostUSD;
    }

    /**
     * Add water consumption cost
     */
    public void addWaterCost(double waterM3) {
        totalWaterCostUSD += waterM3 * scenario.getWaterCostUsdPerM3();
    }

    /**
     * Print summary report
     */
    public void printSummary() {
        System.out.println("\n=== Cooling Cost Summary ===");
        System.out.printf("Total Cooling Energy: %.2f kWh\n", totalCoolingEnergyKWh);
        System.out.printf("Energy Cost: $%.2f\n", totalCoolingCostUSD);
        System.out.printf("Peak Demand: %.2f kW\n", peakDemandKW);
        System.out.printf("Demand Charge: $%.2f\n", calculateDemandCharge());
        System.out.printf("Water Cost: $%.2f\n", totalWaterCostUSD);
        System.out.printf("Total Cost: $%.2f\n", getTotalCostUSD());
        System.out.printf("Total Carbon: %.2f kg CO2\n", totalCarbonKg);
        System.out.println("============================\n");
    }

    /**
     * Reset all accumulated metrics
     */
    public void reset() {
        totalCoolingEnergyKWh = 0.0;
        totalCoolingCostUSD = 0.0;
        totalCarbonKg = 0.0;
        totalWaterCostUSD = 0.0;
        peakDemandKW = 0.0;
    }

    // Getters
    public double getTotalCoolingEnergyKWh() {
        return totalCoolingEnergyKWh;
    }

    public double getTotalCoolingCostUSD() {
        return totalCoolingCostUSD;
    }

    public double getTotalCarbonKg() {
        return totalCarbonKg;
    }

    public double getTotalWaterCostUSD() {
        return totalWaterCostUSD;
    }

    public double getPeakDemandKW() {
        return peakDemandKW;
    }

    /**
     * Inner class to hold hourly cooling calculation results
     */
    public static class HourlyCoolingResult {
        public double itLoadKW;
        public double chillerLoadKW;
        public double chillerPowerKW;
        public double chillerCOP;
        public double pumpPowerKW;
        public double towerFanPowerKW;
        public double totalCoolingPowerKW;
        public double coolingEnergyKWh;
        public double hourlyCostUSD;
        public double hourlyCarbonKg;
        public double ambientTempC;
        public double wetbulbTempC;
        public double condenserTempC;

        @Override
        public String toString() {
            return String.format(
                "IT=%.1f kW, Chiller=%.1f kW (COP=%.2f), Pump=%.1f kW, Tower=%.1f kW, Total=%.1f kW, Cost=$%.2f",
                itLoadKW, chillerPowerKW, chillerCOP, pumpPowerKW, towerFanPowerKW, 
                totalCoolingPowerKW, hourlyCostUSD
            );
        }
    }
}
