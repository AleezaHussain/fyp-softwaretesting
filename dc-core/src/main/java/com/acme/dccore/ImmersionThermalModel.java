package com.acme.dccore;

/**
 * Tracks host temperature and thermal behavior for immersion cooling.
 */
public class ImmersionThermalModel {
    public double hostTemp; // deg C
    public double powerDissipation; // W
    public double thermalCapacitance; // J/K

    public ImmersionThermalModel(double initialTemp, double thermalCapacitance) {
        this.hostTemp = initialTemp;
        this.thermalCapacitance = thermalCapacitance;
    }

    /**
     * Update host temperature based on heat removed and power dissipation.
     * dT = (P_loss - Q_removed)/C_th * dt
     */
    public void updateHostTemp(double dt, double P_loss, double Q_removed) {
        double dT = (P_loss - Q_removed) / thermalCapacitance * dt;
        hostTemp += dT;
    }
}
