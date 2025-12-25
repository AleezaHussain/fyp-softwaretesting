
package com.acme.dccore;

import org.cloudsimplus.hosts.Host;
import java.util.List;

/**
 * ImmersionCoolingManager for CloudSim Plus: call update(clock) from a clock tick listener.
 */
public class ImmersionCoolingManager {
    private double timestep;
    private List<Host> hosts;
    private ImmersionCoolingUnit coolingUnit;
    private ImmersionThermalModel thermalModel;
    private ImmersionCoolingController controller;
    private ImmersionCoolingPowerModel powerModel;
    private ImmersionCoolingPolicy policy;
    // Last-step metrics
    private double lastPumpPowerW = 0.0;
    private double lastChillerPowerW = 0.0;
    private double lastCoolingEnergyJ = 0.0;

    public ImmersionCoolingManager(double timestep, List<Host> hosts,
                                   ImmersionCoolingUnit coolingUnit,
                                   ImmersionThermalModel thermalModel,
                                   ImmersionCoolingController controller,
                                   ImmersionCoolingPowerModel powerModel,
                                   ImmersionCoolingPolicy policy) {
        this.timestep = timestep;
        this.hosts = hosts;
        this.coolingUnit = coolingUnit;
        this.thermalModel = thermalModel;
        this.controller = controller;
        this.powerModel = powerModel;
        this.policy = policy;
    }

    /**
     * Call this from CloudSimPlus.addOnClockTickListener(clock -> ...)
     */
    public void update(double clock) {
        for (Host host : hosts) {
            double util = host.getCpuPercentUtilization();
            double hostPowerW = util * 500; // Example: 500W max
            lastCoolingEnergyJ = coolingUnit.removeHeatFromHost(hostPowerW, timestep);
            powerModel.addCoolingEnergy(lastCoolingEnergyJ);
            thermalModel.updateHostTemp(timestep, hostPowerW, lastCoolingEnergyJ / timestep);
            controller.control(coolingUnit);
            // Cast VM list to List<Vm>
                java.util.List<org.cloudsimplus.vms.Vm> vms = new java.util.ArrayList<>();
                for (Object vm : host.getVmList()) {
                    if (vm instanceof org.cloudsimplus.vms.Vm) {
                        vms.add((org.cloudsimplus.vms.Vm) vm);
                    }
                }
            policy.checkMigration(thermalModel.hostTemp, vms);
            policy.checkThrottling(thermalModel.hostTemp, vms);
            lastPumpPowerW = coolingUnit.computePumpPower();
            powerModel.addPumpEnergy(lastPumpPowerW, timestep);
            lastChillerPowerW = coolingUnit.computeChillerPower(hostPowerW);
            powerModel.addChillerEnergy(lastChillerPowerW, timestep);
            // Log metrics
            System.out.printf("Time: %.0fs, Host: %d, BathTemp: %.2fC, HostTemp: %.2fC, TotalCoolingEnergy: %.2fJ\n",
                    clock, host.getId(), coolingUnit.bathTemp, thermalModel.hostTemp, powerModel.getTotalEnergyJ());
        }
    }

    public double getLastPumpPowerW() { return lastPumpPowerW; }
    public double getLastChillerPowerW() { return lastChillerPowerW; }
    public double getLastCoolingEnergyJ() { return lastCoolingEnergyJ; }
}
