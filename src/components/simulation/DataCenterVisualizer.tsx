import React, { Suspense } from 'react'
import { DataCenterComponent } from '../../types/simulation'
import { ThreeJSVisualization } from './ThreeJSVisualization'

interface DataCenterVisualizerProps {
  components: DataCenterComponent[]
  totalHeatLoad: number
}

export const DataCenterVisualizer: React.FC<DataCenterVisualizerProps> = ({
  components,
  totalHeatLoad,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-[#1a1a2e]">3D Data Center Layout</h3>
        <p className="text-xs text-gray-600 mt-1">Interactive visualization - drag to rotate, scroll to zoom</p>
      </div>

      <Suspense
        fallback={
          <div className="w-full h-96 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-[#5ce1e5] mx-auto mb-2" />
              <span className="text-sm text-gray-600">Loading 3D visualization...</span>
            </div>
          </div>
        }
      >
        {components.length > 0 ? (
          <ThreeJSVisualization components={components} width="100%" height="400px" />
        ) : (
          <div className="w-full h-96 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-gray-600">Add components to see the 3D visualization</p>
            </div>
          </div>
        )}
      </Suspense>

      {/* Heat Load Indicator */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Heat Load</div>
            <div className="text-2xl font-bold text-[#5ce1e5]">{totalHeatLoad.toFixed(1)} kW</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Components</div>
            <div className="text-2xl font-bold text-[#1a1a2e]">
              {components.reduce((sum, c) => sum + c.quantity, 0)}
            </div>
          </div>
          <div className="w-32 h-20 bg-gradient-to-r from-blue-400 via-yellow-400 to-red-600 rounded-lg flex items-center justify-center">
            <div className="text-white text-xs font-semibold text-center">
              <div>Cool</div>
              <div>Optimal</div>
              <div>Hot</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
