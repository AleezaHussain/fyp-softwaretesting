package com.acme.dcsim;

import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.hosts.Host;

public class EnergyAccountant {
    private final CloudSimPlus sim;
    private final DatacenterSimple dc;
    private final CoolingModel cooling;
    private final EnvSupplier env;

    private double lastSampleTime = 0.0;
    private double itEnergyWh = 0.0;
    private double coolingEnergyWh = 0.0;

    public interface EnvSupplier {
        double ambientC();   // can be time-varying later
        double setpointC();
    }

    public EnergyAccountant(CloudSimPlus sim, DatacenterSimple dc, CoolingModel cooling, EnvSupplier env) {
        this.sim = sim;
        this.dc = dc;
        this.cooling = cooling;
        this.env = env;
        this.lastSampleTime = sim.clock();
    }

    /** Call on each clock tick (sim.addOnClockTickListener(e -> accountant.sample())). */
    public void sample() {
        final double now = sim.clock();                // seconds
        final double dtSec = Math.max(0.0, now - lastSampleTime);
        lastSampleTime = now;
        if (dtSec <= 0) return;

        final double itPowerW = totalItPowerWatts();
        final double coolW = cooling.coolingPowerWatts(itPowerW, env.ambientC(), env.setpointC());

        // Wh = W * s / 3600
        itEnergyWh      += itPowerW * dtSec / 3600.0;
        coolingEnergyWh += coolW     * dtSec / 3600.0;
    }

    public double getItEnergyKWh()         { return itEnergyWh / 1000.0; }
    public double getCoolingEnergyKWh()    { return coolingEnergyWh / 1000.0; }
    public double getFacilityEnergyKWh()   { return getItEnergyKWh() + getCoolingEnergyKWh(); }
    public double getEffectivePUE() {
        final double it = getItEnergyKWh();
        return it > 0 ? getFacilityEnergyKWh() / it : 1.0;
    }

    private double totalItPowerWatts() {
        double sum = 0.0;
        for (Host h : dc.getHostList()) {
            if (h.getPowerModel() == null) continue;
            // 0..1 CPU utilization
            final double util = h.getCpuPercentUtilization();
            sum += h.getPowerModel().getPower(util);
        }
        return sum;
    }
}
