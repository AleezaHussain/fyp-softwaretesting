package com.acme.evap;

/**
 * Simple fan/blower power model.
 * Supports either a fixed pressure drop (Pa) or Darcy-Weisbach based estimation.
 */
public class FanModel {
    public static class Params {
        public double eta_fan = 0.6;     // efficiency 0..1
        public double deltaP_Pa = 150.0; // fixed pressure drop across pad/system (Pa)
        // Darcy-Weisbach optional parameters
        public double f = 0.2;           // friction factor (dimensionless)
        public double L_m = 0.05;        // pad thickness/length (m)
        public double D_m = 0.02;        // hydraulic diameter (m)
        public double area_m2 = 1.0;     // flow area (m^2)
        public boolean useDarcy = false;
        public double rho_air = 1.2;     // kg/m3
    }

    public double computeDeltaP(FanModel.Params p, double Vdot_m3s) {
        if (!p.useDarcy) return p.deltaP_Pa;
        double v = (p.area_m2 > 1e-9) ? (Vdot_m3s / p.area_m2) : 0.0; // m/s
        double dp = p.f * (p.L_m / p.D_m) * (p.rho_air * v * v / 2.0);
        return dp;
    }

    /**
     * P_fan = Vdot * ΔP / eta
     */
    public double powerW(FanModel.Params p, double Vdot_m3s) {
        double dP = computeDeltaP(p, Vdot_m3s);
        if (p.eta_fan <= 1e-6) return 0.0;
        return Vdot_m3s * dP / p.eta_fan;
    }
}
