import React from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { useSimulationStore } from '../store/store'

export const Simulations: React.FC = () => {
  const simulations = useSimulationStore((state) => state.simulations)

  return (
    <div className="min-h-screen bg-bg-light flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-poppins text-dark-gray mb-2">Simulations</h1>
          <p className="text-text-light">View and manage all your simulations</p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search simulations..."
              className="input-field"
            />
            <select className="input-field">
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
            </select>
            <select className="input-field">
              <option value="">All Techniques</option>
              <option value="air">Air Cooling</option>
              <option value="water">Water Cooling</option>
              <option value="evaporative">Evaporative</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <button className="btn-primary">Filter</button>
          </div>
        </div>

        {/* Simulations Table */}
        <div className="card">
          {simulations.length > 0 ? (
            <table className="w-full">
              <thead className="bg-bg-light border-b-2 border-secondary">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-dark-gray">Name</th>
                  <th className="px-6 py-4 text-left font-bold text-dark-gray">Location</th>
                  <th className="px-6 py-4 text-left font-bold text-dark-gray">IT Load</th>
                  <th className="px-6 py-4 text-left font-bold text-dark-gray">Cooling Type</th>
                  <th className="px-6 py-4 text-left font-bold text-dark-gray">Status</th>
                  <th className="px-6 py-4 text-left font-bold text-dark-gray">Actions</th>
                </tr>
              </thead>
              <tbody>
                {simulations.map((sim) => (
                  <tr
                    key={sim.id}
                    className="border-b border-border-light hover:bg-bg-light transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-dark-gray">{sim.name}</td>
                    <td className="px-6 py-4 text-gray-600">{sim.location}</td>
                    <td className="px-6 py-4">{sim.itLoad} kW</td>
                    <td className="px-6 py-4 capitalize">{sim.coolingTechnique}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          sim.status === 'completed'
                            ? 'bg-secondary bg-opacity-20 text-secondary'
                            : sim.status === 'running'
                              ? 'bg-primary bg-opacity-20 text-primary'
                              : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {sim.status.charAt(0).toUpperCase() + sim.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-primary hover:underline text-sm font-semibold">
                          View
                        </button>
                        <button className="text-gray-600 hover:underline text-sm font-semibold">
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No simulations found</p>
              <a href="/input-management" className="btn-primary">
                Start a Simulation
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
