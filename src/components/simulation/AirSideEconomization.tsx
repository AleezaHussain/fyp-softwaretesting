// AirSideEconomization.tsx - COMPLETE CORRECTED VERSION
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import {
  Zap, Wind, DollarSign, TrendingDown, MapPin, AlertCircle,
  BarChart3, CheckCircle2, Server as ServerIcon,
  Cpu, HardDrive, Upload, MemoryStick, ThermometerSun
} from 'lucide-react'

// Import Supabase
import { supabase } from '../../lib/supabase'
import { useSimulationStore } from '../../store/store'

// Define interfaces for fetched data
interface Server {
  id: string
  name: string
  manufacturer: string
  model: string
  max_power_w: number
  idle_power_w: number
  typical_power_w: number
  form_factor: string
  cooling_type: string
  typical_utilization: number
  cpu_type: string
  memory_gb: number
  storage_tb: number
  release_year: number
  efficiency_rating: string
  avg_utilization_percent?: number
  peak_utilization_percent?: number
  weight_kg?: number
  dimensions?: string
}

interface CountryTariff {
  id: string
  country_name: string
  electricity_tariff: number
  co2_grid_factor: number
}

interface FanParameter {
  id: string
  param_group: string
  param_key: string
  display_name: string
  min_value: number
  max_value: number
  unit: string
  status_label: string
  description: string
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
  locationData?: Array<{ timestamp: string, temperature: number, humidity: number }>
  countryId?: string
  serverId?: string
}

