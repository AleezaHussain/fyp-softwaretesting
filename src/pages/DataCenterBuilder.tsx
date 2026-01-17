import React, { useEffect, useRef, useState } from 'react'
import { Save, Trash2, Upload, Download, MapPin } from 'lucide-react'
import Draggable from 'react-draggable'
import { DataCenterComponent, DataCenterConfig } from '../types/simulation'
import { ThreeJSVisualization } from '../components/simulation/ThreeJSVisualization'

const DEFAULT_HEAT_LOADS: Record<string, number> = {
  server_rack: 15,
  router: 2,
  cooling_pump: 3,
  pdu: 1,
  storage_array: 20,
  backup_generator: 50,
}

function uid(prefix = 'c') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export const DataCenterBuilder: React.FC = () => {
  const [components, setComponents] = useState<DataCenterComponent[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [configName, setConfigName] = useState('My Configuration')
  const [savedConfigs, setSavedConfigs] = useState<DataCenterConfig[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [mapCoord, setMapCoord] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('dc_configs')
    if (raw) {
      try {
        setSavedConfigs(JSON.parse(raw))
      } catch {
        setSavedConfigs([])
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('dc_configs', JSON.stringify(savedConfigs))
  }, [savedConfigs])

  const addComponent = (type: DataCenterComponent['type']) => {
    const newComp: DataCenterComponent = {
      id: uid(type),
      type,
      quantity: 1,
      position: { x: 50 + Math.random() * 200, y: 50 + Math.random() * 120, z: 0 },
    }
    setComponents((s) => [...s, newComp])
  }

  const removeComponent = (id: string) => {
    setComponents((s) => s.filter((c) => c.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  // react-draggable will handle drag interactions; update positions on stop

  const updateSelected = (patch: Partial<DataCenterComponent>) => {
    if (!selectedId) return
    setComponents((prev) => prev.map((c) => (c.id === selectedId ? { ...c, ...patch } : c)))
  }

  const totalHeatLoad = components.reduce((acc, c) => acc + (DEFAULT_HEAT_LOADS[c.type] || 0) * (c.quantity || 1), 0)
  const estimatedPowerKW = totalHeatLoad * 0.293 // example conversion
  const estimatedCostPerYear = estimatedPowerKW * 24 * 365 * 0.12 // $0.12 per kWh

  const saveConfiguration = () => {
    const cfg: DataCenterConfig = {
      dataCenterName: configName,
      components,
      totalHeatLoad,
    }
    setSavedConfigs((s) => [cfg, ...s])
    alert('Configuration saved locally')
  }

  const loadConfiguration = (cfg: DataCenterConfig) => {
    setComponents(cfg.components)
    setConfigName(cfg.dataCenterName)
  }

  const deleteConfiguration = (index: number) => {
    setSavedConfigs((s) => s.filter((_, i) => i !== index))
  }

  const exportJSON = () => {
    const data = { dataCenterName: configName, components }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${configName.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJSON = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (data.components) {
          setComponents(data.components)
          setConfigName(data.dataCenterName || 'Imported')
        } else {
          alert('Invalid file')
        }
      } catch (err) {
        alert('Failed to parse file')
      }
    }
    reader.readAsText(file)
  }

  const onMapClick = (e: React.MouseEvent) => {
    // naive map click -> lat/lng mapping for demo
    const rect = (e.target as HTMLDivElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const lng = -180 + (x / rect.width) * 360
    const lat = 90 - (y / rect.height) * 180
    setMapCoord({ lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 })
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#1a1a2e]">Data Center Builder</h1>
            <p className="text-sm text-gray-600">Create and configure your data center visually</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveConfiguration} className="bg-[#5ce1e5] text-[#1a1a2e] px-4 py-2 rounded-lg flex items-center gap-2">
              <Save size={16} /> Save
            </button>
            <button onClick={exportJSON} className="bg-white border border-gray-200 px-3 py-2 rounded-lg flex items-center gap-2">
              <Download size={16} /> Export
            </button>
            <label className="bg-white border border-gray-200 px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer">
              <Upload size={16} /> Import
              <input type="file" accept="application/json" className="hidden" onChange={(e) => importJSON(e.target.files ? e.target.files[0] : null)} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold mb-3">Palette</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Server Rack</div>
                  <div className="text-xs text-gray-500">Heat: 15 kW</div>
                </div>
                <button onClick={() => addComponent('server_rack')} className="bg-[#fd5757] text-white px-3 py-1 rounded">Add</button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Router</div>
                  <div className="text-xs text-gray-500">Heat: 2 kW</div>
                </div>
                <button onClick={() => addComponent('router')} className="bg-[#5ce1e5] text-[#1a1a2e] px-3 py-1 rounded">Add</button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Switch / PDU</div>
                  <div className="text-xs text-gray-500">Heat: 1 kW</div>
                </div>
                <button onClick={() => addComponent('pdu')} className="bg-gray-200 text-[#1a1a2e] px-3 py-1 rounded">Add</button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Cooling Pump</div>
                  <div className="text-xs text-gray-500">Heat: 3 kW</div>
                </div>
                <button onClick={() => addComponent('cooling_pump')} className="bg-cyan-100 text-[#1a1a2e] px-3 py-1 rounded">Add</button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Storage Array</div>
                  <div className="text-xs text-gray-500">Heat: 20 kW</div>
                </div>
                <button onClick={() => addComponent('storage_array')} className="bg-orange-100 text-[#1a1a2e] px-3 py-1 rounded">Add</button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Generator</div>
                  <div className="text-xs text-gray-500">Heat: 50 kW</div>
                </div>
                <button onClick={() => addComponent('backup_generator')} className="bg-red-100 text-[#1a1a2e] px-3 py-1 rounded">Add</button>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-2">Saved Configurations</h4>
              <div className="space-y-2 max-h-40 overflow-auto">
                {savedConfigs.map((c, i) => (
                  <div key={i} className="flex items-center justify-between border rounded px-2 py-1">
                    <div className="text-sm">{c.dataCenterName}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => loadConfiguration(c)} className="text-sm text-[#5ce1e5]">Load</button>
                      <button onClick={() => deleteConfiguration(i)} className="text-sm text-red-600">Delete</button>
                    </div>
                  </div>
                ))}
                {savedConfigs.length === 0 && <div className="text-xs text-gray-400">No saved configs</div>}
              </div>
            </div>

          </div>

          <div className="col-span-6 bg-white rounded-lg border border-gray-200 p-4">
            <div ref={containerRef} className="relative bg-[#f8fafc] h-96 border rounded overflow-hidden">
              {components.map((c) => (
                <Draggable
                  key={c.id}
                  bounds="parent"
                  defaultPosition={{ x: c.position?.x || 0, y: c.position?.y || 0 }}
                  onStop={(_, data) => {
                    setComponents((prev) => prev.map((p) => (p.id === c.id ? { ...p, position: { x: Math.max(0, data.x), y: Math.max(0, data.y), z: p.position?.z || 0 } } : p)))
                  }}
                >
                  <div
                    onDoubleClick={() => setSelectedId(c.id)}
                    className={`cursor-grab p-2 rounded shadow-md w-36 ${selectedId === c.id ? 'ring-2 ring-[#5ce1e5]' : 'bg-white'}`}
                    style={{ userSelect: 'none' }}
                  >
                    <div className="text-sm font-semibold">{c.type.replace('_', ' ')}</div>
                    <div className="text-xs text-gray-500">Qty: {c.quantity}</div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => removeComponent(c.id)} className="text-xs text-red-600">Remove</button>
                      <button onClick={() => setSelectedId(c.id)} className="text-xs text-[#5ce1e5]">Properties</button>
                    </div>
                  </div>
                </Draggable>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-lg border text-sm">
                <div className="text-xs text-gray-500">Total Heat Load</div>
                <div className="text-lg font-bold">{totalHeatLoad} kW</div>
              </div>
              <div className="p-3 bg-white rounded-lg border text-sm">
                <div className="text-xs text-gray-500">Estimated Power</div>
                <div className="text-lg font-bold">{estimatedPowerKW.toFixed(1)} kW</div>
              </div>
              <div className="p-3 bg-white rounded-lg border text-sm">
                <div className="text-xs text-gray-500">Estimated Cost /yr</div>
                <div className="text-lg font-bold">${Math.round(estimatedCostPerYear)}</div>
              </div>
            </div>

            <div className="mt-6 bg-white rounded-lg border p-4">
              <h4 className="font-semibold mb-3">3D Preview</h4>
              <div className="h-64 w-full">
                <ThreeJSVisualization components={components} showThermal={false} />
              </div>
            </div>

          </div>

          <div className="col-span-3 bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold mb-3">Properties</h4>
            {selectedId ? (
              (() => {
                const comp = components.find((c) => c.id === selectedId)!
                return (
                  <div>
                    <div className="mb-2 text-sm font-medium">Type</div>
                    <div className="mb-3">{comp.type}</div>

                    <label className="block text-sm mb-2">Quantity</label>
                    <input type="number" value={comp.quantity} min={1} onChange={(e) => updateSelected({ quantity: Number(e.target.value) })} className="w-full border px-2 py-1 rounded mb-3" />

                    <label className="block text-sm mb-2">Position X</label>
                    <input type="number" value={comp.position?.x || 0} onChange={(e) => updateSelected({ position: { ...(comp.position || { x: 0, y: 0, z: 0 }), x: Number(e.target.value) } })} className="w-full border px-2 py-1 rounded mb-3" />

                    <label className="block text-sm mb-2">Position Y</label>
                    <input type="number" value={comp.position?.y || 0} onChange={(e) => updateSelected({ position: { ...(comp.position || { x: 0, y: 0, z: 0 }), y: Number(e.target.value) } })} className="w-full border px-2 py-1 rounded mb-3" />

                    <button onClick={() => removeComponent(comp.id)} className="w-full bg-red-50 text-red-600 py-2 rounded">Remove Component</button>
                  </div>
                )
              })()
            ) : (
              <div className="text-sm text-gray-500">Select a component to edit its properties</div>
            )}

            <div className="mt-6">
              <h4 className="font-semibold mb-2">Location Picker</h4>
              <div className="mb-2 text-sm text-gray-500">Click the map to pick a location</div>
              <div onClick={onMapClick} className="h-40 bg-gradient-to-br from-sky-50 to-cyan-50 border rounded flex items-center justify-center cursor-crosshair">
                {mapCoord ? (
                  <div className="text-sm text-[#1a1a2e] flex items-center gap-2"><MapPin /> {mapCoord.lat}, {mapCoord.lng}</div>
                ) : (
                  <div className="text-sm text-gray-400">Click to pick location</div>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
