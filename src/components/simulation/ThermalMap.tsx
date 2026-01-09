import React from 'react'
import { Thermometer } from 'lucide-react'
import { DataCenterComponent } from '../../types/simulation'

interface ThermalMapProps {
  components: DataCenterComponent[]
  thermalData: Array<{
    componentId: string
    temperature: number
    heatLoad: number
    position: { x: number; y: number; z: number }
  }>
}

export const ThermalMap: React.FC<ThermalMapProps> = ({ components, thermalData }) => {
  // Calculate min/max temperatures for scale
  const temperatures = thermalData.map((t) => t.temperature)
  const minTemp = Math.min(...temperatures)
  const maxTemp = Math.max(...temperatures)
  const range = maxTemp - minTemp || 1

  // Component names map
  const componentNames: Record<string, string> = {
    server_rack: 'Server Rack',
    router: 'Router',
    cooling_pump: 'Cooling Pump',
    pdu: 'PDU',
    storage_array: 'Storage',
    backup_generator: 'Generator',
  }

  const getTemperatureColor = (temp: number) => {
    const normalized = (temp - minTemp) / range
    if (normalized < 0.2) return { color: '#3b82f6', label: 'Cold' }
    if (normalized < 0.4) return { color: '#10b981', label: 'Cool' }
    if (normalized < 0.6) return { color: '#fbbf24', label: 'Optimal' }
    if (normalized < 0.8) return { color: '#f97316', label: 'Warm' }
    return { color: '#ef4444', label: 'Hot' }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
        <Thermometer size={20} className="text-[#5ce1e5]" />
        Thermal Distribution Map
      </h3>

      {/* Heat map visualization */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-400 via-yellow-400 to-red-600 rounded-lg">
        <div className="text-white text-center text-sm font-semibold">
          Temperature Gradient
        </div>
        <div className="flex justify-between text-white text-xs mt-2">
          <span>{minTemp.toFixed(1)}°C</span>
          <span>{((minTemp + maxTemp) / 2).toFixed(1)}°C</span>
          <span>{maxTemp.toFixed(1)}°C</span>
        </div>
      </div>

      {/* Component thermal details */}
      <div className="space-y-3">
        {thermalData.map((thermal, index) => {
          const component = components.find((c) => c.id === thermal.componentId)
          const { color, label } = getTemperatureColor(thermal.temperature)
          const normalized = (thermal.temperature - minTemp) / range

          return (
            <div key={thermal.componentId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-[#1a1a2e]">
                    {component ? componentNames[component.type] : `Component ${index + 1}`}
                  </div>
                  <div className="text-xs text-gray-600">
                    ID: {thermal.componentId.substring(0, 12)}...
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color }}>
                    {thermal.temperature.toFixed(1)}°C
                  </div>
                  <div className="text-xs text-gray-600">{label}</div>
                </div>
              </div>

              {/* Heat load bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Heat Load</span>
                  <span>{thermal.heatLoad.toFixed(1)} kW</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: color,
                      width: `${(normalized * 100).toFixed(0)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Position info */}
              <div className="text-xs text-gray-500">
                Position: ({thermal.position.x.toFixed(1)}, {thermal.position.y.toFixed(1)},
                {thermal.position.z.toFixed(1)})
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-xs font-bold text-gray-700 mb-2">TEMPERATURE ZONES</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            <span>Cold (&lt;20°C)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span>Cool (20-22°C)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }} />
            <span>Optimal (22-27°C)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }} />
            <span>Warm (27-32°C)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <span>Hot (&gt;32°C)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
