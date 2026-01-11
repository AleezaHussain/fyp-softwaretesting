import React, { useState, useRef, useMemo } from 'react'
import { Zap, Wind, DollarSign, TrendingDown } from 'lucide-react'

const SERVER_LIBRARY = {
  dell_poweredge_r750: { name: 'Dell PowerEdge R750', maxPower: 650, idlePower: 180, manufacturer: 'Dell' },
  hp_proliant_dl380: { name: 'HP ProLiant DL380 Gen10', maxPower: 600, idlePower: 170, manufacturer: 'HP' },
  lenovo_thinksystem_sr550: { name: 'Lenovo ThinkSystem SR550', maxPower: 700, idlePower: 200, manufacturer: 'Lenovo' },
  ibm_power_system_e1050: { name: 'IBM Power System E1050', maxPower: 750, idlePower: 220, manufacturer: 'IBM' },
  supermicro_sys_1124us_tnrt: { name: 'Supermicro SYS-1124US-TNRT', maxPower: 580, idlePower: 160, manufacturer: 'Supermicro' },
  cisco_ucs_c480_m5: { name: 'Cisco UCS C480 M5', maxPower: 800, idlePower: 240, manufacturer: 'Cisco' },
}

const FAN_EFFICIENCY = {
  best: { min: 0.3, max: 0.4 },
  average: { min: 0.5, max: 0.7 },
  old: { min: 0.8, max: 1.2 },
}

const TARIFF_RANGES: any = {
  us_northeast: { min: 0.13, max: 0.18, typical: 0.155 },
  us_midwest: { min: 0.1, max: 0.14, typical: 0.12 },
  us_south: { min: 0.1, max: 0.13, typical: 0.115 },
  us_west: { min: 0.12, max: 0.16, typical: 0.14 },
  california: { min: 0.14, max: 0.22, typical: 0.18 },
}

interface AirSideEconomizationProps {
  serverType?: string
  numberOfRacks?: number
  serversPerRack?: number
  averageUtilization?: number
  peakUtilization?: number
  fans?: { bestFans: number; averageFans: number; oldFans: number }
  region?: string
  onConfigChange?: (config: any) => void
}

