package dccore.datacenter;

public class DataCenterEnvironment {

    private final double ambientTempC;
    private final double returnAirTempC;
    private final double chilledWaterTempC;

    public DataCenterEnvironment(double ambientTempC, double returnAirTempC, double chilledWaterTempC) {
        this.ambientTempC = ambientTempC;
        this.returnAirTempC = returnAirTempC;
        this.chilledWaterTempC = chilledWaterTempC;
    }

    public double getAmbientTempC() {
        return ambientTempC;
    }

    public double getReturnTempC() {
        return returnAirTempC;
    }

    public double getChilledWaterTempC() {
        return chilledWaterTempC;
    }

    public double calculateCoolingDemand(double itLoadKW) {
        // Calculate cooling demand based on IT load and temperature differential
        double tempDiff = returnAirTempC - DataCenterConfig.MAX_SUPPLY_TEMP_C;
        return itLoadKW * (1.0 + tempDiff / 20.0); // Simple model
    }

    public boolean isWithinOperatingLimits() {
        return ambientTempC >= 10.0 && ambientTempC <= 40.0 &&
                returnAirTempC >= 25.0 && returnAirTempC <= 45.0;
    }
}