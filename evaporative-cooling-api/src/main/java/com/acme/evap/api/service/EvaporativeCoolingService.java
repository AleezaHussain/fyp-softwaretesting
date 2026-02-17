package com.acme.evap.api.service;

import com.acme.evap.api.dto.SimulationRequest;
import com.acme.evap.api.dto.SimulationResponse;
import com.acme.evap.api.service.WeatherCsvParser;
import com.acme.evap.CoolingAdequacyAssessment;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Core service for evaporative cooling simulations
 * Integrates with existing Java physics model and cooling adequacy assessment
 */
@Service
public class EvaporativeCoolingService {
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WeatherCsvParser weatherParser = new WeatherCsvParser();
    
    /**
     * Calculate dynamic DX COP based on outdoor temperature
     * COP degrades as outdoor temperature increases (condenser has to work harder)
     * 
     * Formula: COP = Nominal_COP * (1 - degradation_factor * (T_outdoor - T_reference))
     * 
     * @param outdoorTempC Outdoor dry bulb temperature in Celsius
     * @param nominalCOP Base COP at reference conditions (typically 3.5)
     * @return Dynamic COP adjusted for outdoor temperature
     */
    private double calculateDynamicDxCop(double outdoorTempC, double nominalCOP) {
        // Reference temperature (25°C / 77°F) - standard rating condition
        final double T_REFERENCE = 25.0;
        
        // Degradation factor: COP drops ~2-3% per degree C above reference
        // Using 2.5% per degree C as a reasonable middle ground
        final double DEGRADATION_FACTOR = 0.025;
        
        // Calculate temperature difference from reference
        double tempDelta = outdoorTempC - T_REFERENCE;
        
        // Calculate degraded COP
        double dynamicCOP = nominalCOP * (1.0 - DEGRADATION_FACTOR * tempDelta);
        
        // Apply realistic bounds:
        // - Minimum COP: 2.0 (even in extreme heat, system maintains some efficiency)
        // - Maximum COP: 5.0 (in cold weather, COP can improve but has practical limits)
        dynamicCOP = Math.max(2.0, Math.min(5.0, dynamicCOP));
        
        return dynamicCOP;
    }
    
    /**
     * Parse configuration JSON from multipart request
     */
    public SimulationRequest parseConfigJson(String configJson) throws IOException {
        return objectMapper.readValue(configJson, SimulationRequest.class);
    }
    
    /**
     * Run complete 8760-hour evaporative cooling simulation
     */
    public SimulationResponse runSimulation(MultipartFile weatherFile, SimulationRequest request) 
            throws IOException {
        
        // Validate frontend configuration
        validateSimulationRequest(request);
        
        // Log frontend configuration for debugging
        System.out.println("🔧 FRONTEND CONFIGURATION RECEIVED:");
        System.out.println("  IT Load: " + request.it_load.total_it_power_kw + " kW, " + 
                          request.it_load.servers + " servers, " + request.it_load.racks + " racks");
        System.out.println("  Cooling Type: " + request.cooling_system.type);
        System.out.println("  Max Airflow: " + request.cooling_system.max_airflow_cfm + " CFM");
        System.out.println("  Fan Efficiency: " + (request.cooling_system.fan_efficiency * 100) + "%");
        System.out.println("  Saturation Effectiveness: " + request.cooling_system.saturation_effectiveness + "%");
        System.out.println("  Wetting Efficiency: " + request.cooling_system.wetting_efficiency + "%");
        System.out.println("  Face Velocity: " + request.cooling_system.face_velocity_ms + " m/s");
        System.out.println("  DX Backup: " + request.cooling_system.has_dx_backup + " (COP: " + request.cooling_system.dx_cop + ")");
        System.out.println("  Water Source: " + request.cooling_system.water_source);
        System.out.println("  Cycles of Concentration: " + request.cooling_system.cycles_of_concentration);
        System.out.println("  Electricity Rate: $" + request.rates.electricity_usd_per_kwh + "/kWh");
        System.out.println("  Water Rate: $" + request.rates.water_usd_per_liter + "/L");
        System.out.println("  Grid Emissions: " + request.emissions.grid_kgco2_per_kwh + " kg CO2/kWh");
        System.out.println("  Power Model: " + request.it_load.power_utilization_model);
        System.out.println();
        
        // Parse weather CSV file
        List<WeatherPoint> weatherData = weatherParser.parseWeatherCsv(weatherFile);
        
        // Validate weather data (should be 8760 hours)
        if (weatherData.size() != request.simulation.time_horizon_hours) {
            throw new IllegalArgumentException(
                String.format("Weather data contains %d hours, expected %d hours", 
                             weatherData.size(), request.simulation.time_horizon_hours));
        }
        
        // Initialize simulation state
        SimulationState state = new SimulationState();
        
        // Run hourly simulation loop
        for (int hour = 0; hour < weatherData.size(); hour++) {
            WeatherPoint weather = weatherData.get(hour);
            runHourlySimulation(hour, weather, request, state);
        }
        
        // Perform cooling adequacy assessment
        CoolingAdequacyAssessment.Assessment assessment = performCoolingAssessment(state, request);
        
        // Build response
        return buildSimulationResponse(state, assessment, request);
    }
    
