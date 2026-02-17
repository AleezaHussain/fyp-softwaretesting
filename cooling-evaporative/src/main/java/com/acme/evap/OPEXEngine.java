package com.acme.evap;

/**
 * OPEX Escalation Engine - Backend-driven financial modeling
 * Handles multi-year OPEX projections with inflation and escalation
 */
public class OPEXEngine {
    
    public static class OPEXConfig {
        // Base rates (Year 1)
        public double electricityRate_USD_per_kWh = 0.12;
        public double waterRate_USD_per_m3 = 1.0;
        
        // Escalation rates (annual)
        public double electricityEscalationRate = 0.03; // 3% annual
        public double waterEscalationRate = 0.04; // 4% annual
        public double generalInflationRate = 0.02; // 2% annual
        
        // Financial parameters
        public double discountRate = 0.08; // 8% for NPV
        public int projectionYears = 5; // 2025-2030
        
        // Maintenance & operations
        public double annualMaintenanceCost_USD = 5000.0;
        public double maintenanceEscalationRate = 0.03;
        
        // Labor costs
        public double annualLaborCost_USD = 50000.0;
        public double laborEscalationRate = 0.04;
        
        // Equipment replacement reserve
        public double equipmentReplacementReserve_percent = 0.05; // 5% of CAPEX annually
    }
    
    public static class AnnualOPEX {
        public int year;
        public double electricityCost_USD;
        public double waterCost_USD;
        public double carbonCost_USD;
        public double maintenanceCost_USD;
        public double laborCost_USD;
        public double equipmentReserveCost_USD;
        public double totalOPEX_USD;
        public double discountedOPEX_USD;
        
        // Rate information
        public double electricityRate_USD_per_kWh;
        public double waterRate_USD_per_m3;
    }
    
    public static class OPEXProjection {
        public AnnualOPEX[] annualResults;
        public double totalNominalOPEX_USD;
        public double totalDiscountedOPEX_USD; // NPV
        public double averageAnnualOPEX_USD;
        public double totalElectricityCost_USD;
        public double totalWaterCost_USD;
        public double totalCarbonCost_USD;
    }
    
    /**
     * Calculate multi-year OPEX projection with escalation
     */
    public static OPEXProjection calculateProjection(OPEXConfig config,
                                                    double annualElectricityKWh,
                                                    double annualWaterLiters,
                                                    double annualCarbonCost_USD,
                                                    double capexInvestment_USD,
                                                    double itLoadGrowthRate) {
        OPEXProjection projection = new OPEXProjection();
        projection.annualResults = new AnnualOPEX[config.projectionYears];
        
        double cumulativeNominal = 0.0;
        double cumulativeDiscounted = 0.0;
        double cumulativeElectricity = 0.0;
        double cumulativeWater = 0.0;
        double cumulativeCarbon = 0.0;
        
        for (int i = 0; i < config.projectionYears; i++) {
            AnnualOPEX annual = new AnnualOPEX();
            annual.year = 2025 + i;
            
            // Apply escalation to rates
            annual.electricityRate_USD_per_kWh = config.electricityRate_USD_per_kWh * 
                                                 Math.pow(1.0 + config.electricityEscalationRate, i);
            annual.waterRate_USD_per_m3 = config.waterRate_USD_per_m3 * 
                                         Math.pow(1.0 + config.waterEscalationRate, i);
            
            // Apply IT load growth to consumption
            double yearElectricityKWh = annualElectricityKWh * Math.pow(1.0 + itLoadGrowthRate, i);
            double yearWaterM3 = (annualWaterLiters / 1000.0) * Math.pow(1.0 + itLoadGrowthRate, i);
            double yearCarbonCost = annualCarbonCost_USD * Math.pow(1.0 + itLoadGrowthRate, i);
            
            // Calculate costs
            annual.electricityCost_USD = yearElectricityKWh * annual.electricityRate_USD_per_kWh;
            annual.waterCost_USD = yearWaterM3 * annual.waterRate_USD_per_m3;
            annual.carbonCost_USD = yearCarbonCost;
            
            // Maintenance costs with escalation
            annual.maintenanceCost_USD = config.annualMaintenanceCost_USD * 
                                        Math.pow(1.0 + config.maintenanceEscalationRate, i);
            
            // Labor costs with escalation
            annual.laborCost_USD = config.annualLaborCost_USD * 
                                  Math.pow(1.0 + config.laborEscalationRate, i);
            
            // Equipment replacement reserve
            annual.equipmentReserveCost_USD = capexInvestment_USD * config.equipmentReplacementReserve_percent;
            
            // Total OPEX
            annual.totalOPEX_USD = annual.electricityCost_USD + 
                                  annual.waterCost_USD + 
                                  annual.carbonCost_USD + 
                                  annual.maintenanceCost_USD + 
                                  annual.laborCost_USD + 
                                  annual.equipmentReserveCost_USD;
            
            // Discounted OPEX (NPV)
            annual.discountedOPEX_USD = annual.totalOPEX_USD / Math.pow(1.0 + config.discountRate, i);
            
            // Accumulate totals
            cumulativeNominal += annual.totalOPEX_USD;
            cumulativeDiscounted += annual.discountedOPEX_USD;
            cumulativeElectricity += annual.electricityCost_USD;
            cumulativeWater += annual.waterCost_USD;
            cumulativeCarbon += annual.carbonCost_USD;
            
            projection.annualResults[i] = annual;
        }
        
        projection.totalNominalOPEX_USD = cumulativeNominal;
        projection.totalDiscountedOPEX_USD = cumulativeDiscounted;
        projection.averageAnnualOPEX_USD = cumulativeNominal / config.projectionYears;
        projection.totalElectricityCost_USD = cumulativeElectricity;
        projection.totalWaterCost_USD = cumulativeWater;
        projection.totalCarbonCost_USD = cumulativeCarbon;
        
        return projection;
    }
    
