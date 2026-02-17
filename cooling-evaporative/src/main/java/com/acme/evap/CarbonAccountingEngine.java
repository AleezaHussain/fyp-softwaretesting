package com.acme.evap;

/**
 * Carbon Accounting Engine - Backend-driven carbon emissions and tax calculations
 * Handles emissions tracking, carbon tax, and decarbonization scenarios
 */
public class CarbonAccountingEngine {
    
    public static class CarbonConfig {
        // Grid emissions
        public double gridEmissionsFactorKgCO2_per_kWh = 0.45; // US average
        public double gridDecarbonizationRate = 0.05; // 5% annual reduction
        
        // Carbon pricing
        public double carbonTaxUSD_per_ton = 50.0; // $/ton CO2
        public double carbonTaxEscalationRate = 0.15; // 15% annual increase
        public boolean enableCarbonTax = false;
        
        // Renewable energy
        public double renewableEnergyFraction = 0.0; // 0% to 100%
        public double renewableEmissionsFactor = 0.05; // Near-zero but not zero
        
        // Water carbon footprint
        public double waterTreatmentEmissions_kgCO2_per_m3 = 0.5; // Water treatment emissions
        public double waterTransportEmissions_kgCO2_per_m3 = 0.2; // Water transport emissions
        
        // Scope 2 & 3 emissions
        public boolean includeScope3 = false;
        public double scope3MultiplierFactor = 0.15; // Scope 3 is ~15% of Scope 2
    }
    
    public static class CarbonResult {
        // Emissions breakdown
        public double scope1EmissionsKg = 0.0; // Direct emissions (DX refrigerants, etc.)
        public double scope2EmissionsKg = 0.0; // Indirect emissions (electricity)
        public double scope3EmissionsKg = 0.0; // Other indirect (water, supply chain)
        public double totalEmissionsKg = 0.0;
        public double totalEmissionsTons = 0.0;
        
        // Carbon costs
        public double carbonTaxUSD = 0.0;
        public double carbonCostPerKWh = 0.0;
        
        // Intensity metrics
        public double carbonIntensityKgCO2_per_kWh = 0.0;
        public double carbonIntensityKgCO2_per_server = 0.0;
        
        // Renewable energy impact
        public double renewableEnergyKWh = 0.0;
        public double emissionsAvoidedKg = 0.0;
    }
    
    /**
     * Calculate carbon emissions for given energy consumption
     */
    public static CarbonResult calculateEmissions(CarbonConfig config,
                                                 double electricityKWh,
                                                 double waterLiters,
                                                 int numberOfServers,
                                                 int year) {
        CarbonResult result = new CarbonResult();
        
        // Apply grid decarbonization over time
        int yearOffset = Math.max(0, year - 2025);
        double adjustedGridFactor = config.gridEmissionsFactorKgCO2_per_kWh * 
                                   Math.pow(1.0 - config.gridDecarbonizationRate, yearOffset);
        adjustedGridFactor = Math.max(0.05, adjustedGridFactor); // Floor at 0.05
        
        // Calculate renewable vs grid energy
        result.renewableEnergyKWh = electricityKWh * config.renewableEnergyFraction;
        double gridEnergyKWh = electricityKWh * (1.0 - config.renewableEnergyFraction);
        
        // Scope 2: Electricity emissions
        double renewableEmissions = result.renewableEnergyKWh * config.renewableEmissionsFactor;
        double gridEmissions = gridEnergyKWh * adjustedGridFactor;
        result.scope2EmissionsKg = renewableEmissions + gridEmissions;
        
        // Emissions avoided by renewables
        result.emissionsAvoidedKg = result.renewableEnergyKWh * 
                                   (adjustedGridFactor - config.renewableEmissionsFactor);
        
        // Scope 3: Water-related emissions
        double waterM3 = waterLiters / 1000.0;
        double waterEmissions = waterM3 * (config.waterTreatmentEmissions_kgCO2_per_m3 + 
                                          config.waterTransportEmissions_kgCO2_per_m3);
        
        if (config.includeScope3) {
            // Add supply chain and other indirect emissions
            result.scope3EmissionsKg = waterEmissions + 
                                      (result.scope2EmissionsKg * config.scope3MultiplierFactor);
        } else {
            result.scope3EmissionsKg = waterEmissions;
        }
        
        // Total emissions
        result.totalEmissionsKg = result.scope1EmissionsKg + result.scope2EmissionsKg + result.scope3EmissionsKg;
        result.totalEmissionsTons = result.totalEmissionsKg / 1000.0;
        
        // Carbon tax calculation
        if (config.enableCarbonTax) {
            double adjustedCarbonTax = config.carbonTaxUSD_per_ton * 
                                      Math.pow(1.0 + config.carbonTaxEscalationRate, yearOffset);
            result.carbonTaxUSD = result.totalEmissionsTons * adjustedCarbonTax;
            result.carbonCostPerKWh = result.carbonTaxUSD / electricityKWh;
        }
        
        // Intensity metrics
        result.carbonIntensityKgCO2_per_kWh = result.totalEmissionsKg / electricityKWh;
        result.carbonIntensityKgCO2_per_server = result.totalEmissionsKg / numberOfServers;
        
        return result;
    }
    
