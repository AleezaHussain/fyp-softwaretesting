package com.acme.chilledwatersystem;

/**
 * Step 1: Data Ingestion & Physical Boundary Configuration
 * 
 * This POJO holds all numerical inputs for an Edge Data Center simulation.
 * Engineers can enter precise values from manufacturer datasheets.
 */
public class EdgeDataCenterScenario {
    // 1. Site Weather & Location
    private String weatherDataFile; // Path to 8760-hour EPW file
    private double elevationMeters; // Impact on air density and fan power
    private String location = "Unknown"; // Site location name
    private double designAmbientC = 35.0; // Design ambient temperature
    private double designWetBulbC = 24.0; // Design wet-bulb temperature

    // 2. Numerical Thermal Boundaries (ASHRAE Recommended)
    private double maxInletTempC = 27.0; // ASHRAE Recommended upper bound
    private double minInletTempC = 18.0; // ASHRAE Recommended lower bound
    private double maxDewPointC = 15.0; // Critical for condensation safety
    private double maxRelativeHumidity = 60.0; // Maximum RH percentage
    private double minRelativeHumidity = 20.0; // Minimum RH percentage (static discharge)

    // 3. Infrastructure & Workload (CloudSim Mapping)
    private int totalRacks;
    private int serversPerRack;
    private double serverMaxPowerW = 500.0; // For CloudSim PowerModelHost
    private double serverIdlePowerW = 200.0;
    private double serverFanPowerW = 25.0; // Internal server fan energy
    private double upsLossFraction = 0.09; // Fixed 9% overhead
    private double pduLossFraction = 0.02; // PDU losses (2%)

    // 4. Chilled Water Specs (EIR Framework)
    private double chillerReferenceCop = 6.0; // Baseline efficiency
    private double chillerReferenceLoadKW = 100.0; // Reference load for COP
    private double chillerReferenceTempC = 25.0; // Reference outdoor temp
    // EIR coefficients: a, b, c, d, e, f
    // EIR = (a + b*Tchw + c*Tchw²) * (d + e*Tcond + f*Tcond²)
    private double[] chillerPerformanceCoeffs = {0.74, 0.008, -0.001, 0.024, -0.001, 0.002};
    private double coolingTowerFanPowerKw = 5.0; // Heat rejection overhead
    private double pumpPowerKw = 3.0; // Chilled water pump power

    // 5. Water Loop Configuration
    private double chilledWaterSupplyTempC = 7.0; // Supply temperature
    private double chilledWaterReturnTempC = 17.0; // Return temperature (ΔT = 10°C)
    private double designFlowRateLps = 50.0; // Liters per second

    // 6. Cost & Carbon Factors
    private double electricityRateUsdKwh = 0.12;
    private double demandChargeUsdKw = 15.00; // Peak kW penalty
    private double carbonFactorKgKwh = 0.45; // Local grid intensity
    private double waterCostUsdPerM3 = 0.80; // Water cost

    // 7. Simulation Parameters
    private int simulationHours = 8760; // Full year by default
    private double timestepHours = 1.0; // Hourly timestep

    // Constructors
    public EdgeDataCenterScenario() {
        // Default constructor with typical values
    }

    public EdgeDataCenterScenario(int totalRacks, int serversPerRack) {
        this.totalRacks = totalRacks;
        this.serversPerRack = serversPerRack;
    }

    // Getters and Setters
    public String getWeatherDataFile() {
        return weatherDataFile;
    }

    public void setWeatherDataFile(String weatherDataFile) {
        this.weatherDataFile = weatherDataFile;
    }

    public double getElevationMeters() {
        return elevationMeters;
    }

    public void setElevationMeters(double elevationMeters) {
        this.elevationMeters = elevationMeters;
    }
    
    public String getLocation() {
        return location;
    }
    
    public void setLocation(String location) {
        this.location = location;
    }
    
    public double getDesignAmbientC() {
        return designAmbientC;
    }
    
    public void setDesignAmbientC(double designAmbientC) {
        this.designAmbientC = designAmbientC;
    }
    
    public double getDesignWetBulbC() {
        return designWetBulbC;
    }
    
    public void setDesignWetBulbC(double designWetBulbC) {
        this.designWetBulbC = designWetBulbC;
    }

    public double getMaxInletTempC() {
        return maxInletTempC;
    }

    public void setMaxInletTempC(double maxInletTempC) {
        this.maxInletTempC = maxInletTempC;
    }

    public double getMinInletTempC() {
        return minInletTempC;
    }

    public void setMinInletTempC(double minInletTempC) {
        this.minInletTempC = minInletTempC;
    }

    public double getMaxDewPointC() {
        return maxDewPointC;
    }

    public void setMaxDewPointC(double maxDewPointC) {
        this.maxDewPointC = maxDewPointC;
    }

    public double getMaxRelativeHumidity() {
        return maxRelativeHumidity;
    }

    public void setMaxRelativeHumidity(double maxRelativeHumidity) {
        this.maxRelativeHumidity = maxRelativeHumidity;
    }

    public double getMinRelativeHumidity() {
        return minRelativeHumidity;
    }

    public void setMinRelativeHumidity(double minRelativeHumidity) {
        this.minRelativeHumidity = minRelativeHumidity;
    }

    public int getTotalRacks() {
        return totalRacks;
    }

