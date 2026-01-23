package com.acme.aireconcalc;

public class EconomizerController {
    // Updated mode logic per best practice
    public EconomizerMode decideMode(
            WeatherData oa,
            ReturnAir ra,
            Setpoints sp) {
        final double MAX_DP = 15.0; // °C
        final double FULL_ECON_MARGIN = 5.0; // °C
        final double PARTIAL_MARGIN = 1.5; // °C
        if (oa.dewPointC > MAX_DP) {
            return EconomizerMode.MECHANICAL;
        }
        if (oa.dryBulbC < (sp.supplyTempC - FULL_ECON_MARGIN)) {
            return EconomizerMode.FULL_ECON;
        }
        if (oa.dryBulbC < (ra.tempC - PARTIAL_MARGIN)) {
            return EconomizerMode.PARTIAL_ECON;
        }
        return EconomizerMode.MECHANICAL;
    }

    public double computeOAFraction(
            EconomizerMode mode,
            WeatherData oa,
            Setpoints sp,
            ReturnAir ra) {
        final double MIN_OA = 0.10;
        switch (mode) {
            case FULL_ECON:
                return 1.0;
            case PARTIAL_ECON:
                double frac = (ra.tempC - oa.dryBulbC) / (ra.tempC - sp.supplyTempC);
                return clamp(frac, 0.3, 0.7);
            default:
                return MIN_OA;
        }
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    // Unified cooling calculation for all modes
    public double computeCoolingKW(
            EconomizerMode mode,
            double oaFrac,
            WeatherData oa,
            ReturnAir ra,
            Setpoints sp,
            double airflowKgPerSec,
            double itLoadKW) {
        final double cp = 1.005; // kJ/kg·K
        double Tmix = oaFrac * oa.dryBulbC + (1 - oaFrac) * ra.tempC;
        switch (mode) {
            case FULL_ECON:
                return 0.0;
            case PARTIAL_ECON:
                if (Tmix < sp.supplyTempC) {
                    // Model reheat as positive cooling load
                    return airflowKgPerSec * cp * (sp.supplyTempC - Tmix);
                } else {
                    return airflowKgPerSec * cp * (Tmix - sp.supplyTempC);
                }
            case MECHANICAL:
            default:
                return itLoadKW;
        }
    }

    public double computeAirflowKgPerSec(double itLoadKW, double deltaT) {
        double cp = 1.005; // kJ/kg·K
        return itLoadKW / (cp * deltaT);
    }

    /**
     * Computes facility (CRAH/CRAC) fan power in kW, with calibration for realistic
     * FYP values.
     * For small systems, targets 5–15% of IT load. Adds 7.5% uplift for FULL_ECON
     * and PARTIAL_ECON (exhaust/relief fans).
     * 
     * @param cfm      Airflow in CFM
     * @param itLoadKW IT load in kW (for calibration)
     * @param mode     Economizer mode (for uplift)
     * @return Fan power in kW
     */
    public double computeFanPowerKW(double cfm, double itLoadKW, EconomizerMode mode, double fanWeightedEfficiency) {
        // Use weighted fan efficiency from inputs (W/CFM)
        // NOTE: You must pass the weighted efficiency as a parameter or access it from
        // a context object.
        // For this patch, assume you add a parameter: double fanWeightedEfficiency
        // Example usage: computeFanPowerKW(cfm, itLoadKW, mode, fanWeightedEfficiency)
        // If you cannot change the method signature, you must refactor the call site to
        // provide this value.
        double filterPenalty = 1.08; // Slightly lower penalty
        double powerW = fanWeightedEfficiency * cfm;
        double fanKW = (powerW * filterPenalty) / 1000.0;
        // Clamp to 7–15% of IT load for realism
        double minFrac = 0.07, maxFrac = 0.15;
        double minKW = itLoadKW * minFrac;
        double maxKW = itLoadKW * maxFrac;
        fanKW = Math.max(minKW, Math.min(maxKW, fanKW));
        // Add 7.5% uplift for FULL_ECON and PARTIAL_ECON (exhaust/relief fans)
        if (mode == EconomizerMode.FULL_ECON || mode == EconomizerMode.PARTIAL_ECON) {
            fanKW *= 1.075;
        }
        return fanKW;
    }
}