const AirSideEconomization: React.FC<AirSideEconomizationProps> = ({
  serverType = '',
  numberOfRacks = 5,
  serversPerRack = 10,
  averageUtilization = 45,
  peakUtilization = 85,
  fans: initialFans = { bestFans: 2, averageFans: 4, oldFans: 0 },
  region = '',
  onConfigChange,
  locationData,
  countryId = '',
  serverId = '',
}) => {
  const navigate = useNavigate();
  // New physical fields state
  const [supplyAirTemp, setSupplyAirTemp] = useState(18.0); // °C, default
  const [returnAirTemp, setReturnAirTemp] = useState(30.0); // °C, default
  const [airflowCFM, setAirflowCFM] = useState(2000); // CFM, default
  const [deltaT, setDeltaT] = useState(12.0); // °C, default (return - supply)
  const [servers, setServers] = useState<Server[]>([])
  const [countries, setCountries] = useState<CountryTariff[]>([])
  const [fanParameters, setFanParameters] = useState<FanParameter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedServer, setSelectedServer] = useState<Server | null>(null)

  // Zustand store updater
  const updateSimulationInput = useSimulationStore(state => state.updateSimulationInput)

  // Initialize from props
  const [selectedCountryId, setSelectedCountryId] = useState<string>(countryId || '')

  const [error, setError] = useState<string>('')

  // Local state
  const [localServerType, setLocalServerType] = useState<string>(serverId || serverType || '')
  const [localNumberOfRacks, setLocalNumberOfRacks] = useState(numberOfRacks)
  const [localServersPerRack, setLocalServersPerRack] = useState(serversPerRack)
  // Dynamically set utilization from selected server
  const [localAvgUtil, setLocalAvgUtil] = useState(selectedServer?.avg_utilization_percent ?? averageUtilization)
  const [localPeakUtil, setLocalPeakUtil] = useState(selectedServer?.peak_utilization_percent ?? peakUtilization)

  // Update utilization when selectedServer changes
  useEffect(() => {
    if (selectedServer) {
      setLocalAvgUtil(Number(selectedServer.avg_utilization_percent) || 0)
      setLocalPeakUtil(Number(selectedServer.peak_utilization_percent) || 0)
    }
  }, [selectedServer])
  const [localFans, setLocalFans] = useState(initialFans)

  // Fan efficiency from database parameters
  const [bestFanEfficiency, setBestFanEfficiency] = useState(0.35)
  const [avgFanEfficiency, setAvgFanEfficiency] = useState(0.6)
  const [oldFanEfficiency, setOldFanEfficiency] = useState(1.0)

  const [localLocationData, setLocalLocationData] = useState<any[]>([])

  // Advanced Economizer Controls (Optional)
  const [economizerMaxOutdoorTemp, setEconomizerMaxOutdoorTemp] = useState(24); // °C, default 24
  const [economizerMaxHumidity, setEconomizerMaxHumidity] = useState(60); // %, default 60
  const [minOutdoorAirFraction, setMinOutdoorAirFraction] = useState(0.2); // default 0.2

  // Mechanical Cooling COP
  const [mechanicalCOP, setMechanicalCOP] = useState(5.0); // default 5.0

  // Economic Parameters (CAPEX)
  const [capexPerCFM, setCapexPerCFM] = useState(2.5); // $/CFM, default 2.5
  const [fixedEconomizerCapex, setFixedEconomizerCapex] = useState(20000); // $, default 20000

  // AI & Future-Proofing
  const [workloadProfile, setWorkloadProfile] = useState<string>('standard'); // 'standard', 'inference', 'training'
  const [forecastHorizon, setForecastHorizon] = useState<number>(1); // Years 1-10
  const [utilityEscalation, setUtilityEscalation] = useState<number>(3.5); // %
  const [enableCarbonTax, setEnableCarbonTax] = useState<boolean>(false);
  const [climateOffset, setClimateOffset] = useState<number>(0.5); // +0.5 to +3.5 deg C

  const lastSentRef = useRef<string>('')
  const updateTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    fetchAllData()
  }, [])

  // Update selectedCountryId when countryId prop changes
  useEffect(() => {
    if (countryId && countryId !== selectedCountryId) {
      setSelectedCountryId(countryId)
    }
  }, [countryId])

  // Update server selection when serverId prop changes
  useEffect(() => {
    if (serverId && serverId !== localServerType) {
      setLocalServerType(serverId)
    }
  }, [serverId])

  // Handle incoming serverType prop (for backward compatibility)
  useEffect(() => {
    if (!serverType || !servers.length) return

    // Only process if we don't already have a serverId prop
    if (!serverId) {
      let match = servers.find(s => String(s.id) === String(serverType))

      if (!match) {
        match = servers.find(s => s.name === serverType)
      }

      if (!match) {
        match = servers.find(s =>
          `${s.manufacturer} - ${s.name} (${s.model || 'Standard'})` === serverType
        )
      }

      if (match) {
        setLocalServerType(match.id)
      } else {
        setLocalServerType('')
      }
    }
  }, [serverType, servers, serverId])

  // Server selection
  useEffect(() => {
    if (!localServerType) {
      setSelectedServer(null)
      return
    }

    const server = servers.find(s => String(s.id) === String(localServerType))

    if (server) {
      setSelectedServer(server)
    } else {
      setSelectedServer(null)
    }
  }, [localServerType, servers])

  const fetchAllData = async () => {
    try {
      setIsLoading(true)
      setError('')
      await Promise.all([
        fetchServers(),
        fetchCountries(),
        fetchFanParameters()
      ])
    } catch (error) {
      setError('Failed to load configuration data. Please refresh the page.')
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('manufacturer')
        .order('name')

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Failed to fetch servers: ${error.message}`)
      }

      if (data) {
        console.log('Number of rows returned from servers table:', data.length)
      }

      if (data && data.length > 0) {
        console.log(`✅ Loaded ${data.length} servers from database`)
        setServers(data)

        // If we have a serverId prop, try to select it
        if (serverId) {
          const server = data.find(s => String(s.id) === String(serverId))
          if (server) {
            setSelectedServer(server)
          }
        }
      } else {
        setError('No server configurations found in database')
      }
    } catch (error) {
      console.error('Error fetching servers:', error)
      setError('Unable to load server configurations')
    }
  }

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('tariff_carbon')
        .select('id, country_name, electricity_tariff, co2_grid_factor')
        .order('country_name')

      if (error) throw error

      if (data) {
        const normalized: CountryTariff[] = data.map(row => ({
          id: String(row.id),
          country_name: row.country_name,
          electricity_tariff: Number(row.electricity_tariff ?? 0),
          co2_grid_factor: Number(row.co2_grid_factor ?? 0),
        }))

        console.log(`✅ Loaded ${normalized.length} countries from database`)
        setCountries(normalized)

        // If we have a countryId prop, verify it exists
        if (countryId) {
          const country = normalized.find(c => String(c.id) === String(countryId))
          if (!country) {
            console.warn(`Country with ID ${countryId} not found in database`)
          }
        }
      } else {
        console.warn('⚠️ No countries found in tariff_carbon table')
      }
    } catch (error) {
      console.error('Error fetching countries:', error)
    }
  }

  const fetchFanParameters = async () => {
    try {
      const { data, error } = await supabase
        .from('parameter')
        .select('id, param_group, param_key, display_name, min_value, max_value, unit, status_label, description')
        .eq('param_group', 'fan_efficiency')
        .order('id')

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Failed to fetch fan parameters: ${error.message}`)
      }

      if (data && data.length > 0) {
        const normalized: FanParameter[] = data.map(row => ({
          id: String(row.id),
          param_group: row.param_group,
          param_key: row.param_key,
          display_name: row.display_name,
          min_value: Number(row.min_value ?? 0),
          max_value: Number(row.max_value ?? 0),
          unit: row.unit,
          status_label: row.status_label,
          description: row.description
        }))

        setFanParameters(normalized)

        normalized.forEach(param => {
          const key = (param.param_key || param.display_name || '').toLowerCase()
          const defaultValue = (param.min_value + param.max_value) / 2 || param.max_value || param.min_value

          if (key.includes('best')) {
            setBestFanEfficiency(defaultValue)
          } else if (key.includes('average') || key.includes('vfd')) {
            setAvgFanEfficiency(defaultValue)
          } else if (key.includes('legacy') || key.includes('old')) {
            setOldFanEfficiency(defaultValue)
          }
        })
      }
    } catch (error) {
      console.error('Error fetching fan parameters:', error)
    }
  }

  const selectedCountry = useMemo(() => {
    return countries.find(c => String(c.id) === selectedCountryId)
  }, [countries, selectedCountryId])

  // Handle country selection change
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountryId = e.target.value
    setSelectedCountryId(newCountryId)

    // Notify parent component of change
    if (onConfigChange && newCountryId) {
      const country = countries.find(c => String(c.id) === newCountryId)
      if (country) {
        onConfigChange({
          countryId: newCountryId,
          country: country.country_name,
          electricityTariff: country.electricity_tariff,
          carbon_intensity: country.co2_grid_factor // changed to match backend
        })
      }
    }
  }

  // Handle server selection change
  const handleServerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serverId = e.target.value

    if (!serverId) {
      setLocalServerType('')
      setSelectedServer(null)
      // Clear server fields in global state
      updateSimulationInput({
        serverMaxPowerW: undefined,
        serverIdlePowerW: undefined,
        averageUtilization: undefined,
        peakUtilization: undefined
      })
      return
    }

    setLocalServerType(serverId)
    const server = servers.find(s => String(s.id) === serverId)
    if (server) {
      // Convert all relevant fields to numbers (if not null/undefined)
      const normalizedServer = {
        ...server,
        max_power_w: server.max_power_w !== undefined && server.max_power_w !== null ? Number(server.max_power_w) : undefined,
        idle_power_w: server.idle_power_w !== undefined && server.idle_power_w !== null ? Number(server.idle_power_w) : undefined,
        avg_utilization_percent: server.avg_utilization_percent !== undefined && server.avg_utilization_percent !== null ? Number(server.avg_utilization_percent) : undefined,
        peak_utilization_percent: server.peak_utilization_percent !== undefined && server.peak_utilization_percent !== null ? Number(server.peak_utilization_percent) : undefined,
        typical_utilization: server.typical_utilization !== undefined && server.typical_utilization !== null ? Number(server.typical_utilization) : undefined
      }
      setSelectedServer(normalizedServer)

      // Log Supabase server values for simulation payload
      console.log('[Simulation Payload] Selected server values:', {
        max_power_w: normalizedServer.max_power_w,
        idle_power_w: normalizedServer.idle_power_w,
        avg_utilization_percent: normalizedServer.avg_utilization_percent,
        peak_utilization_percent: normalizedServer.peak_utilization_percent
      })

      // Update Zustand store with selected server fields
      updateSimulationInput({
        serverMaxPowerW: normalizedServer.max_power_w,
        serverIdlePowerW: normalizedServer.idle_power_w,
        averageUtilization: normalizedServer.avg_utilization_percent ?? normalizedServer.typical_utilization,
        peakUtilization: normalizedServer.peak_utilization_percent ?? undefined
      })

      // Notify parent component of change
      if (onConfigChange) {
        onConfigChange({
          serverId: serverId,
          serverType: normalizedServer.name,
          manufacturer: normalizedServer.manufacturer,
          model: normalizedServer.model,
          max_power_w: normalizedServer.max_power_w,
          idle_power_w: normalizedServer.idle_power_w,
          avg_utilization_percent: normalizedServer.avg_utilization_percent,
          peak_utilization_percent: normalizedServer.peak_utilization_percent
        })
      }
    }
  }

  // Handle location data upload
  const handleLocationDataUpload = (data: any[]) => {
    setLocalLocationData(data)
  }

  // Handle fan count changes
  const handleFanChange = useCallback((type: 'bestFans' | 'averageFans' | 'oldFans', value: number) => {
    setLocalFans(prev => {
      const updated = {
        ...prev,
        [type]: Math.max(0, Math.min(50, value))
      };
      console.log(`[DEBUG] Fan count changed:`, type, value, updated);
      return updated;
    });
  }, [])

  // Handle efficiency changes
  const handleEfficiencyChange = useCallback((type: 'best' | 'average' | 'old', value: number) => {
    const param = getFanParameter(type);
    const clampedValue = Math.max(param.min, Math.min(param.max, value));
    console.log(`[DEBUG] Fan efficiency changed:`, type, value, clampedValue);
    switch (type) {
      case 'best':
        setBestFanEfficiency(clampedValue);
        break;
      case 'average':
        setAvgFanEfficiency(clampedValue);
        break;
      case 'old':
        setOldFanEfficiency(clampedValue);
        break;
    }
  }, [fanParameters])

  // Get fan parameter ranges
  const getFanParameter = (type: 'best' | 'average' | 'old') => {
    const param = fanParameters.find(p => {
      const key = (p.param_key || p.display_name || '').toLowerCase()
      if (type === 'best') return key.includes('best')
      if (type === 'average') return key.includes('average') || key.includes('vfd')
      return key.includes('legacy') || key.includes('old')
    })

    if (param) {
      const defaultValue = (param.min_value + param.max_value) / 2 || param.max_value || param.min_value
      return {
        min: param.min_value,
        max: param.max_value,
        default: defaultValue,
        description: param.description,
        unit: param.unit
      }
    }

    // Fallback defaults
    return {
      min: type === 'best' ? 0.3 : type === 'average' ? 0.5 : 0.8,
      max: type === 'best' ? 0.4 : type === 'average' ? 0.7 : 1.2,
      default: type === 'best' ? 0.35 : type === 'average' ? 0.6 : 1.0,
      description: '',
      unit: 'W/CFM'
    }
  }

  // Memoize all calculations
  const calculations = useMemo(() => {
    if (!selectedServer || !selectedCountry) {
      return {
        numberOfServers: 0,
        totalITPowerKW: 0,
        totalFanPowerKW: 0,
        totalCoolingPowerKW: 0,
        annualCostUSD: 0,
        tariff: 0.15,
        carbonIntensity: 0,
        perServerPower: 0
      }
    }

    const numberOfServers = localNumberOfRacks * localServersPerRack
    const avgPowerPerServer = selectedServer.typical_power_w || (selectedServer.max_power_w + selectedServer.idle_power_w) / 2
    const totalITPowerKW = (numberOfServers * avgPowerPerServer * localAvgUtil) / 100 / 1000
    const estimatedCFM = numberOfServers * 20
    const totalFans = localFans.bestFans + localFans.averageFans + localFans.oldFans

    const bestFanPower = totalFans > 0 ? (localFans.bestFans / totalFans) * estimatedCFM * bestFanEfficiency : 0
    const avgFanPower = totalFans > 0 ? (localFans.averageFans / totalFans) * estimatedCFM * avgFanEfficiency : 0
    const oldFanPower = totalFans > 0 ? (localFans.oldFans / totalFans) * estimatedCFM * oldFanEfficiency : 0

    const totalFanPowerKW = (bestFanPower + avgFanPower + oldFanPower) / 1000
    const totalCoolingPowerKW = totalITPowerKW + totalFanPowerKW

    const tariff = selectedCountry?.electricity_tariff ?? 0.15
    const carbonIntensity = selectedCountry?.co2_grid_factor ?? 0
    const annualCostUSD = totalCoolingPowerKW * 8760 * tariff

    return {
      numberOfServers,
      totalITPowerKW,
      totalFanPowerKW,
      totalCoolingPowerKW,
      annualCostUSD,
      tariff,
      carbonIntensity,
      perServerPower: Math.round(avgPowerPerServer)
    }
  }, [
    selectedServer,
    selectedCountry,
    localNumberOfRacks,
    localServersPerRack,
    localAvgUtil,
    localFans,
    bestFanEfficiency,
    avgFanEfficiency,
    oldFanEfficiency
  ])

  const { numberOfServers, totalITPowerKW, totalFanPowerKW, totalCoolingPowerKW, annualCostUSD, tariff, carbonIntensity, perServerPower } = calculations

  // Debounced config update
  useEffect(() => {
    if (!onConfigChange || !selectedServer || !selectedCountry) return

    // Ensure all server fields use backend-expected names
    const payload = {
      numberOfServers,
      serverType: localServerType,
      serverId: localServerType,
      serverName: selectedServer.name,
      manufacturer: selectedServer.manufacturer,
      model: selectedServer.model,
      numberOfRacks: localNumberOfRacks,
      serversPerRack: localServersPerRack,
      serverMaxPowerW: selectedServer.max_power_w !== undefined && selectedServer.max_power_w !== null ? Number(selectedServer.max_power_w) : undefined,
      serverIdlePowerW: selectedServer.idle_power_w !== undefined && selectedServer.idle_power_w !== null ? Number(selectedServer.idle_power_w) : undefined,
      averageUtilization: Number(localAvgUtil),
      peakUtilization: Number(localPeakUtil),
      fans: {
        bestQuantity: localFans.bestFans,
        bestEfficiency: bestFanEfficiency,
        averageQuantity: localFans.averageFans,
        averageEfficiency: avgFanEfficiency,
        legacyQuantity: localFans.oldFans,
        legacyEfficiency: oldFanEfficiency
      },
      country: selectedCountry?.country_name || '',
      countryId: selectedCountry?.id || '',
      regionName: '',
      electricityTariff: selectedCountry?.electricity_tariff || 0.15,
      carbonIntensity: selectedCountry?.co2_grid_factor || 0,
      currency: '',
      itPowerKW: totalITPowerKW,
      fanPowerKW: totalFanPowerKW,
      totalCoolingPowerKW,
      annualCostUSD,
      fanEfficiency: {
        best: bestFanEfficiency,
        average: avgFanEfficiency,
        old: oldFanEfficiency
      },
      locationData: localLocationData,
      timestamp: new Date().toISOString(),
      // New fields
      supplyAirTemp,
      returnAirTemp,
      airflowCFM,
      deltaT,
      // Advanced Economizer Controls
      economizerMaxOutdoorTemp,
      economizerMaxHumidity,
      minOutdoorAirFraction,
      // Mechanical Cooling COP
      mechanicalCOP,
      // Economic Parameters (CAPEX)
      capexPerCFM,
      fixedEconomizerCapex,
      // AI & Future Proofing Parameters
      computeIntensityFactor: workloadProfile === 'training' ? 8.0 : (workloadProfile === 'inference' ? 2.5 : 1.0),
      forecastYears: forecastHorizon,
      energyEscalationRate: utilityEscalation / 100.0,
      carbonTaxProjected: enableCarbonTax ? 126.0 : 0.0,
      climateChangeOffsetC: climateOffset
    }

    try {
      const serialized = JSON.stringify(payload)
      if (lastSentRef.current !== serialized) {
        lastSentRef.current = serialized
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current)
        }
        // Log the payload that will be sent when Continue is clicked
        console.log('[AirSideEconomization] Prepared payload for sending:', payload)
        updateTimeoutRef.current = setTimeout(() => {
          onConfigChange(payload)
        }, 150)
      }
    } catch (e) {
      console.error('Error serializing config:', e)
      setTimeout(() => {
        onConfigChange(payload)
      }, 150)
    }
  }, [
    onConfigChange,
    selectedServer,
    selectedCountry,
    localServerType,
    localNumberOfRacks,
    localServersPerRack,
    localAvgUtil,
    localPeakUtil,
    localFans,
    bestFanEfficiency,
    avgFanEfficiency,
    oldFanEfficiency,
    numberOfServers,
    totalITPowerKW,
    totalFanPowerKW,
    totalCoolingPowerKW,
    annualCostUSD,
    localLocationData,
    supplyAirTemp,
    returnAirTemp,
    airflowCFM,
    deltaT,
    workloadProfile,
    forecastHorizon,
    utilityEscalation,
    enableCarbonTax,
    climateOffset
  ])

  // Initialize location data from props
  useEffect(() => {
    if (locationData && locationData.length > 0) {
      setLocalLocationData(locationData)
    }
  }, [locationData])

  // Render new physical fields UI
  const renderPhysicalFields = () => (
    <div className="mt-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Physical Parameters</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Supply Air Temp (°C)</label>
          <input type="number" min={5} max={30} step={0.1} value={supplyAirTemp} onChange={e => setSupplyAirTemp(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Return Air Temp (°C)</label>
          <input type="number" min={10} max={50} step={0.1} value={returnAirTemp} onChange={e => setReturnAirTemp(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Airflow (CFM)</label>
          <input type="number" min={100} max={100000} step={10} value={airflowCFM} onChange={e => setAirflowCFM(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">ΔT (Return - Supply, °C)</label>
          <input type="number" min={1} max={40} step={0.1} value={deltaT} onChange={e => setDeltaT(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
        </div>
      </div>
    </div>
  );

  // Server details section
  const renderServerDetails = () => {
    if (!selectedServer) {
      return (
        <div className="mt-6 p-6 bg-yellow-50 rounded-xl border border-yellow-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-700">Please select a server type to view details</p>
          </div>
        </div>
      )
    }

    return (
      <>
        <div key={selectedServer.id} className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {selectedServer.name}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedServer.manufacturer} • {selectedServer.model || 'Standard Model'}
                {selectedServer.release_year && ` • Released: ${selectedServer.release_year}`}
              </p>
            </div>
            {selectedServer.efficiency_rating && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                {selectedServer.efficiency_rating} Efficiency
              </span>
            )}
          </div>

          {/* Power Specifications */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Power Specifications</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-gray-600">Max Power</span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {selectedServer.max_power_w.toLocaleString()} W
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">Idle Power</span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {selectedServer.idle_power_w.toLocaleString()} W
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-gray-600">Typical Power</span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {selectedServer.typical_power_w?.toLocaleString() || Math.round((selectedServer.max_power_w + selectedServer.idle_power_w) / 2).toLocaleString()} W
                </div>
              </div>
            </div>
          </div>

          {/* Hardware Specifications */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Hardware Specifications</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <ServerIcon className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-medium text-gray-600">Form Factor</span>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedServer.form_factor}
                </div>
              </div>

              {selectedServer.cpu_type && (
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">CPU</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {selectedServer.cpu_type}
                  </div>
                </div>
              )}

              {selectedServer.memory_gb > 0 && (
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <MemoryStick className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">Memory</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {selectedServer.memory_gb} GB
                  </div>
                </div>
              )}

              {selectedServer.storage_tb > 0 && (
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">Storage</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {selectedServer.storage_tb} TB
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cooling Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Cooling Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Wind className="w-4 h-4 text-cyan-500" />
                  <span className="text-xs font-medium text-gray-600">Cooling Type</span>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedServer.cooling_type}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-gray-600">Typical Utilization</span>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedServer.typical_utilization || 45}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {renderPhysicalFields()}
      </>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="bg-gray-100 rounded-2xl p-6">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-300 rounded"></div>
            <div className="h-40 bg-gray-300 rounded"></div>
          </div>
        </div>

        <div className="bg-gray-100 rounded-2xl p-6">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <div className="space-y-2">
            <div className="text-red-600 font-medium">Error loading data</div>
            <div className="text-sm text-gray-600">{error}</div>
            <button
              onClick={fetchAllData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry Loading Data
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fanSpinFast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fanSpinMedium {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fanWobble {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          50% { transform: rotate(8deg); }
          75% { transform: rotate(-6deg); }
          100% { transform: rotate(0deg); }
        }
        .fan-shell {
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);
        }
        .fan-shell-best {
          background: radial-gradient(circle at 30% 30%, #bbf7d0, #22c55e);
        }
        .fan-shell-average {
          background: radial-gradient(circle at 30% 30%, #fef9c3, #facc15);
        }
        .fan-shell-legacy {
          background: radial-gradient(circle at 30% 30%, #fecaca, #ef4444);
        }
        .fan-rotor {
          width: 70%;
          height: 70%;
          border-radius: 9999px;
          position: relative;
          background: radial-gradient(circle at 30% 30%, rgba(248, 250, 252, 0.95), rgba(148, 163, 184, 0.9));
        }
        .fan-rotor-best {
          animation: fanSpinFast 1.1s linear infinite;
        }
        .fan-rotor-average {
          animation: fanSpinMedium 2.1s linear infinite;
        }
        .fan-rotor-legacy {
          animation: fanWobble 1.2s ease-in-out infinite;
        }
        .fan-blade {
          position: absolute;
          width: 80%;
          height: 20%;
          background-color: rgba(15, 23, 42, 0.08);
          border-radius: 9999px;
          left: 50%;
          top: 50%;
          transform-origin: 50% 50%;
          transform: translate(-50%, -50%);
        }
        .fan-blade-1 {
          transform: translate(-50%, -50%) rotate(0deg);
        }
        .fan-blade-2 {
          transform: translate(-50%, -50%) rotate(120deg);
        }
        .fan-blade-3 {
          transform: translate(-50%, -50%) rotate(240deg);
        }
        .fan-hub {
          position: absolute;
          width: 22%;
          height: 22%;
          border-radius: 9999px;
          background-color: rgba(15, 23, 42, 0.75);
          box-shadow: 0 0 0 2px rgba(248, 250, 252, 0.6);
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }
      `}</style>

      {/* Server Configuration Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <ServerIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900">Server Configuration</h4>
            <p className="text-sm text-gray-500">
              Select server hardware from {servers.length} available configurations
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Server Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Server Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={localServerType}
                onChange={handleServerChange}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 bg-white text-gray-900 font-medium appearance-none"
                required
              >
                <option value="">Select a server type...</option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.manufacturer} - {server.name} ({server.model || 'Standard'})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Select from {servers.length} available server configurations
            </p>
          </div>

          {/* Server Details Display */}
          {renderServerDetails()}

          {/* Rack and Server Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Number of Racks <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  value={localNumberOfRacks}
                  onChange={(e) => setLocalNumberOfRacks(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="w-20">
                  <input
                    type="number"
                    value={localNumberOfRacks}
                    onChange={(e) => setLocalNumberOfRacks(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Range: 1-100 racks</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Servers per Rack <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  value={localServersPerRack}
                  onChange={(e) => setLocalServersPerRack(Number(e.target.value))}
                  min={1}
                  max={50}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="w-20">
                  <input
                    type="number"
                    value={localServersPerRack}
                    onChange={(e) => setLocalServersPerRack(Number(e.target.value))}
                    min={1}
                    max={50}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Range: 1-50 servers per rack</p>
            </div>
          </div>

          {/* Quick Summary */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                  Total Servers
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {numberOfServers.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                  Total Power
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {totalITPowerKW.toFixed(1)} kW
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                  Per Server Power
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {perServerPower.toLocaleString()} W
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                  Utilization
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {localAvgUtil}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Utilization & Fans Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Wind className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900">Utilization & Cooling</h4>
            <p className="text-sm text-gray-500">Set operational parameters and fan efficiency</p>
          </div>
        </div>

        {/* Utilization sliders */}
        <div className="space-y-6 mb-8">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-900">Average Server Utilization</label>
              <span className="text-xl font-bold text-green-600">{localAvgUtil}%</span>
            </div>
            <input
              type="range"
              value={localAvgUtil}
              onChange={(e) => setLocalAvgUtil(Number(e.target.value))}
              min={0}
              max={100}
              className="w-full h-2 bg-gradient-to-r from-green-200 to-green-500 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-900">Peak Server Utilization</label>
              <span className="text-xl font-bold text-red-600">{localPeakUtil}%</span>
            </div>
            <input
              type="range"
              value={localPeakUtil}
              onChange={(e) => setLocalPeakUtil(Number(e.target.value))}
              min={0}
              max={100}
              className="w-full h-2 bg-gradient-to-r from-orange-200 to-red-500 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Fan Configuration */}
        <div>
          <h5 className="font-semibold text-gray-900 text-sm mb-4">Fan Configuration</h5>
          <div className="space-y-4">
            {[
              {
                label: 'Best-in-class Fans',
                type: 'best' as const,
                efficiency: bestFanEfficiency,
                setEfficiency: (v: number) => handleEfficiencyChange('best', v),
                count: localFans.bestFans,
                setCount: (v: number) => handleFanChange('bestFans', v),
                bg: 'bg-green-50',
                shellClass: 'fan-shell fan-shell-best',
                rotorClass: 'fan-rotor fan-rotor-best'
              },
              {
                label: 'Average VFD Fans',
                type: 'average' as const,
                efficiency: avgFanEfficiency,
                setEfficiency: (v: number) => handleEfficiencyChange('average', v),
                count: localFans.averageFans,
                setCount: (v: number) => handleFanChange('averageFans', v),
                bg: 'bg-yellow-50',
                shellClass: 'fan-shell fan-shell-average',
                rotorClass: 'fan-rotor fan-rotor-average'
              },
              {
                label: 'Legacy Fans',
                type: 'old' as const,
                efficiency: oldFanEfficiency,
                setEfficiency: (v: number) => handleEfficiencyChange('old', v),
                count: localFans.oldFans,
                setCount: (v: number) => handleFanChange('oldFans', v),
                bg: 'bg-red-50',
                shellClass: 'fan-shell fan-shell-legacy',
                rotorClass: 'fan-rotor fan-rotor-legacy'
              },
            ].map((fan, idx) => {
              const param = getFanParameter(fan.type)

              return (
                <div key={idx} className={`border rounded-lg p-4 ${fan.bg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={fan.shellClass}>
                        <div className={fan.rotorClass}>
                          <span className="fan-blade fan-blade-1" />
                          <span className="fan-blade fan-blade-2" />
                          <span className="fan-blade fan-blade-3" />
                          <span className="fan-hub" />
                        </div>
                      </div>
                      <div className="font-medium text-gray-900">{fan.label}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {fan.count} {fan.count === 1 ? 'fan' : 'fans'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2">Efficiency ({param.unit})</label>
                      <input
                        type="number"
                        value={fan.efficiency}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v >= param.min && v <= param.max) fan.setEfficiency(v);
                        }}
                        min={param.min}
                        max={param.max}
                        step={0.01}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Range: {param.min.toFixed(2)} - {param.max.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2">Quantity</label>
                      <input
                        type="number"
                        value={fan.count}
                        onChange={(e) => fan.setCount(Number(e.target.value))}
                        min={0}
                        max={50}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Workload Intensity & AI Scaling */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900">Workload Intensity & AI Scaling</h4>
            <p className="text-sm text-gray-500">Simulate GPU-heavy AI clusters and density</p>
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Workload Profile Type
            </label>
            <select
              value={workloadProfile}
              onChange={(e) => setWorkloadProfile(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-purple-500 bg-white text-gray-900 font-medium"
            >
              <option value="standard">Standard IT (Current) - 1.0x</option>
              <option value="inference">AI Inference (2027) - 2.5x-3.0x</option>
              <option value="training">AI Training (2030) - 8.0x-10.0x</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              adjusts the backend power multipliers for AI density simulation.
            </p>
          </div>
        </div>
      </div>

      {/* Lifecycle & Cost Projection */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900">Lifecycle & Cost Projection</h4>
            <p className="text-sm text-gray-500">Predictive Multi-Year TCO Modeling</p>
          </div>
        </div>
        <div className="space-y-6">
          {/* Forecast Horizon */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-900">Forecast Horizon (Years)</label>
              <span className="text-xl font-bold text-green-600">{forecastHorizon} Years</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={forecastHorizon}
              onChange={e => setForecastHorizon(Number(e.target.value))}
              className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 Year</span>
              <span>10 Years</span>
            </div>
          </div>

          {/* Annual Utility Escalation */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Annual Utility Escalation (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={utilityEscalation}
                onChange={e => setUtilityEscalation(Number(e.target.value))}
                className="flex-1 h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={utilityEscalation}
                onChange={e => setUtilityEscalation(Number(e.target.value))}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Projected rise in grid fees and electricity volatility (Avg 3.5%).</p>
          </div>

          {/* Carbon Tax */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <div className="font-semibold text-gray-900">Enable 2030 Carbon Tax</div>
              <div className="text-sm text-gray-500">Apply projected €126/ton CO₂ tax</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableCarbonTax}
                onChange={(e) => setEnableCarbonTax(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Environmental Future-Proofing */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <ThermometerSun className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900">Environmental Future-Proofing</h4>
            <p className="text-sm text-gray-500">Climate Change Impact Simulation</p>
          </div>
        </div>
        <div className="space-y-6">
          {/* Climate Offset */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-900">Climate Change Temperature Offset (°C)</label>
              <span className="text-xl font-bold text-orange-600">+{climateOffset}°C</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3.5}
              step={0.1}
              value={climateOffset}
              onChange={e => setClimateOffset(Number(e.target.value))}
              className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>+0.5°C</span>
              <span>+3.5°C</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Simulates reduced free cooling hours due to global warming.
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Economizer Controls (Optional) */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
            <Wind className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900">Advanced Economizer Controls <span className='text-xs text-gray-500'>(Optional)</span></h4>
            <p className="text-sm text-gray-500">Fine-tune economizer operation for engineering analysis</p>
          </div>
        </div>
        <div className="space-y-6">
          {/* A) Economizer Max Outdoor Temperature (°C) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Economizer Enable Temperature (°C)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={10}
                max={30}
                step={0.5}
                value={economizerMaxOutdoorTemp}
                onChange={e => setEconomizerMaxOutdoorTemp(Number(e.target.value))}
                className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                min={10}
                max={30}
                step={0.5}
                value={economizerMaxOutdoorTemp}
                onChange={e => setEconomizerMaxOutdoorTemp(Number(e.target.value))}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Outdoor air cooling is disabled above this temperature to avoid excessive heat load. (Range: 10–30°C, default 24°C)</p>
          </div>
          {/* B) Economizer Max Outdoor Humidity (%) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Maximum Outdoor Humidity (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={40}
                max={80}
                step={5}
                value={economizerMaxHumidity}
                onChange={e => setEconomizerMaxHumidity(Number(e.target.value))}
                className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                min={40}
                max={80}
                step={5}
                value={economizerMaxHumidity}
                onChange={e => setEconomizerMaxHumidity(Number(e.target.value))}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Economizer operation is restricted when outdoor humidity exceeds this value. (Range: 40–80%, default 60%)</p>
          </div>
          {/* C) Minimum Outdoor Air Fraction */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Minimum Outdoor Air Fraction
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0.1}
                max={0.5}
                step={0.05}
                value={minOutdoorAirFraction}
                onChange={e => setMinOutdoorAirFraction(Number(e.target.value))}
                className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                min={0.1}
                max={0.5}
                step={0.05}
                value={minOutdoorAirFraction}
                onChange={e => setMinOutdoorAirFraction(Number(e.target.value))}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Controls how much outside air is introduced during partial economizer operation. (Range: 0.1–0.5, default 0.2)</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900">Country Tariff</h4>
            <p className="text-sm text-gray-500">Select your country for electricity pricing</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCountryId}
              onChange={handleCountryChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 bg-white text-gray-900 font-medium"
              required
            >
              <option value="">Select a country...</option>
              {countries.map(country => (
                <option key={country.id} value={String(country.id)}>
                  {country.country_name}
                </option>
              ))}
            </select>
          </div>

          {selectedCountry && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
                  Electricity Tariff
                </div>
                <div className="text-2xl font-bold text-amber-900">
                  ${selectedCountry.electricity_tariff.toFixed(3)}
                </div>
                <div className="text-xs text-amber-600">/ kWh</div>
              </div>

              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
                  Carbon Intensity
                </div>
                <div className="text-2xl font-bold text-green-800">
                  {selectedCountry.co2_grid_factor.toFixed(3)}
                </div>
                <div className="text-xs text-green-600">KgCO₂ / kWh</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Location Data Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900">Location Weather Data</h4>
            <p className="text-sm text-gray-500">Upload historical weather data for precise cooling analysis</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl text-center bg-gray-50">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              Drag & drop a CSV file here, or click to browse
            </p>
            <p className="text-xs text-gray-500">
              CSV should contain timestamp, temperature, and humidity columns
            </p>
            <button
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.csv'
                input.onchange = (e: any) => {
                  const file = e.target.files[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (e) => {
                      try {
                        const text = e.target?.result as string
                        const lines = text.trim().split('\n')
                        if (lines.length < 2) return

                        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
                        // Accept id as timestamp, dry_bulb as temperature, relative_humidity as humidity
                        const timestampIdx = headers.findIndex(h => h === 'timestamp' || h === 'id' || h.includes('time') || h.includes('date'))
                        const temperatureIdx = headers.findIndex(h => h === 'temperature' || h === 'dry_bulb' || h.includes('temp'))
                        const humidityIdx = headers.findIndex(h => h === 'humidity' || h === 'relative_humidity' || h.includes('hum') || h.includes('rh'))

                        if (timestampIdx === -1 || temperatureIdx === -1 || humidityIdx === -1) {
                          alert('CSV must contain a timestamp (or id), temperature (or dry_bulb), and humidity (or relative_humidity) column')
                          return
                        }

                        const data = lines.slice(1).map(line => {
                          const values = line.split(',').map(v => v.trim())
                          return {
                            timestamp: values[timestampIdx],
                            temperature: parseFloat(values[temperatureIdx]),
                            humidity: parseFloat(values[humidityIdx])
                          }
                        }).filter(entry => entry.timestamp && entry.temperature !== undefined && entry.humidity !== undefined)

                        handleLocationDataUpload(data)
                      } catch (err) {
                        console.error('Error parsing CSV:', err)
                        alert('Error parsing CSV file')
                      }
                    }
                    reader.readAsText(file)
                  }
                }
                input.click()
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Files
            </button>
          </div>

          {localLocationData.length > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    {localLocationData.length} data points loaded
                  </p>
                  <p className="text-xs text-green-600">
                    Historical weather data ready for analysis
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-300">
          <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900">Annual Power & Cost Summary</h4>
            <p className="text-sm text-blue-600">Based on current configuration</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
              IT Power Consumption
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalITPowerKW.toFixed(1)} kW
            </div>
            <div className="text-xs text-gray-500">Total server power</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
              Cooling Power
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalFanPowerKW.toFixed(1)} kW
            </div>
            <div className="text-xs text-gray-500">Fan power consumption</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
              Total Cooling Power
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalCoolingPowerKW.toFixed(1)} kW
            </div>
            <div className="text-xs text-gray-500">IT + Cooling power</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
              Annual Cost
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${(annualCostUSD / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-gray-500">
              Based on {tariff.toFixed(3)}/kWh
            </div>
          </div>
        </div>

        {selectedServer && (
          <div className="p-4 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              Currently configured: {selectedServer.manufacturer} {selectedServer.name} •
              {selectedServer.max_power_w.toLocaleString()}W max power •
              {selectedServer.cooling_type} cooling
            </p>
          </div>
        )}

        {selectedCountry && (
          <div className="p-4 bg-gray-100 rounded-lg mt-4">
            <p className="text-sm text-gray-800">
              Based on {selectedCountry.country_name} •
              ${selectedCountry.electricity_tariff.toFixed(3)}/kWh •
              {Math.round(selectedCountry.co2_grid_factor)} gCO₂/kWh
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-end mt-8">
        <button
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
            onClick={async () => {
              // Always use the latest state for fan values
              const latestBestFans = localFans.bestFans;
              const latestAverageFans = localFans.averageFans;
              const latestOldFans = localFans.oldFans;
              const latestBestFanEfficiency = bestFanEfficiency;
              const latestAvgFanEfficiency = avgFanEfficiency;
              const latestOldFanEfficiency = oldFanEfficiency;
              const latestTotalFans = latestBestFans + latestAverageFans + latestOldFans;
              let weightedEfficiency = 0;
              if (latestTotalFans > 0) {
                weightedEfficiency = (
                  (latestBestFans * latestBestFanEfficiency) +
                  (latestAverageFans * latestAvgFanEfficiency) +
                  (latestOldFans * latestOldFanEfficiency)
                ) / latestTotalFans;
              }

              // Debug: Log fan state before payload construction
              console.log('[DEBUG] Fan state before payload (latest):', {
                bestFans: latestBestFans,
                bestFanEfficiency: latestBestFanEfficiency,
                averageFans: latestAverageFans,
                avgFanEfficiency: latestAvgFanEfficiency,
                oldFans: latestOldFans,
                oldFanEfficiency: latestOldFanEfficiency
              });

              const serverFanPowerPercent = weightedEfficiency;
              const fans = {
                bestQuantity: Number(latestBestFans) || 0,
                bestEfficiency: Number(latestBestFanEfficiency) || 0,
                averageQuantity: Number(latestAverageFans) || 0,
                averageEfficiency: Number(latestAvgFanEfficiency) || 0,
                legacyQuantity: Number(latestOldFans) || 0,
                legacyEfficiency: Number(latestOldFanEfficiency) || 0
              };
              console.log('[DEBUG] Fans object for payload (latest):', fans);

              const payload = {
                // Server & rack config
                numberOfRacks: localNumberOfRacks,
                serversPerRack: localServersPerRack,
                serverMaxPowerW: selectedServer?.max_power_w,
                serverIdlePowerW: selectedServer?.idle_power_w,
                serverTypicalPowerW: selectedServer?.typical_power_w,
                serverType: localServerType,
                serverName: selectedServer?.name,
                manufacturer: selectedServer?.manufacturer,
                model: selectedServer?.model,
                formFactor: selectedServer?.form_factor,
                coolingType: selectedServer?.cooling_type,
                cpuType: selectedServer?.cpu_type,
                memoryGB: selectedServer?.memory_gb,
                storageTB: selectedServer?.storage_tb,
                releaseYear: selectedServer?.release_year,
                efficiencyRating: selectedServer?.efficiency_rating,
                averageUtilization: localAvgUtil,
                peakUtilization: localPeakUtil,
                // Fan fields for backend
                ...fans, // <-- flatten fans fields here
                serverFanPowerPercent,
                variableFanSpeed,
                minFanSpeed,
                // Country & tariff
                country: selectedCountry?.country_name,
                countryId: selectedCountry?.id,
                electricityTariff: selectedCountry?.electricity_tariff,
                carbonIntensity: selectedCountry?.co2_grid_factor,
                // Weather data
                weatherData: localLocationData,
                // Physical fields
                supplyAirTemp,
                returnAirTemp,
                airflowCFM,
                deltaT,
                // Advanced Economizer Controls
                economizerMaxOutdoorTemp,
                economizerMaxHumidity,
                minOutdoorAirFraction,
                // Mechanical Cooling COP
                mechanicalCOP,
                // Economic Parameters (CAPEX)
                capexPerCFM,
                fixedEconomizerCapex,
                // AI & Future-Proofing
                computeIntensityFactor: workloadProfile === 'training' ? 8.0 : (workloadProfile === 'inference' ? 2.5 : 1.0),
                forecastYears: forecastHorizon,
                energyEscalationRate: utilityEscalation / 100.0,
                carbonTaxProjected: enableCarbonTax ? 126.0 : 0.0,
                climateChangeOffsetC: climateOffset,
                // Timestamp for traceability
                timestamp: new Date().toISOString()
              };

              try {
                console.log('[DEBUG] Final payload before API call:', payload);
                // Extra: log fan values from payload
                console.log('[DEBUG] Fan values in payload:', {
                  bestQuantity: payload.bestQuantity,
                  bestEfficiency: payload.bestEfficiency,
                  averageQuantity: payload.averageQuantity,
                  averageEfficiency: payload.averageEfficiency,
                  legacyQuantity: payload.legacyQuantity,
                  legacyEfficiency: payload.legacyEfficiency
                });
                console.log('[RunSimulation] Triggering AI-Enhanced Simulation API with payload:', payload);
                const response = await fetch('http://localhost:8080/api/simulation/run', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                console.log('[RunSimulation] Response status:', response.status);
                if (!response.ok) throw new Error('Simulation API error');
                const results = await response.json();
                console.log('[RunSimulation] Results from API:', results);
                // Store results in localStorage for reload persistence
                localStorage.setItem('lastSimulationResults', JSON.stringify(results));
                console.log('[RunSimulation] Saved results to localStorage. Navigating to /raw-results');
                navigate('/raw-results', { state: results });
              } catch (err) {
                console.error('[RunSimulation] Error:', err);
                alert('Failed to run simulation: ' + err.message);
              }
            }}
        >
          Run Simulation
        </button>
      </div>
    </div>
  )
}

export default AirSideEconomization;
