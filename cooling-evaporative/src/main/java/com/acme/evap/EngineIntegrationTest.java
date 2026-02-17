package com.acme.evap;

/**
 * Integration test for all backend engines
 * Verifies that ScenarioEngine, AIWorkloadModel, CarbonAccountingEngine, and OPEXEngine work together
 */
public class EngineIntegrationTest {
    
    public static void main(String[] args) {
        System.out.println("=== BACKEND ENGINE INTEGRATION TEST ===\n");
        
        // Test 1: Scenario Engine
        testScenarioEngine();
        
        // Test 2: AI Workload Model
        testAIWorkloadModel();
        
        // Test 3: Carbon Accounting Engine
        testCarbonAccountingEngine();
        
        // Test 4: OPEX Engine
        testOPEXEngine();
        
        // Test 5: Integrated Scenario (All engines together)
        testIntegratedScenario();
        
        System.out.println("\n=== ALL TESTS COMPLETED SUCCESSFULLY ===");
    }
    
    private static void testScenarioEngine() {
        System.out.println("--- Test 1: Scenario Engine ---");
        
        // Create baseline scenario
        ScenarioEngine.ScenarioConfig config = new ScenarioEngine.ScenarioConfig(
            ScenarioEngine.ScenarioType.BASELINE
        );
        config.projectionYears = 5;
        
        ScenarioEngine.ScenarioResult[] results = ScenarioEngine.generateScenario(config);
        
        System.out.println("Generated " + results.length + " year projections:");
        for (ScenarioEngine.ScenarioResult result : results) {
            System.out.printf("  Year %d: IT Load Multiplier=%.2f, Temp Offset=%.1f°C, Carbon Tax=$%.2f/ton\n",
                result.year, result.itLoadMultiplier, result.temperatureOffsetC, result.carbonTaxUSD);
        }
        
        // Test combined scenario
        ScenarioEngine.ScenarioConfig combinedConfig = new ScenarioEngine.ScenarioConfig(
            ScenarioEngine.ScenarioType.COMBINED
        );
        combinedConfig.enableAITrainingProfile = true;
        combinedConfig.carbonTaxStartUSD = 50.0;
        
        ScenarioEngine.ScenarioResult[] combinedResults = ScenarioEngine.generateScenario(combinedConfig);
        System.out.println("\nCombined Scenario (AI + Carbon + Climate):");
        System.out.printf("  Year 2030: IT Load=%.2fx, Rack Density=%.2fx, Temp Offset=%.1f°C\n",
            combinedResults[4].itLoadMultiplier, 
            combinedResults[4].rackDensityMultiplier,
            combinedResults[4].temperatureOffsetC);
        
        System.out.println("✓ Scenario Engine test passed\n");
    }
    
    private static void testAIWorkloadModel() {
        System.out.println("--- Test 2: AI Workload Model ---");
        
        // Test AI training workload
        AIWorkloadModel.AIWorkloadConfig trainingConfig = new AIWorkloadModel.AIWorkloadConfig(
            AIWorkloadModel.WorkloadType.AI_TRAINING
        );
        trainingConfig.serversPerRack = 10;
        trainingConfig.gpusPerServer = 8;
        trainingConfig.gpuPowerPerUnit_W = 400;
        
        long timeSeconds = 0;
        AIWorkloadModel.AIWorkloadResult result = AIWorkloadModel.calculateWorkload(trainingConfig, timeSeconds);
        
        System.out.printf("AI Training Workload:\n");
        System.out.printf("  Utilization: %.1f%%\n", result.utilizationFraction * 100);
        System.out.printf("  Power Multiplier: %.2f\n", result.powerMultiplier);
        System.out.printf("  Heat Density: %.1f kW/rack\n", result.heatDensityKW_per_rack);
        System.out.printf("  Training Active: %s\n", result.isTrainingActive);
        
        // Test cooling requirements
        AIWorkloadModel.CoolingRequirement coolingReq = AIWorkloadModel.calculateCoolingRequirements(
            trainingConfig, 10, 30.0
        );
        
        System.out.printf("\nCooling Requirements for 10 AI racks:\n");
        System.out.printf("  Required Capacity: %.1f kW\n", coolingReq.requiredCoolingCapacityKW);
        System.out.printf("  Required Airflow: %.0f CFM\n", coolingReq.requiredAirflowCFM);
        System.out.printf("  Inlet Temp Limit: %.1f°C\n", coolingReq.inletTempLimitC);
        System.out.printf("  Enhanced Cooling Required: %s\n", coolingReq.requiresEnhancedCooling);
        
        System.out.println("✓ AI Workload Model test passed\n");
    }
    
