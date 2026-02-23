package com.acme.chilledwatersystem;

/** Computes energy, cost, and CO₂ emission for the cooling system. */
public class CoolingMetrics {
    private final double electricityTariff;
    private final double co2Factor;

    private double totalEnergyKWh = 0;
    private double totalCostUSD = 0;
    private double totalCO2kg = 0;

    public CoolingMetrics(SimConfig cfg) {
        this.electricityTariff = cfg.getDouble("electricity.tariff", 0.10);
        this.co2Factor = cfg.getDouble("co2.factor", 0.45);
    }

    public void addHour(double powerKW) {
        totalEnergyKWh += powerKW; // 1-hour step
        totalCostUSD += powerKW * electricityTariff;
        totalCO2kg += powerKW * co2Factor;
    }

    public void report() {
        System.out.printf(
                "\n--- Cooling Summary ---\nEnergy Used: %.2f kWh\nCost: $%.2f\nCO₂: %.2f kg\n",
                totalEnergyKWh, totalCostUSD, totalCO2kg);
    }
}
