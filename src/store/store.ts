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
  // Step 1: Basic Configuration
  dataCenterName: string
  location: string
  itLoad: number
  numberOfRacks: number

  // Step 2: Cooling Technique
  coolingTechnique: 'air' | 'water' | 'evaporative' | 'hybrid'

  // Step 3: Advanced Parameters
  supplyAirTemp: number
  chilledWaterTemp: number
  efficiencyFactor: number

  // Step 4: Environmental Data
  electricityTariff: number
  co2EmissionFactor: number
  weatherData?: any

  // Step 5: Review
  reviewed: boolean
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
      preferences: {
        theme: 'light',
        units: 'metric',
        notifications: true,
      },
    }
    set({ user, isAuthenticated: true })
  },

  signup: (name: string, email: string, _password: string) => {
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      preferences: {
        theme: 'light',
        units: 'metric',
        notifications: true,
      },
    }
    set({ user, isAuthenticated: true })
  },

  logout: () => {
    set({ user: null, isAuthenticated: false })
  },

  updateUser: (updates: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }))
  },
}))

export const useSimulationStore = create<SimulationStore>((set) => ({
  simulations: [],
  currentSimulation: null,
  currentInput: null,
  currentResult: null,

  addSimulation: (simulation: Simulation) => {
    set((state) => ({
      simulations: [...state.simulations, simulation],
    }))
  },

  setCurrentSimulation: (simulation: Simulation | null) => {
    set({ currentSimulation: simulation })
  },

  setCurrentInput: (input: SimulationInput | null) => {
    set({ currentInput: input })
  },

  setCurrentResult: (result: SimulationResult | null) => {
    set({ currentResult: result })
  },

  updateSimulationInput: (input: Partial<SimulationInput>) => {
    set((state) => ({
      currentInput: state.currentInput ? { ...state.currentInput, ...input } : null,
    }))
  },

  runSimulation: async (input: SimulationInput) => {
    // Map frontend input to backend API structure
    // Map fans if available (example: best, average, old)
    const fans = [];
    if (input.fanConfig) {
      if (input.fanConfig.bestFans)
        fans.push({ type: "best", efficiencyWPerCFM: input.fanEfficiency?.best ?? 0.35, quantity: input.fanConfig.bestFans });
      if (input.fanConfig.averageFans)
        fans.push({ type: "average", efficiencyWPerCFM: input.fanEfficiency?.average ?? 0.6, quantity: input.fanConfig.averageFans });
      if (input.fanConfig.oldFans)
        fans.push({ type: "old", efficiencyWPerCFM: input.fanEfficiency?.old ?? 1, quantity: input.fanConfig.oldFans });
    }

    // Map weatherData from locationData (8760 values)
    const weatherData = Array.isArray(input.locationData)
      ? input.locationData.map((d: any) => ({
          timestamp: d.timestamp,
          dryBulb: d.temperature,
          relativeHumidity: d.humidity
        }))
      : [];

    const payload = {
      numberOfRacks: input.numberOfRacks,
      serversPerRack: input.totalServers ? input.totalServers / input.numberOfRacks : 10,
      serverMaxPowerW: input.serverMaxPowerW ?? 300,
      serverIdlePowerW: input.serverIdlePowerW ?? 100,
      averageUtilization: input.efficiencyFactor ?? 70,
      peakUtilization: input.peakUtilization ?? 65,
      fans,
      country: input.country ?? "",
      electricityTariff: input.electricityTariff ?? 0.2,
      carbonIntensity: input.co2EmissionFactor ?? 0.05,
      weatherData
    };

    console.log("Simulation API payload:", payload);
    const response = await fetch("http://localhost:9090/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    set({ currentResult: data });
    return data;
  },
}))
