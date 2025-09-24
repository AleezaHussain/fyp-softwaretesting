package com.acme.dccore;

import java.util.ArrayList;
import java.util.List;

public class RackSpec {
    // Basic rack properties
    private final int rackId;
    private final List<ServerSpec> servers = new ArrayList<>();

    // Physical rack properties
    private final int maxRackUnits; // Maximum U capacity (typically 42U)
    private final double heightM; // Rack height in meters
    private final double widthM; // Rack width in meters (typically 0.6m)
    private final double depthM; // Rack depth in meters (typically 1.0-1.2m)

    // Power and thermal properties
    private final double maxPowerKW; // Maximum power capacity per rack
    private final double powerDensityKWperU; // Power density kW per rack unit
    private final boolean hasInRowCooling; // In-row cooling unit present
    private final double rackPDUEfficiency; // Power distribution efficiency (0.95-0.99)

    // Airflow and cooling properties
    private final double designAirflowCFM; // Design airflow capacity
    private final boolean hasBlanking; // Blanking panels installed
    private final boolean hasHotColdAisle; // Hot/cold aisle containment
    private final String airflowDirection; // "front-to-back", "back-to-front", "side-to-side"

    // Thermal metrics (ASHRAE standards)
    private final double maxInletTempC; // Maximum safe inlet temperature
    private final double minInletTempC; // Minimum safe inlet temperature
    private final double maxSupplyTempC; // Maximum supply air temperature
    private final double returnTempC; // Return air temperature target

    // Rack thermal index (RTI) and rack cooling index (RCI) targets
    private final double targetRTI; // Target rack thermal index (should be < 1.0)
    private final double targetRCIHI; // Target RCI for high temperatures (should be > 90%)
    private final double targetRCILO; // Target RCI for low temperatures (should be > 90%)

    public RackSpec(int rackId, int maxRackUnits, double heightM, double widthM,
            double depthM, double maxPowerKW, double powerDensityKWperU,
            boolean hasInRowCooling, double rackPDUEfficiency,
            double designAirflowCFM, boolean hasBlanking,
            boolean hasHotColdAisle, String airflowDirection,
            double maxInletTempC, double minInletTempC,
            double maxSupplyTempC, double returnTempC,
            double targetRTI, double targetRCIHI, double targetRCILO) {
        this.rackId = rackId;
        this.maxRackUnits = maxRackUnits;
        this.heightM = heightM;
        this.widthM = widthM;
        this.depthM = depthM;
        this.maxPowerKW = maxPowerKW;
        this.powerDensityKWperU = powerDensityKWperU;
        this.hasInRowCooling = hasInRowCooling;
        this.rackPDUEfficiency = rackPDUEfficiency;
        this.designAirflowCFM = designAirflowCFM;
        this.hasBlanking = hasBlanking;
        this.hasHotColdAisle = hasHotColdAisle;
        this.airflowDirection = airflowDirection;
        this.maxInletTempC = maxInletTempC;
        this.minInletTempC = minInletTempC;
        this.maxSupplyTempC = maxSupplyTempC;
        this.returnTempC = returnTempC;
        this.targetRTI = targetRTI;
        this.targetRCIHI = targetRCIHI;
        this.targetRCILO = targetRCILO;
    }

    // Convenience constructor for basic rack
    public RackSpec(int rackId) {
        this(rackId, 42, 2.0, 0.6, 1.2, 20.0, 0.5, false, 0.97, 1500.0,
                true, true, "front-to-back", 27.0, 18.0, 24.0, 35.0,
                1.0, 90.0, 90.0);
    }

    public void addServer(ServerSpec server) {
        servers.add(server);
    }

    // Calculated thermal properties
    public double getTotalPowerKW() {
        return servers.stream()
                .mapToDouble(s -> s.getMaxPowerW() / 1000.0)
                .sum();
    }

    public double getTotalAirflowCFM() {
        return servers.stream()
                .mapToDouble(s -> s.getMaxAirflowCFM())
                .sum();
    }

    public double getUsedRackUnits() {
        return servers.stream()
                .mapToInt(ServerSpec::getUHeight)
                .sum();
    }

    public double getPowerUtilization() {
        return Math.min(getTotalPowerKW() / maxPowerKW, 1.0);
    }

    public double getSpaceUtilization() {
        return getUsedRackUnits() / maxRackUnits;
    }

    public double getAverageExhaustTempC(double inletTempC) {
        if (servers.isEmpty())
            return inletTempC;

        return servers.stream()
                .mapToDouble(s -> s.getExhaustTempC(inletTempC, 0.8)) // Assume 80% utilization
                .average()
                .orElse(inletTempC);
    }

    // Thermal performance metrics
    public double calculateRTI(double supplyTempC) {
        // RTI = (Tmax - Tsupply) / (Tref - Tsupply)
        // Where Tref is ASHRAE reference temperature (35°C)
        double maxExhaust = servers.stream()
                .mapToDouble(s -> s.getExhaustTempC(supplyTempC, 1.0))
                .max().orElse(supplyTempC);

        return (maxExhaust - supplyTempC) / (35.0 - supplyTempC);
    }

    public double calculateRCI_HI(double[] inletTemps) {
        // RCI_HI = percentage of inlet temperatures below max allowable
        long countBelowMax = 0;
        for (double temp : inletTemps) {
            if (temp <= maxInletTempC)
                countBelowMax++;
        }
        return (double) countBelowMax / inletTemps.length * 100.0;
    }

    public double calculateRCI_LO(double[] inletTemps) {
        // RCI_LO = percentage of inlet temperatures above min allowable
        long countAboveMin = 0;
        for (double temp : inletTemps) {
            if (temp >= minInletTempC)
                countAboveMin++;
        }
        return (double) countAboveMin / inletTemps.length * 100.0;
    }

    // Getters
    public int getRackId() {
        return rackId;
    }

    public List<ServerSpec> getServers() {
        return servers;
    }

    public int getMaxRackUnits() {
        return maxRackUnits;
    }

    public double getHeightM() {
        return heightM;
    }

    public double getWidthM() {
        return widthM;
    }

    public double getDepthM() {
        return depthM;
    }

    public double getMaxPowerKW() {
        return maxPowerKW;
    }

    public double getPowerDensityKWperU() {
        return powerDensityKWperU;
    }

    public boolean hasInRowCooling() {
        return hasInRowCooling;
    }

    public double getRackPDUEfficiency() {
        return rackPDUEfficiency;
    }

    public double getDesignAirflowCFM() {
        return designAirflowCFM;
    }

    public boolean hasBlanking() {
        return hasBlanking;
    }

    public boolean hasHotColdAisle() {
        return hasHotColdAisle;
    }

    public String getAirflowDirection() {
        return airflowDirection;
    }

    public double getMaxInletTempC() {
        return maxInletTempC;
    }

    public double getMinInletTempC() {
        return minInletTempC;
    }

    public double getMaxSupplyTempC() {
        return maxSupplyTempC;
    }

    public double getReturnTempC() {
        return returnTempC;
    }

    public double getTargetRTI() {
        return targetRTI;
    }

    public double getTargetRCIHI() {
        return targetRCIHI;
    }

    public double getTargetRCILO() {
        return targetRCILO;
    }
}
