import React, { useState, useCallback, useRef } from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { ErrorBoundary } from '../components/shared/ErrorBoundary'
import { useSimulationStore } from '../store/store'
import { CheckCircle2, Zap, Droplet, Wind, ArrowRight, Sparkles } from 'lucide-react'
import AirSideEconomization from '../components/simulation/AirSideEconomization'
import { ShimmerLoader } from '../components/loaders/ModernLoader'

const steps = ['Start', 'Cooling Technique', 'Parameters', 'Review & Submit']

export const InputManagement: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null)
  const configRef = useRef<any>(null)
  const { currentInput, setCurrentInput, updateSimulationInput, runSimulation } = useSimulationStore()

  const handleStepChange = (newStep: number) => {
    // Capture config before moving to next step
    if (currentStep === 2 && configRef.current) {
      updateSimulationInput({ 
        coolingTechnique: selectedTechnique || 'air', 
        airSideConfig: configRef.current 
      } as any)
    }
    setCurrentStep(newStep)
  }

  const handleTechniqueSelect = (techId: string) => {
    setSelectedTechnique(techId)
    setCurrentStep(2)
  }

  const handleSubmit = async () => {
    // Capture config before submitting
    if (configRef.current) {
      updateSimulationInput({ 
        coolingTechnique: selectedTechnique || 'air', 
        airSideConfig: configRef.current 
      } as any)
    }
    if (currentInput) {
      await runSimulation(currentInput)
    }
  }

  // Store config in ref without triggering parent re-renders
  const handleConfigChange = useCallback((config: any) => {
    configRef.current = config
  }, [])

  const coolingTechniques = [
    {
      id: 'air',
      name: 'Air-Side Economization',
      description: 'Use cooler outdoor air for data center cooling',
      icon: Wind,
      color: 'from-blue-400 to-cyan-400',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      id: 'water',
      name: 'Water-Side Cooling',
      description: 'Implement water-based cooling systems',
      icon: Droplet,
      color: 'from-purple-400 to-blue-400',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      id: 'evaporative',
      name: 'Evaporative Cooling',
      description: 'Use evaporative cooling for efficiency',
      icon: Sparkles,
      color: 'from-emerald-400 to-teal-400',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
  ]

  React.useEffect(() => {
    if (!currentInput) {
      setCurrentInput({
        dataCenterName: '',
        location: '',
        itLoad: 0,
        numberOfRacks: 0,
        coolingTechnique: 'air',
        supplyAirTemp: 20,
        chilledWaterTemp: 12,
        efficiencyFactor: 0.85,
        electricityTariff: 0.12,
        co2EmissionFactor: 0.5,
        reviewed: false,
      })
    }
  }, [])

  // Step 0 - Welcome
  const Step0Welcome = () => (
    <div className="space-y-8 max-w-2xl mx-auto animate-fade-in">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#5ce1e5] to-[#fd5757] rounded-2xl shadow-lg">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#1a1a2e] to-[#5ce1e5] bg-clip-text text-transparent">
          Data Center Cooling Optimization
        </h1>
        <p className="text-xl text-gray-600 leading-relaxed">
          Discover how to reduce energy consumption and costs with intelligent cooling strategies
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 py-8">
        {[
          { icon: Zap, label: 'Energy Efficient', color: 'text-yellow-500' },
          { icon: Droplet, label: 'Cost Effective', color: 'text-blue-500' },
          { icon: Wind, label: 'Sustainable', color: 'text-green-500' },
        ].map((feature, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 text-center hover:shadow-lg transition-shadow">
            <feature.icon className={`w-6 h-6 mx-auto mb-2 ${feature.color}`} />
            <div className="text-sm font-medium text-gray-700">{feature.label}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-6">
        <button
          onClick={() => handleStepChange(1)}
          className="group px-8 py-4 bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white rounded-xl font-semibold flex items-center gap-3 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          Get Started
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )

  // Step 1 - Cooling Technique Selection
  const Step1CoolingTechnique = () => (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-[#1a1a2e]">Select Your Cooling Strategy</h2>
        <p className="text-gray-600">Choose the technique that best fits your data center needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {coolingTechniques.map((technique) => {
          const TechIcon = technique.icon
          return (
            <button
              key={technique.id}
              onClick={() => handleTechniqueSelect(technique.id)}
              className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                selectedTechnique === technique.id
                  ? `${technique.borderColor} bg-gradient-to-br ${technique.color} text-white shadow-xl`
                  : `border-gray-200 ${technique.bgColor} hover:border-gray-300`
              }`}
            >
              <div className={`absolute inset-0 rounded-2xl blur-xl opacity-0 transition-opacity group-hover:opacity-40 ${
                selectedTechnique === technique.id ? 'opacity-40' : ''
              } pointer-events-none`} />

              <div className="relative space-y-3 text-left">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                  selectedTechnique === technique.id ? 'bg-white/20' : 'bg-gradient-to-br from-gray-200 to-gray-100'
                }`}>
                  <TechIcon className={`w-6 h-6 ${
                    selectedTechnique === technique.id ? 'text-white' : 'text-gray-700'
                  }`} />
                </div>

                <div>
                  <h3 className={`font-bold text-lg ${
                    selectedTechnique === technique.id ? 'text-white' : 'text-[#1a1a2e]'
                  }`}>
                    {technique.name}
                  </h3>
                  <p className={`text-sm leading-relaxed ${
                    selectedTechnique === technique.id ? 'text-white/90' : 'text-gray-600'
                  }`}>
                    {technique.description}
                  </p>
                </div>

                {selectedTechnique === technique.id && (
                  <div className="pt-2 flex items-center gap-2 text-white/90">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-xs font-medium">Selected</span>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  // Step 2 - Parameters
  const Step2Parameters = () => {
    if (selectedTechnique === 'air') {
      return (
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-bold text-[#1a1a2e]">Configure Air-Side Economization</h2>
            <p className="text-gray-600">Set your parameters for optimal cooling efficiency</p>
          </div>
          <AirSideEconomization
            serverType={"dell_poweredge_r750"}
            numberOfRacks={currentInput?.numberOfRacks || 5}
            serversPerRack={10}
            averageUtilization={45}
            peakUtilization={85}
            fans={{ bestFans: 2, averageFans: 4, oldFans: 0 }}
            region={"us_northeast"}
            onConfigChange={handleConfigChange}
          />
        </div>
      )
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <ShimmerLoader className="h-96 w-full rounded-xl" />
        <div className="text-center text-gray-500">Coming soon...</div>
      </div>
    )
  }

  // Step 3 - Review
  const Step3ReviewSubmit = () => (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-[#1a1a2e]">Review Your Configuration</h2>
        <p className="text-gray-600">Verify all settings before running the simulation</p>
      </div>

      <div className="space-y-4">
        <div className="p-6 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5ce1e5] to-blue-400 flex items-center justify-center">
                <Wind className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-[#1a1a2e]">Cooling Technique</div>
                <div className="text-sm text-gray-600">{coolingTechniques.find(t => t.id === selectedTechnique)?.name || 'Not selected'}</div>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
        </div>

        {selectedTechnique === 'air' && (
          <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
            <div className="font-semibold text-[#1a1a2e] mb-4">Configuration Summary</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Servers', value: currentInput?.numberOfRacks ? (currentInput.numberOfRacks * 10).toString() : 'N/A' },
                { label: 'Fan Type Mix', value: 'Best/Avg/Old' },
                { label: 'Region', value: 'US Northeast' },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">{item.label}</div>
                  <div className="text-lg font-bold text-[#1a1a2e]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4 pt-8">
        <button
          onClick={() => handleStepChange(2)}
          className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="px-8 py-3 bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105"
        >
          Run Simulation
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex">
      <Sidebar />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#5ce1e5]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#fd5757]/10 to-transparent rounded-full blur-3xl" />
      </div>

      <main className="flex-1 lg:ml-64">
        <div className="relative">
          {/* Header with progress */}
          <div className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-6 py-8">
              <div className="flex items-center justify-between">
                {steps.map((_step, idx) => (
                  <div key={idx} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => idx < currentStep && handleStepChange(idx)}
                      disabled={idx > currentStep}
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all transform ${
                        idx < currentStep
                          ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                          : idx === currentStep
                          ? 'bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white scale-110 shadow-lg'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {idx < currentStep ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </button>

                    {idx < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-4 rounded-full transition-all ${
                        idx < currentStep ? 'bg-green-400' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm font-semibold text-gray-600">
                STEP {currentStep + 1} OF {steps.length}: <span className="text-[#1a1a2e]">{steps[currentStep]}</span>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="max-w-6xl mx-auto px-6 py-12">
            <ErrorBoundary>
              <>
                {currentStep === 0 && <Step0Welcome />}
                {currentStep === 1 && <Step1CoolingTechnique />}
                {currentStep === 2 && <Step2Parameters />}
                {currentStep === 3 && <Step3ReviewSubmit />}
              </>
            </ErrorBoundary>
          </div>

          {/* Footer navigation */}
          {currentStep > 0 && (
            <div className="max-w-6xl mx-auto px-6 pb-12 flex justify-between">
              <button
                onClick={() => handleStepChange(currentStep - 1)}
                className="px-6 py-3 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all"
              >
                ← Back
              </button>
              {currentStep < steps.length - 1 && (
                <button
                  onClick={() => handleStepChange(currentStep + 1)}
                  className="px-6 py-3 bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  Next →
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default InputManagement
