package com.acme.chilledwatersystem;

/**
 * Step 3: Carbon Configuration for Sustainability Analysis
 * 
 * Tracks carbon emissions based on grid intensity and water treatment.
 */
public class CarbonConfig {
    // Grid carbon intensity (kg CO2 per kWh)
    private double gridCarbonFactorKgPerKwh;
    
    // Water-related carbon (kg CO2 per m³ for treatment and distribution)
    private double waterCarbonFactorKgPerM3;
    
    // Regional grid mix information
    private String gridRegion;
    private double renewablePercentage; // Percentage of renewable energy in grid
    
    // Carbon pricing (for future carbon tax scenarios)
    private double carbonPriceUSDPerTon;
    
    public CarbonConfig() {
        // Default values for typical US grid
        this.gridCarbonFactorKgPerKwh = 0.45; // US average
        this.waterCarbonFactorKgPerM3 = 0.35; // Water treatment/distribution
        this.gridRegion = "US-Average";
        this.renewablePercentage = 20.0; // 20% renewable
        this.carbonPriceUSDPerTon = 50.0; // $50/ton CO2
    }
    
    // Getters and Setters
    public double getGridCarbonFactorKgPerKwh() {
        return gridCarbonFactorKgPerKwh;
    }
    
    public void setGridCarbonFactorKgPerKwh(double gridCarbonFactorKgPerKwh) {
        this.gridCarbonFactorKgPerKwh = gridCarbonFactorKgPerKwh;
    }
    
    public double getWaterCarbonFactorKgPerM3() {
        return waterCarbonFactorKgPerM3;
    }
    
    public void setWaterCarbonFactorKgPerM3(double waterCarbonFactorKgPerM3) {
        this.waterCarbonFactorKgPerM3 = waterCarbonFactorKgPerM3;
    }
    
    public String getGridRegion() {
        return gridRegion;
    }
    
    public void setGridRegion(String gridRegion) {
        this.gridRegion = gridRegion;
    }
    
    public double getRenewablePercentage() {
        return renewablePercentage;
    }
    
    public void setRenewablePercentage(double renewablePercentage) {
        this.renewablePercentage = renewablePercentage;
    }
    
    public double getCarbonPriceUSDPerTon() {
        return carbonPriceUSDPerTon;
    }
    
    public void setCarbonPriceUSDPerTon(double carbonPriceUSDPerTon) {
        this.carbonPriceUSDPerTon = carbonPriceUSDPerTon;
    }
    
    /**
     * Calculate total carbon emissions from energy and water
     */
    public double calculateTotalCarbonKg(double energyKwh, double waterM3) {
        double energyCarbon = energyKwh * gridCarbonFactorKgPerKwh;
        double waterCarbon = waterM3 * waterCarbonFactorKgPerM3;
        return energyCarbon + waterCarbon;
    }
    
    /**
     * Calculate carbon cost based on carbon pricing
     */
    public double calculateCarbonCostUSD(double carbonKg) {
        double carbonTons = carbonKg / 1000.0;
        return carbonTons * carbonPriceUSDPerTon;
    }
    
    @Override
    public String toString() {
        return String.format(
            "CarbonConfig[Region=%s, Factor=%.3f kg/kWh, Renewable=%.1f%%, Price=$%.0f/ton]",
            gridRegion, gridCarbonFactorKgPerKwh, renewablePercentage, carbonPriceUSDPerTon
        );
    }
}
