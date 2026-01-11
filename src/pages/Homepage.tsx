import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/shared/Navbar'
import { Wind, Zap, TrendingDown, Server, Thermometer, Cpu, ArrowRight, Sparkles, Layers } from 'lucide-react'
import { useThemeStore } from '../hooks/useTheme'

const AnimatedCounter: React.FC<{ end: number; label: string; suffix?: string }> = ({ end, label, suffix = '' }) => {
  const [count, setCount] = useState(0)
  const isDark = useThemeStore((state) => state.isDark)

  useEffect(() => {
    let start = 0
    const increment = end / 50
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
  }, [end])

  return (
    <div className="text-center space-y-2 animate-fade-in">
      <div className={`text-4xl md:text-5xl font-bold ${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'}`}>
        {count}
        {suffix}
      </div>
      <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{label}</p>
    </div>
  )
}

// Cooling Wave Animation Component
const CoolingWave: React.FC = () => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-b from-transparent to-[#5ce1e5]/5 rounded-xl overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
        <defs>
          <style>{`
            @keyframes wave {
              0%, 100% { d: path('M0,80 Q100,60 200,80 T400,80'); }
              50% { d: path('M0,80 Q100,40 200,80 T400,80'); }
            }
            .wave1 { animation: wave 6s infinite; }
            .wave2 { animation: wave 6s infinite 1s; }
          `}</style>
        </defs>
        <path className="wave1" d="M0,80 Q100,60 200,80 T400,80" fill="none" stroke="#5ce1e5" strokeWidth="2" opacity="0.6"/>
        <path className="wave2" d="M0,80 Q100,70 200,80 T400,80" fill="none" stroke="#fd5757" strokeWidth="2" opacity="0.4"/>
      </svg>
    </div>
  )
}

// Server Rack Animation
const ServerRackAnimation: React.FC = () => {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-4 bg-gradient-to-r from-[#5ce1e5] to-[#fd5757] rounded"
          style={{
            animation: `pulse 2s ease-in-out ${i * 0.2}s infinite`,
            opacity: 0.7 + (i * 0.06),
          }}
        />
      ))}
    </div>
  )
}

// Rotating Fan Animation
const RotatingFan: React.FC<{ size?: string }> = ({ size = 'w-24 h-24' }) => {
  return (
    <div className={`${size} mx-auto`}>
      <svg viewBox="0 0 100 100" className="animate-spin" style={{ animationDuration: '3s' }}>
        <circle cx="50" cy="50" r="50" fill="#f0f0f0" opacity="0.1" />
        <g transform="translate(50,50)">
          {[0, 120, 240].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <ellipse cx="0" cy="-20" rx="12" ry="25" fill="#5ce1e5" opacity="0.8" />
            </g>
          ))}
        </g>
        <circle cx="50" cy="50" r="8" fill="#fd5757" />
      </svg>
    </div>
  )
}

