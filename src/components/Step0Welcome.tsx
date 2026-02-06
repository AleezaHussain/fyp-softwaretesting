import React from 'react';
import { ArrowRight, Zap, Droplet, Wind } from 'lucide-react';

interface Step0WelcomeProps {
  isDark: boolean;
  isTransitioning: boolean;
  handleStepChange: (step: number) => void;
}

const Step0Welcome: React.FC<Step0WelcomeProps> = ({ isDark, isTransitioning, handleStepChange }) => (
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
);

export default Step0Welcome;
