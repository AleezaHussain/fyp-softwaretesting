import {
  DataCenterComponent,
  CoolingTechniqueConfig,
  LocationData,
  SimulationResults,
  TechniqueComparison,
  CoolingTechnique,
} from '../types/simulation'

export function generateMockResults(
  components: DataCenterComponent[],
  coolingConfig: CoolingTechniqueConfig,
  locationData: LocationData
): SimulationResults {
  const totalHeatLoad = calculateTotalHeatLoad(components)
  
  // Generate hourly energy consumption data (24 hours)
  const hourlyEnergyUse = Array.from({ length: 24 }, (_, i) => {
    const baseLoad = totalHeatLoad / 1.5
    const variance = Math.sin((i / 24) * Math.PI * 2) * (baseLoad * 0.3)
    return baseLoad + variance + (Math.random() - 0.5) * baseLoad * 0.2
  })

  // Generate temperature trends
  const temperatureTrends = hourlyEnergyUse.map((energy, i) => {
    const baseTemp = locationData.weatherData?.temperature || 20
    const coolingEffect = coolingConfig.technique === 'water' ? -5 : coolingConfig.technique === 'evaporative' ? -3 : -1
    return baseTemp + (energy / totalHeatLoad) * 10 + coolingEffect + (Math.random() - 0.5) * 2
  })

  // Calculate metrics based on technique and configuration
  const { pue, wue, efficiency } = calculateMetricsForTechnique(
    coolingConfig.technique,
    totalHeatLoad,
    locationData
  )

  const totalEnergy = hourlyEnergyUse.reduce((a, b) => a + b, 0)
  const estimatedCost = totalEnergy * locationData.electricityCost * 365
  const carbonFootprint = totalEnergy * 0.4 // kg CO2 per kWh average

  // Generate comparisons for all three techniques
  const comparisons: TechniqueComparison[] = [
    {
      technique: 'air',
      pue: 1.65,
      wue: 1.2,
      totalEnergy: totalEnergy * 1.1,
      estimatedCost: totalEnergy * 1.1 * locationData.electricityCost * 365,
      carbonFootprint: totalEnergy * 1.1 * 0.4,
      efficiency: 60,
    },
    {
      technique: 'water',
      pue: 1.35,
      wue: 0.8,
      totalEnergy: totalEnergy * 0.85,
      estimatedCost: totalEnergy * 0.85 * locationData.electricityCost * 365,
      carbonFootprint: totalEnergy * 0.85 * 0.4,
      efficiency: 85,
    },
    {
      technique: 'evaporative',
      pue: 1.5,
      wue: 2.5,
      totalEnergy: totalEnergy * 0.95,
      estimatedCost: totalEnergy * 0.95 * locationData.electricityCost * 365,
      carbonFootprint: totalEnergy * 0.95 * 0.4,
      efficiency: 72,
    },
  ]

  const recommended = 'water'
  const recommendationReason =
    'Liquid cooling provides the best balance of energy efficiency (85%) and cost-effectiveness, with a PUE of 1.35 - significantly better than traditional air cooling.'

  return {
    id: `sim-${Date.now()}`,
    timestamp: new Date().toISOString(),
    dataCenterConfig: {
      dataCenterName: 'Data Center Simulation',
      components,
      totalHeatLoad,
    },
    coolingConfig,
    locationData,
    comparisons,
    recommended: recommended as CoolingTechnique,
    recommendationReason,
    metrics: {
      pue,
      wue,
      totalEnergy,
      estimatedCost,
      carbonFootprint,
      hourlyEnergyUse,
      temperatureTrends,
    },
    thermalVisualization: components.map((comp, index) => ({
      componentId: comp.id,
      temperature: temperatureTrends[index % temperatureTrends.length],
      heatLoad: calculateComponentHeatLoad(comp.type) * comp.quantity,
      position: {
        x: (index % 5) * 20,
        y: Math.floor(index / 5) * 20,
        z: 0,
      },
    })),
  }
}

function calculateTotalHeatLoad(components: DataCenterComponent[]): number {
  const HEAT_LOADS: Record<string, number> = {
    server_rack: 15,
    router: 2,
    cooling_pump: 3,
    pdu: 1,
    storage_array: 20,
    backup_generator: 50,
  }

  return components.reduce((total, comp) => {
    return total + (HEAT_LOADS[comp.type] || 0) * comp.quantity
  }, 0)
}

function calculateComponentHeatLoad(type: string): number {
  const HEAT_LOADS: Record<string, number> = {
    server_rack: 15,
    router: 2,
    cooling_pump: 3,
    pdu: 1,
    storage_array: 20,
    backup_generator: 50,
  }
  return HEAT_LOADS[type] || 0
}

function calculateMetricsForTechnique(
  technique: string,
  heatLoad: number,
  locationData: LocationData
): {
  pue: number
  wue: number
  efficiency: number
} {
  // Mock calculations based on technique
  const baseMetrics = {
    air: { pue: 1.65, wue: 1.2, efficiency: 60 },
    water: { pue: 1.35, wue: 0.8, efficiency: 85 },
    evaporative: { pue: 1.5, wue: 2.5, efficiency: 72 },
  }

  const base = baseMetrics[technique as keyof typeof baseMetrics] || baseMetrics.air

  // Adjust based on location ambient temperature
  const tempVariance = locationData.weatherData
    ? (locationData.weatherData.temperature - 20) * 0.02
    : 0
  const adjustedPue = base.pue * (1 + tempVariance)

  return {
    pue: adjustedPue,
    wue: base.wue * (1 - tempVariance * 0.5),
    efficiency: base.efficiency - Math.abs(tempVariance) * 2,
  }
}
