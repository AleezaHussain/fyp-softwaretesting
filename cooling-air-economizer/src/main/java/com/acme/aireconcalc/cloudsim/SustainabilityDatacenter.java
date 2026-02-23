package com.acme.aireconcalc.cloudsim;

import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.hosts.Host;
import java.util.List;

/**
 * Sustainability Datacenter - Facility-level carbon accounting and financial tracking
 * 
 * This class extends DatacenterSimple to act as the "Sustainability Controller"
 * for the entire facility. It aggregates power, water, and thermal metrics from
 * all ThermalEvaporativeHosts and applies:
 * 
 * - Carbon accounting (grid emissions, carbon tax)
 * - OPEX calculations (electricity costs with escalation)
 * - Multi-year projections (2025-2030)
 * - Climate change impact modeling
 * - PUE/CUE/WUE tracking
 * 
 * INTEGRATION:
 * - Step 1 (AIWorkloadPowerModel): Dynamic power per host
 * - Step 2 (ThermalEvaporativeHost): Thermal reality per host
 * - Step 3 (This class): Facility-level aggregation and financial modeling
 */
public class SustainabilityDatacenter extends DatacenterSimple {
    
    // Financial parameters
    private double electricityTariff;           // $/kWh
    private double carbonTaxRate;               // $/ton CO2
    private double energyEscalationRate;        // Annual electricity cost increase (e.g., 0.03 = 3%)
    private double carbonTaxEscalationRate;     // Annual carbon tax increase (e.g., 0.15 = 15%)
    private double gridCarbonIntensity;         // kg CO2/kWh
    private double gridDecarbonizationRate;     // Annual reduction in grid carbon intensity
    
    // Cumulative tracking
    private double cumulativeEnergyKWh;         // Total energy consumed (kWh)
    private double cumulativeCarbonKg;          // Total CO2 emissions (kg)
    private double cumulativeCarbonTax;         // Total carbon tax paid ($)
    private double cumulativeOpex;              // Total operational expenditure ($)
    private double cumulativeWaterLiters;       // Total water consumed (liters)
    
    // Hourly tracking for detailed analysis
    private double[] hourlyPowerKW;             // Power consumption by hour
    private double[] hourlyPUE;                 // PUE by hour
    private double[] hourlyCUE;                 // CUE by hour
    private double[] hourlyWUE;                 // WUE by hour (L/kWh)
    private String[] hourlyCoolingMode;         // Dominant cooling mode by hour
    
    // Simulation parameters
    private int simulationHours;
    private int currentHour;
    private double simulationStartYear;         // e.g., 2025
    
    // Baseline for comparison (mechanical-only cooling)
    private double baselinePUE = 1.8;           // Typical mechanical-only PUE
    
    /**
     * Create Sustainability Datacenter
     * 
     * @param simulation CloudSim Plus simulation
     * @param hostList List of hosts (should be ThermalEvaporativeHost instances)
     */
    public SustainabilityDatacenter(CloudSimPlus simulation, List<? extends Host> hostList) {
        super(simulation, hostList);
        
        // Initialize with default values (can be overridden)
        this.electricityTariff = 0.12;          // $0.12/kWh
        this.carbonTaxRate = 50.0;              // $50/ton CO2 (2025 baseline)
        this.energyEscalationRate = 0.03;       // 3% annual increase
        this.carbonTaxEscalationRate = 0.15;    // 15% annual increase
        this.gridCarbonIntensity = 0.45;        // 450g CO2/kWh (typical grid)
        this.gridDecarbonizationRate = 0.02;    // 2% annual reduction
        
        // Initialize cumulative tracking
        this.cumulativeEnergyKWh = 0.0;
        this.cumulativeCarbonKg = 0.0;
        this.cumulativeCarbonTax = 0.0;
        this.cumulativeOpex = 0.0;
        this.cumulativeWaterLiters = 0.0;
        
        this.currentHour = 0;
        this.simulationStartYear = 2025.0;
    }
    
