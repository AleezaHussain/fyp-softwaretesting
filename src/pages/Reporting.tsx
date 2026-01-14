import React, { useState } from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import {  useSimulationStore } from '../store/store'
import { useThemeStore } from '../hooks/useTheme'  
import { FileText, Download, Eye, BarChart3, TrendingUp, Thermometer, Wind, Zap, Leaf, Calendar, ChevronRight, Sparkles, Filter, Settings, Share2, Printer, Play } from 'lucide-react'

// Template Card Component
const TemplateCard: React.FC<{
  id: string
  name: string
  description: string
  icon: React.ReactNode
  isSelected: boolean
  onClick: () => void
  color: string
}> = ({ id, name, description, icon, isSelected, onClick, color }) => {
  const isDark = useThemeStore((state) => state.isDark)
  
  return (
    <button
      onClick={onClick}
      className={`relative group rounded-2xl p-6 text-left transition-all duration-300 transform hover:scale-105 ${
        isSelected
          ? isDark
            ? 'ring-2 ring-opacity-50 bg-gradient-to-br from-[#1a1f3a] to-[#27304a]'
            : 'ring-2 ring-opacity-50 bg-gradient-to-br from-white to-gray-50'
          : isDark
            ? 'bg-gradient-to-br from-[#1a1f3a]/50 to-[#27304a]/50 hover:bg-gradient-to-br hover:from-[#1a1f3a] hover:to-[#27304a]'
            : 'bg-gradient-to-br from-white/50 to-gray-50/50 hover:bg-gradient-to-br hover:from-white hover:to-gray-50'
      } ${isSelected ? 'ring-opacity-50' : ''}`}
      style={isSelected ? { 
        borderColor: color,
        boxShadow: `0 0 0 2px ${color}20`
      } : {}}
    >
      {/* Glow Effect on Selected */}
      {isSelected && (
        <div 
          className="absolute inset-0 rounded-2xl opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${color}40, transparent 70%)`
          }}
        />
      )}
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-black/30' : 'bg-white/50'}`}>
            {icon}
          </div>
          {isSelected && (
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          )}
        </div>
        
        <h3 className={`text-xl font-bold mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {name}
        </h3>
        <p className={`text-sm leading-relaxed ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {description}
        </p>
        
        {/* Animated Arrow */}
        <div className={`mt-4 inline-flex items-center gap-1 text-sm font-medium ${
          isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'
        } transition-colors`}>
          <span>Select Template</span>
          <ChevronRight className={`w-4 h-4 transform transition-transform ${
            isSelected ? 'translate-x-1' : 'group-hover:translate-x-1'
          }`} />
        </div>
      </div>
    </button>
  )
}

// Export Format Button
const ExportFormatButton: React.FC<{
  format: string
  icon: React.ReactNode
  onClick: () => void
}> = ({ format, icon, onClick }) => {
  const isDark = useThemeStore((state) => state.isDark)
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
        isDark
          ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] hover:border-[#5ce1e5]/30'
          : 'bg-gradient-to-br from-white to-gray-50 hover:border-[#0ea5e9]/30'
      } border-2 border-transparent`}
    >
      <div className={`p-2 rounded-lg mb-3 ${
        isDark ? 'bg-black/30' : 'bg-gray-100'
      }`}>
        {icon}
      </div>
      <span className={`font-medium ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        {format}
      </span>
    </button>
  )
}

