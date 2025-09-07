package com.acme.dcsim;

/**
 * Cooling power from chiller/CRAC COP (Coefficient of Performance).
 * Assumes heat to remove ≈ IT power (W). Electrical = IT / COP.
 * Optionally degrade COP as ΔT = (setpoint - ambient) shrinks (<free cooling)
 * or grows (hot day).
 */
public class CopCoolingModel implements CoolingModel {
    private final double baseCop;
    private final double copSlopePerDeg; // COP change per °C of (setpointC - ambientC)

    /**
     * @param baseCop          COP when (ambient == setpoint)
     * @param copSlopePerDeg   COP increases (positive) per °C when ambient < setpoint (free cooling),
     *                         and decreases when ambient > setpoint.
     */
    public CopCoolingModel(double baseCop, double copSlopePerDeg) {
        this.baseCop = Math.max(0.5, baseCop);
        this.copSlopePerDeg = copSlopePerDeg;
    }

    @Override
    public double coolingPowerWatts(double itPowerW, double ambientC, double setpointC) {
        final double delta = setpointC - ambientC;   // positive if outside is cooler
        double cop = baseCop + copSlopePerDeg * delta;
        cop = Math.max(0.8, Math.min(8.0, cop));     // clamp to realistic band
        return itPowerW / cop;
    }
}
