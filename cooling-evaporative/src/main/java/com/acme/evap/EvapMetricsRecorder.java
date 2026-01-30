package com.acme.evap;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class EvapMetricsRecorder {
    private final String scenario;
    private final List<String> rows = new ArrayList<>();
    private final List<String> summaryRows = new ArrayList<>();

    public EvapMetricsRecorder(String scenario) {
        this.scenario = scenario;
        rows.add(
                "scenario,time_s,Tdb_in,RH_in,Twb_in,W_in,h_in,Tdp_in,mode,T_supply,T_cold,T_hot,Q_evap_kW,Q_DX_kW,m_evap_kg_s,blowdown_kg_s,makeup_kg_s,P_fan_kW,P_DX_kW,P_pump_kW,E_fan_kWh_cum,E_DX_kWh_cum,E_total_kWh_cum,P_IT_kW,P_total_kW,PUE_inst,PUE_avg,WUE_inst,CUE_inst,cost_elec,cost_water,OPEX_total,CO2_kg_cum\n");
    }

    public void record(
            double t,
            // Weather/psychro
            double Tdb_in, double RH_in, double Twb_in, double W_in, double h_in, double Tdp_in,
            // Cooling
            String mode, double T_supply, double T_cold, double T_hot,
            double Q_evap_kW, double Q_DX_kW,
            double m_evap_kg_s, double blowdown_kg_s, double makeup_kg_s,
            // Energy
            double P_fan_kW, double P_DX_kW, double P_pump_kW,
            double E_fan_kWh_cum, double E_DX_kWh_cum, double E_total_kWh_cum,
            // DC metrics
            double P_IT_kW, double P_total_kW, double PUE_inst, double PUE_avg, double WUE_inst, double CUE_inst,
            // Cost & CO2
            double cost_elec, double cost_water, double OPEX_total, double CO2_kg_cum) {
        String line = String.format(java.util.Locale.US,
                "%s,%.2f,%.3f,%.2f,%.3f,%.6f,%.2f,%.3f,%s,%.3f,%.3f,%.3f,%.3f,%.3f,%.6f,%.6f,%.6f,%.3f,%.3f,%.3f,%.6f,%.6f,%.6f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.6f\n",
                scenario, t, Tdb_in, RH_in, Twb_in, W_in, h_in, Tdp_in,
                mode, T_supply, T_cold, T_hot, Q_evap_kW, Q_DX_kW,
                m_evap_kg_s, blowdown_kg_s, makeup_kg_s,
                P_fan_kW, P_DX_kW, P_pump_kW,
                E_fan_kWh_cum, E_DX_kWh_cum, E_total_kWh_cum,
                P_IT_kW, P_total_kW, PUE_inst, PUE_avg, WUE_inst, CUE_inst,
                cost_elec, cost_water, OPEX_total, CO2_kg_cum);
        rows.add(line);
    }

    public void recordSummary(String summaryLine) {
        summaryRows.add(summaryLine);
    }

    public void writeCsv(String path) throws IOException {
        try (BufferedWriter bw = new BufferedWriter(new FileWriter(path))) {
            for (String s : rows)
                bw.write(s);
        }
    }

    public void writeSummaryCsv(String path) throws IOException {
        try (BufferedWriter bw = new BufferedWriter(new FileWriter(path))) {
            for (String s : summaryRows)
                bw.write(s);
        }
    }
}
