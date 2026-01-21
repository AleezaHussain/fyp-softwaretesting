package com.acme.aireconcalc;

public class SimUtils {

    /**
     * Generates a sinusoidal daily temperature profile.
     * 
     * @param hour    Hour of the day (0-23)
     * @param minTemp Minimum temperature (e.g., at 4 AM)
     * @param maxTemp Maximum temperature (e.g., at 2 PM)
     * @return Temperature in Celsius
     */
    public static double getHourlyTempC(int hour, double minTemp, double maxTemp) {
        // Peak at 14:00 (hour 14), Low at 02:00 (hour 2)
        // Cosine wave shifted: -cos has peak at pi, trough at 0.
        // We want peak at 14.
        // 24 hours = 2*pi.
        // t_shifted = (hour - 2) * (2*pi / 24)
        double rads = (hour - 14) * (2 * Math.PI / 24);
        double amp = (maxTemp - minTemp) / 2.0;
        double avg = (maxTemp + minTemp) / 2.0;
        return avg + amp * Math.cos(rads);
    }

    /**
     * Generates a sinusoidal workload profile (utilization 0.0 - 1.0).
     * 
     * @param hour    Hour of the day
     * @param minUtil Minimum utilization (e.g., 0.2)
     * @param maxUtil Maximum utilization (e.g., 0.7)
     * @return Utilization fraction
     */
    public static double getHourlyUtilization(int hour, double minUtil, double maxUtil) {
        // Peak usually during business hours, say 14:00. Similar shape to temp.
        double rads = (hour - 14) * (2 * Math.PI / 24);
        double amp = (maxUtil - minUtil) / 2.0;
        double avg = (maxUtil + minUtil) / 2.0;
        return avg + amp * Math.cos(rads);
    }

    /**
     * Approximate enthalpy of moist air (kJ/kg).
     * 
     * @param tempC Dry bulb temperature in Celsius
     * @param rh    Relative humidity (0-100)
     * @return Enthalpy in kJ/kg
     */
    public static double calculateEnthalpy(double tempC, double rh) {
        // Formula: h = 1.006 * t + W * (2501 + 1.86 * t)
        // W (humidity ratio) approx = 0.62198 * P_vapor / (P_atm - P_vapor)
        // Magnus approx for Psat.

        double Es = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5)); // hPa
        double E = (rh / 100.0) * Es;
        double P_atm = 1013.25; // hPa usually
        double W = 0.62198 * E / (P_atm - E); // kg_water / kg_dry_air

        return 1.006 * tempC + W * (2501 + 1.86 * tempC);
    }
}