    /**
     * Validate frontend simulation request parameters
     */
    private void validateSimulationRequest(SimulationRequest request) {
        List<String> errors = new ArrayList<>();
        
        // Validate IT load configuration
        if (request.it_load.total_it_power_kw <= 0) {
            errors.add("Total IT power must be greater than 0 kW");
        }
        if (request.it_load.servers <= 0) {
            errors.add("Number of servers must be greater than 0");
        }
        if (request.it_load.racks <= 0) {
            errors.add("Number of racks must be greater than 0");
        }
        
        // Validate cooling system configuration
        if (request.cooling_system.max_airflow_cfm <= 0) {
            errors.add("Maximum airflow capacity must be greater than 0 CFM");
        }
        if (request.cooling_system.fan_efficiency <= 0 || request.cooling_system.fan_efficiency > 1.0) {
            errors.add("Fan efficiency must be between 0 and 1.0 (0-100%)");
        }
        if (request.cooling_system.saturation_effectiveness <= 0 || request.cooling_system.saturation_effectiveness > 100) {
            errors.add("Saturation effectiveness must be between 0 and 100%");
        }
        if (request.cooling_system.wetting_efficiency <= 0 || request.cooling_system.wetting_efficiency > 100) {
            errors.add("Wetting efficiency must be between 0 and 100%");
        }
        if (request.cooling_system.face_velocity_ms <= 0 || request.cooling_system.face_velocity_ms > 5.0) {
            errors.add("Face velocity must be between 0 and 5.0 m/s");
        }
        
        // Validate rates
        if (request.rates.electricity_usd_per_kwh <= 0) {
            errors.add("Electricity rate must be greater than 0 $/kWh");
        }
        if (request.rates.water_usd_per_liter < 0) {
            errors.add("Water rate must be 0 or greater $/L");
        }
        
        // Validate emissions
        if (request.emissions.grid_kgco2_per_kwh < 0) {
            errors.add("Grid emissions factor must be 0 or greater kg CO2/kWh");
        }
        
        if (!errors.isEmpty()) {
            throw new IllegalArgumentException("Configuration validation failed: " + String.join("; ", errors));
        }
    }
    
