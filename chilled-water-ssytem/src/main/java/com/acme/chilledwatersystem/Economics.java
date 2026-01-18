package com.acme.chilledwatersystem;

/**
 * Tracks energy, cost, CO2 for cooling and can also track water cost if
 * desired.
 * Default grid CO2 factor ~0.45 kg/kWh. Default tariff $0.10/kWh.
 */
public class Economics {
    private double elecTariffUSDperKWh = 0.10;
    private double gridCO2kgPerKWh = 0.45;
    private double waterTariffUSDperM3 = 0.80; // example if you want to cost water

    private double coolKWh = 0.0;
    private double coolCostUSD = 0.0;
    private double coolCO2kg = 0.0;
    private double waterCostUSD = 0.0;

    public void addCoolingHour(double coolingPowerKW) {
        coolKWh += coolingPowerKW;
        coolCostUSD += coolingPowerKW * elecTariffUSDperKWh;
        coolCO2kg += coolingPowerKW * gridCO2kgPerKWh;
    }

    public void addWaterVolumeLiters(double liters) {
        double m3 = liters / 1000.0;
        waterCostUSD += m3 * waterTariffUSDperM3;
    }

    public double getCoolingEnergyKWh() {
        return coolKWh;
    }

    public double getCoolingCostUSD() {
        return coolCostUSD;
    }

    public double getCoolingCO2kg() {
        return coolCO2kg;
    }

    public double getWaterCostUSD() {
        return waterCostUSD;
    }

    // Tuners
    public void setElecTariffUSDperKWh(double v) {
        this.elecTariffUSDperKWh = v;
    }

    public void setGridCO2kgPerKWh(double v) {
        this.gridCO2kgPerKWh = v;
    }

    public void setWaterTariffUSDperM3(double v) {
        this.waterTariffUSDperM3 = v;
    }
}