    /**
     * Calculate multi-year carbon trajectory
     */
    public static class CarbonTrajectory {
        public int[] years;
        public double[] annualEmissionsTons;
        public double[] cumulativeEmissionsTons;
        public double[] annualCarbonTaxUSD;
        public double[] cumulativeCarbonTaxUSD;
        public double totalEmissionsTons;
        public double totalCarbonTaxUSD;
    }
    
    public static CarbonTrajectory calculateTrajectory(CarbonConfig config,
                                                      double annualElectricityKWh,
                                                      double annualWaterLiters,
                                                      int numberOfServers,
                                                      int startYear,
                                                      int projectionYears,
                                                      double itLoadGrowthRate) {
        CarbonTrajectory trajectory = new CarbonTrajectory();
        trajectory.years = new int[projectionYears];
        trajectory.annualEmissionsTons = new double[projectionYears];
        trajectory.cumulativeEmissionsTons = new double[projectionYears];
        trajectory.annualCarbonTaxUSD = new double[projectionYears];
        trajectory.cumulativeCarbonTaxUSD = new double[projectionYears];
        
        double cumulativeEmissions = 0.0;
        double cumulativeTax = 0.0;
        
        for (int i = 0; i < projectionYears; i++) {
            int year = startYear + i;
            trajectory.years[i] = year;
            
            // Apply IT load growth
            double yearElectricityKWh = annualElectricityKWh * Math.pow(1.0 + itLoadGrowthRate, i);
            double yearWaterLiters = annualWaterLiters * Math.pow(1.0 + itLoadGrowthRate, i);
            
            // Calculate emissions for this year
            CarbonResult yearResult = calculateEmissions(config, yearElectricityKWh, 
                                                        yearWaterLiters, numberOfServers, year);
            
            trajectory.annualEmissionsTons[i] = yearResult.totalEmissionsTons;
            trajectory.annualCarbonTaxUSD[i] = yearResult.carbonTaxUSD;
            
            cumulativeEmissions += yearResult.totalEmissionsTons;
            cumulativeTax += yearResult.carbonTaxUSD;
            
            trajectory.cumulativeEmissionsTons[i] = cumulativeEmissions;
            trajectory.cumulativeCarbonTaxUSD[i] = cumulativeTax;
        }
        
        trajectory.totalEmissionsTons = cumulativeEmissions;
        trajectory.totalCarbonTaxUSD = cumulativeTax;
        
        return trajectory;
    }
    
    /**
     * Compare emissions scenarios
     */
    public static class EmissionsComparison {
        public String scenarioName;
        public double totalEmissionsTons;
        public double emissionsReductionPercent;
        public double carbonTaxSavingsUSD;
        public String[] benefits;
    }
    
