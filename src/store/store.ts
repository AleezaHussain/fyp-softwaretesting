import { create } from 'zustand'

export interface User {
  id: string
  name: string
  email: string
  profilePicture?: string
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
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const result: SimulationResult = {
          id: Math.random().toString(36).substr(2, 9),
          simulationId: Math.random().toString(36).substr(2, 9),
          pue: 1.5 + Math.random() * 0.5,
          wue: 0.8 + Math.random() * 0.3,
          totalEnergyConsumption: input.itLoad * 8760 * 1.5,
          estimatedCost: input.itLoad * 8760 * 0.12,
          carbonFootprint: input.itLoad * 8760 * 0.5,
          hourlyEnergyUse: Array.from({ length: 24 }, () => input.itLoad * (0.8 + Math.random() * 0.4)),
          temperatureTrends: Array.from({ length: 24 }, () => 20 + Math.random() * 10),
          copOverTime: Array.from({ length: 24 }, () => 2 + Math.random() * 1),
          timestamp: new Date().toISOString(),
        }
        set({ currentResult: result })
        resolve(result)
      }, 2000)
    })
  },
}))
