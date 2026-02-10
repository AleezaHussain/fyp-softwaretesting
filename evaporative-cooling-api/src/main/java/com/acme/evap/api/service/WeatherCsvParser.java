package com.acme.evap.api.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses weather CSV files for 8760-hour simulations
 * Supports standard weather data formats (TMY, EPW-style CSV)
 */
public class WeatherCsvParser {
    
    /**
     * Parse weather CSV file into hourly weather points
     * Expected format: Hour,DryBulbTemp_C,RelativeHumidity_%,Pressure_kPa,WindSpeed_m/s
     */
    public List<EvaporativeCoolingService.WeatherPoint> parseWeatherCsv(MultipartFile file) throws IOException {
        List<EvaporativeCoolingService.WeatherPoint> weatherData = new ArrayList<>();
        
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean isFirstLine = true;
            int lineNumber = 0;
            
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                
                // Skip header line
                if (isFirstLine) {
                    isFirstLine = false;
                    if (line.toLowerCase().contains("hour") || line.toLowerCase().contains("time")) {
                        continue; // Skip header
                    }
                }
                
                // Skip empty lines
                if (line.trim().isEmpty()) {
                    continue;
                }
                
                try {
                    EvaporativeCoolingService.WeatherPoint point = parseWeatherLine(line, lineNumber);
                    weatherData.add(point);
                } catch (Exception e) {
                    throw new IOException("Error parsing line " + lineNumber + ": " + e.getMessage());
                }
            }
        }
        
        // Validate data size
        if (weatherData.isEmpty()) {
            throw new IOException("No weather data found in CSV file");
        }
        
        if (weatherData.size() != 8760) {
            throw new IOException(String.format(
                "Weather file contains %d hours, expected 8760 hours for annual simulation", 
                weatherData.size()));
        }
        
        // Validate data ranges
        validateWeatherData(weatherData);
        
        return weatherData;
    }
    
    /**
     * Parse single line of weather data
     * Supports multiple CSV formats with flexible column mapping
     */
    private EvaporativeCoolingService.WeatherPoint parseWeatherLine(String line, int lineNumber) {
        String[] parts = line.split(",");
        
        if (parts.length < 4) {
            throw new IllegalArgumentException("Insufficient columns, expected at least 4 (Hour,Temp,RH,Pressure)");
        }
        
        try {
            // Try different column arrangements
            double dryBulbTempC, relativeHumidity, pressure, windSpeed = 0.0;
            
            if (parts.length >= 5) {
                // Format: Hour,DryBulbTemp_C,RelativeHumidity_%,Pressure_kPa,WindSpeed_m/s
                dryBulbTempC = Double.parseDouble(parts[1].trim());
                relativeHumidity = Double.parseDouble(parts[2].trim());
                pressure = Double.parseDouble(parts[3].trim());
                windSpeed = Double.parseDouble(parts[4].trim());
            } else {
                // Format: Hour,DryBulbTemp_C,RelativeHumidity_%,Pressure_kPa
                dryBulbTempC = Double.parseDouble(parts[1].trim());
                relativeHumidity = Double.parseDouble(parts[2].trim());
                pressure = Double.parseDouble(parts[3].trim());
                windSpeed = 2.0; // Default wind speed
            }
            
            // Convert units if needed
            if (pressure > 200) {
                pressure = pressure / 1000.0; // Convert Pa to kPa
            }
            
            if (relativeHumidity > 1.0 && relativeHumidity <= 100.0) {
                // Already in percentage
            } else if (relativeHumidity <= 1.0) {
                relativeHumidity = relativeHumidity * 100.0; // Convert fraction to percentage
            }
            
            return new EvaporativeCoolingService.WeatherPoint(dryBulbTempC, relativeHumidity, pressure, windSpeed);
            
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid number format in weather data");
        }
    }
    
    /**
     * Validate weather data ranges for reasonableness
     */
    private void validateWeatherData(List<EvaporativeCoolingService.WeatherPoint> weatherData) throws IOException {
        List<String> errors = new ArrayList<>();
        
        for (int i = 0; i < weatherData.size(); i++) {
            EvaporativeCoolingService.WeatherPoint point = weatherData.get(i);
            
            // Temperature validation (-50°C to 60°C)
            if (point.dryBulbTempC < -50 || point.dryBulbTempC > 60) {
                errors.add(String.format("Hour %d: Temperature %.1f°C out of range (-50 to 60°C)", 
                                        i + 1, point.dryBulbTempC));
            }
            
            // Humidity validation (0% to 100%)
            if (point.relativeHumidity < 0 || point.relativeHumidity > 100) {
                errors.add(String.format("Hour %d: Relative humidity %.1f%% out of range (0-100%%)", 
                                        i + 1, point.relativeHumidity));
            }
            
            // Pressure validation (80 to 110 kPa)
            if (point.pressure < 80 || point.pressure > 110) {
                errors.add(String.format("Hour %d: Pressure %.1f kPa out of range (80-110 kPa)", 
                                        i + 1, point.pressure));
            }
            
            // Wind speed validation (0 to 50 m/s)
            if (point.windSpeed < 0 || point.windSpeed > 50) {
                errors.add(String.format("Hour %d: Wind speed %.1f m/s out of range (0-50 m/s)", 
                                        i + 1, point.windSpeed));
            }
            
            // Stop after 10 errors to avoid overwhelming output
            if (errors.size() >= 10) {
                errors.add("... (additional validation errors truncated)");
                break;
            }
        }
        
        if (!errors.isEmpty()) {
            throw new IOException("Weather data validation failed:\n" + String.join("\n", errors));
        }
    }
    
    /**
     * Generate sample weather CSV for testing
     */
    public static String generateSampleWeatherCsv() {
        StringBuilder csv = new StringBuilder();
        csv.append("Hour,DryBulbTemp_C,RelativeHumidity_%,Pressure_kPa,WindSpeed_m/s\n");
        
        for (int hour = 1; hour <= 8760; hour++) {
            // Simple sinusoidal temperature pattern
            double dayOfYear = (hour - 1) / 24.0;
            double hourOfDay = (hour - 1) % 24;
            
            // Annual temperature variation (20°C to 40°C)
            double annualTemp = 30.0 + 10.0 * Math.sin(2 * Math.PI * dayOfYear / 365.0);
            
            // Daily temperature variation (±5°C)
            double dailyTemp = annualTemp + 5.0 * Math.sin(2 * Math.PI * (hourOfDay - 6) / 24.0);
            
            // Humidity inversely related to temperature (30% to 80%)
            double humidity = 80.0 - (dailyTemp - 20.0) * 1.5;
            humidity = Math.max(30.0, Math.min(80.0, humidity));
            
            // Standard atmospheric pressure with small variation
            double pressure = 101.3 + 2.0 * Math.sin(2 * Math.PI * dayOfYear / 365.0);
            
            // Wind speed with daily pattern
            double windSpeed = 2.0 + 1.0 * Math.sin(2 * Math.PI * hourOfDay / 24.0);
            
            csv.append(String.format("%d,%.1f,%.1f,%.1f,%.1f\n", 
                                   hour, dailyTemp, humidity, pressure, windSpeed));
        }
        
        return csv.toString();
    }
}