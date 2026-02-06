import React from 'react';
import { CheckCircle2, Wind, Sparkles, Droplet } from 'lucide-react';

interface CoolingTechnique {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  features: string[];
  color: string;
}

interface Step1CoolingTechniqueProps {
  isDark: boolean;
  isTransitioning: boolean;
  selectedTechnique: string | null;
  coolingTechniques: CoolingTechnique[];
  handleTechniqueSelect: (id: string) => void;
}

const Step1CoolingTechnique: React.FC<Step1CoolingTechniqueProps> = ({
  isDark,
  isTransitioning,
  selectedTechnique,
  coolingTechniques,
  handleTechniqueSelect,
}) => (
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
        const TechIcon = technique.icon;
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
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export default Step1CoolingTechnique;
