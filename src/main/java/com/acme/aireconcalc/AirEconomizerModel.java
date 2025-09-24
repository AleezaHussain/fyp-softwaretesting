package com.acme.aireconcalc;

/**
 * Core physics/energy arithmetic for air-side economization.
 * Everything stays algebraic (no APIs): you type numbers once and it computes
 * kWh, cost, CO2, water, heat.
 *
 * Key ideas used:
 * - Airflow ≈ CFM_per_kW * IT_kW (rule of thumb)
 * - Fan power ≈ CFM * (W/CFM) * (1 + filter penalty)
 * - Mechanical cooling electricity ≈ (Thermal kWh to remove) / COP
 * - Heat energy rejected ≈ IT kWh (plus fan heat etc.) -- reported as thermal
 * energy moved
 * - Water (if evap assist) ≈ sensible kWh * L/kWh
 */
public class AirEconomizerModel {

    public static class Result {
        public double it_kWh;
        public double supplyAirflow_CFM;

        public double supplyFan_kWh_econ;
        public double supplyFan_kWh_partial;
        public double supplyFan_kWh_mech;

        public double returnFan_kWh_econ;
        public double returnFan_kWh_partial;
        public double returnFan_kWh_mech;

        public double damperControl_kWh;
        public double damperPressurePenalty_kWh;

        public double mech_kWh_partial;
        public double mech_kWh_mech;
        public double pump_kWh_partial;
        public double pump_kWh_mech;

        public double reheat_kWh;
        public double humidifier_kWh;
        public double evapAssist_kWh;
        public double sensors_kWh;

        public double total_kWh_econ; // (fan + reheat/evap/sensors during econ hours)
        public double total_kWh_partial; // (fan + mech trim + evap + sensors)
        public double total_kWh_mech; // (fan + mech)

        public double total_kWh; // all cooling & auxiliaries
        public double total_cost; // electricity cost
        public double total_co2_kg; // emissions
        public double total_water_L; // evaporative water (if used)

        public double thermal_kWh_removed; // total thermal energy removed/handled
        public double baseline_kWh; // baseline (no econ) kWh (for savings)
        public double baseline_cost;
        public double baseline_co2_kg;

        public double savings_kWh;
        public double savings_cost;
        public double savings_co2_kg;
    }

