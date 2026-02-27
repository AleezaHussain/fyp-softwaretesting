package com.example.coolingeconomizer;

import com.acme.aireconcalc.AirEconomizerModel;
import com.acme.aireconcalc.EconomizerInputs;
import com.acme.aireconcalc.SimUtils;
import com.acme.aireconcalc.WeatherData;
import com.acme.aireconcalc.ProjectionEngine;
import com.acme.aireconcalc.cloudsim.CloudSimWorkloadService;
import com.acme.aireconcalc.cloudsim.RackLoadAggregator;
import com.example.coolingeconomizer.model.SimulationRequest;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Allow frontend access
public class EconomizerController {

    @GetMapping("/simulate")
    public SimulationResponse runSimulation() {
        System.out.println("[EconomizerController] GET /simulate called");
        SimulationResponse resp = runSimulationPost(new com.example.coolingeconomizer.model.SimulationRequest());
        System.out.println("[EconomizerController] GET /simulate response: " + resp);
        return resp;
    }

    @PostMapping("/simulate")
    public SimulationResponse runSimulationPost(
            @RequestBody(required = false) com.example.coolingeconomizer.model.SimulationRequest req) {
        // Log received physical parameters
        if (req != null) {
            System.out.println("[EconomizerController] Received airflowCFM: " + req.airflowCFM);
            System.out.println("[EconomizerController] Received supplyAirTemp: " + req.supplyAirTemp);
            System.out.println("[EconomizerController] Received returnAirTemp: " + req.returnAirTemp);
            System.out.println("[EconomizerController] Received deltaT: " + req.deltaT);
            System.out.println("[EconomizerController] CloudSim enabled: " + req.enableCloudSim);
            System.out.println("[EconomizerController] AI Workload Mode: " + req.aiWorkloadMode);
        }
        System.out.println("[EconomizerController] POST /simulate called");
        if (req == null) {
            System.out.println("[EconomizerController] No request body provided, using defaults");
            req = new com.example.coolingeconomizer.model.SimulationRequest(); // Safety fallback
        } else {
            System.out.println("[EconomizerController] Request body: " + req);
        }

        // 1. Map DTO to Inputs
        EconomizerInputs in = new EconomizerInputs();
        int racks = req.numberOfRacks > 0 ? req.numberOfRacks : 1;
        int servers = req.serversPerRack > 0 ? req.serversPerRack : 50;
        in.numServers = racks * servers;
        System.out.println("[EconomizerController] numServers: " + in.numServers);

        in.serverMaxPowerW = req.serverMaxPowerW > 0 ? req.serverMaxPowerW : 93.6;
        in.serverIdlePowerW = req.serverIdlePowerW > 0 ? req.serverIdlePowerW : 19.7;
        System.out.println("[EconomizerController] serverMaxPowerW: " + in.serverMaxPowerW + ", serverIdlePowerW: "
                + in.serverIdlePowerW);

        in.carbonIntensity_kg_per_kWh = req.carbonIntensity > 0 ? req.carbonIntensity : 0.055;
        in.elecTariff_per_kWh = req.electricityTariff > 0 ? req.electricityTariff : 0.15;
        System.out.println("[EconomizerController] carbonIntensity: " + in.carbonIntensity_kg_per_kWh + ", elecTariff: "
                + in.elecTariff_per_kWh);

        // Future projections & escalation parameters
        in.forecastYears = req.forecastYears != null ? req.forecastYears : 5;
        in.energyEscalationRate = req.energyEscalationRate != null ? req.energyEscalationRate : 0.035;
        in.carbonTaxProjected = req.carbonTaxProjected != null ? req.carbonTaxProjected : 126.0;
        in.climateChangeOffsetC = req.climateChangeOffsetC != null ? req.climateChangeOffsetC : 0.0;
        System.out.println("[EconomizerController] Projection params - forecastYears: " + in.forecastYears + 
                ", energyEscalation: " + in.energyEscalationRate + ", carbonTax: " + in.carbonTaxProjected + 
                ", climateOffset: " + in.climateChangeOffsetC);

        double peakUtil = req.peakUtilization > 0 ? req.peakUtilization / 100.0 : 0.7;
        double avgUtil = req.averageUtilization > 0 ? req.averageUtilization / 100.0 : 0.4;
        double minUtil = Math.max(0.1, 2 * avgUtil - peakUtil);
        System.out.println(
                "[EconomizerController] peakUtil: " + peakUtil + ", avgUtil: " + avgUtil + ", minUtil: " + minUtil);

        // Calculate weighted fan efficiency dynamically from request
        int totalFans = req.bestQuantity + req.averageQuantity + req.legacyQuantity;
        double weightedSum = (req.bestQuantity * req.bestEfficiency)
                + (req.averageQuantity * req.averageEfficiency)
                + (req.legacyQuantity * req.legacyEfficiency);
        in.fanWeightedEfficiency = (totalFans > 0) ? (weightedSum / totalFans) : 0.60; // Default to 0.60 if no fans
        // Use airflowCFM from frontend if provided, else default
        in.maxAirflowCFM = (req.airflowCFM != null && req.airflowCFM > 0) ? req.airflowCFM : 2000.0;
        System.out.println("[EconomizerController] Used in.maxAirflowCFM in model: " + in.maxAirflowCFM);

        // Log usage of supplyAirTemp, returnAirTemp, deltaT in model formulas (example
        // usage)
        double supplyAirTemp = (req.supplyAirTemp != null && req.supplyAirTemp > 0) ? req.supplyAirTemp : 18.0;
        double returnAirTemp = (req.returnAirTemp != null && req.returnAirTemp > 0) ? req.returnAirTemp : 30.0;
        double deltaT = (req.deltaT != null && req.deltaT > 0) ? req.deltaT : (returnAirTemp - supplyAirTemp);
        System.out.println("[EconomizerController] Used supplyAirTemp in model: " + supplyAirTemp);
        System.out.println("[EconomizerController] Used returnAirTemp in model: " + returnAirTemp);
        System.out.println("[EconomizerController] Used deltaT in model: " + deltaT);

        // Example: log a formula using these values
        double airflowKW = in.maxAirflowCFM * deltaT * 1.2 / 3600.0; // Example formula
        System.out.println("[EconomizerController] Example formula: airflowKW = maxAirflowCFM * deltaT * 1.2 / 3600 = "
                + airflowKW);
        in.mechCOP = 3.0;

        // Advanced Economizer Controls
        in.economizerMaxOutdoorTemp = req.economizerMaxOutdoorTemp != null ? req.economizerMaxOutdoorTemp : 24.0;
        in.economizerMaxHumidity = req.economizerMaxHumidity != null ? req.economizerMaxHumidity : 60.0;
        in.minOutdoorAirFraction = req.minOutdoorAirFraction != null ? req.minOutdoorAirFraction : 0.2;

        // ========================================================================
        // CLOUDSIM INTEGRATION: Generate IT load profile if enabled
        // ========================================================================
        double[] itLoadProfile = null;
        CloudSimWorkloadService.WorkloadResult cloudSimResult = null;
        RackLoadAggregator.FacilityRackAnalysis rackAnalysis = null;
        
        if (req.enableCloudSim != null && req.enableCloudSim) {
            System.out.println("[EconomizerController] CloudSim ENABLED - Generating workload profile");
            
            // Configure CloudSim workload generator
            CloudSimWorkloadService.WorkloadConfig cloudSimConfig = new CloudSimWorkloadService.WorkloadConfig();
            cloudSimConfig.numberOfServers = in.numServers;
            cloudSimConfig.serversPerRack = servers;
            cloudSimConfig.serverMaxPowerW = in.serverMaxPowerW;
            cloudSimConfig.serverIdlePowerW = in.serverIdlePowerW;
            cloudSimConfig.coresPerServer = 4; // Default
            cloudSimConfig.mipsPerCore = 1000; // Default
            cloudSimConfig.computeIntensityFactor = req.computeIntensityFactor != null ? req.computeIntensityFactor : 1.0;
            
            // Set AI workload mode
            if (req.aiWorkloadMode != null) {
                try {
                    cloudSimConfig.workloadMode = CloudSimWorkloadService.AIWorkloadMode.valueOf(req.aiWorkloadMode);
                } catch (IllegalArgumentException e) {
                    System.out.println("[EconomizerController] Invalid AI workload mode, using ENTERPRISE");
                    cloudSimConfig.workloadMode = CloudSimWorkloadService.AIWorkloadMode.ENTERPRISE;
                }
            }
            
            // Determine simulation hours
            boolean useProvidedWeather = req.weatherData != null && !req.weatherData.isEmpty();
            cloudSimConfig.simulationHours = useProvidedWeather ? req.weatherData.size() : 24;
            
            // Generate workload profile using CloudSim
            CloudSimWorkloadService workloadService = new CloudSimWorkloadService();
            cloudSimResult = workloadService.generateWorkloadProfile(cloudSimConfig);
            
            itLoadProfile = cloudSimResult.hourlyITLoadKW;
            
            System.out.println("[EconomizerController] CloudSim generated " + itLoadProfile.length + " hours of IT load");
            System.out.println("[EconomizerController] Workload mode: " + cloudSimResult.workloadMode);
            
            // Perform rack-level analysis
            double rackPowerThreshold = (in.serverMaxPowerW * servers) / 1000.0; // kW per rack
            rackAnalysis = RackLoadAggregator.aggregateToRacks(cloudSimResult, rackPowerThreshold);
            
            System.out.println("[EconomizerController] Rack analysis: " + rackAnalysis.totalRacks + " racks, " + 
                             rackAnalysis.hotspotRacks + " hotspots detected");
        }

        AirEconomizerModel model = new AirEconomizerModel();
        List<AirEconomizerModel.StepResult> hourlyResults = new ArrayList<>();

        double totalItEnergy = 0;
        double totalCoolingEnergy = 0;
        double totalCarbon = 0;

        boolean useProvidedWeather = req.weatherData != null && !req.weatherData.isEmpty();
        int steps = useProvidedWeather ? req.weatherData.size() : 24;
        
        // If CloudSim is enabled, use its hour count
        if (itLoadProfile != null) {
            steps = itLoadProfile.length;
        }
        
        System.out.println("[EconomizerController] useProvidedWeather: " + useProvidedWeather + ", steps: " + steps);

        for (int h = 0; h < steps; h++) {
            WeatherData w = new WeatherData();
            if (useProvidedWeather) {
                com.example.coolingeconomizer.model.SimulationRequest.WeatherData entry = req.weatherData.get(h);
                
                // Support both naming conventions: temperature/humidity OR dryBulb/relativeHumidity
                double dryBulb = entry.temperature != 0.0 ? entry.temperature : entry.dryBulb;
                double rh = entry.humidity != 0.0 ? entry.humidity : entry.relativeHumidity;
                
                w.dryBulbC = dryBulb;
                w.relativeHumidity = rh;
                
                System.out.println("[EconomizerController] WeatherData (provided) h=" + h + ": dryBulbC=" + w.dryBulbC
                        + ", rh=" + w.relativeHumidity);
            } else {
                w.dryBulbC = SimUtils.getHourlyTempC(h % 24, 18.0, 30.0);
                w.relativeHumidity = 50.0;
                System.out.println("[EconomizerController] WeatherData (mock) h=" + h + ": dryBulbC=" + w.dryBulbC
                        + ", rh=" + w.relativeHumidity);
            }
            
            // ========================================================================
            // CLOUDSIM vs SYNTHETIC UTILIZATION
            // ========================================================================
            AirEconomizerModel.StepResult res;
            
            if (itLoadProfile != null) {
                // Use CloudSim-generated IT load
                double itLoadKW = itLoadProfile[h];
                res = model.computeTimeStepWithCloudSimLoad(in, w, h, itLoadKW);
                System.out.println("[EconomizerController] Hour " + h + ": CloudSim IT load = " + itLoadKW + " kW");
            } else {
                // Use synthetic utilization
                double util = SimUtils.getHourlyUtilization(h % 24, minUtil, peakUtil);
                res = model.computeTimeStep(in, w, h, util);
                System.out.println("[EconomizerController] Hour " + h + ": Synthetic utilization = " + util);
            }
            
            hourlyResults.add(res);
            totalItEnergy += res.itLoad_kW;
            totalCoolingEnergy += (res.fanPower_kW + res.mechPower_kW);
            totalCarbon += (res.totalPower_kW * in.carbonIntensity_kg_per_kWh);
        }

        SimulationResponse resp = new SimulationResponse();
        resp.hourlyResults = hourlyResults;
        resp.summary = new SimulationSummary();
        resp.summary.totalItEnergy_kWh = totalItEnergy;
        resp.summary.totalCoolingEnergy_kWh = totalCoolingEnergy;
        resp.summary.totalEnergy_kWh = totalItEnergy + totalCoolingEnergy;
        resp.summary.averagePUE = totalItEnergy > 0 ? (resp.summary.totalEnergy_kWh / totalItEnergy) : 0;
        resp.summary.averageCUE = totalItEnergy > 0 ? (totalCarbon / totalItEnergy) : 0;
        resp.summary.estimatedOpExUSD = resp.summary.totalEnergy_kWh * in.elecTariff_per_kWh;
        
        // ========================================================================
        // ENHANCED FINANCIAL & ENVIRONMENTAL CALCULATIONS
        // ========================================================================
        
        // Total CO2 emissions (kg)
        resp.summary.totalCarbonEmissions_kg = totalCarbon;
        
        // Convert emissions to tons for carbon tax calculation
        double totalCarbonEmissions_tons = totalCarbon / 1000.0;
        
        // Carbon tax cost (if carbon price is set)
        double carbonTaxCost = 0.0;
        if (in.carbonTaxProjected > 0) {
            carbonTaxCost = totalCarbonEmissions_tons * in.carbonTaxProjected;
        }
        resp.summary.carbonTaxCostUSD = carbonTaxCost;
        
        // Annual OpEx = Electricity cost + Carbon tax cost
        double electricityCost = resp.summary.totalEnergy_kWh * in.elecTariff_per_kWh;
        resp.summary.annualOpExUSD = electricityCost + carbonTaxCost;
        resp.summary.electricityCostUSD = electricityCost;
        
        // CAPEX Calculation (Air-Side Economizer)
        // CAPEX = Fixed Cost + (Airflow Capacity × Cost per CFM)
        double fixedEconomizerCapex = 20000.0; // $20k base cost
        double capexPerCFM = 2.5; // $2.5 per CFM
        resp.summary.totalCapexUSD = fixedEconomizerCapex + (in.maxAirflowCFM * capexPerCFM);
        
        // Simple Payback Period (years)
        // Baseline: Assume mechanical-only cooling with PUE = 1.8
        double baselinePUE = 1.8;
        double baselineAnnualEnergy_kWh = totalItEnergy * baselinePUE;
        double baselineAnnualCost = baselineAnnualEnergy_kWh * in.elecTariff_per_kWh;
        double annualSavings = baselineAnnualCost - resp.summary.annualOpExUSD;
        resp.summary.annualSavingsUSD = annualSavings;
        resp.summary.paybackPeriodYears = annualSavings > 0 ? (resp.summary.totalCapexUSD / annualSavings) : 999.0;
        
        // Energy savings percentage
        resp.summary.energySavingsPercent = baselineAnnualEnergy_kWh > 0 
            ? ((baselineAnnualEnergy_kWh - resp.summary.totalEnergy_kWh) / baselineAnnualEnergy_kWh * 100.0) 
            : 0.0;
        
        // Carbon savings (kg CO2)
        double baselineCarbonEmissions_kg = baselineAnnualEnergy_kWh * in.carbonIntensity_kg_per_kWh;
        resp.summary.carbonSavings_kg = baselineCarbonEmissions_kg - resp.summary.totalCarbonEmissions_kg;
        
        // Water usage (for consistency with other cooling methods, air-side uses minimal water)
        resp.summary.waterUsage_liters = 0.0; // Air-side economizer doesn't use water
        
        System.out.println("[FINANCIAL SUMMARY]");
        System.out.println("  CAPEX: $" + String.format("%.2f", resp.summary.totalCapexUSD));
        System.out.println("  Annual OpEx: $" + String.format("%.2f", resp.summary.annualOpExUSD));
        System.out.println("  Annual Savings: $" + String.format("%.2f", resp.summary.annualSavingsUSD));
        System.out.println("  Payback Period: " + String.format("%.2f", resp.summary.paybackPeriodYears) + " years");
        System.out.println("  Energy Savings: " + String.format("%.1f", resp.summary.energySavingsPercent) + "%");
        System.out.println("  Carbon Emissions: " + String.format("%.0f", resp.summary.totalCarbonEmissions_kg) + " kg CO2");
        System.out.println("  Carbon Savings: " + String.format("%.0f", resp.summary.carbonSavings_kg) + " kg CO2");
        
        // ========================================================================
        
        // Add CloudSim-specific data if available
        if (cloudSimResult != null) {
            resp.cloudSimEnabled = true;
            resp.workloadMode = cloudSimResult.workloadMode;
            resp.averageUtilization = 0.0;
            for (double util : cloudSimResult.hourlyUtilization) {
                resp.averageUtilization += util;
            }
            resp.averageUtilization /= cloudSimResult.hourlyUtilization.length;
        }
        
        // Add rack analysis if available
        if (rackAnalysis != null) {
            resp.rackAnalysis = new RackAnalysisSummary();
            resp.rackAnalysis.totalRacks = rackAnalysis.totalRacks;
            resp.rackAnalysis.hotspotRacks = rackAnalysis.hotspotRacks;
            resp.rackAnalysis.maxRackLoadKW = rackAnalysis.maxRackLoadKW;
            resp.rackAnalysis.averageRackLoadKW = rackAnalysis.averageRackLoadKW;
            resp.rackAnalysis.loadImbalanceFactor = rackAnalysis.loadImbalanceFactor;
            resp.rackAnalysis.warnings = rackAnalysis.warnings;
            
            // Check for airflow violations at rack level
            String[] rackViolations = RackLoadAggregator.detectAIHotspotViolations(
                rackAnalysis, in.maxAirflowCFM / racks, deltaT
            );
            resp.rackAnalysis.airflowViolations = rackViolations;
        }
        
        // ========================================================================
        // MULTI-YEAR PROJECTIONS (Energy Escalation, Carbon Tax, Climate Change)
        // ========================================================================
        if (in.forecastYears > 0) {
            System.out.println("[PROJECTION ENGINE] Calculating " + in.forecastYears + "-year projections");
            
            // Set CAPEX for projection calculations
            in.capexEconomizerUSD = resp.summary.totalCapexUSD;
            
            // Calculate projections
            ProjectionEngine.ProjectionResult projection = ProjectionEngine.calculateProjections(
                in,
                resp.summary.totalEnergy_kWh,
                resp.summary.totalCarbonEmissions_kg,
                baselineAnnualEnergy_kWh
            );
            
            // Add projection data to response
            resp.projection = new ProjectionSummary();
            resp.projection.forecastYears = projection.forecastYears;
            resp.projection.totalEnergy = projection.totalEnergy;
            resp.projection.totalEmissions = projection.totalEmissions;
            resp.projection.totalCost = projection.totalCost;
            resp.projection.totalCarbonTax = projection.totalCarbonTax;
            resp.projection.totalSavings = projection.totalSavings;
            resp.projection.npvSavings = projection.npvSavings;
            resp.projection.adjustedPaybackYears = projection.adjustedPaybackYears;
            
            // Convert yearly data
            resp.projection.yearlyData = new YearlyProjection[projection.yearlyData.length];
            for (int i = 0; i < projection.yearlyData.length; i++) {
                ProjectionEngine.YearlyData yd = projection.yearlyData[i];
                YearlyProjection yp = new YearlyProjection();
                yp.year = yd.year;
                yp.energyKWh = yd.energyKWh;
                yp.energyCostUSD = yd.energyCostUSD;
                yp.energySavingsKWh = yd.energySavingsKWh;
                yp.emissionsTonsCO2 = yd.emissionsTonsCO2;
                yp.emissionsSavingsTonsCO2 = yd.emissionsSavingsTonsCO2;
                yp.carbonTaxUSD = yd.carbonTaxUSD;
                yp.totalCostUSD = yd.totalCostUSD;
                yp.costSavingsUSD = yd.costSavingsUSD;
                yp.cumulativeEnergy = yd.cumulativeEnergy;
                yp.cumulativeEmissions = yd.cumulativeEmissions;
                yp.cumulativeCost = yd.cumulativeCost;
                yp.cumulativeSavings = yd.cumulativeSavings;
                yp.temperatureOffsetC = yd.temperatureOffsetC;
                yp.coolingLoadIncrease = yd.coolingLoadIncrease;
                resp.projection.yearlyData[i] = yp;
            }
            
            System.out.println("[PROJECTION SUMMARY]");
            System.out.println("  Forecast Period: " + projection.forecastYears + " years");
            System.out.println("  Total Energy: " + String.format("%.0f", projection.totalEnergy) + " kWh");
            System.out.println("  Total Emissions: " + String.format("%.1f", projection.totalEmissions) + " tons CO2");
            System.out.println("  Total Cost: $" + String.format("%.2f", projection.totalCost));
            System.out.println("  Total Carbon Tax: $" + String.format("%.2f", projection.totalCarbonTax));
            System.out.println("  Total Savings: $" + String.format("%.2f", projection.totalSavings));
            System.out.println("  NPV Savings: $" + String.format("%.2f", projection.npvSavings));
            System.out.println("  Adjusted Payback: " + String.format("%.2f", projection.adjustedPaybackYears) + " years");
            
            // Generate climate scenarios if climate change offset is enabled
            if (in.climateChangeOffsetC > 0) {
                System.out.println("[CLIMATE SCENARIOS] Generating climate impact scenarios");
                ProjectionEngine.ClimateScenario[] scenarios = ProjectionEngine.generateClimateScenarios(
                    in,
                    resp.summary.totalEnergy_kWh,
                    resp.summary.totalCarbonEmissions_kg,
                    baselineAnnualEnergy_kWh
                );
                
                resp.climateScenarios = new ClimateScenarioSummary[scenarios.length];
                for (int i = 0; i < scenarios.length; i++) {
                    ClimateScenarioSummary css = new ClimateScenarioSummary();
                    css.name = scenarios[i].name;
                    css.temperatureIncrease = scenarios[i].temperatureIncrease;
                    css.totalEnergy = scenarios[i].projection.totalEnergy;
                    css.totalEmissions = scenarios[i].projection.totalEmissions;
                    css.totalCost = scenarios[i].projection.totalCost;
                    css.adjustedPaybackYears = scenarios[i].projection.adjustedPaybackYears;
                    resp.climateScenarios[i] = css;
                    
                    System.out.println("  " + css.name + ": +" + css.temperatureIncrease + "°C, " +
                                     "Energy: " + String.format("%.0f", css.totalEnergy) + " kWh, " +
                                     "Cost: $" + String.format("%.2f", css.totalCost));
                }
            }
        }
        
        System.out.println("[EconomizerController] SimulationResponse: " + resp);
        return resp;
    }

