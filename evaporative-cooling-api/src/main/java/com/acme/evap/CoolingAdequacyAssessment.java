package com.acme.evap;

import java.util.ArrayList;
import java.util.List;

/**
 * Engineering-grade cooling adequacy assessment system.
 * Transforms the model from calculator to decision-support tool.
 */
public class CoolingAdequacyAssessment {
    
    public enum Status {
        COOLING_SUFFICIENT,
        LOCAL_HOTSPOTS,
        CLIMATE_LIMITED,
        INSUFFICIENT_COOLING
    }
    
    public static class Checks {
        public boolean heat_balance = false;
        public boolean inlet_temperature_ok = false;
        public boolean humidity_ok = false;
        public boolean energy_efficiency_ok = false;
        
        public Checks(boolean heatBalance, boolean inletTempOk, boolean humidityOk, boolean energyEffOk) {
            this.heat_balance = heatBalance;
            this.inlet_temperature_ok = inletTempOk;
            this.humidity_ok = humidityOk;
            this.energy_efficiency_ok = energyEffOk;
        }
    }
    
    public static class KeyMetrics {
        public double max_inlet_temp_c;
        public double cooling_capacity_kw;
        public double heat_load_kw;
        public double pue_avg;
        public double max_humidity_percent;
        public double min_wetbulb_depression_c;
        
        public KeyMetrics(double maxInletTemp, double coolingCapacity, double heatLoad, 
                         double pueAvg, double maxHumidity, double minWetbulbDepression) {
            this.max_inlet_temp_c = maxInletTemp;
            this.cooling_capacity_kw = coolingCapacity;
            this.heat_load_kw = heatLoad;
            this.pue_avg = pueAvg;
            this.max_humidity_percent = maxHumidity;
            this.min_wetbulb_depression_c = minWetbulbDepression;
        }
    }
    
    public static class Assessment {
        public Status status;
        public double confidence;
        public Checks checks;
        public KeyMetrics key_metrics;
        public List<String> engineering_notes;
        public List<String> recommendations;
        
        public Assessment(Status status, double confidence, Checks checks, 
                         KeyMetrics keyMetrics, List<String> notes, List<String> recommendations) {
            this.status = status;
            this.confidence = confidence;
            this.checks = checks;
            this.key_metrics = keyMetrics;
            this.engineering_notes = notes;
            this.recommendations = recommendations;
        }
    }
    
    // ASHRAE temperature limits for data centers
    private static final double ASHRAE_MIN_INLET_C = 18.0;
    private static final double ASHRAE_MAX_INLET_C = 27.0;
    private static final double ASHRAE_RECOMMENDED_MAX_C = 25.0;
    
    // Evaporative cooling limits
    private static final double MAX_EFFECTIVE_HUMIDITY = 80.0;
    private static final double MIN_WETBULB_DEPRESSION = 5.0; // T_dry - T_wet minimum
    
    // Energy efficiency limits
    private static final double MAX_ACCEPTABLE_PUE = 1.5;
    private static final double GOOD_PUE_THRESHOLD = 1.3;
    
    /**
     * Perform comprehensive cooling adequacy assessment
     */
    public static Assessment evaluate(double coolingCapacityKW, double heatLoadKW, 
                                    double maxInletTempC, double maxHumidityPercent,
                                    double minWetbulbDepressionC, double avgPUE,
                                    String coolingMode, double ambientTempC) {
        
        // ✅ CHECK 1: Heat Balance (most critical)
        boolean heatBalanced = coolingCapacityKW >= heatLoadKW;
        double heatDeficit = Math.max(0, heatLoadKW - coolingCapacityKW);
        double heatDeficitPercent = heatLoadKW > 0 ? (heatDeficit / heatLoadKW) * 100 : 0;
        
        // ✅ CHECK 2: Rack Inlet Temperature Compliance
        boolean inletTempOk = maxInletTempC <= ASHRAE_MAX_INLET_C;
        boolean inletTempRecommended = maxInletTempC <= ASHRAE_RECOMMENDED_MAX_C;
        
        // ✅ CHECK 3: Humidity Feasibility (evaporative-specific)
        boolean humidityOk = maxHumidityPercent <= MAX_EFFECTIVE_HUMIDITY;
        boolean wetbulbDepressionOk = minWetbulbDepressionC >= MIN_WETBULB_DEPRESSION;
        boolean evapEffective = humidityOk && wetbulbDepressionOk;
        
        // ✅ CHECK 4: Energy Efficiency Sanity Check
        boolean energyEfficient = avgPUE <= MAX_ACCEPTABLE_PUE;
        boolean energyGood = avgPUE <= GOOD_PUE_THRESHOLD;
        
        // 🧠 Determine Overall Status
        Status status;
        double confidence;
        
        if (!heatBalanced) {
            status = Status.INSUFFICIENT_COOLING;
            confidence = 0.95; // High confidence - clear thermal deficit
        } else if (!inletTempOk) {
            status = Status.LOCAL_HOTSPOTS;
            confidence = 0.90; // High confidence - temperature measurements
        } else if (!evapEffective) {
            status = Status.CLIMATE_LIMITED;
            confidence = 0.85; // Good confidence - climate data based
        } else {
            status = Status.COOLING_SUFFICIENT;
            confidence = inletTempRecommended && energyGood ? 0.95 : 0.80;
        }
        
        // Create checks object
        Checks checks = new Checks(heatBalanced, inletTempOk, evapEffective, energyEfficient);
        
        // Create key metrics
        KeyMetrics keyMetrics = new KeyMetrics(maxInletTempC, coolingCapacityKW, heatLoadKW, 
                                              avgPUE, maxHumidityPercent, minWetbulbDepressionC);
        
        // 📝 Generate Engineering Notes
        List<String> engineeringNotes = generateEngineeringNotes(
            heatBalanced, heatDeficitPercent, inletTempOk, maxInletTempC,
            evapEffective, maxHumidityPercent, minWetbulbDepressionC,
            energyEfficient, avgPUE, coolingMode
        );
        
        // 🔧 Generate Recommendations
        List<String> recommendations = generateRecommendations(
            status, heatDeficitPercent, maxInletTempC, maxHumidityPercent,
            minWetbulbDepressionC, avgPUE, coolingMode, ambientTempC
        );
        
        return new Assessment(status, confidence, checks, keyMetrics, engineeringNotes, recommendations);
    }
    
