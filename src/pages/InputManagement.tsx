import React, { useState } from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { StepIndicator } from '../components/shared/Common'
import { useSimulationStore } from '../store/store'
import { MapPin, Zap, Wind, Droplets, Leaf, Maximize } from 'lucide-react'

const steps = [
  'Basic Configuration',
  'Cooling Technique',
  'Advanced Parameters',
  'Environmental Data',
  'Review & Submit',
]

export const InputManagement: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const { currentInput, setCurrentInput } = useSimulationStore()

  const initializeInput = () => {
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
  }

  React.useEffect(() => {
    initializeInput()
  }, [])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen bg-bg-light flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold font-poppins text-dark-gray mb-2">Simulation Wizard</h1>
          <p className="text-text-light mb-8">
            Configure your data center cooling simulation
          </p>

          <StepIndicator totalSteps={steps.length} currentStep={currentStep} steps={steps} />

          <div className="card min-h-96">
            {currentStep === 0 && <Step1BasicConfig />}
            {currentStep === 1 && <Step2CoolingTechnique />}
            {currentStep === 2 && <Step3AdvancedParameters />}
            {currentStep === 3 && <Step4EnvironmentalData />}
            {currentStep === 4 && <Step5ReviewSubmit />}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                currentStep === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'btn-outline'
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                currentStep === steps.length - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

