package com.acme.chilledwatersystem;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 5 Part 5 - Sections 5.3, 5.4, 5.5: Operational Control Engine
 * 
 * Combines:
 * - Grid-Interactive Demand Response (carbon-aware scheduling, peak shaving)
 * - AI-Driven Predictive Maintenance (anomaly detection, fouling tracking)
 * - Model Predictive Control (dynamic setpoints, continuous optimization)
 */
public class OperationalController {
    
    private final EdgeDataCenterScenario scenario;
    private final BayesianCalibrator calibrator;
    
    // Grid interaction parameters
    private double carbonIntensityThreshold = 0.5; // kg CO2/kWh
    private double peakDemandThreshold = 150.0; // kW
    
    // Predictive maintenance
    private List<MaintenanceAlert> maintenanceAlerts;
    private double foulingThreshold = 1.15; // 15% degradation
    
    // Model predictive control
    private double targetPUE = 1.3;
    private double minSupplyTempC = 7.0;
    private double maxSupplyTempC = 12.0;
    
    public OperationalController(EdgeDataCenterScenario scenario, BayesianCalibrator calibrator) {
        this.scenario = scenario;
        this.calibrator = calibrator;
        this.maintenanceAlerts = new ArrayList<>();
    }
    
    /**
     * Section 5.3: Grid-Interactive Demand Response
     * Carbon-aware workload scheduling
     */
    public DemandResponseDecision evaluateDemandResponse(TelemetryData telemetry) {
        DemandResponseDecision decision = new DemandResponseDecision();
        decision.timestamp = telemetry.getTimestamp();
        decision.currentCarbonIntensity = telemetry.getGridCarbonIntensityKgKWh();
        decision.currentElectricityRate = telemetry.getElectricityRateUsdKWh();
        
        // Check 1: Carbon-aware scheduling
        if (telemetry.getGridCarbonIntensityKgKWh() > carbonIntensityThreshold) {
            decision.carbonAwareAction = "SHIFT_WORKLOAD";
            decision.carbonAwareReason = String.format(
                "Grid carbon intensity (%.3f kg/kWh) exceeds threshold (%.3f kg/kWh). " +
                "Shift non-critical AI Training loads to hours with higher renewable availability.",
                telemetry.getGridCarbonIntensityKgKWh(), carbonIntensityThreshold
            );
            decision.estimatedCarbonReduction = telemetry.getActualITLoadKW() * 
                (telemetry.getGridCarbonIntensityKgKWh() - carbonIntensityThreshold) * 0.3; // 30% reduction
        } else {
            decision.carbonAwareAction = "CONTINUE";
            decision.carbonAwareReason = "Grid carbon intensity within acceptable range";
        }
        
        // Check 2: Peak shaving
        if (telemetry.getTotalFacilityPowerKW() > peakDemandThreshold) {
            decision.peakShavingAction = "REDUCE_LOAD";
            decision.peakShavingReason = String.format(
                "Facility power (%.1f kW) exceeds peak threshold (%.1f kW). " +
                "Activate setpoint reset or battery storage.",
                telemetry.getTotalFacilityPowerKW(), peakDemandThreshold
            );
            decision.setpointAdjustment = 2.0; // Increase supply temp by 2°C
        } else {
            decision.peakShavingAction = "NORMAL";
            decision.peakShavingReason = "Facility power within normal range";
        }
        
        // Check 3: Economic optimization
        double avgElectricityRate = 0.12; // $0.12/kWh baseline
        if (telemetry.getElectricityRateUsdKWh() > avgElectricityRate * 1.5) {
            decision.economicAction = "DEFER_WORKLOAD";
            decision.economicReason = String.format(
                "Electricity rate ($%.4f/kWh) is %.0f%% above average. " +
                "Defer non-urgent workloads to off-peak hours.",
                telemetry.getElectricityRateUsdKWh(),
                ((telemetry.getElectricityRateUsdKWh() / avgElectricityRate) - 1.0) * 100
            );
        } else {
            decision.economicAction = "NORMAL";
            decision.economicReason = "Electricity rate within normal range";
        }
        
        return decision;
    }
    
