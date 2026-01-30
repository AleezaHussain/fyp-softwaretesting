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

import provider.PsychroState;
import provider.Psychrometrics;

public class EvaporativeCoolingModel {
    public static class Inputs {
        public PsychroState inState; // inlet psychro state
        public double efficiency; // 0..1
        public double V_air_m3s; // airflow (m^3/s)
        public double rho_air; // kg/m^3 (1.2)
        public double Cp_kJ_per_kgC;// kJ/(kg*C) (~1.006)
        public double L_v_kJ_per_kg;// ~2260 kJ/kg
        public double P_kPa; // ambient pressure

        public Inputs cloneCopy() {
            Inputs c = new Inputs();
            c.inState = inState;
            c.efficiency = efficiency;
            c.V_air_m3s = V_air_m3s;
            c.rho_air = rho_air;
            c.Cp_kJ_per_kgC = Cp_kJ_per_kgC;
            c.L_v_kJ_per_kg = L_v_kJ_per_kg;
            c.P_kPa = P_kPa;
            return c;
        }
    }

    public static class Outputs {
        public double T_out_C; // outlet temperature (C)
        public double RH_out_percent; // outlet RH (%) approximate
        public double m_air_kg_s; // mass flow rate of air (kg/s)
        public double Q_kW; // cooling capacity (kW)
        public double m_water_kg_s; // water consumption (kg/s)
    }

    public Outputs compute(Inputs in) {
        Outputs out = new Outputs();
        PsychroState s_in = in.inState;
        // 1) Outlet temperature (DEC): T_out = T_in - η*(T_in - Twb)
        double T_out_C = s_in.Tdb_C - in.efficiency * (s_in.Tdb_C - s_in.Twb_C);
        out.T_out_C = T_out_C;
        // 2) Mass flow rate of air
        out.m_air_kg_s = in.rho_air * in.V_air_m3s;
        // 3) h_out = h_in (adiabatic)
        double h_out = s_in.h;
        // 4) W_out from (T_out, h_in)
        // h = 1.006*T + W*(2501 + 1.86*T) => W = (h - 1.006*T)/(2501 + 1.86*T)
        double W_out = (h_out - 1.006 * T_out_C) / (2501 + 1.86 * T_out_C);
        // 5) RH_out from W_out
        double pws_out = Psychrometrics.Pws(T_out_C);
        double pv_out = (in.P_kPa * W_out) / (0.62198 + W_out);
        double RH_out = 100.0 * pv_out / pws_out;
        out.RH_out_percent = Math.max(0.0, Math.min(100.0, RH_out));
        // 6) Cooling capacity Q (kW)
        out.Q_kW = out.m_air_kg_s * in.Cp_kJ_per_kgC * (s_in.Tdb_C - T_out_C);
        // 7) Water evaporation (real way)
        double m_evap = out.m_air_kg_s * (W_out - s_in.W);
        out.m_water_kg_s = Math.max(0.0, m_evap);
        return out;
    }
}
