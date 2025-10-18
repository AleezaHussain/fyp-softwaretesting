package org.cloudbus.cloudsim.datacenter;

public class ITLoadProfile {
    private double[] hourlyFraction = {0.5, 0.7, 1.0, 0.9, 0.6, 0.4};

    public double getLoadFraction(int hour) {
        return hourlyFraction[hour % hourlyFraction.length];
    }
}
