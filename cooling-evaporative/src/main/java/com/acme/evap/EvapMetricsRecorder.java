package com.acme.evap;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class EvapMetricsRecorder {
    private final String scenario;
    private final List<String> rows = new ArrayList<>();

    public EvapMetricsRecorder(String scenario) {
        this.scenario = scenario;
        rows.add("scenario,time_s,T_in_C,T_wb_C,RH_in_percent,efficiency,V_air_m3s,T_out_C,RH_out_percent,m_air_kg_s,Q_kW,m_water_kg_s,cum_Q_kWh,cum_water_kg\n");
    }

    public void record(double t,
                       EvaporativeCoolingModel.Inputs in,
                       EvaporativeCoolingModel.Outputs out,
                       double cumQ_kWh,
                       double cumWater_kg) {
        String line = String.format(java.util.Locale.US,
                "%s,%.2f,%.3f,%.3f,%.2f,%.3f,%.3f,%.3f,%.2f,%.4f,%.4f,%.4f,%.6f,%.3f\n",
                scenario, t, in.T_in_C, in.T_wb_C, in.RH_in_percent, in.efficiency, in.V_air_m3s,
                out.T_out_C, out.RH_out_percent, out.m_air_kg_s, out.Q_kW, out.m_water_kg_s, cumQ_kWh, cumWater_kg);
        rows.add(line);
    }

    public void writeCsv(String path) throws IOException {
        try (BufferedWriter bw = new BufferedWriter(new FileWriter(path))) {
            for (String s : rows) bw.write(s);
        }
    }
}
