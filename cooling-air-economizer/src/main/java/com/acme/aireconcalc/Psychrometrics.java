package com.acme.aireconcalc;

public class Psychrometrics {
    // Simple dew point calculation (approximate, Magnus formula)
    public static double calcDewPoint(double tempC, double relativeHumidity) {
        double a = 17.27;
        double b = 237.7;
        double alpha = ((a * tempC) / (b + tempC)) + Math.log(relativeHumidity / 100.0);
        return (b * alpha) / (a - alpha);
    }
}
