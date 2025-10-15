package com.acme.evap;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;

public class App {
    private static class Scenario {
        String name;
        double T_in_C;
        double RH_in_percent;
        double T_wb_C;
        double efficiency;
        double V_air_m3s;
        double rho_air;
        double Cp_kJ_per_kgC;
        double L_v_kJ_per_kg;
        double duration_s;   // total simulated seconds
        double dt_s;         // timestep
        // Fan/pressure model
        FanModel.Params fan = new FanModel.Params();
        // Water system
        double driftLossFrac = 0.01;     // fraction of evaporated water lost as drift
        double recoveryFrac = 0.0;       // fraction of evaporated water recovered (condensate)
        // Modes: DEC, IEC, HYBRID
        String mode = "DEC";
        double eta_DEC = 0.8;            // used in HYBRID
        double eta_IEC = 0.1;            // used in HYBRID (no RH increase)
        // Dynamic profiles
        boolean useDailyProfile = false;
        double T_min_C = 28, T_max_C = 40; // if profile enabled, vary between
        double RH_min = 30, RH_max = 70;
        // Control & faults
        double Tout_set_C = 26.0;        // target outlet temp
        boolean enableControl = false;   // simple proportional control on V_air
        double Kp_air = 0.2;             // proportional gain (m3/s per C)
        double V_air_min = 1.0, V_air_max = 40.0;
        double failStartS = -1, failDurationS = 0; // fan failure window (V_air=0)
        // IT/PUE comparison & environment
        double P_IT_kW = 100.0;          // IT load for PUE comparison
        double PUE_air = 1.4;            // baseline air PUE
        double PUE_liquid = 1.1;         // optional immersion baseline
        double kgCO2PerKWh = 0.45;       // grid emissions factor

        Scenario(String name, double T_in_C, double RH_in_percent, double T_wb_C, double efficiency,
                 double V_air_m3s, double rho_air, double Cp_kJ_per_kgC, double L_v_kJ_per_kg,
                 double duration_s, double dt_s) {
            this.name = name; this.T_in_C = T_in_C; this.RH_in_percent = RH_in_percent; this.T_wb_C = T_wb_C;
            this.efficiency = efficiency; this.V_air_m3s = V_air_m3s; this.rho_air = rho_air;
            this.Cp_kJ_per_kgC = Cp_kJ_per_kgC; this.L_v_kJ_per_kg = L_v_kJ_per_kg;
            this.duration_s = duration_s; this.dt_s = dt_s;
        }
    }

    public static void main(String[] args) {
        List<Scenario> scenarios = new ArrayList<>();
        // Baseline example matching user formula
        scenarios.add(new Scenario("Base_35C_RH40_Eta0.8_Flow10", 35, 40, 25, 0.8, 10.0, 1.2, 1.006, 2260, 600, 1));
        // Efficiency sweep
        scenarios.add(new Scenario("Eta0.7", 35, 40, 25, 0.7, 10.0, 1.2, 1.006, 2260, 600, 1));
        scenarios.add(new Scenario("Eta0.9", 35, 40, 25, 0.9, 10.0, 1.2, 1.006, 2260, 600, 1));
        // Airflow sweep
        scenarios.add(new Scenario("Flow5", 35, 40, 25, 0.8, 5.0, 1.2, 1.006, 2260, 600, 1));
        scenarios.add(new Scenario("Flow20", 35, 40, 25, 0.8, 20.0, 1.2, 1.006, 2260, 600, 1));
        // Inlet temp sweep
        scenarios.add(new Scenario("Inlet30", 30, 40, 22, 0.8, 10.0, 1.2, 1.006, 2260, 600, 1));
        scenarios.add(new Scenario("Inlet40", 40, 40, 28, 0.8, 10.0, 1.2, 1.006, 2260, 600, 1));
        // Climate sensitivity (daily profile)
        Scenario daily = new Scenario("DailyProfile_ClimateSweep", 35, 40, 25, 0.8, 10.0, 1.2, 1.006, 2260, 24*3600, 60);
        daily.useDailyProfile = true; daily.T_min_C = 30; daily.T_max_C = 42; daily.RH_min = 25; daily.RH_max = 70;
        scenarios.add(daily);
        // Fan/pressure modeling with Darcy
        Scenario fanDarcy = new Scenario("Fan_Darcy_ThickPad", 35, 40, 25, 0.8, 12.0, 1.2, 1.006, 2260, 3600, 10);
        fanDarcy.fan.useDarcy = true; fanDarcy.fan.area_m2 = 2.0; fanDarcy.fan.L_m = 0.1; fanDarcy.fan.D_m = 0.05; fanDarcy.fan.f = 0.25; fanDarcy.fan.eta_fan = 0.6;
        scenarios.add(fanDarcy);
        // Multi-stage hybrid
        Scenario hybrid = new Scenario("Hybrid_DEC_IEC", 35, 40, 25, 0.8, 10.0, 1.2, 1.006, 2260, 3600, 10);
        hybrid.mode = "HYBRID"; hybrid.eta_DEC = 0.7; hybrid.eta_IEC = 0.2;
        scenarios.add(hybrid);
        // Fault + PID control
        Scenario ctrl = new Scenario("Control_PID_Fault", 36, 45, 26, 0.75, 8.0, 1.2, 1.006, 2260, 3600, 5);
        ctrl.enableControl = true; ctrl.Kp_air = 0.5; ctrl.V_air_min = 4.0; ctrl.V_air_max = 30.0; ctrl.Tout_set_C = 27.0; ctrl.failStartS = 1200; ctrl.failDurationS = 300;
        scenarios.add(ctrl);

        for (Scenario sc : scenarios) {
            runScenario(sc);
        }
    }

