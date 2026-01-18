// InputManagement.tsx - COMPLETE FIXED VERSION
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { ErrorBoundary } from '../components/shared/ErrorBoundary'
import { useSimulationStore } from '../store/store'
import { useThemeStore } from '../hooks/useTheme' 
import { CheckCircle2, Zap, Droplet, Wind, ArrowRight, Sparkles, ChevronRight, Thermometer, Cloud, Cpu, Server, Activity, Play, X, RotateCw, BarChart3, Shield, Leaf, Upload, FileText, MapPin, AlertCircle, Info, Calendar, ThermometerSun, Droplets, CloudRain } from 'lucide-react'
import AirSideEconomization from '../components/simulation/AirSideEconomization'
import ChilledWaterCooling from '../components/simulation/ChilledWaterCooling'
import { useNavigate } from 'react-router-dom'

const steps = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'technique', label: 'Cooling Technique', icon: Wind },
  { id: 'parameters', label: 'Configuration', icon: Thermometer },
  { id: 'review', label: 'Review', icon: CheckCircle2 }
]

interface Step2ParametersProps {
  isDark: boolean
  isTransitioning: boolean
  selectedTechnique: string | null
  currentConfig: any
  currentInput: any
  serverId: string
  countryId: string
  handleConfigChange: (config: any) => void
  locationData: any[]
}

