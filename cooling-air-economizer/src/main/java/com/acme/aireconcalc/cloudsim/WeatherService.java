package com.acme.aireconcalc.cloudsim;

import com.acme.aireconcalc.WeatherData;
import java.util.List;

/**
 * Weather Service - Provides real-time weather data to CloudSim hosts
 * 
 * This service acts as a bridge between the weather data (CSV) and the
 * CloudSim simulation, providing ambient conditions at each simulation step.
 * 
 * Thread-safe singleton pattern for global access during simulation.
 */
public class WeatherService {
    
    private static WeatherService instance;
    
    private List<WeatherData> weatherData;
    private int currentHour;
    private double simulationStartTime;
    
    private WeatherService() {
        this.currentHour = 0;
        this.simulationStartTime = 0.0;
    }
    
    /**
     * Get singleton instance
     * 
     * @return WeatherService instance
     */
    public static synchronized WeatherService getInstance() {
        if (instance == null) {
            instance = new WeatherService();
        }
        return instance;
    }
    
    /**
     * Initialize weather service with weather data
     * 
     * @param weatherData List of hourly weather data
     */
    public void initialize(List<WeatherData> weatherData) {
        this.weatherData = weatherData;
        this.currentHour = 0;
        this.simulationStartTime = 0.0;
    }
    
    /**
     * Update current simulation time
     * 
     * @param simulationTime Current simulation time (seconds)
     */
    public void updateTime(double simulationTime) {
        // Convert simulation time (seconds) to hours
        int hour = (int) (simulationTime / 3600.0);
        
        // Wrap around if we exceed weather data length (for multi-day simulations)
        if (weatherData != null && !weatherData.isEmpty()) {
            this.currentHour = hour % weatherData.size();
        } else {
            this.currentHour = hour;
        }
    }
    
    /**
     * Get current outdoor temperature
     * 
     * @return Dry bulb temperature (°C)
     */
    public double getCurrentTemp() {
        if (weatherData == null || weatherData.isEmpty()) {
            // Default to moderate conditions if no weather data
            return 20.0;
        }
        
        return weatherData.get(currentHour).dryBulbC;
    }
    
    /**
     * Get current relative humidity
     * 
     * @return Relative humidity (%)
     */
    public double getCurrentRH() {
        if (weatherData == null || weatherData.isEmpty()) {
            // Default to moderate conditions if no weather data
            return 50.0;
        }
        
        return weatherData.get(currentHour).relativeHumidity;
    }
    
    /**
     * Get current weather data
     * 
     * @return WeatherData object for current hour
     */
    public WeatherData getCurrentWeather() {
        if (weatherData == null || weatherData.isEmpty()) {
            // Return default weather data
            WeatherData defaultWeather = new WeatherData();
            defaultWeather.dryBulbC = 20.0;
            defaultWeather.relativeHumidity = 50.0;
            return defaultWeather;
        }
        
        return weatherData.get(currentHour);
    }
    
    /**
     * Get weather data for a specific hour
     * 
     * @param hour Hour index
     * @return WeatherData object
     */
    public WeatherData getWeatherAtHour(int hour) {
        if (weatherData == null || weatherData.isEmpty()) {
            WeatherData defaultWeather = new WeatherData();
            defaultWeather.dryBulbC = 20.0;
            defaultWeather.relativeHumidity = 50.0;
            return defaultWeather;
        }
        
        int index = hour % weatherData.size();
        return weatherData.get(index);
    }
    
    /**
     * Get current hour index
     * 
     * @return Current hour (0-based)
     */
    public int getCurrentHour() {
        return currentHour;
    }
    
    /**
     * Check if weather service is initialized
     * 
     * @return true if weather data is loaded
     */
    public boolean isInitialized() {
        return weatherData != null && !weatherData.isEmpty();
    }
    
    /**
     * Get total hours of weather data available
     * 
     * @return Number of hours
     */
    public int getTotalHours() {
        return weatherData != null ? weatherData.size() : 0;
    }
    
    /**
     * Reset weather service (for testing)
     */
    public void reset() {
        this.weatherData = null;
        this.currentHour = 0;
        this.simulationStartTime = 0.0;
    }
    
    @Override
    public String toString() {
        if (weatherData == null || weatherData.isEmpty()) {
            return "WeatherService[uninitialized]";
        }
        
        return String.format("WeatherService[hour=%d/%d, T=%.1f°C, RH=%.1f%%]",
                           currentHour, weatherData.size(),
                           getCurrentTemp(), getCurrentRH());
    }
}
