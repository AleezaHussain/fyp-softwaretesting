import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/shared/Sidebar'
import { useAuthStore, useSimulationStore } from '../store/store'
import { Play, Eye, GitCompare, TrendingUp, Zap, Leaf } from 'lucide-react'

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const simulations = useSimulationStore((state) => state.simulations)

  const stats = [
    { label: 'Simulations Run', value: '24', icon: Zap, color: 'text-secondary' },
    { label: 'Avg. Energy Saved', value: '15%', icon: TrendingUp, color: 'text-secondary' },
    { label: 'CO₂ Reduction', value: '3.2 tons', icon: Leaf, color: 'text-primary' },
  ]

  const quickActions = [
    {
      title: 'Start New Simulation',
      description: 'Design and run a new cooling simulation',
      icon: Play,
      action: () => navigate('/input-management'),
      color: 'from-secondary to-primary',
    },
    {
      title: 'View Past Reports',
      description: 'Access your simulation history',
      icon: Eye,
      action: () => navigate('/reports'),
      color: 'from-primary to-primary-dark',
    },
    {
      title: 'Compare Techniques',
      description: 'Compare cooling methods side-by-side',
      icon: GitCompare,
      action: () => navigate('/advisory'),
      color: 'from-secondary to-primary',
    },
  ]

  const recentSimulations = simulations.slice(-5)

  return (
    <div className="min-h-screen bg-bg-light flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Welcome Section */}
        <div className="mb-12 animate-slide-in-up">
          <h1 className="text-4xl font-bold font-poppins text-dark-gray mb-2">
            Welcome back, <span className="text-primary">{user?.name.split(' ')[0]}</span>!
          </h1>
          <p className="text-text-light">
            Here's what's happening with your data center today
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-2">{label}</p>
                  <p className="text-3xl font-bold text-primary">{value}</p>
                </div>
                <Icon className={`${color} w-12 h-12 opacity-30`} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold font-poppins text-dark-gray mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map(({ title, description, icon: Icon, action, color }) => (
              <button
                key={title}
                onClick={action}
                className={`p-6 rounded-lg bg-gradient-to-br ${color} text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}
              >
                <Icon className="w-8 h-8 mb-4" />
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm opacity-90">{description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Simulations */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-poppins text-dark-gray">Recent Simulations</h2>
            <button
              onClick={() => navigate('/simulations')}
              className="text-primary font-semibold hover:underline"
            >
              View All →
            </button>
          </div>

          {recentSimulations.length > 0 ? (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-bg-light border-b border-border-light">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-dark-gray">
                      Simulation Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-dark-gray">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-dark-gray">
                      Cooling Type
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-dark-gray">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentSimulations.map((sim) => (
                    <tr
                      key={sim.id}
                      className="border-b border-border-light hover:bg-bg-light transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-dark-gray">{sim.name}</td>
                      <td className="px-6 py-4 text-gray-600">{sim.location}</td>
                      <td className="px-6 py-4 text-gray-600 capitalize">{sim.coolingTechnique}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card text-center py-12">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No simulations yet</p>
              <button
                onClick={() => navigate('/input-management')}
                className="btn-primary"
              >
                Start Your First Simulation
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
