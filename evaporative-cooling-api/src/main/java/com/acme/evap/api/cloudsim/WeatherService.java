package com.acme.evap.api.cloudsim;

import java.util.ArrayList;
import java.util.List;

/**
 * PHASE 2: Weather Service
 * 
 * Maps CloudSim simulation time (0-8760 hours) to weather data
 * Provides ambient conditions for thermal calculations
 */
public class WeatherService {
    
    private final List<WeatherConditions> hourlyWeatherData;
    private final int totalHours;
    
    /**
     * Constructor with hourly weather data
     */
    public WeatherService(List<WeatherConditions> hourlyWeatherData) {
        this.hourlyWeatherData = new ArrayList<>(hourlyWeatherData);
        this.totalHours = hourlyWeatherData.size();
    }
    
    /**
     * Get weather conditions at specific simulation time
     * 
     * @param simulationTime CloudSim simulation time (in hours)
     * @return Weather conditions for that hour
     */
    public WeatherConditions getWeatherAt(double simulationTime) {
        // Convert simulation time to hour index
        int hourIndex = (int) Math.floor(simulationTime);
        
        // Handle wraparound for multi-year simulations
        hourIndex = hourIndex % totalHours;
        
        // Ensure valid index
        if (hourIndex < 0 || hourIndex >= totalHours) {
            // Return default weather if out of bounds
            return new WeatherConditions(25.0, 50.0, 101.3);
        }
        
        return hourlyWeatherData.get(hourIndex);
    }
    
    /**
     * Get weather for specific hour (0-8759)
     */
    public WeatherConditions getWeatherForHour(int hour) {
        if (hour < 0 || hour >= totalHours) {
            return new WeatherConditions(25.0, 50.0, 101.3);
        }
        return hourlyWeatherData.get(hour);
    }
    
    /**
     * Get total hours of weather data
     */
    public int getTotalHours() {
        return totalHours;
    }
    
    /**
     * Get average temperature across all hours
     */
    public double getAverageTemperature() {
        return hourlyWeatherData.stream()
            .mapToDouble(w -> w.dryBulbTempC)
            .average()
            .orElse(25.0);
    }
    
    /**
     * Get average humidity across all hours
     */
    public double getAverageHumidity() {
        return hourlyWeatherData.stream()
            .mapToDouble(w -> w.relativeHumidity)
            .average()
            .orElse(50.0);
    }
    
    /**
     * Get maximum temperature
     */
    public double getMaxTemperature() {
        return hourlyWeatherData.stream()
            .mapToDouble(w -> w.dryBulbTempC)
            .max()
            .orElse(35.0);
    }
    
    /**
     * Get minimum temperature
     */
    public double getMinTemperature() {
        return hourlyWeatherData.stream()
            .mapToDouble(w -> w.dryBulbTempC)
            .min()
            .orElse(15.0);
    }
    
    /**
     * Create weather service from CSV-like data
     */
    public static WeatherService fromHourlyData(double[] temperatures, double[] humidities, double[] pressures) {
        List<WeatherConditions> weatherData = new ArrayList<>();
        
        int hours = Math.min(temperatures.length, Math.min(humidities.length, pressures.length));
        
        for (int i = 0; i < hours; i++) {
            weatherData.add(new WeatherConditions(
                temperatures[i],
                humidities[i],
                pressures[i]
            ));
        }
        
        return new WeatherService(weatherData);
    }
    
    /**
     * Create weather service with constant conditions (for testing)
     */
    public static WeatherService createConstant(double tempC, double humidity, double pressureKPa, int hours) {
        List<WeatherConditions> weatherData = new ArrayList<>();
        
        for (int i = 0; i < hours; i++) {
            weatherData.add(new WeatherConditions(tempC, humidity, pressureKPa));
        }
        
        return new WeatherService(weatherData);
    }
}
