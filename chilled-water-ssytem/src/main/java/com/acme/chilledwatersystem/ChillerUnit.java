package org.cloudbus.cloudsim.chilledwater;

public class ChillerUnit {
    private double baseCOP = 6.0;
    private double minCOP = 2.5;
    private double designMaxLoadKW = 500.0;
    private double powerKW;
    private double heatRejectedKW;
    private double lastCOP = 0.0;
    private final double refWetBulbC = 25.0;
    private final double wetBulbSensitivity = 0.02; // 2% COP change per °C from ref

    /**
     * Cool water to remove the IT load. The COP now drops at low part-load
     * instead of increasing. Economizer handling (skip compressor) should be
     * decided by the SmartController; this method only accepts a flag through
     * the wetBulb parameter being Double.NEGATIVE_INFINITY to indicate economizer.
     */
    public void coolWater(double loadKW, double wetBulb) {
        if (loadKW <= 0) {
            powerKW = 0.0;
            heatRejectedKW = 0.0;
            lastCOP = 0.0;
            return;
        }

        double plr = Math.max(0.1, Math.min(1.0, loadKW / designMaxLoadKW));

        // Temperature factor: wet-bulb deviation from reference increases/decreases COP
        double tempDelta = refWetBulbC - wetBulb; // colder wet-bulb -> positive
        double tempFactor = 1.0 + (wetBulbSensitivity * tempDelta);
        tempFactor = Math.max(0.7, Math.min(1.3, tempFactor));

        // PLR penalty: small decrease at low PLR
        double plrPenalty = 0.5 * (1.0 - plr);

        double cop = baseCOP * tempFactor - plrPenalty;
        if (cop < minCOP) cop = minCOP;

        powerKW = loadKW / cop;
        heatRejectedKW = loadKW + powerKW;
        lastCOP = cop;

        // Note: economizer/free-cooling should be handled by the controller: if
        // economizer is on, caller may set chiller power to 0 or route around this.
    }

    public double getPower() { return powerKW; }
    public double getHeatRejected() { return heatRejectedKW; }
    public double getLastCOP() { return lastCOP; }
}
