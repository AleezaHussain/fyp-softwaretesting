package com.acme.chilledwatersystem.api.util;

import com.acme.chilledwatersystem.EdgeDataCenterScenario;
import com.acme.chilledwatersystem.EdgeInfraManager;
import com.acme.chilledwatersystem.api.dto.ITInfrastructureDTO;
import org.cloudsimplus.hosts.Host;

import java.util.List;

/**
 * Chiller Auto-Sizing Utility
 * 
 * Performs a pre-simulation pass to determine peak IT load and automatically
 * size the chiller capacity with appropriate safety margins.
 * 
 * This prevents EIR calculation failures when fixed chiller capacity is
 * smaller than actual peak load.
 */
public class ChillerAutoSizer {

    private static final double SAFETY_MARGIN = 1.20; // 20% safety buffer
    private static final double COOLING_LOAD_RATIO = 0.40; // Cooling load is ~40% of IT load

    /**
     * Auto-size chiller capacity based on peak IT load
     * 
     * @param infraManager Infrastructure manager with hosts
     * @param itInfra IT infrastructure configuration
     * @return Recommended chiller capacity in kW
     */
    public static double autoSizeChiller(EdgeInfraManager infraManager, ITInfrastructureDTO itInfra) {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  CHILLER AUTO-SIZING - PRE-SIMULATION PASS                           ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝");

        // Calculate peak IT load at maximum utilization
        double maxUtilization = 100.0; // Assume 100% for peak sizing
        double peakITLoad = infraManager.calculateITLoadAtUtilization(maxUtilization);

        System.out.printf("Peak IT Load (100%% utilization): %.2f kW\n", peakITLoad);

        // Calculate peak cooling load
        double peakCoolingLoad = peakITLoad * COOLING_LOAD_RATIO;
        System.out.printf("Peak Cooling Load (40%% of IT): %.2f kW\n", peakCoolingLoad);

        // Apply safety margin
        double recommendedCapacity = peakCoolingLoad * SAFETY_MARGIN;
        System.out.printf("Recommended Chiller Capacity (20%% safety margin): %.2f kW\n", recommendedCapacity);

        // Round up to nearest 10 kW for standard sizing
        double standardizedCapacity = Math.ceil(recommendedCapacity / 10.0) * 10.0;
        System.out.printf("Standardized Capacity: %.2f kW\n", standardizedCapacity);

        System.out.println("✅ Auto-sizing complete!\n");

        return standardizedCapacity;
    }

    /**
     * Auto-size chiller with detailed workload analysis
     * 
     * @param infraManager Infrastructure manager
     * @param itInfra IT infrastructure configuration
     * @param avgUtilization Average CPU utilization
     * @param workloadType Type of workload (ai_training, ai_inference, enterprise)
     * @return Sizing report with recommendations
     */
    public static SizingReport autoSizeWithAnalysis(EdgeInfraManager infraManager,
                                                    ITInfrastructureDTO itInfra,
                                                    double avgUtilization,
                                                    String workloadType) {
        SizingReport report = new SizingReport();

        // Calculate loads at different utilization levels
        report.minITLoad = infraManager.calculateITLoadAtUtilization(20.0); // Minimum realistic load
        report.avgITLoad = infraManager.calculateITLoadAtUtilization(avgUtilization);
        report.peakITLoad = infraManager.calculateITLoadAtUtilization(100.0);

        // Calculate corresponding cooling loads
        report.minCoolingLoad = report.minITLoad * COOLING_LOAD_RATIO;
        report.avgCoolingLoad = report.avgITLoad * COOLING_LOAD_RATIO;
        report.peakCoolingLoad = report.peakITLoad * COOLING_LOAD_RATIO;

        // Determine capacity based on workload type
        double baseCapacity = report.peakCoolingLoad * SAFETY_MARGIN;

        // Adjust for workload characteristics
        switch (workloadType) {
            case "ai_training":
                // AI training has sustained high loads - use higher safety margin
                report.recommendedCapacity = baseCapacity * 1.1; // Additional 10%
                report.rationale = "AI training workload: sustained high utilization requires extra capacity";
                break;
            case "ai_inference":
                // AI inference has burst patterns - need capacity for spikes
                report.recommendedCapacity = baseCapacity * 1.15; // Additional 15%
                report.rationale = "AI inference workload: burst patterns require spike capacity";
                break;
            default:
                // Enterprise workload - standard sizing
                report.recommendedCapacity = baseCapacity;
                report.rationale = "Enterprise workload: standard 20% safety margin";
                break;
        }

        // Standardize to nearest 10 kW
        report.standardizedCapacity = Math.ceil(report.recommendedCapacity / 10.0) * 10.0;

        // Calculate utilization at average load
        report.avgChillerUtilization = (report.avgCoolingLoad / report.standardizedCapacity) * 100.0;

        return report;
    }

