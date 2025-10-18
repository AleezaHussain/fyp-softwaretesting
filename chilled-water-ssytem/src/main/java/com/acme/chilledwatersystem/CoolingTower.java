package org.cloudbus.cloudsim.chilledwater;

public class CoolingTower {
    private double fanEff = 0.75;
    public double reject(double heatKW, double wetBulb) {
        double fanPower = 0.02 * heatKW;
        return fanPower / fanEff;
    }
}
