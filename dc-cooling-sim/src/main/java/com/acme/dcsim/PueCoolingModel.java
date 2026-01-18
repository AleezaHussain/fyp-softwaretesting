package com.acme.dcsim;

/** Simple constant-PUE model: Facility = PUE * IT, Cooling = (PUE-1)*IT. */
public class PueCoolingModel implements CoolingModel {
    private final double pue;

    public PueCoolingModel(double pue) {
        if (pue < 1.0) throw new IllegalArgumentException("PUE must be >= 1");
        this.pue = pue;
    }

    @Override
    public double coolingPowerWatts(double itPowerW, double ambientC, double setpointC) {
        return Math.max(0.0, (pue - 1.0) * itPowerW);
    }

    public double getPue() { return pue; }
}
