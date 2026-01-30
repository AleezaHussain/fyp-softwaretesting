package com.acme.evap;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import provider.WeatherProvider;
import provider.CsvWeatherProvider;
import provider.WeatherPoint;
import provider.ITLoadProvider;
import provider.FlatLoadProvider;

public class App {
    public static class Scenario {
        public String name;
        public double T_in_C;
        public double RH_in_percent;
        public double efficiency;
        public double V_air_m3s;
        public double rho_air;
        public double Cp_kJ_per_kgC;
        public double L_v_kJ_per_kg;
        public double duration_s; // total simulated seconds
        public double dt_s; // timestep
        // Fan/pressure model
        public FanModel.Params fan = new FanModel.Params();
        // Water system
        public double driftLossFrac = 0.01; // fraction of evaporated water lost as drift
        public double recoveryFrac = 0.0; // fraction of evaporated water recovered (condensate)
        // Modes: DEC, IEC, HYBRID
        public String mode = "DEC";
        public double eta_DEC = 0.8; // used in HYBRID
        public double eta_IEC = 0.1; // used in HYBRID (no RH increase)
        // Dynamic profiles
        public boolean useDailyProfile = false;
        public double T_min_C = 28, T_max_C = 40; // if profile enabled, vary between
        public double RH_min = 30, RH_max = 70;
        // Control & faults
        public double Tout_set_C = 26.0; // target outlet temp
        public boolean enableControl = false; // simple proportional control on V_air
        public double Kp_air = 0.2; // proportional gain (m3/s per C)
        public double V_air_min = 1.0, V_air_max = 40.0;
        public double failStartS = -1, failDurationS = 0; // fan failure window (V_air=0)
        // IT/server model inputs
        public int num_servers = 100;
        public double P_server_idle_W = 250.0;
        public double P_server_max_W = 1000.0;
        public double P_fan_server_design_W = 30.0;
        public double T_ref_C = 20.0;
        public double UPS_efficiency = 0.96;
        public double PDU_loss_fraction = 0.02;
        public double pump_fraction = 0.02;
        public double COP_DX = 3.5;
        // IT/PUE comparison & environment
        public double P_IT_kW = 100.0; // legacy/fallback, not used in new model
        public double PUE_air = 1.4; // baseline air PUE
        public double PUE_liquid = 1.1; // optional immersion baseline
        public double kgCO2PerKWh = 0.45; // grid emissions factor

        Scenario(String name, double T_in_C, double RH_in_percent, double efficiency,
                double V_air_m3s, double rho_air, double Cp_kJ_per_kgC, double L_v_kJ_per_kg,
                double duration_s, double dt_s) {
            this.name = name;
            this.T_in_C = T_in_C;
            this.RH_in_percent = RH_in_percent;
            this.efficiency = efficiency;
            this.V_air_m3s = V_air_m3s;
            this.rho_air = rho_air;
            this.Cp_kJ_per_kgC = Cp_kJ_per_kgC;
            this.L_v_kJ_per_kg = L_v_kJ_per_kg;
            this.duration_s = duration_s;
            this.dt_s = dt_s;
        }
    }