    /**
     * Initialize hourly tracking arrays
     * 
     * @param hours Number of simulation hours
     */
    public void initializeHourlyTracking(int hours) {
        this.simulationHours = hours;
        this.hourlyPowerKW = new double[hours];
        this.hourlyPUE = new double[hours];
        this.hourlyCUE = new double[hours];
        this.hourlyWUE = new double[hours];
        this.hourlyCoolingMode = new String[hours];
    }
    
    /**
     * Update facility metrics at each simulation step
     * 
     * This method is called periodically to aggregate metrics from all hosts
     * and calculate facility-level sustainability indicators.
     * 
     * @param currentTime Current simulation time (seconds)
     */
    public void updateFacilityMetrics(double currentTime) {
        // Convert simulation time to hour
        int hour = (int) (currentTime / 3600.0);
        if (hour >= simulationHours) {
            return; // Beyond tracking period
        }
        
        this.currentHour = hour;
        
        // Aggregate metrics from all thermal hosts
        FacilityMetrics metrics = aggregateHostMetrics();
        
        // Calculate facility-level indicators
        double itPowerKW = metrics.totalITPowerKW;
        double coolingPowerKW = metrics.totalCoolingPowerKW;
        double fanPowerKW = metrics.totalFanPowerKW;
        double totalPowerKW = itPowerKW + coolingPowerKW + fanPowerKW;
        
        // PUE = Total Facility Power / IT Power
        double pue = itPowerKW > 0 ? totalPowerKW / itPowerKW : 0.0;
        
        // Calculate carbon emissions for this hour
        double currentYear = simulationStartYear + (hour / 8760.0);
        double yearsElapsed = currentYear - simulationStartYear;
        double adjustedCarbonIntensity = gridCarbonIntensity * Math.pow(1.0 - gridDecarbonizationRate, yearsElapsed);
        double hourlyEmissionsKg = totalPowerKW * adjustedCarbonIntensity;
        
        // CUE = (Total Power × Carbon Intensity) / IT Power
        double cue = itPowerKW > 0 ? (totalPowerKW * adjustedCarbonIntensity) / itPowerKW : 0.0;
        
        // WUE = Water Consumption (L) / IT Energy (kWh)
        double wue = itPowerKW > 0 ? metrics.totalWaterLiters / itPowerKW : 0.0;
        
        // Calculate costs with escalation
        double adjustedElectricityTariff = electricityTariff * Math.pow(1.0 + energyEscalationRate, yearsElapsed);
        double adjustedCarbonTax = carbonTaxRate * Math.pow(1.0 + carbonTaxEscalationRate, yearsElapsed);
        
        double hourlyCost = totalPowerKW * adjustedElectricityTariff;
        double hourlyCarbonTaxCost = (hourlyEmissionsKg / 1000.0) * adjustedCarbonTax; // Convert kg to tons
        
        // Update cumulative tracking
        this.cumulativeEnergyKWh += totalPowerKW;
        this.cumulativeCarbonKg += hourlyEmissionsKg;
        this.cumulativeCarbonTax += hourlyCarbonTaxCost;
        this.cumulativeOpex += (hourlyCost + hourlyCarbonTaxCost);
        this.cumulativeWaterLiters += metrics.totalWaterLiters;
        
        // Store hourly metrics
        if (hour < simulationHours) {
            this.hourlyPowerKW[hour] = totalPowerKW;
            this.hourlyPUE[hour] = pue;
            this.hourlyCUE[hour] = cue;
            this.hourlyWUE[hour] = wue;
            this.hourlyCoolingMode[hour] = metrics.dominantCoolingMode;
        }
    }
    
