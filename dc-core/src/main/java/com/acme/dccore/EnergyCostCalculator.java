package dccore.datacenter;

public class EnergyCostCalculator {

    private double totalCoolingEnergyKWh;
    private double totalITEnergyKWh;

    public void recordHour(double coolingPowerKW, double itPowerKW) {
        totalCoolingEnergyKWh += coolingPowerKW; // per hour
        totalITEnergyKWh += itPowerKW;
    }

    public double getTotalEnergyKWh() {
        return totalCoolingEnergyKWh + totalITEnergyKWh;
    }

    public double getTotalCO2(double emissionFactor) {
        return getTotalEnergyKWh() * emissionFactor;
    }

    public double getElectricityCost(double costPerKWh) {
        return getTotalEnergyKWh() * costPerKWh;
    }

    public double getPUE() {
        return getTotalEnergyKWh() / totalITEnergyKWh;
    }
}
