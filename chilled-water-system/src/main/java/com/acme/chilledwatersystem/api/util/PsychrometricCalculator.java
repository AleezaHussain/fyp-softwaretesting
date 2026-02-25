package com.acme.chilledwatersystem.api.util;

/**
 * Psychrometric Calculator for HVAC and Cooling Tower Applications
 * 
 * Calculates wet bulb temperature from dry bulb temperature and relative humidity
 * using the Stull (2011) formula, which is accurate within 0.3°C for most conditions.
 * 
 * Reference: Stull, R. (2011). "Wet-Bulb Temperature from Relative Humidity and Air Temperature"
 * Journal of Applied Meteorology and Climatology, 50(11), 2267-2269.
 */
public class PsychrometricCalculator {

    /**
     * Calculate wet bulb temperature using Stull (2011) formula
     * 
     * @param dryBulbC Dry bulb temperature in Celsius
     * @param relativeHumidity Relative humidity as percentage (0-100)
     * @return Wet bulb temperature in Celsius
     * 
     * Formula: Tw = T * atan[0.151977(RH% + 8.313659)^0.5] + atan(T + RH%) - 
     *          atan(RH% - 1.676331) + 0.00391838(RH%)^1.5 * atan(0.023101 * RH%) - 4.686035
     * 
     * Valid range: -20°C ≤ T ≤ 50°C, 5% ≤ RH ≤ 99%
     * Accuracy: ±0.3°C for most conditions
     */
    public static double calculateWetBulb(double dryBulbC, double relativeHumidity) {
        // Validate inputs
        if (relativeHumidity < 0 || relativeHumidity > 100) {
            throw new IllegalArgumentException(
                String.format("Relative humidity must be between 0 and 100%%. Got: %.2f%%", relativeHumidity)
            );
        }
        
        if (dryBulbC < -50 || dryBulbC > 60) {
            throw new IllegalArgumentException(
                String.format("Dry bulb temperature out of reasonable range. Got: %.2f°C", dryBulbC)
            );
        }

        // Handle edge cases
        if (relativeHumidity == 0) {
            // At 0% RH, wet bulb approaches a theoretical minimum
            return dryBulbC - 15; // Approximate maximum depression
        }
        
        if (relativeHumidity == 100) {
            // At 100% RH, wet bulb equals dry bulb (saturated air)
            return dryBulbC;
        }

        // Apply Stull (2011) formula
        double T = dryBulbC;
        double RH = relativeHumidity;
        
        double wetBulb = T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
                        Math.atan(T + RH) - 
                        Math.atan(RH - 1.676331) +
                        0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 
                        4.686035;

        // Physical constraint: wet bulb cannot exceed dry bulb
        if (wetBulb > dryBulbC) {
            System.out.println(String.format(
                "⚠️  Calculated wet bulb (%.2f°C) > dry bulb (%.2f°C). Capping to dry bulb.",
                wetBulb, dryBulbC
            ));
            wetBulb = dryBulbC;
        }

        // Physical constraint: wet bulb cannot be too far below dry bulb
        double maxDepression = getMaxWetBulbDepression(dryBulbC, relativeHumidity);
        if (dryBulbC - wetBulb > maxDepression) {
            System.out.println(String.format(
                "⚠️  Wet bulb depression (%.2f°C) exceeds physical limit. Adjusting.",
                dryBulbC - wetBulb
            ));
            wetBulb = dryBulbC - maxDepression;
        }

        return wetBulb;
    }

    /**
     * Calculate maximum possible wet bulb depression based on dry bulb and RH
     * This prevents physically impossible values
     */
    private static double getMaxWetBulbDepression(double dryBulbC, double relativeHumidity) {
        // At very low RH, maximum depression is limited by evaporation physics
        // Approximate maximum: 15-20°C depression at very low RH
        double rhFactor = (100 - relativeHumidity) / 100.0;
        return 20.0 * rhFactor; // Linear approximation
    }

