import React, { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { DataCenterConfig } from '../components/simulation/DataCenterConfig'
import { CoolingSelection } from '../components/simulation/CoolingSelection'
import { LocationEnvironment } from '../components/simulation/LocationEnvironment'
import { SimulationResults } from '../components/simulation/SimulationResults'
import { generateMockResults } from '../utils/simulationUtils'
import {
  DataCenterComponent,
  CoolingTechniqueConfig,
  LocationData,
  SimulationInput,
  SimulationResults as SimResultsType,
  TechniqueComparison,
  CoolingTechnique,
} from '../types/simulation'

type SimulationStep = 1 | 2 | 3 | 4

interface NewSimulationState {
  currentStep: SimulationStep
  components: DataCenterComponent[]
  coolingConfig?: CoolingTechniqueConfig
  locationData?: LocationData
  results?: SimResultsType
}

export const NewSimulation: React.FC = () => {
  const [state, setState] = useState<NewSimulationState>({
    currentStep: 1,
    components: [],
  })

  const calculateTotalHeatLoad = () => {
    const HEAT_LOADS: Record<string, number> = {
      server_rack: 15,
      router: 2,
      cooling_pump: 3,
      pdu: 1,
      storage_array: 20,
      backup_generator: 50,
    }

    return state.components.reduce((total, comp) => {
      return total + (HEAT_LOADS[comp.type] || 0) * comp.quantity
    }, 0)
  }

  const handleAddComponent = (component: DataCenterComponent) => {
    setState((prev) => ({
      ...prev,
      components: [...prev.components, component],
    }))
  }

  const handleRemoveComponent = (id: string) => {
    setState((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== id),
    }))
  }

  const handleProceedToCooling = () => {
    setState((prev) => ({
      ...prev,
      currentStep: 2,
    }))
  }

  const handleCoolingSelect = (config: CoolingTechniqueConfig) => {
    setState((prev) => ({
      ...prev,
      coolingConfig: config,
      currentStep: 3,
    }))
  }

  const handleLocationConfirm = (locationData: LocationData) => {
    // Simulate running the simulation
    setState((prev) => ({
      ...prev,
      locationData,
      currentStep: 4,
    }))

    // Generate mock results
    setTimeout(() => {
      const mockResults = generateMockResults(
        state.components,
        state.coolingConfig!,
        locationData
      )
      setState((prev) => ({
        ...prev,
        results: mockResults,
      }))
    }, 2000)
  }

  const handleBackToCooling = () => {
    setState((prev) => ({
      ...prev,
      currentStep: 2,
    }))
  }

  const handleBackToConfig = () => {
    setState((prev) => ({
      ...prev,
      currentStep: 1,
    }))
  }

  const handleNewSimulation = () => {
    setState({
      currentStep: 1,
      components: [],
    })
  }

  const progressPercentage = (state.currentStep / 4) * 100

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <span>Simulations</span>
            <ChevronRight size={16} />
            <span className="font-medium text-[#1a1a2e]">New Simulation</span>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex-1">
                <div
                  className={`h-1 rounded-full transition ${
                    step <= state.currentStep ? 'bg-[#5ce1e5]' : 'bg-gray-200'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-20">
              <h3 className="font-bold text-[#1a1a2e] mb-4">Steps</h3>
              <div className="space-y-2">
                {[
                  { step: 1, label: 'Data Center Config' },
                  { step: 2, label: 'Cooling Selection' },
                  { step: 3, label: 'Location & Environment' },
                  { step: 4, label: 'Results' },
                ].map((item) => (
                  <div
                    key={item.step}
                    className={`p-3 rounded-lg transition ${
                      state.currentStep === item.step
                        ? 'bg-[#fd5757] text-white'
                        : state.currentStep > item.step
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="font-semibold text-sm">Step {item.step}</div>
                    <div className="text-xs">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {state.currentStep === 1 && (
              <DataCenterConfig
                components={state.components}
                onAddComponent={handleAddComponent}
                onRemoveComponent={handleRemoveComponent}
                totalHeatLoad={calculateTotalHeatLoad()}
                onProceed={handleProceedToCooling}
              />
            )}

            {state.currentStep === 2 && (
              <CoolingSelection
                onSelect={handleCoolingSelect}
                onBack={handleBackToConfig}
              />
            )}

            {state.currentStep === 3 && (
              <LocationEnvironment
                onConfirm={handleLocationConfirm}
                onBack={handleBackToCooling}
              />
            )}

            {state.currentStep === 4 && state.results && (
              <SimulationResults
                results={state.results}
                onNewSimulation={handleNewSimulation}
              />
            )}

            {state.currentStep === 4 && !state.results && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="flex flex-col items-center justify-center min-h-96">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#5ce1e5] mb-4" />
                  <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">
                    Running Simulation
                  </h3>
                  <p className="text-gray-600">
                    Analyzing your data center configuration...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
