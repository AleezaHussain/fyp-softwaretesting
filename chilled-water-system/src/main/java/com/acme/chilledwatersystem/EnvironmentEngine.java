package com.acme.chilledwatersystem;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Step 1.2: The 8760-Hour Environment Baseline (EnvironmentEngine)
 * 
 * Handles weather data and numerical thermal boundaries for the full year.
 * Supports EPW (EnergyPlus Weather) files and CSV formats.
 */
public class EnvironmentEngine {
    private final EdgeDataCenterScenario scenario;
    private List<HourlyWeather> weatherData;
    private int currentHour;

    public EnvironmentEngine(EdgeDataCenterScenario scenario) {
        this.scenario = scenario;
        this.weatherData = new ArrayList<>();
        this.currentHour = 0;
    }

    /**
     * Initialize weather data from file or generate synthetic data
     */
    public void initialize() {
        String weatherFile = scenario.getWeatherDataFile();
        
        if (weatherFile != null && !weatherFile.isEmpty()) {
            try {
                loadWeatherData(weatherFile);
            } catch (IOException e) {
                System.err.println("Failed to load weather file: " + e.getMessage());
                generateSyntheticWeather();
            }
        } else {
            generateSyntheticWeather();
        }
        
        System.out.printf("Environment initialized with %d hours of weather data\n", weatherData.size());
    }

    /**
     * Load weather data from CSV or EPW file
     * Expected CSV format: hour,ambient_temp_c,wetbulb_temp_c,dewpoint_c,humidity_percent
     */
    private void loadWeatherData(String filePath) throws IOException {
        weatherData.clear();
        
        try (BufferedReader reader = new BufferedReader(new FileReader(filePath))) {
            String line;
            int lineNum = 0;
            
            while ((line = reader.readLine()) != null) {
                lineNum++;
                line = line.trim();
                
                // Skip empty lines and comments
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                
                // Skip header line
                if (lineNum == 1 && line.toLowerCase().contains("hour")) {
                    continue;
                }
                
                String[] parts = line.split(",");
                if (parts.length >= 3) {
                    try {
                        int hour = Integer.parseInt(parts[0].trim());
                        double ambientC = Double.parseDouble(parts[1].trim());
                        double wetbulbC = Double.parseDouble(parts[2].trim());
                        double dewpointC = parts.length > 3 ? Double.parseDouble(parts[3].trim()) : wetbulbC - 2.0;
                        double humidity = parts.length > 4 ? Double.parseDouble(parts[4].trim()) : 50.0;
                        
                        weatherData.add(new HourlyWeather(hour, ambientC, wetbulbC, dewpointC, humidity));
                    } catch (NumberFormatException e) {
                        // Skip malformed lines
                    }
                }
            }
        }
        
        if (weatherData.isEmpty()) {
            throw new IOException("No valid weather data found in file");
        }
    }

    /**
     * Generate synthetic weather data for testing (8760 hours)
     * Creates a realistic annual temperature profile with diurnal variation
     */
    private void generateSyntheticWeather() {
        weatherData.clear();
        
        for (int hour = 0; hour < 8760; hour++) {
            int dayOfYear = hour / 24;
            int hourOfDay = hour % 24;
            
            // Annual temperature variation (sinusoidal)
            double annualMean = 20.0; // Average annual temperature
            double annualAmplitude = 10.0; // Seasonal variation
            double annualPhase = (dayOfYear / 365.0) * 2 * Math.PI - Math.PI / 2; // Peak in summer
            double dailyMean = annualMean + annualAmplitude * Math.sin(annualPhase);
            
            // Diurnal temperature variation
            double diurnalAmplitude = 6.0; // Day-night variation
            double diurnalPhase = (hourOfDay / 24.0) * 2 * Math.PI - Math.PI / 2; // Peak at 3 PM
            double ambientC = dailyMean + diurnalAmplitude * Math.sin(diurnalPhase);
            
            // Wet bulb is typically 2-5°C below ambient
            double wetbulbC = ambientC - 3.0;
            
            // Dew point is typically 5-10°C below ambient
            double dewpointC = ambientC - 7.0;
            
            // Relative humidity (40-70% typical range)
            double humidity = 50.0 + 15.0 * Math.sin(annualPhase);
            
            weatherData.add(new HourlyWeather(hour, ambientC, wetbulbC, dewpointC, humidity));
        }
    }

    /**
     * Get weather data for a specific hour
     */
    public HourlyWeather getWeather(int hour) {
        if (weatherData.isEmpty()) {
            return new HourlyWeather(hour, 20.0, 18.0, 15.0, 50.0);
        }
        
        int index = hour % weatherData.size();
        return weatherData.get(index);
    }

    /**
     * Advance to next hour and return weather
     */
    public HourlyWeather nextHour() {
        HourlyWeather weather = getWeather(currentHour);
        currentHour++;
        return weather;
    }

    /**
     * Check if current conditions are within safe operating boundaries
     */
    public boolean isSafeOperation(int hour) {
        HourlyWeather weather = getWeather(hour);
        return scenario.isWithinThermalBoundaries(weather.ambientTempC, weather.dewpointC);
    }

    /**
     * Get count of hours that exceed thermal boundaries
     */
    public int countUnsafeHours() {
        int count = 0;
        for (int hour = 0; hour < weatherData.size(); hour++) {
            if (!isSafeOperation(hour)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Reset to beginning of simulation
     */
    public void reset() {
        currentHour = 0;
    }

    // Getters
    public int getCurrentHour() {
        return currentHour;
    }

    public int getTotalHours() {
        return weatherData.size();
    }

    public EdgeDataCenterScenario getScenario() {
        return scenario;
    }
    
    /**
     * Get ambient temperature for a specific hour (1-8760)
     * Phase 2 Part 2 compatibility method
     */
    public double getAmbientTemperature(int hour) {
        HourlyWeather weather = getWeather(hour - 1); // Convert to 0-based index
        return weather.ambientTempC;
    }
    
    /**
     * Get wet-bulb temperature for a specific hour (1-8760)
     * Phase 2 Part 2 compatibility method
     */
    public double getWetBulbTemperature(int hour) {
        HourlyWeather weather = getWeather(hour - 1); // Convert to 0-based index
        return weather.wetbulbTempC;
    }

    /**
     * Inner class to hold hourly weather data
     */
    public static class HourlyWeather {
        public final int hour;
        public final double ambientTempC;
        public final double wetbulbTempC;
        public final double dewpointC;
        public final double relativeHumidity;

        public HourlyWeather(int hour, double ambientTempC, double wetbulbTempC, 
                           double dewpointC, double relativeHumidity) {
            this.hour = hour;
            this.ambientTempC = ambientTempC;
            this.wetbulbTempC = wetbulbTempC;
            this.dewpointC = dewpointC;
            this.relativeHumidity = relativeHumidity;
        }

        @Override
        public String toString() {
            return String.format("Hour %d: Ambient=%.1f°C, WetBulb=%.1f°C, DewPoint=%.1f°C, RH=%.1f%%",
                hour, ambientTempC, wetbulbTempC, dewpointC, relativeHumidity);
        }
    }
}
