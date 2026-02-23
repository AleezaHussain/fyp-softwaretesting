package com.acme.chilledwatersystem;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.List;

/**
 * Climate provider: tries to load hourly ambient and wet-bulb temps from a CSV
 * file (columns: hour,ambient,wetbulb). Falls back to a simple sinusoid if
 * no file is found.
 */
public class ClimateProfile {
    private final String label;
    private double[] ambientHourly;
    private double[] wetbulbHourly;

    public ClimateProfile(String label) {
        this.label = label;
        // default to a 24-hour profile; may be overridden by CSV or numeric profiles
        this.ambientHourly = new double[24];
        this.wetbulbHourly = new double[24];
        // built-in named profiles
        if (label != null && label.equalsIgnoreCase("hot-humid")) {
            createHotHumid();
            return;
        }

        // numeric label support: "35" -> constant ambient 35°C, wetbulb = ambient-2
        // or "35,30" -> ambient=35, wetbulb=30
        if (label != null) {
            try {
                String s = label.trim();
                if (s.contains(",")) {
                    String[] p = s.split(",");
                    double a = Double.parseDouble(p[0].trim());
                    double w = Double.parseDouble(p[1].trim());
                    for (int h = 0; h < 24; h++) {
                        ambientHourly[h] = a;
                        wetbulbHourly[h] = w;
                    }
                    return;
                } else {
                    double a = Double.parseDouble(s);
                    for (int h = 0; h < 24; h++) {
                        ambientHourly[h] = a;
                        wetbulbHourly[h] = a - 2.0;
                    }
                    return;
                }
            } catch (Exception e) {
                // not numeric, continue to CSV/fallback
            }
        }

        boolean loaded = tryLoadCsv(label);
        if (!loaded)
            createFallback();
    }

    private boolean tryLoadCsv(String label) {
        try {
            File f = new File(label);
            if (!f.exists())
                return false;

            List<Double> amb = new ArrayList<>();
            List<Double> wb = new ArrayList<>();
            try (BufferedReader r = new BufferedReader(new FileReader(f))) {
                String line;
                while ((line = r.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#"))
                        continue;
                    String[] parts = line.split(",");
                    if (parts.length < 3)
                        continue;
                    amb.add(Double.parseDouble(parts[1]));
                    wb.add(Double.parseDouble(parts[2]));
                }
            }
            int n = amb.size();
            if (n == 0)
                return false;

            ambientHourly = new double[n];
            wetbulbHourly = new double[n];
            for (int h = 0; h < n; h++) {
                ambientHourly[h] = amb.get(h);
                wetbulbHourly[h] = wb.get(h);
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void createFallback() {
        for (int h = 0; h < 24; h++) {
            ambientHourly[h] = 20 + 6 * Math.sin((h / 24.0) * 2 * Math.PI);
            wetbulbHourly[h] = ambientHourly[h] - 2.0;
        }
    }

    /**
     * Hot and humid profile: high ambient, wet-bulb close to ambient to simulate
     * humid conditions.
     */
    private void createHotHumid() {
        for (int h = 0; h < 24; h++) {
            // hotter baseline (e.g., 32°C) with modest diurnal swing
            ambientHourly[h] = 32 + 4 * Math.sin((h / 24.0) * 2 * Math.PI);
            // very humid: wet-bulb only slightly lower than ambient (small delta)
            wetbulbHourly[h] = ambientHourly[h] - 0.5;
        }
    }

    public double getAmbientTemp(int hour) {
        int n = ambientHourly.length;
        if (n == 0)
            return 0.0;
        return ambientHourly[hour % n];
    }

    public double getWetBulbTemp(int hour) {
        int n = wetbulbHourly.length;
        if (n == 0)
            return 0.0;
        return wetbulbHourly[hour % n];
    }

    public String getLabel() {
        return label;
    }
}