    /**
     * Calculate Total Cost of Ownership (TCO)
     */
    public static class TCOResult {
        public double capexInvestment_USD;
        public double totalOPEX_USD;
        public double totalTCO_USD;
        public double npvTCO_USD;
        public double annualizedCost_USD;
        public double costPerServer_USD;
        public double costPerKWh_USD;
    }
    
    public static TCOResult calculateTCO(double capexInvestment_USD,
                                        OPEXProjection opexProjection,
                                        int numberOfServers,
                                        double totalElectricityKWh) {
        TCOResult tco = new TCOResult();
        
        tco.capexInvestment_USD = capexInvestment_USD;
        tco.totalOPEX_USD = opexProjection.totalNominalOPEX_USD;
        tco.totalTCO_USD = capexInvestment_USD + opexProjection.totalNominalOPEX_USD;
        tco.npvTCO_USD = capexInvestment_USD + opexProjection.totalDiscountedOPEX_USD;
        
        // Annualized cost (using capital recovery factor)
        double discountRate = 0.08;
        int years = opexProjection.annualResults.length;
        double crf = (discountRate * Math.pow(1 + discountRate, years)) / 
                    (Math.pow(1 + discountRate, years) - 1);
        tco.annualizedCost_USD = tco.npvTCO_USD * crf;
        
        // Per-unit costs
        tco.costPerServer_USD = tco.totalTCO_USD / numberOfServers;
        tco.costPerKWh_USD = tco.totalTCO_USD / totalElectricityKWh;
        
        return tco;
    }
    
    /**
     * Compare OPEX scenarios
     */
    public static class OPEXComparison {
        public String scenarioName;
        public double totalOPEX_USD;
        public double npvOPEX_USD;
        public double savingsVsBaseline_USD;
        public double savingsPercent;
        public double paybackYears;
        public boolean isEconomicallyViable;
    }
    
    public static OPEXComparison[] compareScenarios(OPEXProjection baseline,
                                                   OPEXProjection[] alternatives,
                                                   String[] scenarioNames,
                                                   double[] additionalCapex) {
        OPEXComparison[] comparisons = new OPEXComparison[alternatives.length];
        
        for (int i = 0; i < alternatives.length; i++) {
            OPEXComparison comp = new OPEXComparison();
            comp.scenarioName = scenarioNames[i];
            comp.totalOPEX_USD = alternatives[i].totalNominalOPEX_USD;
            comp.npvOPEX_USD = alternatives[i].totalDiscountedOPEX_USD;
            
            // Calculate savings
            comp.savingsVsBaseline_USD = baseline.totalNominalOPEX_USD - alternatives[i].totalNominalOPEX_USD;
            comp.savingsPercent = (comp.savingsVsBaseline_USD / baseline.totalNominalOPEX_USD) * 100.0;
            
            // Calculate payback period
            if (comp.savingsVsBaseline_USD > 0 && additionalCapex[i] > 0) {
                double annualSavings = comp.savingsVsBaseline_USD / alternatives[i].annualResults.length;
                comp.paybackYears = additionalCapex[i] / annualSavings;
                comp.isEconomicallyViable = comp.paybackYears <= 5.0; // 5-year threshold
            } else {
                comp.paybackYears = Double.POSITIVE_INFINITY;
                comp.isEconomicallyViable = comp.savingsVsBaseline_USD > 0;
            }
            
            comparisons[i] = comp;
        }
        
        return comparisons;
    }
    
