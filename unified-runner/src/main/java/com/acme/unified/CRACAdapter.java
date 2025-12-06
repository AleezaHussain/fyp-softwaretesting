package com.acme.unified;

import com.acme.crahcrac.CRACSystem;

/** Adapter that wraps the existing CRACSystem into the unified runner interface. */
public class CRACAdapter implements CoolingTechnique {
    private final CRACSystem crac;
    private double totalWaterL = 0.0;

    public CRACAdapter(double designMaxItKW) {
        double capacityTons = Math.max(1.0, designMaxItKW / 3.517);
        double nominalCOP = 3.0;
        double nominalFanPowerKW = designMaxItKW * 0.1;
        this.crac = new CRACSystem(capacityTons, nominalCOP, nominalFanPowerKW);
    }

    @Override
    public String getName() { return "CRAC"; }

    @Override
    public double simulateHour(double itLoadKW, double ambientC, double wetBulbC, int hour) {
        // Use airflowRatio = 1.0 for baseline comparison
        double airflowRatio = 1.0;
        com.acme.crahcrac.CRACSystem.CRACResult r = crac.calculatePower(itLoadKW, ambientC, airflowRatio);
        // CRAC has no direct water use in this DX model
        return r.totalPowerKW;
    }

    @Override
    public double getTotalWaterL() { return totalWaterL; }
}
