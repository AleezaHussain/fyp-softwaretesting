import React, { useState } from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { Sliders, CheckCircle } from 'lucide-react'

export const Advisory: React.FC = () => {
  const [itLoad, setItLoad] = useState(500)
  const [efficiency, setEfficiency] = useState(0.85)
  const [location, setLocation] = useState('temperate')

  const techniques = [
    {
      name: 'Water Cooling',
      pue: 1.3,
      cost: 150000,
      co2: 2.5,
      efficiency: 92,
      recommended: true,
      pros: ['High efficiency', 'Lower operating costs', 'Reduced carbon footprint'],
      cons: ['Higher initial investment', 'Requires maintenance'],
    },
    {
      name: 'Air Cooling',
      pue: 1.7,
      cost: 80000,
      co2: 3.8,
      efficiency: 70,
      recommended: false,
      pros: ['Lower initial cost', 'Easy maintenance', 'Widely available'],
      cons: ['Higher PUE', 'More energy consumption'],
    },
    {
      name: 'Evaporative Cooling',
      pue: 1.4,
      cost: 120000,
      co2: 2.1,
      efficiency: 88,
      recommended: false,
      pros: ['Good efficiency', 'Sustainable', 'Lower costs than water'],
      cons: ['Climate dependent', 'Water usage'],
    },
    {
      name: 'Hybrid System',
      pue: 1.35,
      cost: 180000,
      co2: 2.3,
      efficiency: 90,
      recommended: false,
      pros: ['Optimal efficiency', 'Flexible operation', 'Best performance'],
      cons: ['Most complex', 'Highest cost'],
    },
  ]

  return (
    <div className="min-h-screen bg-bg-light flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-poppins text-dark-gray mb-2">Performance Advisory</h1>
          <p className="text-text-light">
            Get personalized recommendations for your data center cooling
          </p>
        </div>

        {/* What-If Scenarios */}
        <div className="card mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Sliders className="text-secondary" size={24} />
            <h2 className="text-2xl font-bold font-poppins text-dark-gray">What-If Scenarios</h2>
          </div>

          <div className="space-y-6">
            {/* IT Load Slider */}
            <div>
              <label className="label">IT Load (kW)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="100"
                  max="1000"
                  value={itLoad}
                  onChange={(e) => setItLoad(Number(e.target.value))}
                  className="flex-1 h-2 bg-border-light rounded-lg appearance-none cursor-pointer accent-secondary"
                />
                <span className="text-2xl font-bold text-secondary w-24">{itLoad} kW</span>
              </div>
            </div>

            {/* Efficiency Factor Slider */}
            <div>
              <label className="label">Efficiency Factor</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.01"
                  value={efficiency}
                  onChange={(e) => setEfficiency(Number(e.target.value))}
                  className="flex-1 h-2 bg-border-light rounded-lg appearance-none cursor-pointer accent-secondary"
                />
                <span className="text-2xl font-bold text-secondary w-24">{efficiency.toFixed(2)}</span>
              </div>
            </div>

            {/* Location Select */}
            <div>
              <label className="label">Climate/Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-field"
              >
                <option value="tropical">Tropical</option>
                <option value="temperate">Temperate</option>
                <option value="cold">Cold</option>
                <option value="arid">Arid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recommendation Panel */}
        <div className="bg-gradient-to-r from-secondary to-primary rounded-lg p-8 text-white mb-8 shadow-xl">
          <h2 className="text-3xl font-bold font-poppins mb-4">Recommended Solution</h2>
          <p className="text-xl font-semibold mb-6">Water Cooling System</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm opacity-90">PUE</p>
              <p className="text-3xl font-bold">1.30</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Annual Cost</p>
              <p className="text-3xl font-bold">$150k</p>
            </div>
            <div>
              <p className="text-sm opacity-90">CO₂/Year</p>
              <p className="text-3xl font-bold">2.5t</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Efficiency</p>
              <p className="text-3xl font-bold">92%</p>
            </div>
          </div>
          <p className="mt-6 opacity-90">
            This solution offers the best balance of efficiency, cost-effectiveness, and
            environmental impact for your specific data center configuration and location.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="card mb-8">
          <h3 className="text-2xl font-bold font-poppins text-dark-gray mb-6">Technique Comparison</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-light border-b-2 border-secondary">
                <tr>
                  <th className="px-4 py-4 text-left font-bold text-dark-gray">Technique</th>
                  <th className="px-4 py-4 text-left font-bold text-dark-gray">PUE</th>
                  <th className="px-4 py-4 text-left font-bold text-dark-gray">Annual Cost</th>
                  <th className="px-4 py-4 text-left font-bold text-dark-gray">CO₂ (tons)</th>
                  <th className="px-4 py-4 text-left font-bold text-dark-gray">Efficiency</th>
                  <th className="px-4 py-4 text-left font-bold text-dark-gray">Status</th>
                </tr>
              </thead>
              <tbody>
                {techniques.map((tech) => (
                  <tr
                    key={tech.name}
                    className={`border-b border-border-light hover:bg-bg-light transition-colors ${tech.recommended ? 'bg-secondary bg-opacity-5' : ''
                      }`}
                  >
                    <td className="px-4 py-4 font-semibold text-dark-gray">{tech.name}</td>
                    <td className="px-4 py-4 text-secondary font-bold">{tech.pue.toFixed(2)}</td>
                    <td className="px-4 py-4">${(tech.cost / 1000).toFixed(0)}k</td>
                    <td className="px-4 py-4">{tech.co2.toFixed(1)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-border-light rounded-full overflow-hidden">
                          <div
                            className="h-full bg-secondary"
                            style={{ width: `${tech.efficiency}%` }}
                          />
                        </div>
                        <span className="font-semibold text-dark-gray">{tech.efficiency}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {tech.recommended ? (
                        <div className="flex items-center gap-1 text-secondary font-bold">
                          <CheckCircle size={20} />
                          Recommended
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Alternative</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {techniques.map((tech) => (
            <div
              key={tech.name}
              className={`card border-2 ${tech.recommended ? 'border-primary bg-primary bg-opacity-5' : 'border-border-light'
                }`}
            >
              <h4 className="text-lg font-bold font-poppins text-dark-gray mb-4">{tech.name}</h4>

              <div className="mb-4">
                <p className="text-sm text-gray-600 font-semibold mb-2">Pros</p>
                <ul className="space-y-1">
                  {tech.pros.map((pro) => (
                    <li key={pro} className="text-sm text-secondary flex items-start gap-2">
                      <span className="mt-1">✓</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-semibold mb-2">Cons</p>
                <ul className="space-y-1">
                  {tech.cons.map((con) => (
                    <li key={con} className="text-sm text-primary flex items-start gap-2">
                      <span className="mt-1">✗</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>

              {tech.recommended && (
                <button className="w-full mt-6 btn-primary">
                  View Implementation Guide
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