const Step1BasicConfig: React.FC = () => {
  const { currentInput, updateSimulationInput } = useSimulationStore()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    updateSimulationInput({
      [name]: name === 'itLoad' || name === 'numberOfRacks' ? Number(value) : value,
    })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold font-poppins text-dark-gray">Basic Configuration</h3>

      <div>
        <label className="label">Data Center Name</label>
        <input
          type="text"
          name="dataCenterName"
          value={currentInput?.dataCenterName || ''}
          onChange={handleChange}
          placeholder="e.g., NYC Data Center 1"
          className="input-field"
        />
      </div>

      <div>
        <label className="label">Location</label>
        <div className="flex gap-2">
          <select
            name="location"
            value={currentInput?.location || ''}
            onChange={(e) =>
              updateSimulationInput({
                location: e.target.value,
              })
            }
            className="flex-1 input-field"
          >
            <option value="">Select location</option>
            <option value="New York">New York, USA</option>
            <option value="London">London, UK</option>
            <option value="Tokyo">Tokyo, Japan</option>
            <option value="Sydney">Sydney, Australia</option>
            <option value="Singapore">Singapore</option>
          </select>
          <button className="btn-secondary px-4">
            <MapPin size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">IT Load (kW)</label>
          <div className="flex items-center gap-3 input-field">
            <Zap size={20} className="text-secondary" />
            <input
              type="number"
              name="itLoad"
              value={currentInput?.itLoad || 0}
              onChange={handleChange}
              placeholder="500"
              className="flex-1 bg-transparent outline-none"
            />
          </div>
        </div>
        <div>
          <label className="label">Number of Racks</label>
          <div className="flex items-center gap-3 input-field">
            <Maximize size={20} className="text-secondary" />
            <input
              type="number"
              name="numberOfRacks"
              value={currentInput?.numberOfRacks || 0}
              onChange={handleChange}
              placeholder="50"
              className="flex-1 bg-transparent outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const Step2CoolingTechnique: React.FC = () => {
  const { currentInput, updateSimulationInput } = useSimulationStore()

  const techniques = [
    {
      id: 'air',
      title: 'Air Cooling',
      description: 'Traditional air-based cooling system',
      icon: Wind,
    },
    {
      id: 'water',
      title: 'Water Cooling',
      description: 'Liquid-based cooling for efficiency',
      icon: Droplets,
    },
    {
      id: 'evaporative',
      title: 'Evaporative Cooling',
      description: 'Sustainable cooling method',
      icon: Leaf,
    },
    {
      id: 'hybrid',
      title: 'Hybrid System',
      description: 'Combined cooling approach',
      icon: () => <span>⚙️</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold font-poppins text-dark-gray">Select Cooling Technique</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {techniques.map(({ id, title, description, icon: Icon }) => (
          <button
            key={id}
            onClick={() => updateSimulationInput({ coolingTechnique: id as any })}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              currentInput?.coolingTechnique === id
                ? 'border-primary bg-primary bg-opacity-10'
                : 'border-border-light hover:border-primary'
            }`}
          >
            <div className="flex items-start gap-3">
              <Icon className="w-8 h-8 text-primary mt-1" />
              <div>
                <p className="font-bold font-poppins text-dark-gray">{title}</p>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

const Step3AdvancedParameters: React.FC = () => {
  const { currentInput, updateSimulationInput } = useSimulationStore()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    updateSimulationInput({
      [name]: Number(value),
    })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold font-poppins text-dark-gray">Advanced Parameters</h3>

      <div className="bg-cyan-50 border-l-4 border-secondary p-4 rounded mb-6">
        <p className="text-sm font-poppins font-semibold text-dark-gray">
          ASHRAE Guidelines: Supply air 18-27°C | Chilled water 6-12°C
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Supply Air Temp (°C)</label>
          <input
            type="number"
            name="supplyAirTemp"
            value={currentInput?.supplyAirTemp || 20}
            onChange={handleChange}
            step="0.1"
            className="input-field"
          />
        </div>
        <div>
          <label className="label">Chilled Water Temp (°C)</label>
          <input
            type="number"
            name="chilledWaterTemp"
            value={currentInput?.chilledWaterTemp || 12}
            onChange={handleChange}
            step="0.1"
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label">Efficiency Factor</label>
        <input
          type="number"
          name="efficiencyFactor"
          value={currentInput?.efficiencyFactor || 0.85}
          onChange={handleChange}
          min="0.5"
          max="1"
          step="0.01"
          className="input-field"
        />
        <p className="text-xs text-gray-500 mt-1">Range: 0.5 - 1.0</p>
      </div>
    </div>
  )
}

const Step4EnvironmentalData: React.FC = () => {
  const { currentInput, updateSimulationInput } = useSimulationStore()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    updateSimulationInput({
      [name]: Number(value),
    })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold font-poppins text-dark-gray">Environmental & Regional Data</h3>

      <div className="card bg-cyan-50 border border-secondary">
        <p className="text-sm font-semibold font-poppins text-dark-gray mb-4">Auto-fetched Weather Data</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">Average Temp</p>
            <p className="font-bold text-dark-gray">22°C</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Humidity</p>
            <p className="font-bold text-dark-gray">65%</p>
          </div>
        </div>
      </div>

      <div>
        <label className="label">Electricity Tariff ($/kWh)</label>
        <input
          type="number"
          name="electricityTariff"
          value={currentInput?.electricityTariff || 0.12}
          onChange={handleChange}
          step="0.01"
          className="input-field"
        />
      </div>

      <div>
        <label className="label">CO₂ Emission Factor (kg/kWh)</label>
        <input
          type="number"
          name="co2EmissionFactor"
          value={currentInput?.co2EmissionFactor || 0.5}
          onChange={handleChange}
          step="0.01"
          className="input-field"
        />
      </div>
    </div>
  )
}

const Step5ReviewSubmit: React.FC = () => {
  const { currentInput, runSimulation } = useSimulationStore()
  const [isRunning, setIsRunning] = useState(false)

  const handleRunSimulation = async () => {
    if (currentInput) {
      setIsRunning(true)
      await runSimulation(currentInput)
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold font-poppins text-dark-gray">Review & Submit</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Data Center</p>
            <p className="font-semibold text-dark-gray">{currentInput?.dataCenterName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Location</p>
            <p className="font-semibold text-dark-gray">{currentInput?.location}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">IT Load</p>
            <p className="font-semibold text-dark-gray">{currentInput?.itLoad} kW</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cooling Technique</p>
            <p className="font-semibold text-dark-gray capitalize">{currentInput?.coolingTechnique}</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleRunSimulation}
        disabled={isRunning}
        className={`w-full py-3 rounded-lg font-bold transition-all ${
          isRunning ? 'bg-gray-300 cursor-not-allowed' : 'btn-primary'
        }`}
      >
        {isRunning ? 'Running Simulation...' : 'Run Simulation'}
      </button>
    </div>
  )
}