// Report Card Component
const ReportCard: React.FC<{
  report: any
  index: number
}> = ({ report, index }) => {
  const isDark = useThemeStore((state) => state.isDark)
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-600'
      case 'generating':
        return isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/20 text-blue-600'
      case 'failed':
        return isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-500/20 text-red-600'
      default:
        return isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-200 text-gray-600'
    }
  }
  
  const getIcon = () => {
    switch (report.type) {
      case 'executive':
        return <BarChart3 className="w-5 h-5" />
      case 'technical':
        return <Thermometer className="w-5 h-5" />
      case 'sustainability':
        return <Leaf className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  return (
    <div 
      className={`group rounded-xl p-6 transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] hover:bg-gradient-to-br hover:from-[#1a1f3a] hover:to-[#27304a]/80'
          : 'bg-gradient-to-br from-white to-gray-50 hover:bg-gradient-to-br hover:from-white hover:to-gray-50/80'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${
            isDark ? 'bg-black/30' : 'bg-gray-100'
          }`}>
            {getIcon()}
          </div>
          <div>
            <h4 className={`font-bold text-lg mb-1 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {report.name}
            </h4>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {report.location}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-500" />
              <span className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {report.date}
              </span>
            </div>
          </div>
        </div>
        
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
        </div>
      </div>
      
      <div className={`mb-4 p-3 rounded-lg ${
        isDark ? 'bg-black/20' : 'bg-gray-100/50'
      }`}>
        <div className="flex items-center justify-between">
          <div className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Report Type
          </div>
          <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
            {report.type}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button className={`flex-1 py-2.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
          isDark
            ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
            : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
        }`}>
          <div className="flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </div>
        </button>
        
        <button className={`flex-1 py-2.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
          isDark
            ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
        }`}>
          <div className="flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Download
          </div>
        </button>
      </div>
    </div>
  )
}

// Visualization Card Component
const VisualizationCard: React.FC<{
  title: string
  description: string
  icon: React.ReactNode
  color: string
}> = ({ title, description, icon, color }) => {
  const isDark = useThemeStore((state) => state.isDark)
  
  return (
    <div className={`group relative rounded-2xl p-6 overflow-hidden transition-all duration-300 transform hover:scale-105 ${
      isDark
        ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] hover:border-[#5ce1e5]/30'
        : 'bg-gradient-to-br from-white to-gray-50 hover:border-[#0ea5e9]/30'
    } border-2 border-transparent`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, ${color} 2px, transparent 2px)`,
          backgroundSize: '20px 20px'
        }} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${
            isDark ? 'bg-black/30' : 'bg-white/50'
          }`}>
            {icon}
          </div>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
        </div>
        
        <h4 className={`font-bold text-lg mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {title}
        </h4>
        <p className={`text-sm leading-relaxed ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {description}
        </p>
        
        {/* Hover Effect */}
        <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          <span className={isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}>Explore Visualizations</span>
          <ChevronRight className={`w-4 h-4 ${isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}`} />
        </div>
      </div>
    </div>
  )
}

export const Reporting: React.FC = () => {
  // Note: useSimulationStore is imported from '../store/store'
  const simulations = useSimulationStore((state) => state.simulations)
  const isDark = useThemeStore((state) => state.isDark)
  const [selectedTemplate, setSelectedTemplate] = useState('executive')
  const [selectedFormat, setSelectedFormat] = useState('PDF')
  const [timeRange, setTimeRange] = useState('30d')

  const templates = [
    {
      id: 'executive',
      name: 'Executive Summary',
      description: 'High-level overview with key metrics and strategic recommendations for decision makers.',
      icon: <BarChart3 className="w-6 h-6" style={{ color: '#5ce1e5' }} />,
      color: '#5ce1e5'
    },
    {
      id: 'technical',
      name: 'Technical Deep Dive',
      description: 'Detailed technical analysis, performance metrics, and system optimization insights.',
      icon: <Thermometer className="w-6 h-6" style={{ color: '#fd5757' }} />,
      color: '#fd5757'
    },
    {
      id: 'sustainability',
      name: 'Sustainability Report',
      description: 'Focus on environmental impact, carbon reduction, and sustainability metrics.',
      icon: <Leaf className="w-6 h-6" style={{ color: '#10b981' }} />,
      color: '#10b981'
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive Analysis',
      description: 'Complete report with all metrics, visualizations, and detailed recommendations.',
      icon: <FileText className="w-6 h-6" style={{ color: '#8b5cf6' }} />,
      color: '#8b5cf6'
    }
  ]

  const exportFormats = [
    { id: 'PDF', icon: <FileText className="w-6 h-6" /> },
    { id: 'PPT', icon: <Sparkles className="w-6 h-6" /> },
    { id: 'PNG', icon: <BarChart3 className="w-6 h-6" /> },
    { id: 'CSV', icon: <TrendingUp className="w-6 h-6" /> },
    { id: 'Excel', icon: <FileText className="w-6 h-6" /> }
  ]

  const timeRanges = [
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
    { id: '1y', label: 'Last year' }
  ]

  const visualizations = [
    {
      title: 'Heatmaps',
      description: 'Temperature distribution and thermal analysis across data center layout',
      icon: '🗺️',
      color: isDark ? '#5ce1e5' : '#0ea5e9'
    },
    {
      title: 'Flow Diagrams',
      description: 'Cooling system architecture and airflow patterns visualization',
      icon: '🔄',
      color: isDark ? '#fd5757' : '#ef4444'
    },
    {
      title: 'Savings Projections',
      description: 'Cost optimization and energy savings estimates over time',
      icon: '📈',
      color: isDark ? '#10b981' : '#10b981'
    },
    {
      title: 'Custom Charts',
      description: 'Tailored visualizations and interactive data exploration',
      icon: '🎨',
      color: isDark ? '#8b5cf6' : '#8b5cf6'
    }
  ]

  // Mock reports data - you can replace with actual simulation data
  const recentReports = [
    {
      id: '1',
      name: 'Q4 Data Center Performance',
      location: 'DC-01, Frankfurt',
      date: 'Dec 15, 2024',
      type: 'executive',
      status: 'completed'
    },
    {
      id: '2',
      name: 'Cooling System Optimization',
      location: 'DC-02, Singapore',
      date: 'Dec 10, 2024',
      type: 'technical',
      status: 'completed'
    },
    {
      id: '3',
      name: 'Sustainability Impact 2024',
      location: 'All Locations',
      date: 'Dec 5, 2024',
      type: 'sustainability',
      status: 'completed'
    },
    {
      id: '4',
      name: 'Annual Energy Report',
      location: 'Global Analysis',
      date: 'Nov 30, 2024',
      type: 'comprehensive',
      status: 'generating'
    }
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

        {/* Header Section */}
        <div className="relative mb-8 lg:mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className={`text-3xl lg:text-4xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                <span className={isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}>Reports</span> & Analytics
              </h1>
              <p className={`text-lg ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Generate, manage, and export detailed simulation reports
              </p>
            </div>
            
            {/* Date Filter */}
            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl ${
              isDark ? 'bg-[#1a1f3a] border border-[#3f4a68]' : 'bg-white border border-gray-200'
            }`}>
              <Calendar className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              <div className="flex items-center gap-2">
                {timeRanges.map((range) => (
                  <button
                    key={range.id}
                    onClick={() => setTimeRange(range.id)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      timeRange === range.id
                        ? isDark
                          ? 'bg-[#5ce1e5] text-white'
                          : 'bg-[#0ea5e9] text-white'
                        : isDark
                          ? 'text-gray-400 hover:text-white'
                          : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`p-4 rounded-xl ${
              isDark 
                ? 'bg-[#1a1f3a]/50 border border-[#3f4a68]' 
                : 'bg-white/50 border border-gray-200'
            }`}>
              <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {recentReports.length}
              </div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Reports
              </div>
            </div>
            <div className={`p-4 rounded-xl ${
              isDark 
                ? 'bg-[#1a1f3a]/50 border border-[#3f4a68]' 
                : 'bg-white/50 border border-gray-200'
            }`}>
              <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                24
              </div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Visualizations
              </div>
            </div>
            <div className={`p-4 rounded-xl ${
              isDark 
                ? 'bg-[#1a1f3a]/50 border border-[#3f4a68]' 
                : 'bg-white/50 border border-gray-200'
            }`}>
              <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                98%
              </div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Export Success
              </div>
            </div>
            <div className={`p-4 rounded-xl ${
              isDark 
                ? 'bg-[#1a1f3a]/50 border border-[#3f4a68]' 
                : 'bg-white/50 border border-gray-200'
            }`}>
              <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                5.2GB
              </div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Storage Used
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Templates and Export */}
          <div className="lg:col-span-2 space-y-8">
            {/* Report Templates */}
            <div className={`rounded-2xl p-6 ${
              isDark 
                ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
                : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Report Templates
                </h2>
                <div className="flex items-center gap-2">
                  <Filter className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Filter Templates
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    {...template}
                    isSelected={selectedTemplate === template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                  />
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div className={`rounded-2xl p-6 ${
              isDark 
                ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
                : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Export Options
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {exportFormats.map((format) => (
                  <ExportFormatButton
                    key={format.id}
                    format={format.id}
                    icon={format.icon}
                    onClick={() => setSelectedFormat(format.id)}
                  />
                ))}
              </div>
              
              {/* Advanced Options */}
              <div className={`p-4 rounded-xl ${
                isDark ? 'bg-black/20' : 'bg-gray-100/50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Advanced Export Settings
                  </span>
                  <Settings className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className={`py-2 rounded-lg font-medium ${
                    isDark
                      ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`}>
                    Custom Layout
                  </button>
                  <button className={`py-2 rounded-lg font-medium ${
                    isDark
                      ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`}>
                    Add Watermark
                  </button>
                  <button className={`py-2 rounded-lg font-medium ${
                    isDark
                      ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`}>
                    Password Protect
                  </button>
                </div>
              </div>
              
              {/* Generate Button */}
              <button className={`w-full mt-6 py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                  : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
              }`}>
                <div className="flex items-center justify-center gap-3">
                  <Play className="w-5 h-5" />
                  Generate {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)} Report
                </div>
              </button>
            </div>
          </div>

          {/* Right Column - Recent Reports */}
          <div className="space-y-8">
            {/* Recent Reports */}
            <div className={`rounded-2xl p-6 ${
              isDark 
                ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
                : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Recent Reports
                </h3>
                <div className="flex items-center gap-2">
                  <Share2 className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  <Printer className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </div>
              </div>
              
              <div className="space-y-4">
                {recentReports.map((report, index) => (
                  <ReportCard key={report.id} report={report} index={index} />
                ))}
              </div>
              
              {/* View All Button */}
              <button className={`w-full mt-6 py-3 rounded-lg font-medium transition-colors ${
                isDark
                  ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  View All Reports
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>

            {/* Quick Actions */}
            <div className={`rounded-2xl p-6 ${
              isDark 
                ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
                : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button className={`w-full py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? 'bg-gradient-to-r from-[#fd5757] to-[#ff8888] text-white'
                    : 'bg-gradient-to-r from-[#ef4444] to-[#fca5a5] text-white'
                }`}>
                  Bulk Export
                </button>
                <button className={`w-full py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                }`}>
                  Schedule Reports
                </button>
                <button className={`w-full py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? 'bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] text-white'
                    : 'bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] text-white'
                }`}>
                  Create Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Visualization Gallery */}
        <div className={`rounded-2xl p-6 ${
          isDark 
            ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
            : 'bg-gradient-to-b from-white to-gray-50 border border-gray-200'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
            <div>
              <h2 className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Visualization Gallery
              </h2>
              <p className={`mt-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Interactive visualizations for in-depth analysis
              </p>
            </div>
            <button className={`mt-4 lg:mt-0 px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
              isDark
                ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
            }`}>
              View All Visualizations
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visualizations.map((viz, index) => (
              <VisualizationCard 
                key={index}
                title={viz.title}
                description={viz.description}
                icon={viz.icon}
                color={viz.color}
              />
            ))}
          </div>
          
          {/* Stats Preview */}
          <div className={`mt-8 p-6 rounded-xl ${
            isDark ? 'bg-black/20' : 'bg-gray-100/50'
          }`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  12K+
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Charts Generated
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  98%
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  User Satisfaction
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  4.9s
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Avg. Load Time
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  24/7
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Availability
                </div>
              </div>
            </div>
          </div>
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
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}