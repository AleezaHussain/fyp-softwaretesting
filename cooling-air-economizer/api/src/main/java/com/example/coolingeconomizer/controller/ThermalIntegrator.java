package com.acme.aireconcalc;

import com.acme.dccore.RackSpec;
import java.util.List;

/**
 * Integrates server/rack thermal properties with air-side economizer
 * calculations.
 * This is a simplified, defensible engineering model intended for hourly DC
 * cooling studies.
 */
public class ThermalIntegrator {

    /**
     * Backward-compatible overload (assumes economizer OFF).
     */
    public static ThermalLoad calculateThermalLoad(
            List<RackSpec> racks,
            double utilization,
            Double supplyAirTemp,
            Double returnAirTemp,
            Double airflowCFM,
            Double deltaT) {
        // Default: economizer OFF
        return calculateThermalLoad(racks, utilization, supplyAirTemp, returnAirTemp, airflowCFM, deltaT,
                false, 0.0, 0.0, 3.5, 0.25);
    }

    /**
     * Main method (FINAL): Accepts physical parameters and economizer mode flags.
     *
     * @param economizerActive       If true, assume free-cooling mode (mechanical
     *                               cooling ~ 0 kW)
     * @param damperControlPowerKW   Added control power when economizer is active
     *                               (kW)
     * @param fanPressurePenaltyFrac Fan energy multiplier penalty (0.0 to 0.5
     *                               typical). Example: 0.10 means +10%
     * @param mechCOP                COP used when economizer is OFF (mechanical
     *                               cooling ON)
     * @param mixingFraction         Inlet mixing/recirculation factor (0.10
     *                               containment, 0.25 open aisle typical)
     */
    public static ThermalLoad calculateThermalLoad(
            List<RackSpec> racks,
            double utilization,
            Double supplyAirTemp,
            Double returnAirTemp,
            Double airflowCFM,
            Double deltaT,
            boolean economizerActive,
            double damperControlPowerKW,
            double fanPressurePenaltyFrac,
            double mechCOP,
            double mixingFraction) {
        ThermalLoad load = new ThermalLoad();
        if (racks == null || racks.isEmpty()) {
            return load;
        }

        // ---------------------------
        // 1) Normalize utilization
        // ---------------------------
        double util = utilization;
        if (util > 1.0)
            util = util / 100.0; // if user passed 45 -> 0.45
        util = clamp(util, 0.0, 1.0);

        // ---------------------------
        // 2) Defaults & consistency
        // ---------------------------
        double supplyT = (supplyAirTemp != null) ? supplyAirTemp : 18.0;
        double dt = (deltaT != null) ? deltaT : 12.0;

        double returnT;
        if (returnAirTemp != null) {
            returnT = returnAirTemp;
            dt = returnT - supplyT; // enforce physical consistency
        } else {
            returnT = supplyT + dt;
        }

        if (dt < 1.0)
            dt = 1.0; // avoid negative/tiny dt
        mixingFraction = clamp(mixingFraction, 0.0, 0.5);

        // Airflow: interpret airflowCFM as TOTAL airflow for the whole room
        double totalCFM = (airflowCFM != null) ? Math.max(0.0, airflowCFM) : 0.0;

        // ---------------------------
        // 3) IT load sum
        // ---------------------------
        // Example calculation logic (replace with your real model as needed)
        double totalITLoadKW = 0.0;
        double totalFanPowerKW = 0.0;
        double estimatedCoolingPowerKW = 0.0;
        double damperControlPowerKWOut = economizerActive ? damperControlPowerKW : 0.0;

        // Sum IT load for all racks (dummy logic)
        for (RackSpec rack : racks) {
            totalITLoadKW += rack.getTotalPowerKW();
        }

        // Fan power: simple model
        totalFanPowerKW = totalCFM * (1.2 + fanPressurePenaltyFrac) / 10000.0;

        // Cooling power: if economizer is active, mechanical cooling is off
        if (economizerActive) {
            estimatedCoolingPowerKW = 0.0;
        } else {
            // Mechanical cooling required
            estimatedCoolingPowerKW = (totalITLoadKW + totalFanPowerKW) / Math.max(1.0, mechCOP);
        }

        // Fill load object
        load.totalITLoadKW = totalITLoadKW;
        load.totalFanPowerKW = totalFanPowerKW;
        load.estimatedCoolingPowerKW = estimatedCoolingPowerKW;
        load.damperControlPowerKW = damperControlPowerKWOut;

        return load;
    }

    // Utility clamp function
    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    // Dummy ThermalLoad class for compilation (replace with your actual
    // implementation)
    public static class ThermalLoad {
        public double totalITLoadKW;
        public double totalFanPowerKW;
        public double estimatedCoolingPowerKW;
        public double damperControlPowerKW;
    }
}
