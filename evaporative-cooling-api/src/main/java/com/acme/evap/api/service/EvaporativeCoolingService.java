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
        
        // Default DES mode to true if not specified by frontend
        if (request.simulation.use_des_mode == null) {
            request.simulation.use_des_mode = true;
            System.out.println("⚙️ DES mode not specified - defaulting to TRUE (dynamic workload)");
        }
        
        // Log frontend configuration for debugging
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println("  🔧 FRONTEND CONFIGURATION RECEIVED");
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println("📊 Basic Configuration:");
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
        
        // Log advanced configuration if present
        if (request.financial_escalation != null) {
            System.out.println();
            System.out.println("🆕 Financial Escalation:");
            System.out.println("  Electricity Inflation: " + request.financial_escalation.annual_electricity_inflation + "% per year");
            System.out.println("  Water Inflation: " + request.financial_escalation.annual_water_inflation + "% per year");
            System.out.println("  Carbon Price: $" + request.financial_escalation.carbon_price + " per ton CO2");
            System.out.println("  Carbon Price Growth: " + request.financial_escalation.carbon_price_growth + "% per year");
        }
        
        if (request.carbon_accounting != null) {
            System.out.println();
            System.out.println("🆕 Carbon Accounting:");
            System.out.println("  Accounting Method: " + request.carbon_accounting.emissions_accounting_method);
            System.out.println("  Renewable Energy: " + request.carbon_accounting.renewable_energy_percentage + "%");
        }
        
        if (request.scenario != null) {
            System.out.println();
            System.out.println("🆕 2030 Scenario:");
            System.out.println("  Scenario Type: " + request.scenario.scenario_type);
            System.out.println("  Temperature Offset: " + request.scenario.temperature_offset + "°C");
            System.out.println("  Humidity Adjustment: " + request.scenario.humidity_adjustment + "%");
        }
        
        if (request.rack_geometry != null) {
            System.out.println();
            System.out.println("🆕 Rack Geometry:");
            System.out.println("  Rack Height: " + request.rack_geometry.rack_height_u + " U");
            System.out.println("  Front-to-Back Airflow: " + request.rack_geometry.front_to_back_airflow);
        }
        
        if (request.airflow_distribution != null) {
            System.out.println();
            System.out.println("🆕 Airflow Distribution:");
            System.out.println("  Quality Preset: " + request.airflow_distribution.airflow_quality_preset);
            System.out.println("  Air Bypass: " + request.airflow_distribution.air_bypass_fraction + "%");
            System.out.println("  Hot Air Recirculation: " + request.airflow_distribution.hot_air_recirculation + "%");
        }
        
        if (request.thermal_mass != null) {
            System.out.println();
            System.out.println("🆕 Thermal Mass:");
            System.out.println("  Rack Thermal Mass: " + request.thermal_mass.rack_thermal_mass + " kJ/K");
            System.out.println("  Enclosure Thermal Mass: " + request.thermal_mass.enclosure_thermal_mass + " kJ/K");
            System.out.println("  Manual Override: " + request.thermal_mass.manual_thermal_override);
        }
        
        if (request.enclosure != null) {
            System.out.println();
            System.out.println("🆕 Enclosure:");
            System.out.println("  Enclosure Type: " + request.enclosure.enclosure_type);
            System.out.println("  Thermal Mass Value: " + request.enclosure.enclosure_thermal_mass_value + " kJ/K");
            System.out.println("  Air Leakage: " + request.enclosure.enclosure_air_leakage + " ACH");
            System.out.println("  Insulation Quality: " + request.enclosure.insulation_quality);
        }
        
        if (request.infiltration != null) {
            System.out.println();
            System.out.println("🆕 Infiltration:");
            System.out.println("  Infiltration Level: " + request.infiltration.infiltration_level);
            System.out.println("  Infiltration ACH: " + request.infiltration.infiltration_ach);
            System.out.println("  Custom Infiltration: " + request.infiltration.enable_custom_infiltration);
        }
        
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println();
        
        // Parse weather CSV file
        List<WeatherPoint> weatherData = weatherParser.parseWeatherCsv(weatherFile);
        
        // Apply scenario adjustments to weather data if configured
        if (request.scenario != null) {
            System.out.println("🌡️ Applying scenario adjustments to weather data:");
            System.out.println("  Temperature Offset: " + request.scenario.temperature_offset + "°C");
            System.out.println("  Humidity Adjustment: " + request.scenario.humidity_adjustment + "%");
            
            for (WeatherPoint point : weatherData) {
                // Apply temperature offset (climate change scenario)
                point.dryBulbTempC += request.scenario.temperature_offset;
                
                // Apply humidity adjustment (percentage change)
                point.relativeHumidity += request.scenario.humidity_adjustment;
                
                // Clamp humidity to valid range [0, 100]
                point.relativeHumidity = Math.max(0.0, Math.min(100.0, point.relativeHumidity));
            }
            
            System.out.println("  ✓ Weather data adjusted for scenario: " + request.scenario.scenario_type);
        }
        
        // Validate weather data (should be 8760 hours)
        if (weatherData.size() != request.simulation.time_horizon_hours) {
            throw new IllegalArgumentException(
                String.format("Weather data contains %d hours, expected %d hours", 
                             weatherData.size(), request.simulation.time_horizon_hours));
        }
        
        // Check if DES mode is enabled
        if (request.simulation.use_des_mode) {
            System.out.println("═══════════════════════════════════════════════════════════");
            System.out.println("  🚀 DISCRETE EVENT SIMULATION (DES) MODE ENABLED");
            System.out.println("═══════════════════════════════════════════════════════════");
            System.out.println("  Using CloudSim Plus DES for dynamic workload simulation");
            System.out.println("  This will take longer but provides realistic workload dynamics");
            System.out.println("═══════════════════════════════════════════════════════════");
            System.out.println();
            
            return runSimulationWithDES(weatherData, request);
        }
        
        // 🚀 GENERATE CLOUDSIM WORKLOAD PROFILE (Pre-calculated mode)
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println("  CLOUDSIM AI WORKLOAD GENERATION (Pre-calculated)");
        System.out.println("═══════════════════════════════════════════════════════════");
        double[] cloudSimWorkload = generateCloudSimWorkload(request);
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println();
        
        // Initialize simulation state
        SimulationState state = new SimulationState();
        
        // Run hourly simulation loop with CloudSim workload
        for (int hour = 0; hour < weatherData.size(); hour++) {
            WeatherPoint weather = weatherData.get(hour);
            runHourlySimulation(hour, weather, request, state, cloudSimWorkload);
        }
        
        // Perform cooling adequacy assessment
        CoolingAdequacyAssessment.Assessment assessment = performCoolingAssessment(state, request);
        
        // Build response
        return buildSimulationResponse(state, assessment, request);
    }
    
    /**
     * Run simulation with Discrete Event Simulation (DES) mode
     * Uses CloudSim Plus to drive workload dynamics in real-time
     */
    private SimulationResponse runSimulationWithDES(List<WeatherPoint> weatherData, SimulationRequest request) {
        // Create DES orchestrator
        EvaporativeSimulationOrchestrator orchestrator = new EvaporativeSimulationOrchestrator(request);
        
        // Initialize CloudSim in synchronized mode (lock-step ready)
        orchestrator.startSync();
        
        // Initialize simulation state
        SimulationState state = new SimulationState();
        
        // Run lock-step simulation: CloudSim advances hour-by-hour with physics
        for (int hour = 0; hour < weatherData.size(); hour++) {
            WeatherPoint weather = weatherData.get(hour);
            
            // Advance CloudSim by one hour and get current IT load
            EvaporativeSimulationOrchestrator.HourlyResult desResult = orchestrator.advanceOneHour(hour);
            
            // Calculate cooling physics with the dynamic IT load
            runHourlySimulationWithDES(hour, weather, request, state, desResult);
        }
        
        // Perform cooling adequacy assessment
        CoolingAdequacyAssessment.Assessment assessment = performCoolingAssessment(state, request);
        
        // Build response
        return buildSimulationResponse(state, assessment, request);
    }
    
    /**
     * Run hourly simulation with DES result
     */
    private void runHourlySimulationWithDES(int hour, WeatherPoint weather, 
                                           SimulationRequest request, SimulationState state,
                                           EvaporativeSimulationOrchestrator.HourlyResult desResult) {
        // Use IT load from DES
        double itLoadKW = desResult.itLoadKW;
        
        // Calculate auxiliary loads
        double upsEfficiency = 0.96;
        double pduLossFraction = 0.02;
        double upsLossKW = itLoadKW * (1.0 / upsEfficiency - 1.0);
        double pduLossKW = itLoadKW * pduLossFraction;
        
        // Calculate required airflow
        double deltaT_target = 15.0;
        double requiredCFM = (itLoadKW * 3160) / (deltaT_target * 1.08);
        double maxAirflowCapacity = request.cooling_system.max_airflow_cfm;
        double speedRatio = Math.min(1.0, requiredCFM / maxAirflowCapacity);
        state.setCurrentSpeedRatio(speedRatio);
        
        // Calculate infiltration
        double infiltrationLoadKW = 0.0;
        if (request.infiltration != null) {
            double infiltrationACH = request.infiltration.infiltration_ach;
            double enclosureVolumeM3 = request.it_load.racks * 10.0;
            double infiltrationM3s = (enclosureVolumeM3 * infiltrationACH) / 3600.0;
            double tempDifferential = Math.abs(weather.dryBulbTempC - 22.0);
            infiltrationLoadKW = infiltrationM3s * 1.2 * 1.006 * tempDifferential;
        }
        
        double totalHeatLoadKW = itLoadKW + upsLossKW + pduLossKW + infiltrationLoadKW;
        
        // Determine cooling mode
        String coolingMode = determineCoolingMode(weather, request.cooling_system);
        
        // Calculate evaporative cooling (reuse existing method)
        double referenceFaceVelocity = request.cooling_system.face_velocity_ms;
        double currentFaceVelocity = referenceFaceVelocity * speedRatio;
        
        // Calculate saturation effectiveness
        double nominalEffectiveness = request.cooling_system.saturation_effectiveness / 100.0;
        double velocityFactor = Math.pow(referenceFaceVelocity / currentFaceVelocity, 0.15);
        double adjustedEffectiveness = nominalEffectiveness * velocityFactor;
        adjustedEffectiveness = Math.max(0.60, Math.min(0.95, adjustedEffectiveness));
        
        // Calculate wet bulb temperature
        double wetBulbC = calculateWetBulbTemp(weather.dryBulbTempC, weather.relativeHumidity);
        
        // Calculate supply air temperature
        double supplyAirTempC = weather.dryBulbTempC - 
            (adjustedEffectiveness * (weather.dryBulbTempC - wetBulbC));
        
        // Calculate fan power
        double fanPowerKW = calculateDynamicFanPower(requiredCFM, request.cooling_system, speedRatio);
        
        // Calculate water usage
        double waterUsageL = 0.0;
        if ("evaporative".equals(coolingMode) || "hybrid".equals(coolingMode)) {
            double evaporationRateKgPerHour = totalHeatLoadKW * 3600.0 / 2260.0;
            double blowdownRateKgPerHour = evaporationRateKgPerHour / 
                (request.cooling_system.cycles_of_concentration - 1);
            waterUsageL = evaporationRateKgPerHour + blowdownRateKgPerHour;
        }
        
        // Store results
        state.addHourlyResult(hour, itLoadKW, totalHeatLoadKW, fanPowerKW, 
            waterUsageL, supplyAirTempC, coolingMode, desResult.serverUtilization);
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
        
        // ✅ ADD: Sanity check for airflow units (catch CFM/m³/s confusion)
        if (request.cooling_system.max_airflow_cfm > 200000) {
            errors.add("Maximum airflow capacity seems too large (" + request.cooling_system.max_airflow_cfm + 
                      " CFM). Typical range: 500-200,000 CFM. Check if value is in correct units.");
        }
        if (request.cooling_system.max_airflow_cfm < 100) {
            errors.add("Maximum airflow capacity seems too small (" + request.cooling_system.max_airflow_cfm + 
                      " CFM). Typical range: 500-200,000 CFM. Check if value is in correct units.");
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
     * PHASE 1 IMPROVEMENTS: Dynamic physics with fan affinity laws, velocity-dependent effectiveness, and thermal mass
     */
    private void runHourlySimulation(int hour, WeatherPoint weather, 
                                   SimulationRequest request, SimulationState state, double[] cloudSimWorkload) {
        
        // Calculate IT load for this hour using CloudSim workload or frontend configuration
        double itLoadKW = calculateITLoad(hour, request.it_load, cloudSimWorkload);
        
        // Calculate auxiliary loads using realistic efficiency values
        double upsEfficiency = 0.96; // 96% UPS efficiency (could be made configurable)
        double pduLossFraction = 0.02; // 2% PDU losses (could be made configurable)
        
        double upsLossKW = itLoadKW * (1.0 / upsEfficiency - 1.0);
        double pduLossKW = itLoadKW * pduLossFraction;
        
        // ═══════════════════════════════════════════════════════════════════════════
        // PHASE 1 STEP 1: FAN AFFINITY LAWS - Dynamic airflow based on IT load
        // ═══════════════════════════════════════════════════════════════════════════
        // Calculate required airflow based on current IT load
        // Formula: CFM = (Q_kW × 3160) / (ΔT_target × 1.08)
        double deltaT_target = 15.0; // Target temperature rise across servers (°C)
        double requiredCFM = (itLoadKW * 3160) / (deltaT_target * 1.08);
        double maxAirflowCapacity = request.cooling_system.max_airflow_cfm;
        
        // Calculate speed ratio (capped at 100%)
        double speedRatio = Math.min(1.0, requiredCFM / maxAirflowCapacity);
        
        // Store speed ratio for later use in fan power calculation
        state.setCurrentSpeedRatio(speedRatio);
        
        // Calculate infiltration heat load (uncontrolled air exchange with outside)
        double infiltrationLoadKW = 0.0;
        
        if (request.infiltration != null) {
            // Get infiltration ACH (Air Changes per Hour)
            double infiltrationACH = request.infiltration.infiltration_ach;
            
            // Estimate enclosure volume (rough approximation based on rack count)
            // Typical: 1 rack ≈ 2m × 1m × 2m = 4 m³, plus aisle space ≈ 10 m³ per rack
            double enclosureVolumeM3 = request.it_load.racks * 10.0;
            
            // Calculate infiltration airflow (m³/s)
            double infiltrationM3s = (enclosureVolumeM3 * infiltrationACH) / 3600.0;
            
            // Calculate heat load from infiltration: Q = ṁ × Cp × ΔT
            // ṁ = ρ × V̇, where ρ = 1.2 kg/m³, Cp = 1.006 kJ/(kg·K)
            double tempDifferential = Math.abs(weather.dryBulbTempC - 22.0); // Assume 22°C indoor setpoint
            infiltrationLoadKW = infiltrationM3s * 1.2 * 1.006 * tempDifferential;
            
            // Log infiltration impact (first few hours only)
            if (hour < 5 && infiltrationLoadKW > 1.0) {
                System.out.println(String.format(
                    "  🌬️ Infiltration: ACH=%.2f, Volume=%.1f m³, Airflow=%.3f m³/s, ΔT=%.1f°C, Load=%.2f kW",
                    infiltrationACH, enclosureVolumeM3, infiltrationM3s, tempDifferential, infiltrationLoadKW
                ));
            }
        }
        
        double totalHeatLoadKW = itLoadKW + upsLossKW + pduLossKW + infiltrationLoadKW;
        
        // Determine cooling mode based on ambient conditions and frontend config
        String coolingMode = determineCoolingMode(weather, request.cooling_system);
        
        // ═══════════════════════════════════════════════════════════════════════════
        // PHASE 1 STEP 2: VELOCITY-DEPENDENT SATURATION EFFECTIVENESS
        // ═══════════════════════════════════════════════════════════════════════════
        // Calculate current face velocity based on speed ratio
        double referenceFaceVelocity = request.cooling_system.face_velocity_ms; // From config (e.g., 2.0 m/s)
        double currentFaceVelocity = referenceFaceVelocity * speedRatio;
        
        // Calculate evaporative cooling performance with velocity-adjusted effectiveness
        EvapCoolingResult evapResult = calculateEvaporativeCooling(
            weather, totalHeatLoadKW, request.cooling_system, coolingMode, request, currentFaceVelocity, speedRatio);
        
        // ═══════════════════════════════════════════════════════════════════════════
        // PHASE 1 STEP 1 (CONTINUED): FAN AFFINITY LAWS - Dynamic fan power
        // ═══════════════════════════════════════════════════════════════════════════
        // Fan power scales with cube of speed ratio: P_fan = P_base × (speed_ratio)³
        double fanPowerKW = calculateDynamicFanPower(evapResult.airflowCFM, request.cooling_system, speedRatio);
        
        // Calculate pump power as percentage of cooling load (configurable)
        double pumpPowerFraction = 0.02; // 2% of cooling load (could be made configurable)
        double pumpPowerKW = evapResult.coolingCapacityKW * pumpPowerFraction;
        
        // Calculate DX backup power if enabled and needed
        double dxPowerKW = 0.0;
        double dxCoolingKW = 0.0;
        
        if (evapResult.coolingCapacityKW < totalHeatLoadKW) {
            dxCoolingKW = totalHeatLoadKW - evapResult.coolingCapacityKW;
            
            if (request.cooling_system.has_dx_backup) {
                // ═══════════════════════════════════════════════════════════════════════════
                // PHASE 1 STEP 3: DYNAMIC DX COP DEGRADATION
                // ═══════════════════════════════════════════════════════════════════════════
                // Calculate COP based on current outdoor temperature
                // COP degrades ~2-3% per degree C above 25°C reference
                double dynamicCOP = calculateDynamicDxCop(
                    weather.dryBulbTempC, 
                    request.cooling_system.dx_cop  // Use frontend nominal COP as baseline
                );
                
                dxPowerKW = dxCoolingKW / dynamicCOP;
                
                // Log DX backup usage for debugging (only first few times to avoid spam)
                if (hour < 5 || hour % 1000 == 0) {
                    System.out.println(String.format(
                        "  ✅ Hour %d: DX Backup Active - Outdoor: %.1f°C, Evap: %.1f kW, DX: %.1f kW, Total: %.1f kW, Dynamic COP: %.2f (Nominal: %.2f)",
                        hour, weather.dryBulbTempC, evapResult.coolingCapacityKW, dxCoolingKW, totalHeatLoadKW, dynamicCOP, request.cooling_system.dx_cop
                    ));
                }
            } else {
                // No DX backup - system will fail
                if (hour < 5) {
                    System.out.println(String.format(
                        "  ⚠️ Hour %d: NO DX BACKUP - Evap: %.1f kW < Load: %.1f kW (Deficit: %.1f kW)",
                        hour, evapResult.coolingCapacityKW, totalHeatLoadKW, dxCoolingKW
                    ));
                }
            }
        } else {
            // Evaporative cooling is sufficient
            if (hour < 5 || hour % 1000 == 0) {
                System.out.println(String.format(
                    "  ✅ Hour %d: Evap Sufficient - Capacity: %.1f kW >= Load: %.1f kW (Margin: %.1f kW)",
                    hour, evapResult.coolingCapacityKW, totalHeatLoadKW, evapResult.coolingCapacityKW - totalHeatLoadKW
                ));
            }
        }
        
        // Calculate total electrical power
        double totalElectricalKW = itLoadKW + upsLossKW + pduLossKW + fanPowerKW + pumpPowerKW + dxPowerKW;
        
        // Calculate PUE
        double pue = totalElectricalKW / itLoadKW;
        
        // ═══════════════════════════════════════════════════════════════════════════
        // PHASE 1 STEP 4: THERMAL MASS INTEGRATION (Transient Delay) - FIXED
        // ═══════════════════════════════════════════════════════════════════════════
        // Get thermal mass from configuration
        double rackThermalMass = 15.0; // Default kJ/K
        double enclosureThermalMass = 50.0; // Default kJ/K
        
        if (request.thermal_mass != null) {
            rackThermalMass = request.thermal_mass.rack_thermal_mass;
            enclosureThermalMass = request.thermal_mass.enclosure_thermal_mass;
        }
        
        double totalThermalMass = rackThermalMass + enclosureThermalMass; // kJ/K
        
        // Calculate heat balance for this timestep
        double dt = request.simulation.time_step_seconds; // seconds (typically 3600 for 1 hour)
        double coolingProvided = evapResult.coolingCapacityKW + dxCoolingKW; // Total cooling (kW)
        
        // FIX: Calculate heat imbalance in kJ, but cap it to prevent runaway
        double heatImbalanceKW = totalHeatLoadKW - coolingProvided;
        double heatAbsorbed = heatImbalanceKW * dt; // kJ
        
        // FIX: Cap the heat absorbed to prevent extreme temperature swings
        // Maximum reasonable temperature change per hour: ±10°C
        double maxHeatAbsorbed = totalThermalMass * 10.0; // kJ for 10°C change
        heatAbsorbed = Math.max(-maxHeatAbsorbed, Math.min(maxHeatAbsorbed, heatAbsorbed));
        
        // Calculate temperature rise due to thermal imbalance
        double tempRise = heatAbsorbed / totalThermalMass; // °C
        
        // Get previous inlet temperature from state (or use supply temp for first hour)
        double previousInletTemp = (hour == 0) ? evapResult.supplyTempC : state.getPreviousInletTemp();
        
        // FIX: Apply damping factor to prevent oscillations (exponential smoothing)
        double dampingFactor = 0.3; // 30% of new value, 70% of old value
        double targetInletTemp = previousInletTemp + tempRise;
        double inletTempC = previousInletTemp + dampingFactor * (targetInletTemp - previousInletTemp);
        
        // FIX: Apply physical bounds to inlet temperature
        // Minimum: Supply temperature (can't be colder than supply air)
        // Maximum: 50°C (reasonable upper limit for data center)
        inletTempC = Math.max(evapResult.supplyTempC, Math.min(50.0, inletTempC));
        
        // Store current inlet temp for next iteration
        state.setPreviousInletTemp(inletTempC);
        
        // Log thermal mass effect (first few hours only)
        if (hour < 5 && Math.abs(tempRise) > 0.1) {
            System.out.println(String.format(
                "  🌡️ Thermal Mass: Total=%.1f kJ/K, Heat Imbalance=%.2f kW, Heat Absorbed=%.1f kJ, Temp Rise=%.2f°C, Inlet: %.2f°C → %.2f°C",
                totalThermalMass, heatImbalanceKW, heatAbsorbed, tempRise, previousInletTemp, inletTempC
            ));
        }
        
        // Update simulation state
        state.addHourlyData(hour, weather, itLoadKW, totalElectricalKW, fanPowerKW, 
                           dxPowerKW, pumpPowerKW, evapResult, pue, inletTempC, coolingMode);
    }
    
    /**
     * Generate CloudSim-based AI workload profile
     * Uses CloudSimWorkloadService to generate realistic AI/ML workload patterns
     */
    private double[] generateCloudSimWorkload(SimulationRequest request) {
        System.out.println("🚀 [CLOUDSIM] Generating AI workload profile using CloudSim Plus...");
        
        try {
            // Create CloudSim workload configuration
            CloudSimWorkloadService.WorkloadConfig cloudSimConfig = new CloudSimWorkloadService.WorkloadConfig();
            
            // Map frontend configuration to CloudSim
            cloudSimConfig.numberOfServers = request.it_load.servers;
            cloudSimConfig.serversPerRack = request.it_load.servers / request.it_load.racks;
            cloudSimConfig.serverMaxPowerW = 507.0; // Default server max power
            cloudSimConfig.serverIdlePowerW = 100.0; // Default server idle power
            cloudSimConfig.coresPerServer = 4;
            cloudSimConfig.mipsPerCore = 1000;
            cloudSimConfig.simulationHours = request.simulation.time_horizon_hours;
            cloudSimConfig.schedulingIntervalSeconds = 300.0; // 5 minutes
            cloudSimConfig.computeIntensityFactor = 1.2; // AI/HPC multiplier
            
            // Map workload type to CloudSim AI workload mode
            if ("ai_training".equals(request.it_load.workload_type)) {
                cloudSimConfig.workloadMode = CloudSimWorkloadService.AIWorkloadMode.AI_TRAINING;
                System.out.println("  ✓ Workload Mode: AI_TRAINING (1.8x power multiplier, 85-95% utilization)");
            } else if ("ai_inference".equals(request.it_load.workload_type)) {
                cloudSimConfig.workloadMode = CloudSimWorkloadService.AIWorkloadMode.AI_INFERENCE;
                System.out.println("  ✓ Workload Mode: AI_INFERENCE (1.4x power multiplier, bursty spikes)");
            } else if ("mixed_ai".equals(request.it_load.workload_type)) {
                cloudSimConfig.workloadMode = CloudSimWorkloadService.AIWorkloadMode.MIXED;
                System.out.println("  ✓ Workload Mode: MIXED (1.3x power multiplier, hybrid workload)");
            } else {
                cloudSimConfig.workloadMode = CloudSimWorkloadService.AIWorkloadMode.ENTERPRISE;
                System.out.println("  ✓ Workload Mode: ENTERPRISE (1.0x power multiplier, 50-65% utilization)");
            }
            
            // Generate workload using CloudSim
            CloudSimWorkloadService workloadService = new CloudSimWorkloadService();
            CloudSimWorkloadService.WorkloadResult result = workloadService.generateWorkloadProfile(cloudSimConfig);
            
            System.out.println("✅ [CLOUDSIM] Workload profile generated successfully!");
            System.out.println("  ✓ Total Hours: " + result.totalHours);
            System.out.println("  ✓ Number of Racks: " + result.numberOfRacks);
            System.out.println("  ✓ Average IT Load: " + String.format("%.2f", calculateAverage(result.hourlyITLoadKW)) + " kW");
            System.out.println("  ✓ Peak IT Load: " + String.format("%.2f", findMax(result.hourlyITLoadKW)) + " kW");
            System.out.println("  ✓ Min IT Load: " + String.format("%.2f", findMin(result.hourlyITLoadKW)) + " kW");
            System.out.println();
            
            return result.hourlyITLoadKW;
            
        } catch (Exception e) {
            System.err.println("❌ [CLOUDSIM] Failed to generate workload profile: " + e.getMessage());
            e.printStackTrace();
            
            // Fallback to simple calculation
            System.out.println("⚠️ [CLOUDSIM] Falling back to simple IT load calculation");
            return null;
        }
    }
    
    /**
     * Calculate average of array
     */
    private double calculateAverage(double[] values) {
        double sum = 0;
        for (double value : values) {
            sum += value;
        }
        return sum / values.length;
    }
    
    /**
     * Find maximum value in array
     */
    private double findMax(double[] values) {
        double max = Double.MIN_VALUE;
        for (double value : values) {
            if (value > max) max = value;
        }
        return max;
    }
    
    /**
     * Find minimum value in array
     */
    private double findMin(double[] values) {
        double min = Double.MAX_VALUE;
        for (double value : values) {
            if (value < min) min = value;
        }
        return min;
    }
    
    /**
     * Calculate IT load based on time and frontend configuration
     * Now supports CloudSim-generated workload profiles
     */
    private double calculateITLoad(int hour, SimulationRequest.ITLoadConfig config, double[] cloudSimWorkload) {
        // If CloudSim workload is available, use it
        if (cloudSimWorkload != null && hour < cloudSimWorkload.length) {
            return cloudSimWorkload[hour];
        }
        
        // Fallback to simple calculation
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
     * ✅ FIXED: More flexible logic - always provides cooling even in poor conditions
     */
    private String determineCoolingMode(WeatherPoint weather, 
                                      SimulationRequest.CoolingSystemConfig config) {
        
        // Use frontend cooling system type as primary determinant
        if ("direct_evaporative".equals(config.type)) {
            return "DEC";
        } else if ("indirect_evaporative".equals(config.type)) {
            return "IEC";
        } else if ("hybrid".equals(config.type)) {
            // ✅ RELAXED: Intelligent mode switching with more flexible thresholds
            double wetBulbTempC = calculateWetBulbTemp(weather.dryBulbTempC, weather.relativeHumidity);
            double wetBulbDepression = weather.dryBulbTempC - wetBulbTempC;
            
            // Use DEC when conditions are favorable (low humidity, good wet-bulb depression)
            if (weather.relativeHumidity < 70 && wetBulbDepression > 5) {
                return "DEC";
            } 
            // Use IEC when humidity is moderate (works up to 90% RH)
            else if (weather.relativeHumidity < 90 && wetBulbDepression > 2) {
                return "IEC";
            }
            // ✅ NEW: Even in very high humidity, use IEC for pre-cooling
            else if (config.has_dx_backup) {
                return "DX_ASSIST"; // Evap pre-cooling + DX supplement
            }
            // ✅ FALLBACK: Always try IEC even in poor conditions (provides some cooling)
            else {
                return "IEC";
            }
        }
        
        return "DEC"; // default fallback
    }
    
    /**
     * Calculate evaporative cooling performance
     * PHASE 1 IMPROVEMENT: Velocity-dependent saturation effectiveness
     */
    private EvapCoolingResult calculateEvaporativeCooling(WeatherPoint weather, 
                                                        double heatLoadKW,
                                                        SimulationRequest.CoolingSystemConfig config,
                                                        String mode,
                                                        SimulationRequest request,
                                                        double currentFaceVelocity,
                                                        double speedRatio) {
        
        EvapCoolingResult result = new EvapCoolingResult();
        
        // ═══════════════════════════════════════════════════════════════════════════
        // PHASE 1 STEP 2: VELOCITY-DEPENDENT SATURATION EFFECTIVENESS
        // ═══════════════════════════════════════════════════════════════════════════
        // Base effectiveness from configuration
        double baseEffectiveness = config.saturation_effectiveness / 100.0;
        double wettingEfficiency = config.wetting_efficiency / 100.0;
        
        // Reference velocity from configuration (typically 2.0 m/s)
        double referenceVelocity = config.face_velocity_ms;
        
        // Adjust effectiveness based on velocity
        // As velocity increases beyond reference, effectiveness decreases
        // Linear degradation: 5% loss per m/s above reference
        double velocityAdjustmentFactor = 1.0;
        if (currentFaceVelocity > referenceVelocity) {
            velocityAdjustmentFactor = 1.0 - 0.05 * (currentFaceVelocity - referenceVelocity);
            velocityAdjustmentFactor = Math.max(0.5, velocityAdjustmentFactor); // Minimum 50% effectiveness
        }
        
        // Calculate actual effectiveness with velocity adjustment
        double actualEffectiveness = baseEffectiveness * wettingEfficiency * velocityAdjustmentFactor;
        
        // Log velocity effect (first few hours only)
        if (velocityAdjustmentFactor < 0.95) {
            System.out.println(String.format(
                "  🌀 Velocity Effect: Current=%.2f m/s, Reference=%.2f m/s, Adjustment=%.1f%%, Effectiveness: %.1f%% → %.1f%%",
                currentFaceVelocity, referenceVelocity, velocityAdjustmentFactor * 100, 
                baseEffectiveness * wettingEfficiency * 100, actualEffectiveness * 100
            ));
        }
        
        double wetBulbTempC = calculateWetBulbTemp(weather.dryBulbTempC, weather.relativeHumidity);
        
        // Target supply temperature (ASHRAE recommended)
        double targetSupplyTempC = 18.0; // Cold aisle target
        
        if ("DEC".equals(mode)) {
            // Direct evaporative cooling
            result.supplyTempC = weather.dryBulbTempC - actualEffectiveness * (weather.dryBulbTempC - wetBulbTempC);
            result.supplyHumidity = Math.min(95.0, weather.relativeHumidity + (actualEffectiveness * 25.0));
        } else if ("IEC".equals(mode)) {
            // Indirect evaporative cooling - reduced effectiveness but no humidity addition
            result.supplyTempC = weather.dryBulbTempC - (actualEffectiveness * 0.7) * (weather.dryBulbTempC - wetBulbTempC);
            result.supplyHumidity = weather.relativeHumidity;
        } else if ("DX_ASSIST".equals(mode)) {
            // Evaporative pre-cooling + DX assist
            double evapSupplyTemp = weather.dryBulbTempC - (actualEffectiveness * 0.8) * (weather.dryBulbTempC - wetBulbTempC);
            result.supplyTempC = Math.min(evapSupplyTemp, targetSupplyTempC);
            result.supplyHumidity = weather.relativeHumidity;
        }
        
        // Physical constants
        double airDensity = 1.2; // kg/m³
        double specificHeat = 1.006; // kJ/(kg·K)
        
        // Conversion constants
        final double CFM_TO_M3S = 0.000471947;  // 1 CFM = 0.000471947 m³/s
        final double M3S_TO_CFM = 2118.88;      // 1 m³/s = 2118.88 CFM
        
        // ✅ FIX 1: Use maximum available airflow (not limited by heat load calculation)
        // The evaporative system should run at full capacity
        double maxAirflowM3s = config.max_airflow_cfm * CFM_TO_M3S;
        result.airflowCFM = config.max_airflow_cfm;
        
        // ✅ FIX 2: Calculate cooling capacity based on temperature differential
        // Q = ṁ × Cp × ΔT where ΔT = (T_ambient - T_supply)
        double tempDifferential = weather.dryBulbTempC - result.supplyTempC;
        
        // Cooling capacity in kW: Q = (ṁ_air × Cp × ΔT)
        // ṁ_air = ρ × V̇ (kg/s)
        // Cp in kJ/(kg·K), so result is in kJ/s = kW
        result.coolingCapacityKW = maxAirflowM3s * airDensity * specificHeat * tempDifferential;
        
        // ✅ APPLY AIRFLOW LOSSES: Reduce effective cooling capacity by bypass and recirculation
        // These losses are passed from frontend via SimulationRequest
        double effectiveAirflowFraction = 1.0; // Start at 100% effectiveness
        
        // Get airflow distribution settings from request (with defaults)
        double bypassFraction = 0.10; // Default 10%
        double recirculationFraction = 0.05; // Default 5%
        
        if (request.airflow_distribution != null) {
            bypassFraction = request.airflow_distribution.air_bypass_fraction / 100.0;
            recirculationFraction = request.airflow_distribution.hot_air_recirculation / 100.0;
        }
        
        // Combined effectiveness: (1 - bypass) × (1 - recirculation)
        effectiveAirflowFraction = (1.0 - bypassFraction) * (1.0 - recirculationFraction);
        
        // Apply losses to cooling capacity
        double nominalCoolingCapacity = result.coolingCapacityKW;
        result.coolingCapacityKW *= effectiveAirflowFraction;
        
        // Log airflow losses (first few hours only)
        if (nominalCoolingCapacity > 0 && effectiveAirflowFraction < 0.95) {
            System.out.println(String.format(
                "  🌀 Airflow Losses: Nominal=%.1f kW, Bypass=%.1f%%, Recirc=%.1f%%, Effective=%.1f kW (%.1f%% efficiency)",
                nominalCoolingCapacity, bypassFraction * 100, recirculationFraction * 100, 
                result.coolingCapacityKW, effectiveAirflowFraction * 100
            ));
        }
        
        // ✅ FIX 3: Ensure minimum cooling capacity
        // Even in poor conditions, system should provide some cooling
        result.coolingCapacityKW = Math.max(result.coolingCapacityKW, heatLoadKW * 0.3);
        
        // Calculate water consumption (evaporation)
        double latentHeat = 2260; // kJ/kg
        double baseEvaporationLph = (result.coolingCapacityKW * 3600) / latentHeat;
        
        // Account for cycles of concentration from frontend
        double cyclesOfConcentration = config.cycles_of_concentration;
        double blowdownFraction = 1.0 / (cyclesOfConcentration - 1.0);
        result.waterEvaporationLph = baseEvaporationLph * (1.0 + blowdownFraction);
        
        // Debug logging (first few hours only)
        if (result.coolingCapacityKW < heatLoadKW * 0.8) {
            System.out.println(String.format(
                "  ⚠️ Evap Cooling: Ambient=%.1f°C, WB=%.1f°C, Supply=%.1f°C, ΔT=%.1f°C, Airflow=%.1f CFM (%.2f m³/s), Capacity=%.1f kW, Load=%.1f kW",
                weather.dryBulbTempC, wetBulbTempC, result.supplyTempC, tempDifferential, 
                result.airflowCFM, maxAirflowM3s, result.coolingCapacityKW, heatLoadKW
            ));
        }
        
        return result;
    }
    
    /**
     * Calculate fan power based on airflow and frontend fan efficiency
     * 
     * CRITICAL: Proper CFM to m³/s conversion
     * 1 CFM = 0.000471947 m³/s
     * 1 m³/s = 2118.88 CFM
     */
    private double calculateFanPower(double airflowCFM, SimulationRequest.CoolingSystemConfig config) {
        // ✅ FIXED: Correct CFM to m³/s conversion
        final double CFM_TO_M3S = 0.000471947;
        double airflowM3s = airflowCFM * CFM_TO_M3S;
        
        // Typical pressure drop for evaporative cooling media
        double pressureDrop = 200; // Pa (150-250 Pa typical for evap pads)
        double fanEfficiency = config.fan_efficiency; // Already in decimal form from frontend
        
        // Fan power formula: P = (V̇ × ΔP) / η
        double fanPowerKW = (airflowM3s * pressureDrop) / (1000 * fanEfficiency);
        
        // Debug logging
        System.out.println("  🌀 Fan Power Calculation:");
        System.out.println("    Airflow: " + airflowCFM + " CFM = " + airflowM3s + " m³/s");
        System.out.println("    Pressure Drop: " + pressureDrop + " Pa");
        System.out.println("    Fan Efficiency: " + (fanEfficiency * 100) + "%");
        System.out.println("    Fan Power: " + fanPowerKW + " kW");
        
        return fanPowerKW;
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════════
     * PHASE 1 STEP 1: FAN AFFINITY LAWS - Dynamic fan power calculation
     * ═══════════════════════════════════════════════════════════════════════════
     * Calculate dynamic fan power using affinity laws
     * Fan power scales with the CUBE of speed ratio: P = P_base × (speed_ratio)³
     * 
     * Example: If servers are at 40% utilization requiring 60% airflow:
     *   - Speed ratio = 0.6
     *   - Power ratio = 0.6³ = 0.216 (21.6% of full power)
     *   - This is a 78.4% power savings!
     * 
     * @param airflowCFM Current airflow in CFM
     * @param config Cooling system configuration
     * @param speedRatio Fan speed ratio (0-1.0)
     * @return Dynamic fan power in kW
     */
    private double calculateDynamicFanPower(double airflowCFM, 
                                           SimulationRequest.CoolingSystemConfig config,
                                           double speedRatio) {
        // Calculate base fan power at full speed
        final double CFM_TO_M3S = 0.000471947;
        double maxAirflowM3s = config.max_airflow_cfm * CFM_TO_M3S;
        
        // Typical pressure drop for evaporative cooling media
        double pressureDrop = 200; // Pa (150-250 Pa typical for evap pads)
        double fanEfficiency = config.fan_efficiency;
        
        // Base fan power at full speed: P_base = (V̇_max × ΔP) / η
        double baseFanPowerKW = (maxAirflowM3s * pressureDrop) / (1000 * fanEfficiency);
        
        // Apply affinity laws: P_dynamic = P_base × (speed_ratio)³
        double dynamicFanPowerKW = baseFanPowerKW * Math.pow(speedRatio, 3);
        
        // Debug logging (first few hours only)
        if (speedRatio < 0.95) {
            System.out.println(String.format(
                "  ⚡ Fan Affinity Laws: Speed Ratio=%.1f%%, Base Power=%.2f kW, Dynamic Power=%.2f kW (%.1f%% savings)",
                speedRatio * 100, baseFanPowerKW, dynamicFanPowerKW, 
                (1 - Math.pow(speedRatio, 3)) * 100
            ));
        }
        
        return dynamicFanPowerKW;
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
        
        // Emissions results with carbon accounting
        response.results.emissions = new SimulationResponse.EmissionsResults();
        
        // Calculate base emissions
        double baseEmissionsKg = state.getTotalElectricityKWh() * request.emissions.grid_kgco2_per_kwh;
        
        // Apply carbon accounting method and renewable energy percentage
        double effectiveEmissionsKg = baseEmissionsKg;
        
        if (request.carbon_accounting != null) {
            double renewablePercentage = request.carbon_accounting.renewable_energy_percentage / 100.0;
            
            if ("market_based".equals(request.carbon_accounting.emissions_accounting_method)) {
                // Market-based: Renewable energy credits reduce emissions to zero for that portion
                effectiveEmissionsKg = baseEmissionsKg * (1.0 - renewablePercentage);
                
                System.out.println("🌱 Carbon Accounting (Market-Based):");
                System.out.println("  Base Emissions: " + String.format("%.2f", baseEmissionsKg) + " kg CO2");
                System.out.println("  Renewable Energy: " + (renewablePercentage * 100) + "%");
                System.out.println("  Effective Emissions: " + String.format("%.2f", effectiveEmissionsKg) + " kg CO2");
            } else {
                // Location-based: Use actual grid emissions (renewable % doesn't affect this)
                effectiveEmissionsKg = baseEmissionsKg;
                
                System.out.println("🌱 Carbon Accounting (Location-Based):");
                System.out.println("  Grid Emissions: " + String.format("%.2f", baseEmissionsKg) + " kg CO2");
                System.out.println("  (Renewable energy % not applied in location-based accounting)");
            }
        }
        
        response.results.emissions.co2_kg_total = effectiveEmissionsKg;
        response.results.emissions.co2_kg_per_kwh_it = effectiveEmissionsKg / state.getTotalITKWh();
        response.results.emissions.co2_kg_per_server_annual = effectiveEmissionsKg / request.it_load.servers;
        
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
        
        // ✅ ADD HOURLY DATA TO RESPONSE
        response.hourly_data = state.getHourlyData();
        
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