    public Result compute(EconomizerInputs in) {
        Result r = new Result();

        // IT energy over horizon
        r.it_kWh = in.itAvgKW * in.hours;

        // Design airflow (supply to IT) based on IT load (rule-of-thumb)
        r.supplyAirflow_CFM = in.itAvgKW * in.cfmPerKW;

        // Supply fan kW at design (economizer train) incl. filter penalty
        double supplyFan_kW_design = (r.supplyAirflow_CFM * in.fan_W_per_CFM * (1.0 + in.filterFanPenaltyFrac))
                / 1000.0;

        // Return fan kW at design (typically lower power than supply)
        double returnFan_kW_design = (r.supplyAirflow_CFM * in.returnFan_W_per_CFM * (1.0 + in.filterFanPenaltyFrac))
                / 1000.0;

        // Damper pressure penalty (additional fan energy due to damper restrictions)
        double damperPressurePenalty_kW = (r.supplyAirflow_CFM * in.damperPressurePenalty_Pa * 0.001) / 1000.0; // simplified
                                                                                                                // conversion

        // Fan energy by mode
        r.supplyFan_kWh_econ = supplyFan_kW_design * in.econHours;
        r.supplyFan_kWh_partial = supplyFan_kW_design * in.partialHours;
        r.supplyFan_kWh_mech = supplyFan_kW_design * in.mechHours;

        r.returnFan_kWh_econ = returnFan_kW_design * in.econHours;
        r.returnFan_kWh_partial = returnFan_kW_design * in.partialHours;
        r.returnFan_kWh_mech = returnFan_kW_design * in.mechHours;

        // Damper controls and pressure penalties
        r.damperControl_kWh = in.damperControlPower_kW * in.hours;
        r.damperPressurePenalty_kWh = damperPressurePenalty_kW * (in.econHours + in.partialHours); // only when using
                                                                                                   // outside air

        // Mechanical cooling electricity:
        // Partial hours: only a fraction of IT heat still needs compressor (trim)
        double it_kWh_partial = in.itAvgKW * in.partialHours;
        double it_kWh_mech = in.itAvgKW * in.mechHours;

        r.mech_kWh_partial = (it_kWh_partial * in.mechTrimFracAtPartial) / Math.max(in.mechCOP, 0.01);
        r.mech_kWh_mech = (it_kWh_mech) / Math.max(in.mechCOP, 0.01);

        // Pump power (CHW/CW circulation) - proportional to mechanical cooling load
        double pump_kWh_partial = r.mech_kWh_partial * in.pumpPowerFrac;
        double pump_kWh_mech = r.mech_kWh_mech * in.pumpPowerFrac;

        // Weather-dependent reheat / humidifier (improved logic)
        double reheatActiveHours = 0;
        double humidifierActiveHours = 0;

        // Determine if reheat is needed based on outdoor temperature
        if (in.avgOutdoorTemp_C < in.coldThreshold_C) {
            reheatActiveHours = in.econHours; // reheat needed during economizer hours when cold
        }

        // Determine if humidification is needed based on outdoor humidity
        if (in.avgOutdoorRH < in.dryThreshold_RH) {
            humidifierActiveHours = in.econHours + in.partialHours; // humidity may be needed in both econ and partial
                                                                    // modes
        }

        r.reheat_kWh = (in.reheatKW * reheatActiveHours) / Math.max(in.reheatEfficiency, 0.01);
        r.humidifier_kWh = (in.humidifierKW * humidifierActiveHours) / Math.max(in.humidifierEfficiency, 0.01);

        // Evaporative assist (optional): consumed when active
        r.evapAssist_kWh = in.evapAssistKW * in.evapActiveHours;

        // Small auxiliaries (sensors/controls)
        r.sensors_kWh = in.sensorMiscKW * in.hours;

        // Totals by segment
        double totalFan_kWh_econ = r.supplyFan_kWh_econ + r.returnFan_kWh_econ;
        double totalFan_kWh_partial = r.supplyFan_kWh_partial + r.returnFan_kWh_partial;
        double totalFan_kWh_mech = r.supplyFan_kWh_mech + r.returnFan_kWh_mech;

        r.total_kWh_econ = totalFan_kWh_econ + r.reheat_kWh + r.humidifier_kWh
                + r.damperControl_kWh * (in.econHours / in.hours)
                + r.damperPressurePenalty_kWh * (in.econHours / (in.econHours + in.partialHours))
                + (in.evapActiveHours > 0 ? (in.evapAssistKW * Math.min(in.econHours, in.evapActiveHours)) : 0);
        r.total_kWh_partial = totalFan_kWh_partial + r.mech_kWh_partial + pump_kWh_partial
                + r.damperControl_kWh * (in.partialHours / in.hours)
                + r.damperPressurePenalty_kWh * (in.partialHours / (in.econHours + in.partialHours))
                + (in.evapActiveHours > 0
                        ? (in.evapAssistKW * Math.min(in.partialHours, Math.max(0, in.evapActiveHours - in.econHours)))
                        : 0);
        r.total_kWh_mech = totalFan_kWh_mech + r.mech_kWh_mech + pump_kWh_mech
                + r.damperControl_kWh * (in.mechHours / in.hours);

        // All cooling/aux energy (fans + mech + extras + sensors)
        r.total_kWh = r.total_kWh_econ + r.total_kWh_partial + r.total_kWh_mech + r.sensors_kWh;

        // Water usage (if evap assist representing adiabatic cooling); tie to sensible
        // kWh "covered by evap"
        double sensibleByEvap_kWh = Math.min(r.it_kWh, (in.evapActiveHours * in.itAvgKW)); // crude bound
        r.total_water_L = in.evapWater_L_per_kWhSensible * Math.max(0, sensibleByEvap_kWh);

        // Thermal energy removed/handled (reporting): roughly IT kWh + fan heat etc.
        r.thermal_kWh_removed = r.it_kWh + (totalFan_kWh_econ + totalFan_kWh_partial + totalFan_kWh_mech) * 0.95; // fan
                                                                                                                  // heat
                                                                                                                  // ends
                                                                                                                  // as
                                                                                                                  // thermal;
                                                                                                                  // factor
                                                                                                                  // ~1

        // Electricity → cost and CO2
        r.total_cost = r.total_kWh * in.elecTariff_per_kWh;
        
        // FIX: r.total_kWh is actually cooling energy only (confirmed by component breakdown)
        // Use it directly for CO2 calculation
        r.total_co2_kg = r.total_kWh * in.grid_kgCO2_per_kWh;

        // ========== Baseline (no economizer) ==========
        // Option 1: Baseline cooling+aux energy from PUE (common quick method)
        double baseline_total_kWh_fromPUE = r.it_kWh * (in.itPUE_baseline - 1.0);

        // Option 2: COP-based baseline (more realistic chiller calculation)
        double baselineCooling_kWh_fromCOP = 0;
        double totalBaseline_kWh_fromCOP = 0;

        if (in.baselineCOP > 0) {
            // COP-based baseline calculation
            baselineCooling_kWh_fromCOP = r.it_kWh / in.baselineCOP; // realistic chiller calc

            // Add baseline fan energy (using older, less efficient fans)
            double baselineFanWperCFM = in.baselineFan_W_per_CFM > 0 ? in.baselineFan_W_per_CFM : in.fan_W_per_CFM;
            double baselineFan_kW = (r.supplyAirflow_CFM * baselineFanWperCFM * (1.0 + in.filterFanPenaltyFrac))
                    / 1000.0;
            double baselineFan_kWh = baselineFan_kW * in.hours;

            totalBaseline_kWh_fromCOP = r.it_kWh + baselineCooling_kWh_fromCOP + baselineFan_kWh;
        }

        // Choose which baseline to use: COP-based if available, otherwise PUE-based
        if (in.baselineCOP > 0) {
            r.baseline_kWh = totalBaseline_kWh_fromCOP - r.it_kWh; // cooling+aux only (excluding IT)
        } else {
            r.baseline_kWh = baseline_total_kWh_fromPUE;
        }
        r.baseline_cost = r.baseline_kWh * in.elecTariff_per_kWh;
        
        // FIX: Baseline CO2 already correctly uses cooling-only energy (r.baseline_kWh excludes IT)
        r.baseline_co2_kg = r.baseline_kWh * in.grid_kgCO2_per_kWh;

        // Savings vs baseline
        r.savings_kWh = r.baseline_kWh - r.total_kWh;
        r.savings_cost = r.baseline_cost - r.total_cost;
        r.savings_co2_kg = r.baseline_co2_kg - r.total_co2_kg;

        return r;
    }
}
