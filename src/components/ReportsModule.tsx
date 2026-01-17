import React, { useState } from 'react'
import { Download, Eye, Trash2, BarChart3, Filter } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import { SimulationResults } from '../types/simulation'

// Mock data for past simulations
const MOCK_SIMULATIONS: SimulationResults[] = [
  {
    id: 'sim-001',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    dataCenterConfig: {
      dataCenterName: 'North Data Center',
      components: [],
      totalHeatLoad: 150,
    },
    coolingConfig: { technique: 'water' },
    locationData: {
      latitude: 40.7128,
      longitude: -74.006,
      city: 'New York',
      country: 'USA',
      weatherData: { temperature: 15, humidity: 65, timestamp: '' },
      electricityCost: 0.15,
      ashraeLow: 18,
      ashraHigh: 27,
    },
    comparisons: [
      {
        technique: 'air',
        pue: 1.65,
        wue: 1.2,
        totalEnergy: 1650,
        estimatedCost: 45000,
        carbonFootprint: 660,
        efficiency: 60,
      },
      {
        technique: 'water',
        pue: 1.35,
        wue: 0.8,
        totalEnergy: 1400,
        estimatedCost: 38000,
        carbonFootprint: 560,
        efficiency: 85,
      },
      {
        technique: 'evaporative',
        pue: 1.5,
        wue: 2.5,
        totalEnergy: 1500,
        estimatedCost: 40000,
        carbonFootprint: 600,
        efficiency: 72,
      },
    ],
    recommended: 'water',
    recommendationReason: 'Best efficiency at lowest cost',
    metrics: {
      pue: 1.35,
      wue: 0.8,
      totalEnergy: 1400,
      estimatedCost: 38000,
      carbonFootprint: 560,
      hourlyEnergyUse: [],
      temperatureTrends: [],
    },
    thermalVisualization: [],
  },
  {
    id: 'sim-002',
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    dataCenterConfig: {
      dataCenterName: 'South Data Center',
      components: [],
      totalHeatLoad: 200,
    },
    coolingConfig: { technique: 'air' },
    locationData: {
      latitude: 35.6762,
      longitude: 139.6503,
      city: 'Tokyo',
      country: 'Japan',
      weatherData: { temperature: 12, humidity: 70, timestamp: '' },
      electricityCost: 0.2,
      ashraeLow: 18,
      ashraHigh: 27,
    },
    comparisons: [
      {
        technique: 'air',
        pue: 1.7,
        wue: 1.3,
        totalEnergy: 2140,
        estimatedCost: 42800,
        carbonFootprint: 856,
        efficiency: 58,
      },
      {
        technique: 'water',
        pue: 1.4,
        wue: 0.9,
        totalEnergy: 1800,
        estimatedCost: 36000,
        carbonFootprint: 720,
        efficiency: 82,
      },
      {
        technique: 'evaporative',
        pue: 1.55,
        wue: 2.7,
        totalEnergy: 1950,
        estimatedCost: 39000,
        carbonFootprint: 780,
        efficiency: 70,
      },
    ],
    recommended: 'water',
    recommendationReason: 'Superior efficiency for tropical climate',
    metrics: {
      pue: 1.7,
      wue: 1.3,
      totalEnergy: 2140,
      estimatedCost: 42800,
      carbonFootprint: 856,
      hourlyEnergyUse: [],
      temperatureTrends: [],
    },
    thermalVisualization: [],
  },
  {
    id: 'sim-003',
    timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    dataCenterConfig: {
      dataCenterName: 'Central Data Center',
      components: [],
      totalHeatLoad: 180,
    },
    coolingConfig: { technique: 'evaporative' },
    locationData: {
      latitude: 51.5074,
      longitude: -0.1278,
      city: 'London',
      country: 'UK',
      weatherData: { temperature: 10, humidity: 70, timestamp: '' },
      electricityCost: 0.18,
      ashraeLow: 18,
      ashraHigh: 27,
    },
    comparisons: [
      {
        technique: 'air',
        pue: 1.68,
        wue: 1.25,
        totalEnergy: 1870,
        estimatedCost: 33660,
        carbonFootprint: 748,
        efficiency: 59,
      },
      {
        technique: 'water',
        pue: 1.37,
        wue: 0.85,
        totalEnergy: 1530,
        estimatedCost: 27540,
        carbonFootprint: 612,
        efficiency: 84,
      },
      {
        technique: 'evaporative',
        pue: 1.52,
        wue: 2.6,
        totalEnergy: 1690,
        estimatedCost: 30420,
        carbonFootprint: 676,
        efficiency: 71,
      },
    ],
    recommended: 'water',
    recommendationReason: 'Best energy and cost efficiency',
    metrics: {
      pue: 1.52,
      wue: 2.6,
      totalEnergy: 1690,
      estimatedCost: 30420,
      carbonFootprint: 676,
      hourlyEnergyUse: [],
      temperatureTrends: [],
    },
    thermalVisualization: [],
  },
]