    /**
     * Run simulation for single hour
     */
    private void runHourlySimulation(int hour, WeatherPoint weather, 
                                   SimulationRequest request, SimulationState state) {
        
        // Calculate IT load for this hour using frontend server configuration
        double itLoadKW = calculateITLoad(hour, request.it_load);
        
        // Calculate auxiliary loads using realistic efficiency values
        double upsEfficiency = 0.96; // 96% UPS efficiency (could be made configurable)
        double pduLossFraction = 0.02; // 2% PDU losses (could be made configurable)
        
        double upsLossKW = itLoadKW * (1.0 / upsEfficiency - 1.0);
        double pduLossKW = itLoadKW * pduLossFraction;
        double totalHeatLoadKW = itLoadKW + upsLossKW + pduLossKW;
        
        // Determine cooling mode based on ambient conditions and frontend config
        String coolingMode = determineCoolingMode(weather, request.cooling_system);
        
        // Calculate evaporative cooling performance using frontend parameters
        EvapCoolingResult evapResult = calculateEvaporativeCooling(
            weather, totalHeatLoadKW, request.cooling_system, coolingMode);
        
        // Calculate fan power using frontend fan efficiency
        double fanPowerKW = calculateFanPower(evapResult.airflowCFM, request.cooling_system);
        
        // Calculate pump power as percentage of cooling load (configurable)
        double pumpPowerFraction = 0.02; // 2% of cooling load (could be made configurable)
        double pumpPowerKW = evapResult.coolingCapacityKW * pumpPowerFraction;
        
        // Calculate DX backup power if enabled and needed
        double dxPowerKW = 0.0;
        if (request.cooling_system.has_dx_backup && evapResult.coolingCapacityKW < totalHeatLoadKW) {
            double dxCoolingKW = totalHeatLoadKW - evapResult.coolingCapacityKW;
            
            // 🔥 DYNAMIC COP: Calculate COP based on current outdoor temperature
            double dynamicCOP = calculateDynamicDxCop(
                weather.dryBulbTempC, 
                request.cooling_system.dx_cop  // Use frontend nominal COP as baseline
            );
            
            dxPowerKW = dxCoolingKW / dynamicCOP;
            
            // Log DX backup usage for debugging (only first few times to avoid spam)
            if (hour < 5 || hour % 1000 == 0) {
                System.out.println(String.format(
                    "  Hour %d: DX Backup Active - Outdoor: %.1f°C, Nominal COP: %.2f, Dynamic COP: %.2f, DX Load: %.1f kW, DX Power: %.1f kW",
                    hour, weather.dryBulbTempC, request.cooling_system.dx_cop, dynamicCOP, dxCoolingKW, dxPowerKW
                ));
            }
        }
        
        // Calculate total electrical power
        double totalElectricalKW = itLoadKW + upsLossKW + pduLossKW + fanPowerKW + pumpPowerKW + dxPowerKW;
        
        // Calculate PUE
        double pue = totalElectricalKW / itLoadKW;
        
        // Estimate inlet temperature (supply + server delta-T based on IT load density)
        double serverDeltaT = (itLoadKW / request.it_load.servers) * 0.02; // More realistic delta-T calculation
        double inletTempC = evapResult.supplyTempC + serverDeltaT;
        
        // Update simulation state
        state.addHourlyData(hour, weather, itLoadKW, totalElectricalKW, fanPowerKW, 
                           dxPowerKW, pumpPowerKW, evapResult, pue, inletTempC, coolingMode);
    }
    
    /**
     * Calculate IT load based on time and frontend configuration
     */
    private double calculateITLoad(int hour, SimulationRequest.ITLoadConfig config) {
        // Base IT load from frontend configuration
        double baseITLoadKW = config.total_it_power_kw;
        
        // Apply power utilization model from frontend
        if ("linear".equals(config.power_utilization_model)) {
            // Flat load - use base value directly
            return baseITLoadKW;
        } else if ("nonlinear".equals(config.power_utilization_model)) {
            // Simple diurnal pattern - higher during business hours
            int hourOfDay = hour % 24;
            double utilizationFactor;
            
            if (hourOfDay >= 8 && hourOfDay <= 18) {
                // Business hours: 90-100% utilization
                utilizationFactor = 0.90 + 0.10 * Math.sin(Math.PI * (hourOfDay - 8) / 10.0);
            } else {
                // Off hours: 60-80% utilization
                utilizationFactor = 0.60 + 0.20 * Math.sin(Math.PI * (hourOfDay + 4) / 12.0);
            }
            
            return baseITLoadKW * utilizationFactor;
        }
        
        // Default to linear if unknown model
        return baseITLoadKW;
    }
    
    /**
     * Determine optimal cooling mode based on ambient conditions and frontend config
     */
    private String determineCoolingMode(WeatherPoint weather, 
                                      SimulationRequest.CoolingSystemConfig config) {
        
        // Use frontend cooling system type as primary determinant
        if ("direct_evaporative".equals(config.type)) {
            return "DEC";
        } else if ("indirect_evaporative".equals(config.type)) {
            return "IEC";
        } else if ("hybrid".equals(config.type)) {
            // Intelligent mode switching based on ambient conditions
            double wetBulbTempC = calculateWetBulbTemp(weather.dryBulbTempC, weather.relativeHumidity);
            double wetBulbDepression = weather.dryBulbTempC - wetBulbTempC;
            
            // Use DEC when conditions are favorable (low humidity, good wet-bulb depression)
            if (weather.relativeHumidity < 60 && wetBulbDepression > 8) {
                return "DEC";
            } 
            // Use IEC when humidity is high but some evaporative cooling is still possible
            else if (weather.relativeHumidity < 85 && wetBulbDepression > 3) {
                return "IEC";
            }
            // Fall back to DX when evaporative cooling is ineffective
            else if (config.has_dx_backup) {
                return "DX_ASSIST";
            }
            // Default to IEC if no DX backup
            else {
                return "IEC";
            }
        }
        
        return "DEC"; // default fallback
    }
    
