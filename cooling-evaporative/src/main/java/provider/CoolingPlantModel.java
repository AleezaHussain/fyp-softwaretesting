package provider;

public class CoolingPlantModel {
    public static class Output {
        public String mode;
        public double Q_evap_kW;
        public double Q_DX_kW;
        public double P_DX_kW;
        public double m_evap_kg_s;
    }

    public double eta_DEC;
    public double eta_IEC;
    public double dxCOP;
    public double maxRH;
    public double maxDewPoint_C;

    public CoolingPlantModel(double eta_DEC, double eta_IEC, double dxCOP, double maxRH, double maxDewPoint_C) {
        this.eta_DEC = eta_DEC;
        this.eta_IEC = eta_IEC;
        this.dxCOP = dxCOP;
        this.maxRH = maxRH;
        this.maxDewPoint_C = maxDewPoint_C;
    }

    public Output decide(provider.PsychroState ambient, double T_supply_set, double airflow_m3s, double rho_air,
            double Cp_kJ_per_kgC, double Q_required_kW) {
        Output out = new Output();
        // Try DEC
        double T_DEC = ambient.Tdb_C - eta_DEC * (ambient.Tdb_C - ambient.Twb_C);
        double h_in = ambient.h;
        double W_DEC = (h_in - 1.006 * T_DEC) / (2501 + 1.86 * T_DEC);
        double pws_DEC = provider.Psychrometrics.Pws(T_DEC);
        double pv_DEC = (ambient.P_kPa * W_DEC) / (0.62198 + W_DEC);
        double RH_DEC = 100.0 * pv_DEC / pws_DEC;
        double Tdp_DEC = provider.Psychrometrics.Tdp(pv_DEC);
        boolean decOK = (T_DEC <= T_supply_set) && (RH_DEC <= maxRH) && (Tdp_DEC <= maxDewPoint_C);
        if (decOK) {
            out.mode = "DEC";
            out.Q_evap_kW = Q_required_kW;
            out.Q_DX_kW = 0.0;
            out.P_DX_kW = 0.0;
            out.m_evap_kg_s = airflow_m3s * rho_air * (W_DEC - ambient.W);
            return out;
        }
        // Try IEC (no RH increase)
        double T_IEC = ambient.Tdb_C - eta_IEC * (ambient.Tdb_C - ambient.Twb_C);
        boolean iecOK = (T_IEC <= T_supply_set);
        if (iecOK) {
            out.mode = "IEC";
            out.Q_evap_kW = Q_required_kW;
            out.Q_DX_kW = 0.0;
            out.P_DX_kW = 0.0;
            out.m_evap_kg_s = 0.0; // No direct evaporation
            return out;
        }
        // Use DX for remaining load
        out.mode = "DX";
        out.Q_evap_kW = 0.0;
        out.Q_DX_kW = Q_required_kW;
        out.P_DX_kW = (dxCOP > 0) ? (Q_required_kW / dxCOP) : 0.0;
        out.m_evap_kg_s = 0.0;
        return out;
    }
}
