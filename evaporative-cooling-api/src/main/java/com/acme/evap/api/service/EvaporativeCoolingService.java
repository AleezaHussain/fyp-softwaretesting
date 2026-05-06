package com.acme.evap.api.service;

import com.acme.evap.api.dto.SimulationRequest;
import com.acme.evap.api.dto.SimulationResponse;
import com.acme.evap.api.service.WeatherCsvParser;
import com.acme.evap.CoolingAdequacyAssessment;
import com.acme.aireconcalc.cloudsim.CloudSimWorkloadService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class EvaporativeCoolingService {
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WeatherCsvParser weatherParser = new WeatherCsvParser();
    
    private double calculateDynamicDxCop(double outdoorTempC, double nominalCOP) {
        final double T_REFERENCE = 25.0;
        final double DEGRADATION_FACTOR = 0.025;
        double tempDelta = outdoorTempC - T_REFERENCE;
        double dynamicCOP = nominalCOP * (1.0 - DEGRADATION_FACTOR * tempDelta);
        return Math.max(2.0, Math.min(5.0, dynamicCOP));
    }
    
    private double[] generateCloudSimWorkload(SimulationRequest request) {
        System.out.println("\n[CloudSim] Generating dynamic workload profile...");
        long startTime = System.currentTimeMillis();
        
        CloudSimWorkloadService.WorkloadConfig config = new CloudSimWorkloadService.WorkloadConfig();
        config.numberOfServers = request.it_load.servers;
        config.serversPerRack = 10;
        config.simulationHours = request.simulation.time_horizon_hours;  // Use frontend-specified duration
        config.workloadMode = CloudSimWorkloadService.AIWorkloadMode.AI_TRAINING;
        config.computeIntensityFactor = 1.2;
        config.coresPerServer = 16;
        config.mipsPerCore = 1000;
        
        CloudSimWorkloadService workloadService = new CloudSimWorkloadService();
        CloudSimWorkloadService.WorkloadResult workloadResult = workloadService.generateWorkloadProfile(config);
        
        long elapsed = System.currentTimeMillis() - startTime;
        System.out.println("[CloudSim] Workload generation complete in " + (elapsed / 1000.0) + " seconds");
        
        double[] scaledWorkload = new double[workloadResult.hourlyITLoadKW.length];
        double avgCloudSimLoad = 0;
        for (double load : workloadResult.hourlyITLoadKW) {
            avgCloudSimLoad += load;
        }
        avgCloudSimLoad /= workloadResult.hourlyITLoadKW.length;
        
        double scaleFactor = request.it_load.total_it_power_kw / avgCloudSimLoad;
        for (int i = 0; i < workloadResult.hourlyITLoadKW.length; i++) {
            scaledWorkload[i] = workloadResult.hourlyITLoadKW[i] * scaleFactor;
        }
        
        System.out.println("[CloudSim] Workload scaled to " + String.format("%.2f", request.it_load.total_it_power_kw) + " kW");
        return scaledWorkload;
    }
    
    public SimulationRequest parseConfigJson(String configJson) throws IOException {
        return objectMapper.readValue(configJson, SimulationRequest.class);
    }
    
    public SimulationResponse runSimulation(MultipartFile weatherFile, SimulationRequest request) 
            throws IOException {
        
        validateSimulationRequest(request);
        
        System.out.println("FRONTEND CONFIGURATION RECEIVED:");
        System.out.println("  IT Load: " + request.it_load.total_it_power_kw + " kW, " + 
                          request.it_load.servers + " servers, " + request.it_load.racks + " racks");
        System.out.println("  Cooling Type: " + request.cooling_system.type);
        System.out.println("  Max Airflow: " + request.cooling_system.max_airflow_cfm + " CFM");
        System.out.println("  Fan Efficiency: " + (request.cooling_system.fan_efficiency * 100) + "%");
        System.out.println("  Saturation Effectiveness: " + request.cooling_system.saturation_effectiveness + "%");
        System.out.println("  Simulation Duration: " + request.simulation.time_horizon_hours + " hours");
        System.out.println();
        
        List<WeatherPoint> weatherData = weatherParser.parseWeatherCsv(weatherFile);
        
        // Frontend always sends 8760 hours, but we only use the first N hours based on user selection
        int simulationHours = request.simulation.time_horizon_hours;
        if (weatherData.size() < simulationHours) {
            throw new IllegalArgumentException(
                String.format("Weather data contains %d hours, but simulation requires %d hours", 
                             weatherData.size(), simulationHours));
        }
        
        // Trim weather data to match selected duration
        if (weatherData.size() > simulationHours) {
            System.out.println("Trimming weather data from " + weatherData.size() + " to " + simulationHours + " hours");
            weatherData = weatherData.subList(0, simulationHours);
        }
        
        System.out.println("[STEP 1] CloudSim Workload Generation");
        double[] cloudSimWorkload = generateCloudSimWorkload(request);
        System.out.println("[STEP 1] Complete\n");
        
        SimulationState state = new SimulationState();
        
        System.out.println("[STEP 2] Physics Calculations (8760 hours)");
        long startTime = System.currentTimeMillis();
        
        for (int hour = 0; hour < weatherData.size(); hour++) {
            WeatherPoint weather = weatherData.get(hour);
            runHourlySimulation(hour, weather, request, state, cloudSimWorkload);
            
            if ((hour + 1) % 24 == 0) {
                long elapsed = System.currentTimeMillis() - startTime;
                double hoursPerSecond = (hour + 1) / (elapsed / 1000.0);
                double etaSeconds = (8760 - hour - 1) / hoursPerSecond;
                System.out.printf("[Progress] Day %3d: %.1f hours/sec, ETA: %.1f min\n",
                    (hour + 1) / 24, hoursPerSecond, etaSeconds / 60.0);
            }
        }
        
        long totalTime = System.currentTimeMillis() - startTime;
        System.out.println("[STEP 2] Complete in " + (totalTime / 1000.0) + " seconds\n");
        
        CoolingAdequacyAssessment.Assessment assessment = performCoolingAssessment(state, request);
        
        return buildSimulationResponse(state, assessment, request);
    }
    
    private void validateSimulationRequest(SimulationRequest request) {
        List<String> errors = new ArrayList<>();
        
        if (request.it_load.total_it_power_kw <= 0) {
            errors.add("Total IT power must be greater than 0 kW");
        }
        if (request.it_load.servers <= 0) {
            errors.add("Number of servers must be greater than 0");
        }
        if (request.it_load.racks <= 0) {
            errors.add("Number of racks must be greater than 0");
        }
        if (request.cooling_system.max_airflow_cfm <= 0) {
            errors.add("Maximum airflow capacity must be greater than 0 CFM");
        }
        if (request.cooling_system.fan_efficiency <= 0 || request.cooling_system.fan_efficiency > 1.0) {
            errors.add("Fan efficiency must be between 0 and 1.0");
        }
        if (request.rates.electricity_usd_per_kwh <= 0) {
            errors.add("Electricity rate must be greater than 0 $/kWh");
        }
        
        if (!errors.isEmpty()) {
            throw new IllegalArgumentException("Configuration validation failed: " + String.join("; ", errors));
        }
    }
    
    private void runHourlySimulation(int hour, WeatherPoint weather, 
                                   SimulationRequest request, SimulationState state, double[] cloudSimWorkload) {
        
        double itLoadKW = cloudSimWorkload[hour];
        
        double upsEfficiency = 0.96;
        double pduLossFraction = 0.02;
        double upsLossKW = itLoadKW * (1.0 / upsEfficiency - 1.0);
        double pduLossKW = itLoadKW * pduLossFraction;
        double totalHeatLoadKW = itLoadKW + upsLossKW + pduLossKW;
        
        String coolingMode = determineCoolingMode(weather, request.cooling_system);
        
        EvapCoolingResult evapResult = calculateEvaporativeCooling(
            weather, totalHeatLoadKW, request.cooling_system, coolingMode);
        
        double fanPowerKW = calculateFanPower(evapResult.airflowCFM, request.cooling_system);
        
        double pumpPowerFraction = 0.02;
        double pumpPowerKW = evapResult.coolingCapacityKW * pumpPowerFraction;
        
        double dxPowerKW = 0.0;
        double dxCoolingKW = 0.0;
        
        if (evapResult.coolingCapacityKW < totalHeatLoadKW) {
            dxCoolingKW = totalHeatLoadKW - evapResult.coolingCapacityKW;
            
            if (request.cooling_system.has_dx_backup) {
                double dynamicCOP = calculateDynamicDxCop(
                    weather.dryBulbTempC, 
                    request.cooling_system.dx_cop
                );
                
                dxPowerKW = dxCoolingKW / dynamicCOP;
                
                if (hour < 5 || hour % 1000 == 0) {
                    System.out.println(String.format(
                        "  Hour %d: DX Backup Active - Outdoor: %.1fC, Evap: %.1f kW, DX: %.1f kW, Total: %.1f kW, COP: %.2f",
                        hour, weather.dryBulbTempC, evapResult.coolingCapacityKW, dxCoolingKW, totalHeatLoadKW, dynamicCOP
                    ));
                }
            }
        }
        
        double totalElectricalKW = itLoadKW + upsLossKW + pduLossKW + fanPowerKW + pumpPowerKW + dxPowerKW;
        
        double pue = totalElectricalKW / itLoadKW;
        
        double serverDeltaT = (itLoadKW / request.it_load.servers) * 0.02;
        double inletTempC = evapResult.supplyTempC + serverDeltaT;
        
        state.addHourlyData(hour, weather, itLoadKW, totalElectricalKW, fanPowerKW, 
                           dxPowerKW, pumpPowerKW, evapResult.coolingCapacityKW, evapResult.waterEvaporationLph,
                           pue, inletTempC, coolingMode);
    }
    
    private String determineCoolingMode(WeatherPoint weather, 
                                      SimulationRequest.CoolingSystemConfig config) {
        
        if ("direct_evaporative".equals(config.type)) {
            return "DEC";
        } else if ("indirect_evaporative".equals(config.type)) {
            return "IEC";
        } else if ("hybrid".equals(config.type)) {
            double wetBulbTempC = calculateWetBulbTemp(weather.dryBulbTempC, weather.relativeHumidity);
            double wetBulbDepression = weather.dryBulbTempC - wetBulbTempC;
            
            if (weather.relativeHumidity < 70 && wetBulbDepression > 5) {
                return "DEC";
            } 
            else if (weather.relativeHumidity < 90 && wetBulbDepression > 2) {
                return "IEC";
            }
            else if (config.has_dx_backup) {
                return "DX_ASSIST";
            }
            else {
                return "IEC";
            }
        }
        
        return "DEC";
    }
    
    private EvapCoolingResult calculateEvaporativeCooling(WeatherPoint weather, 
                                                        double heatLoadKW,
                                                        SimulationRequest.CoolingSystemConfig config,
                                                        String mode) {
        
        EvapCoolingResult result = new EvapCoolingResult();
        
        double effectiveness = config.saturation_effectiveness / 100.0;
        double wettingEfficiency = config.wetting_efficiency / 100.0;
        double wetBulbTempC = calculateWetBulbTemp(weather.dryBulbTempC, weather.relativeHumidity);
        
        double actualEffectiveness = effectiveness * wettingEfficiency;
        double targetSupplyTempC = 18.0;
        
        if ("DEC".equals(mode)) {
            result.supplyTempC = weather.dryBulbTempC - actualEffectiveness * (weather.dryBulbTempC - wetBulbTempC);
            result.supplyHumidity = Math.min(95.0, weather.relativeHumidity + (actualEffectiveness * 25.0));
        } else if ("IEC".equals(mode)) {
            result.supplyTempC = weather.dryBulbTempC - (actualEffectiveness * 0.7) * (weather.dryBulbTempC - wetBulbTempC);
            result.supplyHumidity = weather.relativeHumidity;
        } else if ("DX_ASSIST".equals(mode)) {
            double evapSupplyTemp = weather.dryBulbTempC - (actualEffectiveness * 0.8) * (weather.dryBulbTempC - wetBulbTempC);
            result.supplyTempC = Math.min(evapSupplyTemp, targetSupplyTempC);
            result.supplyHumidity = weather.relativeHumidity;
        }
        
        double airDensity = 1.2;
        double specificHeat = 1.006;
        
        final double CFM_TO_M3S = 0.000471947;
        
        double maxAirflowM3s = config.max_airflow_cfm * CFM_TO_M3S;
        result.airflowCFM = config.max_airflow_cfm;
        
        double tempDifferential = weather.dryBulbTempC - result.supplyTempC;
        
        result.coolingCapacityKW = maxAirflowM3s * airDensity * specificHeat * tempDifferential;
        
        result.coolingCapacityKW = Math.max(result.coolingCapacityKW, heatLoadKW * 0.3);
        
        double latentHeat = 2260;
        double baseEvaporationLph = (result.coolingCapacityKW * 3600) / latentHeat;
        
        double cyclesOfConcentration = config.cycles_of_concentration;
        double blowdownFraction = 1.0 / (cyclesOfConcentration - 1.0);
        result.waterEvaporationLph = baseEvaporationLph * (1.0 + blowdownFraction);
        
        return result;
    }
    
    private double calculateFanPower(double airflowCFM, SimulationRequest.CoolingSystemConfig config) {
        final double CFM_TO_M3S = 0.000471947;
        double airflowM3s = airflowCFM * CFM_TO_M3S;
        
        double pressureDrop = 200;
        double fanEfficiency = config.fan_efficiency;
        
        double fanPowerKW = (airflowM3s * pressureDrop) / (1000 * fanEfficiency);
        
        return fanPowerKW;
    }
    
    private double calculateWetBulbTemp(double dryBulbC, double relativeHumidity) {
        return dryBulbC * Math.atan(0.151977 * Math.sqrt(relativeHumidity + 8.313659)) +
               Math.atan(dryBulbC + relativeHumidity) - Math.atan(relativeHumidity - 1.676331) +
               0.00391838 * Math.pow(relativeHumidity, 1.5) * Math.atan(0.023101 * relativeHumidity) - 4.686035;
    }
    
    private CoolingAdequacyAssessment.Assessment performCoolingAssessment(
            SimulationState state, SimulationRequest request) {
        
        return CoolingAdequacyAssessment.evaluate(
            state.getAverageCoolingCapacityKW(),
            state.getAverageHeatLoadKW(),
            state.getMaxInletTempC(),
            state.getMaxHumidity(),
            state.getMinWetBulbDepressionC(),
            state.getAveragePUE(),
            state.getPrimaryCoolingMode(),
            state.getAverageAmbientTempC()
        );
    }
    
    private SimulationResponse buildSimulationResponse(SimulationState state, 
                                                     CoolingAdequacyAssessment.Assessment assessment,
                                                     SimulationRequest request) {
        
        SimulationResponse response = new SimulationResponse();
        response.status = "success";
        response.message = "Simulation completed successfully";
        
        response.results = new SimulationResponse.SimulationResults();
        
        response.results.energy = new SimulationResponse.EnergyResults();
        response.results.energy.electricity_kwh_total = state.getTotalElectricityKWh();
        response.results.energy.fan_kwh = state.getTotalFanKWh();
        response.results.energy.dx_kwh = state.getTotalDXKWh();
        response.results.energy.pump_kwh = state.getTotalPumpKWh();
        response.results.energy.it_kwh = state.getTotalITKWh();
        response.results.energy.auxiliary_kwh = state.getTotalAuxiliaryKWh();
        
        response.results.water = new SimulationResponse.WaterResults();
        response.results.water.water_liters_total = state.getTotalWaterLiters();
        response.results.water.evaporation_liters = state.getTotalEvaporationLiters();
        response.results.water.blowdown_liters = state.getTotalBlowdownLiters();
        response.results.water.makeup_liters = state.getTotalMakeupLiters();
        
        response.results.cost = new SimulationResponse.CostResults();
        response.results.cost.electricity_usd = state.getTotalElectricityKWh() * request.rates.electricity_usd_per_kwh;
        response.results.cost.water_usd = state.getTotalWaterLiters() * request.rates.water_usd_per_liter;
        response.results.cost.total_energy_cost_usd = response.results.cost.electricity_usd + response.results.cost.water_usd;
        
        response.results.opex = new SimulationResponse.OpexResults();
        response.results.opex.opex_total_usd = response.results.cost.total_energy_cost_usd;
        response.results.opex.opex_per_kwh_it = response.results.opex.opex_total_usd / state.getTotalITKWh();
        response.results.opex.opex_per_server_annual = response.results.opex.opex_total_usd / request.it_load.servers;
        
        response.results.emissions = new SimulationResponse.EmissionsResults();
        response.results.emissions.co2_kg_total = state.getTotalElectricityKWh() * request.emissions.grid_kgco2_per_kwh;
        response.results.emissions.co2_kg_per_kwh_it = response.results.emissions.co2_kg_total / state.getTotalITKWh();
        response.results.emissions.co2_kg_per_server_annual = response.results.emissions.co2_kg_total / request.it_load.servers;
        
        response.results.performance = new SimulationResponse.PerformanceResults();
        response.results.performance.pue_average = state.getAveragePUE();
        response.results.performance.pue_max = state.getMaxPUE();
        response.results.performance.wue_average = state.getTotalWaterLiters() / state.getTotalITKWh();
        response.results.performance.cue_average = response.results.emissions.co2_kg_per_kwh_it;
        response.results.performance.availability_percent = state.getAvailabilityPercent();
        response.results.performance.total_simulation_hours = request.simulation.time_horizon_hours;
        response.results.performance.cooling_failure_hours = state.getCoolingFailureHours();
        
        response.cooling_assessment = new SimulationResponse.CoolingAssessment();
        response.cooling_assessment.status = assessment.status.toString();
        response.cooling_assessment.confidence = assessment.confidence;
        
        response.cooling_assessment.checks = new SimulationResponse.AssessmentChecks();
        response.cooling_assessment.checks.heat_balance = assessment.checks.heat_balance;
        response.cooling_assessment.checks.inlet_temperature_ok = assessment.checks.inlet_temperature_ok;
        response.cooling_assessment.checks.humidity_ok = assessment.checks.humidity_ok;
        response.cooling_assessment.checks.energy_efficiency_ok = assessment.checks.energy_efficiency_ok;
        
        response.cooling_assessment.key_metrics = new SimulationResponse.KeyMetrics();
        response.cooling_assessment.key_metrics.max_inlet_temp_c = assessment.key_metrics.max_inlet_temp_c;
        response.cooling_assessment.key_metrics.cooling_capacity_avg_kw = assessment.key_metrics.cooling_capacity_kw;
        response.cooling_assessment.key_metrics.heat_load_avg_kw = assessment.key_metrics.heat_load_kw;
        response.cooling_assessment.key_metrics.pue_avg = assessment.key_metrics.pue_avg;
        response.cooling_assessment.key_metrics.max_humidity_percent = assessment.key_metrics.max_humidity_percent;
        response.cooling_assessment.key_metrics.min_wetbulb_depression_c = assessment.key_metrics.min_wetbulb_depression_c;
        
        response.cooling_assessment.engineering_notes = assessment.engineering_notes;
        response.cooling_assessment.recommendations = assessment.recommendations;
        
        response.cooling_assessment.hourly_failures = new SimulationResponse.HourlyFailures();
        response.cooling_assessment.hourly_failures.temperature_violations = state.getTemperatureViolations();
        response.cooling_assessment.hourly_failures.humidity_violations = state.getHumidityViolations();
        response.cooling_assessment.hourly_failures.capacity_violations = state.getCapacityViolations();
        response.cooling_assessment.hourly_failures.critical_hours = state.getCriticalHours();
        
        response.hourly_data = state.getHourlyData();
        
        return response;
    }
    
    public SimulationRequest createDefaultConfig() {
        SimulationRequest config = new SimulationRequest();
        
        config.simulation = new SimulationRequest.SimulationConfig();
        config.simulation.time_horizon_hours = 8760;
        config.simulation.time_step_seconds = 3600;
        
        config.it_load = new SimulationRequest.ITLoadConfig();
        config.it_load.total_it_power_kw = 100.0;
        config.it_load.servers = 100;
        config.it_load.racks = 10;
        config.it_load.power_utilization_model = "linear";
        
        config.cooling_system = new SimulationRequest.CoolingSystemConfig();
        config.cooling_system.type = "direct_evaporative";
        config.cooling_system.max_airflow_cfm = 10000.0;
        config.cooling_system.fan_efficiency = 0.6;
        config.cooling_system.saturation_effectiveness = 85.0;
        config.cooling_system.face_velocity_ms = 2.0;
        config.cooling_system.wetting_efficiency = 95.0;
        config.cooling_system.media_type = "cellulose";
        config.cooling_system.has_dx_backup = true;
        config.cooling_system.dx_cop = 3.5;
        config.cooling_system.water_source = "municipal";
        config.cooling_system.cycles_of_concentration = 5.0;
        config.cooling_system.tank_volume_l = 5000.0;
        config.cooling_system.refill_rate_l_per_day = 0.0;
        config.cooling_system.low_water_cutoff_percent = 10.0;
        
        config.rates = new SimulationRequest.RatesConfig();
        config.rates.electricity_usd_per_kwh = 0.12;
        config.rates.water_usd_per_liter = 0.001;
        
        config.emissions = new SimulationRequest.EmissionsConfig();
        config.emissions.grid_kgco2_per_kwh = 0.45;
        
        config.constraints = new SimulationRequest.ConstraintsConfig();
        config.constraints.max_inlet_temp_c = 27.0;
        config.constraints.max_relative_humidity = 80.0;
        config.constraints.max_pue = 1.5;
        
        return config;
    }
    
    public static class EvapCoolingResult {
        public double supplyTempC;
        public double supplyHumidity;
        public double airflowCFM;
        public double coolingCapacityKW;
        public double waterEvaporationLph;
    }
    
    public static class WeatherPoint {
        public double dryBulbTempC;
        public double relativeHumidity;
        public double pressure;
        public double windSpeed;
        
        public WeatherPoint(double dryBulbTempC, double relativeHumidity, double pressure, double windSpeed) {
            this.dryBulbTempC = dryBulbTempC;
            this.relativeHumidity = relativeHumidity;
            this.pressure = pressure;
            this.windSpeed = windSpeed;
        }
    }
}