    /**
     * Calculate evaporative cooling performance
     */
    private EvapCoolingResult calculateEvaporativeCooling(WeatherPoint weather, 
                                                        double heatLoadKW,
                                                        SimulationRequest.CoolingSystemConfig config,
                                                        String mode) {
        
        EvapCoolingResult result = new EvapCoolingResult();
        
        // Use frontend effectiveness values
        double effectiveness = config.saturation_effectiveness / 100.0;
        double wettingEfficiency = config.wetting_efficiency / 100.0;
        double wetBulbTempC = calculateWetBulbTemp(weather.dryBulbTempC, weather.relativeHumidity);
        
        // Apply wetting efficiency to the effectiveness
        double actualEffectiveness = effectiveness * wettingEfficiency;
        
        if ("DEC".equals(mode)) {
            // Direct evaporative cooling
            result.supplyTempC = weather.dryBulbTempC - actualEffectiveness * (weather.dryBulbTempC - wetBulbTempC);
            result.supplyHumidity = Math.min(95.0, weather.relativeHumidity + (actualEffectiveness * 25.0)); // Adds humidity based on effectiveness
        } else if ("IEC".equals(mode)) {
            // Indirect evaporative cooling - reduced effectiveness but no humidity addition
            result.supplyTempC = weather.dryBulbTempC - (actualEffectiveness * 0.7) * (weather.dryBulbTempC - wetBulbTempC);
            result.supplyHumidity = weather.relativeHumidity; // No humidity addition
        } else if ("DX_ASSIST".equals(mode)) {
            // Evaporative pre-cooling + DX assist - use best available evaporative cooling
            double evapSupplyTemp = weather.dryBulbTempC - (actualEffectiveness * 0.8) * (weather.dryBulbTempC - wetBulbTempC);
            result.supplyTempC = Math.min(evapSupplyTemp, 22.0); // DX can achieve lower temperatures
            result.supplyHumidity = weather.relativeHumidity; // DX maintains humidity
        }
        
        // Calculate required airflow using frontend face velocity
        double faceVelocityMs = config.face_velocity_ms;
        double tempRise = 10.0; // Temperature rise through IT equipment
        double airDensity = 1.2; // kg/m³
        double specificHeat = 1.006; // kJ/kg·K
        
        // Calculate airflow based on heat load and temperature rise
        double requiredAirflowM3s = (heatLoadKW * 3600) / (airDensity * specificHeat * tempRise);
        double requiredAirflowCFM = requiredAirflowM3s * 2.119; // Convert m³/s to CFM
        
        // Limit by maximum airflow capacity from frontend
        result.airflowCFM = Math.min(requiredAirflowCFM, config.max_airflow_cfm);
        
        // Calculate actual cooling capacity based on limited airflow
        double actualAirflowM3s = result.airflowCFM / 2.119;
        result.coolingCapacityKW = actualAirflowM3s * airDensity * specificHeat * tempRise / 3600;
        
        // Calculate water consumption (evaporation) - affected by cycles of concentration
        double latentHeat = 2260; // kJ/kg
        double baseEvaporationLph = (result.coolingCapacityKW * 3600) / latentHeat;
        
        // Account for cycles of concentration from frontend
        double cyclesOfConcentration = config.cycles_of_concentration;
        double blowdownFraction = 1.0 / (cyclesOfConcentration - 1.0);
        result.waterEvaporationLph = baseEvaporationLph * (1.0 + blowdownFraction);
        
        return result;
    }
    
    /**
     * Calculate fan power based on airflow and frontend fan efficiency
     */
    private double calculateFanPower(double airflowCFM, SimulationRequest.CoolingSystemConfig config) {
        // Use frontend fan efficiency
        double airflowM3s = airflowCFM / 2.119;
        double pressureDrop = 500; // Pa (typical for evaporative cooling system)
        double fanEfficiency = config.fan_efficiency; // Already in decimal form from frontend
        
        return (airflowM3s * pressureDrop) / (1000 * fanEfficiency); // kW
    }
    
