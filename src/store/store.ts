import { create } from 'zustand'

export interface User {
  id: string
  name: string
  email: string
  profilePicture?: string
  organization?: string
  role?: string
  preferences: {
    theme: 'light' | 'dark'
    units: 'metric' | 'imperial'
    notifications: boolean
  }
}

export interface Simulation {
  id: string
  name: string
  location: string
  itLoad: number
  coolingTechnique: 'air' | 'water' | 'evaporative' | 'hybrid'
  createdAt: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  energySaved?: number
  numberOfRacks?: number
}

export interface SimulationInput {
  dataCenterName: string
  location: string
  itLoad: number
  numberOfRacks: number
  coolingTechnique: 'air' | 'water' | 'evaporative' | 'hybrid'
  supplyAirTemp: number
  chilledWaterTemp: number
  efficiencyFactor: number
  electricityTariff: number
  co2EmissionFactor: number
  weatherData?: any
  
  // Optional/Flat fields
  serverMaxPowerW?: number;
  serverIdlePowerW?: number;
  averageUtilization?: number;
  peakUtilization?: number;
  bestQuantity?: number
  bestEfficiency?: number
  averageQuantity?: number
  averageEfficiency?: number
  legacyQuantity?: number
  legacyEfficiency?: number
  economizerMaxOutdoorTemp?: number
  economizerMaxHumidity?: number
  minOutdoorAirFraction?: number
  computeIntensityFactor?: number
  forecastYears?: number
  climateChangeOffsetC?: number
  reviewed: boolean
  airflowCFM?: number
  returnAirTemp?: number
  deltaT?: number
}

export interface SimulationResult {
  id: string
  simulationId: string
  pue: number
  wue: number
  totalEnergyConsumption: number
  estimatedCost: number
  carbonFootprint: number
  hourlyEnergyUse: number[]
  temperatureTrends: number[]
  copOverTime: number[]
  timestamp: string
}

export interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => void
  signup: (name: string, email: string, password: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export interface SimulationStore {
  simulations: Simulation[]
  currentSimulation: Simulation | null
  currentInput: SimulationInput | null
  currentResult: SimulationResult | null
  addSimulation: (simulation: Simulation) => void
  setCurrentSimulation: (simulation: Simulation | null) => void
  setCurrentInput: (input: SimulationInput | null) => void
  setCurrentResult: (result: SimulationResult | null) => void
  updateSimulationInput: (input: Partial<SimulationInput>) => void
  runSimulation: (input: SimulationInput) => Promise<SimulationResult>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (email: string, _password: string) => {
    const user: User = {
      id: '1',
      name: 'John Doe',
      email,
      preferences: { theme: 'light', units: 'metric', notifications: true },
    }
    set({ user, isAuthenticated: true })
  },
  signup: (name: string, email: string, _password: string) => {
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      preferences: { theme: 'light', units: 'metric', notifications: true },
    }
    set({ user, isAuthenticated: true })
  },
  logout: () => set({ user: null, isAuthenticated: false }),
  updateUser: (updates) => set((state) => ({
    user: state.user ? { ...state.user, ...updates } : null,
  })),
}))

