package com.acme.aireconcalc;

import com.acme.dccore.RackSpec;
import com.acme.dccore.ServerSpec;
import java.util.List;

/**
 * Integrates server/rack thermal properties with air-side economizer
 * calculations.
 * Bridges the dc-core thermal model with the cooling system analysis.
 */
public class ThermalIntegrator {

    /**
     * Calculate datacenter thermal load from rack specifications
     */
    public static ThermalLoad calculateThermalLoad(List<RackSpec> racks, double utilization) {
        ThermalLoad load = new ThermalLoad();

        for (RackSpec rack : racks) {
            // Power calculations
            double rackPowerKW = rack.getTotalPowerKW() * utilization;
            load.totalITLoadKW += rackPowerKW;

            // Airflow calculations
            double rackAirflowCFM = 0;
            for (ServerSpec server : rack.getServers()) {
                rackAirflowCFM += server.getAirflowCFM(utilization);
                load.totalFanPowerKW += server.getFanPowerW(utilization) / 1000.0;
            }
            load.totalAirflowCFM += rackAirflowCFM;

            // Thermal calculations
            load.maxInletTempC = Math.max(load.maxInletTempC, rack.getMaxInletTempC());
            load.minInletTempC = Math.min(load.minInletTempC, rack.getMinInletTempC());
            load.maxExhaustTempC = Math.max(load.maxExhaustTempC,
                    rack.getAverageExhaustTempC(load.currentSupplyTempC));
        }

        // Calculate PUE components
        // Use dynamic COP calculation
        double evapTempC = 7.0; // Example: chilled water temp (can be made dynamic)
        double condTempC = 35.0; // Example: condenser/ambient temp (can be made dynamic)
        double cop = (evapTempC + 273) / (condTempC - evapTempC);
        load.totalCoolingLoadKW = load.totalITLoadKW; // Heat to be removed
        load.estimatedCoolingPowerKW = load.totalCoolingLoadKW / cop;
        load.pue = (load.totalITLoadKW + load.totalFanPowerKW + load.estimatedCoolingPowerKW) / load.totalITLoadKW;

        return load;
    }

    /**
     * Create economizer inputs from thermal load analysis - simplified version
     * using existing EconomizerInputs field structure
     */
    public static EconomizerInputs createEconomizerInputs(ThermalLoad thermalLoad, int hours) {
        EconomizerInputs inputs = new EconomizerInputs();

        // Basic parameters - use existing fields
        inputs.hours = hours;
        inputs.itAvgKW = thermalLoad.totalITLoadKW;
        inputs.itPUE_baseline = thermalLoad.pue;

        // Airflow-based parameters - use existing fields
        inputs.cfmPerKW = thermalLoad.totalAirflowCFM / thermalLoad.totalITLoadKW;

        // Fan system parameters from server specifications - use existing fields
        inputs.fan_W_per_CFM = 0.4; // Typical for server fans + CRAC
        inputs.returnFan_W_per_CFM = 0.3; // Return fan efficiency

        // Default economizer settings (can be customized) - use existing fields
        inputs.avgOutdoorTemp_C = 15.0; // Cool climate
        inputs.avgOutdoorRH = 50.0; // Moderate humidity
        inputs.coldThreshold_C = 5.0; // Minimum outdoor air temperature

        // Cooling system defaults - use existing fields
        inputs.baselineCOP = 3.5;
        inputs.mechCOP = 4.0;

        // Time-based parameters - simplified for integration
        inputs.econHours = hours * 0.4; // 40% economizer hours (example)
        inputs.partialHours = hours * 0.3; // 30% partial economizer
        inputs.mechHours = hours * 0.3; // 30% mechanical cooling only
        inputs.outsideAirFrac_partial = 0.6; // 60% OA during partial mode

        // Control parameters - use existing fields
        inputs.damperControlPower_kW = 0.5;
        inputs.damperPressurePenalty_Pa = 250;

        return inputs;
    }

    /**
     * Analyze thermal performance against ASHRAE standards
     */
    public static ThermalAnalysis analyzeThermalPerformance(List<RackSpec> racks, double supplyTempC) {
        ThermalAnalysis analysis = new ThermalAnalysis();

        for (RackSpec rack : racks) {
            RackThermalMetrics metrics = new RackThermalMetrics();
            metrics.rackId = rack.getRackId();
            metrics.powerUtilization = rack.getPowerUtilization();
            metrics.spaceUtilization = rack.getSpaceUtilization();

            // Calculate ASHRAE thermal metrics
            metrics.rti = rack.calculateRTI(supplyTempC);

            // Simulate inlet temperature distribution
            double[] inletTemps = simulateInletTemps(supplyTempC, 20);
            metrics.rciHI = rack.calculateRCI_HI(inletTemps);
            metrics.rciLO = rack.calculateRCI_LO(inletTemps);

            // Assess thermal health
            metrics.thermalHealth = assessThermalHealth(metrics);

            analysis.rackMetrics.add(metrics);
        }

        return analysis;
    }

    /**
     * Simulate inlet temperature distribution across datacenter
     */
    private static double[] simulateInletTemps(double supplyTemp, int numSamples) {
        double[] temps = new double[numSamples];
        for (int i = 0; i < numSamples; i++) {
            // Add temperature variation: ±3°C due to mixing, hot spots, recirculation
            temps[i] = supplyTemp + (Math.random() - 0.5) * 6.0;
        }
        return temps;
    }

    /**
     * Assess overall thermal health based on ASHRAE metrics
     */
    private static String assessThermalHealth(RackThermalMetrics metrics) {
        if (metrics.rti < 1.0 && metrics.rciHI >= 90.0 && metrics.rciLO >= 90.0) {
            return "EXCELLENT";
        } else if (metrics.rti < 1.2 && metrics.rciHI >= 80.0 && metrics.rciLO >= 80.0) {
            return "GOOD";
        } else if (metrics.rti < 1.5 && metrics.rciHI >= 70.0 && metrics.rciLO >= 70.0) {
            return "ACCEPTABLE";
        } else {
            return "NEEDS ATTENTION";
        }
    }

    // Data structures for thermal analysis
    public static class ThermalLoad {
        public double totalITLoadKW = 0;
        public double totalFanPowerKW = 0;
        public double totalAirflowCFM = 0;
        public double totalCoolingLoadKW = 0;
        public double estimatedCoolingPowerKW = 0;
        public double pue = 1.0;
        public double currentSupplyTempC = 27.0; // Changed to 27°C (warmer supply air)
        public double maxInletTempC = 0;
        public double minInletTempC = 50.0; // Start high, find minimum
        public double maxExhaustTempC = 0;
    }

    public static class ThermalAnalysis {
        public java.util.List<RackThermalMetrics> rackMetrics = new java.util.ArrayList<>();
    }

    public static class RackThermalMetrics {
        public int rackId;
        public double powerUtilization;
        public double spaceUtilization;
        public double rti;
        public double rciHI;
        public double rciLO;
        public String thermalHealth;
    }
}