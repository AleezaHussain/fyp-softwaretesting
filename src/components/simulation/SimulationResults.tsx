import React, { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Download, Share2, Check } from 'lucide-react'
import { SimulationResults as SimResults, TechniqueComparison, CoolingTechnique } from '../../types/simulation'
import { ThermalMap } from './ThermalMap'

interface SimulationResultsProps {
  results: SimResults
  onNewSimulation: () => void
}

const COLORS = {
  air: '#3b82f6',
  water: '#5ce1e5',
  evaporative: '#10b981',
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({ results, onNewSimulation }) => {
  const [activeTab, setActiveTab] = useState('metrics')
  const [simulationProgress, setSimulationProgress] = useState(0)

  // Simulate progress animation
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulationProgress((prev) => {
        if (prev >= 100) return 100
        return prev + Math.random() * 30
      })
    }, 200)

    return () => clearInterval(timer)
  }, [])

  const energyData = results.metrics.hourlyEnergyUse.map((value, index) => ({
    hour: index,
    energy: value,
  }))

  const temperatureData = results.metrics.temperatureTrends.map((temp, index) => ({
    hour: index,
    temperature: temp,
  }))

  const comparisonData = results.comparisons.map((comp) => ({
    name: comp.technique.charAt(0).toUpperCase() + comp.technique.slice(1),
    pue: comp.pue,
    efficiency: comp.efficiency,
  }))

  const costBreakdown = [
    { name: 'Cooling', value: results.metrics.estimatedCost * 0.4 },
    { name: 'IT Equipment', value: results.metrics.estimatedCost * 0.35 },
    { name: 'Maintenance', value: results.metrics.estimatedCost * 0.15 },
    { name: 'Other', value: results.metrics.estimatedCost * 0.1 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Simulation Results</h2>
        <p className="text-gray-300">Comprehensive analysis of your data center cooling configurations</p>
      </div>

      {/* Progress Bar */}
      {simulationProgress < 100 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[#1a1a2e]">Simulation Progress</h3>
            <span className="text-sm text-gray-600">{Math.round(simulationProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#5ce1e5] to-[#00d9ff] h-full transition-all duration-500"
              style={{ width: `${simulationProgress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-pulse w-2 h-2 bg-[#5ce1e5] rounded-full" />
            Analyzing thermal dynamics...
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="PUE"
          value={results.metrics.pue.toFixed(2)}
          unit="x"
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          label="WUE"
          value={results.metrics.wue.toFixed(2)}
          unit="L/kWh"
          color="text-cyan-600"
          bgColor="bg-cyan-50"
        />
        <MetricCard
          label="Total Energy"
          value={(results.metrics.totalEnergy / 1000).toFixed(1)}
          unit="MWh"
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        <MetricCard
          label="Est. Cost"
          value={`$${(results.metrics.estimatedCost / 1000).toFixed(1)}k`}
          unit="annual"
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <MetricCard
          label="Carbon"
          value={(results.metrics.carbonFootprint / 1000).toFixed(1)}
          unit="ton CO₂"
          color="text-green-600"
          bgColor="bg-green-50"
        />
      </div>

      {/* Recommendation Banner */}
      <div className="bg-gradient-to-r from-[#fd5757] to-red-600 rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Check size={20} />
              <h3 className="text-lg font-bold">Recommended Cooling Technique</h3>
            </div>
            <h4 className="text-2xl font-bold mb-2">
              {results.recommended.charAt(0).toUpperCase() + results.recommended.slice(1)} Cooling
            </h4>
            <p className="text-red-100">{results.recommendationReason}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-red-200">
              {
                results.comparisons.find((c) => c.technique === results.recommended)?.efficiency
                  .toFixed(1)
              }
              %
            </div>
            <div className="text-sm text-red-100">Efficiency</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {['metrics', 'comparison', 'thermal', 'cost'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 font-medium transition ${
                activeTab === tab
                  ? 'border-b-2 border-[#fd5757] text-[#fd5757] bg-red-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-4">Hourly Energy Consumption</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={energyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="#5ce1e5"
                      dot={false}
                      name="Energy (kW)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-4">Temperature Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={temperatureData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#fd5757"
                      dot={false}
                      name="Temperature (°C)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'comparison' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#1a1a2e]">Cooling Technique Comparison</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-4">PUE Comparison</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="pue" fill="#5ce1e5" name="PUE" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-4">Efficiency Comparison</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="efficiency" fill="#fd5757" name="Efficiency %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3">
                {results.comparisons.map((comp) => (
                  <div key={comp.technique} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-[#1a1a2e]">
                        {comp.technique.charAt(0).toUpperCase() + comp.technique.slice(1)} Cooling
                      </h4>
                      <span className="text-sm font-medium text-gray-600">
                        {comp.efficiency.toFixed(1)}% efficient
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <div className="text-gray-600">PUE</div>
                        <div className="font-semibold">{comp.pue.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">WUE</div>
                        <div className="font-semibold">{comp.wue.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Energy</div>
                        <div className="font-semibold">{(comp.totalEnergy / 1000).toFixed(1)} MWh</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Cost</div>
                        <div className="font-semibold">${(comp.totalEnergy * 0.12).toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'thermal' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#1a1a2e]">Thermal Visualization</h3>
              <ThermalMap
                thermalData={results.thermalVisualization}
              />
            </div>
          )}

          {activeTab === 'cost' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#1a1a2e]">Cost Breakdown</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={costBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#5ce1e5" />
                        <Cell fill="#fd5757" />
                        <Cell fill="#fbbf24" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {costBreakdown.map((item) => (
                    <div key={item.name} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">{item.name}</span>
                        <span className="font-bold text-[#1a1a2e]">
                          ${item.value.toFixed(0)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {((item.value / results.metrics.estimatedCost) * 100).toFixed(1)}% of total
                      </div>
                    </div>
                  ))}

                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mt-4">
                    <div className="text-sm text-gray-600">Annual Total Cost</div>
                    <div className="text-3xl font-bold text-[#5ce1e5]">
                      ${results.metrics.estimatedCost.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export & Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-[#1a1a2e] mb-4">Export & Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 rounded-lg font-medium hover:bg-blue-100 transition">
            <Download size={18} />
            PDF Report
          </button>
          <button className="flex items-center justify-center gap-2 bg-green-50 text-green-600 py-3 rounded-lg font-medium hover:bg-green-100 transition">
            <Download size={18} />
            CSV Data
          </button>
          <button className="flex items-center justify-center gap-2 bg-purple-50 text-purple-600 py-3 rounded-lg font-medium hover:bg-purple-100 transition">
            <Share2 size={18} />
            Share
          </button>
          <button
            onClick={onNewSimulation}
            className="flex items-center justify-center gap-2 bg-[#fd5757] text-white py-3 rounded-lg font-medium hover:bg-red-600 transition"
          >
            New Simulation
          </button>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string
  unit: string
  color: string
  bgColor: string
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, color, bgColor }) => (
  <div className={`${bgColor} rounded-lg p-4 border border-gray-200`}>
    <div className="text-xs text-gray-600 mb-1">{label}</div>
    <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
    <div className="text-xs text-gray-500">{unit}</div>
  </div>
)