    /**
     * Section 5.4: AI-Driven Predictive Maintenance
     * Anomaly detection and condition-based maintenance
     */
    public MaintenanceRecommendation evaluateMaintenance(TelemetryData telemetry) {
        MaintenanceRecommendation recommendation = new MaintenanceRecommendation();
        recommendation.timestamp = telemetry.getTimestamp();
        
        // Check 1: Chiller fouling detection
        double foulingFactor = calibrator.getFoulingFactor();
        if (foulingFactor > foulingThreshold) {
            MaintenanceAlert alert = new MaintenanceAlert();
            alert.timestamp = telemetry.getTimestamp();
            alert.component = "CHILLER";
            alert.severity = "HIGH";
            alert.issue = String.format(
                "Chiller fouling factor (%.3f) exceeds threshold (%.3f). " +
                "COP has degraded by %.1f%%.",
                foulingFactor, foulingThreshold, (foulingFactor - 1.0) * 100
            );
            alert.recommendation = "Schedule chiller tube cleaning within 2 weeks";
            alert.estimatedCostImpact = 5000.0; // $5K/year energy penalty
            
            maintenanceAlerts.add(alert);
            recommendation.alerts.add(alert);
        }
        
        // Check 2: Pump performance degradation
        if (telemetry.getPumpPressureKPa() < 200.0) { // Below design pressure
            MaintenanceAlert alert = new MaintenanceAlert();
            alert.timestamp = telemetry.getTimestamp();
            alert.component = "PUMP";
            alert.severity = "MEDIUM";
            alert.issue = String.format(
                "Pump pressure (%.1f kPa) below design (250 kPa). " +
                "Possible impeller wear or cavitation.",
                telemetry.getPumpPressureKPa()
            );
            alert.recommendation = "Inspect pump impeller and check for air entrainment";
            alert.estimatedCostImpact = 2000.0;
            
            maintenanceAlerts.add(alert);
            recommendation.alerts.add(alert);
        }
        
        // Check 3: Cooling tower fan degradation
        if (telemetry.getCoolingTowerFanSpeedPercent() > 95.0 && 
            telemetry.getCondenserInletTempC() > 30.0) {
            MaintenanceAlert alert = new MaintenanceAlert();
            alert.timestamp = telemetry.getTimestamp();
            alert.component = "COOLING_TOWER";
            alert.severity = "MEDIUM";
            alert.issue = String.format(
                "Cooling tower fan at %.0f%% speed but condenser temp still high (%.1f°C). " +
                "Possible fill fouling or fan motor degradation.",
                telemetry.getCoolingTowerFanSpeedPercent(), telemetry.getCondenserInletTempC()
            );
            alert.recommendation = "Clean cooling tower fill and inspect fan motor bearings";
            alert.estimatedCostImpact = 3000.0;
            
            maintenanceAlerts.add(alert);
            recommendation.alerts.add(alert);
        }
        
        // Check 4: Thermal margin warning
        if (telemetry.getThermalMarginC() < 3.0) {
            MaintenanceAlert alert = new MaintenanceAlert();
            alert.timestamp = telemetry.getTimestamp();
            alert.component = "THERMAL_SYSTEM";
            alert.severity = "CRITICAL";
            alert.issue = String.format(
                "Thermal margin (%.1f°C) critically low. " +
                "Approaching ASHRAE upper limit (27°C).",
                telemetry.getThermalMarginC()
            );
            alert.recommendation = "Immediate action: Reduce IT load or increase cooling capacity";
            alert.estimatedCostImpact = 50000.0; // Potential downtime cost
            
            maintenanceAlerts.add(alert);
            recommendation.alerts.add(alert);
        }
        
        // Prioritize alerts by severity
        recommendation.alerts.sort((a, b) -> {
            int severityOrder = getSeverityOrder(a.severity) - getSeverityOrder(b.severity);
            if (severityOrder != 0) return severityOrder;
            return Double.compare(b.estimatedCostImpact, a.estimatedCostImpact);
        });
        
        return recommendation;
    }
    
    private int getSeverityOrder(String severity) {
        switch (severity) {
            case "CRITICAL": return 0;
            case "HIGH": return 1;
            case "MEDIUM": return 2;
            case "LOW": return 3;
            default: return 4;
        }
    }
    