    /**
     * Calculate dew point temperature from dry bulb and relative humidity
     * Uses Magnus-Tetens formula
     * 
     * @param dryBulbC Dry bulb temperature in Celsius
     * @param relativeHumidity Relative humidity as percentage (0-100)
     * @return Dew point temperature in Celsius
     */
    public static double calculateDewPoint(double dryBulbC, double relativeHumidity) {
        if (relativeHumidity <= 0 || relativeHumidity > 100) {
            throw new IllegalArgumentException("Relative humidity must be between 0 and 100%");
        }

        // Magnus-Tetens formula constants
        double a = 17.27;
        double b = 237.7;

        double alpha = ((a * dryBulbC) / (b + dryBulbC)) + Math.log(relativeHumidity / 100.0);
        double dewPoint = (b * alpha) / (a - alpha);

        return dewPoint;
    }

    /**
     * Validate that wet bulb temperature is physically possible
     * 
     * @param dryBulbC Dry bulb temperature
     * @param wetBulbC Wet bulb temperature
     * @param relativeHumidity Relative humidity
     * @return true if valid, false otherwise
     */
    public static boolean isValidWetBulb(double dryBulbC, double wetBulbC, double relativeHumidity) {
        // Wet bulb must be <= dry bulb
        if (wetBulbC > dryBulbC) {
            return false;
        }

        // At 100% RH, wet bulb should equal dry bulb
        if (relativeHumidity >= 99.5 && Math.abs(wetBulbC - dryBulbC) > 0.5) {
            return false;
        }

        // Depression should not exceed physical limits
        double depression = dryBulbC - wetBulbC;
        double maxDepression = getMaxWetBulbDepression(dryBulbC, relativeHumidity);
        
        return depression <= maxDepression;
    }

    /**
     * Calculate cooling tower approach temperature
     * Approach = Supply Water Temp - Wet Bulb Temp
     * 
     * Typical values:
     * - Good: 2-4°C
     * - Acceptable: 4-7°C
     * - Poor: >7°C
     * 
     * @param supplyWaterTempC Supply water temperature from cooling tower
     * @param wetBulbC Ambient wet bulb temperature
     * @return Approach temperature in Celsius
     */
    public static double calculateCoolingTowerApproach(double supplyWaterTempC, double wetBulbC) {
        return supplyWaterTempC - wetBulbC;
    }

    /**
     * Check if cooling tower can physically achieve target supply temperature
     * 
     * @param targetSupplyTempC Target supply water temperature
     * @param wetBulbC Ambient wet bulb temperature
     * @param minApproachC Minimum achievable approach (typically 2-3°C)
     * @return true if achievable, false if physically impossible
     */
    public static boolean isCoolingTowerCapable(double targetSupplyTempC, double wetBulbC, double minApproachC) {
        double requiredApproach = targetSupplyTempC - wetBulbC;
        return requiredApproach >= minApproachC;
    }

    /**
     * Calculate maximum achievable supply water temperature for a cooling tower
     * 
     * @param wetBulbC Ambient wet bulb temperature
     * @param approachC Cooling tower approach (typically 2-7°C)
     * @return Maximum supply water temperature achievable
     */
    public static double calculateMaxSupplyTemp(double wetBulbC, double approachC) {
        return wetBulbC + approachC;
    }

    /**
     * Assess 2030 heatwave risk for evaporative cooling systems
     * 
     * @param wetBulbC Projected wet bulb temperature
     * @param targetSupplyTempC Target chilled water supply temperature (typically 7-12°C)
     * @return Risk assessment message
     */
    public static String assessHeatwaveRisk(double wetBulbC, double targetSupplyTempC) {
        double minApproach = 2.0; // Minimum physically achievable approach
        
        if (!isCoolingTowerCapable(targetSupplyTempC, wetBulbC, minApproach)) {
            return String.format(
                "⚠️ CRITICAL: Wet bulb (%.1f°C) too high for target supply temp (%.1f°C). " +
                "Evaporative cooling physically impossible. Required approach: %.1f°C < minimum %.1f°C",
                wetBulbC, targetSupplyTempC, targetSupplyTempC - wetBulbC, minApproach
            );
        }
        
        double approach = calculateCoolingTowerApproach(targetSupplyTempC, wetBulbC);
        
        if (approach < 4.0) {
            return String.format(
                "⚠️ WARNING: Tight approach (%.1f°C). Cooling tower will operate at maximum capacity.",
                approach
            );
        } else if (approach < 7.0) {
            return String.format(
                "✅ ACCEPTABLE: Approach (%.1f°C) within normal operating range.",
                approach
            );
        } else {
            return String.format(
                "✅ GOOD: Comfortable approach (%.1f°C). Cooling tower has capacity margin.",
                approach
            );
        }
    }
}