    /**
     * Aggregate metrics from all thermal hosts
     * 
     * @return FacilityMetrics object with aggregated data
     */
    private FacilityMetrics aggregateHostMetrics() {
        FacilityMetrics metrics = new FacilityMetrics();
        
        int decCount = 0, iecCount = 0, dxCount = 0;
        
        for (Host host : getHostList()) {
            if (host instanceof ThermalEvaporativeHost) {
                ThermalEvaporativeHost thermalHost = (ThermalEvaporativeHost) host;
                
                // Aggregate power
                double hostPowerW = host.getPowerModel().getPower(host.getCpuPercentUtilization());
                metrics.totalITPowerKW += hostPowerW / 1000.0;
                
                // Aggregate water
                metrics.totalWaterLiters += thermalHost.getWaterConsumedThisStep();
                
                // Count cooling modes
                String mode = thermalHost.getCurrentCoolingMode();
                if ("DEC".equals(mode)) decCount++;
                else if ("IEC".equals(mode)) iecCount++;
                else if ("DX".equals(mode)) dxCount++;
                
                // Track thermal violations
                if (!thermalHost.isCoolingAdequate()) {
                    metrics.thermalViolations++;
                }
            }
        }
        
        // Determine dominant cooling mode
        if (decCount > iecCount && decCount > dxCount) {
            metrics.dominantCoolingMode = "DEC";
        } else if (iecCount > dxCount) {
            metrics.dominantCoolingMode = "IEC";
        } else {
            metrics.dominantCoolingMode = "DX";
        }
        
        // Estimate cooling and fan power (simplified model)
        // In a full implementation, these would come from detailed HVAC models
        metrics.totalCoolingPowerKW = metrics.totalITPowerKW * 0.3; // Assume 30% of IT load for cooling
        metrics.totalFanPowerKW = metrics.totalITPowerKW * 0.05;    // Assume 5% of IT load for fans
        
        return metrics;
    }
    
    /**
     * Get facility summary report
     * 
     * @return FacilitySummary object
     */
    public FacilitySummary getFacilitySummary() {
        FacilitySummary summary = new FacilitySummary();
        
        // Energy metrics
        summary.totalEnergyKWh = cumulativeEnergyKWh;
        summary.averagePowerKW = simulationHours > 0 ? cumulativeEnergyKWh / simulationHours : 0.0;
        
        // Calculate average PUE
        double sumPUE = 0.0;
        int validHours = 0;
        for (int i = 0; i < Math.min(currentHour, simulationHours); i++) {
            if (hourlyPUE[i] > 0) {
                sumPUE += hourlyPUE[i];
                validHours++;
            }
        }
        summary.averagePUE = validHours > 0 ? sumPUE / validHours : 0.0;
        
        // Carbon metrics
        summary.totalCarbonKg = cumulativeCarbonKg;
        summary.totalCarbonTons = cumulativeCarbonKg / 1000.0;
        summary.averageCUE = summary.totalEnergyKWh > 0 ? summary.totalCarbonKg / summary.totalEnergyKWh : 0.0;
        
        // Water metrics
        summary.totalWaterLiters = cumulativeWaterLiters;
        summary.averageWUE = summary.totalEnergyKWh > 0 ? summary.totalWaterLiters / summary.totalEnergyKWh : 0.0;
        
        // Financial metrics
        summary.totalOpex = cumulativeOpex;
        summary.totalCarbonTax = cumulativeCarbonTax;
        summary.totalEnergyCost = cumulativeOpex - cumulativeCarbonTax;
        
        // Baseline comparison (mechanical-only)
        double baselineEnergy = summary.totalEnergyKWh * (baselinePUE / summary.averagePUE);
        double baselineCost = baselineEnergy * electricityTariff;
        double baselineCarbon = baselineEnergy * gridCarbonIntensity;
        double baselineCarbonTax = (baselineCarbon / 1000.0) * carbonTaxRate;
        
        summary.energySavingsKWh = baselineEnergy - summary.totalEnergyKWh;
        summary.costSavings = (baselineCost + baselineCarbonTax) - cumulativeOpex;
        summary.carbonSavingsKg = baselineCarbon - summary.totalCarbonKg;
        
        // Cooling mode distribution
        int decHours = 0, iecHours = 0, dxHours = 0;
        for (int i = 0; i < Math.min(currentHour, simulationHours); i++) {
            if ("DEC".equals(hourlyCoolingMode[i])) decHours++;
            else if ("IEC".equals(hourlyCoolingMode[i])) iecHours++;
            else if ("DX".equals(hourlyCoolingMode[i])) dxHours++;
        }
        
        int totalHours = Math.max(1, decHours + iecHours + dxHours);
        summary.decModePercentage = (decHours * 100.0) / totalHours;
        summary.iecModePercentage = (iecHours * 100.0) / totalHours;
        summary.dxModePercentage = (dxHours * 100.0) / totalHours;
        
        return summary;
    }
    
