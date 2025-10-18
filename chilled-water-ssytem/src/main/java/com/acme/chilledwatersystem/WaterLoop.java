package org.cloudbus.cloudsim.chilledwater;

/** Models chilled-water properties and flow calculations. */
public class WaterLoop {
    private static final double CP = 4.186;   // kJ/kg·K
    private static final double DENSITY = 998; // kg/m³
    private double flowRate;  // L/s
    private double deltaT;    // °C

    public WaterLoop(double flowRateLps, double deltaT) {
        this.flowRate = flowRateLps;
        this.deltaT = deltaT;
    }

    /** Returns cooling capacity (kW) from flow and ΔT. */
    public double getCoolingKW() {
        // kW = (ρ * Cp * ΔT * FlowRate(L/s)) / 1000
        return (DENSITY * CP * deltaT * (flowRate / 1000.0)) / 1000.0;
    }

    public double getFlowRate() { return flowRate; }
    public double getDeltaT() { return deltaT; }
}