    public void setTotalRacks(int totalRacks) {
        this.totalRacks = totalRacks;
    }

    public int getServersPerRack() {
        return serversPerRack;
    }

    public void setServersPerRack(int serversPerRack) {
        this.serversPerRack = serversPerRack;
    }

    public double getServerMaxPowerW() {
        return serverMaxPowerW;
    }

    public void setServerMaxPowerW(double serverMaxPowerW) {
        this.serverMaxPowerW = serverMaxPowerW;
    }

    public double getServerIdlePowerW() {
        return serverIdlePowerW;
    }

    public void setServerIdlePowerW(double serverIdlePowerW) {
        this.serverIdlePowerW = serverIdlePowerW;
    }

    public double getServerFanPowerW() {
        return serverFanPowerW;
    }

    public void setServerFanPowerW(double serverFanPowerW) {
        this.serverFanPowerW = serverFanPowerW;
    }

    public double getUpsLossFraction() {
        return upsLossFraction;
    }

    public void setUpsLossFraction(double upsLossFraction) {
        this.upsLossFraction = upsLossFraction;
    }

    public double getPduLossFraction() {
        return pduLossFraction;
    }

    public void setPduLossFraction(double pduLossFraction) {
        this.pduLossFraction = pduLossFraction;
    }

    public double getChillerReferenceCop() {
        return chillerReferenceCop;
    }

    public void setChillerReferenceCop(double chillerReferenceCop) {
        this.chillerReferenceCop = chillerReferenceCop;
    }

    public double getChillerReferenceLoadKW() {
        return chillerReferenceLoadKW;
    }

    public void setChillerReferenceLoadKW(double chillerReferenceLoadKW) {
        this.chillerReferenceLoadKW = chillerReferenceLoadKW;
    }

    public double getChillerReferenceTempC() {
        return chillerReferenceTempC;
    }

    public void setChillerReferenceTempC(double chillerReferenceTempC) {
        this.chillerReferenceTempC = chillerReferenceTempC;
    }

    public double[] getChillerPerformanceCoeffs() {
        return chillerPerformanceCoeffs;
    }

    public void setChillerPerformanceCoeffs(double[] chillerPerformanceCoeffs) {
        this.chillerPerformanceCoeffs = chillerPerformanceCoeffs;
    }

    public double getCoolingTowerFanPowerKw() {
        return coolingTowerFanPowerKw;
    }

    public void setCoolingTowerFanPowerKw(double coolingTowerFanPowerKw) {
        this.coolingTowerFanPowerKw = coolingTowerFanPowerKw;
    }

    public double getPumpPowerKw() {
        return pumpPowerKw;
    }

    public void setPumpPowerKw(double pumpPowerKw) {
        this.pumpPowerKw = pumpPowerKw;
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

    public double getDesignFlowRateLps() {
        return designFlowRateLps;
    }

    public void setDesignFlowRateLps(double designFlowRateLps) {
        this.designFlowRateLps = designFlowRateLps;
    }

    public double getElectricityRateUsdKwh() {
        return electricityRateUsdKwh;
    }

    public void setElectricityRateUsdKwh(double electricityRateUsdKwh) {
        this.electricityRateUsdKwh = electricityRateUsdKwh;
    }

    public double getDemandChargeUsdKw() {
        return demandChargeUsdKw;
    }

    public void setDemandChargeUsdKw(double demandChargeUsdKw) {
        this.demandChargeUsdKw = demandChargeUsdKw;
    }

    public double getCarbonFactorKgKwh() {
        return carbonFactorKgKwh;
    }

    public void setCarbonFactorKgKwh(double carbonFactorKgKwh) {
        this.carbonFactorKgKwh = carbonFactorKgKwh;
    }

    public double getWaterCostUsdPerM3() {
        return waterCostUsdPerM3;
    }

    public void setWaterCostUsdPerM3(double waterCostUsdPerM3) {
        this.waterCostUsdPerM3 = waterCostUsdPerM3;
    }

    public int getSimulationHours() {
        return simulationHours;
    }

    public void setSimulationHours(int simulationHours) {
        this.simulationHours = simulationHours;
    }

    public double getTimestepHours() {
        return timestepHours;
    }

    public void setTimestepHours(double timestepHours) {
        this.timestepHours = timestepHours;
    }

    // Helper methods
    public int getTotalServers() {
        return totalRacks * serversPerRack;
    }

    public double getTotalDesignPowerKW() {
        return getTotalServers() * serverMaxPowerW / 1000.0;
    }

    public double getWaterLoopDeltaT() {
        return chilledWaterReturnTempC - chilledWaterSupplyTempC;
    }

    /**
     * Check if ambient conditions are within safe operating boundaries
     */
    public boolean isWithinThermalBoundaries(double ambientTempC, double dewPointC) {
        return ambientTempC >= minInletTempC && 
               ambientTempC <= maxInletTempC && 
               dewPointC <= maxDewPointC;
    }

    @Override
    public String toString() {
        return String.format(
            "EdgeDataCenterScenario[Racks=%d, Servers/Rack=%d, TotalPower=%.2f kW, TempRange=%.1f-%.1f°C]",
            totalRacks, serversPerRack, getTotalDesignPowerKW(), minInletTempC, maxInletTempC
        );
    }
}