    // DTOs
    public static class SimulationResponse {
        public SimulationSummary summary;
        public List<AirEconomizerModel.StepResult> hourlyResults;
        
        // CloudSim-specific fields
        public Boolean cloudSimEnabled = false;
        public String workloadMode;
        public Double averageUtilization;
        public RackAnalysisSummary rackAnalysis;
        
        // Multi-year projection fields
        public ProjectionSummary projection;
        public ClimateScenarioSummary[] climateScenarios;
    }

    public static class SimulationSummary {
        public double totalItEnergy_kWh;
        public double totalCoolingEnergy_kWh;
        public double totalEnergy_kWh;
        public double averagePUE;
        public double averageCUE;
        public double estimatedOpExUSD;
        
        // Enhanced financial metrics
        public double totalCarbonEmissions_kg;
        public double electricityCostUSD;        // NEW: Electricity cost only
        public double carbonTaxCostUSD;          // NEW: Carbon tax cost only
        public double annualOpExUSD;             // UPDATED: Now includes both electricity + carbon tax
        public double totalCapexUSD;
        public double annualSavingsUSD;
        public double paybackPeriodYears;
        public double energySavingsPercent;
        public double carbonSavings_kg;
        public double waterUsage_liters;
    }
    
    public static class RackAnalysisSummary {
        public int totalRacks;
        public int hotspotRacks;
        public double maxRackLoadKW;
        public double averageRackLoadKW;
        public double loadImbalanceFactor;
        public String[] warnings;
        public String[] airflowViolations;
    }

    public static class ProjectionSummary {
        public int forecastYears;
        public double totalEnergy;
        public double totalEmissions;
        public double totalCost;
        public double totalCarbonTax;
        public double totalSavings;
        public double npvSavings;
        public double adjustedPaybackYears;
        public YearlyProjection[] yearlyData;
    }
    
    public static class YearlyProjection {
        public int year;
        public double energyKWh;
        public double energyCostUSD;
        public double energySavingsKWh;
        public double emissionsTonsCO2;
        public double emissionsSavingsTonsCO2;
        public double carbonTaxUSD;
        public double totalCostUSD;
        public double costSavingsUSD;
        public double cumulativeEnergy;
        public double cumulativeEmissions;
        public double cumulativeCost;
        public double cumulativeSavings;
        public double temperatureOffsetC;
        public double coolingLoadIncrease;
    }
    
    public static class ClimateScenarioSummary {
        public String name;
        public double temperatureIncrease;
        public double totalEnergy;
        public double totalEmissions;
        public double totalCost;
        public double adjustedPaybackYears;
    }
}