    private static List<String> generateEngineeringNotes(boolean heatBalanced, double heatDeficitPercent,
                                                        boolean inletTempOk, double maxInletTempC,
                                                        boolean evapEffective, double maxHumidityPercent,
                                                        double minWetbulbDepressionC, boolean energyEfficient,
                                                        double avgPUE, String coolingMode) {
        List<String> notes = new ArrayList<>();
        
        // Heat balance analysis
        if (!heatBalanced) {
            notes.add(String.format("Cooling capacity is %.1f%% lower than IT heat load during peak conditions", 
                                   heatDeficitPercent));
        } else {
            notes.add("Heat balance maintained - total cooling capacity meets or exceeds heat generation");
        }
        
        // Temperature compliance
        if (!inletTempOk) {
            notes.add(String.format("Rack inlet temperatures reached %.1f°C, exceeding ASHRAE Class A1 limit (27°C)", 
                                   maxInletTempC));
        } else if (maxInletTempC > ASHRAE_RECOMMENDED_MAX_C) {
            notes.add(String.format("Inlet temperatures (%.1f°C) within limits but above recommended threshold (25°C)", 
                                   maxInletTempC));
        }
        
        // Evaporative effectiveness
        if (!evapEffective) {
            if (maxHumidityPercent > MAX_EFFECTIVE_HUMIDITY) {
                notes.add(String.format("High ambient humidity (%.1f%%) reduces evaporative cooling effectiveness", 
                                       maxHumidityPercent));
            }
            if (minWetbulbDepressionC < MIN_WETBULB_DEPRESSION) {
                notes.add(String.format("Low wet-bulb depression (%.1f°C) limits evaporative cooling potential", 
                                       minWetbulbDepressionC));
            }
        }
        
        // Energy efficiency
        if (!energyEfficient) {
            notes.add(String.format("PUE of %.2f exceeds recommended threshold (1.5) indicating inefficient operation", 
                                   avgPUE));
        } else if (avgPUE <= GOOD_PUE_THRESHOLD) {
            notes.add(String.format("Excellent energy efficiency achieved (PUE: %.2f)", avgPUE));
        }
        
        // Mode-specific notes
        if ("DEC".equalsIgnoreCase(coolingMode)) {
            notes.add("Direct evaporative cooling adds humidity to supply air - monitor dewpoint limits");
        } else if ("IEC".equalsIgnoreCase(coolingMode)) {
            notes.add("Indirect evaporative cooling maintains supply air humidity");
        }
        
        return notes;
    }
    
    private static List<String> generateRecommendations(Status status, double heatDeficitPercent,
                                                       double maxInletTempC, double maxHumidityPercent,
                                                       double minWetbulbDepressionC, double avgPUE,
                                                       String coolingMode, double ambientTempC) {
        List<String> recommendations = new ArrayList<>();
        
        switch (status) {
            case INSUFFICIENT_COOLING:
                if (heatDeficitPercent > 20) {
                    recommendations.add("Add supplemental DX cooling - evaporative capacity insufficient");
                    recommendations.add("Consider hybrid cooling architecture for this climate");
                } else {
                    recommendations.add(String.format("Increase evaporative airflow by ~%.0f%%", 
                                                     Math.ceil(heatDeficitPercent * 1.2)));
                }
                recommendations.add("Reduce IT load density or improve server efficiency");
                break;
                
            case LOCAL_HOTSPOTS:
                recommendations.add("Improve cold aisle containment to reduce bypass airflow");
                recommendations.add("Increase supply airflow rate by 15-25%");
                if (maxInletTempC > 30) {
                    recommendations.add("Add spot cooling for high-density racks");
                }
                recommendations.add("Verify rack airflow distribution and server fan operation");
                break;
                
            case CLIMATE_LIMITED:
                if (maxHumidityPercent > 85) {
                    recommendations.add("Switch to indirect evaporative cooling (IEC) for high humidity periods");
                    recommendations.add("Consider dew-point cooling or M-cycle IEC for better humidity tolerance");
                }
                if (minWetbulbDepressionC < 3) {
                    recommendations.add("Add DX cooling backup for low wet-bulb depression conditions");
                }
                recommendations.add("Implement climate-based cooling mode switching");
                break;
                
            case COOLING_SUFFICIENT:
                if (avgPUE > 1.3) {
                    recommendations.add("Optimize fan speeds and pump operation to improve energy efficiency");
                }
                recommendations.add("System operating within design parameters");
                if ("DEC".equalsIgnoreCase(coolingMode) && ambientTempC < 25) {
                    recommendations.add("Consider IEC mode during cooler periods to reduce water consumption");
                }
                break;
        }
        
        // Universal recommendations based on conditions
        if (avgPUE > 1.4) {
            recommendations.add("Review auxiliary power consumption - fans, pumps, controls");
        }
        
        if (maxHumidityPercent > 70 && "DEC".equalsIgnoreCase(coolingMode)) {
            recommendations.add("Monitor supply air dewpoint to prevent condensation issues");
        }
        
        return recommendations;
    }
}