package com.acme.aireconcalc.cloudsim;

import java.util.ArrayList;
import java.util.List;

/**
 * Rack-Level Load Aggregator
 * Maps host-level loads to rack-level for AI hotspot detection
 * 
 * Critical for AI deployments where concentrated racks can exceed
 * airflow capacity even if total facility load is acceptable.
 */
public class RackLoadAggregator {
    
    /**
     * Rack load profile with hotspot detection
     */
    public static class RackProfile {
        public int rackId;
        public double[] hourlyLoadKW;
        public double peakLoadKW;
        public double averageLoadKW;
        public boolean isHotspot;           // Exceeds threshold
        public double hotspotSeverity;      // How much over threshold (0-1+)
        public int[] hostIndices;           // Which hosts are in this rack
    }
    
    /**
     * Facility-wide rack analysis
     */
    public static class FacilityRackAnalysis {
        public List<RackProfile> racks;
        public int totalRacks;
        public int hotspotRacks;
        public double maxRackLoadKW;
        public double averageRackLoadKW;
        public double loadImbalanceFactor;  // Std dev / mean
        public String[] warnings;
    }
    
    /**
     * Aggregate host loads to rack level
     */
    public static FacilityRackAnalysis aggregateToRacks(
            CloudSimWorkloadService.WorkloadResult workloadResult,
            double rackPowerThresholdKW) {
        
        FacilityRackAnalysis analysis = new FacilityRackAnalysis();
        analysis.racks = new ArrayList<>();
        
        int numberOfRacks = workloadResult.numberOfRacks;
        int serversPerRack = workloadResult.serversPerRack;
        int totalHours = workloadResult.totalHours;
        
        List<String> warnings = new ArrayList<>();
        double sumRackAvg = 0;
        double maxRackLoad = 0;
        int hotspotCount = 0;
        
        // Process each rack
        for (int rackId = 0; rackId < numberOfRacks; rackId++) {
            RackProfile rack = new RackProfile();
            rack.rackId = rackId;
            rack.hourlyLoadKW = new double[totalHours];
            
            // Determine which hosts belong to this rack
            int startHost = rackId * serversPerRack;
            int endHost = Math.min(startHost + serversPerRack, workloadResult.hostUtilization.length);
            rack.hostIndices = new int[endHost - startHost];
            for (int i = 0; i < rack.hostIndices.length; i++) {
                rack.hostIndices[i] = startHost + i;
            }
            
            // Aggregate hourly loads
            double rackSum = 0;
            double rackPeak = 0;
            
            for (int hour = 0; hour < totalHours; hour++) {
                rack.hourlyLoadKW[hour] = workloadResult.rackITLoadKW[rackId][hour];
                rackSum += rack.hourlyLoadKW[hour];
                rackPeak = Math.max(rackPeak, rack.hourlyLoadKW[hour]);
            }
            
            rack.averageLoadKW = rackSum / totalHours;
            rack.peakLoadKW = rackPeak;
            
            // Hotspot detection
            if (rack.peakLoadKW > rackPowerThresholdKW) {
                rack.isHotspot = true;
                rack.hotspotSeverity = (rack.peakLoadKW - rackPowerThresholdKW) / rackPowerThresholdKW;
                hotspotCount++;
                
                warnings.add(String.format(
                    "Rack %d: HOTSPOT DETECTED - Peak %.1f kW exceeds threshold %.1f kW (%.0f%% over)",
                    rackId, rack.peakLoadKW, rackPowerThresholdKW, rack.hotspotSeverity * 100
                ));
            } else {
                rack.isHotspot = false;
                rack.hotspotSeverity = 0;
            }
            
            sumRackAvg += rack.averageLoadKW;
            maxRackLoad = Math.max(maxRackLoad, rack.peakLoadKW);
            
            analysis.racks.add(rack);
        }
        
        // Calculate facility-wide metrics
        analysis.totalRacks = numberOfRacks;
        analysis.hotspotRacks = hotspotCount;
        analysis.maxRackLoadKW = maxRackLoad;
        analysis.averageRackLoadKW = sumRackAvg / numberOfRacks;
        
        // Calculate load imbalance (coefficient of variation)
        double variance = 0;
        for (RackProfile rack : analysis.racks) {
            double diff = rack.averageLoadKW - analysis.averageRackLoadKW;
            variance += diff * diff;
        }
        double stdDev = Math.sqrt(variance / numberOfRacks);
        analysis.loadImbalanceFactor = stdDev / analysis.averageRackLoadKW;
        
        // Add imbalance warning
        if (analysis.loadImbalanceFactor > 0.3) {
            warnings.add(String.format(
                "High load imbalance detected (CV=%.2f). Consider workload redistribution.",
                analysis.loadImbalanceFactor
            ));
        }
        
        analysis.warnings = warnings.toArray(new String[0]);
        
        return analysis;
    }
    
    /**
     * Calculate rack-level airflow requirements
     */
    public static double[] calculateRackAirflowRequirements(
            FacilityRackAnalysis rackAnalysis,
            double deltaT_C,
            double rho_kg_per_m3,
            double cp_kJ_per_kgK) {
        
        int numberOfRacks = rackAnalysis.totalRacks;
        double[] rackAirflowCFM = new double[numberOfRacks];
        
        for (int i = 0; i < numberOfRacks; i++) {
            RackProfile rack = rackAnalysis.racks.get(i);
            
            // Q = m_dot * Cp * deltaT
            // m_dot = Q / (Cp * deltaT)
            // V_cfm = (m_dot / rho) * 2118.88 (m³/s to CFM)
            
            double Q_kW = rack.peakLoadKW;
            double m_dot_kg_per_s = Q_kW / (cp_kJ_per_kgK * deltaT_C);
            double V_m3_per_s = m_dot_kg_per_s / rho_kg_per_m3;
            rackAirflowCFM[i] = V_m3_per_s * 2118.88;
        }
        
        return rackAirflowCFM;
    }
    
    /**
     * Detect AI hotspot violations
     */
    public static String[] detectAIHotspotViolations(
            FacilityRackAnalysis rackAnalysis,
            double maxRackAirflowCFM,
            double deltaT_C) {
        
        List<String> violations = new ArrayList<>();
        
        double[] rackAirflow = calculateRackAirflowRequirements(
            rackAnalysis, deltaT_C, 1.2, 1.006
        );
        
        for (int i = 0; i < rackAnalysis.totalRacks; i++) {
            if (rackAirflow[i] > maxRackAirflowCFM) {
                RackProfile rack = rackAnalysis.racks.get(i);
                violations.add(String.format(
                    "Rack %d AIRFLOW VIOLATION: Requires %.0f CFM, exceeds limit %.0f CFM. " +
                    "Peak load: %.1f kW. RECOMMENDATION: Liquid cooling or rack redistribution.",
                    i, rackAirflow[i], maxRackAirflowCFM, rack.peakLoadKW
                ));
            }
        }
        
        return violations.toArray(new String[0]);
    }
}
