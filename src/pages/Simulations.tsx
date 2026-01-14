import React, { useState } from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { useAuthStore, useSimulationStore } from '../store/store'
import { useThemeStore } from '../hooks/useTheme'  
import { useNavigate } from 'react-router-dom'
import { 
  Search, Filter, Download, Eye, Play, Trash2, 
  Calendar, Thermometer, Wind, Droplet, Zap, 
  ChevronRight, BarChart3, Clock, Server, 
  Cloud, MapPin, Activity, CheckCircle, XCircle, AlertCircle
} from 'lucide-react'

// Simulation Card Component
const SimulationCard: React.FC<{
  simulation: any
  index: number
}> = ({ simulation, index }) => {
  const navigate = useNavigate()
  const isDark = useThemeStore((state) => state.isDark)
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          color: isDark ? '#10b981' : '#10b981',
          bgColor: isDark ? 'bg-green-500/20' : 'bg-green-500/20',
          textColor: isDark ? 'text-green-400' : 'text-green-600',
          icon: CheckCircle,
          label: 'Completed'
        }
      case 'running':
        return {
          color: isDark ? '#3b82f6' : '#3b82f6',
          bgColor: isDark ? 'bg-blue-500/20' : 'bg-blue-500/20',
          textColor: isDark ? 'text-blue-400' : 'text-blue-600',
          icon: Activity,
          label: 'Running'
        }
      case 'pending':
        return {
          color: isDark ? '#f59e0b' : '#f59e0b',
          bgColor: isDark ? 'bg-yellow-500/20' : 'bg-yellow-500/20',
          textColor: isDark ? 'text-yellow-400' : 'text-yellow-600',
          icon: Clock,
          label: 'Pending'
        }
      default:
        return {
          color: isDark ? '#6b7280' : '#6b7280',
          bgColor: isDark ? 'bg-gray-500/20' : 'bg-gray-200',
          textColor: isDark ? 'text-gray-400' : 'text-gray-600',
          icon: XCircle,
          label: 'Failed'
        }
    }
  }
  
  const getTechniqueIcon = (technique: string) => {
    switch (technique) {
      case 'air':
        return <Wind className="w-4 h-4" />
      case 'water':
        return <Droplet className="w-4 h-4" />
      case 'evaporative':
        return <Cloud className="w-4 h-4" />
      default:
        return <Thermometer className="w-4 h-4" />
    }
  }
  
  const getTechniqueColor = (technique: string) => {
    switch (technique) {
      case 'air':
        return isDark ? '#5ce1e5' : '#0ea5e9'
      case 'water':
        return isDark ? '#8b5cf6' : '#8b5cf6'
      case 'evaporative':
        return isDark ? '#10b981' : '#10b981'
      default:
        return isDark ? '#fd5757' : '#ef4444'
    }
  }
  
  const statusConfig = getStatusConfig(simulation.status)
  const StatusIcon = statusConfig.icon
  const techniqueColor = getTechniqueColor(simulation.coolingTechnique)

  return (
    <div 
      className={`group rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
        isDark
          ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68] hover:border-[#5ce1e5]/30'
          : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-[#0ea5e9]/30'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${
            isDark ? 'bg-black/30' : 'bg-gray-100'
          }`}>
            <div style={{ color: techniqueColor }}>
              {getTechniqueIcon(simulation.coolingTechnique)}
            </div>
          </div>
          <div>
            <h4 className={`font-bold text-lg mb-1 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {simulation.name}
            </h4>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {simulation.location}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-500" />
              <span className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {new Date(simulation.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-2 ${statusConfig.bgColor} ${statusConfig.textColor}`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </div>
      </div>
      
      {/* Simulation Metrics */}
      <div className={`mb-4 p-4 rounded-xl ${
        isDark ? 'bg-black/20' : 'bg-gray-100/50'
      }`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              IT Load
            </div>
            <div className={`text-lg font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {simulation.itLoad} kW
            </div>
          </div>
          <div>
            <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Racks
            </div>
            <div className={`text-lg font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {simulation.numberOfRacks || 'N/A'}
            </div>
          </div>
          <div>
            <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Type
            </div>
            <div className={`text-lg font-bold capitalize ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {simulation.coolingTechnique}
            </div>
          </div>
          <div>
            <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Savings
            </div>
            <div className={`text-lg font-bold ${
              isDark ? 'text-green-400' : 'text-green-600'
            }`}>
              {simulation.energySaved || '0'}%
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/simulation/${simulation.id}`)}
          className={`flex-1 py-2.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
            isDark
              ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
              : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />
            View Details
          </div>
        </button>
        
        <button
          onClick={() => console.log('Download', simulation.id)}
          className={`p-2.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
            isDark
              ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
          }`}
        >
          <Download className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => console.log('Delete', simulation.id)}
          className={`p-2.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
            isDark
              ? 'bg-[#27304a] text-gray-300 hover:bg-[#fd5757] hover:text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-[#ef4444] hover:text-white'
          }`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export const Simulations: React.FC = () => {
  const simulations = useSimulationStore((state) => state.simulations)
  const isDark = useThemeStore((state) => state.isDark)
  const navigate = useNavigate()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [techniqueFilter, setTechniqueFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Filter simulations
  const filteredSimulations = simulations.filter(sim => {
    const matchesSearch = sim.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sim.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || sim.status === statusFilter
    const matchesTechnique = techniqueFilter === 'all' || sim.coolingTechnique === techniqueFilter
    
    return matchesSearch && matchesStatus && matchesTechnique
  })

  // Stats
  const totalSimulations = simulations.length
  const completedSimulations = simulations.filter(s => s.status === 'completed').length
  const runningSimulations = simulations.filter(s => s.status === 'running').length
  const totalEnergySaved = simulations.reduce((acc, sim) => acc + (sim.energySaved || 0), 0)

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      isDark 
        ? 'bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]' 
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-50'
    }`}>
      <Sidebar />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${
          isDark ? 'bg-[#5ce1e5]/5' : 'bg-[#0ea5e9]/5'
        }`} style={{ animation: 'float 8s ease-in-out infinite' }} />
      </div>

      <main className="lg:ml-64 p-4 lg:p-8">
        {/* Header Section */}
        <div className="relative mb-8 lg:mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className={`text-3xl lg:text-4xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                <span className={isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}>Simulations</span> Management
              </h1>
              <p className={`text-lg ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                View, manage, and analyze all your cooling optimization simulations
              </p>
            </div>
            
            {/* New Simulation Button */}
            <button
              onClick={() => navigate('/input-management')}
              className={`group relative px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 overflow-hidden ${
                isDark
                  ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                  : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
              }`}
            >
              {/* Shine Effect */}
              <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 transition-all duration-700 group-hover:left-full" />
              
              <span className="relative flex items-center justify-center gap-3">
                <Play className="w-5 h-5" />
                <span>New Simulation</span>
              </span>
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
              isDark 
                ? 'bg-[#1a1f3a]/50 border border-[#3f4a68] hover:border-[#5ce1e5]/30' 
                : 'bg-white/50 border border-gray-200 hover:border-[#0ea5e9]/30'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isDark ? 'bg-black/30' : 'bg-gray-100'
                }`}>
                  <BarChart3 className={`w-5 h-5 ${
                    isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                  }`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {totalSimulations}
                  </div>
                  <div className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Total Simulations
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
              isDark 
                ? 'bg-[#1a1f3a]/50 border border-[#3f4a68] hover:border-[#10b981]/30' 
                : 'bg-white/50 border border-gray-200 hover:border-[#10b981]/30'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isDark ? 'bg-black/30' : 'bg-gray-100'
                }`}>
                  <CheckCircle className={`w-5 h-5 ${
                    isDark ? 'text-green-400' : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {completedSimulations}
                  </div>
                  <div className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Completed
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
              isDark 
                ? 'bg-[#1a1f3a]/50 border border-[#3f4a68] hover:border-[#3b82f6]/30' 
                : 'bg-white/50 border border-gray-200 hover:border-[#3b82f6]/30'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isDark ? 'bg-black/30' : 'bg-gray-100'
                }`}>
                  <Activity className={`w-5 h-5 ${
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {runningSimulations}
                  </div>
                  <div className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Running
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
              isDark 
                ? 'bg-[#1a1f3a]/50 border border-[#3f4a68] hover:border-[#fbbf24]/30' 
                : 'bg-white/50 border border-gray-200 hover:border-[#f59e0b]/30'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isDark ? 'bg-black/30' : 'bg-gray-100'
                }`}>
                  <Zap className={`w-5 h-5 ${
                    isDark ? 'text-yellow-400' : 'text-yellow-600'
                  }`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {totalEnergySaved}%
                  </div>
                  <div className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Avg. Energy Saved
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className={`rounded-2xl p-6 mb-8 ${
          isDark 
            ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
            : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className={`w-5 h-5 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`} />
              <span className={`font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Filter & Search
              </span>
            </div>
            
            {/* View Mode Toggle */}
            <div className={`flex items-center gap-2 p-1 rounded-xl ${
              isDark ? 'bg-[#27304a]' : 'bg-gray-100'
            }`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'grid'
                    ? isDark
                      ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                      : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
                    : isDark
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? isDark
                      ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                      : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
                    : isDark
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List View
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search simulations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all ${
                  isDark
                    ? 'bg-[#1a1f3a] border-[#3f4a68] text-white focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20'
                }`}
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all ${
                isDark
                  ? 'bg-[#1a1f3a] border-[#3f4a68] text-white focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20'
              }`}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            
            {/* Technique Filter */}
            <select
              value={techniqueFilter}
              onChange={(e) => setTechniqueFilter(e.target.value)}
              className={`px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all ${
                isDark
                  ? 'bg-[#1a1f3a] border-[#3f4a68] text-white focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20'
              }`}
            >
              <option value="all">All Techniques</option>
              <option value="air">Air-Side Economization</option>
              <option value="water">Water-Side Cooling</option>
              <option value="evaporative">Evaporative Cooling</option>
            </select>
            
            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTechniqueFilter('all')
              }}
              className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              Clear Filters
            </button>
          </div>
          
          {/* Active Filters Badges */}
          {(searchTerm || statusFilter !== 'all' || techniqueFilter !== 'all') && (
            <div className="flex flex-wrap gap-2 mt-4">
              {searchTerm && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  isDark ? 'bg-[#27304a] text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  <span>Search: "{searchTerm}"</span>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="hover:opacity-70"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              )}
              {statusFilter !== 'all' && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  isDark ? 'bg-[#27304a] text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  <span>Status: {statusFilter}</span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="hover:opacity-70"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              )}
              {techniqueFilter !== 'all' && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  isDark ? 'bg-[#27304a] text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  <span>Technique: {techniqueFilter}</span>
                  <button
                    onClick={() => setTechniqueFilter('all')}
                    className="hover:opacity-70"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Simulations Content */}
        <div className={`rounded-2xl p-6 ${
          isDark 
            ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
            : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
        }`}>
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className={`text-xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                All Simulations
              </h3>
              <p className={`text-sm mt-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Showing {filteredSimulations.length} of {simulations.length} simulations
              </p>
            </div>
            
            {/* Export Button */}
            <button
              onClick={() => console.log('Export all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <Download className="w-4 h-4" />
              Export All
            </button>
          </div>

          {/* Simulations Grid/List */}
          {filteredSimulations.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSimulations.map((sim, index) => (
                  <SimulationCard key={sim.id} simulation={sim} index={index} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSimulations.map((sim, index) => (
                  <div
                    key={sim.id}
                    className={`group rounded-xl p-6 transition-all duration-300 hover:scale-105 ${
                      isDark
                        ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68] hover:border-[#5ce1e5]/30'
                        : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-[#0ea5e9]/30'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${
                          isDark ? 'bg-black/30' : 'bg-gray-100'
                        }`}>
                          {getTechniqueIcon(sim.coolingTechnique)}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-2">
                            <h4 className={`font-bold text-lg ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              {sim.name}
                            </h4>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              getStatusConfig(sim.status).bgColor
                            } ${getStatusConfig(sim.status).textColor}`}>
                              {getStatusConfig(sim.status).label}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span className={`text-sm ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {sim.location}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Server className="w-4 h-4 text-gray-500" />
                              <span className={`text-sm ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {sim.itLoad} kW
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Thermometer className="w-4 h-4 text-gray-500" />
                              <span className={`text-sm ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {sim.coolingTechnique}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-gray-500" />
                              <span className={`text-sm ${
                                isDark ? 'text-green-400' : 'text-green-600'
                              }`}>
                                {sim.energySaved || '0'}% saved
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/simulation/${sim.id}`)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                            isDark
                              ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                              : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => console.log('Download', sim.id)}
                          className={`p-2 rounded-lg transition-all hover:scale-105 ${
                            isDark 
                              ? 'hover:bg-[#27304a] text-gray-400 hover:text-white' 
                              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <div className="inline-block p-4 rounded-full bg-gradient-to-r from-[#5ce1e5]/10 to-[#0ea5e9]/10 mb-4">
                <BarChart3 className={`w-12 h-12 ${
                  isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                }`} />
              </div>
              <h4 className={`text-xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                No simulations found
              </h4>
              <p className={`mb-6 max-w-md mx-auto ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {searchTerm || statusFilter !== 'all' || techniqueFilter !== 'all' 
                  ? 'No simulations match your current filters. Try adjusting your search criteria.'
                  : 'You haven\'t run any simulations yet. Start your first cooling optimization simulation to see results here.'}
              </p>
              <button 
                onClick={() => navigate('/input-management')} 
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? 'bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white'
                    : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
                }`}
              >
                Start First Simulation
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-in {
          animation-duration: 0.6s;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  )
}