    public static void main(String[] args) {
        List<Scenario> scenarios = new ArrayList<>();
        WeatherProvider weatherProvider = null;
        try {
            weatherProvider = new CsvWeatherProvider("D:/aleezafyp/fyp/cooling-evaporative/weather.csv");
        } catch (IOException e) {
            System.err.println("Failed to load weather.csv: " + e.getMessage());
            return;
        }
        // Baseline example matching user formula
        scenarios.add(new Scenario("Base_35C_RH40_Eta0.8_Flow10", 35, 40, 0.8, 10.0, 1.2, 1.006, 2260, 600, 1));
        // Efficiency sweep
        scenarios.add(new Scenario("Eta0.7", 35, 40, 0.7, 10.0, 1.2, 1.006, 2260, 600, 1));
        scenarios.add(new Scenario("Eta0.9", 35, 40, 0.9, 10.0, 1.2, 1.006, 2260, 600, 1));
        // Airflow sweep
        scenarios.add(new Scenario("Flow5", 35, 40, 0.8, 5.0, 1.2, 1.006, 2260, 600, 1));
        scenarios.add(new Scenario("Flow20", 35, 40, 0.8, 20.0, 1.2, 1.006, 2260, 600, 1));
        // Inlet temp sweep
        scenarios.add(new Scenario("Inlet30", 30, 40, 0.8, 10.0, 1.2, 1.006, 2260, 600, 1));
        scenarios.add(new Scenario("Inlet40", 40, 40, 0.8, 10.0, 1.2, 1.006, 2260, 600, 1));
        // Climate sensitivity (daily profile)
        Scenario daily = new Scenario("DailyProfile_ClimateSweep", 35, 40, 0.8, 10.0, 1.2, 1.006, 2260, 24 * 3600, 60);
        daily.useDailyProfile = true;
        daily.T_min_C = 30;
        daily.T_max_C = 42;
        daily.RH_min = 25;
        daily.RH_max = 70;
        scenarios.add(daily);
        // Fan/pressure modeling with Darcy
        Scenario fanDarcy = new Scenario("Fan_Darcy_ThickPad", 35.0, 40.0, 0.8, 12.0, 1.2, 1.006, 2260.0, 3600.0, 10.0);
        fanDarcy.fan.useDarcy = true;
        fanDarcy.fan.area_m2 = 2.0;
        fanDarcy.fan.L_m = 0.1;
        fanDarcy.fan.D_m = 0.05;
        fanDarcy.fan.f = 0.25;
        fanDarcy.fan.eta_fan = 0.6;
        scenarios.add(fanDarcy);
        // Multi-stage hybrid
        Scenario hybrid = new Scenario("Hybrid_DEC_IEC", 35.0, 40.0, 0.8, 10.0, 1.2, 1.006, 2260.0, 3600.0, 10.0);
        hybrid.mode = "HYBRID";
        hybrid.eta_DEC = 0.7;
        hybrid.eta_IEC = 0.2;
        scenarios.add(hybrid);
        // Fault + PID control
        Scenario ctrl = new Scenario("Control_PID_Fault", 36.0, 45.0, 0.75, 8.0, 1.2, 1.006, 2260.0, 3600.0, 5.0);
        ctrl.enableControl = true;
        ctrl.Kp_air = 0.5;
        ctrl.V_air_min = 4.0;
        ctrl.V_air_max = 30.0;
        ctrl.Tout_set_C = 27.0;
        ctrl.failStartS = 1200.0;
        ctrl.failDurationS = 300.0;
        scenarios.add(ctrl);

        // Use ServerModelITLoadProvider with a flat utilization profile (can be
        // replaced with diurnal/bursty)
        provider.ServerModelITLoadProvider.UtilizationProfile flatUtil = tSec -> 0.5; // 50% utilization
        for (Scenario sc : scenarios) {
            ITLoadProvider itLoadProvider = new provider.ServerModelITLoadProvider(sc, flatUtil);
            runScenario(sc, itLoadProvider);
        }
    }

