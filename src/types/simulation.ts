export type CoolingTechnique = 'air' | 'water' | 'evaporative'
export type ComponentType = 'server_rack' | 'router' | 'cooling_pump' | 'pdu' | 'storage_array' | 'backup_generator' | 'fan' | 'chiller'
export type ServerRackSize = '1U' | '2U' | '4U'

export interface DataCenterComponent {
  id: string
  type: ComponentType
  quantity: number
  rackSize?: ServerRackSize
  position?: { x: number; y: number; z: number }
}

export interface DataCenterConfig {
  dataCenterName: string
  components: DataCenterComponent[]
  totalHeatLoad: number
}

export interface CoolingTechniqueConfig {
  technique: CoolingTechnique
  supplyTemp?: number
  airflowRate?: number
  economizerEnabled?: boolean
  coolantType?: string
  flowRate?: number
  hxEfficiency?: number
  waterSource?: string
  evaporationRate?: number
  humidityLimit?: number
}

export interface LocationData {
  latitude: number
  longitude: number
  city: string
  country: string
  weatherData?: WeatherInfo
  electricityCost: number
  ashraeLow: number
  ashraHigh: number
}

export interface WeatherInfo {
  temperature: number
  humidity: number
  timestamp: string
}

export interface SimulationStep {
  number: 1 | 2 | 3 | 4
  name: string
  completed: boolean
  data?: any
}

export interface SimulationInput {
  dataCenterConfig: DataCenterConfig
  coolingConfig: CoolingTechniqueConfig
  locationData: LocationData
  simulationRunning: boolean
  results?: SimulationResults
}

export interface TechniqueComparison {
  technique: CoolingTechnique
  pue: number
  wue: number
  totalEnergy: number
  estimatedCost: number
  carbonFootprint: number
  efficiency: number
}

export interface SimulationResults {
  id: string
  timestamp: string
  dataCenterConfig: DataCenterConfig
  coolingConfig: CoolingTechniqueConfig
  locationData: LocationData
  comparisons: TechniqueComparison[]
  recommended: CoolingTechnique
  recommendationReason: string
  metrics: {
    pue: number
    wue: number
    totalEnergy: number
    estimatedCost: number
    carbonFootprint: number
    hourlyEnergyUse: number[]
    temperatureTrends: number[]
  }
  thermalVisualization: ThermalData[]
}

export interface ThermalData {
  componentId: string
  temperature: number
  heatLoad: number
  position: { x: number; y: number; z: number }
}

  [key in ComponentType]: {
    name: string
    color: string
    icon: string
    dimensions: { width: number; height: number; depth: number }
    defaultHeatLoad: number
  }
}
