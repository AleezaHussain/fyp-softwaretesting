import React, { useState, useMemo } from 'react'
import { Wind, Droplets, Cloud } from 'lucide-react'
import { CoolingTechnique, CoolingTechniqueConfig } from '../../types/simulation'
import { CoolingEfficiencyPreview } from './CoolingEfficiencyPreview'

interface CoolingSelectionProps {
  onSelect: (config: CoolingTechniqueConfig) => void
  onBack: () => void
}

const TECHNIQUES = [
  {
    id: 'air' as CoolingTechnique,
    name: 'Air Cooling',
    icon: Wind,
    description: 'Traditional air-based cooling',
    params: ['Supply Temperature', 'Airflow Rate', 'Economizer Option'],
    color: 'from-blue-400 to-blue-600',
  },
  {
    id: 'water' as CoolingTechnique,
    name: 'Liquid Cooling',
    icon: Droplets,
    description: 'Direct-to-chip or immersion cooling',
    params: ['Coolant Type', 'Flow Rate', 'Heat Exchanger Efficiency'],
    color: 'from-cyan-400 to-cyan-600',
  },
  {
    id: 'evaporative' as CoolingTechnique,
    name: 'Evaporative Cooling',
    icon: Cloud,
    description: 'Water evaporation-based cooling',
    params: ['Water Source', 'Evaporation Rate', 'Humidity Limits'],
    color: 'from-teal-400 to-teal-600',
  },
]

export const CoolingSelection: React.FC<CoolingSelectionProps> = ({ onSelect, onBack }) => {
  const [selectedTechnique, setSelectedTechnique] = useState<CoolingTechnique | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})

  // Mock comparison data for efficiency preview
  const comparisonData = useMemo(() => {
    return [
      {
        technique: 'air' as CoolingTechnique,
        name: 'Air Cooling',
        efficiency: 0.68,
        pue: 2.2,
        wue: 1.8,
        cost: 45000,
        costPerYear: 125000,
      },
      {
        technique: 'water' as CoolingTechnique,
        name: 'Liquid Cooling',
        efficiency: 0.85,
        pue: 1.4,
        wue: 0.8,
        cost: 120000,
        costPerYear: 85000,
      },
      {
        technique: 'evaporative' as CoolingTechnique,
        name: 'Evaporative Cooling',
        efficiency: 0.75,
        pue: 1.7,
        wue: 2.5,
        cost: 65000,
        costPerYear: 95000,
      },
    ]
  }, [])

  const handleTechniqueSelect = (technique: CoolingTechnique) => {
    setSelectedTechnique(technique)
    setFormData({})
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleProceed = () => {
    if (!selectedTechnique) return

    const config: CoolingTechniqueConfig = {
      technique: selectedTechnique,
      supplyTemp: formData.supplyTemp,
      airflowRate: formData.airflowRate,
      economizerEnabled: formData.economizer,
      coolantType: formData.coolantType,
      flowRate: formData.flowRate,
      hxEfficiency: formData.hxEfficiency,
      waterSource: formData.waterSource,
      evaporationRate: formData.evaporationRate,
      humidityLimit: formData.humidityLimit,
    }

    onSelect(config)
  }

  const selectedTechniqueData = TECHNIQUES.find((t) => t.id === selectedTechnique)

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Cooling Technique Selection</h2>
        <p className="text-gray-300">Choose the most suitable cooling method for your data center</p>
      </div>

      {/* Technique Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TECHNIQUES.map((tech) => {
          const Icon = tech.icon
          const isSelected = selectedTechnique === tech.id

          return (
            <button
              key={tech.id}
              onClick={() => handleTechniqueSelect(tech.id)}
              className={`p-6 rounded-lg text-left transition border-2 ${
                isSelected
                  ? 'border-[#fd5757] bg-gradient-to-br from-red-50 to-pink-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tech.color} flex items-center justify-center mb-3`}>
                <Icon className="text-white" size={24} />
              </div>
              <h3 className="font-bold text-lg text-[#1a1a2e] mb-2">{tech.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{tech.description}</p>
              <div className="space-y-1">
                {tech.params.map((param) => (
                  <div key={param} className="text-xs text-gray-500">
                    • {param}
                  </div>
                ))}
              </div>
              {isSelected && (
                <div className="mt-4 inline-block bg-[#fd5757] text-white text-xs font-semibold px-3 py-1 rounded">
                  Selected
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Efficiency Comparison Preview */}
      {selectedTechnique && (
        <CoolingEfficiencyPreview
          comparisons={comparisonData}
          selectedTechnique={selectedTechnique}
        />
      )}

      {/* Parameter Form */}
      {selectedTechnique && selectedTechniqueData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-[#1a1a2e] mb-4">
            {selectedTechniqueData.name} Parameters
          </h3>

          <div className="space-y-4">
            {selectedTechnique === 'air' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supply Air Temperature (°C)
                  </label>
                  <input
                    type="number"
                    value={formData.supplyTemp || 18}
                    onChange={(e) => handleInputChange('supplyTemp', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Airflow Rate (CFM)
                  </label>
                  <input
                    type="number"
                    value={formData.airflowRate || 5000}
                    onChange={(e) => handleInputChange('airflowRate', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.economizer || false}
                    onChange={(e) => handleInputChange('economizer', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Economizer Mode</span>
                </label>
              </>
            )}

            {selectedTechnique === 'water' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coolant Type
                  </label>
                  <select
                    value={formData.coolantType || 'water'}
                    onChange={(e) => handleInputChange('coolantType', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
                  >
                    <option value="water">Water</option>
                    <option value="glycol">Glycol Mix</option>
                    <option value="dielectric">Dielectric Fluid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flow Rate (GPM)
                  </label>
                  <input
                    type="number"
                    value={formData.flowRate || 50}
                    onChange={(e) => handleInputChange('flowRate', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heat Exchanger Efficiency (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.hxEfficiency || 85}
                    onChange={(e) => handleInputChange('hxEfficiency', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
                  />
                </div>
              </>
            )}

            {selectedTechnique === 'evaporative' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Water Source
                  </label>
                  <select
                    value={formData.waterSource || 'mains'}
                    onChange={(e) => handleInputChange('waterSource', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
                  >
                    <option value="mains">Mains Water</option>
                    <option value="recycled">Recycled Water</option>
                    <option value="rainwater">Rainwater Harvesting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evaporation Rate (kg/s)
                  </label>
                  <input
                    type="number"
                    value={formData.evaporationRate || 5}
                    onChange={(e) => handleInputChange('evaporationRate', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Humidity Limit (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.humidityLimit || 60}
                    onChange={(e) => handleInputChange('humidityLimit', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          Back
        </button>
        <button
          onClick={handleProceed}
          disabled={!selectedTechnique}
          className="flex-1 bg-[#5ce1e5] text-[#1a1a2e] py-3 rounded-lg font-semibold hover:bg-cyan-400 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          Next: Location & Environment
        </button>
      </div>
    </div>
  )
}