    private static void runScenario(Scenario sc, ITLoadProvider itLoadProvider) {
        EvaporativeCoolingModel model = new EvaporativeCoolingModel();
        EvaporativeCoolingModel.Inputs in = new EvaporativeCoolingModel.Inputs();
        in.efficiency = sc.efficiency;
        in.V_air_m3s = sc.V_air_m3s;
        in.rho_air = sc.rho_air;
        in.Cp_kJ_per_kgC = sc.Cp_kJ_per_kgC;
        in.L_v_kJ_per_kg = sc.L_v_kJ_per_kg;

        EvapMetricsRecorder rec = new EvapMetricsRecorder(sc.name);
        double cumQ_kWh = 0.0;
        double cumWater_kg = 0.0;
        double fanEnergy_kWh = 0.0;
        double cumCO2_kg = 0.0;
        FanModel fan = new FanModel();

        // Use WeatherProvider for ambient conditions
        WeatherProvider weatherProvider = null;
        try {
            weatherProvider = new CsvWeatherProvider("D:/aleezafyp/fyp/cooling-evaporative/weather.csv");
        } catch (IOException e) {
            System.err.println("Failed to load weather.csv: " + e.getMessage());
            return;
        }

        for (double t = 0; t <= sc.duration_s; t += sc.dt_s) {
            WeatherPoint wp = weatherProvider.get((long) t);
            // Use real psychrometrics
            provider.PsychroState s_in = provider.Psychrometrics.from(wp.Tdb_C, wp.RH_percent, wp.P_kPa);
            in.inState = s_in;
            in.P_kPa = wp.P_kPa;
            double P_IT_kW = itLoadProvider.getTotalITkW((long) t);
            // UPS and PDU losses
            double UPS_eff = sc.UPS_efficiency;
            double PDU_frac = sc.PDU_loss_fraction;
            double pump_frac = sc.pump_fraction;
            double COP_DX = sc.COP_DX;
            double P_UPS_loss_kW = P_IT_kW * (1.0 / UPS_eff - 1.0);
            double P_PDU_loss_kW = PDU_frac * P_IT_kW;

            // --- Cooling Dispatch: decide mode and backup ---
            // Required cooling is IT + losses + fans + pumps (approx)
            double Q_required = P_IT_kW + P_UPS_loss_kW + P_PDU_loss_kW; // add more if needed
            // Use current ambient state for dispatch
            double Tdb_out = s_in.Tdb_C;
            double RH_out = s_in.RH;
            double P_kPa = s_in.P_kPa;
            double Twb_out = s_in.Twb_C;
            double Tdp_out = s_in.Tdp_C;
            double W_out = s_in.W;
            double T_set = sc.Tout_set_C;
            double Tdp_max = 16.0; // hardcoded max dewpoint (can be scenario param)
            com.acme.evap.CoolingDispatch.Result dispatch = com.acme.evap.CoolingDispatch.evaluate(
                    Tdb_out, RH_out, P_kPa, Twb_out, Tdp_out, W_out,
                    sc.eta_DEC, sc.eta_IEC, Q_required, T_set, Tdp_max, COP_DX);

            String mode = dispatch.mode;
            double Q_evap_kW = dispatch.Q_evap;
            double Q_DX_kW = dispatch.Q_missing;
            double P_DX_kW = dispatch.P_DX;
            // Cooling pump power (fraction of cooling load)
            double P_pump_kW = pump_frac * Q_evap_kW;

            // Fault injection: fan failure (airflow forced to zero)
            double V_air_saved = in.V_air_m3s;
            if (sc.failStartS >= 0 && t >= sc.failStartS && t < sc.failStartS + sc.failDurationS) {
                in.V_air_m3s = 0.0;
            }

            // Mode handling: DEC/IEC/HYBRID adjust efficiency and RH behavior

            // Use the selected mode for the cooling model
            EvaporativeCoolingModel.Outputs out;
            if ("IEC".equalsIgnoreCase(mode)) {
                // Indirect: use efficiency but no RH increase (keep RH_out=RH_in)
                in.efficiency = sc.eta_IEC;
                out = model.compute(in);
                out.RH_out_percent = s_in.RH;
            } else if ("DEC".equalsIgnoreCase(mode)) {
                in.efficiency = sc.eta_DEC;
                out = model.compute(in);
            } else if ("DX_ASSIST".equalsIgnoreCase(mode)) {
                // Use best available evap (80% of required, as in dispatch)
                in.efficiency = Math.max(sc.eta_DEC, sc.eta_IEC);
                out = model.compute(in);
            } else if ("HYBRID".equalsIgnoreCase(mode)) {
                double effHybrid = Math.min(0.99, Math.max(0.0, sc.eta_DEC + sc.eta_IEC));
                double effSaved = in.efficiency;
                in.efficiency = effHybrid;
                out = model.compute(in);
                // Only DEC portion adds RH; scale RH increase by eta_DEC/effHybrid
                double effRatio = (effHybrid > 1e-9) ? (sc.eta_DEC / effHybrid) : 0.0;
                double RH_dec = out.RH_out_percent;
                out.RH_out_percent = s_in.RH + effRatio * (RH_dec - s_in.RH);
                in.efficiency = effSaved;
            } else {
                // Default to DEC
                in.efficiency = sc.eta_DEC;
                out = model.compute(in);
            }

            // Simple proportional control on airflow to meet target Tout
            if (sc.enableControl) {
                double error = out.T_out_C - sc.Tout_set_C; // positive if too warm
                in.V_air_m3s = clamp(in.V_air_m3s + sc.Kp_air * error, sc.V_air_min, sc.V_air_max);
                // recompute after control
                if ("IEC".equalsIgnoreCase(sc.mode)) {
                    EvaporativeCoolingModel.Outputs out2 = model.compute(in);
                    out2.RH_out_percent = s_in.RH;
                    out = out2;
                } else if ("HYBRID".equalsIgnoreCase(sc.mode)) {
                    double effHybrid = Math.min(0.99, Math.max(0.0, sc.eta_DEC + sc.eta_IEC));
                    double effSaved = in.efficiency;
                    in.efficiency = effHybrid;
                    EvaporativeCoolingModel.Outputs out2 = model.compute(in);
                    double effRatio = (effHybrid > 1e-9) ? (sc.eta_DEC / effHybrid) : 0.0;
                    double RH_dec = out2.RH_out_percent;
                    out2.RH_out_percent = s_in.RH + effRatio * (RH_dec - s_in.RH);
                    out = out2;
                    in.efficiency = effSaved;
                } else {
                    out = model.compute(in);
                }
            }

            // Fan power and energy

            double P_fan_W = fan.powerW(sc.fan, in.V_air_m3s);
            double P_fan_kW = P_fan_W / 1000.0;
            fanEnergy_kWh += P_fan_kW * (sc.dt_s / 3600.0);

            // Integrate cooling energy and water
            // Integrate energy (kWh): Q_evap_kW * (dt_s/3600)
            cumQ_kWh += Q_evap_kW * (sc.dt_s / 3600.0);
            // Water: evaporation + drift losses - recovery
            double evap_kg = out.m_water_kg_s * sc.dt_s;
            double drift_kg = sc.driftLossFrac * evap_kg;
            double recovered_kg = sc.recoveryFrac * evap_kg;
            cumWater_kg += Math.max(0.0, evap_kg + drift_kg - recovered_kg);
            // Expanded recorder call for industry-grade CSV

            // Weather/psychro
            double Tdb_in = s_in.Tdb_C;
            double RH_in = s_in.RH;
            double Twb_in = s_in.Twb_C;
            double W_in = s_in.W;
            double h_in = s_in.h;
            double Tdp_in = s_in.Tdp_C;
            // Cooling
            double T_supply = dispatch.T_supply;
            double T_cold = dispatch.T_supply; // placeholder
            double T_hot = dispatch.T_supply + 10.0; // placeholder
            double m_evap_kg_s = out.m_water_kg_s;
            double blowdown_kg_s = 0.0; // dummy
            double makeup_kg_s = m_evap_kg_s; // dummy
            // Energy
            double E_fan_kWh_cum = fanEnergy_kWh;
            double E_DX_kWh_cum = 0.0; // not yet modeled
            double E_total_kWh_cum = fanEnergy_kWh; // can add more terms
            // DC metrics
            double P_total_kW = P_IT_kW + P_UPS_loss_kW + P_PDU_loss_kW + P_fan_kW + P_pump_kW + P_DX_kW;
            double PUE_inst = P_total_kW / P_IT_kW;
            double PUE_avg = PUE_inst; // dummy
            double WUE_inst = m_evap_kg_s * 3600.0 / P_IT_kW; // dummy
            double CUE_inst = 0.45; // dummy
            // Cost & CO2
            double cost_elec = 0.0; // dummy
            double cost_water = 0.0; // dummy
            double OPEX_total = 0.0; // dummy
            // Actual cumulative CO2 emissions
            if (Double.isNaN(cumCO2_kg))
                cumCO2_kg = 0.0;
            cumCO2_kg += P_total_kW * (sc.dt_s / 3600.0) * sc.kgCO2PerKWh;
            double CO2_kg_cum = cumCO2_kg;
            rec.record(
                    t,
                    Tdb_in, RH_in, Twb_in, W_in, h_in, Tdp_in,
                    mode, T_supply, T_cold, T_hot,
                    Q_evap_kW, P_DX_kW,
                    m_evap_kg_s, blowdown_kg_s, makeup_kg_s,
                    P_fan_kW, P_DX_kW, P_pump_kW,
                    E_fan_kWh_cum, E_DX_kWh_cum, E_total_kWh_cum,
                    P_IT_kW, P_total_kW, PUE_inst, PUE_avg, WUE_inst, CUE_inst,
                    cost_elec, cost_water, OPEX_total, CO2_kg_cum);

            // restore airflow after failure window
            in.V_air_m3s = V_air_saved;
        }
        String path = "target/evap_metrics_" + sc.name + ".csv";
        try {
            rec.writeCsv(path);
            System.out.println("Wrote evaporative metrics: " + path);
            // Print single-step results for quick view
            EvaporativeCoolingModel.Outputs out = model.compute(in);
            // PUE comparison (use mean IT load over simulation)
            double mean_P_IT_kW = 0.0;
            int steps = 0;
            for (double t2 = 0; t2 <= sc.duration_s; t2 += sc.dt_s) {
                mean_P_IT_kW += itLoadProvider.getTotalITkW((long) t2);
                steps++;
            }
            mean_P_IT_kW /= steps;
            double PUE_evap = (mean_P_IT_kW + avgFanPowerKW(fanEnergy_kWh, sc.duration_s)) / mean_P_IT_kW;
            // Append summary CSV (now with actual CO2 emissions)
            appendSummary(sc, cumQ_kWh, cumWater_kg, fanEnergy_kWh, PUE_evap, cumCO2_kg);
            System.out.printf(
                    "[%s] Mode=%s | T_out=%.2f C | Q=%.2f kW | RH_out=%.2f %% | Fan_kWh=%.3f | cumQ=%.4f kWh | Water=%.2f kg | PUE_evap=%.3f | CO2_emitted=%.2f kg\n",
                    sc.name, sc.mode, out.T_out_C, out.Q_kW, out.RH_out_percent, fanEnergy_kWh, cumQ_kWh, cumWater_kg,
                    PUE_evap, cumCO2_kg);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static double avgFanPowerKW(double fanEnergy_kWh, double duration_s) {
        double hours = Math.max(1e-9, duration_s / 3600.0);
        return fanEnergy_kWh / hours;
    }

    private static double clamp(double val, double lo, double hi) {
        return Math.max(lo, Math.min(hi, val));
    }

    private static void appendSummary(Scenario sc, double cumQ_kWh, double cumWater_kg, double fanEnergy_kWh,
            double PUE_evap, double CO2_savings_kg) throws IOException {
        String summary = "cooling-evaporative/target/evap_summaries.csv";
        String header = "scenario,mode,duration_s,dt_s,T_in_C,RH_in_percent,eta,V_air_m3s,fan_useDarcy,Pad_L_m,Pad_D_m,Area_m2,eta_fan,deltaP_Pa,driftFrac,recoveryFrac,P_IT_kW,PUE_air,PUE_liquid,cumQ_kWh,fan_kWh,water_kg,PUE_evap,CO2_savings_kg\n";
        String row = String.format(java.util.Locale.US,
                "%s,%s,%.0f,%.0f,%.2f,%.1f,%.3f,%.2f,%s,%.3f,%.3f,%.3f,%.2f,%.1f,%.3f,%.3f,%.1f,%.3f,%.3f,%.4f,%.4f,%.2f,%.3f,%.2f\n",
                sc.name, sc.mode, sc.duration_s, sc.dt_s, sc.T_in_C, sc.RH_in_percent, sc.efficiency,
                sc.V_air_m3s,
                sc.fan.useDarcy ? "true" : "false", sc.fan.L_m, sc.fan.D_m, sc.fan.area_m2, sc.fan.eta_fan,
                sc.fan.deltaP_Pa,
                sc.driftLossFrac, sc.recoveryFrac, sc.P_IT_kW, sc.PUE_air, sc.PUE_liquid, cumQ_kWh, fanEnergy_kWh,
                cumWater_kg, PUE_evap, CO2_savings_kg);
        Path p = Paths.get(summary);
        if (!Files.exists(p)) {
            Files.createDirectories(p.getParent());
            Files.write(p, header.getBytes(StandardCharsets.UTF_8));
        }
        Files.write(p, row.getBytes(StandardCharsets.UTF_8), StandardOpenOption.APPEND);
    }
}
