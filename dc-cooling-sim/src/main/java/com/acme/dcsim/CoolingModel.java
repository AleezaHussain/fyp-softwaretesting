package com.acme.dcsim;

/** Maps IT power + environment -> electrical cooling power (Watts). */
public interface CoolingModel {
    /**
     * @param itPowerW    instantaneous IT power (W)
     * @param ambientC    ambient air temperature (°C)
     * @param setpointC   supply/room setpoint (°C)
     * @return electrical power consumed by cooling (W)
     */
    double coolingPowerWatts(double itPowerW, double ambientC, double setpointC);
}