    /**
     * Simple wet bulb temperature calculation
     */
    private double calculateWetBulbTemp(double dryBulbC, double relativeHumidity) {
        // Simplified approximation - can be replaced with more accurate psychrometric calculations
        return dryBulbC * Math.atan(0.151977 * Math.sqrt(relativeHumidity + 8.313659)) +
               Math.atan(dryBulbC + relativeHumidity) - Math.atan(relativeHumidity - 1.676331) +
               0.00391838 * Math.pow(relativeHumidity, 1.5) * Math.atan(0.023101 * relativeHumidity) - 4.686035;
    }
    
    /**
     * Perform cooling adequacy assessment using existing system
     */
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
    
    /**
     * Build final simulation response
     */
    private SimulationResponse buildSimulationResponse(SimulationState state, 
                                                     CoolingAdequacyAssessment.Assessment assessment,
                                                     SimulationRequest request) {
        
        SimulationResponse response = new SimulationResponse();
        response.status = "success";
        response.message = "Simulation completed successfully";
        
        // Build results
        response.results = new SimulationResponse.SimulationResults();
        
        // Energy results
        response.results.energy = new SimulationResponse.EnergyResults();
        response.results.energy.electricity_kwh_total = state.getTotalElectricityKWh();
        response.results.energy.fan_kwh = state.getTotalFanKWh();
        response.results.energy.dx_kwh = state.getTotalDXKWh();
        response.results.energy.pump_kwh = state.getTotalPumpKWh();
        response.results.energy.it_kwh = state.getTotalITKWh();
        response.results.energy.auxiliary_kwh = state.getTotalAuxiliaryKWh();
        
        // Water results
        response.results.water = new SimulationResponse.WaterResults();
        response.results.water.water_liters_total = state.getTotalWaterLiters();
        response.results.water.evaporation_liters = state.getTotalEvaporationLiters();
        response.results.water.blowdown_liters = state.getTotalBlowdownLiters();
        response.results.water.makeup_liters = state.getTotalMakeupLiters();
        
        // Cost results
        response.results.cost = new SimulationResponse.CostResults();
        response.results.cost.electricity_usd = state.getTotalElectricityKWh() * request.rates.electricity_usd_per_kwh;
        response.results.cost.water_usd = state.getTotalWaterLiters() * request.rates.water_usd_per_liter;
        response.results.cost.total_energy_cost_usd = response.results.cost.electricity_usd + response.results.cost.water_usd;
        
        // OPEX results
        response.results.opex = new SimulationResponse.OpexResults();
        response.results.opex.opex_total_usd = response.results.cost.total_energy_cost_usd;
        response.results.opex.opex_per_kwh_it = response.results.opex.opex_total_usd / state.getTotalITKWh();
        response.results.opex.opex_per_server_annual = response.results.opex.opex_total_usd / request.it_load.servers;
        
        // Emissions results
        response.results.emissions = new SimulationResponse.EmissionsResults();
        response.results.emissions.co2_kg_total = state.getTotalElectricityKWh() * request.emissions.grid_kgco2_per_kwh;
        response.results.emissions.co2_kg_per_kwh_it = response.results.emissions.co2_kg_total / state.getTotalITKWh();
        response.results.emissions.co2_kg_per_server_annual = response.results.emissions.co2_kg_total / request.it_load.servers;
        
        // Performance results
        response.results.performance = new SimulationResponse.PerformanceResults();
        response.results.performance.pue_average = state.getAveragePUE();
        response.results.performance.pue_max = state.getMaxPUE();
        response.results.performance.wue_average = state.getTotalWaterLiters() / state.getTotalITKWh();
        response.results.performance.cue_average = response.results.emissions.co2_kg_per_kwh_it;
        response.results.performance.availability_percent = state.getAvailabilityPercent();
        response.results.performance.total_simulation_hours = request.simulation.time_horizon_hours;
        response.results.performance.cooling_failure_hours = state.getCoolingFailureHours();
        
        // Cooling assessment
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
        
        return response;
    }
    
    /**
     * Create default configuration template
     */
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
    
    // Helper classes
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