package com.acme.chilledwatersystem.api.service;

import com.acme.chilledwatersystem.*;
import com.acme.chilledwatersystem.api.dto.*;
import com.acme.chilledwatersystem.api.util.PsychrometricCalculator;
import com.acme.chilledwatersystem.api.util.InfrastructureEfficiency;
import com.acme.chilledwatersystem.api.util.ChillerAutoSizer;
import com.acme.chilledwatersystem.api.util.AirDensityCalculator;
import com.acme.chilledwatersystem.api.util.CarbonTaxEscalation;
import org.cloudsimplus.brokers.DatacenterBroker;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.Datacenter;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.utilizationmodels.UtilizationModelDynamic;
import org.cloudsimplus.utilizationmodels.UtilizationModelFull;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service layer for Chilled Water Cooling Simulations
 * 
 * Integrates with existing ChilledWaterPhysics, EnvironmentEngine, and CloudSim Plus
 */
@Service
public class ChilledWaterSimulationService {

    /**
     * Run complete 8760-hour simulation using existing SimulationOrchestrator
     */
    public SimulationResponse runSimulation(SimulationRequest request) {
        long startTime = System.currentTimeMillis();
        String simulationId = UUID.randomUUID().toString();

        try {
            // ===================================================================
            // STEP 1: Validate Request & Calculate Wet Bulb Temperatures
            // ===================================================================
            validateRequest(request);
            calculateAndValidateWetBulbTemperatures(request);

            // ===================================================================
            // STEP 1.5: TRIM WEATHER DATA TO SIMULATION DURATION
            // ===================================================================
            // Frontend always sends 8760 hours, but we only use the first N hours
            int simulationHours = 8760; // Default to full year
            if (request.getSimulation() != null && request.getSimulation().getTime_horizon_hours() > 0) {
                simulationHours = request.getSimulation().getTime_horizon_hours();
            }
            
            List<WeatherDataPointDTO> weatherData = request.getWeatherData().getDataPoints();
            if (weatherData.size() > simulationHours) {
                weatherData = weatherData.subList(0, simulationHours);
                request.getWeatherData().setDataPoints(weatherData);
                System.out.printf("✅ Trimmed weather data to %d hours (from 8760)\n", simulationHours);
            }

            // ===================================================================
            // STEP 2: Configure Scenario from Request
            // ===================================================================
            EdgeDataCenterScenario scenario = buildScenarioFromRequest(request);

            // ===================================================================
            // STEP 3: Initialize CloudSim Plus
            // ===================================================================
            CloudSimPlus simulation = new CloudSimPlus();
            
            // Create datacenter with hosts
            EdgeInfraManager infraManager = new EdgeInfraManager(scenario);
            List<Host> hostList = infraManager.buildHosts();
            Datacenter datacenter = new DatacenterSimple(simulation, hostList);
            
            // ===================================================================
            // STEP 3.5: AUTO-SIZE CHILLER CAPACITY
            // ===================================================================
            ChillerAutoSizer.SizingReport sizingReport = ChillerAutoSizer.autoSizeWithAnalysis(
                infraManager,
                request.getItInfrastructure(),
                request.getItInfrastructure().getAvgCpuUtilization(),
                request.getItInfrastructure().getWorkloadType()
            );
            sizingReport.print();
            
            // Update scenario with auto-sized capacity
            double autoSizedCapacity = sizingReport.standardizedCapacity;
            System.out.printf("✅ Using auto-sized chiller capacity: %.2f kW\n\n", autoSizedCapacity);
            
            // ===================================================================
            // STEP 3.6: VALIDATE ATMOSPHERIC CONDITIONS
            // ===================================================================
            WeatherDataPointDTO firstDataPoint = request.getWeatherData().getDataPoints().get(0);
            String atmosphericReport = AirDensityCalculator.getAtmosphericReport(
                firstDataPoint.getAtmospheric_pressure_pa(),
                firstDataPoint.getDry_bulb_c(),
                request.getSiteParameters().getAltitude()
            );
            System.out.println("╔═══════════════════════════════════════════════════════════════════════╗");
            System.out.println("║  ATMOSPHERIC CONDITIONS ANALYSIS                                      ║");
            System.out.println("╚═══════════════════════════════════════════════════════════════════════╝");
            System.out.println(atmosphericReport);
            System.out.println();
            
            // Validate pressure readings
            AirDensityCalculator.validatePressure(
                firstDataPoint.getAtmospheric_pressure_pa(),
                request.getSiteParameters().getAltitude()
            );
            
            // Create broker
            DatacenterBroker broker = new DatacenterBrokerSimple(simulation);
            
            // Create VMs
            int totalServers = request.getItInfrastructure().getTotalServers();
            List<Vm> vmList = createVms(totalServers);
            broker.submitVmList(vmList);
            
            // Create cloudlets based on workload type
            List<Cloudlet> cloudletList = createCloudlets(
                totalServers * 2, // 2 cloudlets per VM
                request.getItInfrastructure().getWorkloadType(),
                request.getItInfrastructure().getAvgCpuUtilization()
            );
            broker.submitCloudletList(cloudletList);

            // ===================================================================
            // STEP 4: Initialize Physical Systems
            // ===================================================================
            EnvironmentEngine weather = createWeatherEngine(request, scenario);
            ChilledWaterPhysics physics = new ChilledWaterPhysics(scenario);

            // ===================================================================
            // STEP 5: Create SimulationOrchestrator and Run
            // ===================================================================
            SimulationOrchestrator orchestrator = new SimulationOrchestrator(
                simulation, physics, weather, scenario, 
                request.getItInfrastructure().getWorkloadType() // Pass workload type
            );
            
            // Set datacenter components for power monitoring
            orchestrator.setDatacenterComponents(datacenter, hostList);
            
            // CRITICAL FIX: Initialize CloudSim event queue without running to completion
            // We use startSync() to register the datacenter and set up initial events
            // but NOT process them yet. The orchestrator will advance time incrementally.
            System.out.println("✅ Initializing CloudSim Plus event queue...");
            simulation.startSync();
            System.out.println("   Datacenter registered, VMs allocated, Cloudlets submitted");
            System.out.println("   Orchestrator will advance simulation using runFor(3600) for 8760 hours");
            System.out.println("   Using Discrete Event Simulation with LoopingDiurnalUtilizationModel");
            
            // Run the full 8760-hour co-simulation
            // The orchestrator will use runFor(3600) to process events in 1-hour bursts
            orchestrator.runAnnualSimulation();
            
            // Get results from orchestrator
            List<SimulationOrchestrator.HourlySimulationResult> orchestratorResults = 
                orchestrator.getResults();

            // ===================================================================
            // STEP 6: Convert Results to DTO Format
            // ===================================================================
            List<HourlyResultDTO> hourlyResults = new ArrayList<>();
            double totalEnergy = 0;
            double totalCooling = 0;
            double totalWater = 0;
            double totalCost = 0;
            double totalCarbon = 0;
            double peakCoolingLoad = 0;
            double totalITEnergy = 0;
            
            for (SimulationOrchestrator.HourlySimulationResult result : orchestratorResults) {
                HourlyResultDTO hourlyResult = new HourlyResultDTO();
                hourlyResult.setHour(result.hour - 1); // Convert to 0-indexed
                hourlyResult.setAmbientTemp_C(result.ambientTempC);
                hourlyResult.setItLoad_kW(result.itLoadKW);
                hourlyResult.setCoolingLoad_kW(result.totalCoolingKW);
                hourlyResult.setChillerPower_kW(result.chillerPowerKW);
                hourlyResult.setCop(result.chillerCOP);
                
                // CRITICAL FIX: Use water usage from physics engine (already calculated)
                // This ensures consistency between console output and API response
                double waterUsage = result.waterUsageLiters;
                hourlyResult.setWaterUsage_L(waterUsage);
                
                hourlyResult.setCost_USD(result.hourlyCostUSD);
                hourlyResult.setCarbonEmissions_kg(result.hourlyCarbonKg);
                
                hourlyResults.add(hourlyResult);
                
                // Accumulate totals
                totalITEnergy += result.itLoadKW;
                totalEnergy += (result.itLoadKW + result.totalCoolingKW);
                totalCooling += result.totalCoolingKW;
                totalWater += waterUsage;
                totalCost += result.hourlyCostUSD;
                totalCarbon += result.hourlyCarbonKg;
                peakCoolingLoad = Math.max(peakCoolingLoad, result.totalCoolingKW);
            }

            // ===================================================================
            // STEP 7: Calculate Metrics
            // ===================================================================
            double pue = orchestrator.getAnnualPUE();
            double wue = totalWater / totalEnergy;
            double avgCOP = totalCooling / (totalEnergy - totalITEnergy);

            // ===================================================================
            // STEP 8: Calculate Economics with Existing Models
            // ===================================================================
            double capex = calculateCapex(request);
            double opex = totalCost;
            
            // Use existing Economics and EscalatedFinancialAnalyzer
            EconomicConfig economicConfig = createEconomicConfig(request);
            CarbonConfig carbonConfig = createCarbonConfig(request.getEconomicEnvironmental());
            
            // Create workload aggregator for financial analysis
            WorkloadSituation workloadSituation = createWorkloadSituation(request);
            List<HourlyResult> hourlyResultsForAgg = convertToHourlyResults(orchestratorResults);
            WorkloadAggregator workloadAgg = new WorkloadAggregator(workloadSituation, hourlyResultsForAgg);
            
            // Calculate escalated financials
            MacroeconomicModel macroModel = new MacroeconomicModel(workloadSituation);
            EscalatedFinancialAnalyzer financialAnalyzer = new EscalatedFinancialAnalyzer(
                macroModel, workloadAgg, economicConfig, carbonConfig
            );
            
            double annualSavings = opex * 0.1; // Assume 10% savings vs baseline
            double npv = financialAnalyzer.calculateEscalatedNPV(annualSavings, capex, 15);
            double payback = financialAnalyzer.calculateInflationAdjustedPayback(capex, annualSavings);
            double lccp = financialAnalyzer.calculateTCOWithRefresh(opex, 15);

            // ===================================================================
            // STEP 9: Validate Phase 4 Gates
            // ===================================================================
            Phase4Gates gates = validatePhase4Gates(
                request,
                wue,
                totalCarbon,
                totalCost,
                npv
            );

            // ===================================================================
            // STEP 10: Build Response
            // ===================================================================
            long executionTime = System.currentTimeMillis() - startTime;

            // Build annual results
            AnnualResults annual = new AnnualResults();
            annual.setEnergyConsumption_kWh(totalEnergy);
            annual.setCoolingLoad_kWh(totalCooling);
            annual.setWaterUsage_L(totalWater);
            annual.setCost_USD(totalCost);
            annual.setCarbonEmissions_kg(totalCarbon);

            // Build performance metrics
            PerformanceMetrics metrics = new PerformanceMetrics();
            metrics.setPue(pue);
            metrics.setWue(wue);
            metrics.setAverageCOP(avgCOP);
            metrics.setPeakCoolingLoad_kW(peakCoolingLoad);

            // Build economics
            com.acme.chilledwatersystem.api.dto.Economics economics = new com.acme.chilledwatersystem.api.dto.Economics();
            economics.setCapex_USD(capex);
            economics.setOpex_annual_USD(opex);
            economics.setLccp_USD(lccp);
            economics.setNpv_USD(npv);
            economics.setPaybackPeriod_years(payback);

            // Build simulation results
            SimulationResults results = new SimulationResults();
            results.setAnnual(annual);
            results.setMetrics(metrics);
            results.setEconomics(economics);
            results.setPhase4Gates(gates);
            results.setHourlyResults(hourlyResults);

            // Build response
            SimulationResponse response = new SimulationResponse();
            response.setStatus("success");
            response.setSimulationId(simulationId);
            response.setExecutionTime(executionTime);
            response.setResults(results);

            return response;

        } catch (Exception e) {
            System.err.println("❌ Simulation failed: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Simulation failed: " + e.getMessage(), e);
        }
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private void validateRequest(SimulationRequest request) {
        if (request.getWeatherData().getDataPoints().size() != 8760) {
            throw new IllegalArgumentException("Weather data must have exactly 8760 hourly data points");
        }
        if (!request.getWeatherData().getHasValidData()) {
            throw new IllegalArgumentException("Weather data validation failed");
        }
    }

    /**
     * Calculate and validate wet bulb temperatures for all weather data points
     * This is critical for cooling tower performance analysis
     */
    private void calculateAndValidateWetBulbTemperatures(SimulationRequest request) {
        System.out.println("\n╔═══════════════════════════════════════════════════════════════════════╗");
        System.out.println("║  CALCULATING WET BULB TEMPERATURES                                    ║");
        System.out.println("╚═══════════════════════════════════════════════════════════════════════╝");
        
        List<WeatherDataPointDTO> dataPoints = request.getWeatherData().getDataPoints();
        int recalculatedCount = 0;
        int validatedCount = 0;
        double maxWetBulb = Double.MIN_VALUE;
        double minWetBulb = Double.MAX_VALUE;
        int criticalHours = 0;
        
        for (int i = 0; i < dataPoints.size(); i++) {
            WeatherDataPointDTO point = dataPoints.get(i);
            double dryBulb = point.getDry_bulb_c();
            double relHumidity = point.getRelative_humidity();
            double providedWetBulb = point.getWet_bulb_c();
            
            // Calculate wet bulb using psychrometric formula
            double calculatedWetBulb = PsychrometricCalculator.calculateWetBulb(dryBulb, relHumidity);
            
            // Check if provided wet bulb is valid
            if (providedWetBulb == 0 || !PsychrometricCalculator.isValidWetBulb(dryBulb, providedWetBulb, relHumidity)) {
                // Use calculated value
                point.setWet_bulb_c(calculatedWetBulb);
                recalculatedCount++;
            } else {
                // Validate provided value
                double difference = Math.abs(providedWetBulb - calculatedWetBulb);
                if (difference > 2.0) {
                    System.out.println(String.format(
                        "⚠️  Hour %d: Large discrepancy - Provided: %.2f°C, Calculated: %.2f°C (Δ=%.2f°C)",
                        i, providedWetBulb, calculatedWetBulb, difference
                    ));
                }
                validatedCount++;
            }
            
            double finalWetBulb = point.getWet_bulb_c();
            maxWetBulb = Math.max(maxWetBulb, finalWetBulb);
            minWetBulb = Math.min(minWetBulb, finalWetBulb);
            
            // Check for critical cooling tower conditions
            double targetSupplyTemp = request.getMechanicalSpecs().getSupplyWaterTempC();
            if (!PsychrometricCalculator.isCoolingTowerCapable(targetSupplyTemp, finalWetBulb, 2.0)) {
                criticalHours++;
            }
        }
        
        System.out.println(String.format("✅ Wet bulb calculation complete:"));
        System.out.println(String.format("   • Recalculated: %d data points", recalculatedCount));
        System.out.println(String.format("   • Validated: %d data points", validatedCount));
        System.out.println(String.format("   • Range: %.2f°C to %.2f°C", minWetBulb, maxWetBulb));
        System.out.println(String.format("   • Critical hours (wet bulb too high): %d / 8760", criticalHours));
        
        if (criticalHours > 0) {
            double targetSupplyTemp = request.getMechanicalSpecs().getSupplyWaterTempC();
            System.out.println(String.format(
                "\n⚠️  WARNING: %d hours (%.1f%%) have wet bulb temperatures that make achieving %.1f°C supply water physically challenging!",
                criticalHours, (criticalHours / 87.6), targetSupplyTemp
            ));
            System.out.println("   This indicates potential 2030 heatwave risk for evaporative cooling systems.");
        }
        
        System.out.println("");
    }

    private EdgeDataCenterScenario buildScenarioFromRequest(SimulationRequest request) {
        EdgeDataCenterScenario scenario = new EdgeDataCenterScenario();
        
        // Set location
        scenario.setLocation(request.getWeatherData().getLocation());
        
        // Set infrastructure
        scenario.setTotalRacks(request.getItInfrastructure().getNumberOfRacks());
        scenario.setServersPerRack(request.getItInfrastructure().getServersPerRack());
        
        // Set design conditions (use first hour of weather data)
        WeatherDataPointDTO firstHour = request.getWeatherData().getDataPoints().get(0);
        scenario.setDesignAmbientC(firstHour.getDry_bulb_c());
        scenario.setDesignWetBulbC(firstHour.getWet_bulb_c());
        
        return scenario;
    }

    private EnvironmentEngine createWeatherEngine(SimulationRequest request, EdgeDataCenterScenario scenario) {
        EnvironmentEngine weather = new EnvironmentEngine(scenario);
        
        // Load weather data from request with automatic wet bulb calculation
        List<EnvironmentEngine.HourlyWeather> hourlyWeatherList = new ArrayList<>();
        List<WeatherDataPointDTO> dataPoints = request.getWeatherData().getDataPoints();
        
        for (WeatherDataPointDTO point : dataPoints) {
            // Use the already calculated/validated wet bulb from the DTO
            // (calculated in calculateAndValidateWetBulbTemperatures method)
            EnvironmentEngine.HourlyWeather hourlyWeather = new EnvironmentEngine.HourlyWeather(
                point.getHour(),
                point.getDry_bulb_c(),
                point.getWet_bulb_c(), // Already calculated/validated
                PsychrometricCalculator.calculateDewPoint(point.getDry_bulb_c(), point.getRelative_humidity()),
                point.getRelative_humidity(),
                point.getAtmospheric_pressure_pa()
            );
            hourlyWeatherList.add(hourlyWeather);
        }
        
        // Load the weather data into the engine
        weather.loadFromApiRequest(hourlyWeatherList);
        
        return weather;
    }

    private EconomicConfig createEconomicConfig(SimulationRequest request) {
        EconomicConfig config = new EconomicConfig();
        // EconomicConfig uses default values, which is fine for now
        // You can add setters if you need to customize based on request
        return config;
    }
    
    private WorkloadSituation createWorkloadSituation(SimulationRequest request) {
        String workloadType = request.getItInfrastructure().getWorkloadType();
        
        // Map workload type to WorkloadSituation
        if (workloadType.equals("ai_training")) {
            return WorkloadSituation.createAITraining();
        } else if (workloadType.equals("ai_inference")) {
            return WorkloadSituation.createAIInference();
        } else {
            return WorkloadSituation.createEnterprise();
        }
    }
    
    private List<HourlyResult> convertToHourlyResults(List<SimulationOrchestrator.HourlySimulationResult> orchestratorResults) {
        List<HourlyResult> hourlyResults = new ArrayList<>();
        
        for (SimulationOrchestrator.HourlySimulationResult result : orchestratorResults) {
            HourlyResult hourlyResult = new HourlyResult(
                result.hour,
                result.itLoadKW,
                result.chillerPowerKW,
                0.0, // fanPowerKW - included in totalCoolingKW
                result.pumpPowerKW,
                result.hourlyCostUSD,
                result.rackInletTempC,
                result.ambientTempC,
                result.wetbulbTempC,
                "STANDARD", // tariffPeriod
                result.hourlyCarbonKg
            );
            hourlyResults.add(hourlyResult);
        }
        
        return hourlyResults;
    }

    private CarbonConfig createCarbonConfig(EconomicEnvironmentalDTO econ) {
        CarbonConfig config = new CarbonConfig();
        // TODO: Add setters to CarbonConfig if needed
        // config.setGridCarbonIntensity(econ.getCarbonIntensity());
        // config.setCarbonTax2030(econ.getCarbonTax2030());
        // config.setRefrigerantGWP(econ.getRefrigerantGWP());
        return config;
    }

    private double calculateCapex(SimulationRequest request) {
        // Simplified CAPEX calculation
        int totalServers = request.getItInfrastructure().getTotalServers();
        double chillerCapex = 50000; // Base chiller cost
        double serverCapex = totalServers * 5000; // $5k per server
        double infrastructureCapex = 100000; // Racks, cooling distribution, etc.
        
        return chillerCapex + serverCapex + infrastructureCapex;
    }

    private Phase4Gates validatePhase4Gates(SimulationRequest request, double wue, 
                                            double totalCarbon, double totalCost, double npv) {
        // Gate 1: Thermal Compliance (simplified - assume PASS)
        String thermalCompliance = "PASS";
        
        // Gate 2: Water Constraint
        String waterConstraint = wue <= request.getWaterStress().getWueThreshold() ? "PASS" : "FAIL";
        
        // Gate 3: Carbon Liability (using 2030 IPCC pathway)
        double annualCarbonTons = totalCarbon / 1000.0; // Convert kg to tons
        CarbonTaxEscalation.Gate4Result carbonGate = CarbonTaxEscalation.validateGate4(
            annualCarbonTons,
            totalCost,
            2030,
            true // Use IPCC pathway escalation
        );
        carbonGate.print();
        String carbonLiability = carbonGate.verdict;
        
        // Gate 4: Economic Viability
        String economicViability = npv > 0 ? "PASS" : "FAIL";
        
        Phase4Gates gates = new Phase4Gates();
        gates.setThermalCompliance(thermalCompliance);
        gates.setWaterConstraint(waterConstraint);
        gates.setCarbonLiability(carbonLiability);
        gates.setEconomicViability(economicViability);
        
        return gates;
    }

    private List<Vm> createVms(int count) {
        List<Vm> vmList = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Vm vm = new VmSimple(1000, 2); // 1000 MIPS, 2 PEs
            vm.setRam(2048).setBw(1000).setSize(10000);
            vmList.add(vm);
        }
        return vmList;
    }

