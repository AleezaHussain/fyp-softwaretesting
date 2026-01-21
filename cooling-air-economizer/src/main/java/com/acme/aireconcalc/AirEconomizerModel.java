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

        public double coolingLoad_kW; // Total heat to remove
        public double q_free_kW; // Heat removed by free cooling
        public double mech_load_kW; // Heat removed by mechanics

        public double fanPower_kW;
        public double mechPower_kW;
        public double totalPower_kW;

        public double pue;
        public double cue; // kgCO2/kWh

        public String violationMsg;
    }

    /**
     * Computes a single hour's performance.
     */
    public StepResult computeTimeStep(EconomizerInputs in, WeatherData weather, int hour, double utilization) {
        StepResult r = new StepResult();
        r.timestampHour = hour;
        r.outdoorTempC = weather.dryBulbC;
        r.outdoorRH = weather.relativeHumidity;

        // 1. Dynamic Server Power Modeling (AI-Aware)
        // P_IT(t) = N * Factor * [P_idle + (P_max - P_idle) * u(t)]
        double scaledPower = (in.numServers * in.computeIntensityFactor *
                (in.serverIdlePowerW + (in.serverMaxPowerW - in.serverIdlePowerW) * utilization));
        r.itLoad_kW = scaledPower / 1000.0;

        // 2. Required Airflow (Heat removal constraint)
        // V_req (CFM) = (P_IT_kW * 3160) / (rho * Cp * deltaT)
        // rho=1.2, Cp=1.006, deltaT = Tr (30) - Ts (18) = 12
        double deltaT_design = 30.0 - 18.0;
        double rho = 1.2;
        double cp = 1.006;
        r.requiredAirflow_CFM = (r.itLoad_kW * 3160.0) / (rho * cp * deltaT_design);

        if (r.requiredAirflow_CFM > in.maxAirflowCFM) {
            r.airflowViolation = true;
            r.violationMsg = String.format("Airflow %.0f CFM > Limit %.0f", r.requiredAirflow_CFM, in.maxAirflowCFM);
            // Cap airflow for physics calc, but flag it
            // r.requiredAirflow_CFM = in.maxAirflowCFM;
        }

        // 3. Economizer Logic (Shutoff & Modes)
        // Shutoff: T_out > 24 OR RH > 60%
        boolean econEnabled = (weather.dryBulbC <= 24.0) && (weather.relativeHumidity <= 60.0);

        // Mode Determination
        // Mode 1: Full Econ (Tout <= 18 AND RH <= 60) -> Mech=0
        // Mode 2: Partial (18 < Tout <= 24 AND RH <= 60) -> Mech trim
        // Mode 3: Mech Only (Tout > 24 OR RH > 60)

        double filterPenalty = 0.0;

        if (!econEnabled) {
            r.mode = "MECHANICAL_ONLY";
            r.q_free_kW = 0.0;
            r.mech_load_kW = r.itLoad_kW;
            filterPenalty = 0.0; // No penalty if not bringing in outside air through filters
        } else {
            filterPenalty = 0.15; // 15% penalty for filters when econ active

            if (weather.dryBulbC <= 18.0) {
                r.mode = "FULL_ECON";
                r.q_free_kW = r.itLoad_kW; // Fully covered
                r.mech_load_kW = 0.0;
            } else {
                r.mode = "PARTIAL_TRIM";
                // Q_free = m_dot * Cp * (Tr - Tout)
                // m_dot = rho * V_dot_m3s. 1 CFM = 0.0004719 m3/s
                double v_dot_m3s = r.requiredAirflow_CFM * 0.000471947;
                double m_dot = rho * v_dot_m3s;

                // Heat capacity of outdoor air stream vs return
                // Formula from user: Q_free = rho * V * Cp * (T_return - T_outdoor)
                // Note: user formula used V directly, but usually requires conversion.
                // We use standard physics: m_dot * Cp * dT

                r.q_free_kW = m_dot * cp * (30.0 - weather.dryBulbC);

                // Clamp Q_free to IT load (can't remove more than exists without subcooling)
                r.q_free_kW = Math.min(r.itLoad_kW, r.q_free_kW);
                r.mech_load_kW = r.itLoad_kW - r.q_free_kW;
            }
        }

        // 4. Power Calculations
        // Fan Power = (CFM * WeightedEff * (1 + Penalty)) / 1000
        r.fanPower_kW = (r.requiredAirflow_CFM * in.fanWeightedEfficiency * (1.0 + filterPenalty)) / 1000.0;

        // Mechanical Power = MechLoad / COP
        // Use mechCOP from inputs (default to 3.0 or similar if needed, user inputs has
        // it)
        double cop = in.mechCOP > 0 ? in.mechCOP : 3.0; // Safety fallback
        r.mechPower_kW = r.mech_load_kW / cop;

        r.totalPower_kW = r.itLoad_kW + r.fanPower_kW + r.mechPower_kW;

        // 5. Metrics
        // PUE = Total / IT
        r.pue = r.totalPower_kW / r.itLoad_kW;

        // CUE = (Total Energy * Carbon Intensity) / IT Load
        // Energy per hour = Power * 1h
        r.cue = (r.totalPower_kW * in.carbonIntensity_kg_per_kWh) / r.itLoad_kW;

        return r;
    }
}
