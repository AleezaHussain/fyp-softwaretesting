package com.acme.chilledwatersystem;

import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

public class SimConfig {
    private final Properties p = new Properties();

    public SimConfig() {
        // load defaults
        try (InputStream in = getClass().getResourceAsStream("/config.properties")) {
            if (in != null)
                p.load(in);
        } catch (Exception e) {
            // ignore
        }
    }

    public void loadFromFile(Path file) {
        try (InputStream in = Files.newInputStream(file)) {
            p.load(in);
        } catch (Exception e) {
            // ignore — keep defaults
        }
    }

    public double getDouble(String key, double def) {
        try {
            return Double.parseDouble(p.getProperty(key, Double.toString(def)));
        } catch (Exception e) {
            return def;
        }
    }

    public int getInt(String key, int def) {
        try {
            return Integer.parseInt(p.getProperty(key, Integer.toString(def)));
        } catch (Exception e) {
            return def;
        }
    }

    public String getString(String key, String def) {
        return p.getProperty(key, def);
    }
}
