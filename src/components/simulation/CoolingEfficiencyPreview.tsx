import React from 'react'
import { TrendingDown } from 'lucide-react'
import { CoolingTechnique, TechniqueComparison } from '../../types/simulation'

interface CoolingEfficiencyPreviewProps {
  comparisons: Array<{
    technique: CoolingTechnique
    pue: number
    wue: number
    efficiency: number
    totalEnergy: number
    estimatedCost: number
  }>
  selectedTechnique?: CoolingTechnique
}

export const CoolingEfficiencyPreview: React.FC<CoolingEfficiencyPreviewProps> = ({
  comparisons,
  selectedTechnique,
}) => {
  // Sort by efficiency
  const sorted = [...comparisons].sort((a, b) => b.efficiency - a.efficiency)
  const best = sorted[0]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
        <TrendingDown size={20} className="text-[#5ce1e5]" />
        Cooling Efficiency Preview
      </h3>

      <div className="space-y-3">
        {sorted.map((comp) => {
          const isSelected = selectedTechnique === comp.technique
          const isBest = best.technique === comp.technique

          return (
            <div
              key={comp.technique}
              className={`p-4 rounded-lg border-2 transition ${
                isSelected
                  ? 'border-[#fd5757] bg-red-50'
                  : isBest
                    ? 'border-[#5ce1e5] bg-cyan-50'
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-[#1a1a2e]">
                    {comp.technique.charAt(0).toUpperCase() + comp.technique.slice(1)}
                  </h4>
                  {isBest && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded">
                      BEST
                    </span>
                  )}
                  {isSelected && (
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">
                      SELECTED
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#5ce1e5]">
                    {comp.efficiency.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600">Efficiency</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#5ce1e5] to-[#00d9ff] transition-all duration-500"
                    style={{ width: `${comp.efficiency}%` }}
                  />
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-white rounded px-2 py-2">
                  <div className="text-xs text-gray-600">PUE</div>
                  <div className="font-bold text-[#1a1a2e]">{comp.pue.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded px-2 py-2">
                  <div className="text-xs text-gray-600">WUE</div>
                  <div className="font-bold text-[#1a1a2e]">{comp.wue.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded px-2 py-2">
                  <div className="text-xs text-gray-600">Cost</div>
                  <div className="font-bold text-[#1a1a2e]">
                    ${(comp.estimatedCost / 1000).toFixed(0)}k
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600">
        <div className="space-y-1">
          <div>
            <strong>PUE</strong> (Power Usage Effectiveness): Lower is better - ratio of total power to IT power
          </div>
          <div>
            <strong>WUE</strong> (Water Usage Effectiveness): Water consumption per kWh of IT equipment
          </div>
          <div>
            <strong>Efficiency %</strong>: Overall cooling system efficiency score
          </div>
        </div>
      </div>
    </div>
  )
}