interface ReportFilters {
  technique?: string
  dateRange?: 'week' | 'month' | 'quarter' | 'year'
}

export const ReportsModule: React.FC = () => {
  const [selectedSimulations, setSelectedSimulations] = useState<string[]>([])
  const [filters, setFilters] = useState<ReportFilters>({})
  const [showComparison, setShowComparison] = useState(false)
  const [expandedReport, setExpandedReport] = useState<string | null>(null)

  const handleToggleSelection = (id: string) => {
    setSelectedSimulations((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const filteredSimulations = MOCK_SIMULATIONS.filter((sim) => {
    if (filters.technique && sim.recommended !== filters.technique) {
      return false
    }
    return true
  })

  const comparisonData = selectedSimulations
    .map((id) => MOCK_SIMULATIONS.find((s) => s.id === id))
    .filter(Boolean)
    .map((sim) => ({
      name: sim!.dataCenterConfig.dataCenterName,
      pue: sim!.metrics.pue,
      wue: sim!.metrics.wue,
      energy: sim!.metrics.totalEnergy / 1000,
      cost: sim!.metrics.estimatedCost / 1000,
    }))

  // Summary data used for the comparison UI cards and charts (demo/sample values)
  const techniquesSummary = [
    { id: 'air', name: 'Air Cooling', efficiency: 82, initialCost: 45000, energyUse: 520, maintenance: 'Low', recommended: false, colorHeader: '#e6fbff' },
    { id: 'water', name: 'Liquid Cooling', efficiency: 94, initialCost: 125000, energyUse: 380, maintenance: 'Medium', recommended: true, colorHeader: '#fdecea' },
    { id: 'evaporative', name: 'Evaporative', efficiency: 88, initialCost: 75000, energyUse: 450, maintenance: 'Medium', recommended: false, colorHeader: '#eafffb' },
    { id: 'hybrid', name: 'Hybrid System', efficiency: 91, initialCost: 95000, energyUse: 410, maintenance: 'High', recommended: false, colorHeader: '#fff5f6' },
  ]

  const radarData = [
    { subject: 'Efficiency', air: 82, water: 94, hybrid: 91 },
    { subject: 'Reliability', air: 85, water: 92, hybrid: 88 },
    { subject: 'Scalability', air: 78, water: 88, hybrid: 90 },
    { subject: 'Implementation', air: 80, water: 75, hybrid: 82 },
    { subject: 'Performance', air: 79, water: 93, hybrid: 89 },
  ]

  const costBarData = [
    { name: 'Annual Operating', air: 50, water: 130 },
    { name: 'Maintenance', air: 10, water: 20 },
    { name: '5-Year Total', air: 200, water: 260 },
  ]

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Simulation Reports</h1>
          <p className="text-gray-600 text-sm mt-1">
            View, analyze, and compare past simulations
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Comparison Tool */}
        {showComparison && selectedSimulations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#1a1a2e]">
                Comparing {selectedSimulations.length} Simulations
              </h2>
              <button
                onClick={() => setShowComparison(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Comparison Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">PUE & WUE</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="pue" fill="#5ce1e5" name="PUE" />
                    <Bar dataKey="wue" fill="#fd5757" name="WUE" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-4">Energy & Cost</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="energy" fill="#10b981" name="Energy (MWh)" />
                    <Bar dataKey="cost" fill="#f59e0b" name="Cost ($1000s)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter size={20} className="text-gray-600" />
            <select
              value={filters.technique || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  technique: e.target.value || undefined,
                }))
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
            >
              <option value="">All Techniques</option>
              <option value="air">Air Cooling</option>
              <option value="water">Liquid Cooling</option>
              <option value="evaporative">Evaporative Cooling</option>
            </select>

            {selectedSimulations.length > 0 && (
              <button
                onClick={() => setShowComparison(true)}
                className="bg-[#5ce1e5] text-[#1a1a2e] px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-400 transition"
              >
                Compare Selected ({selectedSimulations.length})
              </button>
            )}
          </div>
        </div>

        {/* Comparison View (cards + charts) */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <a href="/dashboard" className="text-sm text-gray-500 hover:underline inline-flex items-center gap-2">← Back to Dashboard</a>
              <h2 className="text-2xl font-semibold text-[#1a1a2e] mt-3">Cooling Technique Comparison</h2>
              <p className="text-sm text-gray-600 mt-1">Side-by-side analysis of different cooling approaches</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-[#fd5757] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:brightness-95 transition">
                <Download size={16} />
                Generate Report
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {techniquesSummary.map((t) => (
              <div key={t.id} className={`relative bg-white rounded-lg border p-5 shadow-sm transition ${t.recommended ? 'border-[#fd5757] bg-red-50' : 'border-gray-200'}`}>
                {t.recommended && (
                  <div className="absolute -top-3 right-3 bg-[#fd5757] text-white text-xs px-3 py-1 rounded-full">Recommended</div>
                )}
                <div className="h-10 rounded-md mb-4" style={{ background: t.colorHeader }} />
                <h3 className="font-semibold text-[#1a1a2e] mb-3">{t.name}</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between"><span>Efficiency:</span><span className="font-semibold">{t.efficiency}%</span></div>
                  <div className="flex justify-between"><span>Initial Cost:</span><span className="font-semibold">${(t.initialCost / 1000).toFixed(0)}K</span></div>
                  <div className="flex justify-between"><span>Energy Use:</span><span className="font-semibold">{t.energyUse} kWh</span></div>
                  <div className="flex justify-between"><span>Maintenance:</span><span className="font-semibold">{t.maintenance}</span></div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Performance Comparison</h3>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart cx="50%" cy="50%" outerRadius={120} data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis />
                  <Radar name="Air Cooling" dataKey="air" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                  <Radar name="Liquid Cooling" dataKey="water" stroke="#fd5757" fill="#fd5757" fillOpacity={0.25} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Cost Analysis ($K)</h3>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={costBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="air" fill="#3b82f6" name="Air Cooling" />
                  <Bar dataKey="water" fill="#fd5757" name="Liquid Cooling" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {filteredSimulations.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-3">📊</div>
            <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">No Reports Found</h3>
            <p className="text-gray-600">
              Create your first simulation to generate reports
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface MetricBadgeProps {
  label: string
  value: string
  unit?: string
}

const MetricBadge: React.FC<MetricBadgeProps> = ({ label, value, unit }) => (
  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
    <div className="text-xs text-gray-600 mb-1">{label}</div>
    <div className="text-lg font-bold text-[#1a1a2e]">{value}</div>
    {unit && <div className="text-xs text-gray-500">{unit}</div>}
  </div>
)
