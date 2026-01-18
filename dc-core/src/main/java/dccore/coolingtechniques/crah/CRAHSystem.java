package dccore.coolingtechniques.crah;

import dccore.datacenter.DataCenterEnvironment;

public class CRAHSystem {

    private final int unitCount;
    private final double capacityPerUnitKW;

    // CRAH characteristics
    private static final double CHILLER_COP = 5.2; // Higher efficiency due to chilled water
    private static final double FAN_POWER_RATIO = 0.06; // More efficient fans
    private static final double PUMP_POWER_RATIO = 0.04; // Chilled water pumps
    private static final double STANDBY_POWER_RATIO = 0.01; // Lower standby power

    public CRAHSystem(int unitCount, double capacityPerUnitKW) {
        this.unitCount = unitCount;
        this.capacityPerUnitKW = capacityPerUnitKW;
    }

    public double calculatePowerConsumption(double coolingLoadKW, DataCenterEnvironment environment) {
        double totalCapacity = unitCount * capacityPerUnitKW;

        if (coolingLoadKW > totalCapacity) {
            throw new IllegalArgumentException("Cooling load exceeds CRAH capacity");
        }

        // Calculate load ratio
        double loadRatio = coolingLoadKW / totalCapacity;

        // Chiller power (more efficient than CRAC compressors)
        double ambientTempC = environment.getAmbientTempC();
        double chilledWaterTempC = environment.getChilledWaterTempC();

        // CRAH efficiency improves with lower chilled water temperature
        double copEfficiency = CHILLER_COP * (1.0 + (15.0 - chilledWaterTempC) / 50.0);
        copEfficiency *= (1.0 - (ambientTempC - 25.0) / 120.0); // Less sensitive to ambient temp

        double chillerPower = coolingLoadKW / Math.max(copEfficiency, 2.0);

        // Fan power (variable speed drives for efficiency)
        double fanPower = coolingLoadKW * FAN_POWER_RATIO * Math.sqrt(loadRatio);

        // Pump power for chilled water circulation
        double pumpPower = coolingLoadKW * PUMP_POWER_RATIO * loadRatio;

        // Standby power for inactive units
        int activeUnits = Math.max(1, (int) Math.ceil(loadRatio * unitCount));
        int standbyUnits = unitCount - activeUnits;
        double standbyPower = standbyUnits * capacityPerUnitKW * STANDBY_POWER_RATIO;

        return chillerPower + fanPower + pumpPower + standbyPower;
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
        return "CRAH (Computer Room Air Handler)";
    }

    public boolean supportsVariableSpeed() {
        return true; // CRAH typically has variable speed capabilities
    }
}