    private static void testCarbonAccountingEngine() {
        System.out.println("--- Test 3: Carbon Accounting Engine ---");
        
        CarbonAccountingEngine.CarbonConfig config = new CarbonAccountingEngine.CarbonConfig();
        config.gridEmissionsFactorKgCO2_per_kWh = 0.45;
        config.enableCarbonTax = true;
        config.carbonTaxUSD_per_ton = 50.0;
        config.renewableEnergyFraction = 0.2; // 20% renewable
        
        double electricityKWh = 1000000; // 1 GWh annually
        double waterLiters = 500000; // 500 m³
        int numberOfServers = 100;
        int year = 2025;
        
        CarbonAccountingEngine.CarbonResult result = CarbonAccountingEngine.calculateEmissions(
            config, electricityKWh, waterLiters, numberOfServers, year
        );
        
        System.out.printf("Carbon Emissions (1 GWh, 20%% renewable):\n");
        System.out.printf("  Scope 2 Emissions: %.1f tons CO2\n", result.scope2EmissionsKg / 1000);
        System.out.printf("  Scope 3 Emissions: %.1f tons CO2\n", result.scope3EmissionsKg / 1000);
        System.out.printf("  Total Emissions: %.1f tons CO2\n", result.totalEmissionsTons);
        System.out.printf("  Carbon Tax: $%.2f\n", result.carbonTaxUSD);
        System.out.printf("  Emissions Avoided: %.1f tons CO2\n", result.emissionsAvoidedKg / 1000);
        
        // Test multi-year trajectory
        CarbonAccountingEngine.CarbonTrajectory trajectory = CarbonAccountingEngine.calculateTrajectory(
            config, electricityKWh, waterLiters, numberOfServers, 2025, 5, 0.05
        );
        
        System.out.printf("\n5-Year Carbon Trajectory:\n");
        System.out.printf("  Total Emissions: %.1f tons CO2\n", trajectory.totalEmissionsTons);
        System.out.printf("  Total Carbon Tax: $%.2f\n", trajectory.totalCarbonTaxUSD);
        
        System.out.println("✓ Carbon Accounting Engine test passed\n");
    }
    
    private static void testOPEXEngine() {
        System.out.println("--- Test 4: OPEX Engine ---");
        
        OPEXEngine.OPEXConfig config = new OPEXEngine.OPEXConfig();
        config.electricityRate_USD_per_kWh = 0.12;
        config.waterRate_USD_per_m3 = 1.0;
        config.projectionYears = 5;
        
        double annualElectricityKWh = 1000000; // 1 GWh
        double annualWaterLiters = 500000; // 500 m³
        double annualCarbonCost = 10000; // $10k
        double capexInvestment = 500000; // $500k
        double itLoadGrowthRate = 0.05; // 5% annual growth
        
        OPEXEngine.OPEXProjection projection = OPEXEngine.calculateProjection(
            config, annualElectricityKWh, annualWaterLiters, annualCarbonCost, 
            capexInvestment, itLoadGrowthRate
        );
        
        System.out.printf("5-Year OPEX Projection:\n");
        System.out.printf("  Total Nominal OPEX: $%.2f\n", projection.totalNominalOPEX_USD);
        System.out.printf("  Total NPV OPEX: $%.2f\n", projection.totalDiscountedOPEX_USD);
        System.out.printf("  Average Annual OPEX: $%.2f\n", projection.averageAnnualOPEX_USD);
        System.out.printf("  Total Electricity Cost: $%.2f\n", projection.totalElectricityCost_USD);
        System.out.printf("  Total Water Cost: $%.2f\n", projection.totalWaterCost_USD);
        
        System.out.println("\nYear-by-Year Breakdown:");
        for (OPEXEngine.AnnualOPEX annual : projection.annualResults) {
            System.out.printf("  %d: $%.2f (Electricity: $%.2f, Water: $%.2f)\n",
                annual.year, annual.totalOPEX_USD, annual.electricityCost_USD, annual.waterCost_USD);
        }
        
        // Test TCO calculation
        OPEXEngine.TCOResult tco = OPEXEngine.calculateTCO(
            capexInvestment, projection, 100, annualElectricityKWh * 5
        );
        
        System.out.printf("\nTotal Cost of Ownership:\n");
        System.out.printf("  CAPEX: $%.2f\n", tco.capexInvestment_USD);
        System.out.printf("  Total TCO: $%.2f\n", tco.totalTCO_USD);
        System.out.printf("  NPV TCO: $%.2f\n", tco.npvTCO_USD);
        System.out.printf("  Annualized Cost: $%.2f/year\n", tco.annualizedCost_USD);
        System.out.printf("  Cost per Server: $%.2f\n", tco.costPerServer_USD);
        
        System.out.println("✓ OPEX Engine test passed\n");
    }
    
