import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  Zap,
  Droplet,
  Thermometer,
  Building,
  AlertTriangle,
  CheckCircle,
  Info,
  Calculator,
  Gauge,
  Droplets,
  Wind,
  Server,
} from "lucide-react";

// Rack Power Capacity options with warnings
const RACK_POWER_OPTIONS: Array<{
  value: number | "custom";
  label: string;
  description: string;
  status: string;
}> = [
  {
    value: 5,
    label: "5 kW",
    description: "Legacy / Low Density",
    status: "normal",
  },
  { value: 8, label: "8 kW", description: "Standard Legacy", status: "normal" },
  {
    value: 10,
    label: "10 kW",
    description: "Standard Enterprise",
    status: "normal",
  },
  {
    value: 15,
    label: "15 kW",
    description: "High-Density Air",
    status: "warning",
  },
  {
    value: 20,
    label: "20 kW",
    description: "High-Density Advanced",
    status: "warning",
  },
  {
    value: 25,
    label: "25 kW",
    description: "Upper Air Limit",
    status: "strong-warning",
  },
  {
    value: 30,
    label: "30 kW",
    description: "Maximum Air Cooling",
    status: "strong-warning",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Enter custom value",
    status: "custom",
  },
];

interface ChilledWaterCoolingProps {
  isDark?: boolean;
  isTransitioning?: boolean;
  numberOfRacks?: number;
  serversPerRack?: number;
  rackPowerCapacity?: number | "custom";
  chilledWaterTemp?: number;
  supplyWaterTemp?: number;
  returnWaterTemp?: number;
  waterFlowRate?: number;
  chillerEfficiency?: number;
  pumpEfficiency?: number;
  coolingTowerEfficiency?: number;
  onConfigChange?: (config: any) => void;
  locationData?: Array<{
    timestamp: string;
    temperature: number;
    humidity: number;
  }>;
}

