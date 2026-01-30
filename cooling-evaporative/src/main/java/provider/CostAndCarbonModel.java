package provider;

public class CostAndCarbonModel {
    public double electricityRate_per_kWh; // $/kWh
    public double waterRate_per_m3; // $/m3
    public double gridCO2Factor_kg_per_kWh;// kgCO2/kWh
    public double carbonPrice_per_kg; // $/kgCO2 (optional)

    public CostAndCarbonModel(double electricityRate_per_kWh, double waterRate_per_m3, double gridCO2Factor_kg_per_kWh,
            double carbonPrice_per_kg) {
        this.electricityRate_per_kWh = electricityRate_per_kWh;
        this.waterRate_per_m3 = waterRate_per_m3;
        this.gridCO2Factor_kg_per_kWh = gridCO2Factor_kg_per_kWh;
        this.carbonPrice_per_kg = carbonPrice_per_kg;
    }

    public static class Output {
        public double electricityCost;
        public double waterCost;
        public double totalOPEX;
        public double co2Emissions;
        public double carbonCost;
    }

    public Output compute(double E_fan_kWh, double E_DX_kWh, double E_pump_kWh, double water_kg) {
        Output out = new Output();
        double E_total_kWh = E_fan_kWh + E_DX_kWh + E_pump_kWh;
        double water_m3 = water_kg / 1000.0;
        out.electricityCost = E_total_kWh * electricityRate_per_kWh;
        out.waterCost = water_m3 * waterRate_per_m3;
        out.co2Emissions = E_total_kWh * gridCO2Factor_kg_per_kWh;
        out.carbonCost = out.co2Emissions * carbonPrice_per_kg;
        out.totalOPEX = out.electricityCost + out.waterCost + out.carbonCost;
        return out;
    }
}
