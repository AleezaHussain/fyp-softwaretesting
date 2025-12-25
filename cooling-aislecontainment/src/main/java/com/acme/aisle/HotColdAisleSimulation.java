package com.acme.aisle;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public class HotColdAisleSimulation {
    // Physical constants
    private static final double RHO_AIR = 1.2;            // kg/m3
    private static final double CP_AIR_J_PER_KG_C = 1005; // J/kg-C

    static class Scenario {
        String id;
        int racks;
        double itLoad_kW;          // total IT load (kW)
        double airflow_mps;        // average face velocity (m/s)
        double rackFaceArea_m2;    // per-rack face area (m2)
        boolean containment;       // true = contained, false = open
        double leakageAlpha;       // recirculation fraction (0..1)
        double bypassBeta;         // bypass fraction (0..1)
        double ambient_C;          // supply/cold aisle temp (C)
        double COP;                // cooling COP
        double duration_s;         // total time (s)
        double dt_s;               // step (s)

        static Scenario of(String id, int racks, double itLoad_kW, double airflow_mps, boolean containment) {
            Scenario s = new Scenario();
            s.id = id; s.racks = racks; s.itLoad_kW = itLoad_kW; s.airflow_mps = airflow_mps;
            s.rackFaceArea_m2 = 0.5; s.containment = containment; s.ambient_C = 25.0; s.COP = 4.0;
            s.leakageAlpha = containment ? 0.06 : 0.18; // example defaults
            s.bypassBeta = containment ? 0.05 : 0.20;
            s.duration_s = 600; s.dt_s = 5;
            return s;
        }
    }

    static class Step {
        double t;
        double T_supply_C;
        double T_return_C;
        double deltaT_C;
        double P_CRAC_W;
        double PUE;
        double[] rackIn_C;
        double[] rackOut_C;
    }

    public static void main(String[] args) {
        List<Scenario> scenarios = loadScenarios();
        for (Scenario sc : scenarios) runScenario(sc);
    }

    private static List<Scenario> loadScenarios() {
        // Try to load from resource aisle_config.json; if not found, use defaults
        try (InputStream is = HotColdAisleSimulation.class.getClassLoader().getResourceAsStream("aisle_config.json")) {
            if (is != null) {
                String json = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                return parseJsonScenarios(json);
            }
        } catch (IOException ignore) { }
        // Defaults per user spec
        List<Scenario> list = new ArrayList<>();
        list.add(Scenario.of("S1_4racks_10kW_open", 4, 10.0, 0.8, false));
        list.add(Scenario.of("S2_4racks_10kW_contained", 4, 10.0, 0.8, true));
        Scenario s3 = Scenario.of("S3_8racks_20kW_contained_leaky", 8, 20.0, 1.0, true);
        s3.leakageAlpha = 0.15; s3.bypassBeta = 0.12; // increased leakage
        list.add(s3);
        return list;
    }

    // Minimal JSON parser for our expected structure (array of flat objects)
    private static List<Scenario> parseJsonScenarios(String json) {
        // To avoid external deps, very basic parsing (expects well-formed keys)
        List<Scenario> list = new ArrayList<>();
        String[] blocks = json.split("\\{\\s*\\\"id\\\"");
        for (int i = 1; i < blocks.length; i++) {
            String blk = "{\"id\"" + blocks[i];
            Scenario s = new Scenario();
            s.id = extractString(blk, "id", "scn"+i);
            s.racks = (int)extractDouble(blk, "racks", 4);
            s.itLoad_kW = extractDouble(blk, "itLoad_kW", 10.0);
            s.airflow_mps = extractDouble(blk, "airflow_mps", 0.8);
            s.rackFaceArea_m2 = extractDouble(blk, "rackFaceArea_m2", 0.5);
            s.containment = extractBoolean(blk, "containment", true);
            s.leakageAlpha = extractDouble(blk, "leakageAlpha", s.containment ? 0.06 : 0.18);
            s.bypassBeta = extractDouble(blk, "bypassBeta", s.containment ? 0.05 : 0.20);
            s.ambient_C = extractDouble(blk, "ambient_C", 25.0);
            s.COP = extractDouble(blk, "COP", 4.0);
            s.duration_s = extractDouble(blk, "duration_s", 600);
            s.dt_s = extractDouble(blk, "dt_s", 5);
            list.add(s);
        }
        return list;
    }

    private static String extractString(String blk, String key, String def) {
        String pat = "\""+key+"\"\s*:\s*\"";
        int i = blk.indexOf(pat);
        if (i<0) return def;
        int j = blk.indexOf('"', i+pat.length());
        if (j<0) return def;
        return blk.substring(i+pat.length(), j);
    }
    private static double extractDouble(String blk, String key, double def) {
        String pat = "\""+key+"\"\s*:\s*";
        int i = blk.indexOf(pat);
        if (i<0) return def;
        int j = i+pat.length();
        int k = j;
        while (k<blk.length() && "0123456789+-.eE".indexOf(blk.charAt(k))>=0) k++;
        try { return Double.parseDouble(blk.substring(j,k)); } catch(Exception e){ return def; }
    }
    private static boolean extractBoolean(String blk, String key, boolean def) {
        String pat = "\""+key+"\"\s*:\s*";
        int i = blk.indexOf(pat);
        if (i<0) return def;
        if (blk.regionMatches(true, i+pat.length(), "true", 0, 4)) return true;
        if (blk.regionMatches(true, i+pat.length(), "false", 0, 5)) return false;
        return def;
    }

    private static void runScenario(Scenario sc) {
        System.out.println("\n=== Scenario: "+sc.id+" ===");
        double Vdot_total_m3s = sc.airflow_mps * sc.rackFaceArea_m2 * sc.racks; // total volumetric flow
        double mdot_kg_s = RHO_AIR * Vdot_total_m3s;
        double P_IT_W = sc.itLoad_kW * 1000.0;

        List<Step> rows = new ArrayList<>();
        double cumCoolingWh = 0.0;
        for (double t=0; t<=sc.duration_s; t+=sc.dt_s) {
            Step s = new Step();
            s.t = t; s.T_supply_C = sc.ambient_C;

            // Ideal deltaT from all loads
            double deltaT_ideal_C = P_IT_W / Math.max(1e-9, mdot_kg_s * CP_AIR_J_PER_KG_C);
            // Apply bypass/leakage
            double effectiveDeltaT_C = deltaT_ideal_C * (1 - sc.bypassBeta) * (1 - sc.leakageAlpha);

            // Per-rack distribution (simple equally-distributed load)
            s.rackIn_C = new double[sc.racks];
            s.rackOut_C = new double[sc.racks];
            for (int r=0; r<sc.racks; r++) {
                double inlet = s.T_supply_C + sc.leakageAlpha * (r/(double)Math.max(1, sc.racks-1)) * effectiveDeltaT_C;
                double dT_r = (1 - sc.bypassBeta) * (effectiveDeltaT_C / Math.max(1, sc.racks));
                double outlet = inlet + dT_r;
                s.rackIn_C[r] = inlet; s.rackOut_C[r] = outlet;
            }

            double T_hot_rack_exhaust = s.rackOut_C[sc.racks-1];
            double mixing = sc.containment ? (0.10 + sc.bypassBeta) : (0.20 + sc.leakageAlpha);
            s.T_return_C = (1 - mixing) * T_hot_rack_exhaust + mixing * s.T_supply_C;
            s.deltaT_C = s.T_return_C - s.T_supply_C;

            double Q_removed_W = P_IT_W; // steady-state
            s.P_CRAC_W = Q_removed_W / Math.max(0.1, sc.COP);
            double P_nonIT_W = 0; // kept minimal in this module
            double P_total_W = P_IT_W + P_nonIT_W + s.P_CRAC_W;
            s.PUE = P_total_W / Math.max(1e-9, P_IT_W);

            cumCoolingWh += s.P_CRAC_W * (sc.dt_s/3600.0);
            rows.add(s);
        }

        // Write CSV
        try {
            Path outDir = Paths.get("cooling-aislecontainment/target");
            Files.createDirectories(outDir);
            Path csv = outDir.resolve("aisle_metrics_"+sc.id+".csv");
            try (BufferedWriter bw = Files.newBufferedWriter(csv, StandardCharsets.UTF_8)) {
                bw.write("time_s,T_supply_C,T_return_C,deltaT_C,P_CRAC_W,PUE,rack_in_C,rack_out_C\n");
                for (Step s : rows) {
                    bw.write(String.format(java.util.Locale.US,
                        "%.0f,%.3f,%.3f,%.3f,%.3f,%.3f,%s,%s\n",
                        s.t, s.T_supply_C, s.T_return_C, s.deltaT_C, s.P_CRAC_W, s.PUE,
                        joinTemps(s.rackIn_C), joinTemps(s.rackOut_C))
                    );
                }
            }
            System.out.printf("PUE_avg=%.3f | Cooling_Wh=%.1f | T_return=%.2f C | ΔT=%.2f C%n",
                rows.stream().mapToDouble(x->x.PUE).average().orElse(0.0),
                cumCoolingWh,
                rows.get(rows.size()-1).T_return_C,
                rows.get(rows.size()-1).deltaT_C
            );
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static String joinTemps(double[] arr) {
        StringBuilder sb = new StringBuilder();
        for (int i=0;i<arr.length;i++) {
            if (i>0) sb.append(";");
            sb.append(String.format(java.util.Locale.US, "%.2f", arr[i]));
        }
        return sb.toString();
    }
}
