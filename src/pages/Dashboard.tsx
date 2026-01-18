import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/shared/Sidebar'
import { useAuthStore, useSimulationStore } from '../store/store'
import { useThemeStore } from '../hooks/useTheme'  
import { 
  Play, 
  Eye, 
  GitCompare, 
  TrendingUp, 
  Zap, 
  Leaf, 
  Thermometer, 
  Wind, 
  Cpu, 
  Server, 
  Clock, 
  Download,
  Activity,
  BarChart3,
  Calendar,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Cloud,
  Droplets,
  Shield,
  Users
} from 'lucide-react'

// Animated Counter for Stats
const AnimatedCounter: React.FC<{ value: number; label: string; suffix?: string }> = ({ value, label, suffix = '' }) => {
  const [count, setCount] = useState(0)
  const isDark = useThemeStore((state) => state.isDark)  // This should now work

  useEffect(() => {
    let start = 0
    const increment = value / 40
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 30)
    return () => clearInterval(timer)
  }, [value])

  return (
    <div className="flex flex-col">
      <div className={`text-3xl font-bold ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        {count}{suffix}
      </div>
      <div className={`text-sm mt-1 ${
        isDark ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {label}
      </div>
    </div>
  )
}

// Enhanced Stat Card with 3D Effect
const EnhancedStatCard: React.FC<{
  label: string
  value: string | number
  icon: React.ElementType
  change?: string
  isPositive?: boolean
  color: string
}> = ({ label, value, icon: Icon, change, isPositive, color }) => {
  const isDark = useThemeStore((state) => state.isDark)  
  const [isHovering, setIsHovering] = useState(false)

  return (
    <div 
      className={`relative group rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 cursor-pointer ${
        isDark 
          ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68] hover:border-[#5ce1e5]/30' 
          : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-[#0ea5e9]/30'
      }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Glow Effect */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at center, ${color}20, transparent 70%)`
        }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className={`text-sm font-medium mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {label}
            </div>
            <div className="flex items-baseline gap-2">
              <div className={`text-3xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {value}
              </div>
              {change && (
                <div className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full ${
                  isPositive 
                    ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-600'
                    : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-500/20 text-red-600'
                }`}>
                  {isPositive ? '↑' : '↓'} {change}
                </div>
              )}
            </div>
          </div>
          
          {/* Animated Icon */}
          <div className={`p-3 rounded-xl ${
            isDark ? 'bg-black/30' : 'bg-white/50'
          } group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-6 h-6`} style={{ color }} />
          </div>
        </div>
        
        {/* Progress Bar */}
        {isHovering && (
          <div className={`h-1 rounded-full overflow-hidden ${
            isDark ? 'bg-gray-800' : 'bg-gray-200'
          }`}>
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ 
                width: `${Math.min(100, typeof value === 'number' ? value : parseInt(value as string) * 2)}%`,
                background: color
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Quick Action Card with Hover Effects
const QuickActionCard: React.FC<{
  title: string
  description: string
  icon: React.ElementType
  action: () => void
  gradient: string
  delay: number
}> = ({ title, description, icon: Icon, action, gradient, delay }) => {
  const isDark = useThemeStore((state) => state.isDark)  
  const [isHovering, setIsHovering] = useState(false)

  return (
    <button
      onClick={action}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`relative group rounded-2xl p-8 overflow-hidden transition-all duration-500 transform hover:scale-105 animate-in fade-in ${
        isDark ? 'text-white' : 'text-white'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Animated Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-all duration-500 ${
        isHovering ? 'opacity-100' : 'opacity-90'
      }`} />
      
      {/* Particle Effect on Hover */}
      {isHovering && (
        <div className="absolute inset-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${1 + Math.random()}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
                opacity: 0.3
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className={`p-3 rounded-xl ${
            isDark ? 'bg-black/20' : 'bg-white/20'
          } backdrop-blur-sm`}>
            <Icon className="w-6 h-6" />
          </div>
          
          {/* Animated Arrow */}
          <ChevronRight className={`w-5 h-5 transform transition-transform duration-300 ${
            isHovering ? 'translate-x-2' : ''
          }`} />
        </div>

        <h3 className="text-xl font-bold mb-3 text-left">{title}</h3>
        <p className="text-sm opacity-90 text-left">{description}</p>
      </div>

      {/* Shine Effect */}
      <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 transition-all duration-700 group-hover:left-full" />
    </button>
  )
}

// Simulation Row with Status Indicators
const SimulationRow: React.FC<{
  simulation: any
  index: number
}> = ({ simulation, index }) => {
  const navigate = useNavigate()
  const isDark = useThemeStore((state) => state.isDark)  // This should now work
  const [isHovering, setIsHovering] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-600'
      case 'running':
        return isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/20 text-blue-600'
      case 'pending':
        return isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-500/20 text-yellow-600'
      default:
        return isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-200 text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      case 'running':
        return <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      case 'pending':
        return <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-500" />
    }
  }

  return (
    <tr 
      className={`transition-all duration-300 animate-in fade-in ${
        isDark 
          ? 'hover:bg-[#27304a]/50 border-b border-[#3f4a68]/30' 
          : 'hover:bg-gray-50/50 border-b border-gray-200'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <td className="py-4 pl-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isDark ? 'bg-[#1a1f3a]' : 'bg-gray-100'
          }`}>
            <Thermometer className={`w-4 h-4 ${
              isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
            }`} />
          </div>
          <div>
            <div className={`font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {simulation.name}
            </div>
            <div className={`text-xs mt-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Created {new Date(simulation.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </td>
      
      <td className="py-4">
        <div className={`flex items-center gap-2 ${
          isDark ? 'text-gray-300' : 'text-gray-700'
        }`}>
          <MapPin className="w-4 h-4" />
          {simulation.location}
        </div>
      </td>
      
      <td className="py-4">
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-2 ${
          isDark ? 'bg-[#1a1f3a] text-gray-300' : 'bg-gray-100 text-gray-700'
        }`}>
          {simulation.coolingTechnique === 'airside' ? <Wind className="w-3 h-3" /> : <Droplets className="w-3 h-3" />}
          {simulation.coolingTechnique.charAt(0).toUpperCase() + simulation.coolingTechnique.slice(1)}
        </div>
      </td>
      
      <td className="py-4">
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-2 ${getStatusColor(simulation.status)}`}>
            {getStatusIcon(simulation.status)}
            {simulation.status.charAt(0).toUpperCase() + simulation.status.slice(1)}
          </div>
        </div>
      </td>
      
      <td className="py-4 pr-6">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => navigate(`/simulation/${simulation.id}`)}
            className={`p-2 rounded-lg transition-all ${
              isDark 
                ? 'hover:bg-[#27304a] text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => console.log('Download', simulation.id)}
            className={`p-2 rounded-lg transition-all ${
              isDark 
                ? 'hover:bg-[#27304a] text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const simulations = useSimulationStore((state) => state.simulations)
  const isDark = useThemeStore((state) => state.isDark)  // This should now work

  const stats = [
    { 
      label: 'Total Simulations', 
      value: simulations.length, 
      icon: Zap, 
      color: isDark ? '#5ce1e5' : '#0ea5e9',
      change: '+12%',
      isPositive: true
    },
    { 
      label: 'Avg. Energy Saved', 
      value: '32%', 
      icon: TrendingUp, 
      color: isDark ? '#10b981' : '#10b981',
      change: '+5%',
      isPositive: true
    },
    { 
      label: 'CO₂ Reduction', 
      value: '45.2t', 
      icon: Leaf, 
      color: isDark ? '#8b5cf6' : '#8b5cf6',
      change: '-18%',
      isPositive: true
    },
    { 
      label: 'System Uptime', 
      value: '99.8%', 
      icon: Shield, 
      color: isDark ? '#fd5757' : '#ef4444',
      change: '+0.2%',
      isPositive: true
    }
  ]

  const quickActions = [
    {
      title: 'New Simulation',
      description: 'Design and run a new cooling optimization simulation',
      icon: Play,
      action: () => navigate('/input-management'),
      gradient: 'from-[#5ce1e5] to-[#0ea5e9]'
    },
    {
      title: 'View Reports',
      description: 'Access detailed analytics and performance reports',
      icon: BarChart3,
      action: () => navigate('/reports'),
      gradient: 'from-[#fd5757] to-[#ff8888]'
    },
    {
      title: 'Compare Methods',
      description: 'Compare different cooling techniques side-by-side',
      icon: GitCompare,
      action: () => navigate('/advisory'),
      gradient: 'from-[#8b5cf6] to-[#a78bfa]'
    },
    {
      title: 'Team Dashboard',
      description: 'Collaborate with your team on cooling projects',
      icon: Users,
      action: () => navigate('/team'),
      gradient: 'from-[#10b981] to-[#34d399]'
    }
  ]

  const recentSimulations = simulations.slice(-5)

  // Performance Metrics
  const performanceMetrics = [
    { label: 'Cooling Efficiency', value: '92%', trend: 'up' },
    { label: 'Energy Usage', value: '1.2MW', trend: 'down' },
    { label: 'PUE Score', value: '1.15', trend: 'down' },
    { label: 'Server Temp', value: '22°C', trend: 'stable' }
  ]

  // Quick Stats
  const quickStats = [
    { icon: Cloud, label: 'Active Servers', value: '1,243' },
    { icon: Wind, label: 'Fans Running', value: '98%' },
    { icon: Cpu, label: 'CPU Utilization', value: '68%' },
    { icon: Server, label: 'Racks Monitored', value: '45' }
  ]

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      isDark 
        ? 'bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]' 
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-50'
    }`}>
      <Sidebar />

      <main className="lg:ml-64 p-4 lg:p-8">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${
            isDark ? 'bg-[#5ce1e5]/5' : 'bg-[#0ea5e9]/5'
          }`} style={{ animation: 'float 8s ease-in-out infinite' }} />
        </div>

        {/* Welcome Header */}
        <div className="relative mb-8 lg:mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className={`text-3xl lg:text-4xl font-bold mb-2 animate-in slide-in-from-left-8 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Welcome back, <span className={isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}>{user?.email?.split('@')[0] || 'User'}</span>!
              </h1>
              <p className={`text-lg ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Here's what's happening with your data center today
              </p>
            </div>
            
            {/* Date and Status */}
            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl ${
              isDark ? 'bg-[#1a1f3a] border border-[#3f4a68]' : 'bg-white border border-gray-200'
            }`}>
              <Calendar className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  System Normal
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickStats.map((stat, index) => (
              <div 
                key={index}
                className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 animate-in fade-in ${
                  isDark 
                    ? 'bg-[#1a1f3a]/50 border border-[#3f4a68] hover:border-[#5ce1e5]/30' 
                    : 'bg-white/50 border border-gray-200 hover:border-[#0ea5e9]/30'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isDark ? 'bg-[#27304a]' : 'bg-gray-100'
                  }`}>
                    <stat.icon className={`w-4 h-4 ${
                      isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                    }`} />
                  </div>
                  <div>
                    <div className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {stat.label}
                    </div>
                    <div className={`text-lg font-bold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stat.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Stats and Quick Actions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Enhanced Stats Cards */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Performance Overview
                </h2>
                <span className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Last 30 days
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <EnhancedStatCard key={index} {...stat} />
                ))}
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div>
              <h2 className={`text-2xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quickActions.map((action, index) => (
                  <QuickActionCard key={index} {...action} delay={index * 100} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Performance Metrics */}
          <div className="space-y-8">
            {/* Performance Metrics */}
            <div className={`rounded-2xl p-6 ${
              isDark 
                ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
                : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Performance Metrics
                </h3>
                <Activity className={`w-5 h-5 ${
                  isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                }`} />
              </div>
              
              <div className="space-y-4">
                {performanceMetrics.map((metric, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between py-3"
                  >
                    <span className={`font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {metric.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {metric.value}
                      </span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        metric.trend === 'up' 
                          ? isDark ? 'bg-green-500/20' : 'bg-green-500/20'
                          : metric.trend === 'down'
                            ? isDark ? 'bg-red-500/20' : 'bg-red-500/20'
                            : isDark ? 'bg-gray-500/20' : 'bg-gray-200'
                      }`}>
                        {metric.trend === 'up' ? (
                          <TrendingUp className={`w-4 h-4 ${
                            isDark ? 'text-green-400' : 'text-green-600'
                          }`} />
                        ) : metric.trend === 'down' ? (
                          <TrendingUp className={`w-4 h-4 rotate-180 ${
                            isDark ? 'text-red-400' : 'text-red-600'
                          }`} />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Progress Visualization */}
              <div className={`mt-6 p-4 rounded-xl ${
                isDark ? 'bg-black/20' : 'bg-gray-100/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Cooling Efficiency Progress
                  </span>
                  <span className={`text-sm font-bold ${
                    isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                  }`}>
                    92%
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${
                  isDark ? 'bg-gray-800' : 'bg-gray-300'
                }`}>
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: '92%',
                      background: isDark 
                        ? 'linear-gradient(90deg, #5ce1e5, #0ea5e9)'
                        : 'linear-gradient(90deg, #0ea5e9, #5ce1e5)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className={`rounded-2xl p-6 ${
              isDark 
                ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
                : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Recent Activity
              </h3>
              
              <div className="space-y-4">
                {[
                  { action: 'New simulation started', time: '2 minutes ago', user: 'You' },
                  { action: 'Report generated', time: '1 hour ago', user: 'System' },
                  { action: 'Cooling optimization completed', time: '3 hours ago', user: 'Auto-System' },
                  { action: 'Energy usage alert', time: '5 hours ago', user: 'Monitoring' }
                ].map((activity, index) => (
                  <div 
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-[#27304a]' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isDark ? 'bg-[#27304a]' : 'bg-gray-100'
                    }`}>
                      <Activity className={`w-4 h-4 ${
                        isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {activity.action}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {activity.time} • by {activity.user}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Simulations Table */}
        <div className={`rounded-2xl overflow-hidden ${
          isDark 
            ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
            : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
        }`}>
          <div className={`p-6 border-b ${
            isDark ? 'border-[#3f4a68]' : 'border-gray-200'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className={`text-xl font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Recent Simulations
                </h3>
                <p className={`text-sm mt-1 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Your latest cooling optimization simulations
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/simulations')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    isDark
                      ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/input-management')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                    isDark
                      ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                      : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
                  }`}
                >
                  + New Simulation
                </button>
              </div>
            </div>
          </div>

          {recentSimulations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${
                    isDark ? 'bg-[#27304a]' : 'bg-gray-100'
                  }`}>
                    <th className="py-4 px-6 text-left text-sm font-semibold">
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Simulation</span>
                    </th>
                    <th className="py-4 px-6 text-left text-sm font-semibold">
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Location</span>
                    </th>
                    <th className="py-4 px-6 text-left text-sm font-semibold">
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Cooling Type</span>
                    </th>
                    <th className="py-4 px-6 text-left text-sm font-semibold">
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Status</span>
                    </th>
                    <th className="py-4 px-6 text-left text-sm font-semibold">
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentSimulations.map((sim, index) => (
                    <SimulationRow key={sim.id} simulation={sim} index={index} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="inline-block p-4 rounded-full bg-gradient-to-r from-[#5ce1e5]/10 to-[#0ea5e9]/10 mb-4">
                <Zap className={`w-12 h-12 ${
                  isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                }`} />
              </div>
              <h4 className={`text-xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                No simulations yet
              </h4>
              <p className={`mb-6 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Start your first cooling optimization simulation
              </p>
              <button
                onClick={() => navigate('/input-management')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
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
        
        .fade-in {
          animation-name: fadeIn;
        }
        
        .slide-in-from-left-8 {
          animation-name: slideInFromLeft;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInFromLeft {
          from { transform: translateX(-2rem); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// Helper component (MapPin)
const MapPin: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)