const ChilledWaterCooling: React.FC<ChilledWaterCoolingProps> = ({
  isDark = false,
  isTransitioning = false,
  numberOfRacks = 5,
  serversPerRack = 10,
  rackPowerCapacity = 10,
  chilledWaterTemp = 7,
  supplyWaterTemp = 12,
  returnWaterTemp = 18,
  waterFlowRate = 50,
  chillerEfficiency = 0.6,
  pumpEfficiency = 0.8,
  coolingTowerEfficiency = 0.7,
  onConfigChange,
  locationData = [],
}) => {
  const [localNumberOfRacks, setLocalNumberOfRacks] = useState(numberOfRacks);
  const [localServersPerRack, setLocalServersPerRack] =
    useState(serversPerRack);
  const [localRackPowerCapacity, setLocalRackPowerCapacity] = useState<
    number | "custom"
  >(rackPowerCapacity);
  const [customRackPower, setCustomRackPower] = useState("");
  const [localChilledWaterTemp, setLocalChilledWaterTemp] =
    useState(chilledWaterTemp);
  const [localSupplyWaterTemp, setLocalSupplyWaterTemp] =
    useState(supplyWaterTemp);
  const [localReturnWaterTemp, setLocalReturnWaterTemp] =
    useState(returnWaterTemp);
  const [localWaterFlowRate, setLocalWaterFlowRate] = useState(waterFlowRate);
  const [localChillerEfficiency, setLocalChillerEfficiency] =
    useState(chillerEfficiency);
  const [localPumpEfficiency, setLocalPumpEfficiency] =
    useState(pumpEfficiency);
  const [localCoolingTowerEfficiency, setLocalCoolingTowerEfficiency] =
    useState(coolingTowerEfficiency);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const lastSentRef = useRef<string>("");
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate power and efficiency metrics
  const calculations = useMemo(() => {
    const totalServers = localNumberOfRacks * localServersPerRack;
    const actualRackPower =
      localRackPowerCapacity === "custom"
        ? parseFloat(customRackPower) || 10
        : localRackPowerCapacity;

    const totalITPowerKW = localNumberOfRacks * actualRackPower * 0.85; // Assuming 85% utilization

    // Cooling calculations
    const deltaT = localReturnWaterTemp - localSupplyWaterTemp;
    const coolingCapacityKW =
      (localWaterFlowRate * 1000 * 4.186 * deltaT) / 3600; // L/s * 1000 g/L * 4.186 J/g°C / 3600 s/h

    // Energy calculations
    const chillerPowerKW = coolingCapacityKW / localChillerEfficiency;
    const pumpPowerKW = (localWaterFlowRate * 10) / localPumpEfficiency; // Simplified pump power
    const coolingTowerPowerKW =
      chillerPowerKW * (1 - localCoolingTowerEfficiency) * 0.3;

    const totalCoolingPowerKW =
      chillerPowerKW + pumpPowerKW + coolingTowerPowerKW;
    const totalPowerKW = totalITPowerKW + totalCoolingPowerKW;

    // Efficiency metrics
    const pue = totalPowerKW / totalITPowerKW;
    const wue = (totalCoolingPowerKW * 0.001) / totalITPowerKW; // m³/kWh

    // Location-based adjustments
    let locationAdjustment = 1.0;
    if (locationData.length > 0) {
      const avgTemp =
        locationData.reduce((sum, d) => sum + d.temperature, 0) /
        locationData.length;
      // Higher temps reduce chiller efficiency
      locationAdjustment = 1 - (avgTemp - 15) * 0.01; // 1% reduction per °C above 15°C
    }

    const adjustedCoolingPowerKW = totalCoolingPowerKW * locationAdjustment;
    const adjustedTotalPowerKW = totalITPowerKW + adjustedCoolingPowerKW;

    return {
      totalServers,
      actualRackPower,
      totalITPowerKW,
      coolingCapacityKW,
      chillerPowerKW,
      pumpPowerKW,
      coolingTowerPowerKW,
      totalCoolingPowerKW,
      adjustedCoolingPowerKW,
      totalPowerKW,
      adjustedTotalPowerKW,
      pue,
      wue,
      deltaT,
      locationAdjustment,
    };
  }, [
    localNumberOfRacks,
    localServersPerRack,
    localRackPowerCapacity,
    customRackPower,
    localChilledWaterTemp,
    localSupplyWaterTemp,
    localReturnWaterTemp,
    localWaterFlowRate,
    localChillerEfficiency,
    localPumpEfficiency,
    localCoolingTowerEfficiency,
    locationData,
  ]);

  const {
    totalServers,
    actualRackPower,
    totalITPowerKW,
    coolingCapacityKW,
    chillerPowerKW,
    pumpPowerKW,
    coolingTowerPowerKW,
    totalCoolingPowerKW,
    adjustedCoolingPowerKW,
    totalPowerKW,
    adjustedTotalPowerKW,
    pue,
    wue,
    deltaT,
    locationAdjustment,
  } = calculations;

  // Get rack power warning status
  const getRackPowerStatus = () => {
    const power = actualRackPower;
    if (power < 10)
      return { type: "normal", message: "Standard enterprise density" };
    if (power < 15)
      return { type: "normal", message: "Standard chilled-water range" };
    if (power < 25)
      return {
        type: "warning",
        message: "High density - ensure proper cooling design",
      };
    if (power <= 30)
      return {
        type: "strong-warning",
        message: "Upper limit - consult with cooling specialist",
      };
    return {
      type: "danger",
      message: "Above recommended limit - requires special cooling solutions",
    };
  };

  // Handle rack power capacity change
  const handleRackPowerChange = (value: number | "custom") => {
    setLocalRackPowerCapacity(value);
    if (value !== "custom") {
      setShowCustomInput(false);
    } else {
      setShowCustomInput(true);
    }
  };

  // Debounced config update
  const updateConfig = useCallback(() => {
    if (!onConfigChange) return;

    const rackPowerStatus = getRackPowerStatus();
    const payload = {
      numberOfRacks: localNumberOfRacks,
      serversPerRack: localServersPerRack,
      rackPowerCapacity: actualRackPower,
      rackPowerStatus,
      chilledWaterTemp: localChilledWaterTemp,
      supplyWaterTemp: localSupplyWaterTemp,
      returnWaterTemp: localReturnWaterTemp,
      waterFlowRate: localWaterFlowRate,
      chillerEfficiency: localChillerEfficiency,
      pumpEfficiency: localPumpEfficiency,
      coolingTowerEfficiency: localCoolingTowerEfficiency,
      totalServers,
      totalITPowerKW,
      coolingCapacityKW,
      chillerPowerKW,
      pumpPowerKW,
      coolingTowerPowerKW,
      totalCoolingPowerKW,
      adjustedCoolingPowerKW,
      totalPowerKW,
      adjustedTotalPowerKW,
      pue,
      wue,
      deltaT,
      locationDataCount: locationData.length,
      locationAdjustment,
    };

    try {
      const serialized = JSON.stringify(payload);
      if (lastSentRef.current !== serialized) {
        lastSentRef.current = serialized;
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        updateTimeoutRef.current = setTimeout(() => {
          onConfigChange(payload);
        }, 100);
      }
    } catch (e) {
      setTimeout(() => {
        onConfigChange(payload);
      }, 100);
    }
  }, [
    onConfigChange,
    localNumberOfRacks,
    localServersPerRack,
    actualRackPower,
    localChilledWaterTemp,
    localSupplyWaterTemp,
    localReturnWaterTemp,
    localWaterFlowRate,
    localChillerEfficiency,
    localPumpEfficiency,
    localCoolingTowerEfficiency,
    totalServers,
    totalITPowerKW,
    coolingCapacityKW,
    chillerPowerKW,
    pumpPowerKW,
    coolingTowerPowerKW,
    totalCoolingPowerKW,
    adjustedCoolingPowerKW,
    totalPowerKW,
    adjustedTotalPowerKW,
    pue,
    wue,
    deltaT,
    locationData,
    locationAdjustment,
  ]);

  // Update config when dependencies change
  useEffect(() => {
    updateConfig();
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [updateConfig]);

  // Initialize custom rack power if needed
  useEffect(() => {
    if (localRackPowerCapacity === "custom" && !customRackPower) {
      setCustomRackPower("10");
    }
  }, [localRackPowerCapacity, customRackPower]);

  return (
    <div
      className={`max-w-6xl mx-auto transition-all duration-500 ${isTransitioning ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0"}`}
    >
      <div className="text-center space-y-4 mb-12">
        <h2
          className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
        >
          Configure Chilled-Water Cooling
        </h2>
        <p
          className={`text-lg max-w-2xl mx-auto ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          Optimize your water-based cooling system for maximum efficiency and
          reliability
        </p>
      </div>

      <div
        className={`mb-8 p-6 rounded-2xl ${
          isDark
            ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
            : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
        }`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Server, label: "Total Racks", value: localNumberOfRacks },
            {
              icon: Droplet,
              label: "Rack Power",
              value: `${actualRackPower} kW`,
            },
            {
              icon: Thermometer,
              label: "Cooling Capacity",
              value: `${Math.round(coolingCapacityKW)} kW`,
            },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div
                className={`text-2xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {stat.value}
              </div>
              <div
                className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <style>{`
        .card-hover { transition: all 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(92, 225, 229, 0.1); }
        .input-focus { transition: all 0.2s ease; }
        .input-focus:focus { box-shadow: 0 0 0 3px rgba(92, 225, 229, 0.1); }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

        {/* Section 1: Rack Configuration */}
        <div className="card-hover bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-[#1a1a2e]">
                Rack Configuration
              </h4>
              <p className="text-xs text-gray-500">
                Configure your server rack infrastructure
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-2">
                  Number of Racks
                </label>
                <input
                  type="number"
                  value={localNumberOfRacks}
                  onChange={(e) =>
                    setLocalNumberOfRacks(Math.max(1, Number(e.target.value)))
                  }
                  min={1}
                  max={1000}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 input-focus focus:border-[#5ce1e5]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-2">
                  Servers per Rack
                </label>
                <input
                  type="number"
                  value={localServersPerRack}
                  onChange={(e) =>
                    setLocalServersPerRack(Math.max(1, Number(e.target.value)))
                  }
                  min={1}
                  max={100}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 input-focus focus:border-[#5ce1e5]"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-400">
              <div className="text-sm text-gray-600">Total Servers</div>
              <div className="text-3xl font-bold text-[#1a1a2e]">
                {totalServers.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Rack Power Capacity */}
        <div
          className="card-hover bg-white rounded-2xl p-6 border border-gray-200 shadow-sm animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-[#1a1a2e]">
                Rack Power Capacity
              </h4>
              <p className="text-xs text-gray-500">
                Select rack power density with ASHRAE guidelines
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#1a1a2e] mb-3">
                Rack Power Capacity (kW)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {RACK_POWER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleRackPowerChange(option.value)}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      localRackPowerCapacity === option.value
                        ? "border-[#5ce1e5] bg-blue-50 ring-2 ring-blue-100"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="text-center">
                      <div
                        className={`font-bold text-lg ${
                          localRackPowerCapacity === option.value
                            ? "text-blue-700"
                            : "text-gray-800"
                        }`}
                      >
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {option.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {showCustomInput && (
              <div className="animate-fade-in">
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-2">
                  Custom Rack Power (kW)
                </label>
                <input
                  type="number"
                  value={customRackPower}
                  onChange={(e) => setCustomRackPower(e.target.value)}
                  min={1}
                  max={100}
                  step={0.1}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 input-focus focus:border-[#5ce1e5]"
                  placeholder="Enter custom rack power"
                />
              </div>
            )}

            {/* Rack Power Status Indicator */}
            <div
              className={`p-4 rounded-xl border ${
                getRackPowerStatus().type === "normal"
                  ? "bg-green-50 border-green-200"
                  : getRackPowerStatus().type === "warning"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {getRackPowerStatus().type === "normal" ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : getRackPowerStatus().type === "warning" ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <div
                    className={`font-semibold ${
                      getRackPowerStatus().type === "normal"
                        ? "text-green-700"
                        : getRackPowerStatus().type === "warning"
                          ? "text-amber-700"
                          : "text-red-700"
                    }`}
                  >
                    {getRackPowerStatus().type === "normal"
                      ? "✓ Suitable"
                      : "⚠ Consideration Required"}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    {getRackPowerStatus().message}
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    ASHRAE Recommended: 10–30 kW per rack for chilled-water
                    systems
                  </div>
                </div>
              </div>
            </div>

            {/* Power Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  Per Rack Power
                </div>
                <div className="text-xl font-bold text-blue-900">
                  {actualRackPower.toFixed(1)} kW
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                  Total IT Power
                </div>
                <div className="text-xl font-bold text-purple-900">
                  {totalITPowerKW.toFixed(0)} kW
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Chilled Water System Configuration */}
        <div
          className="card-hover bg-white rounded-2xl p-6 border border-gray-200 shadow-sm animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <Droplet className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-[#1a1a2e]">
                Chilled Water System
              </h4>
              <p className="text-xs text-gray-500">
                Configure water temperatures and flow rates
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1a1a2e] mb-2">
                  Chilled Water Temp
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={localChilledWaterTemp}
                    onChange={(e) =>
                      setLocalChilledWaterTemp(Number(e.target.value))
                    }
                    min={4}
                    max={10}
                    step={0.5}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 input-focus focus:border-[#5ce1e5]"
                  />
                  <span className="text-gray-600">°C</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1a2e] mb-2">
                  Supply Water Temp
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={localSupplyWaterTemp}
                    onChange={(e) =>
                      setLocalSupplyWaterTemp(Number(e.target.value))
                    }
                    min={8}
                    max={15}
                    step={0.5}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 input-focus focus:border-[#5ce1e5]"
                  />
                  <span className="text-gray-600">°C</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1a2e] mb-2">
                  Return Water Temp
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={localReturnWaterTemp}
                    onChange={(e) =>
                      setLocalReturnWaterTemp(Number(e.target.value))
                    }
                    min={15}
                    max={25}
                    step={0.5}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 input-focus focus:border-[#5ce1e5]"
                  />
                  <span className="text-gray-600">°C</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1a2e] mb-2">
                  Water Flow Rate
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={localWaterFlowRate}
                    onChange={(e) =>
                      setLocalWaterFlowRate(Number(e.target.value))
                    }
                    min={10}
                    max={200}
                    step={5}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 input-focus focus:border-[#5ce1e5]"
                  />
                  <span className="text-gray-600">L/s</span>
                </div>
              </div>
            </div>

            {/* Temperature Delta Display */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-cyan-700">
                    ΔT (Temperature Difference)
                  </div>
                  <div className="text-xs text-cyan-600">
                    Return - Supply Temperature
                  </div>
                </div>
                <div className="text-2xl font-bold text-cyan-900">
                  {deltaT.toFixed(1)} °C
                </div>
              </div>
            </div>

            {/* Cooling Capacity Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                  Cooling Capacity
                </div>
                <div className="text-lg font-bold text-green-900">
                  {coolingCapacityKW.toFixed(0)} kW
                </div>
                <div className="text-xs text-green-700">
                  Available Cooling Power
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  IT Load Ratio
                </div>
                <div className="text-lg font-bold text-blue-900">
                  {(coolingCapacityKW / totalITPowerKW).toFixed(2)}:1
                </div>
                <div className="text-xs text-blue-700">
                  Cooling to IT Power Ratio
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: System Efficiency */}
        <div
          className="card-hover bg-white rounded-2xl p-6 border border-gray-200 shadow-sm animate-fade-in"
          style={{ animationDelay: "0.25s" }}
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-[#1a1a2e]">
                System Efficiency
              </h4>
              <p className="text-xs text-gray-500">
                Configure efficiency parameters for optimal performance
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Efficiency Sliders */}
            {[
              {
                label: "Chiller Efficiency (COP)",
                value: localChillerEfficiency,
                setValue: setLocalChillerEfficiency,
                min: 0.3,
                max: 1.2,
                step: 0.05,
                unit: "kW/kW",
                description: "Coefficient of Performance",
                icon: Thermometer,
                color: "blue",
              },
              {
                label: "Pump Efficiency",
                value: localPumpEfficiency,
                setValue: setLocalPumpEfficiency,
                min: 0.5,
                max: 0.95,
                step: 0.05,
                unit: "%",
                description: "Hydraulic pump efficiency",
                icon: Droplets,
                color: "cyan",
              },
              {
                label: "Cooling Tower Efficiency",
                value: localCoolingTowerEfficiency,
                setValue: setLocalCoolingTowerEfficiency,
                min: 0.5,
                max: 0.9,
                step: 0.05,
                unit: "%",
                description: "Heat rejection efficiency",
                icon: Wind,
                color: "green",
              },
            ].map((efficiency, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-sm font-semibold text-[#1a1a2e]">
                      {efficiency.label}
                    </label>
                    <div className="text-xs text-gray-500">
                      {efficiency.description}
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-700">
                    {(
                      efficiency.value * (efficiency.unit === "%" ? 100 : 1)
                    ).toFixed(1)}
                    {efficiency.unit}
                  </span>
                </div>
                <input
                  type="range"
                  value={efficiency.value}
                  onChange={(e) => efficiency.setValue(Number(e.target.value))}
                  min={efficiency.min}
                  max={efficiency.max}
                  step={efficiency.step}
                  className="w-full h-2 bg-gradient-to-r from-gray-200 to-blue-400 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {(
                      efficiency.min * (efficiency.unit === "%" ? 100 : 1)
                    ).toFixed(1)}
                    {efficiency.unit}
                  </span>
                  <span>
                    {(
                      efficiency.max * (efficiency.unit === "%" ? 100 : 1)
                    ).toFixed(1)}
                    {efficiency.unit}
                  </span>
                </div>
              </div>
            ))}

            {/* Efficiency Summary */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                    PUE
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {pue.toFixed(2)}
                  </div>
                  <div className="text-xs text-green-700">
                    Power Usage Effectiveness
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                    WUE
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {wue.toFixed(3)}
                  </div>
                  <div className="text-xs text-green-700">m³/kWh</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Power Breakdown Summary */}
        <div
          className="card-hover bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200 animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-300">
            <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-700" />
            </div>
            <h4 className="font-bold text-lg text-[#1a1a2e]">
              Power Breakdown & Summary
            </h4>
          </div>

          <div className="space-y-4">
            {/* Power Components */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  icon: Zap,
                  label: "IT Load",
                  value: totalITPowerKW.toFixed(0),
                  unit: "kW",
                  color: "blue",
                },
                {
                  icon: Thermometer,
                  label: "Chiller",
                  value: chillerPowerKW.toFixed(0),
                  unit: "kW",
                  color: "cyan",
                },
                {
                  icon: Droplets,
                  label: "Pumps",
                  value: pumpPowerKW.toFixed(0),
                  unit: "kW",
                  color: "indigo",
                },
                {
                  icon: Wind,
                  label: "Cooling Tower",
                  value: coolingTowerPowerKW.toFixed(0),
                  unit: "kW",
                  color: "green",
                },
              ].map((component, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-gray-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <component.icon
                      className={`w-4 h-4 text-${component.color}-600`}
                    />
                    <div className="text-xs text-gray-600 uppercase tracking-wide">
                      {component.label}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-[#1a1a2e]">
                    {component.value}
                  </div>
                  <div className="text-xs text-gray-500">{component.unit}</div>
                </div>
              ))}
            </div>

            {/* Total Power */}
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-600">
                    Total Cooling Power
                  </div>
                  <div className="text-xs text-gray-500">
                    Chiller + Pumps + Cooling Tower
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#1a1a2e]">
                  {totalCoolingPowerKW.toFixed(0)} kW
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-600">
                    Total Facility Power
                  </div>
                  <div className="text-xs text-gray-500">
                    IT Load + Total Cooling
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#1a1a2e]">
                  {totalPowerKW.toFixed(0)} kW
                </div>
              </div>
            </div>

            {/* Location Data Impact */}
            {locationData.length > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-700">
                      Location Data Applied
                    </div>
                    <div className="text-sm text-amber-700 mt-1">
                      Based on {locationData.length} weather data points,
                      cooling power adjusted by{" "}
                      {(locationAdjustment * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-amber-600 mt-2">
                      Adjusted total cooling power:{" "}
                      {adjustedCoolingPowerKW.toFixed(0)} kW
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ASHRAE Compliance Note */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="text-xs text-gray-600">
                  <span className="font-semibold">ASHRAE Compliance:</span> This
                  configuration aligns with ASHRAE TC 9.9 guidelines for
                  chilled-water data center cooling systems.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChilledWaterCooling;
