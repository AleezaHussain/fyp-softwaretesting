package com.acme.dccore;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class MetricsRecorder {
    private final String scenarioName;
    private static class Row {
        String scenario;
        double t;
        int hostId;
        double hostTempC;
        double bathTempC;
        double flowRate_m3s;
        double pumpPower_W;
        double chillerPower_W;
        double coolingEnergy_J;
        double pumpEnergy_J;
        double chillerEnergy_J;
        double totalCoolingEnergy_J;
        double cop_inst;
    }

    private final List<Row> rows = new ArrayList<>();

    public MetricsRecorder() { this("default"); }
    public MetricsRecorder(String scenarioName) { this.scenarioName = scenarioName; }

    public void record(double t,
                       int hostId,
                       ImmersionThermalModel thermal,
                       ImmersionCoolingUnit unit,
                       ImmersionCoolingPowerModel power,
                       double lastPumpPowerW,
                       double lastChillerPowerW,
                       double lastCoolingEnergyJ)
    {
        Row r = new Row();
        r.scenario = scenarioName;
        r.t = t;
        r.hostId = hostId;
        r.hostTempC = thermal.hostTemp;
        r.bathTempC = unit.bathTemp;
        r.flowRate_m3s = unit.flowRate;
        r.pumpPower_W = lastPumpPowerW;
        r.chillerPower_W = lastChillerPowerW;
        r.coolingEnergy_J = lastCoolingEnergyJ;
        r.pumpEnergy_J = power.totalPumpEnergyJ;
        r.chillerEnergy_J = power.totalChillerEnergyJ;
        r.totalCoolingEnergy_J = power.getTotalEnergyJ();
        double denom = lastPumpPowerW + lastChillerPowerW;
        r.cop_inst = denom > 1e-9 ? (lastCoolingEnergyJ) / Math.max(1e-9, denom) : 0.0;
        rows.add(r);
    }

    public void writeCsv(String path) throws IOException {
        try (BufferedWriter bw = new BufferedWriter(new FileWriter(path))) {
            bw.write("scenario,time_s,host_id,host_temp_C,bath_temp_C,flow_rate_m3s,pump_power_W,chiller_power_W,cooling_energy_J,pump_energy_J,chiller_energy_J,total_cooling_energy_J,cop_inst\n");
            for (Row r : rows) {
                bw.write(String.format(java.util.Locale.US,
                        "%s,%.3f,%d,%.4f,%.4f,%.6f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.6f\n",
                        r.scenario, r.t, r.hostId, r.hostTempC, r.bathTempC, r.flowRate_m3s,
                        r.pumpPower_W, r.chillerPower_W, r.coolingEnergy_J,
                        r.pumpEnergy_J, r.chillerEnergy_J, r.totalCoolingEnergy_J,
                        r.cop_inst));
            }
        }
    }
}
