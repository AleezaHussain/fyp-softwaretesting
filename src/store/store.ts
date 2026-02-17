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

      // Build evaporative cooling API payload
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
          power_utilization_model: evapConfig.powerUtilizationModel || "linear"
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
        }
      };

      console.log('🌊 [EVAPORATIVE] Evaporative Cooling API payload:', evaporativePayload);

      // Create weather CSV from weather data
      const weatherCsv = createWeatherCsv(evapConfig.weatherData);
      
      console.log('🌊 [EVAPORATIVE] Weather CSV created, length:', weatherCsv.length);
      
      // Create FormData for multipart request
      const formData = new FormData();
      const weatherBlob = new Blob([weatherCsv], { type: 'text/csv' });
      formData.append('weatherFile', weatherBlob, 'weather_data.csv');
      formData.append('config', JSON.stringify(evaporativePayload));

      console.log('🌊 [EVAPORATIVE] Calling API: http://localhost:8080/api/simulations/evaporative-cooling');

      // Call evaporative cooling API
      const response = await fetch("http://localhost:8080/api/simulations/evaporative-cooling", {
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
      numberOfRacks: val(input.numberOfRacks),
      serversPerRack: val((input as any).serversPerRack),
      serverMaxPowerW: input.serverMaxPowerW,
      serverIdlePowerW: input.serverIdlePowerW,
      averageUtilization: input.averageUtilization ?? input.efficiencyFactor,
      peakUtilization: input.peakUtilization,
      bestQuantity: val(input.bestQuantity),
      bestEfficiency: val(input.bestEfficiency),
      averageQuantity: val(input.averageQuantity),
      averageEfficiency: val(input.averageEfficiency),
      legacyQuantity: val(input.legacyQuantity),
      legacyEfficiency: val(input.legacyEfficiency),
      country: val((input as any).country),
      electricityTariff: val(input.electricityTariff),
      carbonIntensity: val(
        input.co2EmissionFactor ??
        (input as any).carbon_intensity ??
        (input as any).carbonIntensity ??
        (input as any).co2_grid_factor
      ),
      weatherData,
      airflowCFM: val(input.airflowCFM),
      supplyAirTemp: val(input.supplyAirTemp),
      returnAirTemp: val(input.returnAirTemp),
      deltaT: val(input.deltaT),
      economizerMaxOutdoorTemp: val(input.economizerMaxOutdoorTemp),
      economizerMaxHumidity: val(input.economizerMaxHumidity),
      minOutdoorAirFraction: val(input.minOutdoorAirFraction),
      computeIntensityFactor: val(input.computeIntensityFactor),
      forecastYears: val(input.forecastYears),
      energyEscalationRate: val((input as any).energyEscalationRate),
      carbonTaxProjected: val((input as any).carbonTaxProjected),
      climateChangeOffsetC: val(input.climateChangeOffsetC),
      ...(input as any).fans // Keep dynamic spread for any extra fan fields
    };

    console.log('💨 [AIR ECONOMIZER] Air Economizer API payload (No Defaults):', payload);

    const response = await fetch("http://localhost:8080/api/simulation/run", {
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