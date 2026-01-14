import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/shared/Navbar'
import { Wind, Zap, TrendingDown, Server, Thermometer, Cpu, ArrowRight, Sparkles, Layers, Cloud, Droplets, BarChart3, Shield, Activity, Globe, Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from 'lucide-react'
import { useThemeStore } from '../hooks/useTheme'

// Advanced 3D Particle System for Background
const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDark = useThemeStore((state) => state.isDark)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    const particles: Array<{
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string
      opacity: number
      waveOffset: number
    }> = []
    
    const particleColors = isDark 
      ? ['#5ce1e5', '#fd5757', '#3b82f6', '#8b5cf6']
      : ['#0ea5e9', '#ef4444', '#3b82f6', '#8b5cf6']
    
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        opacity: Math.random() * 0.3 + 0.1,
        waveOffset: Math.random() * Math.PI * 2
      })
    }
    
    let animationId: number
    let time = 0
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      time += 0.01
      
      particles.forEach(particle => {
        const waveX = Math.sin(time + particle.waveOffset) * 10
        const waveY = Math.cos(time * 0.5 + particle.waveOffset) * 10
        
        particle.x += particle.speedX + waveX * 0.01
        particle.y += particle.speedY + waveY * 0.01
        
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0
        
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3
        )
        gradient.addColorStop(0, `${particle.color}${Math.floor(particle.opacity * 255).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(1, `${particle.color}00`)
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        
        particles.forEach(otherParticle => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < 100) {
            ctx.beginPath()
            ctx.strokeStyle = `${particle.color}${Math.floor((1 - distance / 100) * particle.opacity * 100).toString(16).padStart(2, '0')}`
            ctx.lineWidth = 0.5
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            ctx.stroke()
          }
        })
      })
      
      animationId = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [isDark])
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: isDark ? 0.15 : 0.1 }}
    />
  )
}

// Enhanced Rotating Fan Animation
const RotatingFan: React.FC<{ size?: string }> = ({ size = 'w-24 h-24' }) => {
  const [speed, setSpeed] = useState(1)
  const [isHovering, setIsHovering] = useState(false)
  const isDark = useThemeStore((state) => state.isDark)
  
  const handleClick = () => {
    setSpeed(prev => prev === 3 ? 1 : prev + 1)
  }
  
  const fanSpeeds = [
    { label: 'Low', duration: '4s', particles: 8 },
    { label: 'Medium', duration: '2s', particles: 12 },
    { label: 'High', duration: '1s', particles: 16 }
  ]
  
  return (
    <div 
      className={`${size} relative group cursor-pointer`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative w-full h-full">
        <div className={`absolute inset-0 rounded-full border-2 ${
          isDark ? 'border-[#5ce1e5]/30' : 'border-[#0ea5e9]/30'
        }`} />
        
        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-2"
          style={{ 
            animation: `spin ${fanSpeeds[speed - 1].duration} linear infinite`,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          }}
        >
          <defs>
            <radialGradient id="fanCenter" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isDark ? "#5ce1e5" : "#0ea5e9"} stopOpacity="0.8" />
              <stop offset="100%" stopColor={isDark ? "#fd5757" : "#ef4444"} stopOpacity="0.2" />
            </radialGradient>
            <linearGradient id="fanBlade" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDark ? "#5ce1e5" : "#0ea5e9"} />
              <stop offset="100%" stopColor={isDark ? "#fd5757" : "#ef4444"} />
            </linearGradient>
          </defs>
          
          <g transform="translate(50,50)">
            {[0, 120, 240].map((angle) => (
              <g key={angle} transform={`rotate(${angle})`}>
                <ellipse 
                  cx="0" 
                  cy="-25" 
                  rx="8" 
                  ry="20" 
                  fill="url(#fanBlade)" 
                  opacity="0.9"
                  transform="rotate(0)"
                >
                  <animate 
                    attributeName="opacity"
                    values="0.9;1;0.9"
                    dur="2s"
                    repeatCount="indefinite"
                    begin={`${angle * 0.01}s`}
                  />
                </ellipse>
              </g>
            ))}
          </g>
          
          <circle cx="50" cy="50" r="12" fill="url(#fanCenter)" stroke={isDark ? "#fd5757" : "#ef4444"} strokeWidth="1" />
          <circle cx="50" cy="50" r="4" fill={isDark ? "#0a0e27" : "white"} />
          
          <circle cx="50" cy="50" r="8" fill="none" stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.1)"} strokeWidth="0.5" />
          {[0, 90, 180, 270].map(angle => (
            <circle 
              key={angle}
              cx={50 + Math.cos(angle * Math.PI/180) * 6}
              cy={50 + Math.sin(angle * Math.PI/180) * 6}
              r="0.5"
              fill={isDark ? "#fd5757" : "#ef4444"}
            />
          ))}
        </svg>
        
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: fanSpeeds[speed - 1].particles }).map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 rounded-full ${
                isDark ? 'bg-[#5ce1e5]/70' : 'bg-[#0ea5e9]/70'
              }`}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${i * (360 / fanSpeeds[speed - 1].particles)}deg) translateX(45px)`,
                animation: `airFlow ${1/speed}s linear infinite`,
                animationDelay: `${i * (0.5 / fanSpeeds[speed - 1].particles)}s`
              }}
            />
          ))}
          
          {speed > 1 && Array.from({ length: speed * 4 }).map((_, i) => (
            <div
              key={`fast-${i}`}
              className={`absolute w-0.5 h-0.5 rounded-full ${
                isDark ? 'bg-[#fd5757]/50' : 'bg-[#ef4444]/50'
              }`}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateX(${40 + i % 3 * 5}px)`,
                animation: `airFlow ${0.8/speed}s linear infinite`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
        
        <div 
          className={`absolute inset-[-5px] rounded-full border ${
            isDark ? 'border-[#5ce1e5]' : 'border-[#0ea5e9]'
          }`}
          style={{
            animation: `pulse ${1.5/speed}s ease-in-out infinite`,
            opacity: 0.3 + (speed * 0.1)
          }}
        />
      </div>
      
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-300 ${
          isDark 
            ? 'bg-black/40 text-white backdrop-blur-sm' 
            : 'bg-white/80 text-gray-800 backdrop-blur-sm'
        } ${isHovering ? 'scale-110' : ''}`}>
          <div className={`w-2 h-2 rounded-full ${
            speed === 1 ? 'bg-green-500' :
            speed === 2 ? 'bg-yellow-500' : 
            'bg-red-500'
          } animate-pulse`} />
          <span className="text-sm font-semibold">
            {fanSpeeds[speed - 1].label} Speed
          </span>
          <span className="text-xs opacity-75">
            ({speed}x)
          </span>
        </div>
      </div>
      
      {isHovering && (
        <div className={`absolute -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded text-xs font-medium ${
          isDark ? 'bg-black/60 text-white' : 'bg-white/90 text-gray-800'
        } backdrop-blur-sm`}>
          Click to increase speed
        </div>
      )}
    </div>
  )
}

// Interactive Cooling Wave Animation
const InteractiveCoolingWave: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const isDark = useThemeStore((state) => state.isDark)
  
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }
    resizeCanvas()
    
    let animationId: number
    let time = 0
    let mouseX = 0
    let mouseY = 0
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
    }
    
    canvas.addEventListener('mousemove', handleMouseMove)
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      time += 0.02
      
      const waveCount = 5
      const baseAmplitude = canvas.height / 8
      
      for (let i = 0; i < waveCount; i++) {
        const amplitude = baseAmplitude * (1 - i * 0.2)
        const frequency = 0.01 + i * 0.005
        const speed = 0.5 + i * 0.1
        const yOffset = (canvas.height / 2) + i * 15
        
        ctx.beginPath()
        
        const mouseInfluence = isHovering ? 
          Math.sin(time * 2 + i) * 20 * (1 - Math.min(1, Math.abs(mouseX - canvas.width/2) / (canvas.width/2))) : 0
        
        for (let x = 0; x < canvas.width; x += 2) {
          const noise = Math.sin(x * frequency + time * speed) * 
                       Math.cos(time * 0.3 + i) * 0.3
          
          const mouseDist = Math.abs(mouseX - x)
          const mouseEffect = mouseDist < 100 ? 
            Math.cos(mouseDist * 0.05) * (100 - mouseDist) * 0.01 : 0
          
          const y = yOffset + 
                   Math.sin(x * frequency + time * speed + noise) * amplitude +
                   mouseEffect * 20 +
                   mouseInfluence
          
          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        
        const gradient = ctx.createLinearGradient(0, yOffset - amplitude, 0, yOffset + amplitude)
        const color1 = isDark ? '#5ce1e5' : '#0ea5e9'
        const color2 = isDark ? '#fd5757' : '#ef4444'
        
        gradient.addColorStop(0, `${i === 0 ? color1 : color2}${Math.floor((1 - i * 0.2) * 60).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(1, `${i === 0 ? color1 : color2}00`)
        
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.stroke()
        
        ctx.lineTo(canvas.width, canvas.height)
        ctx.lineTo(0, canvas.height)
        ctx.closePath()
        
        const fillGradient = ctx.createLinearGradient(0, yOffset - amplitude, 0, yOffset + amplitude)
        fillGradient.addColorStop(0, `${i === 0 ? color1 : color2}${Math.floor((1 - i * 0.2) * 15).toString(16).padStart(2, '0')}`)
        fillGradient.addColorStop(1, `${i === 0 ? color1 : color2}00`)
        
        ctx.fillStyle = fillGradient
        ctx.fill()
      }
      
      if (isHovering) {
        for (let i = 0; i < 5; i++) {
          const x = (mouseX + Math.sin(time * 2 + i) * 50) % canvas.width
          const waveY = canvas.height/2 + Math.sin(x * 0.02 + time) * canvas.height/8
          
          ctx.beginPath()
          const particleGradient = ctx.createRadialGradient(x, waveY, 0, x, waveY, 8)
          particleGradient.addColorStop(0, '#ffffff')
          particleGradient.addColorStop(1, '#ffffff00')
          ctx.fillStyle = particleGradient
          ctx.arc(x, waveY, 4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      
      animationId = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationId)
    }
  }, [isHovering, isDark])
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-64 rounded-2xl overflow-hidden cursor-crosshair group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm">
          Move cursor to interact with cooling flow
        </div>
      </div>
    </div>
  )
}

