package com.acme.chilledwatersystem.api.util;

/**
 * Air Density Calculator for HVAC Applications
 * 
 * Calculates local air density based on atmospheric pressure and temperature
 * using the Ideal Gas Law. Critical for accurate fan power and heat transfer
 * calculations in CRAH units and cooling towers.
 * 
 * Formula: ρ = P / (R * T)
 * where:
 *   ρ = air density (kg/m³)
 *   P = atmospheric pressure (Pa)
 *   R = specific gas constant for dry air = 287.05 J/(kg·K)
 *   T = absolute temperature (K)
 */
public class AirDensityCalculator {

    // Physical constants
    private static final double R_DRY_AIR = 287.05; // J/(kg·K) - Specific gas constant for dry air
    private static final double STANDARD_PRESSURE_PA = 101325.0; // Pa at sea level
    private static final double STANDARD_DENSITY = 1.225; // kg/m³ at 15°C, sea level

    /**
     * Calculate air density from pressure and temperature
     * 
     * @param pressurePa Atmospheric pressure in Pascals
     * @param temperatureC Air temperature in Celsius
     * @return Air density in kg/m³
     */
    public static double calculateDensity(double pressurePa, double temperatureC) {
        // Convert temperature to Kelvin
        double temperatureK = temperatureC + 273.15;

        // Apply Ideal Gas Law: ρ = P / (R * T)
        double density = pressurePa / (R_DRY_AIR * temperatureK);

        return density;
    }

    /**
     * Calculate air density from altitude (using standard atmosphere model)
     * 
     * @param altitudeM Altitude above sea level in meters
     * @param temperatureC Air temperature in Celsius
     * @return Air density in kg/m³
     */
    public static double calculateDensityFromAltitude(double altitudeM, double temperatureC) {
        // Standard atmosphere pressure at altitude
        // P = P0 * (1 - 0.0065 * h / 288.15)^5.255
        double pressurePa = STANDARD_PRESSURE_PA * 
            Math.pow(1.0 - (0.0065 * altitudeM / 288.15), 5.255);

        return calculateDensity(pressurePa, temperatureC);
    }

    /**
     * Calculate density ratio compared to standard conditions
     * Used for correcting fan performance curves
     * 
     * @param pressurePa Atmospheric pressure in Pascals
     * @param temperatureC Air temperature in Celsius
     * @return Density ratio (actual/standard)
     */
    public static double calculateDensityRatio(double pressurePa, double temperatureC) {
        double actualDensity = calculateDensity(pressurePa, temperatureC);
        return actualDensity / STANDARD_DENSITY;
    }

    /**
     * Correct fan power for altitude/density
     * Fan power scales with density: P_actual = P_standard * (ρ_actual / ρ_standard)
     * 
     * @param standardFanPowerKW Fan power at standard conditions
     * @param pressurePa Actual atmospheric pressure
     * @param temperatureC Actual air temperature
     * @return Corrected fan power in kW
     */
    public static double correctFanPower(double standardFanPowerKW, 
                                        double pressurePa, 
                                        double temperatureC) {
        double densityRatio = calculateDensityRatio(pressurePa, temperatureC);
        return standardFanPowerKW * densityRatio;
    }

    /**
     * Calculate mass flow rate from volumetric flow rate
     * m_dot = ρ * Q
     * 
     * @param volumetricFlowM3s Volumetric flow rate in m³/s
     * @param pressurePa Atmospheric pressure in Pascals
     * @param temperatureC Air temperature in Celsius
     * @return Mass flow rate in kg/s
     */
    public static double calculateMassFlowRate(double volumetricFlowM3s,
                                              double pressurePa,
                                              double temperatureC) {
        double density = calculateDensity(pressurePa, temperatureC);
        return density * volumetricFlowM3s;
    }

    /**
     * Calculate heat transfer capacity correction for altitude
     * Q = m_dot * Cp * ΔT, where m_dot depends on density
     * 
     * @param standardCapacityKW Heat transfer capacity at standard conditions
     * @param pressurePa Actual atmospheric pressure
     * @param temperatureC Actual air temperature
     * @return Corrected capacity in kW
     */
    public static double correctHeatTransferCapacity(double standardCapacityKW,
                                                    double pressurePa,
                                                    double temperatureC) {
        double densityRatio = calculateDensityRatio(pressurePa, temperatureC);
        return standardCapacityKW * densityRatio;
    }

    /**
     * Get atmospheric conditions report
     * 
     * @param pressurePa Atmospheric pressure in Pascals
     * @param temperatureC Air temperature in Celsius
     * @param altitudeM Altitude in meters
     * @return Formatted report
     */
    public static String getAtmosphericReport(double pressurePa, 
                                             double temperatureC,
                                             double altitudeM) {
        double density = calculateDensity(pressurePa, temperatureC);
        double densityRatio = calculateDensityRatio(pressurePa, temperatureC);
        double standardDensityAtAlt = calculateDensityFromAltitude(altitudeM, 15.0);

        return String.format(
            "Atmospheric Conditions Report:\n" +
            "  Altitude: %.1f m\n" +
            "  Pressure: %.0f Pa (%.2f kPa)\n" +
            "  Temperature: %.1f°C\n" +
            "  Air Density: %.3f kg/m³\n" +
            "  Density Ratio: %.3f (vs. standard)\n" +
            "  Standard Density at Altitude: %.3f kg/m³\n" +
            "  Impact on Fan Power: %.1f%%\n" +
            "  Impact on Heat Transfer: %.1f%%",
            altitudeM,
            pressurePa, pressurePa / 1000.0,
            temperatureC,
            density,
            densityRatio,
            standardDensityAtAlt,
            (densityRatio - 1.0) * 100.0,
            (densityRatio - 1.0) * 100.0
        );
    }

    /**
     * Validate pressure reading for reasonableness
     * 
     * @param pressurePa Pressure in Pascals
     * @param altitudeM Expected altitude in meters
     * @return true if pressure is reasonable for altitude
     */
    public static boolean validatePressure(double pressurePa, double altitudeM) {
        // Calculate expected pressure at altitude
        double expectedPressure = STANDARD_PRESSURE_PA * 
            Math.pow(1.0 - (0.0065 * altitudeM / 288.15), 5.255);

        // Allow ±10% tolerance for weather variations
        double tolerance = 0.10;
        double minPressure = expectedPressure * (1.0 - tolerance);
        double maxPressure = expectedPressure * (1.0 + tolerance);

        if (pressurePa < minPressure || pressurePa > maxPressure) {
            System.out.println(String.format(
                "⚠️  WARNING: Pressure (%.0f Pa) outside expected range for altitude %.1f m " +
                "(expected: %.0f Pa ±10%%)",
                pressurePa, altitudeM, expectedPressure
            ));
            return false;
        }

        return true;
    }
}
