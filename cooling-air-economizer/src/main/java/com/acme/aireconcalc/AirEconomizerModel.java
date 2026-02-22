package com.acme.aireconcalc;

/**
 * Dynamic physics engine for cooling economizer.
 * Calculates instantaneous energy, carbon, and thermal performance based on
 * physics-based free cooling formulas and ASHRAE guidelines.
 */
public class AirEconomizerModel {

    public static class StepResult {
        public double timestampHour;
        public double outdoorTempC;
        public double outdoorRH;

        public double itLoad_kW;
        public double requiredAirflow_CFM;
        public boolean airflowViolation;

        public String mode; // "FULL_ECON", "PARTIAL_TRIM", "MECHANICAL_ONLY"

        public double coolingLoad_kW; // Total heat to remove (same as IT load here)
        public double q_free_kW; // Heat removed by free cooling
        public double mech_load_kW; // Heat removed by mechanical system

        public double fanPower_kW;
        public double mechPower_kW;
        public double totalPower_kW;

        public double pue;
        public double cue; // kgCO2/kWh_IT

        public String violationMsg;
    }

    /**
     * Computes a single hour's performance.
     * 
     * @param in Input parameters
     * @param weather Weather data for this hour
     * @param hour Hour index
     * @param utilization CPU utilization (0-1) - can be from CloudSim or synthetic
     * @return Step result with cooling performance
     */
    public StepResult computeTimeStep(EconomizerInputs in, WeatherData weather, int hour, double utilization) {
        StepResult r = new StepResult();
        r.timestampHour = hour;
        r.outdoorTempC = weather.dryBulbC;
        r.outdoorRH = weather.relativeHumidity;

        // ---------------------------------------------------------------------
        // 1) Dynamic Server Power Modeling (AI-Aware)
        // P_IT(t) = N * Factor * [P_idle + (P_max - P_idle) * u(t)]
        // utilization is expected as 0..1 (e.g., 0.7). If you pass 70, fix caller.
        // ---------------------------------------------------------------------
        double scaledPowerW = (in.numServers * in.computeIntensityFactor *
                (in.serverIdlePowerW + (in.serverMaxPowerW - in.serverIdlePowerW) * utilization));
        r.itLoad_kW = scaledPowerW / 1000.0;

        // Total cooling load to remove is the IT heat (simple model)
        r.coolingLoad_kW = r.itLoad_kW;

        // ---------------------------------------------------------------------
        // 2) Required Airflow (Heat removal constraint)
        // V_req (CFM) = (P_IT_kW * 3160) / (rho * Cp * deltaT)
        // rho=1.2, Cp=1.006, deltaT = Tr (30) - Ts (18) = 12
        // ---------------------------------------------------------------------
        double deltaT_design = 30.0 - 18.0;
        double rho = 1.2;
        double cp = 1.006;
        r.requiredAirflow_CFM = (r.itLoad_kW * 3160.0) / (rho * cp * deltaT_design);

        if (r.requiredAirflow_CFM > in.maxAirflowCFM) {
            r.airflowViolation = true;
            r.violationMsg = String.format(
                    "VIOLATION: %.0f CFM > Limit %.0f. Air-Side Economization is insufficient for this AI density. " +
                            "RECOMMENDATION: Upgrade to Liquid Cooling (Direct-to-Chip).",
                    r.requiredAirflow_CFM, in.maxAirflowCFM);
        } else {
            r.airflowViolation = false;
        }

        // ---------------------------------------------------------------------
        // 3) Economizer Mode Logic (Fix: don't fully disable econ on high RH)
        // - Temperature decides whether economizer can operate at all.
        // - Humidity decides FULL vs PARTIAL (limit outdoor air fraction).
        // ---------------------------------------------------------------------
        boolean tempOK = weather.dryBulbC <= in.economizerMaxOutdoorTemp;
        boolean humidityOK = weather.relativeHumidity <= in.economizerMaxHumidity;
        // System.out.println(
        // "ECON CHECK | hour=" + hour +
        // " | dryBulbC=" + weather.dryBulbC +
        // " | RH=" + weather.relativeHumidity +
        // " | tempLimit=" + in.economizerMaxOutdoorTemp +
        // " | humidityLimit=" + in.economizerMaxHumidity +
        // " | tempOK=" + tempOK +
        // " | humidityOK=" + humidityOK
        // );

        // Log humidity and temperature checks for FULL_ECON logic
        // System.out.println(String.format(
        // "[ECON] Hour %d | dryBulbC=%.2f | RH=%.2f | tempLimit=%.2f |
        // humidityLimit=%.2f | tempOK=%b | humidityOK=%b",
        // hour, weather.dryBulbC, weather.relativeHumidity,
        // in.economizerMaxOutdoorTemp, in.economizerMaxHumidity,
        // tempOK, humidityOK));

        if (tempOK && humidityOK) {
            r.mode = "FULL_ECON";
        } else if (tempOK) {
            r.mode = "PARTIAL_TRIM";
        } else {
            r.mode = "MECHANICAL_ONLY";
        }

        // Outdoor Air Fraction used by the physics (FULL=1.0, PARTIAL=minOA, MECH=0)
        double oaFraction;
        if ("FULL_ECON".equals(r.mode)) {
            oaFraction = 1.0;
        } else if ("PARTIAL_TRIM".equals(r.mode)) {
            oaFraction = in.minOutdoorAirFraction; // e.g., 0.2
        } else {
            oaFraction = 0.0;
        }

        // ---------------------------------------------------------------------
        // 4) Weighted Fan Efficiency
        // NOTE: Your inputs currently treat "efficiency" like a multiplier.
        // This preserves your existing behavior for compatibility with your outputs.
        // ---------------------------------------------------------------------
        double totalFans = in.bestQuantity + in.averageQuantity + in.legacyQuantity;
        double weightedSum = (in.bestQuantity * in.bestEfficiency) +
                (in.averageQuantity * in.averageEfficiency) +
                (in.legacyQuantity * in.legacyEfficiency);
        double fanEff = (totalFans > 0) ? (weightedSum / totalFans) : 0.60;

        // ---------------------------------------------------------------------
        // 5) Cooling & Power Calculations
        // - Free cooling capacity scales with oaFraction.
        // - Mechanical power covers remaining load with constant COP.
        // - Fan filter penalty applies when using outdoor air (FULL or PARTIAL).
        // ---------------------------------------------------------------------
        double cop = 3.0; // Standard chiller baseline (constant)

        // Free-cooling deltaT available (no free cooling if outdoor hotter than return)
        double deltaT_free = (30.0 - weather.dryBulbC);
        if (deltaT_free < 0)
            deltaT_free = 0;

        // Heat removed by free cooling (kW)
        r.q_free_kW = oaFraction * rho * (r.requiredAirflow_CFM / 2118.88) * cp * deltaT_free;

        // Remaining cooling load (kW) to be met by mechanical system
        r.mech_load_kW = r.itLoad_kW - r.q_free_kW;
        if (r.mech_load_kW < 0)
            r.mech_load_kW = 0;

        // Mechanical power (kW)
        r.mechPower_kW = r.mech_load_kW / cop;

        // Fan power (kW) with filter penalty when using outdoor air
        double filterFactor = ("MECHANICAL_ONLY".equals(r.mode)) ? 1.0 : 1.15;
        r.fanPower_kW = (r.requiredAirflow_CFM * fanEff * filterFactor) / 1000.0;

        // ---------------------------------------------------------------------
        // 6) Total Power & Metrics
        // ---------------------------------------------------------------------
        r.totalPower_kW = r.itLoad_kW + r.fanPower_kW + r.mechPower_kW;

        // PUE = Total / IT
        r.pue = r.itLoad_kW > 0 ? r.totalPower_kW / r.itLoad_kW : 0.0;

        // CUE = (Total * CarbonIntensity) / IT
        r.cue = r.itLoad_kW > 0 ? (r.totalPower_kW * in.carbonIntensity_kg_per_kWh) / r.itLoad_kW : 0.0;

        return r;
    }
    
