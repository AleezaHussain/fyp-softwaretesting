package com.acme.aireconcalc.cloudsim;

/**
 * Psychrometric Calculator - Advanced thermodynamic calculations for evaporative cooling
 * 
 * Implements industry-standard formulas for:
 * - Wet Bulb Temperature (Stull 2011)
 * - Dew Point Temperature (Magnus formula)
 * - Humidity Ratio
 * - Enthalpy calculations
 * 
 * These calculations are critical for determining evaporative cooling effectiveness
 * and mode selection (DEC/IEC/DX).
 */
public class PsychrometricCalculator {
    
    // Constants
    private static final double ATMOSPHERIC_PRESSURE_KPA = 101.325; // Standard atmospheric pressure at sea level
    
    /**
     * Calculate Wet Bulb Temperature using Stull 2011 formula
     * 
     * This is a simplified but accurate approximation valid for:
     * - Temperature: -20°C to 50°C
     * - Relative Humidity: 5% to 99%
     * - Accuracy: ±1°C
     * 
     * Reference: Stull, R. (2011). "Wet-Bulb Temperature from Relative Humidity and Air Temperature"
     * Journal of Applied Meteorology and Climatology, 50(11), 2267-2269.
     * 
     * @param t_db Dry bulb temperature (°C)
     * @param rh Relative humidity (0-100%)
     * @return Wet bulb temperature (°C)
     */
    public double calculateWetBulb(double t_db, double rh) {
        // Stull 2011 formula
        double t_wb = t_db * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5))
                    + Math.atan(t_db + rh)
                    - Math.atan(rh - 1.676331)
                    + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh)
                    - 4.686035;
        
        return t_wb;
    }
    
    /**
     * Calculate Dew Point Temperature using Magnus formula
     * 
     * @param t_db Dry bulb temperature (°C)
     * @param rh Relative humidity (0-100%)
     * @return Dew point temperature (°C)
     */
    public double calculateDewPoint(double t_db, double rh) {
        double a = 17.27;
        double b = 237.7;
        double alpha = ((a * t_db) / (b + t_db)) + Math.log(rh / 100.0);
        return (b * alpha) / (a - alpha);
    }
    
    /**
     * Calculate saturation vapor pressure using Antoine equation
     * 
     * @param temperature Temperature (°C)
     * @return Saturation vapor pressure (kPa)
     */
    public double calculateSaturationVaporPressure(double temperature) {
        // Antoine equation for water (valid 0-100°C)
        return 0.61121 * Math.exp((18.678 - temperature / 234.5) * (temperature / (257.14 + temperature)));
    }
    
    /**
     * Calculate humidity ratio (absolute humidity)
     * 
     * @param t_db Dry bulb temperature (°C)
     * @param rh Relative humidity (0-100%)
     * @return Humidity ratio (kg water / kg dry air)
     */
    public double calculateHumidityRatio(double t_db, double rh) {
        double p_sat = calculateSaturationVaporPressure(t_db);
        double p_vapor = p_sat * (rh / 100.0);
        
        // W = 0.622 * (p_vapor / (p_atm - p_vapor))
        return 0.622 * (p_vapor / (ATMOSPHERIC_PRESSURE_KPA - p_vapor));
    }
    
    /**
     * Calculate enthalpy of moist air
     * 
     * @param t_db Dry bulb temperature (°C)
     * @param humidityRatio Humidity ratio (kg/kg)
     * @return Enthalpy (kJ/kg dry air)
     */
    public double calculateEnthalpy(double t_db, double humidityRatio) {
        // h = 1.006*t + W*(2501 + 1.86*t)
        // where 1.006 = specific heat of dry air (kJ/kg·K)
        //       2501 = latent heat of vaporization at 0°C (kJ/kg)
        //       1.86 = specific heat of water vapor (kJ/kg·K)
        return 1.006 * t_db + humidityRatio * (2501.0 + 1.86 * t_db);
    }
    
    /**
     * Calculate evaporative cooling effectiveness
     * 
     * Effectiveness = (T_db_in - T_db_out) / (T_db_in - T_wb_in)
     * 
     * @param t_db_in Inlet dry bulb temperature (°C)
     * @param t_db_out Outlet dry bulb temperature (°C)
     * @param t_wb_in Inlet wet bulb temperature (°C)
     * @return Effectiveness (0-1)
     */
    public double calculateEffectiveness(double t_db_in, double t_db_out, double t_wb_in) {
        double maxCooling = t_db_in - t_wb_in;
        if (maxCooling <= 0) {
            return 0.0;
        }
        
        double actualCooling = t_db_in - t_db_out;
        return Math.min(1.0, actualCooling / maxCooling);
    }
    
    /**
     * Validate if conditions are suitable for evaporative cooling
     * 
     * @param t_db Dry bulb temperature (°C)
     * @param rh Relative humidity (%)
     * @param t_wb Wet bulb temperature (°C)
     * @return true if conditions are suitable
     */
    public boolean isSuitableForEvaporativeCooling(double t_db, double rh, double t_wb) {
        // Evaporative cooling works best when:
        // 1. Low humidity (RH < 60%)
        // 2. Significant wet bulb depression (T_db - T_wb > 5°C)
        // 3. Reasonable outdoor temperature (T_db < 35°C)
        
        double wetBulbDepression = t_db - t_wb;
        
        return rh < 60.0 && wetBulbDepression > 5.0 && t_db < 35.0;
    }
    
    @Override
    public String toString() {
        return "PsychrometricCalculator[Stull2011]";
    }
}