export const useSimulationStore = create<SimulationStore>((set) => ({
  simulations: [],
  currentSimulation: null,
  currentInput: null,
  currentResult: null,

  addSimulation: (simulation) => set((state) => ({
    simulations: [...state.simulations, simulation],
  })),
  setCurrentSimulation: (simulation) => set({ currentSimulation: simulation }),
  setCurrentInput: (input) => set({ currentInput: input }),
  setCurrentResult: (result) => set({ currentResult: result }),
  updateSimulationInput: (input) => set((state) => ({
    currentInput: state.currentInput ? { ...state.currentInput, ...input } : null,
  })),

  runSimulation: async (input: SimulationInput) => {
    // Helper returns the input value or null (removing hardcoded defaults)
    const val = (v: any) => (v !== undefined && v !== null ? v : null);

    // 🔍 DEBUG: Log the raw input to see what we're receiving
    console.log('🔍 [DEBUG] Raw input received by runSimulation:', JSON.stringify(input, null, 2));
    console.log('🔍 [DEBUG] Input keys:', Object.keys(input));
    console.log('🔍 [DEBUG] Has evaporativeConfig?', !!(input as any).evaporativeConfig);
    console.log('🔍 [DEBUG] Has airSideConfig?', !!(input as any).airSideConfig);

    // Check cooling technique to determine which API to call
    const coolingTechnique = (input as any).coolingTechnique || 'air';
    
    console.log('🔥 [SIMULATION] Cooling technique selected:', coolingTechnique);
    console.log('🔥 [SIMULATION] Input data:', input);

    // ========================================================================
    // CHILLED WATER COOLING
    // ========================================================================
    if (coolingTechnique === 'water') {
      console.log('🌊 [CHILLED WATER] Using Chilled Water Cooling API');
      
      const chilledWaterConfig = (input as any).chilledWaterConfig;
      
      if (!chilledWaterConfig) {
        throw new Error('Chilled water configuration is missing');
      }

      console.log('🌊 [CHILLED WATER] Configuration found:', chilledWaterConfig);

      // Import and call the chilled water API service
      const { simulateChilledWater } = await import('../services/chilledWaterApi');
      
      try {
        const result = await simulateChilledWater(chilledWaterConfig);
        console.log('🌊 [CHILLED WATER] API Response received:', result);
        set({ currentResult: result });
        return result;
      } catch (error: any) {
        console.error('🌊 [CHILLED WATER] API Error:', error);
        throw new Error(`Chilled water simulation failed: ${error.message}`);
      }
    }

    // ========================================================================
    // EVAPORATIVE COOLING
    // ========================================================================
    // If evaporative cooling is selected, use the new evaporative cooling API
    if (coolingTechnique === 'evaporative') {
      console.log('🌊 [EVAPORATIVE] Using Evaporative Cooling API');
      
      // Check if we have evaporative cooling configuration
      const evapConfig = (input as any).evaporativeConfig || (input as any).airSideConfig;
      
      if (!evapConfig) {
        throw new Error('Evaporative cooling configuration is missing');
      }

      console.log('🌊 [EVAPORATIVE] Configuration found:', evapConfig);

      // Check for weather file
      if (!evapConfig.weatherData || evapConfig.weatherData.length === 0) {
        throw new Error('Weather data is required for evaporative cooling simulation. Please upload a weather CSV file.');
      }

      console.log('🌊 [EVAPORATIVE] Weather data found:', evapConfig.weatherData.length, 'data points');

      // Build evaporative cooling API payload with ALL advanced fields
      const evaporativePayload = {
        simulation: {
          time_horizon_hours: 8760,
          time_step_seconds: 3600
        },
        it_load: {
          total_it_power_kw: evapConfig.totalITLoadKW || 
                            (evapConfig.totalServers * evapConfig.serverMaxPower * (evapConfig.averageUtilization / 100)) / 1000 || 
                            100.0,
          servers: evapConfig.totalServers || 100,
          racks: evapConfig.numberOfRacks || input.numberOfRacks || 10,
          power_utilization_model: evapConfig.powerUtilizationModel || "linear",
          workload_type: evapConfig.workloadType || "traditional" // 🚀 CloudSim AI workload mode
        },
        cooling_system: {
          type: evapConfig.coolingArchitecture === 'dec' ? 'direct_evaporative' : 
                evapConfig.coolingArchitecture === 'iec' ? 'indirect_evaporative' : 'hybrid',
          max_airflow_cfm: evapConfig.maxAirflowCapacity || 10000.0,
          fan_efficiency: (evapConfig.fanEfficiency || 65) / 100,
          saturation_effectiveness: evapConfig.saturationEffectiveness || 85.0,
          face_velocity_ms: evapConfig.faceVelocity || 2.0,
          wetting_efficiency: evapConfig.wettingEfficiency || 95.0,
          media_type: evapConfig.mediaType || "cellulose",
          has_dx_backup: evapConfig.enableMechanicalBackup || false,
          dx_cop: evapConfig.dxCOP || 3.5,
          water_source: evapConfig.waterSource || "municipal",
          cycles_of_concentration: evapConfig.cyclesOfConcentration || 5.0,
          tank_volume_l: evapConfig.tankVolume || 5000.0,
          refill_rate_l_per_day: evapConfig.refillRate || 0.0,
          low_water_cutoff_percent: evapConfig.lowWaterCutoff || 10.0
        },
        rates: {
          electricity_usd_per_kwh: evapConfig.electricityRate || input.electricityTariff || 0.12,
          water_usd_per_liter: evapConfig.waterRate || 0.001
        },
        emissions: {
          grid_kgco2_per_kwh: evapConfig.gridEmissionsFactor || input.carbonIntensity || 0.45
        },
        constraints: {
          max_inlet_temp_c: 27.0,
          max_relative_humidity: 80.0,
          max_pue: 1.5
        },
        // 🆕 ADVANCED FIELDS - Financial Escalation (4 fields)
        financial_escalation: {
          annual_electricity_inflation: evapConfig.annualElectricityInflation || 4.0,
          annual_water_inflation: evapConfig.annualWaterInflation || 3.0,
          carbon_price: evapConfig.carbonPrice || 50.0,
          carbon_price_growth: evapConfig.carbonPriceGrowth || 5.0
        },
        // 🆕 ADVANCED FIELDS - Carbon Accounting (2 fields)
        carbon_accounting: {
          emissions_accounting_method: evapConfig.emissionsAccountingMethod || "location_based",
          renewable_energy_percentage: evapConfig.renewableEnergyPercentage || 0.0
        },
        // 🆕 ADVANCED FIELDS - 2030 Scenarios (3 fields)
        scenario: {
          scenario_type: evapConfig.scenarioType || "baseline_2025",
          temperature_offset: evapConfig.temperatureOffset || 1.0,
          humidity_adjustment: evapConfig.humidityAdjustment || 0.0
        },
        // 🆕 ADVANCED FIELDS - Rack Geometry (2 fields)
        rack_geometry: {
          rack_height_u: evapConfig.rackHeightU || 42,
          front_to_back_airflow: evapConfig.frontToBackAirflow !== undefined ? evapConfig.frontToBackAirflow : true
        },
        // 🆕 ADVANCED FIELDS - Airflow Distribution (3 fields)
        airflow_distribution: {
          airflow_quality_preset: evapConfig.airflowQualityPreset || "typical",
          air_bypass_fraction: evapConfig.airBypassFraction || 10.0,
          hot_air_recirculation: evapConfig.hotAirRecirculation || 5.0
        },
        // 🆕 ADVANCED FIELDS - Thermal Mass (3 fields)
        thermal_mass: {
          rack_thermal_mass: evapConfig.rackThermalMass || 15.0,
          enclosure_thermal_mass: evapConfig.enclosureThermalMass || 30.0,
          manual_thermal_override: evapConfig.manualThermalOverride || false
        },
        // 🆕 ADVANCED FIELDS - Enclosure Type (1 field + auto-calculated)
        enclosure: {
          enclosure_type: evapConfig.enclosureType || "outdoor_container",
          enclosure_thermal_mass_value: evapConfig.enclosureThermalMassValue || 30.0,
          enclosure_air_leakage: evapConfig.enclosureAirLeakage || 0.5,
          insulation_quality: evapConfig.insulationQuality || "Low-Medium"
        },
        // 🆕 ADVANCED FIELDS - Infiltration (2 fields)
        infiltration: {
          infiltration_level: evapConfig.infiltrationLevel || "standard",
          infiltration_ach: evapConfig.infiltrationACH || 0.25,
          enable_custom_infiltration: evapConfig.enableCustomInfiltration || false
        }
      };

      console.log('═══════════════════════════════════════════════════════════');
      console.log('  📤 SENDING TO BACKEND API - COMPLETE PAYLOAD');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🌊 [EVAPORATIVE] Basic Configuration:');
      console.log('  ✓ IT Load:', evaporativePayload.it_load.total_it_power_kw, 'kW');
      console.log('  ✓ Servers:', evaporativePayload.it_load.servers);
      console.log('  ✓ Racks:', evaporativePayload.it_load.racks);
      console.log('  ✓ Workload Type:', evaporativePayload.it_load.workload_type, '🚀 (CloudSim AI Mode)');
      console.log('  ✓ Power Model:', evaporativePayload.it_load.power_utilization_model);
      console.log('  ✓ Cooling Type:', evaporativePayload.cooling_system.type);
      console.log('  ✓ Max Airflow:', evaporativePayload.cooling_system.max_airflow_cfm, 'CFM');
      console.log('  ✓ Fan Efficiency:', (evaporativePayload.cooling_system.fan_efficiency * 100).toFixed(1), '%');
      console.log('  ✓ Saturation Effectiveness:', evaporativePayload.cooling_system.saturation_effectiveness, '%');
      console.log('  ✓ DX Backup:', evaporativePayload.cooling_system.has_dx_backup);
      console.log('  ✓ Water Source:', evaporativePayload.cooling_system.water_source);
      console.log('  ✓ Electricity Rate: $', evaporativePayload.rates.electricity_usd_per_kwh, '/kWh');
      console.log('  ✓ Grid Emissions:', evaporativePayload.emissions.grid_kgco2_per_kwh, 'kg CO2/kWh');
      console.log('  ✓ Weather Data Points:', evapConfig.weatherData.length);
      console.log();
      console.log('🆕 [ADVANCED] Financial Escalation:');
      console.log('  ✓ Electricity Inflation:', evaporativePayload.financial_escalation.annual_electricity_inflation, '% per year');
      console.log('  ✓ Water Inflation:', evaporativePayload.financial_escalation.annual_water_inflation, '% per year');
      console.log('  ✓ Carbon Price: $', evaporativePayload.financial_escalation.carbon_price, 'per ton CO2');
      console.log('  ✓ Carbon Price Growth:', evaporativePayload.financial_escalation.carbon_price_growth, '% per year');
      console.log();
      console.log('🆕 [ADVANCED] Carbon Accounting:');
      console.log('  ✓ Accounting Method:', evaporativePayload.carbon_accounting.emissions_accounting_method);
      console.log('  ✓ Renewable Energy:', evaporativePayload.carbon_accounting.renewable_energy_percentage, '%');
      console.log();
      console.log('🆕 [ADVANCED] 2030 Scenario:');
      console.log('  ✓ Scenario Type:', evaporativePayload.scenario.scenario_type);
      console.log('  ✓ Temperature Offset:', evaporativePayload.scenario.temperature_offset, '°C');
      console.log('  ✓ Humidity Adjustment:', evaporativePayload.scenario.humidity_adjustment, '%');
      console.log();
      console.log('🆕 [ADVANCED] Rack Geometry:');
      console.log('  ✓ Rack Height:', evaporativePayload.rack_geometry.rack_height_u, 'U');
      console.log('  ✓ Front-to-Back Airflow:', evaporativePayload.rack_geometry.front_to_back_airflow);
      console.log();
      console.log('🆕 [ADVANCED] Airflow Distribution:');
      console.log('  ✓ Quality Preset:', evaporativePayload.airflow_distribution.airflow_quality_preset);
      console.log('  ✓ Air Bypass:', evaporativePayload.airflow_distribution.air_bypass_fraction, '%');
      console.log('  ✓ Hot Air Recirculation:', evaporativePayload.airflow_distribution.hot_air_recirculation, '%');
      console.log();
      console.log('🆕 [ADVANCED] Thermal Mass:');
      console.log('  ✓ Rack Thermal Mass:', evaporativePayload.thermal_mass.rack_thermal_mass, 'kJ/K');
      console.log('  ✓ Enclosure Thermal Mass:', evaporativePayload.thermal_mass.enclosure_thermal_mass, 'kJ/K');
      console.log('  ✓ Manual Override:', evaporativePayload.thermal_mass.manual_thermal_override);
      console.log();
      console.log('🆕 [ADVANCED] Enclosure:');
      console.log('  ✓ Enclosure Type:', evaporativePayload.enclosure.enclosure_type);
      console.log('  ✓ Thermal Mass Value:', evaporativePayload.enclosure.enclosure_thermal_mass_value, 'kJ/K');
      console.log('  ✓ Air Leakage:', evaporativePayload.enclosure.enclosure_air_leakage, 'ACH');
      console.log('  ✓ Insulation Quality:', evaporativePayload.enclosure.insulation_quality);
      console.log();
      console.log('🆕 [ADVANCED] Infiltration:');
      console.log('  ✓ Infiltration Level:', evaporativePayload.infiltration.infiltration_level);
      console.log('  ✓ Infiltration ACH:', evaporativePayload.infiltration.infiltration_ach);
      console.log('  ✓ Custom Infiltration:', evaporativePayload.infiltration.enable_custom_infiltration);
      console.log('═══════════════════════════════════════════════════════════');
      console.log();

      // Create weather CSV from weather data
      const weatherCsv = createWeatherCsv(evapConfig.weatherData);
      
      console.log('🌊 [EVAPORATIVE] Weather CSV created, length:', weatherCsv.length);
      
      // Create FormData for multipart request
      const formData = new FormData();
      const weatherBlob = new Blob([weatherCsv], { type: 'text/csv' });
      formData.append('weatherFile', weatherBlob, 'weather_data.csv');
      formData.append('config', JSON.stringify(evaporativePayload));

      console.log('🌊 [EVAPORATIVE] Calling API: http://localhost:8082/api/simulations/evaporative-cooling');

      // Call evaporative cooling API
      const response = await fetch("http://localhost:8082/api/simulations/evaporative-cooling", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Evaporative cooling simulation failed: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      console.log('🌊 [EVAPORATIVE] API Response received:', data);
      
      // Transform evaporative cooling results to match expected format
      const transformedData = transformEvaporativeResults(data);
      
      console.log('🌊 [EVAPORATIVE] Results transformed:', transformedData);
      
      set({ currentResult: transformedData });
      return transformedData;
    }

    // For air economizer and other cooling techniques, use the existing API
    console.log('💨 [AIR ECONOMIZER] Using existing Air Economizer API');
    
    const weatherData = Array.isArray((input as any).locationData)
      ? (input as any).locationData.map((d: any) => ({
          timestamp: d.timestamp,
          temperature: d.temperature,
          humidity: d.humidity
        }))
      : [];

    const payload = {
      // CloudSim parameters - ALWAYS ENABLED
      enableCloudSim: true,  // ← Hardcoded to always use CloudSim
      aiWorkloadMode: val((input as any).aiWorkloadMode) ?? "AI_TRAINING",  // Default to AI_TRAINING
      computeIntensityFactor: val(input.computeIntensityFactor) ?? 1.0,
      coresPerServer: val((input as any).coresPerServer) ?? 4,
      mipsPerCore: val((input as any).mipsPerCore) ?? 1000,
      
      // Server configuration
      numberOfRacks: val(input.numberOfRacks),
      serversPerRack: val((input as any).serversPerRack),
      serverMaxPowerW: input.serverMaxPowerW,
      serverIdlePowerW: input.serverIdlePowerW,
      averageUtilization: input.averageUtilization ?? input.efficiencyFactor,
      peakUtilization: input.peakUtilization,
      
      // Fan configuration
      bestQuantity: val(input.bestQuantity),
      bestEfficiency: val(input.bestEfficiency),
      averageQuantity: val(input.averageQuantity),
      averageEfficiency: val(input.averageEfficiency),
      legacyQuantity: val(input.legacyQuantity),
      legacyEfficiency: val(input.legacyEfficiency),
      
      // Location and tariffs
      country: val((input as any).country),
      electricityTariff: val(input.electricityTariff),
      carbonIntensity: val(
        input.co2EmissionFactor ??
        (input as any).carbon_intensity ??
        (input as any).carbonIntensity ??
        (input as any).co2_grid_factor
      ),
      weatherData,
      
      // Physics parameters
      airflowCFM: val(input.airflowCFM),
      supplyAirTemp: val(input.supplyAirTemp),
      returnAirTemp: val(input.returnAirTemp),
      deltaT: val(input.deltaT),
      economizerMaxOutdoorTemp: val(input.economizerMaxOutdoorTemp),
      economizerMaxHumidity: val(input.economizerMaxHumidity),
      minOutdoorAirFraction: val(input.minOutdoorAirFraction),
      
      // Legacy parameters (for backward compatibility)
      forecastYears: val(input.forecastYears),
      energyEscalationRate: val((input as any).energyEscalationRate),
      carbonTaxProjected: val((input as any).carbonTaxProjected),
      climateChangeOffsetC: val(input.climateChangeOffsetC),
      ...(input as any).fans // Keep dynamic spread for any extra fan fields
    };

    console.log('💨 [AIR ECONOMIZER] Air Economizer API payload (No Defaults):', payload);

    const response = await fetch("http://localhost:8080/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    console.log('💨 [AIR ECONOMIZER] API Response received:', data);
    set({ currentResult: data });
    return data;
  },
}))
// Helper function to create weather CSV from weather data
const createWeatherCsv = (weatherData: any[]): string => {
  const header = 'Hour,DryBulbTemp_C,RelativeHumidity_%,Pressure_kPa,WindSpeed_m/s';
  const rows = weatherData.map((data, index) => {
    const hour = index + 1;
    const temp = data.temperature || 25.0;
    const humidity = data.humidity || 50.0;
    const pressure = 101.3; // Standard atmospheric pressure
    const windSpeed = 2.0; // Default wind speed
    
    return `${hour},${temp},${humidity},${pressure},${windSpeed}`;
  });
  
  return [header, ...rows].join('\n');
};

// Helper function to transform evaporative cooling results to match expected format
const transformEvaporativeResults = (evapData: any): any => {
  // Transform the evaporative cooling API response to match the expected simulation result format
  const results = evapData.results || {};
  const assessment = evapData.cooling_assessment || {};
  
  return {
    // Basic simulation info
    simulationId: `evap_${Date.now()}`,
    timestamp: new Date().toISOString(),
    coolingTechnique: 'evaporative',
    
    // Energy results
    totalEnergyConsumption: results.energy?.electricity_kwh_total || 0,
    energySavings: 0, // Calculate based on baseline
    energyEfficiency: results.performance?.pue_average || 1.0,
    
    // Cost results
    totalCost: results.cost?.total_energy_cost_usd || 0,
    costSavings: 0, // Calculate based on baseline
    opexPerServer: results.opex?.opex_per_server_annual || 0,
    
    // Environmental results
    carbonEmissions: results.emissions?.co2_kg_total || 0,
    carbonSavings: 0, // Calculate based on baseline
    waterConsumption: results.water?.water_liters_total || 0,
    
    // Performance metrics
    pue: results.performance?.pue_average || 1.0,
    wue: results.performance?.wue_average || 0,
    availability: results.performance?.availability_percent || 100,
    
    // Cooling assessment
    coolingAdequacy: {
      status: assessment.status || 'UNKNOWN',
      confidence: assessment.confidence || 0.5,
      checks: assessment.checks || {},
      keyMetrics: assessment.key_metrics || {},
      engineeringNotes: assessment.engineering_notes || [],
      recommendations: assessment.recommendations || []
    },
    
    // Additional evaporative-specific data
    evaporativeResults: {
      fanEnergy: results.energy?.fan_kwh || 0,
      pumpEnergy: results.energy?.pump_kwh || 0,
      dxBackupEnergy: results.energy?.dx_kwh || 0,
      waterEvaporation: results.water?.evaporation_liters || 0,
      waterBlowdown: results.water?.blowdown_liters || 0,
      maxInletTemp: assessment.key_metrics?.max_inlet_temp_c || 0,
      coolingFailureHours: results.performance?.cooling_failure_hours || 0
    },
    
    // Raw data for detailed analysis
    rawEvaporativeData: evapData
  };
};