// Server Rack Animation
const ServerRackAnimation: React.FC = () => {
  const [rackLoad, setRackLoad] = useState(0.6)
  const isDark = useThemeStore((state) => state.isDark)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setRackLoad(prev => {
        const variation = Math.sin(Date.now() / 2000) * 0.2
        return Math.max(0.3, Math.min(0.9, 0.6 + variation))
      })
    }, 100)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="relative h-5 rounded overflow-hidden"
        >
          <div className={`absolute inset-0 ${
            isDark ? 'bg-[#27304a]' : 'bg-gray-200'
          }`} />
          
          <div 
            className={`absolute inset-0 rounded ${
              isDark 
                ? 'bg-gradient-to-r from-[#5ce1e5] via-[#fd5757] to-[#ff8888]' 
                : 'bg-gradient-to-r from-[#0ea5e9] via-[#ef4444] to-[#fca5a5]'
            } transition-all duration-300`}
            style={{
              width: `${(rackLoad * 100) - (i * 3)}%`,
              opacity: 0.6 + (i * 0.07)
            }}
          />
          
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <span className={`text-xs font-medium ${
              isDark ? 'text-white/80' : 'text-gray-800'
            }`}>
              Server {i + 1}
            </span>
          </div>
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className={`text-xs font-bold ${
              isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
            }`}>
              {Math.round((rackLoad * 100) - (i * 3))}%
            </span>
          </div>
          
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <div 
              className={`w-1.5 h-1.5 rounded-full ${
                isDark ? 'bg-[#fd5757]' : 'bg-[#ef4444]'
              } animate-pulse`}
              style={{
                animationDelay: `${i * 0.2}s`,
                opacity: 0.5 + rackLoad
              }}
            />
          </div>
        </div>
      ))}
      
      <div className={`mt-4 px-3 py-2 rounded-lg ${
        isDark ? 'bg-black/30' : 'bg-gray-100'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Overall Load
          </span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              rackLoad > 0.7 
                ? isDark ? 'bg-[#fd5757]' : 'bg-[#ef4444]'
                : isDark ? 'bg-[#5ce1e5]' : 'bg-[#0ea5e9]'
            }`} />
            <span className={`text-sm font-bold ${
              rackLoad > 0.7 
                ? isDark ? 'text-[#fd5757]' : 'text-[#ef4444]'
                : isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
            }`}>
              {Math.round(rackLoad * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Animated Counter Component
const AnimatedCounter: React.FC<{ end: number; label: string; suffix?: string }> = ({ end, label, suffix = '' }) => {
  const [count, setCount] = useState(0)
  const isDark = useThemeStore((state) => state.isDark)
  const counterRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (counterRef.current) {
      observer.observe(counterRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    let start = 0
    const increment = end / 40
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 30)
    return () => clearInterval(timer)
  }, [end, isVisible])

  return (
    <div ref={counterRef} className="text-center space-y-3 animate-in fade-in">
      <div className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${
        isDark 
          ? 'from-[#5ce1e5] to-[#fd5757]' 
          : 'from-[#0ea5e9] to-[#ef4444]'
      } bg-clip-text text-transparent`}>
        {count}
        {suffix}
      </div>
      <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{label}</p>
    </div>
  )
}

// Footer Component
const Footer: React.FC = () => {
  const isDark = useThemeStore((state) => state.isDark)
  
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className={`relative overflow-hidden transition-colors duration-500 ${
      isDark 
        ? 'bg-gradient-to-b from-[#0a0e27] to-[#1a1f3a] text-gray-300'
        : 'bg-gradient-to-b from-gray-50 to-white text-gray-700'
    }`}>
      <div className="absolute top-0 left-0 right-0 h-20 overflow-hidden">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="absolute top-0 left-0 w-full h-full"
        >
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            className={isDark ? 'fill-[#1a1f3a]' : 'fill-white'}
          />
        </svg>
      </div>
      
      <div className="container mx-auto px-6 pt-32 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDark 
                  ? 'bg-gradient-to-br from-[#5ce1e5] to-[#fd5757]' 
                  : 'bg-gradient-to-br from-[#0ea5e9] to-[#ef4444]'
              }`}>
                <Wind className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className={`text-2xl font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  COOLIENCE
                </h3>
                <p className="text-sm opacity-75">Intelligent Cooling Solutions</p>
              </div>
            </div>
            <p className={`text-sm leading-relaxed ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Revolutionizing data center cooling with AI-powered optimization for maximum efficiency and sustainability.
            </p>
            <div className="flex gap-4">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                    isDark
                      ? 'bg-gray-800 text-gray-300 hover:bg-[#5ce1e5] hover:text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-[#0ea5e9] hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className={`text-lg font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Product
            </h4>
            <ul className="space-y-3">
              {['Features', 'Pricing', 'Documentation', 'API', 'Status', 'Changelog'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className={`text-sm transition-colors duration-300 hover:opacity-100 ${
                      isDark 
                        ? 'text-gray-400 hover:text-[#5ce1e5]' 
                        : 'text-gray-600 hover:text-[#0ea5e9]'
                    }`}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`text-lg font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Company
            </h4>
            <ul className="space-y-3">
              {['About Us', 'Careers', 'Blog', 'Press', 'Partners', 'Legal'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className={`text-sm transition-colors duration-300 hover:opacity-100 ${
                      isDark 
                        ? 'text-gray-400 hover:text-[#fd5757]' 
                        : 'text-gray-600 hover:text-[#ef4444]'
                    }`}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`text-lg font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className={`w-5 h-5 mt-0.5 ${
                  isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                }`} />
                <span className="text-sm">finalyearp027@gmail.com</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className={`w-5 h-5 mt-0.5 ${
                  isDark ? 'text-[#fd5757]' : 'text-[#ef4444]'
                }`} />
                <span className="text-sm">+92 345 9876879</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className={`w-5 h-5 mt-0.5 ${
                  isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'
                }`} />
                <span className="text-sm">NEDUET<br />Karachi, Pakistan</span>
              </li>
            </ul>
          </div>
        </div>

        <div className={`mb-12 p-8 rounded-2xl ${
          isDark 
            ? 'bg-gradient-to-r from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]'
            : 'bg-gradient-to-r from-white to-gray-50 border border-gray-200'
        }`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h4 className={`text-xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Stay Updated
              </h4>
              <p className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Subscribe to our newsletter for the latest in cooling technology.
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className={`flex-1 md:w-64 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  isDark
                    ? 'bg-gray-800 text-white border border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20'
                    : 'bg-white text-gray-900 border border-gray-300 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20'
                }`}
              />
              <button className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white'
                  : 'bg-gradient-to-r from-[#0ea5e9] to-[#ef4444] text-white'
              }`}>
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className={`pt-8 border-t ${
          isDark ? 'border-[#3f4a68]' : 'border-gray-200'
        }`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              © {currentYear} COOLIENCE. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <a
                href="#"
                className={`text-sm transition-colors duration-300 ${
                  isDark 
                    ? 'text-gray-400 hover:text-[#5ce1e5]' 
                    : 'text-gray-600 hover:text-[#0ea5e9]'
                }`}
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className={`text-sm transition-colors duration-300 ${
                  isDark 
                    ? 'text-gray-400 hover:text-[#fd5757]' 
                    : 'text-gray-600 hover:text-[#ef4444]'
                }`}
              >
                Terms of Service
              </a>
              <a
                href="#"
                className={`text-sm transition-colors duration-300 ${
                  isDark 
                    ? 'text-gray-400 hover:text-[#5ce1e5]' 
                    : 'text-gray-600 hover:text-[#0ea5e9]'
                }`}
              >
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 right-10">
        <div className={`w-20 h-20 rounded-full opacity-10 ${
          isDark 
            ? 'bg-gradient-to-r from-[#5ce1e5] to-[#fd5757]' 
            : 'bg-gradient-to-r from-[#0ea5e9] to-[#ef4444]'
        } animate-pulse`} />
      </div>
    </footer>
  )
}

export const Homepage: React.FC = () => {
  const navigate = useNavigate()
  const isDark = useThemeStore((state) => state.isDark)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Smooth scroll function for navigation
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Adjust based on your navbar height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      const currentProgress = window.scrollY / totalScroll
      setScrollProgress(currentProgress)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={`min-h-screen overflow-x-hidden transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]'
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-50'
    }`}>
      
      {/* 3D Particle Background */}
      <ParticleCanvas />
      
      {/* Parallax Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0" style={{
          transform: `translateY(${scrollProgress * -100}px)`
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`absolute rounded-full mix-blend-overlay ${
                isDark ? 'bg-gradient-to-br from-[#5ce1e5]/10 to-[#fd5757]/10' : 'bg-gradient-to-br from-[#0ea5e9]/10 to-[#ef4444]/10'
              }`}
              style={{
                width: `${100 + i * 50}px`,
                height: `${100 + i * 50}px`,
                left: `${10 + i * 10}%`,
                top: `${20 + i * 15}%`,
                animation: `float ${8 + i * 2}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`
              }}
            />
          ))}
        </div>
      </div>
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 md:pt-40 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-block animate-in slide-in-from-left-8 duration-1000">
                  <div className={`
                    relative px-4 py-2.5 text-sm font-semibold rounded-full
                    backdrop-blur-sm border shadow-lg overflow-hidden
                    ${isDark 
                      ? 'text-cyan-100 border-cyan-500/30 bg-gradient-to-r from-cyan-900/40 to-blue-900/40' 
                      : 'text-blue-800 border-blue-300/50 bg-gradient-to-r from-blue-50/80 to-cyan-50/80'
                    }
                  `}>
                    <div className={`
                      absolute inset-0 rounded-full opacity-30
                      ${isDark ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gradient-to-r from-blue-400 to-cyan-400'}
                      animate-pulse
                    `}></div>
                    
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <div className={`
                        relative w-2 h-2 rounded-full
                        ${isDark ? 'bg-cyan-400' : 'bg-blue-500'}
                        animate-ping
                      `}></div>
                      <div className={`
                        absolute inset-0 w-2 h-2 rounded-full
                        ${isDark ? 'bg-cyan-400' : 'bg-blue-500'}
                      `}></div>
                    </div>
                    
                    <span className="relative flex items-center gap-2 pl-5">
                      <Activity className="w-4 h-4" />
                      Live Cooling Optimization Active
                    </span>
                  </div>
                </div>
                
                <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold leading-tight animate-in slide-in-from-left-8 duration-1000 ${
                  isDark ? 'text-white' : 'text-[#1a1a2e]'
                }`}>
                  <span className="block">Intelligent</span>
                  <span className={isDark ? 'text-cyan-400' : 'text-blue-600'}>
                    Data Center
                  </span>
                  <span className="block">Cooling System</span>
                </h1>
                
                <p className={`text-lg leading-relaxed max-w-xl animate-in fade-in duration-1000 ${
                  isDark ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  Experience the future of data center management with our AI-powered cooling optimization platform. 
                  Reduce energy costs by up to 40% while maintaining peak performance.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in duration-1000">
                <button
                  onClick={() => navigate('/input-management')}
                  className={`group relative px-8 py-4 text-white font-bold rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 transform ${
                    isDark
                      ? 'bg-gradient-to-r from-[#fd5757] to-[#ff8888] hover:shadow-[0_0_40px_#fd5757/50]'
                      : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] hover:shadow-[0_0_40px_#0ea5e9/50]'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <span className="relative flex items-center justify-center gap-3">
                    <span>Start Simulation</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                
                <button
                  onClick={() => scrollToSection('features')}
                  className={`group relative px-8 py-4 font-bold rounded-xl border-2 transition-all hover:scale-105 transform ${
                    isDark
                      ? 'border-[#5ce1e5] text-[#5ce1e5] hover:bg-[#5ce1e5]/10'
                      : 'border-[#0ea5e9] text-[#0ea5e9] hover:bg-[#0ea5e9]/10'
                  }`}
                >
                  <span className="relative flex items-center justify-center gap-2">
                    <span>Explore Features</span>
                    <div className="w-2 h-2 rounded-full animate-pulse bg-current" />
                  </span>
                </button>
              </div>
            </div>
            
            <div className="relative h-[500px] flex items-center justify-center">
              <div className="relative w-full h-full max-w-xl">
                <div className="absolute inset-0 flex items-center justify-center">
                  <RotatingFan size="w-64 h-64" />
                </div>
                
                <div 
                  className="absolute inset-0 rounded-full border-2 border-[#5ce1e5]/30 animate-pulse"
                  style={{ animationDelay: '0.5s' }}
                />
                <div 
                  className="absolute inset-8 rounded-full border-2 border-[#fd5757]/30 animate-pulse"
                  style={{ animationDelay: '1s' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Impact Section */}
      <section 
        id="impact" 
        className={`relative py-20 px-6 scroll-mt-20 ${
          isDark ? 'bg-gradient-to-b from-transparent to-[#1a1f3a]/50' : 'bg-gradient-to-b from-transparent to-white/50'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-16">
            <h2 className={`text-4xl md:text-5xl font-bold ${
              isDark ? 'text-white' : 'text-[#1a1a2e]'
            }`}>
              Real Impact,{' '}
              <span className={isDark ? 'text-[#fd5757]' : 'text-[#ef4444]'}>Measurable Results</span>
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
              Our AI-driven cooling optimization delivers tangible benefits across thousands of deployments
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <AnimatedCounter end={40} label="Energy Cost Reduction" suffix="%" />
            <AnimatedCounter end={15} label="CO2 Emissions Reduction" suffix="%" />
            <AnimatedCounter end={50} label="Cooling System Load" suffix="%" />
            <AnimatedCounter end={99} label="System Uptime" suffix="%" />
          </div>
        </div>
      </section>
      
      {/* Interactive Demo Section */}
      <section className={`relative py-20 px-6 ${
        isDark ? 'bg-gradient-to-b from-[#1a1f3a] to-[#0a0e27]' : 'bg-gradient-to-b from-white to-slate-50'
      }`}>
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-4xl md:text-5xl font-bold text-center mb-4 ${
            isDark ? 'text-white' : 'text-[#1a1a2e]'
          }`}>
            Interactive{' '}
            <span className={isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}>Cooling Demo</span>
          </h2>
          <p className={`text-lg text-center max-w-3xl mx-auto mb-16 ${
            isDark ? 'text-gray-400' : 'text-gray-700'
          }`}>
            Experience our technology in action. Each component responds to real-time data and user interaction.
          </p>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <div className={`p-8 rounded-3xl border-2 transition-all duration-500 hover:shadow-2xl ${
              isDark
                ? 'bg-gradient-to-br from-[#1a1f3a]/80 to-[#27304a]/80 border-[#5ce1e5]/30 hover:border-[#5ce1e5]/60'
                : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-[#0ea5e9]/20 hover:border-[#0ea5e9]/50'
            }`}>
              <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${
                isDark ? 'text-white' : 'text-[#1a1a2e]'
              }`}>
                <Droplets className="w-6 h-6" />
                Dynamic Cooling Flow
              </h3>
              <InteractiveCoolingWave />
              <p className={`mt-6 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Move your cursor over the wave to influence cooling patterns and observe real-time adjustments.
              </p>
            </div>
            
            <div className={`p-8 rounded-3xl border-2 transition-all duration-500 hover:shadow-2xl ${
              isDark
                ? 'bg-gradient-to-br from-[#1a1f3a]/80 to-[#27304a]/80 border-[#fd5757]/30 hover:border-[#fd5757]/60'
                : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-[#ef4444]/20 hover:border-[#ef4444]/50'
            }`}>
              <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${
                isDark ? 'text-white' : 'text-[#1a1a2e]'
              }`}>
                <Server className="w-6 h-6" />
                Live Server Monitoring
              </h3>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-[#27304a]' : 'bg-gray-50'}`}>
                <ServerRackAnimation />
              </div>
              <p className={`mt-6 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Watch real-time server load simulation with dynamic temperature monitoring and cooling response.
              </p>
            </div>
            
            <div className={`p-8 rounded-3xl border-2 transition-all duration-500 hover:shadow-2xl ${
              isDark
                ? 'bg-gradient-to-br from-[#1a1f3a]/80 to-[#27304a]/80 border-purple-500/30 hover:border-purple-500/60'
                : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-purple-400 hover:border-purple-500'
            }`}>
              <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${
                isDark ? 'text-white' : 'text-[#1a1a2e]'
              }`}>
                <Wind className="w-6 h-6" />
                Intelligent Fan Control
              </h3>
              <div className="flex items-center justify-center h-48">
                <RotatingFan size="w-32 h-32" />
              </div>
              <p className={`mt-6 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Click to adjust fan speed and observe airflow particle simulation based on cooling demand.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section 
        id="features" 
        className={`relative py-20 px-6 scroll-mt-20 ${
          isDark ? 'bg-gradient-to-b from-[#0a0e27] to-[#1a1f3a]' : 'bg-gradient-to-b from-slate-50 to-white'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white text-sm font-bold">
              <Sparkles className="w-4 h-4" />
              PREMIUM FEATURES
            </div>
            <h2 className={`text-4xl md:text-5xl font-bold ${
              isDark ? 'text-white' : 'text-[#1a1a2e]'
            }`}>
              Why Choose{' '}
              <span className="bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] bg-clip-text text-transparent">
                COOLIENCE
              </span>
              ?
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
              Enterprise-grade features designed for the most demanding data center environments.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Wind,
                title: 'Air-Side Economization',
                description: 'Intelligently utilize outdoor air conditions to reduce cooling load and energy consumption.',
                lightBorder: 'border-[#5ce1e5]',
                darkBorder: 'border-[#fd5757]',
              },
              {
                icon: Thermometer,
                title: 'Thermal Optimization',
                description: 'Real-time temperature monitoring and predictive analysis for optimal performance.',
                lightBorder: 'border-[#fd5757]',
                darkBorder: 'border-[#5ce1e5]',
              },
              {
                icon: Zap,
                title: 'Energy Efficiency',
                description: 'Reduce power consumption and operating costs with our advanced algorithms.',
                lightBorder: 'border-yellow-400',
                darkBorder: 'border-yellow-500',
              },
              {
                icon: Server,
                title: 'Server Management',
                description: 'Comprehensive server configuration and monitoring across your entire infrastructure.',
                lightBorder: 'border-purple-400',
                darkBorder: 'border-purple-500',
              },
              {
                icon: TrendingDown,
                title: 'Cost Analytics',
                description: 'Detailed reports on energy savings and ROI projections for your investments.',
                lightBorder: 'border-green-400',
                darkBorder: 'border-green-500',
              },
              {
                icon: Cpu,
                title: 'Smart Automation',
                description: 'Automated cooling adjustments based on real-time data center workloads.',
                lightBorder: 'border-indigo-400',
                darkBorder: 'border-indigo-500',
              },
            ].map((feature, idx) => {
              const Icon = feature.icon
              const borderClass = isDark ? feature.darkBorder : feature.lightBorder
              return (
                <div
                  key={idx}
                  className={`group relative p-8 rounded-2xl border-2 hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-in fade-in slide-in-from-bottom-4 ${
                    isDark
                      ? `bg-[#27304a] border-[#3f4a68] hover:${borderClass}`
                      : `bg-white border-gray-200 hover:${borderClass}`
                  } hover:${borderClass}`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="space-y-4">
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform ${
                      isDark ? 'bg-[#fd5757]' : 'bg-[#5ce1e5]'
                    }`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#1a1a2e]'}`}>{feature.title}</h3>
                    <p className={`leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{feature.description}</p>
                  </div>

                  <ArrowRight className={`absolute bottom-4 right-4 w-5 h-5 transform group-hover:translate-x-1 transition-all ${
                    isDark ? 'text-gray-500 group-hover:text-[#5ce1e5]' : 'text-gray-400 group-hover:text-[#5ce1e5]'
                  }`} />
                </div>
              )
            })}
          </div>
        </div>
      </section>
      
      {/* Contact Section */}
      <section 
        id="contact" 
        className={`relative py-20 px-6 scroll-mt-20 ${
          isDark ? 'bg-gradient-to-b from-[#1a1f3a] to-[#0a0e27]' : 'bg-gradient-to-b from-white to-slate-50'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-16">
            <h2 className={`text-4xl md:text-5xl font-bold ${
              isDark ? 'text-white' : 'text-[#1a1a2e]'
            }`}>
              Contact <span className={isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}>Us</span>
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
              Get in touch with our team for a personalized consultation and see how we can transform your data center.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12">
            <div className={`p-8 rounded-3xl ${
              isDark 
                ? 'bg-gradient-to-br from-[#1a1f3a]/80 to-[#27304a]/80 border border-[#3f4a68]'
                : 'bg-gradient-to-br from-white/80 to-gray-50/80 border border-gray-200'
            }`}>
              <h3 className={`text-2xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Get in Touch
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    isDark ? 'bg-[#fd5757]/20' : 'bg-[#ef4444]/10'
                  }`}>
                    <Mail className={`w-6 h-6 ${isDark ? 'text-[#fd5757]' : 'text-[#ef4444]'}`} />
                  </div>
                  <div>
                    <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Email</h4>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-700'}>finalyearp027@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    isDark ? 'bg-[#5ce1e5]/20' : 'bg-[#0ea5e9]/10'
                  }`}>
                    <Phone className={`w-6 h-6 ${isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}`} />
                  </div>
                  <div>
                    <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Phone</h4>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-700'}>+92 345 9876879</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    isDark ? 'bg-purple-500/20' : 'bg-purple-400/10'
                  }`}>
                    <MapPin className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Address</h4>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-700'}>
                      NED University of Engineering & Technology<br />
                      Karachi, Pakistan
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-gray-700">
                <h4 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Follow Us</h4>
                <div className="flex gap-3">
                  {[Facebook, Twitter, Linkedin, Instagram].map((Icon, index) => (
                    <a
                      key={index}
                      href="#"
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                        isDark
                          ? 'bg-gray-800 text-gray-300 hover:bg-[#5ce1e5] hover:text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-[#0ea5e9] hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
            
            <div className={`p-8 rounded-3xl ${
              isDark 
                ? 'bg-gradient-to-br from-[#1a1f3a]/80 to-[#27304a]/80 border border-[#3f4a68]'
                : 'bg-gradient-to-br from-white/80 to-gray-50/80 border border-gray-200'
            }`}>
              <h3 className={`text-2xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Send us a Message
              </h3>
              
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      First Name
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        isDark
                          ? 'bg-gray-800 text-white border border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20'
                          : 'bg-white text-gray-900 border border-gray-300 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20'
                      }`}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        isDark
                          ? 'bg-gray-800 text-white border border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20'
                          : 'bg-white text-gray-900 border border-gray-300 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20'
                      }`}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Email
                  </label>
                  <input
                    type="email"
                    className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      isDark
                        ? 'bg-gray-800 text-white border border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20'
                        : 'bg-white text-gray-900 border border-gray-300 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20'
                    }`}
                    placeholder="john@example.com"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      isDark
                        ? 'bg-gray-800 text-white border border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20'
                        : 'bg-white text-gray-900 border border-gray-300 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20'
                    }`}
                    placeholder="Tell us about your data center cooling needs..."
                  />
                </div>
                
                <button
                  type="submit"
                  className={`w-full px-6 py-4 rounded-lg font-semibold transition-all duration-300 hover:scale-105 ${
                    isDark
                      ? 'bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] text-white'
                      : 'bg-gradient-to-r from-[#0ea5e9] to-[#ef4444] text-white'
                  }`}
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
      
      {/* Final CTA */}
      <section className={`relative py-20 px-6 overflow-hidden ${
        isDark ? 'bg-gradient-to-b from-[#1a1f3a] to-[#0a0e27]' : 'bg-gradient-to-b from-white to-slate-50'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className={`relative rounded-3xl p-12 md:p-16 overflow-hidden ${
            isDark
              ? 'bg-gradient-to-br from-[#fd5757] via-[#ff6b6b] to-[#ff8888]'
              : 'bg-gradient-to-br from-[#0ea5e9] via-[#5ce1e5] to-[#8dd5d9]'
          }`}>
            
            <div className="absolute inset-0">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 2}s`,
                    opacity: 0.3 + Math.random() * 0.3
                  }}
                />
              ))}
            </div>
            
            <div className="relative space-y-8 text-center">
              <h2 className={`text-4xl md:text-5xl font-bold ${
                isDark ? 'text-[#0a0e27]' : 'text-white'
              }`}>
                Ready to Transform Your Data Center?
              </h2>
              
              <p className={`text-xl opacity-95 max-w-2xl mx-auto ${
                isDark ? 'text-[#1a1a2e]' : 'text-white'
              }`}>
                Join industry leaders who have already reduced cooling costs by 40% while improving reliability.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/auth/signup')}
                  className={`px-8 py-4 font-bold rounded-xl hover:scale-105 transition-transform transform inline-flex items-center justify-center gap-3 group ${
                    isDark
                      ? 'bg-white text-[#fd5757]'
                      : 'bg-white text-[#0ea5e9]'
                  }`}
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button
                  onClick={() => scrollToSection('contact')}
                  className={`px-8 py-4 font-bold rounded-xl border-2 transition-all hover:scale-105 ${
                    isDark
                      ? 'border-white text-white hover:bg-white/10'
                      : 'border-white text-white hover:bg-white/10'
                  }`}
                >
                  Request a Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <Footer />
      
      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes airFlow {
          0% { 
            transform: translate(-50%, -50%) rotate(var(--rotation)) translateX(45px);
            opacity: 1;
          }
          100% { 
            transform: translate(-50%, -50%) rotate(var(--rotation)) translateX(80px);
            opacity: 0;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
        
        .slide-in-from-bottom-4 {
          animation-name: slideInFromBottom;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInFromLeft {
          from { transform: translateX(-2rem); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideInFromBottom {
          from { transform: translateY(1rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .scroll-mt-20 {
          scroll-margin-top: 5rem;
        }
      `}</style>
    </div>
  )
}

export default Homepage