    /**
     * Validate that chiller capacity is adequate for scenario
     * 
     * @param chillerCapacityKW Chiller capacity in kW
     * @param peakCoolingLoadKW Peak cooling load in kW
     * @return Validation result
     */
    public static ValidationResult validateCapacity(double chillerCapacityKW, double peakCoolingLoadKW) {
        ValidationResult result = new ValidationResult();
        result.chillerCapacity = chillerCapacityKW;
        result.peakCoolingLoad = peakCoolingLoadKW;
        result.utilizationAtPeak = (peakCoolingLoadKW / chillerCapacityKW) * 100.0;

        if (result.utilizationAtPeak > 100.0) {
            result.isValid = false;
            result.message = String.format(
                "❌ UNDERSIZED: Peak load (%.2f kW) exceeds capacity (%.2f kW). " +
                "Chiller will be overloaded by %.1f%%!",
                peakCoolingLoadKW, chillerCapacityKW, result.utilizationAtPeak - 100.0
            );
        } else if (result.utilizationAtPeak > 90.0) {
            result.isValid = true;
            result.message = String.format(
                "⚠️  TIGHT: Peak utilization is %.1f%%. Consider larger capacity for safety margin.",
                result.utilizationAtPeak
            );
        } else if (result.utilizationAtPeak > 70.0) {
            result.isValid = true;
            result.message = String.format(
                "✅ GOOD: Peak utilization is %.1f%%. Adequate capacity with reasonable margin.",
                result.utilizationAtPeak
            );
        } else {
            result.isValid = true;
            result.message = String.format(
                "✅ OVERSIZED: Peak utilization is %.1f%%. Chiller may operate inefficiently at low loads.",
                result.utilizationAtPeak
            );
        }

        return result;
    }

    /**
     * Sizing report with detailed analysis
     */
    public static class SizingReport {
        public double minITLoad;
        public double avgITLoad;
        public double peakITLoad;
        public double minCoolingLoad;
        public double avgCoolingLoad;
        public double peakCoolingLoad;
        public double recommendedCapacity;
        public double standardizedCapacity;
        public double avgChillerUtilization;
        public String rationale;

        public void print() {
            System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
            System.out.println("║  CHILLER SIZING ANALYSIS                                              ║");
            System.out.println("╚═══════════════════════════════════════════════════════════════════════╝");
            System.out.println("\nIT LOAD PROFILE:");
            System.out.printf("  Minimum (20%% util):  %.2f kW\n", minITLoad);
            System.out.printf("  Average:             %.2f kW\n", avgITLoad);
            System.out.printf("  Peak (100%% util):    %.2f kW\n", peakITLoad);
            System.out.println("\nCOOLING LOAD PROFILE:");
            System.out.printf("  Minimum:             %.2f kW\n", minCoolingLoad);
            System.out.printf("  Average:             %.2f kW\n", avgCoolingLoad);
            System.out.printf("  Peak:                %.2f kW\n", peakCoolingLoad);
            System.out.println("\nCHILLER SIZING:");
            System.out.printf("  Recommended Capacity: %.2f kW\n", recommendedCapacity);
            System.out.printf("  Standardized:         %.2f kW\n", standardizedCapacity);
            System.out.printf("  Avg Utilization:      %.1f%%\n", avgChillerUtilization);
            System.out.printf("  Rationale: %s\n", rationale);
            System.out.println();
        }
    }

    /**
     * Validation result
     */
    public static class ValidationResult {
        public boolean isValid;
        public double chillerCapacity;
        public double peakCoolingLoad;
        public double utilizationAtPeak;
        public String message;

        public void print() {
            System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
            System.out.println("║  CHILLER CAPACITY VALIDATION                                          ║");
            System.out.println("╚═══════════════════════════════════════════════════════════════════════╝");
            System.out.printf("Chiller Capacity: %.2f kW\n", chillerCapacity);
            System.out.printf("Peak Cooling Load: %.2f kW\n", peakCoolingLoad);
            System.out.printf("Peak Utilization: %.1f%%\n", utilizationAtPeak);
            System.out.println(message);
            System.out.println();
        }
    }
}