const AirSideEconomization: React.FC<AirSideEconomizationProps> = ({
  serverType = 'dell_poweredge_r750',
  numberOfRacks = 5,
  serversPerRack = 10,
  averageUtilization = 45,
  peakUtilization = 85,
  fans: initialFans = { bestFans: 2, averageFans: 4, oldFans: 0 },
  region = 'us_northeast',
  onConfigChange,
}) => {
  const [localServerType, setLocalServerType] = useState<keyof typeof SERVER_LIBRARY>(serverType as any)
  const [localNumberOfRacks, setLocalNumberOfRacks] = useState(numberOfRacks)
  const [localServersPerRack, setLocalServersPerRack] = useState(serversPerRack)
  const [localAvgUtil, setLocalAvgUtil] = useState(averageUtilization)
  const [localPeakUtil, setLocalPeakUtil] = useState(peakUtilization)
  const [localFans, setLocalFans] = useState(initialFans)
  const [localRegion, setLocalRegion] = useState(region)
  const [bestFanEfficiency, setBestFanEfficiency] = useState(0.35)
  const [avgFanEfficiency, setAvgFanEfficiency] = useState(0.6)
  const [oldFanEfficiency, setOldFanEfficiency] = useState(1.0)

  const lastSentRef = useRef<string>('')

  // Memoize all calculations to prevent unnecessary recalculations
  const calculations = useMemo(() => {
    const serverSpec = SERVER_LIBRARY[localServerType]
    const numberOfServers = localNumberOfRacks * localServersPerRack
    const avgPowerPerServer = (serverSpec.maxPower + serverSpec.idlePower) / 2
    const totalITPowerKW = (numberOfServers * avgPowerPerServer * localAvgUtil) / 100 / 1000
    const estimatedCFM = numberOfServers * 20
    const totalFans = localFans.bestFans + localFans.averageFans + localFans.oldFans
    const bestFanPower = totalFans > 0 ? (localFans.bestFans / totalFans) * estimatedCFM * bestFanEfficiency : 0
    const avgFanPower = totalFans > 0 ? (localFans.averageFans / totalFans) * estimatedCFM * avgFanEfficiency : 0
    const oldFanPower = totalFans > 0 ? (localFans.oldFans / totalFans) * estimatedCFM * oldFanEfficiency : 0
    const totalFanPowerKW = (bestFanPower + avgFanPower + oldFanPower) / 1000
    const totalCoolingPowerKW = totalITPowerKW + totalFanPowerKW
    const tariff = TARIFF_RANGES[localRegion]?.typical || 0.15
    const annualCostUSD = totalCoolingPowerKW * 8760 * tariff
    
    return {
      serverSpec,
      numberOfServers,
      totalITPowerKW,
      totalFanPowerKW,
      totalCoolingPowerKW,
      annualCostUSD,
      tariff,
    }
  }, [localServerType, localNumberOfRacks, localServersPerRack, localAvgUtil, localFans, bestFanEfficiency, avgFanEfficiency, oldFanEfficiency, localRegion])

  const { serverSpec, numberOfServers, totalITPowerKW, totalFanPowerKW, totalCoolingPowerKW, annualCostUSD, tariff } = calculations

  // Call the callback whenever calculations change
  React.useEffect(() => {
    if (!onConfigChange) return undefined

    const payload = {
      numberOfServers,
      serverType: localServerType,
      numberOfRacks: localNumberOfRacks,
      serversPerRack: localServersPerRack,
      avgUtilization: localAvgUtil,
      peakUtilization: localPeakUtil,
      fans: localFans,
      region: localRegion,
      itPowerKW: totalITPowerKW,
      fanPowerKW: totalFanPowerKW,
      totalCoolingPowerKW,
      annualCostUSD,
      fanEfficiency: { best: bestFanEfficiency, average: avgFanEfficiency, old: oldFanEfficiency },
    }

    try {
      const serialized = JSON.stringify(payload)
      if (lastSentRef.current !== serialized) {
        lastSentRef.current = serialized
        onConfigChange(payload)
      }
    } catch (e) {
      onConfigChange(payload)
    }
    
    return undefined
  }, [numberOfServers, totalITPowerKW, totalFanPowerKW, totalCoolingPowerKW, annualCostUSD, localServerType, localNumberOfRacks, localServersPerRack, localAvgUtil, localPeakUtil, localFans, localRegion, bestFanEfficiency, avgFanEfficiency, oldFanEfficiency, onConfigChange])

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .card-hover { transition: all 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(92, 225, 229, 0.1); }
        .input-focus { transition: all 0.2s ease; }
        .input-focus:focus { box-shadow: 0 0 0 3px rgba(92, 225, 229, 0.1); }
      `}</style>

      {/* Section 1: Server Configuration */}
      <div className="card-hover bg-white rounded-2xl p-6 border border-gray-200 shadow-sm animate-fade-in">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-[#1a1a2e]">Server Configuration</h4>
            <p className="text-xs text-gray-500">Select and configure your server infrastructure</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1a1a2e] mb-3">Server Type</label>
            <select
              value={localServerType}
              onChange={(e) => setLocalServerType(e.target.value as any)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none input-focus focus:border-[#5ce1e5] bg-white text-[#1a1a2e] font-medium"
            >
              {Object.entries(SERVER_LIBRARY).map(([key, spec]) => (
                <option key={key} value={key}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Max Power</div>
              <div className="text-2xl font-bold text-blue-900">{serverSpec.maxPower}</div>
              <div className="text-xs text-blue-600">Watts</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
              <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Idle</div>
              <div className="text-2xl font-bold text-purple-900">{serverSpec.idlePower}</div>
              <div className="text-xs text-purple-600">Watts</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#1a1a2e] mb-2">Racks</label>
              <input type="number" value={localNumberOfRacks} onChange={(e) => setLocalNumberOfRacks(Number(e.target.value))} min={1} max={100} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 input-focus focus:border-[#5ce1e5]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1a1a2e] mb-2">Servers/Rack</label>
              <input type="number" value={localServersPerRack} onChange={(e) => setLocalServersPerRack(Number(e.target.value))} min={1} max={50} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 input-focus focus:border-[#5ce1e5]" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-[#5ce1e5]/10 to-blue-400/10 border-l-4 border-[#5ce1e5]">
            <div className="text-sm text-gray-600">Total Servers</div>
            <div className="text-3xl font-bold text-[#1a1a2e]">{numberOfServers}</div>
          </div>
        </div>
      </div>

      {/* Section 2: Utilization & Fans */}
      <div className="card-hover bg-white rounded-2xl p-6 border border-gray-200 shadow-sm animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Wind className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-[#1a1a2e]">Utilization & Cooling</h4>
            <p className="text-xs text-gray-500">Set operational parameters and fan efficiency</p>
          </div>
        </div>

        <div className="space-y-5 mb-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-[#1a1a2e]">Average Utilization</label>
              <span className="text-xl font-bold text-green-600">{localAvgUtil}%</span>
            </div>
            <input type="range" value={localAvgUtil} onChange={(e) => setLocalAvgUtil(Number(e.target.value))} min={0} max={100} className="w-full h-3 bg-gradient-to-r from-green-200 to-green-500 rounded-lg appearance-none cursor-pointer" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-[#1a1a2e]">Peak Utilization</label>
              <span className="text-xl font-bold text-red-600">{localPeakUtil}%</span>
            </div>
            <input type="range" value={localPeakUtil} onChange={(e) => setLocalPeakUtil(Number(e.target.value))} min={0} max={100} className="w-full h-3 bg-gradient-to-r from-orange-200 to-red-500 rounded-lg appearance-none cursor-pointer" />
          </div>
        </div>

        <h5 className="font-semibold text-[#1a1a2e] text-sm mb-4">Fan Efficiency</h5>
        <div className="space-y-3">
          {[
            { label: 'Best-in-class', state: bestFanEfficiency, setState: setBestFanEfficiency, min: FAN_EFFICIENCY.best.min, max: FAN_EFFICIENCY.best.max, count: localFans.bestFans, setCount: (v: number) => setLocalFans({ ...localFans, bestFans: v }), color: 'green', bg: 'bg-green-50' },
            { label: 'Average VFD', state: avgFanEfficiency, setState: setAvgFanEfficiency, min: FAN_EFFICIENCY.average.min, max: FAN_EFFICIENCY.average.max, count: localFans.averageFans, setCount: (v: number) => setLocalFans({ ...localFans, averageFans: v }), color: 'yellow', bg: 'bg-yellow-50' },
            { label: 'Legacy', state: oldFanEfficiency, setState: setOldFanEfficiency, min: FAN_EFFICIENCY.old.min, max: FAN_EFFICIENCY.old.max, count: localFans.oldFans, setCount: (v: number) => setLocalFans({ ...localFans, oldFans: v }), color: 'red', bg: 'bg-red-50' },
          ].map((fan, idx) => (
            <div key={idx} className={`border rounded-lg p-4 ${fan.bg}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-[#1a1a2e]">{fan.label}</div>
                  <div className="text-xs text-gray-600">Range: {fan.min}–{fan.max} W/CFM</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Efficiency:</label>
                    <input type="number" value={fan.state} onChange={(e) => { const v = Number(e.target.value); if (v >= fan.min && v <= fan.max) fan.setState(v); }} min={fan.min} max={fan.max} step={0.01} className={`w-16 border border-gray-300 rounded px-2 py-1`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Quantity:</label>
                    <input type="number" value={fan.count} onChange={(e) => fan.setCount(Number(e.target.value))} min={0} max={50} className="w-16 border border-gray-300 rounded px-2 py-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Regional Tariff */}
      <div className="card-hover bg-white rounded-2xl p-6 border border-gray-200 shadow-sm animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-[#1a1a2e]">Regional Tariff</h4>
            <p className="text-xs text-gray-500">Select your electricity pricing region</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#1a1a2e] mb-3">Region</label>
            <select value={localRegion} onChange={(e) => setLocalRegion(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none input-focus focus:border-[#5ce1e5]">
              <option value="us_northeast">US Northeast</option>
              <option value="us_midwest">US Midwest</option>
              <option value="us_south">US South</option>
              <option value="us_west">US West</option>
              <option value="california">California</option>
            </select>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
            <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Tariff</div>
            <div className="text-2xl font-bold text-amber-900">${tariff.toFixed(3)}</div>
            <div className="text-xs text-amber-600">/kWh</div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="card-hover bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-300">
          <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-blue-700" />
          </div>
          <h4 className="font-bold text-lg text-[#1a1a2e]">Annual Power & Cost Summary</h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Zap, label: 'IT Power', value: totalITPowerKW.toFixed(1), unit: 'kW', color: 'blue' },
            { icon: Wind, label: 'Fan Power', value: totalFanPowerKW.toFixed(1), unit: 'kW', color: 'green' },
            { icon: Zap, label: 'Total Power', value: totalCoolingPowerKW.toFixed(1), unit: 'kW', color: 'purple' },
            { icon: DollarSign, label: 'Annual Cost', value: `$${(annualCostUSD / 1000).toFixed(1)}k`, unit: '/year', color: 'red' },
          ].map((stat, idx) => (
            <div key={idx} className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-2">{stat.label}</div>
              <div className="text-2xl font-bold text-[#1a1a2e]">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.unit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AirSideEconomization