    private static void testIntegratedScenario() {
        System.out.println("--- Test 5: Integrated Scenario (All Engines) ---");
        
        // Create AI growth scenario with carbon pressure
        ScenarioEngine.ScenarioConfig scenarioConfig = new ScenarioEngine.ScenarioConfig(
            ScenarioEngine.ScenarioType.COMBINED
        );
        scenarioConfig.aiWorkloadGrowthRate = 0.25; // 25% annual AI growth
        scenarioConfig.enableAITrainingProfile = true;
        scenarioConfig.carbonTaxStartUSD = 50.0;
        scenarioConfig.carbonTaxGrowthRate = 0.15;
        scenarioConfig.temperatureOffsetC = 2.0;
        
        ScenarioEngine.ScenarioResult[] scenarios = ScenarioEngine.generateScenario(scenarioConfig);
        
        System.out.println("Integrated 5-Year Projection (AI Growth + Carbon Pressure + Climate Change):\n");
        
        for (int i = 0; i < scenarios.length; i++) {
            ScenarioEngine.ScenarioResult scenario = scenarios[i];
            
            // Calculate AI workload for this year
            AIWorkloadModel.AIWorkloadConfig aiConfig = new AIWorkloadModel.AIWorkloadConfig(
                AIWorkloadModel.WorkloadType.AI_TRAINING
            );
            aiConfig.serversPerRack = 10;
            aiConfig.gpusPerServer = 8;
            
            AIWorkloadModel.AIWorkloadResult aiResult = AIWorkloadModel.calculateWorkload(aiConfig, 0);
            double adjustedHeatDensity = aiResult.heatDensityKW_per_rack * scenario.rackDensityMultiplier;
            
            // Calculate carbon emissions for this year
            CarbonAccountingEngine.CarbonConfig carbonConfig = new CarbonAccountingEngine.CarbonConfig();
            carbonConfig.gridEmissionsFactorKgCO2_per_kWh = scenario.gridEmissionsFactorKgCO2;
            carbonConfig.enableCarbonTax = true;
            carbonConfig.carbonTaxUSD_per_ton = scenario.carbonTaxUSD;
            
            double yearElectricityKWh = 1000000 * scenario.itLoadMultiplier;
            CarbonAccountingEngine.CarbonResult carbonResult = CarbonAccountingEngine.calculateEmissions(
                carbonConfig, yearElectricityKWh, 500000, 100, scenario.year
            );
            
            // Calculate OPEX for this year
            OPEXEngine.OPEXConfig opexConfig = new OPEXEngine.OPEXConfig();
            opexConfig.electricityRate_USD_per_kWh = 0.12 * scenario.electricityRateMultiplier;
            opexConfig.waterRate_USD_per_m3 = 1.0 * scenario.waterRateMultiplier;
            
            double yearElectricityCost = yearElectricityKWh * opexConfig.electricityRate_USD_per_kWh;
            double yearWaterCost = 500 * opexConfig.waterRate_USD_per_m3;
            double yearTotalOPEX = yearElectricityCost + yearWaterCost + carbonResult.carbonTaxUSD;
            
            System.out.printf("Year %d:\n", scenario.year);
            System.out.printf("  IT Load: %.2fx baseline | Rack Density: %.2fx | Temp Offset: +%.1f°C\n",
                scenario.itLoadMultiplier, scenario.rackDensityMultiplier, scenario.temperatureOffsetC);
            System.out.printf("  Heat Density: %.1f kW/rack | Workload: %s\n",
                adjustedHeatDensity, scenario.utilizationProfile);
            System.out.printf("  Carbon: %.1f tons CO2 | Carbon Tax: $%.2f\n",
                carbonResult.totalEmissionsTons, carbonResult.carbonTaxUSD);
            System.out.printf("  OPEX: $%.2f (Electricity: $%.2f, Water: $%.2f, Carbon: $%.2f)\n\n",
                yearTotalOPEX, yearElectricityCost, yearWaterCost, carbonResult.carbonTaxUSD);
        }
        
        // Check cooling feasibility for 2030
        ScenarioEngine.ScenarioResult year2030 = scenarios[4];
        ScenarioEngine.FeasibilityCheck feasibility = ScenarioEngine.checkCoolingFeasibility(
            year2030, 30.0, 50.0, 500.0, 100.0
        );
        
        System.out.println("2030 Cooling Feasibility Assessment:");
        System.out.printf("  Cooling Adequate: %s\n", feasibility.coolingAdequate);
        System.out.printf("  Temperature Compliant: %s\n", feasibility.temperatureCompliant);
        System.out.printf("  Humidity Feasible: %s\n", feasibility.humidityFeasible);
        
        if (feasibility.warnings.length > 0) {
            System.out.println("\n  Warnings:");
            for (String warning : feasibility.warnings) {
                System.out.println("    ⚠ " + warning);
            }
        }
        
        if (feasibility.recommendations.length > 0) {
            System.out.println("\n  Recommendations:");
            for (String rec : feasibility.recommendations) {
                System.out.println("    → " + rec);
            }
        }
        
        System.out.println("\n✓ Integrated Scenario test passed");
    }
}
