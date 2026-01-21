package com.acme.aireconcalc;

import com.acme.dccore.RackSpec;
import java.util.List;

public class ThermalIntegrator {

    // ===============================
    // MAIN THERMAL CALCULATION (PURE PHYSICS)
    // ===============================
    public static ThermalLoad calculateThermalLoad(
            List<RackSpec> racks,
            double utilization,
            Double supplyAirTemp,
            Double returnAirTemp,
            Double airflowCFM,
            Double deltaT
    ) {
        ThermalLoad load = new ThermalLoad();

        for (RackSpec rack : racks) {

            // IT Load
            double rackPowerKW = rack.getTotalPowerKW() * utilization;
            load.totalITLoadKW += rackPowerKW;

            // Airflow
            double rackAirflow = airflowCFM != null ? airflowCFM : 0.0;
            load.totalAirflowCFM += rackAirflow;

            // Fan power (0.4 W/CFM baseline)
            load.totalFanPowerKW += (rackAirflow * 0.4) / 1000.0;

            // Inlet / exhaust temperatures
            double inlet = supplyAirTemp != null ? supplyAirTemp : 0.0;
            double exhaust = returnAirTemp != null ? returnAirTemp : inlet + 12.0;

            load.maxInletTempC = Math.max(load.maxInletTempC, inlet);
            load.minInletTempC = Math.min(load.minInletTempC, inlet);
            load.maxExhaustTempC = Math.max(load.maxExhaustTempC, exhaust);
        }

        // ===============================
        // Cooling load calculation
        // ===============================
        double cp = 1.07;        // kJ/kg-K
        double airDensity = 1.2; // kg/m3
        double cfmToCmh = 1.699;

        double totalAirflowCMH = (airflowCFM != null ? airflowCFM : 0.0) * cfmToCmh;
        double massFlow = totalAirflowCMH * airDensity / 3600.0;
        double dT = deltaT != null ? deltaT : 12.0;

        load.totalCoolingLoadKW = massFlow * cp * dT / 3.6;

        // Placeholder (controller decides COP / economizer)
        load.estimatedCoolingPowerKW = 0.0;

        load.pue = (load.totalITLoadKW + load.totalFanPowerKW)
                / (load.totalITLoadKW > 0 ? load.totalITLoadKW : 1);

        return load;
    }

    // ===============================
    // DATA STRUCTURES
    // ===============================
    public static class ThermalLoad {
        public double totalITLoadKW = 0;
        public double totalFanPowerKW = 0;
        public double totalAirflowCFM = 0;
        public double totalCoolingLoadKW = 0;
        public double estimatedCoolingPowerKW = 0;
        public double pue = 1.0;

        public double maxInletTempC = 0;
        public double minInletTempC = 50;
        public double maxExhaustTempC = 0;
    }
}