const Step2Parameters: React.FC<Step2ParametersProps> = ({
  isDark,
  isTransitioning,
  selectedTechnique,
  currentConfig,
  currentInput,
  serverId,
  countryId,
  handleConfigChange,
  locationData
}) => {
  if (selectedTechnique === 'air') {
    return (
      <div className={`max-w-6xl mx-auto transition-all duration-500 ${
        isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
      }`}>
        <div className="text-center space-y-4 mb-12">
          <h2 className={`text-4xl font-bold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Configure Air-Side Economization
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Optimize your cooling parameters for maximum efficiency and cost savings
          </p>
        </div>
        
        <div className={`mb-8 p-6 rounded-2xl ${
          isDark 
            ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
            : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { 
                icon: Server, 
                label: 'Total Racks', 
                value: currentConfig?.numberOfRacks || currentInput?.numberOfRacks || 5 
              },
              { 
                icon: Cpu, 
                label: 'Servers', 
                value: ((currentConfig?.numberOfRacks || currentInput?.numberOfRacks || 5) * 10) 
              },
              { 
                icon: Wind, 
                label: 'Fan System', 
                value: currentConfig?.fans ? 'Mixed' : 'Standard' 
              },
              { 
                icon: Cloud, 
                label: 'Region', 
                value: currentConfig?.region || 'US Northeast' 
              }
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {stat.value}
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <AirSideEconomization
          serverId={serverId}
          countryId={countryId}
          serverType={currentConfig?.serverType || ''}
          numberOfRacks={currentConfig?.numberOfRacks || currentInput?.numberOfRacks || 5}
          serversPerRack={currentConfig?.serversPerRack || 10}
          averageUtilization={currentConfig?.averageUtilization || 45}
          peakUtilization={currentConfig?.peakUtilization || 85}
          fans={currentConfig?.fans || { bestFans: 2, averageFans: 4, oldFans: 0 }}
          region={currentConfig?.region || 'us_northeast'}
          onConfigChange={handleConfigChange}
          locationData={locationData}
        />
      </div>
    )
  }

  if (selectedTechnique === 'water') {
    return (
      <div className={`max-w-6xl mx-auto transition-all duration-500 ${
        isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
      }`}>
        <div className="text-center space-y-4 mb-12">
          <h2 className={`text-4xl font-bold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Configure Chilled-Water Cooling
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Optimize your water-based cooling system for maximum efficiency and reliability
          </p>
        </div>
        
        <div className={`mb-8 p-6 rounded-2xl ${
          isDark 
            ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
            : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Server, label: 'Total Racks', value: currentConfig?.numberOfRacks || currentInput?.numberOfRacks || 5 },
              { icon: Cpu, label: 'Servers', value: ((currentConfig?.numberOfRacks || currentInput?.numberOfRacks || 5) * 10) },
              { icon: Droplet, label: 'Rack Power', value: currentConfig?.rackPowerCapacity ? `${currentConfig.rackPowerCapacity} kW` : '10 kW' },
              { icon: Thermometer, label: 'Cooling Capacity', value: currentConfig?.coolingCapacityKW ? `${currentConfig.coolingCapacityKW.toFixed(0)} kW` : 'Calculating...' }
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {stat.value}
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <ChilledWaterCooling
          numberOfRacks={currentInput?.numberOfRacks || 5}
          serversPerRack={10}
          rackPowerCapacity={10}
          chilledWaterTemp={7}
          supplyWaterTemp={12}
          returnWaterTemp={18}
          waterFlowRate={50}
          chillerEfficiency={0.6}
          pumpEfficiency={0.8}
          coolingTowerEfficiency={0.7}
          onConfigChange={handleConfigChange}
          locationData={locationData}
        />
      </div>
    )
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-8 transition-all duration-500 ${
      isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
    }`}>
      <div className="text-center space-y-4">
        <h2 className={`text-4xl font-bold ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Advanced Configuration
        </h2>
        <p className={`text-lg ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Coming soon with enhanced features
        </p>
      </div>
      
      <div className={`h-96 w-full rounded-2xl flex items-center justify-center ${
        isDark ? 'bg-[#1a1f3a]' : 'bg-gray-100'
      }`}>
        <Activity className={`w-12 h-12 ${
          isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
        } animate-pulse`} />
      </div>
      
      <div className="text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
          isDark ? 'bg-[#27304a] text-gray-300' : 'bg-gray-100 text-gray-700'
        }`}>
          <Activity className="w-4 h-4" />
          <span className="text-sm">Advanced cooling techniques in development</span>
        </div>
      </div>
    </div>
  )
}

// Premium CSV Upload Component
const CSVUpload: React.FC<{
  onLocationDataUpload: (data: Array<{timestamp: string, temperature: number, humidity: number}>) => void
}> = ({ onLocationDataUpload }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [uploadError, setUploadError] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedData, setUploadedData] = useState<any[]>([])
  const [showInsights, setShowInsights] = useState(false)
  const isDark = useThemeStore((state) => state.isDark)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file) return
    
    if (!file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file with .csv extension')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    setUploadError('')
    setUploadedFileName(file.name)

    try {
      const text = await file.text()
      const parsedData = parseCSV(text)
      
      if (parsedData.length > 0) {
        setUploadedData(parsedData)
        onLocationDataUpload(parsedData)
        setShowInsights(true)
        
        // Analytics event
        console.log('Location data uploaded:', {
          dataPoints: parsedData.length,
          avgTemp: extractLocationInsights(parsedData)?.avgTemperature,
          suitability: extractLocationInsights(parsedData)?.suitabilityScore
        })
      } else {
        setUploadError('No valid data found in CSV file')
      }
    } catch (error) {
      setUploadError('Error parsing CSV file. Please check the format.')
      console.error('CSV parsing error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Flexible column detection
    const timestampKey = headers.find(h => h.includes('time') || h.includes('date') || h.includes('timestamp'))
    const tempKey = headers.find(h => h.includes('temp') || h.includes('temperature'))
    const humidityKey = headers.find(h => h.includes('hum') || h.includes('humidity') || h.includes('rh'))
    
    if (!timestampKey || !tempKey || !humidityKey) {
      setUploadError('CSV must contain timestamp, temperature, and humidity columns')
      return []
    }

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim())
      const row: any = {}
      
      headers.forEach((header, idx) => {
        const value = values[idx] || ''
        
        // Parse numeric values
        if (header === tempKey || header === humidityKey) {
          const numValue = parseFloat(value)
          row[header] = isNaN(numValue) ? null : numValue
        } else {
          row[header] = value
        }
      })

      return {
        timestamp: row[timestampKey] || `Entry ${index + 1}`,
        temperature: row[tempKey],
        humidity: row[humidityKey],
        rawData: row
      }
    }).filter(data => data.temperature !== null && data.humidity !== null)
  }

  const extractLocationInsights = (data: any[]) => {
    if (data.length === 0) return null
    
    const temperatures = data.map(d => d.temperature).filter(t => t !== null)
    const humidities = data.map(d => d.humidity).filter(h => h !== null)
    
    const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length
    const avgHumidity = humidities.reduce((a, b) => a + b, 0) / humidities.length
    
    return {
      avgTemperature: avgTemp,
      avgHumidity: avgHumidity,
      minTemperature: Math.min(...temperatures),
      maxTemperature: Math.max(...temperatures),
      minHumidity: Math.min(...humidities),
      maxHumidity: Math.max(...humidities),
      dataPoints: data.length,
      suitabilityScore: calculateSuitabilityScore(temperatures, humidities),
      temperatureRange: Math.max(...temperatures) - Math.min(...temperatures),
      humidityRange: Math.max(...humidities) - Math.min(...humidities)
    }
  }

  const calculateSuitabilityScore = (temperatures: number[], humidities: number[]) => {
    // Calculate suitability for air-side economization
    const tempScore = temperatures.filter(t => t < 25 && t > 5).length / temperatures.length
    const humidityScore = humidities.filter(h => h < 80 && h > 20).length / humidities.length
    return Math.round((tempScore * 0.6 + humidityScore * 0.4) * 100)
  }

  const getSuitabilityColor = (score: number) => {
    if (score >= 80) return isDark ? '#10b981' : '#10b981'
    if (score >= 60) return isDark ? '#fbbf24' : '#f59e0b'
    return isDark ? '#fd5757' : '#ef4444'
  }

  const getSuitabilityText = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Moderate'
    return 'Poor'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleClearUpload = () => {
    setUploadedFileName('')
    setUploadedData([])
    setUploadError('')
    setShowInsights(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onLocationDataUpload([])
  }

  const downloadSampleCSV = () => {
    const sampleCSV = `timestamp,temperature,humidity
2024-01-01 00:00,15.5,65
2024-01-01 01:00,15.2,66
2024-01-01 02:00,14.8,67
2024-01-01 03:00,14.5,68
2024-01-01 04:00,14.2,68
2024-01-01 05:00,14.0,69
2024-01-01 06:00,14.5,68
2024-01-01 07:00,15.0,67
2024-01-01 08:00,16.0,65
2024-01-01 09:00,17.5,63
2024-01-01 10:00,19.0,61
2024-01-01 11:00,20.5,60
2024-01-01 12:00,22.0,58
2024-01-01 13:00,23.0,57
2024-01-01 14:00,23.5,56
2024-01-01 15:00,23.0,57
2024-01-01 16:00,22.0,58
2024-01-01 17:00,20.5,60
2024-01-01 18:00,19.0,62
2024-01-01 19:00,17.5,64
2024-01-01 20:00,16.5,65
2024-01-01 21:00,16.0,66
2024-01-01 22:00,15.5,67
2024-01-01 23:00,15.2,67`

    const blob = new Blob([sampleCSV], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'location_data_sample.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2.5 rounded-xl ${
              isDark 
                ? 'bg-gradient-to-br from-[#5ce1e5]/10 to-[#5ce1e5]/5 border border-[#5ce1e5]/20' 
                : 'bg-gradient-to-br from-[#0ea5e9]/10 to-[#0ea5e9]/5 border border-[#0ea5e9]/20'
            }`}>
              <MapPin className={`w-5 h-5 ${
                isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
              }`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Location Data Analysis
              </h3>
              <p className={`text-sm mt-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Upload historical weather data for precise cooling optimization
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={downloadSampleCSV}
          className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
            isDark
              ? 'bg-gradient-to-r from-[#27304a] to-[#1a1f3a] text-gray-300 hover:text-white border border-[#3f4a68] hover:border-[#5ce1e5]/30'
              : 'bg-gradient-to-r from-white to-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-[#0ea5e9]/30'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Sample CSV</span>
        </button>
      </div>

      {/* Upload Area */}
      <div className="relative">
        <div
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
            isDragging
              ? isDark
                ? 'border-[#5ce1e5] bg-gradient-to-br from-[#5ce1e5]/5 to-transparent'
                : 'border-[#0ea5e9] bg-gradient-to-br from-[#0ea5e9]/5 to-transparent'
              : isDark
                ? 'border-[#3f4a68] bg-gradient-to-br from-[#1a1f3a] to-[#27304a] hover:border-[#5ce1e5]/50'
                : 'border-gray-300 bg-gradient-to-br from-white to-gray-50 hover:border-[#0ea5e9]/50'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-10">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
              isDark ? 'bg-[#5ce1e5]' : 'bg-[#0ea5e9]'
            }`} style={{ animation: 'float 8s ease-in-out infinite' }} />
            <div className={`absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl ${
              isDark ? 'bg-[#fd5757]' : 'bg-[#ef4444]'
            }`} style={{ animation: 'float 6s ease-in-out infinite reverse' }} />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".csv"
            className="hidden"
            disabled={isUploading}
          />
          
          <div className="relative z-10 p-10 text-center">
            {isUploading ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="relative w-16 h-16">
                    <div className={`absolute inset-0 rounded-full border-4 border-t-transparent animate-spin ${
                      isDark ? 'border-[#5ce1e5]/30' : 'border-[#0ea5e9]/30'
                    }`} />
                    <div className={`absolute inset-2 rounded-full border-4 border-t-transparent animate-spin ${
                      isDark ? 'border-[#5ce1e5]' : 'border-[#0ea5e9]'
                    }`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    <Upload className={`absolute inset-0 m-auto w-6 h-6 ${
                      isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                    }`} />
                  </div>
                </div>
                <div>
                  <div className={`text-lg font-medium mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Processing CSV File
                  </div>
                  <div className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Analyzing temperature and humidity data...
                  </div>
                </div>
              </div>
            ) : uploadedFileName ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-4">
                  <div className={`p-3 rounded-2xl ${
                    isDark 
                      ? 'bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border border-[#10b981]/20' 
                      : 'bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border border-[#10b981]/20'
                  }`}>
                    <CheckCircle2 className={`w-8 h-8 ${
                      isDark ? 'text-[#10b981]' : 'text-[#10b981]'
                    }`} />
                  </div>
                  <div className="text-left">
                    <div className={`font-medium text-lg ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {uploadedFileName}
                    </div>
                    <div className={`text-sm ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {uploadedData.length.toLocaleString()} data points successfully loaded
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowInsights(!showInsights)
                    }}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                      isDark
                        ? 'bg-gradient-to-r from-[#27304a] to-[#1a1f3a] text-gray-300 hover:text-white border border-[#3f4a68]'
                        : 'bg-gradient-to-r from-white to-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200'
                    }`}
                  >
                    {showInsights ? 'Hide Insights' : 'Show Insights'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClearUpload()
                    }}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                      isDark
                        ? 'bg-gradient-to-r from-[#27304a] to-[#1a1f3a] text-gray-300 hover:text-white border border-[#3f4a68] hover:border-[#fd5757]/30'
                        : 'bg-gradient-to-r from-white to-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-[#ef4444]/30'
                    }`}
                  >
                    Clear Upload
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className={`p-4 rounded-2xl ${
                    isDark 
                      ? 'bg-gradient-to-br from-[#5ce1e5]/10 to-[#5ce1e5]/5 border border-[#5ce1e5]/20' 
                      : 'bg-gradient-to-br from-[#0ea5e9]/10 to-[#0ea5e9]/5 border border-[#0ea5e9]/20'
                  }`}>
                    <Upload className={`w-8 h-8 ${
                      isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                    }`} />
                  </div>
                </div>
                <div>
                  <div className={`text-lg font-medium mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Drag & Drop CSV File
                  </div>
                  <div className={`text-sm mb-4 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Supports .csv files with timestamp, temperature, and humidity columns
                  </div>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                    isDark
                      ? 'bg-gradient-to-r from-[#27304a] to-[#1a1f3a] text-gray-300 hover:text-white border border-[#3f4a68] hover:border-[#5ce1e5]/30'
                      : 'bg-gradient-to-r from-white to-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-[#0ea5e9]/30'
                  }`}>
                    <FileText className="w-4 h-4" />
                    <span>Browse Files</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {uploadError && (
          <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-bottom-2 ${
            isDark 
              ? 'bg-gradient-to-r from-[#fd5757]/10 to-[#fd5757]/5 border border-[#fd5757]/20' 
              : 'bg-gradient-to-r from-[#ef4444]/10 to-[#ef4444]/5 border border-[#ef4444]/20'
          }`}>
            <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              isDark ? 'text-[#fd5757]' : 'text-[#ef4444]'
            }`} />
            <div>
              <div className={`font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Upload Error
              </div>
              <div className={`text-sm mt-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {uploadError}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Insights */}
      {showInsights && uploadedData.length > 0 && (
        <div className={`rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 ${
          isDark 
            ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
            : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
        }`}>
          <div className="p-6 border-b border-opacity-20" style={{ 
            borderColor: isDark ? '#3f4a68' : '#e5e7eb' 
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  isDark 
                    ? 'bg-gradient-to-br from-[#5ce1e5]/10 to-[#5ce1e5]/5 border border-[#5ce1e5]/20' 
                    : 'bg-gradient-to-br from-[#0ea5e9]/10 to-[#0ea5e9]/5 border border-[#0ea5e9]/20'
                }`}>
                  <BarChart3 className={`w-5 h-5 ${
                    isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                  }`} />
                </div>
                <div>
                  <h4 className={`font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Location Insights
                  </h4>
                  <p className={`text-sm mt-1 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Analysis based on uploaded weather data
                  </p>
                </div>
              </div>
              
              {(() => {
                const insights = extractLocationInsights(uploadedData)
                if (!insights) return null
                
                return (
                  <div className={`px-4 py-2 rounded-full font-medium ${
                    isDark ? 'bg-black/20' : 'bg-gray-100'
                  }`} style={{ color: getSuitabilityColor(insights.suitabilityScore) }}>
                    {getSuitabilityText(insights.suitabilityScore)} Suitability
                  </div>
                )
              })()}
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {(() => {
                const insights = extractLocationInsights(uploadedData)
                if (!insights) return null
                
                return [
                  {
                    label: 'Avg Temperature',
                    value: `${insights.avgTemperature.toFixed(1)}°C`,
                    icon: ThermometerSun,
                    color: isDark ? '#5ce1e5' : '#0ea5e9',
                    subtext: `${insights.minTemperature.toFixed(1)}°C - ${insights.maxTemperature.toFixed(1)}°C`
                  },
                  {
                    label: 'Avg Humidity',
                    value: `${insights.avgHumidity.toFixed(1)}%`,
                    icon: Droplets,
                    color: isDark ? '#8b5cf6' : '#8b5cf6',
                    subtext: `${insights.minHumidity.toFixed(1)}% - ${insights.maxHumidity.toFixed(1)}%`
                  },
                  {
                    label: 'Data Points',
                    value: insights.dataPoints.toLocaleString(),
                    icon: Calendar,
                    color: isDark ? '#fbbf24' : '#f59e0b',
                    subtext: 'Historical records'
                  },
                  {
                    label: 'Suitability Score',
                    value: `${insights.suitabilityScore}%`,
                    icon: Wind,
                    color: getSuitabilityColor(insights.suitabilityScore),
                    subtext: getSuitabilityText(insights.suitabilityScore)
                  }
                ].map((metric, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                      isDark ? 'bg-[#27304a]' : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg`} style={{ 
                        backgroundColor: `${metric.color}20`,
                        border: `1px solid ${metric.color}30`
                      }}>
                        <metric.icon className="w-4 h-4" style={{ color: metric.color }} />
                      </div>
                      <div className={`text-sm font-medium ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {metric.label}
                      </div>
                    </div>
                    <div className={`text-2xl font-bold mb-1 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {metric.value}
                    </div>
                    <div className={`text-xs ${
                      isDark ? 'text-gray-500' : 'text-gray-600'
                    }`}>
                      {metric.subtext}
                    </div>
                  </div>
                ))
              })()}
            </div>
            
            {/* Recommendations */}
            <div className={`p-4 rounded-xl ${
              isDark ? 'bg-black/20 border border-[#3f4a68]' : 'bg-gray-100/50 border border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                }`} />
                <div>
                  <div className={`font-medium mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {(() => {
                      const insights = extractLocationInsights(uploadedData)
                      if (!insights) return 'Loading recommendations...'
                      
                      if (insights.suitabilityScore >= 80) {
                        return 'Excellent location for air-side economization!'
                      } else if (insights.suitabilityScore >= 60) {
                        return 'Good location with moderate cooling potential'
                      } else if (insights.suitabilityScore >= 40) {
                        return 'Consider hybrid cooling approach'
                      } else {
                        return 'Alternative cooling methods recommended'
                      }
                    })()}
                  </div>
                  <div className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {(() => {
                      const insights = extractLocationInsights(uploadedData)
                      if (!insights) return ''
                      
                      if (insights.suitabilityScore >= 80) {
                        return 'Your location has ideal conditions for maximum energy savings through air-side cooling.'
                      } else if (insights.suitabilityScore >= 60) {
                        return 'You can achieve significant savings with proper configuration and monitoring.'
                      } else if (insights.suitabilityScore >= 40) {
                        return 'A hybrid approach combining air-side with traditional cooling is recommended.'
                      } else {
                        return 'The climate conditions may limit air-side cooling effectiveness. Consider alternative solutions.'
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


export const InputManagement: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)
  const [currentConfig, setCurrentConfig] = useState<any>(null)
  const [locationData, setLocationData] = useState<any[]>([])
  
  // ✅ FIX: Store serverId and countryId in parent state
  const [serverId, setServerId] = useState<string>('')
  const [countryId, setCountryId] = useState<string>('')
  
  const configRef = useRef<any>(null)
  const navigate = useNavigate()
  
  const { currentInput, setCurrentInput, updateSimulationInput, runSimulation } = useSimulationStore()
  const isDark = useThemeStore((state) => state.isDark)

  // Handle step transitions
  const handleStepChange = (newStep: number) => {
    setIsTransitioning(true)
    
    // Capture config before moving to next step
    if (currentStep === 2 && configRef.current) {
      const config = configRef.current
      setCurrentConfig(config) // Store for review step
      updateSimulationInput({ 
        coolingTechnique: selectedTechnique || 'air', 
        airSideConfig: config,
        locationData: locationData // Include location data
      } as any)
    }
    
    setTimeout(() => {
      setCurrentStep(newStep)
      setIsTransitioning(false)
    }, 300)
  }

  const handleTechniqueSelect = (techId: string) => {
    setSelectedTechnique(techId)
    setCurrentStep(2)
  }

  const handleLocationDataUpload = (data: any[]) => {
    setLocationData(data)
    
    // Update config with location insights
    if (configRef.current) {
      const insights = data.length > 0 ? {
        avgTemperature: data.reduce((sum, d) => sum + d.temperature, 0) / data.length,
        avgHumidity: data.reduce((sum, d) => sum + d.humidity, 0) / data.length,
        dataPoints: data.length
      } : null
      
      configRef.current.locationInsights = insights
    }
  }

  // Enhanced simulation run with loader
  const handleSubmit = async () => {
    // Capture config before submitting
    if (configRef.current) {
      const config = configRef.current
      setCurrentConfig(config)
      
      // ✅ FIX: Ensure serverId and countryId are included
      const completeConfig = {
        ...config,
        serverId: config.serverId || serverId,
        countryId: config.countryId || countryId
      }
      
      updateSimulationInput({ 
        coolingTechnique: selectedTechnique || 'air', 
        airSideConfig: completeConfig,
        locationData: locationData
      } as any)
    }
    
    // Start simulation loader
    setIsSimulationRunning(true)
    setSimulationProgress(0)
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setSimulationProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        const increment = Math.random() * 10 + 5 // 5-15% increments
        return Math.min(prev + increment, 100)
      })
    }, 500)
    
    // Run actual simulation
    if (currentInput) {
      try {
        await runSimulation(currentInput)
        
        // Wait for simulation to complete
        setTimeout(() => {
          clearInterval(progressInterval)
          setSimulationProgress(100)
          
          // Show completion for 1 second then navigate
          setTimeout(() => {
            setIsSimulationRunning(false)
            navigate('/dashboard')
          }, 1000)
        }, 3000)
      } catch (error) {
        clearInterval(progressInterval)
        setIsSimulationRunning(false)
        console.error('Simulation failed:', error)
      }
    }
  }

  // ✅ FIX: Handle config change with proper state management
  const handleConfigChange = useCallback((config: any) => {
    // Store in ref immediately for quick access
    configRef.current = config
    
    // ✅ FIX: Store serverId and countryId from config
    if (config.serverId && config.serverId !== serverId) {
      setServerId(config.serverId)
    }
    
    if (config.countryId && config.countryId !== countryId) {
      setCountryId(config.countryId)
    }
    
    // Debounce state update to prevent excessive re-renders
    setCurrentConfig(prev => {
      if (JSON.stringify(prev) === JSON.stringify(config)) return prev
      return config
    })
  }, [serverId, countryId])

  // ✅ FIX: Initialize from existing config if available
  useEffect(() => {
    if (currentConfig) {
      if (currentConfig.serverId && !serverId) {
        setServerId(currentConfig.serverId)
      }
      if (currentConfig.countryId && !countryId) {
        setCountryId(currentConfig.countryId)
      }
    }
  }, [currentConfig, serverId, countryId])

  const coolingTechniques = [
    {
      id: 'air',
      name: 'Air-Side Economization',
      description: 'Use cooler outdoor air for data center cooling with intelligent ventilation control',
      icon: Wind,
      gradient: 'from-[#5ce1e5] to-[#0ea5e9]',
      features: ['Energy Efficient', 'Cost Effective', 'Sustainable'],
      color: isDark ? '#5ce1e5' : '#0ea5e9'
    },
    {
      id: 'water',
      name: 'Chilled-Water Cooling',
      description: 'Implement advanced water-based cooling systems with precise temperature control',
      icon: Droplet,
      gradient: 'from-[#8b5cf6] to-[#a78bfa]',
      features: ['High Efficiency', 'Precise Control', 'Scalable'],
      color: isDark ? '#8b5cf6' : '#8b5cf6'
    },
    {
      id: 'evaporative',
      name: 'Evaporative Cooling',
      description: 'Use natural evaporation processes for maximum cooling efficiency in dry climates',
      icon: Sparkles,
      gradient: 'from-[#10b981] to-[#34d399]',
      features: ['Natural Process', 'Low Energy', 'High Efficiency'],
      color: isDark ? '#10b981' : '#10b981'
    },
  ]

  useEffect(() => {
    if (!currentInput) {
      setCurrentInput({
        dataCenterName: '',
        location: '',
        itLoad: 0,
        numberOfRacks: 0,
        coolingTechnique: 'air',
        supplyAirTemp: 20,
        chilledWaterTemp: 12,
        efficiencyFactor: 0.85,
        electricityTariff: 0.12,
        co2EmissionFactor: 0.5,
        reviewed: false,
      })
    }
  }, [currentInput, setCurrentInput])

  // Step 0 - Welcome
  const Step0Welcome = useMemo(() => () => (
    <div className={`space-y-10 max-w-4xl mx-auto transition-all duration-500 ${
      isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
    }`}>
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <div className={`absolute inset-0 w-24 h-24 rounded-2xl blur-xl ${
            isDark 
              ? 'bg-gradient-to-br from-[#5ce1e5] to-[#fd5757] opacity-30' 
              : 'bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5] opacity-30'
          }`} />
          <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center ${
            isDark 
              ? 'bg-gradient-to-br from-[#5ce1e5] to-[#fd5757]' 
              : 'bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]'
          } shadow-lg`}>
            <Zap className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>
        
        <h1 className={`text-5xl lg:text-6xl font-bold leading-tight ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Intelligent{' '}
          <span className={`bg-gradient-to-r ${
            isDark 
              ? 'from-[#5ce1e5] to-[#fd5757]' 
              : 'from-[#0ea5e9] to-[#5ce1e5]'
          } bg-clip-text text-transparent`}>
            Data Center
          </span>{' '}
          Cooling
        </h1>
        
        <p className={`text-xl max-w-2xl mx-auto leading-relaxed ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Optimize your cooling strategy with AI-powered analysis. Reduce energy costs by up to 40% while maintaining peak performance.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
        {[
          { 
            icon: Zap, 
            label: 'Energy Efficient', 
            description: 'Reduce power consumption significantly',
            color: isDark ? '#fbbf24' : '#f59e0b'
          },
          { 
            icon: Droplet, 
            label: 'Cost Effective', 
            description: 'Lower operational expenses',
            color: isDark ? '#60a5fa' : '#3b82f6'
          },
          { 
            icon: Wind, 
            label: 'Sustainable', 
            description: 'Reduce carbon footprint',
            color: isDark ? '#34d399' : '#10b981'
          },
        ].map((feature, idx) => (
          <div 
            key={idx}
            className={`group p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
              isDark
                ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]'
                : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                isDark ? 'bg-black/30' : 'bg-gray-100'
              }`}>
                <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
              </div>
              <div>
                <div className={`font-bold text-lg mb-1 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {feature.label}
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {feature.description}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Get Started Button */}
      <div className="text-center pt-8">
        <button
          onClick={() => handleStepChange(1)}
          className={`group relative px-8 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 overflow-hidden ${
            isDark
              ? 'bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white'
              : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
          }`}
        >
          {/* Shine Effect */}
          <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 transition-all duration-700 group-hover:left-full" />
          
          <span className="relative flex items-center justify-center gap-3">
            <span>Start Configuration</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
        
        <p className={`mt-4 text-sm ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
          Complete in just a few steps • No credit card required
        </p>
      </div>
    </div>
  ), [isDark, isTransitioning])

  const Step1CoolingTechnique = useMemo(() => () => (
    <div className={`max-w-6xl mx-auto transition-all duration-500 ${
      isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
    }`}>
      <div className="text-center space-y-4 mb-12">
        <h2 className={`text-4xl font-bold ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Select Your Cooling Strategy
        </h2>
        <p className={`text-lg max-w-2xl mx-auto ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Choose the technique that best fits your data center environment and requirements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {coolingTechniques.map((technique) => {
          const TechIcon = technique.icon
          return (
            <button
              key={technique.id}
              onClick={() => handleTechniqueSelect(technique.id)}
              className={`group relative rounded-2xl p-8 text-left transition-all duration-300 transform hover:scale-105 ${
                selectedTechnique === technique.id
                  ? isDark
                    ? 'ring-2 ring-opacity-50 bg-gradient-to-br from-[#1a1f3a] to-[#27304a]'
                    : 'ring-2 ring-opacity-50 bg-gradient-to-br from-white to-gray-50'
                  : isDark
                    ? 'bg-gradient-to-br from-[#1a1f3a]/50 to-[#27304a]/50 hover:bg-gradient-to-br hover:from-[#1a1f3a] hover:to-[#27304a]'
                    : 'bg-gradient-to-br from-white/50 to-gray-50/50 hover:bg-gradient-to-br hover:from-white hover:to-gray-50'
              } ${selectedTechnique === technique.id ? 'ring-opacity-50' : ''}`}
              style={selectedTechnique === technique.id ? { 
                borderColor: technique.color,
                boxShadow: `0 0 0 2px ${technique.color}20`
              } : {}}
            >
              {/* Glow Effect on Selected */}
              {selectedTechnique === technique.id && (
                <div 
                  className="absolute inset-0 rounded-2xl opacity-20"
                  style={{
                    background: `radial-gradient(circle at center, ${technique.color}40, transparent 70%)`
                  }}
                />
              )}

              <div className="relative z-10 space-y-6">
                {/* Icon and Header */}
                <div className="flex items-start justify-between">
                  <div className={`p-4 rounded-2xl ${
                    isDark ? 'bg-black/30' : 'bg-white/50'
                  }`}>
                    <TechIcon className="w-8 h-8" style={{ color: technique.color }} />
                  </div>
                  {selectedTechnique === technique.id && (
                    <CheckCircle2 className="w-6 h-6 animate-pulse" style={{ color: technique.color }} />
                  )}
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <h3 className={`text-2xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {technique.name}
                  </h3>
                  <p className={`leading-relaxed ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {technique.description}
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {technique.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: technique.color }} />
                      <span className={`text-sm ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className={`inline-flex items-center gap-2 text-sm font-medium ${
                  isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'
                } transition-colors`}>
                  <span>Select Technique</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  ), [isDark, isTransitioning, selectedTechnique, coolingTechniques])

  // Step 3 - Review (Updated with CSV data)
  const Step3ReviewSubmit = useMemo(() => () => {
    const selectedTech = coolingTechniques.find(t => t.id === selectedTechnique)
    
    return (
      <div className={`max-w-4xl mx-auto space-y-8 transition-all duration-500 ${
        isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
      }`}>
        <div className="text-center space-y-4">
          <h2 className={`text-4xl font-bold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Review Your Configuration
          </h2>
          <p className={`text-lg ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Verify all settings before running the simulation
          </p>
        </div>

        {/* Summary Cards */}
        <div className="space-y-6">
          {/* Technique Card */}
          <div className={`p-8 rounded-2xl ${
            isDark 
              ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
              : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  isDark ? 'bg-black/30' : 'bg-gray-100'
                }`}>
                  <Wind className="w-6 h-6" style={{ 
                    color: selectedTech?.color 
                  }} />
                </div>
                <div>
                  <div className={`font-bold text-lg ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Cooling Technique
                  </div>
                  <div className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {selectedTech?.name || 'Not selected'}
                  </div>
                </div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            
            {/* Technique Description */}
            <div className={`mt-4 p-4 rounded-xl ${
              isDark ? 'bg-black/20' : 'bg-gray-100/50'
            }`}>
              <p className={`text-sm ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {selectedTech?.description || 'No technique selected'}
              </p>
            </div>
          </div>

          {/* Location Data Section */}
          {locationData.length > 0 && (
            <div className={`p-8 rounded-2xl ${
              isDark 
                ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
                : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    isDark ? 'bg-black/30' : 'bg-gray-100'
                  }`}>
                    <MapPin className="w-6 h-6" style={{ 
                      color: selectedTech?.color 
                    }} />
                  </div>
                  <div>
                    <div className={`font-bold text-lg ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      Location Data
                    </div>
                    <div className={`text-sm ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Historical weather data loaded
                    </div>
                  </div>
                </div>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const avgTemp = locationData.reduce((sum, d) => sum + d.temperature, 0) / locationData.length
                  const avgHumidity = locationData.reduce((sum, d) => sum + d.humidity, 0) / locationData.length
                  const temps = locationData.map(d => d.temperature)
                  const humidities = locationData.map(d => d.humidity)
                  const suitabilityScore = Math.round(
                    (temps.filter(t => t < 25).length / temps.length * 0.6 + 
                     humidities.filter(h => h < 80).length / humidities.length * 0.4) * 100
                  )
                  
                  return [
                    { 
                      label: 'Avg Temperature', 
                      value: `${avgTemp.toFixed(1)}°C`, 
                      description: 'Based on uploaded data'
                    },
                    { 
                      label: 'Avg Humidity', 
                      value: `${avgHumidity.toFixed(1)}%`, 
                      description: 'Based on uploaded data'
                    },
                    { 
                      label: 'Data Points', 
                      value: locationData.length.toString(), 
                      description: 'Historical records'
                    },
                    { 
                      label: 'Suitability', 
                      value: `${suitabilityScore}%`, 
                      description: 'For air-side cooling'
                    }
                  ].map((item, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-xl text-center ${
                        isDark ? 'bg-black/20' : 'bg-gray-100/50'
                      }`}
                    >
                      <div className={`text-lg font-bold mb-1 ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {item.value}
                      </div>
                      <div className={`text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {item.label}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isDark ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {item.description}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          {/* Configuration Details - Updates Live */}
          <div className={`p-8 rounded-2xl ${
            isDark 
              ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
              : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
          }`}>
            <h3 className={`text-xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Configuration Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { 
                  label: 'Server ID', 
                  value: serverId || 'Not set', 
                  icon: Server,
                  description: 'Database server identifier'
                },
                { 
                  label: 'Country ID', 
                  value: countryId || 'Not set', 
                  icon: MapPin,
                  description: 'Database country identifier'
                },
                { 
                  label: 'Total Racks', 
                  value: currentConfig?.numberOfRacks || currentInput?.numberOfRacks || 5, 
                  icon: Server,
                  description: 'Number of server racks'
                },
                { 
                  label: 'Total Servers', 
                  value: ((currentConfig?.numberOfRacks || currentInput?.numberOfRacks || 5) * 10), 
                  icon: Cpu,
                  description: 'Based on racks × 10'
                },
                { 
                  label: 'Fan Configuration', 
                  value: currentConfig?.fans ? 'Mixed Efficiency' : 'Standard', 
                  icon: Wind,
                  description: currentConfig?.fans ? `${currentConfig.fans.bestFans} Best / ${currentConfig.fans.averageFans} Avg / ${currentConfig.fans.oldFans} Old` : 'Default'
                },
                { 
                  label: 'Server Utilization', 
                  value: currentConfig?.averageUtilization ? `${currentConfig.averageUtilization}% Avg` : '45% Avg', 
                  icon: BarChart3,
                  description: currentConfig?.peakUtilization ? `${currentConfig.peakUtilization}% Peak` : '85% Peak'
                },
                { 
                  label: 'Server Type', 
                  value: currentConfig?.serverType || 'Dell PowerEdge R750', 
                  icon: Server,
                  description: 'Hardware specification'
                },
                { 
                  label: 'Region', 
                  value: currentConfig?.region || 'US Northeast', 
                  icon: Cloud,
                  description: 'Geographic location'
                },
                { 
                  label: 'IT Load', 
                  value: currentInput?.itLoad ? `${currentInput.itLoad} kW` : 'Not set', 
                  icon: Zap,
                  description: 'Total IT equipment load'
                },
                { 
                  label: 'Supply Air Temp', 
                  value: currentInput?.supplyAirTemp ? `${currentInput.supplyAirTemp}°C` : '20°C', 
                  icon: Thermometer,
                  description: 'Cooling supply temperature'
                }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                    isDark ? 'bg-black/20' : 'bg-gray-100/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <item.icon className="w-5 h-5" style={{ 
                      color: selectedTech?.color 
                    }} />
                    <div className={`text-xs font-medium uppercase tracking-wide ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {item.label}
                    </div>
                  </div>
                  <div className={`text-lg font-bold mb-1 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {item.value}
                  </div>
                  <div className={`text-xs ${
                    isDark ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Benefits */}
          <div className={`p-8 rounded-2xl ${
            isDark 
              ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
              : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
          }`}>
            <h3 className={`text-xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Estimated Benefits
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  label: 'Energy Savings', 
                  value: locationData.length > 0 ? 'Up to 45%' : 'Up to 40%', 
                  icon: Zap,
                  color: isDark ? '#fbbf24' : '#f59e0b'
                },
                { 
                  label: 'Cost Reduction', 
                  value: locationData.length > 0 ? 'Up to 38%' : 'Up to 35%', 
                  icon: Shield,
                  color: isDark ? '#34d399' : '#10b981'
                },
                { 
                  label: 'CO₂ Reduction', 
                  value: locationData.length > 0 ? 'Up to 55%' : 'Up to 50%', 
                  icon: Leaf,
                  color: isDark ? '#60a5fa' : '#3b82f6'
                }
              ].map((benefit, idx) => (
                <div 
                  key={idx}
                  className={`p-6 rounded-xl text-center transition-all duration-300 hover:scale-105 ${
                    isDark ? 'bg-black/20' : 'bg-gray-100/50'
                  }`}
                >
                  <benefit.icon className="w-8 h-8 mx-auto mb-3" style={{ color: benefit.color }} />
                  <div className={`text-2xl font-bold mb-1 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {benefit.value}
                  </div>
                  <div className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {benefit.label}
                  </div>
                </div>
              ))}
            </div>
            
            {locationData.length > 0 && (
              <div className={`mt-6 p-4 rounded-xl text-center ${
                isDark ? 'bg-[#5ce1e5]/10 border border-[#5ce1e5]/20' : 'bg-[#0ea5e9]/10 border border-[#0ea5e9]/20'
              }`}>
                <div className={`text-sm font-medium ${
                  isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                }`}>
                  Location data enabled: 5-10% additional savings estimated
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <button
            onClick={() => handleStepChange(2)}
            className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
              isDark
                ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            Back to Configuration
          </button>
          <button
            onClick={handleSubmit}
            className={`group relative px-8 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 overflow-hidden ${
              isDark
                ? 'bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white'
                : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
            }`}
          >
            {/* Shine Effect */}
            <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 transition-all duration-700 group-hover:left-full" />
            
            <span className="relative flex items-center justify-center gap-3">
              <Play className="w-5 h-5" />
              <span>Run Simulation</span>
            </span>
          </button>
        </div>
      </div>
    )
  }, [isDark, isTransitioning, selectedTechnique, coolingTechniques, currentConfig, currentInput, locationData, serverId, countryId, handleStepChange, handleSubmit])

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
        <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl ${
          isDark ? 'bg-[#fd5757]/5' : 'bg-[#ef4444]/5'
        }`} style={{ animation: 'float 6s ease-in-out 2s infinite reverse' }} />
      </div>

      <main className="lg:ml-64">
        <div className="relative">
          {/* Header with Progress Steps */}
          <div className={`sticky top-0 z-40 backdrop-blur-xl ${
            isDark 
              ? 'bg-[#0a0e27]/80 border-b border-[#3f4a68]' 
              : 'bg-white/80 border-b border-gray-200'
          }`}>
            <div className="max-w-6xl mx-auto px-6 py-6">
              {/* Step Labels */}
              <div className="flex items-center justify-between mb-6">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => idx <= currentStep && handleStepChange(idx)}
                      disabled={idx > currentStep}
                      className={`flex items-center gap-3 transition-all ${
                        idx <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all transform ${
                        idx < currentStep
                          ? isDark
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-green-500/20 text-green-600'
                          : idx === currentStep
                          ? isDark
                            ? 'bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white scale-110'
                            : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white scale-110'
                          : isDark
                            ? 'bg-[#27304a] text-gray-400'
                            : 'bg-gray-200 text-gray-500'
                      }`}>
                        {idx < currentStep ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                      </div>
                      
                      <div className="hidden md:block">
                        <div className={`text-xs font-medium uppercase tracking-wider ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Step {idx + 1}
                        </div>
                        <div className={`font-semibold ${
                          idx <= currentStep 
                            ? isDark ? 'text-white' : 'text-gray-900'
                            : isDark ? 'text-gray-600' : 'text-gray-500'
                        }`}>
                          {step.label}
                        </div>
                      </div>
                    </button>

                    {idx < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-6 rounded-full transition-all ${
                        idx < currentStep 
                          ? isDark ? 'bg-green-500' : 'bg-green-500'
                          : isDark ? 'bg-[#3f4a68]' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className={`h-1 rounded-full overflow-hidden ${
                isDark ? 'bg-[#27304a]' : 'bg-gray-200'
              }`}>
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${((currentStep + 1) / steps.length) * 100}%`,
                    background: isDark 
                      ? 'linear-gradient(90deg, #5ce1e5, #fd5757)'
                      : 'linear-gradient(90deg, #0ea5e9, #5ce1e5)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-6xl mx-auto px-6 py-12 min-h-[calc(100vh-200px)] flex items-center justify-center">
            <ErrorBoundary>
              <div className="w-full">
                {currentStep === 0 && <Step0Welcome />}
                {currentStep === 1 && <Step1CoolingTechnique />}
                {currentStep === 2 && (
                  <Step2Parameters
                    isDark={isDark}
                    isTransitioning={isTransitioning}
                    selectedTechnique={selectedTechnique}
                    currentConfig={currentConfig}
                    currentInput={currentInput}
                    serverId={serverId}
                    countryId={countryId}
                    handleConfigChange={handleConfigChange}
                    locationData={locationData}
                  />
                )}
                {currentStep === 3 && <Step3ReviewSubmit />}
              </div>
            </ErrorBoundary>
          </div>

          {/* Footer Navigation */}
          {currentStep > 0 && (
            <div className={`sticky bottom-0 z-30 backdrop-blur-xl ${
              isDark 
                ? 'bg-[#0a0e27]/80 border-t border-[#3f4a68]' 
                : 'bg-white/80 border-t border-gray-200'
            }`}>
              <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="flex justify-between">
                  <button
                    onClick={() => handleStepChange(currentStep - 1)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                      isDark
                        ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                  >
                    <ArrowRight className="w-5 h-5 rotate-180" />
                    <span>Previous</span>
                  </button>
                  
                  {currentStep < steps.length - 1 && (
                    <button
                      onClick={() => handleStepChange(currentStep + 1)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                        isDark
                          ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white'
                          : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'
                      }`}
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
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
        
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        
        @keyframes pulseDot {
          0%, 100% { 
            transform: translateY(-50%) scale(1);
            box-shadow: 0 0 0 4px ${isDark ? '#5ce1e540' : '#0ea5e940'};
          }
          50% { 
            transform: translateY(-50%) scale(1.2);
            boxShadow: 0 0 0 8px ${isDark ? '#5ce1e520' : '#0ea5e920'};
          }
        }
      `}</style>
    </div>
  )
}

export default InputManagement