    /**
     * Section 5.5: Model Predictive Control
     * Dynamic setpoint optimization for next 15 minutes
     */
    public SetpointRecommendation optimizeSetpoints(TelemetryData telemetry, 
                                                    double forecastAmbientC,
                                                    double forecastITLoadKW) {
        SetpointRecommendation recommendation = new SetpointRecommendation();
        recommendation.timestamp = telemetry.getTimestamp();
        recommendation.forecastHorizonMinutes = 15;
        
        // Current state
        double currentSupplyTemp = telemetry.getChilledWaterSupplyTempC();
        double currentPUE = telemetry.getMeasuredPUE();
        
        // Optimize supply temperature
        double optimalSupplyTemp = optimizeSupplyTemperature(
            forecastITLoadKW, forecastAmbientC, currentPUE
        );
        
        recommendation.recommendedSupplyTempC = optimalSupplyTemp;
        recommendation.currentSupplyTempC = currentSupplyTemp;
        recommendation.tempAdjustmentC = optimalSupplyTemp - currentSupplyTemp;
        
        // Optimize pump speed
        double optimalPumpSpeed = optimizePumpSpeed(forecastITLoadKW);
        recommendation.recommendedPumpSpeedPercent = optimalPumpSpeed;
        
        // Optimize cooling tower fan speed
        double optimalFanSpeed = optimizeFanSpeed(forecastAmbientC);
        recommendation.recommendedFanSpeedPercent = optimalFanSpeed;
        
        // Estimate impact
        recommendation.estimatedPUEImprovement = (currentPUE - targetPUE) * 0.1; // 10% improvement
        recommendation.estimatedEnergySavingsKW = forecastITLoadKW * recommendation.estimatedPUEImprovement;
        recommendation.estimatedCostSavingsUSD = recommendation.estimatedEnergySavingsKW * 
            telemetry.getElectricityRateUsdKWh() * 0.25; // Per 15 minutes
        
        // Justification
        if (Math.abs(recommendation.tempAdjustmentC) > 0.5) {
            recommendation.justification = String.format(
                "Adjust supply temp by %.1f°C to optimize efficiency. " +
                "Forecast conditions: IT Load %.1f kW, Ambient %.1f°C. " +
                "Expected PUE improvement: %.3f, Energy savings: %.1f kW.",
                recommendation.tempAdjustmentC, forecastITLoadKW, forecastAmbientC,
                recommendation.estimatedPUEImprovement, recommendation.estimatedEnergySavingsKW
            );
        } else {
            recommendation.justification = "Current setpoints are optimal for forecast conditions";
        }
        
        return recommendation;
    }
    
    /**
     * Optimize chilled water supply temperature
     */
    private double optimizeSupplyTemperature(double itLoadKW, double ambientC, double currentPUE) {
        // Higher supply temp = lower chiller power but higher fan power
        // Find optimal balance
        
        double optimalTemp = minSupplyTempC;
        double minPUE = Double.MAX_VALUE;
        
        for (double temp = minSupplyTempC; temp <= maxSupplyTempC; temp += 0.5) {
            // Estimate PUE at this temperature
            double chillerPenalty = (maxSupplyTempC - temp) * 0.02; // Lower temp = higher chiller power
            double fanBenefit = (temp - minSupplyTempC) * 0.01; // Higher temp = lower fan power
            double estimatedPUE = targetPUE + chillerPenalty - fanBenefit;
            
            if (estimatedPUE < minPUE) {
                minPUE = estimatedPUE;
                optimalTemp = temp;
            }
        }
        
        return optimalTemp;
    }
    
    /**
     * Optimize pump speed based on load
     */
    private double optimizePumpSpeed(double itLoadKW) {
        // Pump speed should match cooling load
        double designLoad = 100.0; // kW
        double speedPercent = (itLoadKW / designLoad) * 100.0;
        return Math.max(30.0, Math.min(100.0, speedPercent)); // 30-100% range
    }
    
    /**
     * Optimize cooling tower fan speed
     */
    private double optimizeFanSpeed(double ambientC) {
        // Higher ambient = higher fan speed needed
        double designAmbient = 35.0; // °C
        double speedPercent = (ambientC / designAmbient) * 80.0; // Max 80% for efficiency
        return Math.max(40.0, Math.min(80.0, speedPercent)); // 40-80% range
    }
    
