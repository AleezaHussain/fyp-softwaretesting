import React, { useEffect, useMemo, useState } from "react";
import { Server, Cpu, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export interface EvaporativeCoolingFormProps {
  isDark: boolean;
  isTransitioning: boolean;
  currentConfig: any;
  currentInput: any;
  onConfigChange: (config: any) => void;
}

// Server type from database
interface ServerType {
  id: number;
  name: string;
  manufacturer: string;
  max_power_w: number;
  idle_power_w: number;
  avg_utilization_percent: number;
  peak_utilization_percent: number;
  form_factor: string;
  max_airflow_cfm: number;
}

const EvaporativeCoolingForm: React.FC<EvaporativeCoolingFormProps> = ({
  isDark,
  isTransitioning,
  currentConfig,
  currentInput,
  onConfigChange,
}) => {
  const [totalServers, setTotalServers] = useState<number>(
    currentConfig?.totalServers || currentInput?.totalServers || 50,
  );
  const [serversPerRack, setServersPerRack] = useState<number>(
    currentConfig?.serversPerRack || 10,
  );
  const [serverType, setServerType] = useState<number | null>(
    currentConfig?.serverTypeId || null,
  );
  const [powerUtilizationModel, setPowerUtilizationModel] = useState<string>(
    currentConfig?.powerUtilizationModel || "linear",
  );
  const [weatherFile, setWeatherFile] = useState<File | null>(null);
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<boolean>(false);
  
  // Rack Geometry fields
  const [rackHeightU, setRackHeightU] = useState<number>(
    currentConfig?.rackHeightU || 42,
  );
  const [frontToBackAirflow, setFrontToBackAirflow] = useState<boolean>(
    currentConfig?.frontToBackAirflow ?? true,
  );

  // Airflow Distribution fields
  const [airflowQualityPreset, setAirflowQualityPreset] = useState<string>(
    currentConfig?.airflowQualityPreset || "typical",
  );
  const [airBypassFraction, setAirBypassFraction] = useState<number>(
    currentConfig?.airBypassFraction || 10,
  );
  const [hotAirRecirculation, setHotAirRecirculation] = useState<number>(
    currentConfig?.hotAirRecirculation || 5,
  );

  // Thermal Mass fields
  const [rackThermalMass, setRackThermalMass] = useState<number>(
    currentConfig?.rackThermalMass || 15,
  );
  const [enclosureThermalMass, setEnclosureThermalMass] = useState<number>(
    currentConfig?.enclosureThermalMass || 30,
  );
  const [manualThermalOverride, setManualThermalOverride] = useState<boolean>(
    currentConfig?.manualThermalOverride ?? false,
  );

  // Enclosure Type fields
  const [enclosureType, setEnclosureType] = useState<string>(
    currentConfig?.enclosureType || "outdoor_container",
  );

  // Infiltration fields
  const [infiltrationLevel, setInfiltrationLevel] = useState<string>(
    currentConfig?.infiltrationLevel || "standard",
  );
  const [enableCustomInfiltration, setEnableCustomInfiltration] = useState<boolean>(
    currentConfig?.enableCustomInfiltration ?? false,
  );
  const [customACH, setCustomACH] = useState<number>(
    currentConfig?.customACH || 0.25,
  );

  // Cooling System fields
  // A. Cooling Architecture
  const [coolingArchitecture, setCoolingArchitecture] = useState<string>(
    currentConfig?.coolingArchitecture || "iec",
  );
  
  // B. Evaporative Physics
  const [mediaType, setMediaType] = useState<string>(
    currentConfig?.mediaType || "cellulose",
  );
  const [saturationEffectiveness, setSaturationEffectiveness] = useState<number>(
    currentConfig?.saturationEffectiveness || 85,
  );
  const [faceVelocity, setFaceVelocity] = useState<number>(
    currentConfig?.faceVelocity || 2.0,
  );
  const [wettingEfficiency, setWettingEfficiency] = useState<number>(
    currentConfig?.wettingEfficiency || 95,
  );
  
  // C. Air Handling Unit
  const [maxAirflowCapacity] = useState<number>(
    currentConfig?.maxAirflowCapacity || 5000,
  );
  const [fanEfficiency] = useState<number>(
    currentConfig?.fanEfficiency || 65,
  );

  // Water System fields
  const [waterSource, setWaterSource] = useState<string>(
    currentConfig?.waterSource || "municipal",
  );
  const [cyclesOfConcentration, setCyclesOfConcentration] = useState<number>(
    currentConfig?.cyclesOfConcentration || 5,
  );
  const [tankVolume, setTankVolume] = useState<number>(
    currentConfig?.tankVolume || 5000,
  );
  const [refillRate, setRefillRate] = useState<number>(
    currentConfig?.refillRate || 0,
  );
  const [lowWaterCutoff, setLowWaterCutoff] = useState<number>(
    currentConfig?.lowWaterCutoff || 10,
  );

  // Mechanical Backup fields (kept for backend compatibility)
  const [enableMechanicalBackup] = useState<boolean>(
    currentConfig?.enableMechanicalBackup ?? false,
  );
  const [dxCOP] = useState<number>(
    currentConfig?.dxCOP || 3.5,
  );
  const [dxMaxCapacity] = useState<number>(
    currentConfig?.dxMaxCapacity || 0, // 0 = auto
  );

  // State for server data from database
  const [servers, setServers] = useState<ServerType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch servers from database
  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("servers")
          .select("*")
          .order("name", { ascending: true });

        if (error) throw error;

        setServers(data || []);
        
        // Set default server if none selected
        if (!serverType && data && data.length > 0) {
          setServerType(data[0].id);
        }
      } catch (err: any) {
        console.error("Error fetching servers:", err);
        setError(err.message || "Failed to load servers");
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
  }, []);

  const selectedServer = useMemo(
    () => servers.find((s) => s.id === serverType) || null,
    [serverType, servers],
  );

  // Auto-calculate rack count
  const numberOfRacks = useMemo(
    () => Math.ceil(totalServers / serversPerRack),
    [totalServers, serversPerRack],
  );

  // Check if airflow losses exceed realistic limits
  const airflowLossesExceedLimit = useMemo(() => {
    return (airBypassFraction + hotAirRecirculation) > 40;
  }, [airBypassFraction, hotAirRecirculation]);

  // Get enclosure properties based on type
  const enclosureProperties = useMemo(() => {
    switch (enclosureType) {
      case "outdoor_container":
        return {
          thermalMassRange: "20–40 kJ/K",
          airLeakageRange: "0.3–0.8 ACH",
          insulationQuality: "Low–Medium",
          thermalMass: 30,
          airLeakage: 0.5,
        };
      case "indoor_closet":
        return {
          thermalMassRange: "30–60 kJ/K",
          airLeakageRange: "0.1–0.3 ACH",
          insulationQuality: "Medium",
          thermalMass: 45,
          airLeakage: 0.2,
        };
      case "prefab_micro_dc":
        return {
          thermalMassRange: "50–100 kJ/K",
          airLeakageRange: "0.05–0.2 ACH",
          insulationQuality: "High",
          thermalMass: 75,
          airLeakage: 0.1,
        };
      case "custom":
        return {
          thermalMassRange: "20–150 kJ/K",
          airLeakageRange: "0.05–1.0 ACH",
          insulationQuality: "Custom",
          thermalMass: 30,
          airLeakage: 0.5,
        };
      default:
        return {
          thermalMassRange: "20–40 kJ/K",
          airLeakageRange: "0.3–0.8 ACH",
          insulationQuality: "Low–Medium",
          thermalMass: 30,
          airLeakage: 0.5,
        };
    }
  }, [enclosureType]);

  // Handle enclosure type change
  const handleEnclosureTypeChange = (type: string) => {
    setEnclosureType(type);
    // Values will be updated via useMemo
  };

  // Get infiltration values based on level
  const infiltrationValues = useMemo(() => {
    if (enableCustomInfiltration || infiltrationLevel === "custom") {
      return {
        ach: customACH,
      };
    }

    switch (infiltrationLevel) {
      case "sealed":
        return { ach: 0.1 };
      case "standard":
        return { ach: 0.25 };
      case "leaky":
        return { ach: 0.7 };
      default:
        return { ach: 0.25 };
    }
  }, [infiltrationLevel, enableCustomInfiltration, customACH]);

  // Handle infiltration level change
  const handleInfiltrationLevelChange = (level: string) => {
    setInfiltrationLevel(level);
    if (level === "custom") {
      setEnableCustomInfiltration(true);
    } else {
      setEnableCustomInfiltration(false);
    }
  };

  // Handle airflow quality preset changes
  const handleAirflowPresetChange = (preset: string) => {
    setAirflowQualityPreset(preset);
    
    switch (preset) {
      case "excellent":
        setAirBypassFraction(3);
        setHotAirRecirculation(2);
        break;
      case "typical":
        setAirBypassFraction(10);
        setHotAirRecirculation(5);
        break;
      case "poor":
        setAirBypassFraction(20);
        setHotAirRecirculation(15);
        break;
      case "custom":
        // Keep current values
        break;
    }
  };

  // Auto-calculate DX max capacity based on peak IT load
  const autoCalculatedDxCapacity = useMemo(() => {
    if (!selectedServer) return 50;
    const peakITLoad = (totalServers * selectedServer.max_power_w * selectedServer.peak_utilization_percent / 100) / 1000; // kW
    return Math.ceil(peakITLoad * 1.3); // 30% overhead
  }, [totalServers, selectedServer]);

  // Handle CSV file upload and validation
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith('.csv')) {
      setCsvError('Please upload a CSV file');
      setCsvSuccess(false);
      return;
    }

    setWeatherFile(file);
    setCsvError(null);
    setCsvSuccess(false);

    // Read and parse CSV
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setCsvError('CSV file is empty or invalid');
          return;
        }

        // Parse header
        const header = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        // Validate required columns
        const requiredColumns = ['hour', 'dry_bulb_c', 'relative_humidity'];
        const missingColumns = requiredColumns.filter(col => !header.includes(col));
        
        if (missingColumns.length > 0) {
          setCsvError(`Missing required columns: ${missingColumns.join(', ')}`);
          return;
        }

        // Parse data rows
        const data = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          
          header.forEach((col, i) => {
            row[col] = values[i];
          });

          // Validate data types
          const hour = parseFloat(row.hour);
          const dryBulb = parseFloat(row.dry_bulb_c);
          const humidity = parseFloat(row.relative_humidity);

          if (isNaN(hour) || isNaN(dryBulb) || isNaN(humidity)) {
            throw new Error(`Invalid data at row ${index + 2}`);
          }

          return {
            hour,
            dry_bulb_c: dryBulb,
            relative_humidity: humidity,
          };
        });

        setWeatherData(data);
        setCsvSuccess(true);
        setCsvError(null);
      } catch (err: any) {
        setCsvError(err.message || 'Failed to parse CSV file');
        setCsvSuccess(false);
      }
    };

    reader.onerror = () => {
      setCsvError('Failed to read file');
      setCsvSuccess(false);
    };

    reader.readAsText(file);
  };

  useEffect(() => {
    if (selectedServer) {
      onConfigChange({
        totalServers,
        serversPerRack,
        numberOfRacks,
        serverTypeId: serverType,
        serverName: selectedServer.name,
        serverManufacturer: selectedServer.manufacturer,
        serverIdlePower: selectedServer.idle_power_w,
        serverMaxPower: selectedServer.max_power_w,
        serverFormFactor: selectedServer.form_factor,
        serverMaxAirflow: selectedServer.max_airflow_cfm,
        averageUtilization: selectedServer.avg_utilization_percent,
        peakUtilization: selectedServer.peak_utilization_percent,
        powerUtilizationModel,
        weatherData,
        weatherFileName: weatherFile?.name,
        rackHeightU,
        frontToBackAirflow,
        airflowQualityPreset,
        airBypassFraction,
        hotAirRecirculation,
        rackThermalMass,
        enclosureThermalMass,
        manualThermalOverride,
        enclosureType,
        enclosureThermalMassValue: enclosureProperties.thermalMass,
        enclosureAirLeakage: enclosureProperties.airLeakage,
        insulationQuality: enclosureProperties.insulationQuality,
        infiltrationLevel,
        infiltrationACH: infiltrationValues.ach,
        enableCustomInfiltration,
        coolingArchitecture,
        mediaType,
        saturationEffectiveness,
        faceVelocity,
        wettingEfficiency,
        maxAirflowCapacity,
        fanEfficiency,
        waterSource,
        cyclesOfConcentration,
        tankVolume,
        refillRate,
        lowWaterCutoff,
        enableMechanicalBackup,
        dxCOP,
        dxMaxCapacity: dxMaxCapacity === 0 ? autoCalculatedDxCapacity : dxMaxCapacity,
        autoCalculatedDxCapacity,
      });
    }
  }, [
    totalServers,
    serversPerRack,
    numberOfRacks,
    serverType,
    selectedServer,
    powerUtilizationModel,
    weatherData,
    weatherFile,
    rackHeightU,
    frontToBackAirflow,
    airflowQualityPreset,
    airBypassFraction,
    hotAirRecirculation,
    rackThermalMass,
    enclosureThermalMass,
    manualThermalOverride,
    enclosureType,
    enclosureProperties,
    infiltrationLevel,
    infiltrationValues,
    enableCustomInfiltration,
    coolingArchitecture,
    mediaType,
    saturationEffectiveness,
    faceVelocity,
    wettingEfficiency,
    maxAirflowCapacity,
    fanEfficiency,
    waterSource,
    cyclesOfConcentration,
    tankVolume,
    refillRate,
    lowWaterCutoff,
    enableMechanicalBackup,
    dxCOP,
    dxMaxCapacity,
    autoCalculatedDxCapacity,
    onConfigChange,
  ]);

  return (
    <div
      className={`max-w-6xl mx-auto transition-all duration-500 ${
        isTransitioning
          ? "opacity-0 translate-x-8"
          : "opacity-100 translate-x-0"
      }`}
    >
      <div className="text-center space-y-4 mb-12">
        <h2
          className={`text-4xl font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Configure Evaporative Cooling
        </h2>
        <p
          className={`text-lg max-w-2xl mx-auto ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Set basic server parameters for evaporative cooling analysis.
        </p>
      </div>

      <div
        className={`mb-8 p-6 rounded-2xl ${
          isDark
            ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
            : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
        }`}
      >
        <div className="grid grid-cols-2 gap-6">
          {[
            { icon: Server, label: "Total Servers", value: totalServers },
            { icon: Cpu, label: "Rack Count", value: numberOfRacks },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div
                className={`text-2xl font-bold mb-1 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {stat.value}
              </div>
              <div
                className={`text-sm ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`p-8 rounded-2xl ${
          isDark
            ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
            : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Number of Servers
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={totalServers}
              onChange={(e) => setTotalServers(Number(e.target.value))}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              Range: 1 – 100
            </p>
          </div>
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Servers per Rack
            </label>
            <input
              type="number"
              min={1}
              max={42}
              value={serversPerRack}
              onChange={(e) => setServersPerRack(Number(e.target.value))}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              Range: 1 – 42
            </p>
          </div>

          {/* Rack Count - Auto-calculated */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Rack Count
            </label>
            <div
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#0f1425] border-[#3f4a68] text-gray-400"
                  : "bg-gray-100 border-gray-300 text-gray-600"
              }`}
            >
              {numberOfRacks}
            </div>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              Auto-calculated: ⌈{totalServers} ÷ {serversPerRack}⌉
            </p>
          </div>

          {/* Power-Utilization Model Dropdown */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Power–Utilization Model
            </label>
            <select
              value={powerUtilizationModel}
              onChange={(e) => setPowerUtilizationModel(e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="linear">Linear</option>
              <option value="nonlinear">Non-linear (AI/GPU)</option>
            </select>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              {powerUtilizationModel === "linear" 
                ? "Standard linear power scaling" 
                : "Non-linear model for AI/GPU workloads"}
            </p>
          </div>

          {/* Server Type Dropdown */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Server Type
            </label>
            
            {loading ? (
              <div className={`w-full p-3 border rounded-lg flex items-center justify-center ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68]"
                  : "bg-white border-gray-300"
              }`}>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className={isDark ? "text-gray-400" : "text-gray-600"}>
                  Loading servers...
                </span>
              </div>
            ) : error ? (
              <div className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-red-900/20 border-red-500 text-red-400"
                  : "bg-red-50 border-red-300 text-red-600"
              }`}>
                Error: {error}
              </div>
            ) : (
              <>
                <select
                  value={serverType || ""}
                  onChange={(e) => setServerType(Number(e.target.value))}
                  className={`w-full p-3 border rounded-lg ${
                    isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="" disabled>
                    Select a server type
                  </option>
                  {servers.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.name} - {server.manufacturer}
                    </option>
                  ))}
                </select>

                {selectedServer && (
                  <div
                    className={`mt-3 p-4 rounded-lg ${
                      isDark ? "bg-[#0f1425]" : "bg-gray-100"
                    }`}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span
                          className={`text-xs font-medium block mb-1 ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Form Factor
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isDark ? "text-blue-400" : "text-blue-600"
                          }`}
                        >
                          {selectedServer.form_factor}
                        </span>
                      </div>
                      <div>
                        <span
                          className={`text-xs font-medium block mb-1 ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Idle Power
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isDark ? "text-green-400" : "text-green-600"
                          }`}
                        >
                          {selectedServer.idle_power_w}W
                        </span>
                      </div>
                      <div>
                        <span
                          className={`text-xs font-medium block mb-1 ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Max Power
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isDark ? "text-red-400" : "text-red-600"
                          }`}
                        >
                          {selectedServer.max_power_w}W
                        </span>
                      </div>
                      <div>
                        <span
                          className={`text-xs font-medium block mb-1 ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Avg Utilization
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isDark ? "text-yellow-400" : "text-yellow-600"
                          }`}
                        >
                          {selectedServer.avg_utilization_percent}%
                        </span>
                      </div>
                      <div>
                        <span
                          className={`text-xs font-medium block mb-1 ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Peak Utilization
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isDark ? "text-orange-400" : "text-orange-600"
                          }`}
                        >
                          {selectedServer.peak_utilization_percent}%
                        </span>
                      </div>
                      <div>
                        <span
                          className={`text-xs font-medium block mb-1 ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Max Airflow
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isDark ? "text-purple-400" : "text-purple-600"
                          }`}
                        >
                          {selectedServer.max_airflow_cfm} CFM
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Weather Data CSV Upload */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Weather Data (CSV)
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  : "bg-white border-gray-300 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              Required columns: hour, dry_bulb_C, relative_humidity
            </p>
            
            {csvError && (
              <div className={`mt-2 p-3 rounded-lg flex items-start ${
                isDark
                  ? "bg-red-900/20 border border-red-500"
                  : "bg-red-50 border border-red-300"
              }`}>
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>
                  {csvError}
                </span>
              </div>
            )}
            
            {csvSuccess && weatherData.length > 0 && (
              <div className={`mt-2 p-3 rounded-lg flex items-start ${
                isDark
                  ? "bg-green-900/20 border border-green-500"
                  : "bg-green-50 border border-green-300"
              }`}>
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className={`text-sm ${isDark ? "text-green-400" : "text-green-600"}`}>
                  <div className="font-semibold">File uploaded successfully!</div>
                  <div className="mt-1">
                    {weatherFile?.name} - {weatherData.length} data points loaded
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rack Geometry Section */}
          <div className="md:col-span-2">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              Rack Geometry
            </h3>
          </div>

          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Rack Height (U)
            </label>
            <input
              type="number"
              min={24}
              max={48}
              value={rackHeightU}
              onChange={(e) => setRackHeightU(Number(e.target.value))}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              Range: 24 – 48 U
            </p>
          </div>

          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Front-to-Back Airflow
            </label>
            <select
              value={frontToBackAirflow ? "yes" : "no"}
              onChange={(e) => setFrontToBackAirflow(e.target.value === "yes")}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              {frontToBackAirflow 
                ? "Standard front-to-back cooling" 
                : "Alternative airflow pattern"}
            </p>
          </div>

          <div></div>

          {/* Airflow Distribution Section */}
          <div className="md:col-span-2 mt-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              Airflow Distribution
            </h3>
          </div>

          {/* Airflow Quality Preset */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Airflow Quality Preset
            </label>
            <select
              value={airflowQualityPreset}
              onChange={(e) => handleAirflowPresetChange(e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="excellent">Excellent Containment (Bypass: 3%, Recirc: 2%)</option>
              <option value="typical">Typical Edge Micro-DC (Bypass: 10%, Recirc: 5%)</option>
              <option value="poor">Poor Airflow Management (Bypass: 20%, Recirc: 15%)</option>
              <option value="custom">Custom (Manual)</option>
            </select>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Select a preset or choose Custom to manually adjust bypass and recirculation
            </p>
          </div>

          {/* Air Bypass Fraction */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Air Bypass Fraction (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={airBypassFraction}
                onChange={(e) => {
                  setAirBypassFraction(Number(e.target.value));
                  setAirflowQualityPreset("custom");
                }}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <input
                type="number"
                min={0}
                max={30}
                value={airBypassFraction}
                onChange={(e) => {
                  setAirBypassFraction(Number(e.target.value));
                  setAirflowQualityPreset("custom");
                }}
                className={`w-20 p-2 border rounded-lg text-center ${
                  isDark
                    ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                %
              </span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>0% (Excellent)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>15% (Decent)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>30% (Poor)</span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Fraction of cold supply air that bypasses servers
            </p>
          </div>

          {/* Hot Air Recirculation Fraction */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Hot Air Recirculation Fraction (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={hotAirRecirculation}
                onChange={(e) => {
                  setHotAirRecirculation(Number(e.target.value));
                  setAirflowQualityPreset("custom");
                }}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <input
                type="number"
                min={0}
                max={25}
                value={hotAirRecirculation}
                onChange={(e) => {
                  setHotAirRecirculation(Number(e.target.value));
                  setAirflowQualityPreset("custom");
                }}
                className={`w-20 p-2 border rounded-lg text-center ${
                  isDark
                    ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                %
              </span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>0% (Good)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>10% (Average)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>25% (Poor)</span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Fraction of hot exhaust air re-entering server inlets
            </p>
          </div>

          {/* Airflow Losses Warning */}
          {airflowLossesExceedLimit && (
            <div className="md:col-span-2">
              <div className={`p-3 rounded-lg flex items-start ${
                isDark
                  ? "bg-red-900/20 border border-red-500"
                  : "bg-red-50 border border-red-300"
              }`}>
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>
                  <div className="font-semibold">Combined airflow losses exceed realistic limits!</div>
                  <div className="mt-1">
                    Bypass ({airBypassFraction}%) + Recirculation ({hotAirRecirculation}%) = {airBypassFraction + hotAirRecirculation}% (should be ≤ 40%)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Thermal Mass Section */}
          <div className="md:col-span-2 mt-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              Thermal Mass
            </h3>
          </div>

          {/* Manual Thermal Override Toggle */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <label
                  className={`block font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Manual Thermal Override
                </label>
                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  OFF → Use default thermal mass values | ON → Manually specify thermal mass
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualThermalOverride(!manualThermalOverride)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  manualThermalOverride
                    ? "bg-blue-600"
                    : isDark
                    ? "bg-gray-700"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    manualThermalOverride ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Rack Thermal Mass */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Rack Thermal Mass (kJ/K)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={rackThermalMass}
                onChange={(e) => setRackThermalMass(Number(e.target.value))}
                disabled={!manualThermalOverride}
                className={`flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 ${
                  !manualThermalOverride ? "opacity-50 cursor-not-allowed" : ""
                }`}
              />
              <input
                type="number"
                min={5}
                max={50}
                value={rackThermalMass}
                onChange={(e) => setRackThermalMass(Number(e.target.value))}
                disabled={!manualThermalOverride}
                className={`w-20 p-2 border rounded-lg text-center ${
                  isDark
                    ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                    : "bg-white border-gray-300 text-gray-900"
                } ${!manualThermalOverride ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                kJ/K
              </span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>5 (Low)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>15 (Default)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>50 (High)</span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Thermal capacitance of rack structure and equipment
            </p>
          </div>

          {/* Enclosure Thermal Mass */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Enclosure Thermal Mass (kJ/K)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={20}
                max={150}
                step={5}
                value={enclosureThermalMass}
                onChange={(e) => setEnclosureThermalMass(Number(e.target.value))}
                disabled={!manualThermalOverride}
                className={`flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 ${
                  !manualThermalOverride ? "opacity-50 cursor-not-allowed" : ""
                }`}
              />
              <input
                type="number"
                min={20}
                max={150}
                value={enclosureThermalMass}
                onChange={(e) => setEnclosureThermalMass(Number(e.target.value))}
                disabled={!manualThermalOverride}
                className={`w-20 p-2 border rounded-lg text-center ${
                  isDark
                    ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                    : "bg-white border-gray-300 text-gray-900"
                } ${!manualThermalOverride ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                kJ/K
              </span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>20 (Low)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>30 (Default)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>150 (High)</span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Thermal capacitance of building enclosure (walls, floor, ceiling)
            </p>
          </div>

          {/* Enclosure Type Section */}
          <div className="md:col-span-2 mt-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              Enclosure Type
            </h3>
          </div>

          {/* Enclosure Type Dropdown */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Enclosure Type
            </label>
            <select
              value={enclosureType}
              onChange={(e) => handleEnclosureTypeChange(e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="outdoor_container">Outdoor Container</option>
              <option value="indoor_closet">Indoor Closet</option>
              <option value="prefab_micro_dc">Prefab Micro-DC</option>
              <option value="custom">Custom (Advanced)</option>
            </select>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Select enclosure type - each option auto-maps thermal and leakage properties
            </p>
          </div>

          {/* Enclosure Properties Display */}
          <div className="md:col-span-2">
            <div
              className={`p-4 rounded-lg ${
                isDark ? "bg-[#0f1425]" : "bg-gray-100"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span
                    className={`text-xs font-medium block mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Thermal Mass Range
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      isDark ? "text-blue-400" : "text-blue-600"
                    }`}
                  >
                    {enclosureProperties.thermalMassRange}
                  </span>
                </div>
                <div>
                  <span
                    className={`text-xs font-medium block mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Air Leakage Range
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      isDark ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    {enclosureProperties.airLeakageRange}
                  </span>
                </div>
                <div>
                  <span
                    className={`text-xs font-medium block mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Insulation Quality
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      isDark ? "text-purple-400" : "text-purple-600"
                    }`}
                  >
                    {enclosureProperties.insulationQuality}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Infiltration Section */}
          <div className="md:col-span-2 mt-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              Infiltration
            </h3>
          </div>

          {/* Infiltration Level Dropdown */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Infiltration Level
            </label>
            <select
              value={infiltrationLevel}
              onChange={(e) => handleInfiltrationLevelChange(e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="sealed">Sealed / Weather-tight</option>
              <option value="standard">Standard Enclosure</option>
              <option value="leaky">Leaky Enclosure</option>
              <option value="custom">Custom (Advanced)</option>
            </select>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Select infiltration level - auto-maps to construction-based ACH and door event rates
            </p>
          </div>

          {/* Infiltration Values Display (Auto) */}
          <div className="md:col-span-2">
            <div
              className={`p-4 rounded-lg ${
                isDark ? "bg-[#0f1425]" : "bg-gray-100"
              }`}
            >
              <div>
                <span
                  className={`text-xs font-medium block mb-1 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Air Leakage Rate
                </span>
                <span
                  className={`text-sm font-bold ${
                    isDark ? "text-blue-400" : "text-blue-600"
                  }`}
                >
                  {infiltrationValues.ach.toFixed(2)} ACH {!enableCustomInfiltration && "(auto)"}
                </span>
                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Uncontrolled air exchange due to cracks and seals
                </p>
              </div>
            </div>
          </div>

          {/* Enable Custom Values Checkbox */}
          {infiltrationLevel !== "custom" && (
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enableCustomInfiltration"
                  checked={enableCustomInfiltration}
                  onChange={(e) => setEnableCustomInfiltration(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="enableCustomInfiltration"
                  className={`font-medium cursor-pointer ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Enable custom values
                </label>
              </div>
            </div>
          )}

          {/* Custom Infiltration Inputs */}
          {(enableCustomInfiltration || infiltrationLevel === "custom") && (
            <>
              <div>
                <label
                  className={`block mb-2 font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Air Leakage Rate (ACH)
                </label>
                <input
                  type="number"
                  min={0.05}
                  max={2.0}
                  step={0.05}
                  value={customACH}
                  onChange={(e) => setCustomACH(Number(e.target.value))}
                  className={`w-full p-3 border rounded-lg ${
                    isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
                <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Range: 0.05–2.0 ACH (Air Changes per Hour)
                </p>
              </div>
            </>
          )}

          {/* Cooling System Section */}
          <div className="md:col-span-2 mt-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              Cooling System
            </h3>
          </div>

          {/* A. Cooling Architecture */}
          <div className="md:col-span-2">
            <label
              className={`block mb-3 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              A. Cooling Architecture
            </label>
            <div className="space-y-3">
              {[
                { value: "dec", label: "Direct Evaporative (DEC)" },
                { value: "iec", label: "Indirect Evaporative (IEC)" },
                { value: "dew_point", label: "Dew-point / M-cycle IEC" },
                { value: "hybrid", label: "Hybrid IEC + DX" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 rounded-lg cursor-pointer border ${
                    coolingArchitecture === option.value
                      ? isDark
                        ? "bg-blue-900/30 border-blue-500"
                        : "bg-blue-50 border-blue-500"
                      : isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] hover:border-blue-400"
                      : "bg-white border-gray-300 hover:border-blue-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="coolingArchitecture"
                    value={option.value}
                    checked={coolingArchitecture === option.value}
                    onChange={(e) => setCoolingArchitecture(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className={`ml-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* B. Evaporative Physics (shown only for evaporative architectures) */}
          {["dec", "iec", "dew_point", "hybrid"].includes(coolingArchitecture) && (
            <>
              <div className="md:col-span-2 mt-4">
                <h4 className={`text-md font-semibold mb-3 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>
                  B. Evaporative Physics
                </h4>
              </div>

              {/* Media Type */}
              <div>
                <label
                  className={`block mb-2 font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Media Type
                </label>
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                  className={`w-full p-3 border rounded-lg ${
                    isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="cellulose">Cellulose Pad</option>
                  <option value="polymer">Polymer Membrane</option>
                </select>
              </div>

              {/* Saturation Effectiveness */}
              <div>
                <label
                  className={`block mb-2 font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Saturation Effectiveness (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={60}
                    max={95}
                    step={1}
                    value={saturationEffectiveness}
                    onChange={(e) => setSaturationEffectiveness(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <input
                    type="number"
                    min={60}
                    max={95}
                    value={saturationEffectiveness}
                    onChange={(e) => setSaturationEffectiveness(Number(e.target.value))}
                    className={`w-20 p-2 border rounded-lg text-center ${
                      isDark
                        ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                  <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    %
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Fraction of wet-bulb temperature approach achieved by evaporative media
                </p>
              </div>

              {/* Face Velocity */}
              <div>
                <label
                  className={`block mb-2 font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Face Velocity (m/s)
                </label>
                <input
                  type="number"
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  value={faceVelocity}
                  onChange={(e) => setFaceVelocity(Number(e.target.value))}
                  className={`w-full p-3 border rounded-lg ${
                    isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
                <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Air velocity through evaporative media face (Range: 1.0–3.0 m/s)
                </p>
              </div>

              {/* Wetting Efficiency */}
              <div>
                <label
                  className={`block mb-2 font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Wetting Efficiency (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={80}
                    max={100}
                    step={1}
                    value={wettingEfficiency}
                    onChange={(e) => setWettingEfficiency(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <input
                    type="number"
                    min={80}
                    max={100}
                    value={wettingEfficiency}
                    onChange={(e) => setWettingEfficiency(Number(e.target.value))}
                    className={`w-20 p-2 border rounded-lg text-center ${
                      isDark
                        ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                  <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    %
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Uniformity of water distribution across media
                </p>
              </div>
            </>
          )}



          {/* Water System Section */}
          <div className="md:col-span-2 mt-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              Water System
            </h3>
          </div>

          {/* Water Source */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Water Source
            </label>
            <select
              value={waterSource}
              onChange={(e) => setWaterSource(e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="municipal">Municipal (unlimited)</option>
              <option value="tank">On-site tank (limited)</option>
            </select>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Determines whether water is infinite or constrained - directly affects system availability
            </p>
          </div>

          {/* Cycles of Concentration */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Cycles of Concentration (COC)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={3}
                max={12}
                step={1}
                value={cyclesOfConcentration}
                onChange={(e) => setCyclesOfConcentration(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <input
                type="number"
                min={3}
                max={12}
                value={cyclesOfConcentration}
                onChange={(e) => setCyclesOfConcentration(Number(e.target.value))}
                className={`w-20 p-2 border rounded-lg text-center ${
                  isDark
                    ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>3 (Low)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>5 (Default)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>12 (High)</span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Ratio of dissolved solids concentration in recirculating water to makeup water
            </p>
          </div>

          {/* Tank Model (shown only if water source is tank) */}
          {waterSource === "tank" && (
            <>
              <div>
                <label
                  className={`block mb-2 font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Tank Volume (L)
                </label>
                <input
                  type="number"
                  min={500}
                  max={50000}
                  step={100}
                  value={tankVolume}
                  onChange={(e) => setTankVolume(Number(e.target.value))}
                  className={`w-full p-3 border rounded-lg ${
                    isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
                <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Range: 500–50,000 L
                </p>
              </div>

              <div>
                <label
                  className={`block mb-2 font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Refill Rate (L/day)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50000}
                  step={100}
                  value={refillRate}
                  onChange={(e) => setRefillRate(Number(e.target.value))}
                  className={`w-full p-3 border rounded-lg ${
                    isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
                <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Range: 0–50,000 L/day (0 = no refill)
                </p>
              </div>

              <div className="md:col-span-2">
                <label
                  className={`block mb-2 font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Low-Water Cutoff (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={lowWaterCutoff}
                    onChange={(e) => setLowWaterCutoff(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={lowWaterCutoff}
                    onChange={(e) => setLowWaterCutoff(Number(e.target.value))}
                    className={`w-20 p-2 border rounded-lg text-center ${
                      isDark
                        ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                  <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    %
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className={isDark ? "text-gray-500" : "text-gray-500"}>5%</span>
                  <span className={isDark ? "text-gray-500" : "text-gray-500"}>10% (Default)</span>
                  <span className={isDark ? "text-gray-500" : "text-gray-500"}>30%</span>
                </div>
                <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Cooling system shuts down when tank level falls below this threshold
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default EvaporativeCoolingForm;
