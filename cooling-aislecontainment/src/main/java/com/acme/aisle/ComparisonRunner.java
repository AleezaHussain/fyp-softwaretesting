package com.acme.aisle;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

public class ComparisonRunner {
    static class Result {
        String technique;
        Double pue;
        Double coolingWh;
        Double tReturnC;
        Double deltaTC;
        List<String> raw = new ArrayList<>();
    }

    public static void main(String[] args) throws Exception {
        Path root = findProjectRoot();
        List<Result> results = new ArrayList<>();

        // 1) Evaporative Cooling
        results.add(runAndParse(
                root,
                List.of("mvn","-q","-pl","cooling-evaporative","exec:java"),
                "Evaporative"
        ));

        // 2) Python Hot/Cold Aisle
        List<String> pyCmd = detectPython();
        pyCmd.add(root.resolve("simulations").resolve("hot_cold_aisle").resolve("hot_cold_aisle_sim.py").toString());
        results.add(runAndParse(root, pyCmd, "HotColdAisle-Python"));

        // 3) Java Aisle Containment
        results.add(runAndParse(
                root,
                List.of("mvn","-q","-pl","cooling-aislecontainment","exec:java","-Daisle.runner=java"),
                "AisleContainment-Java"
        ));

        // Write consolidated CSV
        Path outDir = root.resolve("comparisons").resolve("results");
        Files.createDirectories(outDir);
        Path csv = outDir.resolve("cooling_comparison.csv");
        try (BufferedWriter bw = Files.newBufferedWriter(csv, StandardCharsets.UTF_8)) {
            bw.write("Technique,PUE,Cooling_Wh,T_return_C,DeltaT_C\n");
            for (Result r : results) {
                bw.write(String.format(java.util.Locale.US,
                        "%s,%s,%s,%s,%s\n",
                        r.technique,
                        fmt(r.pue), fmt(r.coolingWh), fmt(r.tReturnC), fmt(r.deltaTC))
                );
            }
        }
        System.out.println("Wrote comparison: " + csv.toString());

        // Also print a small table
        System.out.println("\n=== Cooling Techniques Comparison ===");
        for (Result r : results) {
            System.out.printf(java.util.Locale.US,
                    "%s -> PUE=%.3f, Cooling_Wh=%.1f, T_return=%.2f C, ΔT=%.2f C%n",
                    r.technique, nz(r.pue), nz(r.coolingWh), nz(r.tReturnC), nz(r.deltaTC));
        }
    }

    private static Result runAndParse(Path cwd, List<String> cmd, String technique) throws Exception {
        System.out.println("\n>>> Running: " + String.join(" ", cmd));
        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.directory(cwd.toFile());
        pb.redirectErrorStream(true);
        Process p = pb.start();
        Result res = new Result();
        res.technique = technique;
        try (BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) {
                res.raw.add(line);
                parseLine(line, res);
            }
        }
        int code = p.waitFor();
        if (code != 0) {
            System.err.println("Command failed ("+technique+") with code " + code);
        }
        // As a fallback, try to parse alternate format lines (avg_PUE / Cooling_Wh lines)
        if (res.pue == null || res.coolingWh == null || res.tReturnC == null || res.deltaTC == null) {
            for (String l : res.raw) parseAlternate(l, res);
        }
        return res;
    }

    private static void parseLine(String line, Result r) {
        // Standardized one-line: PUE_avg=1.250 | Cooling_Wh=420.1 | T_return=26.17 C | ΔT=1.17 C
        if (!line.contains("PUE_avg=")) return;
        try {
            String[] parts = line.split("\\|");
            for (String part : parts) {
                String s = part.trim();
                if (s.startsWith("PUE_avg=")) {
                    r.pue = Double.parseDouble(s.substring("PUE_avg=".length()));
                } else if (s.startsWith("Cooling_Wh=")) {
                    r.coolingWh = Double.parseDouble(s.substring("Cooling_Wh=".length()));
                } else if (s.startsWith("T_return=")) {
                    r.tReturnC = Double.parseDouble(s.substring("T_return=".length()).replace(" C",""));
                } else if (s.startsWith("ΔT=") || s.startsWith("?T=")) {
                    r.deltaTC = Double.parseDouble(s.substring(s.indexOf('=')+1).replace(" C",""));
                }
            }
        } catch (Exception ignore) { }
    }

    private static void parseAlternate(String line, Result r) {
        // Try looser patterns like: avg_PUE: 1.23 ... Cooling_Wh: 42.0 ... T_hot_return: x ... DeltaT: y
        Pattern pueP = Pattern.compile("avg_PUE[:=]\\s*([0-9.]+)");
        Pattern coolP = Pattern.compile("Cooling_Wh[:=]\\s*([0-9.]+)");
        Pattern trP = Pattern.compile("T_(?:hot_)?return[:=]\\s*([0-9.]+)");
        Pattern dtP = Pattern.compile("DeltaT[:=]\\s*([0-9.]+)");
        Matcher m;
        if (r.pue == null && (m = pueP.matcher(line)).find()) r.pue = parseD(m.group(1));
        if (r.coolingWh == null && (m = coolP.matcher(line)).find()) r.coolingWh = parseD(m.group(1));
        if (r.tReturnC == null && (m = trP.matcher(line)).find()) r.tReturnC = parseD(m.group(1));
        if (r.deltaTC == null && (m = dtP.matcher(line)).find()) r.deltaTC = parseD(m.group(1));
    }

    private static Double parseD(String s) { try { return Double.parseDouble(s); } catch(Exception e){ return null; } }
    private static String fmt(Double d) { return d==null?"":String.format(java.util.Locale.US, "%f", d); }
    private static double nz(Double d) { return d==null?Double.NaN:d; }

    private static Path findProjectRoot() throws IOException {
        Path p = Paths.get("").toAbsolutePath();
        for (int i=0;i<6;i++) {
            if (Files.exists(p.resolve("pom.xml")) && Files.exists(p.resolve("simulations"))) return p;
            p = p.getParent();
        }
        return Paths.get("").toAbsolutePath();
    }

    private static List<String> detectPython() {
        if (isOnPath("python")) return new ArrayList<>(List.of("python"));
        if (isOnPath("py")) return new ArrayList<>(List.of("py","-3"));
        throw new IllegalStateException("Python 3 not found on PATH");
    }
    private static boolean isOnPath(String exe) {
        String path = System.getenv("PATH");
        if (path == null) return false;
        String[] parts = path.split(File.pathSeparator);
        for (String dir : parts) {
            Path p = Paths.get(dir).resolve(exe + (isWindows()?".exe":""));
            if (Files.exists(p)) return true;
        }
        return false;
    }
    private static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }
}