export const Homepage: React.FC = () => {
  const navigate = useNavigate()
  const isDark = useThemeStore((state) => state.isDark)

  useEffect(() => {
    // Smooth scroll behavior initialization
    document.documentElement.style.scrollBehavior = 'smooth'
  }, [])

  return (
    <div className={`min-h-screen overflow-hidden transition-colors duration-300 ${
      isDark
        ? 'bg-[#0a0e27]'
        : 'bg-gradient-to-br from-slate-50 via-white to-slate-50'
    }`}>
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-0 right-0 w-96 h-96 to-transparent rounded-full blur-3xl ${
          isDark ? 'bg-gradient-to-bl from-[#fd5757]/10' : 'bg-gradient-to-bl from-[#5ce1e5]/10'
        }`} style={{ animation: 'float 8s ease-in-out infinite' }} />
        <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl ${
          isDark ? 'bg-gradient-to-tr from-[#5ce1e5]/10 to-transparent' : 'bg-gradient-to-tr from-[#fd5757]/10 to-transparent'
        }`} style={{ animation: 'float 6s ease-in-out 2s infinite reverse' }} />
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 md:pt-40 md:pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
              <div className="space-y-4">
                <div className="inline-block">
                  <span className={`px-4 py-2 text-white text-sm font-bold rounded-full animate-pulse ${
                    isDark ? 'bg-[#fd5757]' : 'bg-[#5ce1e5]'
                  }`}>
                    ⚡ Next-Gen Data Center Cooling
                  </span>
                </div>
                <h1 className={`text-5xl md:text-6xl font-bold leading-tight ${
                  isDark ? 'text-white' : 'text-[#1a1a2e]'
                }`}>
                  Optimize Your{' '}
                  <span className={isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'}>
                    Data Center Cooling
                  </span>
                </h1>
                <p className={`text-lg leading-relaxed max-w-xl ${
                  isDark ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  Discover the power of air-side economization. Reduce energy costs by up to 40% while maintaining optimal performance.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/input-management')}
                  className={`px-8 py-4 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all transform flex items-center justify-center gap-2 group ${
                    isDark
                      ? 'bg-[#fd5757] hover:shadow-[#fd5757]/50'
                      : 'bg-[#5ce1e5] hover:shadow-[#5ce1e5]/50'
                  }`}
                >
                  Start Simulation
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => (document.getElementById('features') as HTMLElement)?.scrollIntoView({ behavior: 'smooth' })}
                  className={`px-8 py-4 font-bold rounded-xl transition-all border-2 ${
                    isDark
                      ? 'border-[#5ce1e5] text-[#5ce1e5] hover:bg-[#27304a]'
                      : 'border-gray-400 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Learn More
                </button>
              </div>
            </div>

            {/* Right Visual - Logo and Animations */}
            <div className="relative h-96 md:h-full flex items-center justify-center">
              <div className="relative w-64 h-64 flex items-center justify-center">
                {/* Rotating Fan Background */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <RotatingFan size="w-56 h-56" />
                </div>

                {/* Pulsing Rings */}
                <div className="absolute inset-0 rounded-full border-2 border-[#5ce1e5]/30 animate-pulse" />
                <div className="absolute inset-8 rounded-full border-2 border-[#fd5757]/30" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '0.5s' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className={`relative py-20 px-6 transition-colors duration-300 ${
        isDark ? 'bg-[#1a1f3a]' : 'bg-white/50'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-in fade-in duration-1000">
            <h2 className={`text-4xl md:text-5xl font-bold ${
              isDark ? 'text-white' : 'text-[#1a1a2e]'
            }`}>
              The Impact of <span className={isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'}>Efficient Cooling</span>
            </h2>
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Real numbers from real data centers</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <AnimatedCounter end={40} label="Energy Cost Reduction" suffix="%" />
            <AnimatedCounter end={15} label="CO2 Emissions Cut" suffix="%" />
            <AnimatedCounter end={50} label="Performance Gain" suffix="%" />
            <AnimatedCounter end={99} label="System Uptime" suffix="%" />
          </div>
        </div>
      </section>

      {/* Cooling Visualization Section */}
      <section className={`relative py-20 px-6 transition-colors duration-300 ${
        isDark ? 'bg-[#0a0e27]' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-4xl md:text-5xl font-bold text-center mb-16 ${
            isDark ? 'text-white' : 'text-[#1a1a2e]'
          }`}>How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Cooling Waves */}
            <div className={`p-8 rounded-2xl border-2 transition-colors ${
              isDark
                ? 'bg-[#1a1f3a] border-[#fd5757]/30 hover:border-[#fd5757]/50'
                : 'bg-white border-[#5ce1e5]/20 hover:border-[#5ce1e5]/50'
            }`}>
              <h3 className={`text-2xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-[#1a1a2e]'
              }`}>Cooling Waves</h3>
              <CoolingWave />
              <p className={`mt-6 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Dynamic cooling optimization with adaptive wave patterns</p>
            </div>

            {/* Server Racks */}
            <div className={`p-8 rounded-2xl border-2 transition-colors ${
              isDark
                ? 'bg-[#1a1f3a] border-[#5ce1e5]/30 hover:border-[#5ce1e5]/50'
                : 'bg-white border-[#fd5757]/20 hover:border-[#fd5757]/50'
            }`}>
              <h3 className={`text-2xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-[#1a1a2e]'
              }`}>Server Monitoring</h3>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#27304a]' : 'bg-gray-50'}`}>
                <ServerRackAnimation />
              </div>
              <p className={`mt-6 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Real-time monitoring of all server components</p>
            </div>

            {/* Rotating Fan */}
            <div className={`p-8 rounded-2xl border-2 transition-colors ${
              isDark
                ? 'bg-[#1a1f3a] border-purple-500/30 hover:border-purple-500/50'
                : 'bg-white border-purple-200 hover:border-purple-400'
            }`}>
              <h3 className={`text-2xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-[#1a1a2e]'
              }`}>Fan Control</h3>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#27304a]' : 'bg-gray-50'}`}>
                <RotatingFan />
              </div>
              <p className={`mt-6 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Intelligent fan speed optimization</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={`relative py-20 px-6 scroll-mt-20 transition-colors duration-300 ${
        isDark ? 'bg-[#1a1f3a]' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-in fade-in duration-1000">
            <h2 className={`text-4xl md:text-5xl font-bold ${
              isDark ? 'text-white' : 'text-[#1a1a2e]'
            }`}>
              Why Choose <span className={isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'}>COOLIENCE</span>?
            </h2>
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Advanced features for modern data centers</p>
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

      {/* Impact Section */}
      <section id="impact" className={`relative py-20 px-6 scroll-mt-20 transition-colors duration-300 ${
        isDark ? 'bg-[#1a1f3a]' : 'bg-gradient-to-r from-[#5ce1e5]/5 to-[#fd5757]/5'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="space-y-16">
            {[
              {
                title: '🌍 Environmental Impact',
                items: ['Reduce carbon footprint', 'Support sustainability goals', 'Meet compliance requirements'],
              },
              {
                title: '💰 Financial Benefits',
                items: ['Lower operational costs', 'Improved ROI', 'Predictable budgeting'],
              },
              {
                title: '⚙️ Operational Excellence',
                items: ['Increased reliability', 'Better performance', 'Reduced downtime'],
              },
            ].map((section, idx) => (
              <div
                key={idx}
                className={`group p-8 rounded-2xl border-2 hover:shadow-xl transition-all duration-300 animate-in fade-in ${
                  isDark
                    ? 'bg-[#27304a] border-[#3f4a68] hover:border-[#5ce1e5]'
                    : 'bg-white border-gray-200 hover:border-[#5ce1e5]'
                }`}
                style={{ animationDelay: `${idx * 200}ms` }}
              >
                <div className="flex items-start gap-6">
                  <div className="text-5xl flex-shrink-0">{section.title.split(' ')[0]}</div>
                  <div className="flex-1 space-y-4">
                    <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#1a1a2e]'}`}>{section.title.split(' ').slice(1).join(' ')}</h3>
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className={`flex items-center gap-3 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                          <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-[#fd5757]' : 'bg-[#5ce1e5]'}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`relative py-20 px-6 transition-colors duration-300 ${
        isDark ? 'bg-[#0a0e27]' : 'bg-white'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className={`relative overflow-hidden rounded-3xl p-12 md:p-16 ${
            isDark
              ? 'bg-gradient-to-r from-[#fd5757] to-[#ff8888]'
              : 'bg-gradient-to-r from-[#5ce1e5] to-[#8dd5d9]'
          }`}>
            <div className="absolute inset-0 opacity-10">
              <Sparkles className="absolute top-4 left-4 w-8 h-8 animate-pulse" />
              <Layers className="absolute bottom-4 right-4 w-8 h-8 animate-bounce" style={{ animationDuration: '3s' }} />
            </div>

            <div className={`relative space-y-6 text-center ${isDark ? 'text-[#0a0e27]' : 'text-white'}`}>
              <h2 className={`text-4xl md:text-5xl font-bold ${isDark ? 'text-[#0a0e27]' : 'text-white'}`}>Ready to Revolutionize Your Data Center?</h2>
              <p className={`text-lg opacity-95 max-w-2xl mx-auto ${isDark ? 'text-[#1a1a2e]' : 'text-white'}`}>
                Join hundreds of data center operators who are already saving money and reducing their environmental impact.
              </p>
              <button
                onClick={() => navigate('/auth/signup')}
                className={`px-8 py-4 font-bold rounded-xl hover:scale-105 transition-transform transform inline-block ${
                  isDark
                    ? 'bg-white text-[#fd5757]'
                    : 'bg-white text-[#5ce1e5]'
                }`}
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className={`relative py-12 px-6 scroll-mt-20 border-t transition-colors duration-300 ${
        isDark
          ? 'bg-[#1a1f3a] border-[#27304a]'
          : 'bg-white/50 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="COOLIENCE" className="w-8 h-8" />
                <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-[#1a1a2e]'}`}>COOLIENCE</span>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Optimizing data center cooling for a sustainable future.</p>
            </div>

            <div>
              <h4 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-[#1a1a2e]'}`}>Product</h4>
              <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                <li><a href="#" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>Features</a></li>
                <li><a href="#" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>Pricing</a></li>
                <li><a href="#" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>Documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-[#1a1a2e]'}`}>Company</h4>
              <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                <li><a href="#" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>About</a></li>
                <li><a href="#" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>Blog</a></li>
                <li><a href="#" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-[#1a1a2e]'}`}>Contact</h4>
              <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                <li><a href="mailto:contact@coolience.com" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>contact@coolience.com</a></li>
                <li><a href="tel:+1234567890" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>+1 (234) 567-890</a></li>
                <li><a href="#" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>Support</a></li>
              </ul>
            </div>
          </div>

          <div className={`border-t pt-8 flex flex-col md:flex-row justify-between items-center text-sm ${
            isDark
              ? 'border-[#27304a] text-gray-400'
              : 'border-gray-200 text-gray-700'
          }`}>
            <p>&copy; 2026 COOLIENCE. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>Privacy</a>
              <a href="#" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>Terms</a>
              <a href="#" className={`hover:${isDark ? 'text-[#fd5757]' : 'text-[#5ce1e5]'} transition-colors`}>Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.8s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default Homepage
