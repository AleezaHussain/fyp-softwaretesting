package com.example.coolingeconomizer.model;

import java.util.List;

public class SimulationRequest {
    public int numberOfRacks;
    public int serversPerRack;
    public double serverMaxPowerW;
    public double serverIdlePowerW;
    public double averageUtilization;
    public double peakUtilization;
    public List<FanConfig> fans;
    public String country;
    public double electricityTariff;
    public double carbonIntensity;
    public List<WeatherData> weatherData;

    public static class FanConfig {
        public String type;
        public double efficiencyWPerCFM;
        public int quantity;
    }

    public static class WeatherData {
        public String timestamp;
        public double dryBulb;
        public double relativeHumidity;
        // Add more fields as needed
    }
}

