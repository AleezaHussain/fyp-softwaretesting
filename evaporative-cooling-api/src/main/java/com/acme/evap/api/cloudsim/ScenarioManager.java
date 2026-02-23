package com.acme.evap.api.cloudsim;

/**
 * PHASE 3: Scenario-Driven Environment Manager
 * 
 * Handles 2030 scenario modeling by adjusting ambient conditions and workload patterns:
 * - Climate change scenarios (temperature/humidity offsets)
 * - AI growth scenarios (IT load multipliers)
 * - Grid decarbonization scenarios
 * 
 * This component modifies weather data and workload parameters based on the
 * simulation year to model future conditions.
 */
public class ScenarioManager {
    
    /**
     * Predefined 2030 scenarios
     */
    public enum ScenarioType {
        BASELINE_2025(
            "baseline_2025",
            "Current climate conditions, no growth",
            0.0,    // No temperature offset
            0.0,    // No humidity adjustment
            1.0,    // No IT load growth
            0.05    // 5% grid decarbonization per year
        ),
        
        MODERATE_GROWTH_2030(
            "moderate_growth_2030",
            "Moderate climate warming + steady AI growth",
            1.0,    // +1°C warming
            5.0,    // +5% humidity
            1.5,    // 50% IT load growth
            0.07    // 7% grid decarbonization per year
        ),
        
        AI_GROWTH(
            "ai_growth",
            "Aggressive AI adoption with 2.97x load growth",
            0.5,    // +0.5°C warming
            2.0,    // +2% humidity
            2.97,   // 2.97x IT load growth (from methodology)
            0.10    // 10% grid decarbonization per year
        ),
        
        ENERGY_CARBON_PRESSURE(
            "energy_carbon_pressure",
            "High carbon pricing with aggressive decarbonization",
            0.0,    // No climate change
            0.0,    // No humidity change
            1.2,    // 20% IT load growth
            0.15    // 15% grid decarbonization per year
        ),
        
        EXTREME_CLIMATE_2030(
            "extreme_climate_2030",
            "Severe climate change scenario",
            2.5,    // +2.5°C warming
            10.0,   // +10% humidity
            1.8,    // 80% IT load growth
            0.05    // 5% grid decarbonization per year
        );
        
        public final String id;
        public final String description;
        public final double temperatureOffset;
        public final double humidityAdjustment;
        public final double itLoadMultiplier;
        public final double gridDecarbonization;
        
        ScenarioType(String id, String description, double temperatureOffset,
                    double humidityAdjustment, double itLoadMultiplier, double gridDecarbonization) {
            this.id = id;
            this.description = description;
            this.temperatureOffset = temperatureOffset;
            this.humidityAdjustment = humidityAdjustment;
            this.itLoadMultiplier = itLoadMultiplier;
            this.gridDecarbonization = gridDecarbonization;
        }
    }
    
    private final ScenarioType scenario;
    private final int startYear;
    private final int targetYear;
    
    /**
     * Constructor
     */
    public ScenarioManager(ScenarioType scenario, int startYear, int targetYear) {
        this.scenario = scenario;
        this.startYear = startYear;
        this.targetYear = targetYear;
    }
    
    /**
     * Adjust weather conditions based on scenario and current year
     * 
     * @param originalWeather Original weather conditions
     * @param currentYear Current simulation year (e.g., 2025, 2026, ...)
     * @return Adjusted weather conditions
     */
    public WeatherConditions adjustWeather(WeatherConditions originalWeather, int currentYear) {
        // Calculate progression factor (0.0 at start year, 1.0 at target year)
        double progressionFactor = calculateProgressionFactor(currentYear);
        
        // Apply temperature offset (linear progression)
        double adjustedTemp = originalWeather.dryBulbTempC + 
                             (scenario.temperatureOffset * progressionFactor);
        
        // Apply humidity adjustment (linear progression)
        double adjustedHumidity = originalWeather.relativeHumidity + 
                                 (scenario.humidityAdjustment * progressionFactor);
        
        // Clamp humidity to valid range [0, 100]
        adjustedHumidity = Math.max(0.0, Math.min(100.0, adjustedHumidity));
        
        return new WeatherConditions(
            adjustedTemp,
            adjustedHumidity,
            originalWeather.pressureKPa
        );
    }
    
    /**
     * Calculate IT load multiplier for current year
     * 
     * @param currentYear Current simulation year
     * @return IT load multiplier (1.0 = baseline, >1.0 = growth)
     */
    public double getITLoadMultiplier(int currentYear) {
        // Calculate progression factor
        double progressionFactor = calculateProgressionFactor(currentYear);
        
        // Linear interpolation from 1.0 to target multiplier
        return 1.0 + (scenario.itLoadMultiplier - 1.0) * progressionFactor;
    }
    
    /**
     * Get grid decarbonization rate for scenario
     */
    public double getGridDecarbonizationRate() {
        return scenario.gridDecarbonization;
    }
    
    /**
     * Calculate progression factor (0.0 to 1.0) based on current year
     */
    private double calculateProgressionFactor(int currentYear) {
        if (currentYear <= startYear) {
            return 0.0;
        } else if (currentYear >= targetYear) {
            return 1.0;
        } else {
            return (double) (currentYear - startYear) / (targetYear - startYear);
        }
    }
    
    /**
     * Get scenario description
     */
    public String getScenarioDescription() {
        return scenario.description;
    }
    
    /**
     * Get scenario summary
     */
    public ScenarioSummary getSummary() {
        return new ScenarioSummary(
            scenario.id,
            scenario.description,
            scenario.temperatureOffset,
            scenario.humidityAdjustment,
            scenario.itLoadMultiplier,
            scenario.gridDecarbonization,
            startYear,
            targetYear
        );
    }
    
    /**
     * Create scenario manager from string ID
     */
    public static ScenarioManager fromId(String scenarioId, int startYear, int targetYear) {
        for (ScenarioType type : ScenarioType.values()) {
            if (type.id.equalsIgnoreCase(scenarioId)) {
                return new ScenarioManager(type, startYear, targetYear);
            }
        }
        
        // Default to baseline if not found
        System.err.println("Unknown scenario ID: " + scenarioId + ", using BASELINE_2025");
        return new ScenarioManager(ScenarioType.BASELINE_2025, startYear, targetYear);
    }
    
    /**
     * Scenario summary data class
     */
    public static class ScenarioSummary {
        public final String id;
        public final String description;
        public final double temperatureOffset;
        public final double humidityAdjustment;
        public final double itLoadMultiplier;
        public final double gridDecarbonization;
        public final int startYear;
        public final int targetYear;
        
        public ScenarioSummary(String id, String description, double temperatureOffset,
                             double humidityAdjustment, double itLoadMultiplier,
                             double gridDecarbonization, int startYear, int targetYear) {
            this.id = id;
            this.description = description;
            this.temperatureOffset = temperatureOffset;
            this.humidityAdjustment = humidityAdjustment;
            this.itLoadMultiplier = itLoadMultiplier;
            this.gridDecarbonization = gridDecarbonization;
            this.startYear = startYear;
            this.targetYear = targetYear;
        }
        
        @Override
        public String toString() {
            return String.format(
                "Scenario[%s]: %s\n" +
                "  Temperature: +%.1f°C by %d\n" +
                "  Humidity: +%.1f%% by %d\n" +
                "  IT Load Growth: %.2fx by %d\n" +
                "  Grid Decarbonization: %.1f%% per year",
                id, description,
                temperatureOffset, targetYear,
                humidityAdjustment, targetYear,
                itLoadMultiplier, targetYear,
                gridDecarbonization * 100
            );
        }
    }
}
