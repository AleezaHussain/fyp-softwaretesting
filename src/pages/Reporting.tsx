import React, { useState } from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { useSimulationStore } from '../store/store'
import { FileText, Download, Eye } from 'lucide-react'

export const Reporting: React.FC = () => {
  const simulations = useSimulationStore((state) => state.simulations)
  const [selectedTemplate, setSelectedTemplate] = useState('executive')

  const templates = [
    {
      id: 'executive',
      name: 'Executive Summary',
      description: 'High-level overview with key metrics and recommendations',
      icon: '📊',
    },
    {
      id: 'technical',
      name: 'Technical Deep Dive',
      description: 'Detailed technical analysis and performance metrics',
      icon: '⚙️',
    },
    {
      id: 'sustainability',
      name: 'Sustainability Report',
      description: 'Focus on environmental impact and carbon reduction',
      icon: '🌱',
    },
  ]

  const exportFormats = ['PDF', 'PPT', 'PNG', 'CSV']

  return (
    <div className="min-h-screen bg-bg-light flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-poppins text-dark-gray mb-2">Reports</h1>
          <p className="text-text-light">Generate and manage your simulation reports</p>
        </div>

        {/* Report Templates */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold font-poppins text-dark-gray mb-6">Report Templates</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {templates.map(({ id, name, description, icon }) => (
              <button
                key={id}
                onClick={() => setSelectedTemplate(id)}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  selectedTemplate === id
                    ? 'border-primary bg-primary bg-opacity-10'
                    : 'border-border-light hover:border-primary'
                }`}
              >
                <p className="text-4xl mb-2">{icon}</p>
                <p className="font-bold font-poppins text-dark-gray">{name}</p>
                <p className="text-sm text-gray-600 mt-2">{description}</p>
              </button>
            ))}
          </div>

          {/* Export Options */}
          <div className="bg-bg-light p-6 rounded-lg">
            <p className="font-semibold text-dark-gray mb-4">Export Format</p>
            <div className="flex flex-wrap gap-3">
              {exportFormats.map((format) => (
                <button
                  key={format}
                  className="px-6 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
                >
                  {format}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-poppins text-dark-gray">Recent Reports</h2>
            <button className="btn-primary flex items-center gap-2">
              <FileText size={20} />
              Generate New Report
            </button>
          </div>

          {simulations.length > 0 ? (
            <div className="space-y-3">
              {simulations.slice(-5).map((sim) => (
                <div key={sim.id} className="flex items-center justify-between p-4 bg-bg-light rounded-lg hover:bg-opacity-70 transition-all">
                  <div>
                    <p className="font-semibold text-dark-gray">{sim.name}</p>
                    <p className="text-sm text-gray-600">
                      {sim.location} • {sim.coolingTechnique}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost flex items-center gap-2">
                      <Eye size={18} />
                      Preview
                    </button>
                    <button className="btn-secondary flex items-center gap-2">
                      <Download size={18} />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No reports generated yet</p>
            </div>
          )}
        </div>

        {/* Visualization Gallery */}
        <div className="card">
          <h2 className="text-2xl font-bold font-poppins text-dark-gray mb-6">Visualization Gallery</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bg-light p-6 rounded-lg text-center">
              <p className="text-3xl mb-2">🗺️</p>
              <p className="font-semibold text-dark-gray">Heatmaps</p>
              <p className="text-sm text-gray-600 mt-2">Temperature distribution</p>
            </div>
            <div className="bg-bg-light p-6 rounded-lg text-center">
              <p className="text-3xl mb-2">🔄</p>
              <p className="font-semibold text-dark-gray">Flow Diagrams</p>
              <p className="text-sm text-gray-600 mt-2">Cooling system architecture</p>
            </div>
            <div className="bg-bg-light p-6 rounded-lg text-center">
              <p className="text-3xl mb-2">📈</p>
              <p className="font-semibold text-dark-gray">Savings Projections</p>
              <p className="text-sm text-gray-600 mt-2">Cost and energy estimates</p>
            </div>
            <div className="bg-bg-light p-6 rounded-lg text-center">
              <p className="text-3xl mb-2">🎨</p>
              <p className="font-semibold text-dark-gray">Custom Charts</p>
              <p className="text-sm text-gray-600 mt-2">Tailored visualizations</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
