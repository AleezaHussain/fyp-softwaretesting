package com.acme.evap;

/**
 * Evaporative cooling model implementing the provided formulas.
 * All units:
 *  - Temperatures in Celsius
 *  - Airflow in m^3/s
 *  - rho_air in kg/m^3 (approx 1.2)
 *  - C_p in kJ/(kg*C) (approx 1.006)
 *  - Q in kW
 *  - L_v in kJ/kg (~2260)
 */
public class EvaporativeCoolingModel {
    public static class Inputs {
        public double T_in_C;       // inlet air temperature (C)
        public double RH_in_percent;// inlet relative humidity (%)
        public double T_wb_C;       // wet-bulb temperature (C)
        public double efficiency;   // 0..1
        public double V_air_m3s;    // airflow (m^3/s)
        public double rho_air;      // kg/m^3 (1.2)
        public double Cp_kJ_per_kgC;// kJ/(kg*C) (~1.006)
        public double L_v_kJ_per_kg;// ~2260 kJ/kg
        public Inputs cloneCopy() {
            Inputs c = new Inputs();
            c.T_in_C = T_in_C; c.RH_in_percent = RH_in_percent; c.T_wb_C = T_wb_C; c.efficiency = efficiency;
            c.V_air_m3s = V_air_m3s; c.rho_air = rho_air; c.Cp_kJ_per_kgC = Cp_kJ_per_kgC; c.L_v_kJ_per_kg = L_v_kJ_per_kg;
            return c;
        }
    }

    public static class Outputs {
        public double T_out_C;      // outlet temperature (C)
        public double RH_out_percent; // outlet RH (%) approximate
        public double m_air_kg_s;   // mass flow rate of air (kg/s)
        public double Q_kW;         // cooling capacity (kW)
        public double m_water_kg_s; // water consumption (kg/s)
    }

    public Outputs compute(Inputs in) {
        Outputs out = new Outputs();
        // 1) Outlet temperature
        out.T_out_C = in.T_in_C - in.efficiency * (in.T_in_C - in.T_wb_C);
        // 2) Mass flow rate of air
        out.m_air_kg_s = in.rho_air * in.V_air_m3s;
        // 3) Heat removed Q (kW) since Cp is in kJ/kgC
        out.Q_kW = out.m_air_kg_s * in.Cp_kJ_per_kgC * (in.T_in_C - out.T_out_C);
        // 4) Approximate RH increase
        double RH_sat = 100.0;
        double denom = Math.max(1e-9, (in.T_in_C - in.T_wb_C));
        double deltaRH = ((in.T_in_C - out.T_out_C) / denom) * (RH_sat - in.RH_in_percent);
        out.RH_out_percent = Math.max(0.0, Math.min(100.0, in.RH_in_percent + deltaRH));
        // 5) Water consumption m_water = Q / L_v (kg/s), with Q in kJ/s (kW) and L_v in kJ/kg
        out.m_water_kg_s = (in.L_v_kJ_per_kg > 0) ? (out.Q_kW / in.L_v_kJ_per_kg) : 0.0;
        return out;
    }
}
