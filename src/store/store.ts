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
      carbonIntensity: val(input.co2EmissionFactor),
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

    console.log('[DEBUG] Simulation API payload (No Defaults):', payload);

    const response = await fetch("http://localhost:8080/api/simulation/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    set({ currentResult: data });
    return data;
  },
}))