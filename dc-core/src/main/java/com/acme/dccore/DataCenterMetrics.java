package dccore.datacenter;

public class DataCenterMetrics {

    public static double calculatePUE(double totalPowerKW, double itPowerKW) {
        return totalPowerKW / itPowerKW;
    }

    public static double calculateCUE(double pue, double emissionFactor) {
        return pue * emissionFactor; // kg CO₂ per kWh IT
    }

    public static double calculateCO2(double totalEnergyKWh, double emissionFactor) {
        return totalEnergyKWh * emissionFactor;
    }

    public static double calculateAnnualCost(double totalEnergyKWh, double costPerKWh) {
        return totalEnergyKWh * costPerKWh;
    }

    public static double calculateROI(double investment, double annualSavings) {
        return (annualSavings / investment) * 100;
    }

    public static double calculatePayback(double investment, double annualSavings) {
        return investment / annualSavings;
    }
}