    /**
     * Weekly resilience stress test
     */
    public ResilienceStressTest performWeeklyStressTest(TelemetryData telemetry) {
        ResilienceStressTest test = new ResilienceStressTest();
        test.timestamp = telemetry.getTimestamp();
        
        // Recalculate 75-second failure window with current conditions
        double rackDensityKW = 75.0; // From workload situation
        double referenceTime = 75.0; // seconds at 100 kW/rack
        double referenceDensity = 100.0;
        
        test.timeToCriticalSeconds = referenceTime * (referenceDensity / rackDensityKW);
        
        // Adjust for aging infrastructure (fouling reduces thermal mass)
        double foulingFactor = calibrator.getFoulingFactor();
        test.timeToCriticalSeconds *= (2.0 - foulingFactor); // Degradation reduces time
        
        // Safety margin assessment
        if (test.timeToCriticalSeconds < 45.0) {
            test.safetyMargin = "CRITICAL";
            test.alert = "Aging infrastructure has reduced failure window to " + 
                        String.format("%.0f", test.timeToCriticalSeconds) + 
                        " seconds. Immediate upgrade required.";
        } else if (test.timeToCriticalSeconds < 60.0) {
            test.safetyMargin = "LOW";
            test.alert = "Safety margin reduced. Plan for infrastructure refresh.";
        } else {
            test.safetyMargin = "ADEQUATE";
            test.alert = "Safety margin acceptable";
        }
        
        return test;
    }
    
    /**
     * Print operational dashboard
     */
    public void printOperationalDashboard(TelemetryData telemetry,
                                         DemandResponseDecision drDecision,
                                         MaintenanceRecommendation maintenance,
                                         SetpointRecommendation setpoints) {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  OPERATIONAL STRATEGIC DASHBOARD                                      ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝\n");
        
        System.out.println("CURRENT STATUS:");
        System.out.println(telemetry);
        System.out.println();
        
        System.out.println("GRID-INTERACTIVE DEMAND RESPONSE:");
        System.out.println("  Carbon-Aware: " + drDecision.carbonAwareAction);
        System.out.println("    " + drDecision.carbonAwareReason);
        System.out.println("  Peak Shaving: " + drDecision.peakShavingAction);
        System.out.println("    " + drDecision.peakShavingReason);
        System.out.println();
        
        System.out.println("PREDICTIVE MAINTENANCE:");
        if (maintenance.alerts.isEmpty()) {
            System.out.println("  ✅ No maintenance alerts");
        } else {
            System.out.printf("  ⚠️  %d alert(s) detected:\n", maintenance.alerts.size());
            for (MaintenanceAlert alert : maintenance.alerts) {
                System.out.printf("    [%s] %s: %s\n", alert.severity, alert.component, alert.issue);
                System.out.printf("      → %s\n", alert.recommendation);
            }
        }
        System.out.println();
        
        System.out.println("OPTIMIZED SETPOINT RECOMMENDATIONS (Next 15 minutes):");
        System.out.printf("  Supply Temperature: %.1f°C → %.1f°C (%.1f°C adjustment)\n",
            setpoints.currentSupplyTempC, setpoints.recommendedSupplyTempC, setpoints.tempAdjustmentC);
        System.out.printf("  Pump Speed: %.0f%%\n", setpoints.recommendedPumpSpeedPercent);
        System.out.printf("  Fan Speed: %.0f%%\n", setpoints.recommendedFanSpeedPercent);
        System.out.printf("  Expected Savings: %.1f kW ($%.2f)\n",
            setpoints.estimatedEnergySavingsKW, setpoints.estimatedCostSavingsUSD);
        System.out.println("  " + setpoints.justification);
        System.out.println();
    }
    
    // Inner classes
    public static class DemandResponseDecision {
        public LocalDateTime timestamp;
        public double currentCarbonIntensity;
        public double currentElectricityRate;
        public String carbonAwareAction;
        public String carbonAwareReason;
        public double estimatedCarbonReduction;
        public String peakShavingAction;
        public String peakShavingReason;
        public double setpointAdjustment;
        public String economicAction;
        public String economicReason;
    }
    
    public static class MaintenanceAlert {
        public LocalDateTime timestamp;
        public String component;
        public String severity;
        public String issue;
        public String recommendation;
        public double estimatedCostImpact;
    }
    
    public static class MaintenanceRecommendation {
        public LocalDateTime timestamp;
        public List<MaintenanceAlert> alerts = new ArrayList<>();
    }
    
    public static class SetpointRecommendation {
        public LocalDateTime timestamp;
        public int forecastHorizonMinutes;
        public double currentSupplyTempC;
        public double recommendedSupplyTempC;
        public double tempAdjustmentC;
        public double recommendedPumpSpeedPercent;
        public double recommendedFanSpeedPercent;
        public double estimatedPUEImprovement;
        public double estimatedEnergySavingsKW;
        public double estimatedCostSavingsUSD;
        public String justification;
    }
    
    public static class ResilienceStressTest {
        public LocalDateTime timestamp;
        public double timeToCriticalSeconds;
        public String safetyMargin;
        public String alert;
    }
}
