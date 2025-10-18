package org.cloudbus.cloudsim.chilledwater;

/**
 * Dynamically calculates tower water use and cost based on real-time conditions.
 */
public class WaterConsumption {

    // Default values (tunable)
    private final double baseEvapLperKWh = 0.90;         // L/kWh at 25°C
    private final double refWetBulbC = 25.0;              // reference temperature
    private final double tempSensitivity = 0.02;          // +2% per °C above ref
    private double blowdownMultiplier = 1.15;             // total water = evap × this
    private double waterTariffUSDPerM3 = 1.20;            // dollars per cubic meter

    // Accumulators
    private double totalWaterL = 0.0;
    private double totalITkWh = 0.0;
    private double totalCostUSD = 0.0;

    /**
     * Add an hour of water use based on heat rejected and ambient conditions.
     * @param heatRejectedKW  total heat rejected this hour (≈ cooling load + chiller loss)
     * @param ITkWhr          IT energy (kWh) this hour
     * @param wetBulbC        hourly wet-bulb temperature
     */
    public void addHour(double heatRejectedKW, double ITkWhr, double wetBulbC) {
        double delta = wetBulbC - refWetBulbC;
        double adjustedEvapRate = baseEvapLperKWh * (1.0 + tempSensitivity * delta);
        adjustedEvapRate = Math.max(0.6, Math.min(1.5, adjustedEvapRate));

        double evapL = adjustedEvapRate * heatRejectedKW;
        double totalThisHourL = evapL * blowdownMultiplier;

        totalWaterL += totalThisHourL;
        totalITkWh += ITkWhr;
        totalCostUSD += (totalThisHourL / 1000.0) * waterTariffUSDPerM3; // convert to m³
    }

    public double getWUE() {
        if (totalITkWh <= 0.0) return 0.0;
        return totalWaterL / totalITkWh;
    }

    public double getTotalWaterL() {
        return totalWaterL;
    }

    public double getTotalWaterCostUSD() {
        return totalCostUSD;
    }

    public void setBlowdownMultiplier(double v) {
        this.blowdownMultiplier = v;
    }

    public void setWaterTariffUSDPerM3(double tariff) {
        this.waterTariffUSDPerM3 = tariff;
    }
}