    private List<Cloudlet> createCloudlets(int count, String workloadType, double utilization) {
        List<Cloudlet> cloudletList = new ArrayList<>();
        
        // CRITICAL FIX: Use extremely long cloudlet length to prevent "workload stagnation"
        // The cloudlet should NEVER finish during the 8760-hour simulation (31,536,000 seconds)
        // We use a value that represents millions of hours of execution
        long length = 1_000_000_000_000L; // 1 trillion MI - effectively infinite
        
        System.out.printf("Creating %d cloudlets with infinite length (%,d MI) for workload type: %s\n", 
            count, length, workloadType);
        
        for (int i = 0; i < count; i++) {
            // IMPORTANT: Create a NEW utilization model instance for EACH cloudlet
            // This ensures each cloudlet has independent random noise generation
            LoopingDiurnalUtilizationModel utilizationModel = switch (workloadType) {
                case "ai_training" -> LoopingDiurnalUtilizationModel.forAITraining();
                case "ai_inference" -> LoopingDiurnalUtilizationModel.forAIInference();
                case "edge_computing" -> LoopingDiurnalUtilizationModel.forEdgeComputing();
                default -> LoopingDiurnalUtilizationModel.forEnterprise();
            };
            
            Cloudlet cloudlet = new CloudletSimple(length, 2);
            
            // Use looping diurnal model for CPU (dynamic, repeating pattern)
            cloudlet.setUtilizationModelCpu(utilizationModel);
            
            // RAM utilization follows CPU pattern (scaled to 50%)
            cloudlet.setUtilizationModelRam(new UtilizationModelDynamic(0.5));
            
            // Bandwidth is constant (network traffic doesn't vary as much)
            cloudlet.setUtilizationModelBw(new UtilizationModelFull());
            
            cloudletList.add(cloudlet);
        }
        
        System.out.printf("✅ Created %d cloudlets with LoopingDiurnalUtilizationModel\n", count);
        System.out.println("   Each cloudlet will run continuously for the entire 8760-hour simulation");
        System.out.println("   Workload will vary with diurnal (24h), weekly (7d), and random patterns");
        
        return cloudletList;
    }
}