    /**
     * Calculate levelized cost of cooling (LCOC)
     */
    public static double calculateLCOC(double totalCapex_USD,
                                      double totalOPEX_USD,
                                      double totalCoolingCapacityKWh,
                                      double discountRate,
                                      int years) {
        // Present value of total costs
        double pvCosts = totalCapex_USD + totalOPEX_USD;
        
        // Levelized cost per kWh of cooling
        double lcoc = pvCosts / totalCoolingCapacityKWh;
        
        return lcoc;
    }
    
    /**
     * Generate financial recommendations
     */
    public static String[] generateFinancialRecommendations(OPEXProjection projection,
                                                           double pue,
                                                           double wue) {
        java.util.List<String> recommendations = new java.util.ArrayList<>();
        
        // Electricity cost dominance
        double electricityFraction = projection.totalElectricityCost_USD / projection.totalNominalOPEX_USD;
        if (electricityFraction > 0.7) {
            recommendations.add("Electricity represents " + String.format("%.0f%%", electricityFraction * 100) + 
                              " of OPEX - prioritize energy efficiency");
            recommendations.add("Consider renewable energy procurement to hedge against rate escalation");
        }
        
        // High PUE
        if (pue > 1.4) {
            double potentialSavings = projection.totalElectricityCost_USD * ((pue - 1.3) / pue);
            recommendations.add(String.format("Improving PUE to 1.3 could save $%.0f over %d years", 
                                            potentialSavings, projection.annualResults.length));
        }
        
        // Water costs
        double waterFraction = projection.totalWaterCost_USD / projection.totalNominalOPEX_USD;
        if (waterFraction > 0.1) {
            recommendations.add("Water costs are significant - optimize cycles of concentration");
            recommendations.add("Consider water recycling or alternative cooling methods");
        }
        
        // Carbon costs
        if (projection.totalCarbonCost_USD > 0) {
            double carbonFraction = projection.totalCarbonCost_USD / projection.totalNominalOPEX_USD;
            if (carbonFraction > 0.15) {
                recommendations.add("Carbon costs represent " + String.format("%.0f%%", carbonFraction * 100) + 
                                  " of OPEX - decarbonization is financially critical");
            }
        }
        
        // Escalation exposure
        AnnualOPEX firstYear = projection.annualResults[0];
        AnnualOPEX lastYear = projection.annualResults[projection.annualResults.length - 1];
        double opexGrowth = ((lastYear.totalOPEX_USD - firstYear.totalOPEX_USD) / firstYear.totalOPEX_USD) * 100;
        
        if (opexGrowth > 30) {
            recommendations.add(String.format("OPEX projected to grow %.0f%% - implement cost control measures", opexGrowth));
            recommendations.add("Lock in long-term energy contracts to mitigate escalation risk");
        }
        
        return recommendations.toArray(new String[0]);
    }
    
    /**
     * Calculate break-even analysis for efficiency upgrade
     */
    public static class BreakEvenAnalysis {
        public double breakEvenYear;
        public double cumulativeSavings_USD;
        public double roi_percent;
        public boolean isViable;
    }
    
    public static BreakEvenAnalysis calculateBreakEven(double upgradeCost_USD,
                                                      double annualSavings_USD,
                                                      int analysisYears,
                                                      double discountRate) {
        BreakEvenAnalysis analysis = new BreakEvenAnalysis();
        
        double cumulativePVSavings = 0.0;
        analysis.breakEvenYear = -1;
        
        for (int year = 1; year <= analysisYears; year++) {
            double pvSavings = annualSavings_USD / Math.pow(1.0 + discountRate, year);
            cumulativePVSavings += pvSavings;
            
            if (cumulativePVSavings >= upgradeCost_USD && analysis.breakEvenYear < 0) {
                analysis.breakEvenYear = year;
            }
        }
        
        analysis.cumulativeSavings_USD = cumulativePVSavings;
        analysis.roi_percent = ((cumulativePVSavings - upgradeCost_USD) / upgradeCost_USD) * 100.0;
        analysis.isViable = analysis.breakEvenYear > 0 && analysis.breakEvenYear <= analysisYears;
        
        return analysis;
    }
}
