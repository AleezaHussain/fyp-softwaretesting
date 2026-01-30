package com.acme.evap;

import provider.PsychroState;

public class CoolingDispatch {
    public static class Result {
        public String mode;
        public boolean meetsTemp;
        public boolean meetsHumidity;
        public double T_supply;
        public double Tdp_supply;
        public double Q_required;
        public double Q_evap;
        public double Q_missing;
        public double P_DX;
    }

    public static Result evaluate(
            double Tdb_out, double RH_out, double P_kPa,
            double Twb_out, double Tdp_out, double W_out,
            double eta_DEC, double eta_IEC,
            double Q_required, double T_set, double Tdp_max, double COP_DX) {
        Result r = new Result();
        // Step 1: Try DEC
        double T_supply_DEC = Tdb_out - eta_DEC * (Tdb_out - Twb_out);
        PsychroState supplyStateDEC = provider.Psychrometrics.from(T_supply_DEC, RH_out, P_kPa);
        double Tdp_supply_DEC = supplyStateDEC.Tdp_C;
        boolean meetsTemp_DEC = T_supply_DEC <= T_set;
        boolean meetsHumidity_DEC = Tdp_supply_DEC <= Tdp_max;
        if (meetsTemp_DEC && meetsHumidity_DEC) {
            r.mode = "DEC";
            r.meetsTemp = true;
            r.meetsHumidity = true;
            r.T_supply = T_supply_DEC;
            r.Tdp_supply = Tdp_supply_DEC;
            r.Q_required = Q_required;
            r.Q_evap = Q_required;
            r.Q_missing = 0.0;
            r.P_DX = 0.0;
            return r;
        }
        // Step 2: Try IEC
        double T_supply_IEC = Tdb_out - eta_IEC * (Tdb_out - Twb_out);
        PsychroState supplyStateIEC = provider.Psychrometrics.from(T_supply_IEC, RH_out, P_kPa);
        double Tdp_supply_IEC = supplyStateIEC.Tdp_C;
        boolean meetsTemp_IEC = T_supply_IEC <= T_set;
        boolean meetsHumidity_IEC = Tdp_supply_IEC <= Tdp_max;
        if (meetsTemp_IEC && meetsHumidity_IEC) {
            r.mode = "IEC";
            r.meetsTemp = true;
            r.meetsHumidity = true;
            r.T_supply = T_supply_IEC;
            r.Tdp_supply = Tdp_supply_IEC;
            r.Q_required = Q_required;
            r.Q_evap = Q_required;
            r.Q_missing = 0.0;
            r.P_DX = 0.0;
            return r;
        }
        // Step 3: Use DX assist for shortfall
        double Q_evap = Math.max(0.0, Q_required * 0.8); // Assume evap can do 80% if not meeting
        double Q_missing = Q_required - Q_evap;
        double P_DX = Q_missing > 0 ? Q_missing / COP_DX : 0.0;
        r.mode = "DX_ASSIST";
        r.meetsTemp = false;
        r.meetsHumidity = false;
        r.T_supply = Math.min(T_supply_DEC, T_supply_IEC);
        r.Tdp_supply = Math.min(Tdp_supply_DEC, Tdp_supply_IEC);
        r.Q_required = Q_required;
        r.Q_evap = Q_evap;
        r.Q_missing = Q_missing;
        r.P_DX = P_DX;
        return r;
    }
}