    /**
     * Computes a single hour's performance using CloudSim-generated IT load.
     * This method bypasses utilization calculation and uses pre-computed IT load.
     * 
     * @param in Input parameters
     * @param weather Weather data for this hour
     * @param hour Hour index
     * @param itLoadKW IT load in kW (from CloudSim)
     * @return Step result with cooling performance
     */
    public StepResult computeTimeStepWithCloudSimLoad(EconomizerInputs in, WeatherData weather, int hour, double itLoadKW) {
        StepResult r = new StepResult();
        r.timestampHour = hour;
        r.outdoorTempC = weather.dryBulbC;
        r.outdoorRH = weather.relativeHumidity;

        // Use CloudSim-provided IT load directly
        r.itLoad_kW = itLoadKW;
        r.coolingLoad_kW = r.itLoad_kW;

        // ---------------------------------------------------------------------
        // 2) Required Airflow (Heat removal constraint)
        // V_req (CFM) = (P_IT_kW * 3160) / (rho * Cp * deltaT)
        // rho=1.2, Cp=1.006, deltaT = Tr (30) - Ts (18) = 12
        // ---------------------------------------------------------------------
        double deltaT_design = 30.0 - 18.0;
        double rho = 1.2;
        double cp = 1.006;
        r.requiredAirflow_CFM = (r.itLoad_kW * 3160.0) / (rho * cp * deltaT_design);

        if (r.requiredAirflow_CFM > in.maxAirflowCFM) {
            r.airflowViolation = true;
            r.violationMsg = String.format(
                    "VIOLATION: %.0f CFM > Limit %.0f. Air-Side Economization is insufficient for this AI density. " +
                            "RECOMMENDATION: Upgrade to Liquid Cooling (Direct-to-Chip).",
                    r.requiredAirflow_CFM, in.maxAirflowCFM);
        } else {
            r.airflowViolation = false;
        }

        // ---------------------------------------------------------------------
        // 3) Economizer Mode Logic
        // ---------------------------------------------------------------------
        boolean tempOK = weather.dryBulbC <= in.economizerMaxOutdoorTemp;
        boolean humidityOK = weather.relativeHumidity <= in.economizerMaxHumidity;

        if (tempOK && humidityOK) {
            r.mode = "FULL_ECON";
        } else if (tempOK) {
            r.mode = "PARTIAL_TRIM";
        } else {
            r.mode = "MECHANICAL_ONLY";
        }

        // Outdoor Air Fraction
        double oaFraction;
        if ("FULL_ECON".equals(r.mode)) {
            oaFraction = 1.0;
        } else if ("PARTIAL_TRIM".equals(r.mode)) {
            oaFraction = in.minOutdoorAirFraction;
        } else {
            oaFraction = 0.0;
        }

        // ---------------------------------------------------------------------
        // 4) Weighted Fan Efficiency
        // ---------------------------------------------------------------------
        double totalFans = in.bestQuantity + in.averageQuantity + in.legacyQuantity;
        double weightedSum = (in.bestQuantity * in.bestEfficiency) +
                (in.averageQuantity * in.averageEfficiency) +
                (in.legacyQuantity * in.legacyEfficiency);
        double fanEff = (totalFans > 0) ? (weightedSum / totalFans) : 0.60;

        // ---------------------------------------------------------------------
        // 5) Cooling & Power Calculations
        // ---------------------------------------------------------------------
        double cop = 3.0;

        double deltaT_free = (30.0 - weather.dryBulbC);
        if (deltaT_free < 0)
            deltaT_free = 0;

        r.q_free_kW = oaFraction * rho * (r.requiredAirflow_CFM / 2118.88) * cp * deltaT_free;

        r.mech_load_kW = r.itLoad_kW - r.q_free_kW;
        if (r.mech_load_kW < 0)
            r.mech_load_kW = 0;

        r.mechPower_kW = r.mech_load_kW / cop;

        double filterFactor = ("MECHANICAL_ONLY".equals(r.mode)) ? 1.0 : 1.15;
        r.fanPower_kW = (r.requiredAirflow_CFM * fanEff * filterFactor) / 1000.0;

        // ---------------------------------------------------------------------
        // 6) Total Power & Metrics
        // ---------------------------------------------------------------------
        r.totalPower_kW = r.itLoad_kW + r.fanPower_kW + r.mechPower_kW;

        r.pue = r.itLoad_kW > 0 ? r.totalPower_kW / r.itLoad_kW : 0.0;

        r.cue = r.itLoad_kW > 0 ? (r.totalPower_kW * in.carbonIntensity_kg_per_kWh) / r.itLoad_kW : 0.0;

        return r;
    }
}