    public static EmissionsComparison[] compareScenarios(CarbonConfig baselineConfig,
                                                        CarbonConfig[] alternativeConfigs,
                                                        String[] scenarioNames,
                                                        double electricityKWh,
                                                        double waterLiters,
                                                        int numberOfServers,
                                                        int year) {
        // Calculate baseline
        CarbonResult baseline = calculateEmissions(baselineConfig, electricityKWh, 
                                                  waterLiters, numberOfServers, year);
        
        EmissionsComparison[] comparisons = new EmissionsComparison[alternativeConfigs.length];
        
        for (int i = 0; i < alternativeConfigs.length; i++) {
            EmissionsComparison comp = new EmissionsComparison();
            comp.scenarioName = scenarioNames[i];
            
            CarbonResult altResult = calculateEmissions(alternativeConfigs[i], electricityKWh,
                                                       waterLiters, numberOfServers, year);
            
            comp.totalEmissionsTons = altResult.totalEmissionsTons;
            comp.emissionsReductionPercent = ((baseline.totalEmissionsTons - altResult.totalEmissionsTons) / 
                                             baseline.totalEmissionsTons) * 100.0;
            comp.carbonTaxSavingsUSD = baseline.carbonTaxUSD - altResult.carbonTaxUSD;
            
            // Generate benefits
            java.util.List<String> benefits = new java.util.ArrayList<>();
            
            if (comp.emissionsReductionPercent > 0) {
                benefits.add(String.format("%.1f%% emissions reduction vs baseline", 
                                          comp.emissionsReductionPercent));
            }
            
            if (comp.carbonTaxSavingsUSD > 0) {
                benefits.add(String.format("$%.2f annual carbon tax savings", 
                                          comp.carbonTaxSavingsUSD));
            }
            
            if (alternativeConfigs[i].renewableEnergyFraction > baselineConfig.renewableEnergyFraction) {
                double renewableIncrease = (alternativeConfigs[i].renewableEnergyFraction - 
                                           baselineConfig.renewableEnergyFraction) * 100;
                benefits.add(String.format("%.0f%% increase in renewable energy usage", 
                                          renewableIncrease));
            }
            
            comp.benefits = benefits.toArray(new String[0]);
            comparisons[i] = comp;
        }
        
        return comparisons;
    }
    
    /**
     * Calculate carbon payback period for efficiency investment
     */
    public static class CarbonPayback {
        public double paybackYears;
        public double annualEmissionsReductionTons;
        public double lifetimeEmissionsReductionTons;
        public boolean isViable;
    }
    
    public static CarbonPayback calculateCarbonPayback(double investmentCostUSD,
                                                      double annualEmissionsReductionTons,
                                                      double carbonTaxUSD_per_ton,
                                                      int equipmentLifetimeYears) {
        CarbonPayback payback = new CarbonPayback();
        payback.annualEmissionsReductionTons = annualEmissionsReductionTons;
        payback.lifetimeEmissionsReductionTons = annualEmissionsReductionTons * equipmentLifetimeYears;
        
        // Calculate payback based on carbon tax savings
        double annualCarbonSavings = annualEmissionsReductionTons * carbonTaxUSD_per_ton;
        
        if (annualCarbonSavings > 0) {
            payback.paybackYears = investmentCostUSD / annualCarbonSavings;
            payback.isViable = payback.paybackYears <= equipmentLifetimeYears;
        } else {
            payback.paybackYears = Double.POSITIVE_INFINITY;
            payback.isViable = false;
        }
        
        return payback;
    }
    
    /**
     * Generate carbon reduction recommendations
     */
    public static String[] generateCarbonRecommendations(CarbonResult current,
                                                        CarbonConfig config,
                                                        double pue) {
        java.util.List<String> recommendations = new java.util.ArrayList<>();
        
        // High emissions intensity
        if (current.carbonIntensityKgCO2_per_kWh > 0.4) {
            recommendations.add("High carbon intensity - consider renewable energy procurement");
            recommendations.add("Implement power purchase agreements (PPAs) for clean energy");
        }
        
        // Low renewable energy usage
        if (config.renewableEnergyFraction < 0.3) {
            recommendations.add("Increase renewable energy fraction to 30% or higher");
            recommendations.add("Install on-site solar panels or wind turbines if feasible");
        }
        
        // High PUE
        if (pue > 1.4) {
            recommendations.add("Improve PUE to reduce overall electricity consumption");
            recommendations.add("Optimize cooling efficiency to lower carbon footprint");
        }
        
        // Carbon tax exposure
        if (config.enableCarbonTax && current.carbonTaxUSD > 10000) {
            recommendations.add("Significant carbon tax exposure - prioritize decarbonization");
            recommendations.add("Consider carbon offset programs for remaining emissions");
        }
        
        // Scope 3 emissions
        if (config.includeScope3 && current.scope3EmissionsKg > current.scope2EmissionsKg * 0.2) {
            recommendations.add("High Scope 3 emissions - engage suppliers on sustainability");
            recommendations.add("Optimize water usage to reduce treatment/transport emissions");
        }
        
        return recommendations.toArray(new String[0]);
    }
}
