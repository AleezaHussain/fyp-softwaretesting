import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { ErrorBoundary } from '../components/shared/ErrorBoundary'
import { useSimulationStore } from '../store/store'
import { useThemeStore } from '../hooks/useTheme' 
import { CheckCircle2, Zap, Droplet, Wind, ArrowRight, Sparkles, ChevronRight, Thermometer, Cloud, Cpu, Server, Activity, Play, X, RotateCw, BarChart3, Shield, Leaf } from 'lucide-react'
import AirSideEconomization from '../components/simulation/AirSideEconomization'
import { useNavigate } from 'react-router-dom'

const steps = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'technique', label: 'Cooling Technique', icon: Wind },
  { id: 'parameters', label: 'Configuration', icon: Thermometer },
  { id: 'review', label: 'Review', icon: CheckCircle2 }
]

// Simulated Progress Loader Component
const SimulationProgress: React.FC<{
  progress: number
  isRunning: boolean
  onClose: () => void
}> = ({ progress, isRunning, onClose }) => {
  const isDark = useThemeStore((state) => state.isDark)
  const [currentMessage, setCurrentMessage] = useState('Initializing simulation...')
  
  const messages = [
    'Analyzing data center configuration...',
    'Calculating thermal dynamics...',
    'Optimizing cooling parameters...',
    'Running energy efficiency algorithms...',
    'Generating optimization strategies...',
    'Finalizing simulation results...'
  ]

  // Generate particles once using useMemo
  const particles = useMemo(() => 
    Array.from({ length: 20 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 3 + Math.random() * 2,
      delay: Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.4
    }))
  , [])

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        const randomMessage = messages[Math.floor(Math.random() * messages.length)]
        setCurrentMessage(randomMessage)
      }, 2000)
      
      return () => clearInterval(interval)
    }
  }, [isRunning])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-md"
        style={{
          background: isDark 
            ? 'radial-gradient(circle at center, rgba(10, 14, 39, 0.9), rgba(26, 31, 58, 0.95))'
            : 'radial-gradient(circle at center, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.95))'
        }}
      />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Particles - FIXED */}
        {particles.map((p, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full ${
              isDark ? 'bg-[#5ce1e5]' : 'bg-[#0ea5e9]'
            }`}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `floatParticle ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
              opacity: p.opacity
            }}
          />
        ))}
        
        {/* Cooling Wave Animation */}
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <style>{`
                @keyframes waveAnimation {
                  0% { d: path('M0,50 Q25,40 50,50 T100,50'); }
                  50% { d: path('M0,50 Q25,60 50,50 T100,50'); }
                  100% { d: path('M0,50 Q25,40 50,50 T100,50'); }
                }
              `}</style>
            </defs>
            <path
              d="M0,50 Q25,40 50,50 T100,50"
              fill="none"
              stroke={isDark ? '#5ce1e5' : '#0ea5e9'}
              strokeWidth="0.5"
              opacity="0.3"
              style={{ animation: 'waveAnimation 4s ease-in-out infinite' }}
            />
            <path
              d="M0,50 Q25,45 50,50 T100,50"
              fill="none"
              stroke={isDark ? '#fd5757' : '#ef4444'}
              strokeWidth="0.5"
              opacity="0.2"
              style={{ animation: 'waveAnimation 4s ease-in-out infinite 0.5s' }}
            />
          </svg>
        </div>
      </div>

      {/* Main Loader Card */}
      <div className={`relative w-full max-w-2xl rounded-3xl overflow-hidden transform transition-all duration-500 ${
        isRunning ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Animated Border */}
        <div className={`absolute inset-0 rounded-3xl p-1`}>
          <div className={`absolute inset-0 rounded-3xl ${
            isDark 
              ? 'bg-gradient-to-r from-[#5ce1e5] via-[#fd5757] to-[#5ce1e5]' 
              : 'bg-gradient-to-r from-[#0ea5e9] via-[#ef4444] to-[#0ea5e9]'
          } opacity-80`} style={{ 
            backgroundSize: '200% 100%',
            animation: 'gradientShift 3s ease-in-out infinite'
          }} />
        </div>

        {/* Content */}
        <div className={`relative rounded-3xl p-8 ${
          isDark 
            ? 'bg-gradient-to-b from-[#1a1f3a] to-[#27304a]' 
            : 'bg-gradient-to-b from-white to-gray-50'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${
                isDark ? 'bg-black/30' : 'bg-gray-100'
              }`}>
                <Zap className={`w-8 h-8 ${
                  isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                } animate-pulse`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Running Simulation
                </h2>
                <p className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Optimizing your data center cooling
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all hover:scale-110 ${
                isDark 
                  ? 'hover:bg-[#27304a] text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar with Animation */}
          <div className="space-y-6">
            {/* Progress Bar Container */}
            <div className={`relative h-4 rounded-full overflow-hidden ${
              isDark ? 'bg-[#27304a]' : 'bg-gray-200'
            }`}>
              {/* Animated Background */}
              <div className={`absolute inset-0 ${
                isDark 
                  ? 'bg-gradient-to-r from-[#5ce1e5]/20 via-[#fd5757]/20 to-[#5ce1e5]/20' 
                  : 'bg-gradient-to-r from-[#0ea5e9]/20 via-[#ef4444]/20 to-[#0ea5e9]/20'
              }`} style={{ 
                backgroundSize: '200% 100%',
                animation: 'gradientShift 3s ease-in-out infinite'
              }} />
              
              {/* Progress Fill */}
              <div 
                className="absolute inset-0 rounded-full transition-all duration-500"
                style={{ 
                  width: `${progress}%`,
                  background: isDark 
                    ? 'linear-gradient(90deg, #5ce1e5, #fd5757)'
                    : 'linear-gradient(90deg, #0ea5e9, #ef4444)',
                  boxShadow: `0 0 20px ${isDark ? '#5ce1e5' : '#0ea5e9'}40`
                }}
              >
                {/* Pulsing Dot */}
                <div 
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-lg"
                  style={{ 
                    animation: 'pulseDot 1.5s ease-in-out infinite',
                    boxShadow: `0 0 0 4px ${isDark ? '#5ce1e5' : '#0ea5e9'}40`
                  }}
                />
              </div>
            </div>

            {/* Progress Info */}
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-4xl font-bold mb-1 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {Math.round(progress)}%
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {currentMessage}
                </div>
              </div>
              
              {/* Progress Indicators */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      progress >= i * 33
                        ? isDark ? 'bg-[#5ce1e5]' : 'bg-[#0ea5e9]'
                        : isDark ? 'bg-[#3f4a68]' : 'bg-gray-300'
                    }`}
                    style={{
                      animation: progress >= i * 33 
                        ? `pulseDot 1.5s ease-in-out infinite ${i * 0.2}s`
                        : 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { label: 'Energy Saving', value: `${Math.round(progress * 0.4)}%`, icon: Leaf },
                { label: 'Cooling Efficiency', value: `${Math.round(progress * 0.5)}%`, icon: Wind },
                { label: 'Performance Gain', value: `${Math.round(progress * 0.3)}%`, icon: Zap }
              ].map((metric, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-xl text-center transition-all duration-500 ${
                    isDark ? 'bg-[#27304a]' : 'bg-gray-100'
                  }`}
                  style={{
                    transform: progress > idx * 33 ? 'scale(1.05)' : 'scale(1)',
                    opacity: progress > idx * 33 ? 1 : 0.7
                  }}
                >
                  <metric.icon className={`w-5 h-5 mx-auto mb-2 ${
                    isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                  }`} />
                  <div className={`text-xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {metric.value}
                  </div>
                  <div className={`text-xs ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Spinning Fan Animation */}
            <div className="flex justify-center pt-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className={`w-16 h-16 rounded-full border-2 ${
                      isDark ? 'border-[#5ce1e5]/30' : 'border-[#0ea5e9]/30'
                    }`}
                    style={{
                      animation: 'spin 3s linear infinite'
                    }}
                  />
                </div>
                <Wind className={`absolute inset-0 m-auto w-8 h-8 ${
                  isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                }`} style={{
                  animation: 'spin 3s linear infinite reverse'
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>
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
        airSideConfig: config 
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

  // Enhanced simulation run with loader
  const handleSubmit = async () => {
    // Capture config before submitting
    if (configRef.current) {
      const config = configRef.current
      setCurrentConfig(config)
      updateSimulationInput({ 
        coolingTechnique: selectedTechnique || 'air', 
        airSideConfig: config 
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

  // Store config in ref and state
  const handleConfigChange = useCallback((config: any) => {
    configRef.current = config
    setCurrentConfig(config) // Update state for immediate review step update
  }, [])

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
      name: 'Water-Side Cooling',
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
  }, [])

  // Step 0 - Welcome
  const Step0Welcome = () => (
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
  )

  // Step 1 - Cooling Technique Selection
  const Step1CoolingTechnique = () => (
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
  )

  // Step 2 - Parameters
  const Step2Parameters = () => {
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
          
          {/* Stats Overview */}
          <div className={`mb-8 p-6 rounded-2xl ${
            isDark 
              ? 'bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]' 
              : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
          }`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Server, label: 'Total Racks', value: currentConfig?.numberOfRacks || currentInput?.numberOfRacks || 5 },
                { icon: Cpu, label: 'Servers', value: ((currentConfig?.numberOfRacks || currentInput?.numberOfRacks || 5) * 10) },
                { icon: Wind, label: 'Fan System', value: currentConfig?.fans ? 'Mixed' : 'Standard' },
                { icon: Cloud, label: 'Region', value: currentConfig?.region || 'US Northeast' }
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
            serverType={"dell_poweredge_r750"}
            numberOfRacks={currentInput?.numberOfRacks || 5}
            serversPerRack={10}
            averageUtilization={45}
            peakUtilization={85}
            fans={{ bestFans: 2, averageFans: 4, oldFans: 0 }}
            region={"us_northeast"}
            onConfigChange={handleConfigChange}
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

  // Step 3 - Review (Updated with live config data)
  const Step3ReviewSubmit = () => {
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
                  value: 'Up to 40%', 
                  icon: Zap,
                  color: isDark ? '#fbbf24' : '#f59e0b'
                },
                { 
                  label: 'Cost Reduction', 
                  value: 'Up to 35%', 
                  icon: Shield,
                  color: isDark ? '#34d399' : '#10b981'
                },
                { 
                  label: 'CO₂ Reduction', 
                  value: 'Up to 50%', 
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
  }

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

      {/* Simulation Progress Loader */}
      {isSimulationRunning && (
        <SimulationProgress 
          progress={simulationProgress}
          isRunning={isSimulationRunning}
          onClose={() => setIsSimulationRunning(false)}
        />
      )}

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
                {currentStep === 2 && <Step2Parameters />}
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