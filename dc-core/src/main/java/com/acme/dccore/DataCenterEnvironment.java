package dccore.datacenter;

public class DataCenterEnvironment {

    private double ambientTempC;
    private double returnTempC;
    private double chilledWaterTempC;
    private double humidityPercent;

    public DataCenterEnvironment(double ambient, double returnTemp, double chilledTemp) {
        this.ambientTempC = ambient;
        this.returnTempC = returnTemp;
        this.chilledWaterTempC = chilledTemp;
        this.humidityPercent = 50;
    }

    // Simulate daily/hourly change
    public void updateEnvironment(double newAmbient, double newReturn, double newChilled) {
        this.ambientTempC = newAmbient;
        this.returnTempC = newReturn;
        this.chilledWaterTempC = newChilled;
    }

    public double getAmbientTempC() { return ambientTempC; }
    public double getReturnTempC() { return returnTempC; }
    public double getChilledWaterTempC() { return chilledWaterTempC; }
}
