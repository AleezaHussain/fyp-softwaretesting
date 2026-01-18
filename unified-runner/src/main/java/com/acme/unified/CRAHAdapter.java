package com.acme.unified;

import com.acme.crahcrac.CRAHSystem;

/** Adapter that wraps CRAHSystem. */
public class CRAHAdapter implements CoolingTechnique {
    private final CRAHSystem crah;
    private double totalWaterL = 0.0;

    public CRAHAdapter(double designMaxItKW) {
        double capacityTons = Math.max(1.0, designMaxItKW / 3.517);
        double nominalChillerCOP = 5.5;
        double nominalFanPowerKW = capacityTons * 0.5;
        double pumpPowerKW = capacityTons * 0.3;
        double towerFanPowerKW = capacityTons * 0.2;
        this.crah = new CRAHSystem(capacityTons, nominalChillerCOP, nominalFanPowerKW, pumpPowerKW, towerFanPowerKW);
    }

    @Override
    public String getName() { return "CRAH"; }

    @Override
    public double simulateHour(double itLoadKW, double ambientC, double wetBulbC, int hour) {
        double chwSupply = 12.0; // baseline CHW supply setpoint
        boolean econ = crah.canUseWaterEconomizer(wetBulbC, chwSupply);
        com.acme.crahcrac.CRAHSystem.CRAHResult r = crah.calculatePower(itLoadKW, chwSupply, ambientC, 1.0, econ);
        // CRAH water economizer doesn't report water liters in this model; leave zero
        return r.totalPowerKW;
    }

    @Override
    public double getTotalWaterL() { return totalWaterL; }
}
