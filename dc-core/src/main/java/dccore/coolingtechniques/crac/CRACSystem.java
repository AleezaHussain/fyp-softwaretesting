package dccore.coolingtechniques.crac;

import dccore.datacenter.DataCenterEnvironment;

public class CRACSystem {

    private final int unitCount;
    private final double capacityPerUnitKW;

    // CRAC characteristics
    private static final double COMPRESSOR_COP = 3.5; // Coefficient of Performance
    private static final double FAN_POWER_RATIO = 0.08; // Fan power as ratio of cooling capacity
    private static final double STANDBY_POWER_RATIO = 0.02; // Standby power ratio

    public CRACSystem(int unitCount, double capacityPerUnitKW) {
        this.unitCount = unitCount;
        this.capacityPerUnitKW = capacityPerUnitKW;
    }

    public double calculatePowerConsumption(double coolingLoadKW, DataCenterEnvironment environment) {
        double totalCapacity = unitCount * capacityPerUnitKW;

        if (coolingLoadKW > totalCapacity) {
            throw new IllegalArgumentException("Cooling load exceeds CRAC capacity");
        }

        // Calculate load ratio
        double loadRatio = coolingLoadKW / totalCapacity;

        // Compressor power (varies with load and ambient temperature)
        double ambientTempC = environment.getAmbientTempC();
        double copEfficiency = COMPRESSOR_COP * (1.0 - (ambientTempC - 25.0) / 100.0);
        double compressorPower = coolingLoadKW / Math.max(copEfficiency, 1.5);

        // Fan power (relatively constant)
        double fanPower = coolingLoadKW * FAN_POWER_RATIO;

        // Standby power for inactive units
        int activeUnits = Math.max(1, (int) Math.ceil(loadRatio * unitCount));
        int standbyUnits = unitCount - activeUnits;
        double standbyPower = standbyUnits * capacityPerUnitKW * STANDBY_POWER_RATIO;

        return compressorPower + fanPower + standbyPower;
    }

    public double calculateEfficiency(double coolingLoadKW, DataCenterEnvironment environment) {
        double powerConsumption = calculatePowerConsumption(coolingLoadKW, environment);
        return coolingLoadKW / powerConsumption; // EER (Energy Efficiency Ratio)
    }

    public double getTotalCapacity() {
        return unitCount * capacityPerUnitKW;
    }

    public int getUnitCount() {
        return unitCount;
    }

    public String getSystemType() {
        return "CRAC (Computer Room Air Conditioner)";
    }
}