    private static void runScenario(Scenario sc) {
        EvaporativeCoolingModel model = new EvaporativeCoolingModel();
        EvaporativeCoolingModel.Inputs in = new EvaporativeCoolingModel.Inputs();
        in.T_in_C = sc.T_in_C; in.RH_in_percent = sc.RH_in_percent; in.T_wb_C = sc.T_wb_C;
        in.efficiency = sc.efficiency; in.V_air_m3s = sc.V_air_m3s; in.rho_air = sc.rho_air;
        in.Cp_kJ_per_kgC = sc.Cp_kJ_per_kgC; in.L_v_kJ_per_kg = sc.L_v_kJ_per_kg;

        EvapMetricsRecorder rec = new EvapMetricsRecorder(sc.name);
        double cumQ_kWh = 0.0;
        double cumWater_kg = 0.0;
        double fanEnergy_kWh = 0.0;
        FanModel fan = new FanModel();

        for (double t = 0; t <= sc.duration_s; t += sc.dt_s) {
            // Dynamic ambient profile (diurnal sinusoid)
            if (sc.useDailyProfile) {
                double dayFrac = (t % (24*3600)) / (24*3600.0);
                in.T_in_C = sc.T_min_C + (sc.T_max_C - sc.T_min_C) * 0.5 * (1 + Math.sin(2*Math.PI*(dayFrac - 0.25)));
                in.RH_in_percent = sc.RH_min + (sc.RH_max - sc.RH_min) * 0.5 * (1 + Math.sin(2*Math.PI*(dayFrac + 0.25)));
                in.T_wb_C = Math.min(in.T_in_C - 1.0, (in.T_in_C - 0.5*(in.T_in_C - 10))); // simplistic proxy
            }

            // Fault injection: fan failure (airflow forced to zero)
            double V_air_saved = in.V_air_m3s;
            if (sc.failStartS >= 0 && t >= sc.failStartS && t < sc.failStartS + sc.failDurationS) {
                in.V_air_m3s = 0.0;
            }

            // Mode handling: DEC/IEC/HYBRID adjust efficiency and RH behavior
            EvaporativeCoolingModel.Outputs out;
            if ("IEC".equalsIgnoreCase(sc.mode)) {
                // Indirect: use efficiency but no RH increase (keep RH_out=RH_in)
                out = model.compute(in);
                out.RH_out_percent = in.RH_in_percent;
            } else if ("HYBRID".equalsIgnoreCase(sc.mode)) {
                double effHybrid = Math.min(0.99, Math.max(0.0, sc.eta_DEC + sc.eta_IEC));
                double effSaved = in.efficiency;
                in.efficiency = effHybrid;
                out = model.compute(in);
                // Only DEC portion adds RH; scale RH increase by eta_DEC/effHybrid
                double effRatio = (effHybrid > 1e-9) ? (sc.eta_DEC / effHybrid) : 0.0;
                double RH_dec = out.RH_out_percent;
                out.RH_out_percent = in.RH_in_percent + effRatio * (RH_dec - in.RH_in_percent);
                in.efficiency = effSaved;
            } else {
                // DEC (default)
                out = model.compute(in);
            }

            // Simple proportional control on airflow to meet target Tout
            if (sc.enableControl) {
                double error = out.T_out_C - sc.Tout_set_C; // positive if too warm
                in.V_air_m3s = clamp(in.V_air_m3s + sc.Kp_air * error, sc.V_air_min, sc.V_air_max);
                // recompute after control
                if ("IEC".equalsIgnoreCase(sc.mode)) {
                    EvaporativeCoolingModel.Outputs out2 = model.compute(in); out2.RH_out_percent = in.RH_in_percent; out = out2;
                } else if ("HYBRID".equalsIgnoreCase(sc.mode)) {
                    double effHybrid = Math.min(0.99, Math.max(0.0, sc.eta_DEC + sc.eta_IEC));
                    double effSaved = in.efficiency; in.efficiency = effHybrid;
                    EvaporativeCoolingModel.Outputs out2 = model.compute(in);
                    double effRatio = (effHybrid > 1e-9) ? (sc.eta_DEC / effHybrid) : 0.0;
                    double RH_dec = out2.RH_out_percent;
                    out2.RH_out_percent = in.RH_in_percent + effRatio * (RH_dec - in.RH_in_percent);
                    out = out2; in.efficiency = effSaved;
                } else { out = model.compute(in); }
            }

            // Fan power and energy
            double P_fan_W = fan.powerW(sc.fan, in.V_air_m3s);
            fanEnergy_kWh += (P_fan_W/1000.0) * (sc.dt_s/3600.0);

            // Integrate cooling energy and water
            out = model.compute(in);
            // Integrate energy (kWh): Q_kW * (dt_s/3600)
            cumQ_kWh += out.Q_kW * (sc.dt_s / 3600.0);
            // Water: evaporation + drift losses - recovery
            double evap_kg = out.m_water_kg_s * sc.dt_s;
            double drift_kg = sc.driftLossFrac * evap_kg;
            double recovered_kg = sc.recoveryFrac * evap_kg;
            cumWater_kg += Math.max(0.0, evap_kg + drift_kg - recovered_kg);
            rec.record(t, in, out, cumQ_kWh, cumWater_kg);

            // restore airflow after failure window
            in.V_air_m3s = V_air_saved;
        }
        String path = "cooling-evaporative/target/evap_metrics_" + sc.name + ".csv";
        try {
            rec.writeCsv(path);
            System.out.println("Wrote evaporative metrics: " + path);
            // Print single-step results for quick view
            EvaporativeCoolingModel.Outputs out = model.compute(in);
            // PUE comparison
            double PUE_evap = (sc.P_IT_kW + avgFanPowerKW(fanEnergy_kWh, sc.duration_s)) / sc.P_IT_kW;
            double CO2_savings_kg = (sc.PUE_air - PUE_evap) * sc.P_IT_kW * (sc.duration_s/3600.0) * sc.kgCO2PerKWh;
            // Append summary CSV
            appendSummary(sc, cumQ_kWh, cumWater_kg, fanEnergy_kWh, PUE_evap, CO2_savings_kg);
            System.out.printf("[%s] Mode=%s | T_out=%.2f C | Q=%.2f kW | RH_out=%.2f %% | Fan_kWh=%.3f | cumQ=%.4f kWh | Water=%.2f kg | PUE_evap=%.3f | CO2_sav=%.2f kg\n",
                    sc.name, sc.mode, out.T_out_C, out.Q_kW, out.RH_out_percent, fanEnergy_kWh, cumQ_kWh, cumWater_kg, PUE_evap, CO2_savings_kg);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static double avgFanPowerKW(double fanEnergy_kWh, double duration_s) {
        double hours = Math.max(1e-9, duration_s/3600.0);
        return fanEnergy_kWh / hours;
    }

    private static double clamp(double val, double lo, double hi) {
        return Math.max(lo, Math.min(hi, val));
    }

    private static void appendSummary(Scenario sc, double cumQ_kWh, double cumWater_kg, double fanEnergy_kWh, double PUE_evap, double CO2_savings_kg) throws IOException {
        String summary = "cooling-evaporative/target/evap_summaries.csv";
        String header = "scenario,mode,duration_s,dt_s,T_in_C,RH_in_percent,T_wb_C,eta,V_air_m3s,fan_useDarcy,Pad_L_m,Pad_D_m,Area_m2,eta_fan,deltaP_Pa,driftFrac,recoveryFrac,P_IT_kW,PUE_air,PUE_liquid,cumQ_kWh,fan_kWh,water_kg,PUE_evap,CO2_savings_kg\n";
        String row = String.format(java.util.Locale.US,
                "%s,%s,%.0f,%.0f,%.2f,%.1f,%.2f,%.3f,%.2f,%s,%.3f,%.3f,%.3f,%.2f,%.1f,%.3f,%.3f,%.1f,%.3f,%.3f,%.4f,%.4f,%.2f,%.3f,%.2f\n",
                sc.name, sc.mode, sc.duration_s, sc.dt_s, sc.T_in_C, sc.RH_in_percent, sc.T_wb_C, sc.efficiency, sc.V_air_m3s,
                sc.fan.useDarcy?"true":"false", sc.fan.L_m, sc.fan.D_m, sc.fan.area_m2, sc.fan.eta_fan, sc.fan.deltaP_Pa,
                sc.driftLossFrac, sc.recoveryFrac, sc.P_IT_kW, sc.PUE_air, sc.PUE_liquid, cumQ_kWh, fanEnergy_kWh, cumWater_kg, PUE_evap, CO2_savings_kg);
        Path p = Paths.get(summary);
        if (!Files.exists(p)) {
            Files.createDirectories(p.getParent());
            Files.write(p, header.getBytes(StandardCharsets.UTF_8));
        }
        Files.write(p, row.getBytes(StandardCharsets.UTF_8), StandardOpenOption.APPEND);
    }
}
