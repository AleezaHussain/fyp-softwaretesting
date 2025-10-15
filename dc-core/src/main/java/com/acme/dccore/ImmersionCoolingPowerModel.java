package com.acme.dccore;

/**
 * Computes energy consumed by immersion cooling devices for datacenter energy accounting.
 */
public class ImmersionCoolingPowerModel {
    public double totalCoolingEnergyJ = 0;
    public double totalPumpEnergyJ = 0;
    public double totalChillerEnergyJ = 0;

    public void addPumpEnergy(double pumpPowerW, double dt) {
        totalPumpEnergyJ += pumpPowerW * dt;
    }

    public void addChillerEnergy(double chillerPowerW, double dt) {
        totalChillerEnergyJ += chillerPowerW * dt;
    }

    public void addCoolingEnergy(double coolingEnergyJ) {
        totalCoolingEnergyJ += coolingEnergyJ;
    }

    public double getTotalEnergyJ() {
        return totalCoolingEnergyJ + totalPumpEnergyJ + totalChillerEnergyJ;
    }
}
