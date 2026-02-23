package com.acme.evap.api.cloudsim;

/**
 * PHASE 2: Weather Conditions Data Class
 * 
 * Represents ambient weather conditions at a specific time
 */
public class WeatherConditions {
    
    public final double dryBulbTempC;      // Dry bulb temperature (°C)
    public final double relativeHumidity;  // Relative humidity (%)
    public final double pressureKPa;       // Atmospheric pressure (kPa)
    
    /**
     * Constructor
     */
    public WeatherConditions(double dryBulbTempC, double relativeHumidity, double pressureKPa) {
        this.dryBulbTempC = dryBulbTempC;
        this.relativeHumidity = relativeHumidity;
        this.pressureKPa = pressureKPa;
    }
    
    /**
     * Calculate wet bulb temperature (simplified approximation)
     */
    public double getWetBulbTempC() {
        return dryBulbTempC * Math.atan(0.151977 * Math.sqrt(relativeHumidity + 8.313659)) +
               Math.atan(dryBulbTempC + relativeHumidity) - 
               Math.atan(relativeHumidity - 1.676331) +
               0.00391838 * Math.pow(relativeHumidity, 1.5) * 
               Math.atan(0.023101 * relativeHumidity) - 4.686035;
    }
    
    /**
     * Calculate wet bulb depression (dry bulb - wet bulb)
     */
    public double getWetBulbDepressionC() {
        return dryBulbTempC - getWetBulbTempC();
    }
    
    /**
     * Check if conditions are favorable for evaporative cooling
     * Good conditions: Low humidity (<60%) and high wet bulb depression (>5°C)
     */
    public boolean isFavorableForEvaporativeCooling() {
        return relativeHumidity < 60.0 && getWetBulbDepressionC() > 5.0;
    }
    
    @Override
    public String toString() {
        return String.format(
            "Weather[DB=%.1f°C, RH=%.1f%%, P=%.1fkPa, WB=%.1f°C, WBD=%.1f°C]",
            dryBulbTempC, relativeHumidity, pressureKPa, 
            getWetBulbTempC(), getWetBulbDepressionC()
        );
    }
}
