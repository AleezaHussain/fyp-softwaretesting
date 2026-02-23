package com.acme.chilledwatersystem;

import java.util.HashMap;
import java.util.Map;

/**
 * Phase 4 Part 4: Design Solution for Multi-Objective Optimization
 * 
 * Represents a complete design configuration with its performance metrics.
 */
public class DesignSolution implements Comparable<DesignSolution> {
    
    // Design parameters
    private double supplyWaterTempC;
    private double coolingTowerApproachC;
    private double rackDensityKW;
    private String coolingTechnology; // "CHILLED_WATER", "IMMERSION", "HYBRID"
    
    // Objective function values
    private double tewi; // Total Equivalent Warming Impact (tons CO2e)
    private double escalatedNPV; // Net Present Value with inflation (USD)
    private double wue; // Water Usage Effectiveness (L/kWh)
    
    // Additional metrics
    private double pue;
    private double totalCostUSD;
    private double thermalThrottlingHours;
    
    // Pareto ranking
    private int dominationCount = 0;
    private int rank = 0;
    private double crowdingDistance = 0.0;
    
    public DesignSolution() {
        // Default constructor
    }
    
    public DesignSolution(double supplyWaterTempC, double coolingTowerApproachC,
                         double rackDensityKW, String coolingTechnology) {
        this.supplyWaterTempC = supplyWaterTempC;
        this.coolingTowerApproachC = coolingTowerApproachC;
        this.rackDensityKW = rackDensityKW;
        this.coolingTechnology = coolingTechnology;
    }
    
    /**
     * Check if this solution dominates another (Pareto dominance)
     * A solution dominates another if it's better in at least one objective
     * and not worse in any objective.
     */
    public boolean dominates(DesignSolution other) {
        boolean betterInAtLeastOne = false;
        
        // Minimize TEWI
        if (this.tewi < other.tewi) {
            betterInAtLeastOne = true;
        } else if (this.tewi > other.tewi) {
            return false;
        }
        
        // Maximize NPV (so we check if this NPV > other NPV)
        if (this.escalatedNPV > other.escalatedNPV) {
            betterInAtLeastOne = true;
        } else if (this.escalatedNPV < other.escalatedNPV) {
            return false;
        }
        
        // Minimize WUE
        if (this.wue < other.wue) {
            betterInAtLeastOne = true;
        } else if (this.wue > other.wue) {
            return false;
        }
        
        return betterInAtLeastOne;
    }
    
    /**
     * Calculate Euclidean distance to another solution in objective space
     */
    public double distanceTo(DesignSolution other) {
        double dTewi = (this.tewi - other.tewi);
        double dNpv = (this.escalatedNPV - other.escalatedNPV);
        double dWue = (this.wue - other.wue);
        
        return Math.sqrt(dTewi * dTewi + dNpv * dNpv + dWue * dWue);
    }
    
    /**
     * Create a copy of this solution
     */
    public DesignSolution copy() {
        DesignSolution copy = new DesignSolution(
            this.supplyWaterTempC,
            this.coolingTowerApproachC,
            this.rackDensityKW,
            this.coolingTechnology
        );
        copy.tewi = this.tewi;
        copy.escalatedNPV = this.escalatedNPV;
        copy.wue = this.wue;
        copy.pue = this.pue;
        copy.totalCostUSD = this.totalCostUSD;
        copy.thermalThrottlingHours = this.thermalThrottlingHours;
        return copy;
    }
    
    @Override
    public int compareTo(DesignSolution other) {
        // First compare by rank
        if (this.rank != other.rank) {
            return Integer.compare(this.rank, other.rank);
        }
        // Then by crowding distance (higher is better)
        return Double.compare(other.crowdingDistance, this.crowdingDistance);
    }
    
    @Override
    public String toString() {
        return String.format(
            "Design[Temp=%.1f°C, Approach=%.1f°C, Density=%.0f kW/rack, Tech=%s | " +
            "TEWI=%.0f tons, NPV=$%.0f, WUE=%.2f L/kWh]",
            supplyWaterTempC, coolingTowerApproachC, rackDensityKW, coolingTechnology,
            tewi, escalatedNPV, wue
        );
    }
    
    // Getters and Setters
    public double getSupplyWaterTempC() {
        return supplyWaterTempC;
    }
    
    public void setSupplyWaterTempC(double supplyWaterTempC) {
        this.supplyWaterTempC = supplyWaterTempC;
    }
    
    public double getCoolingTowerApproachC() {
        return coolingTowerApproachC;
    }
    
    public void setCoolingTowerApproachC(double coolingTowerApproachC) {
        this.coolingTowerApproachC = coolingTowerApproachC;
    }
    
    public double getRackDensityKW() {
        return rackDensityKW;
    }
    
    public void setRackDensityKW(double rackDensityKW) {
        this.rackDensityKW = rackDensityKW;
    }
    
    public String getCoolingTechnology() {
        return coolingTechnology;
    }
    
    public void setCoolingTechnology(String coolingTechnology) {
        this.coolingTechnology = coolingTechnology;
    }
    
    public double getTewi() {
        return tewi;
    }
    
    public void setTewi(double tewi) {
        this.tewi = tewi;
    }
    
    public double getEscalatedNPV() {
        return escalatedNPV;
    }
    
    public void setEscalatedNPV(double escalatedNPV) {
        this.escalatedNPV = escalatedNPV;
    }
    
    public double getWue() {
        return wue;
    }
    
    public void setWue(double wue) {
        this.wue = wue;
    }
    
    public double getPue() {
        return pue;
    }
    
    public void setPue(double pue) {
        this.pue = pue;
    }
    
    public double getTotalCostUSD() {
        return totalCostUSD;
    }
    
    public void setTotalCostUSD(double totalCostUSD) {
        this.totalCostUSD = totalCostUSD;
    }
    
    public double getThermalThrottlingHours() {
        return thermalThrottlingHours;
    }
    
    public void setThermalThrottlingHours(double thermalThrottlingHours) {
        this.thermalThrottlingHours = thermalThrottlingHours;
    }
    
    public int getDominationCount() {
        return dominationCount;
    }
    
    public void setDominationCount(int dominationCount) {
        this.dominationCount = dominationCount;
    }
    
    public int getRank() {
        return rank;
    }
    
    public void setRank(int rank) {
        this.rank = rank;
    }
    
    public double getCrowdingDistance() {
        return crowdingDistance;
    }
    
    public void setCrowdingDistance(double crowdingDistance) {
        this.crowdingDistance = crowdingDistance;
    }
}