    // Getters and setters
    
    public void setElectricityTariff(double tariff) {
        this.electricityTariff = tariff;
    }
    
    public void setCarbonTaxRate(double rate) {
        this.carbonTaxRate = rate;
    }
    
    public void setEnergyEscalationRate(double rate) {
        this.energyEscalationRate = rate;
    }
    
    public void setCarbonTaxEscalationRate(double rate) {
        this.carbonTaxEscalationRate = rate;
    }
    
    public void setGridCarbonIntensity(double intensity) {
        this.gridCarbonIntensity = intensity;
    }
    
    public void setGridDecarbonizationRate(double rate) {
        this.gridDecarbonizationRate = rate;
    }
    
    public void setSimulationStartYear(double year) {
        this.simulationStartYear = year;
    }
    
    public void setBaselinePUE(double pue) {
        this.baselinePUE = pue;
    }
    
    public double getCumulativeEnergyKWh() {
        return cumulativeEnergyKWh;
    }
    
    public double getCumulativeCarbonKg() {
        return cumulativeCarbonKg;
    }
    
    public double getCumulativeCarbonTax() {
        return cumulativeCarbonTax;
    }
    
    public double getCumulativeOpex() {
        return cumulativeOpex;
    }
    
    public double getCumulativeWaterLiters() {
        return cumulativeWaterLiters;
    }
    
    public double[] getHourlyPowerKW() {
        return hourlyPowerKW;
    }
    
    public double[] getHourlyPUE() {
        return hourlyPUE;
    }
    
    public double[] getHourlyCUE() {
        return hourlyCUE;
    }
    
    public double[] getHourlyWUE() {
        return hourlyWUE;
    }
    
    public String[] getHourlyCoolingMode() {
        return hourlyCoolingMode;
    }
    
    // Inner classes for data structures
    
    /**
     * Facility-level metrics aggregated from all hosts
     */
    private static class FacilityMetrics {
        double totalITPowerKW = 0.0;
        double totalCoolingPowerKW = 0.0;
        double totalFanPowerKW = 0.0;
        double totalWaterLiters = 0.0;
        String dominantCoolingMode = "DX";
        int thermalViolations = 0;
    }
    
    /**
     * Facility summary report
     */
    public static class FacilitySummary {
        // Energy
        public double totalEnergyKWh;
        public double averagePowerKW;
        public double averagePUE;
        
        // Carbon
        public double totalCarbonKg;
        public double totalCarbonTons;
        public double averageCUE;
        
        // Water
        public double totalWaterLiters;
        public double averageWUE;
        
        // Financial
        public double totalOpex;
        public double totalEnergyCost;
        public double totalCarbonTax;
        
        // Savings (vs baseline)
        public double energySavingsKWh;
        public double costSavings;
        public double carbonSavingsKg;
        
        // Cooling mode distribution
        public double decModePercentage;
        public double iecModePercentage;
        public double dxModePercentage;
        
        @Override
        public String toString() {
            return String.format(
                "FacilitySummary[Energy=%.1f kWh, PUE=%.2f, Carbon=%.1f tons, Water=%.1f L, OPEX=$%.2f, Savings=$%.2f]",
                totalEnergyKWh, averagePUE, totalCarbonTons, totalWaterLiters, totalOpex, costSavings
            );
        }
    }
}
