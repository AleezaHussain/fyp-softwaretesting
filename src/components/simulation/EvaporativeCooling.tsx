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
  const [weatherData, setWeatherData] = useState<any[]>(
    currentConfig?.weatherData || []
  );
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
  // Note: maxAirflowCapacity is calculated later after selectedServer is defined
  
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
    // ✅ RECOMMENDED: Enable DX backup for hybrid operation (was false)
    currentConfig?.enableMechanicalBackup ?? true,
  );
  const [dxCOP] = useState<number>(
    currentConfig?.dxCOP || 3.5,
  );
  const [dxMaxCapacity] = useState<number>(
    currentConfig?.dxMaxCapacity || 0, // 0 = auto
  );

  // Cost & Environmental Impact fields
  const [electricityRate, setElectricityRate] = useState<number>(
    currentConfig?.electricityRate || 0.12, // $/kWh
  );
  const [waterRate, setWaterRate] = useState<number>(
    currentConfig?.waterRate || 0.001, // $/L
  );
  const [gridEmissionsFactor, setGridEmissionsFactor] = useState<number>(
    currentConfig?.gridEmissionsFactor || 0.45, // kg CO2/kWh
  );

  // Financial Escalation fields
  const [annualElectricityInflation, setAnnualElectricityInflation] = useState<number>(
    currentConfig?.annualElectricityInflation || 4, // %
  );
  const [annualWaterInflation, setAnnualWaterInflation] = useState<number>(
    currentConfig?.annualWaterInflation || 3, // %
  );
  const [carbonPrice, setCarbonPrice] = useState<number>(
    currentConfig?.carbonPrice || 50, // $ per ton CO2
  );
  const [carbonPriceGrowth, setCarbonPriceGrowth] = useState<number>(
    currentConfig?.carbonPriceGrowth || 5, // % per year
  );

  // Carbon Accounting Mode fields
  const [emissionsAccountingMethod, setEmissionsAccountingMethod] = useState<string>(
    currentConfig?.emissionsAccountingMethod || "location_based",
  );
  const [renewableEnergyPercentage, setRenewableEnergyPercentage] = useState<number>(
    currentConfig?.renewableEnergyPercentage || 0, // %
  );

  // 2030 Scenario Controls
  const [scenarioType, setScenarioType] = useState<string>(
    currentConfig?.scenarioType || "baseline_2025",
  );
  const [temperatureOffset, setTemperatureOffset] = useState<number>(
    currentConfig?.temperatureOffset || 1.0,
  );
  const [humidityAdjustment, setHumidityAdjustment] = useState<number>(
    currentConfig?.humidityAdjustment || 0,
  );

  // AI Workload Module fields
  const [workloadType, setWorkloadType] = useState<string>(
    currentConfig?.workloadType || "traditional",
  );
  const [averageITUtilization, setAverageITUtilization] = useState<number>(
    currentConfig?.averageITUtilization || 60,
  );
  const [peakITUtilization, setPeakITUtilization] = useState<number>(
    currentConfig?.peakITUtilization || 90,
  );
  const [rackPowerDensity, setRackPowerDensity] = useState<number>(
    currentConfig?.rackPowerDensity || 0, // 0 = auto-calculated
  );

  // State for server data from database
  const [servers, setServers] = useState<ServerType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fallback server data if Supabase is unavailable
  const fallbackServers: ServerType[] = [
    {
      id: 1,
      name: "Dell PowerEdge R740",
      manufacturer: "Dell",
      max_power_w: 750,
      idle_power_w: 150,
      avg_utilization_percent: 60,
      peak_utilization_percent: 90,
      form_factor: "2U",
      max_airflow_cfm: 250,
    },
    {
      id: 2,
      name: "HP ProLiant DL380 Gen10",
      manufacturer: "HP",
      max_power_w: 800,
      idle_power_w: 160,
      avg_utilization_percent: 65,
      peak_utilization_percent: 95,
      form_factor: "2U",
      max_airflow_cfm: 280,
    },
    {
      id: 3,
      name: "Cisco UCS C240 M5",
      manufacturer: "Cisco",
      max_power_w: 850,
      idle_power_w: 170,
      avg_utilization_percent: 60,
      peak_utilization_percent: 90,
      form_factor: "2U",
      max_airflow_cfm: 300,
    },
    {
      id: 4,
      name: "Lenovo ThinkSystem SR650",
      manufacturer: "Lenovo",
      max_power_w: 700,
      idle_power_w: 140,
      avg_utilization_percent: 55,
      peak_utilization_percent: 85,
      form_factor: "2U",
      max_airflow_cfm: 240,
    },
    {
      id: 5,
      name: "Supermicro SuperServer 2029U",
      manufacturer: "Supermicro",
      max_power_w: 900,
      idle_power_w: 180,
      avg_utilization_percent: 70,
      peak_utilization_percent: 95,
      form_factor: "2U",
      max_airflow_cfm: 320,
    },
  ];

  // Fetch servers from database
  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoading(true);
        console.log('🔍 [SERVERS] Fetching servers from Supabase...');
        
        const { data, error } = await supabase
          .from("servers")
          .select("*")
          .order("name", { ascending: true });

        if (error) {
          console.warn('⚠️ [SERVERS] Supabase error:', error.message);
          console.log('🔄 [SERVERS] Using fallback server data');
          setServers(fallbackServers);
          setError(null); // Don't show error to user, just use fallback
        } else {
          console.log('✅ [SERVERS] Loaded', data?.length || 0, 'servers from Supabase');
          setServers(data || fallbackServers);
        }
        
        // Set default server if none selected
        const serverList = data || fallbackServers;
        if (!serverType && serverList && serverList.length > 0) {
          setServerType(serverList[0].id);
          console.log('✅ [SERVERS] Default server selected:', serverList[0].name);
        }
      } catch (err: any) {
        console.error("❌ [SERVERS] Error fetching servers:", err);
        console.log('🔄 [SERVERS] Using fallback server data');
        setServers(fallbackServers);
        setError(null); // Don't show error to user, just use fallback
        
        // Set default server
        if (!serverType && fallbackServers.length > 0) {
          setServerType(fallbackServers[0].id);
        }
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

  // ✅ AUTO-CALCULATE: Airflow based on server count and specifications
  // Must be defined AFTER selectedServer to avoid initialization errors
  const maxAirflowCapacity = useMemo(() => {
    if (selectedServer && totalServers > 0) {
      // Calculate required airflow based on server specifications
      // Rule of thumb: 150-200 CFM per server (depending on power density)
      const cfmPerServer = selectedServer.max_airflow_cfm || 180; // Use server's max airflow or default
      const calculatedCFM = totalServers * cfmPerServer;
      
      // Add 20% safety margin
      const airflowWithMargin = calculatedCFM * 1.2;
      
      console.log(`🌀 Auto-calculated airflow: ${totalServers} servers × ${cfmPerServer} CFM/server × 1.2 margin = ${airflowWithMargin.toFixed(0)} CFM`);
      
      return Math.round(airflowWithMargin);
    }
    
    // Fallback to config or default
    return currentConfig?.maxAirflowCapacity || 9000;
  }, [selectedServer, totalServers, currentConfig?.maxAirflowCapacity]);

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

  // Sync weatherData from currentConfig when it changes
  useEffect(() => {
    if (currentConfig?.weatherData && currentConfig.weatherData.length > 0) {
      console.log('🔄 [SYNC] Restoring weatherData from currentConfig:', currentConfig.weatherData.length, 'rows');
      setWeatherData(currentConfig.weatherData);
      setCsvSuccess(true);
    }
  }, [currentConfig?.weatherData]);

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

    console.log('📁 [CSV] File selected:', file.name);

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
        console.log('📄 [CSV] File content length:', text.length);
        console.log('📄 [CSV] First 200 chars:', text.substring(0, 200));
        
        const lines = text.split('\n').filter(line => line.trim());
        
        console.log('📄 [CSV] Total lines:', lines.length);
        
        if (lines.length < 2) {
          setCsvError('CSV file is empty or invalid');
          return;
        }

        // Parse header - normalize column names
        const rawHeader = lines[0].split(',').map(h => h.trim());
        console.log('📋 [CSV] Raw headers:', rawHeader);
        
        const header = rawHeader.map(h => h.toLowerCase().replace(/\s+/g, '_'));
        console.log('📋 [CSV] Normalized headers:', header);
        
        // Map flexible column names to standard names
        const columnMap: any = {};
        header.forEach((col, i) => {
          console.log(`🔍 [CSV] Checking column ${i}: "${col}"`);
          
          // Temperature columns
          if (col.includes('dry_bulb') || col.includes('drybulb') || col.includes('temp') || col.includes('drytemp')) {
            columnMap.dry_bulb_c = i;
            console.log(`✅ [CSV] Found temperature column at index ${i}: "${rawHeader[i]}"`);
          }
          // Humidity columns
          if (col.includes('relative_h') || col.includes('humidity') || col.includes('rh') || col.includes('relativehumidity')) {
            columnMap.relative_humidity = i;
            console.log(`✅ [CSV] Found humidity column at index ${i}: "${rawHeader[i]}"`);
          }
          // Pressure columns (optional)
          if (col.includes('pressure')) {
            columnMap.pressure = i;
            console.log(`✅ [CSV] Found pressure column at index ${i}: "${rawHeader[i]}"`);
          }
          // Wind speed columns (optional)
          if (col.includes('wind')) {
            columnMap.wind_speed = i;
            console.log(`✅ [CSV] Found wind speed column at index ${i}: "${rawHeader[i]}"`);
          }
          // Hour column (optional)
          if (col.includes('hour') || col === 'h') {
            columnMap.hour = i;
            console.log(`✅ [CSV] Found hour column at index ${i}: "${rawHeader[i]}"`);
          }
        });
        
        console.log('🗺️ [CSV] Column map:', columnMap);
        
        // Validate required columns
        if (columnMap.dry_bulb_c === undefined) {
          setCsvError('Missing required column: dry_bulb or temperature column. Found columns: ' + rawHeader.join(', '));
          return;
        }
        if (columnMap.relative_humidity === undefined) {
          setCsvError('Missing required column: relative_humidity or RH column. Found columns: ' + rawHeader.join(', '));
          return;
        }

        console.log('✅ [CSV] Required columns found, parsing data rows...');

        // Parse data rows
        let cappedCount = 0;
        const data = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          
          // Get hour (auto-generate if missing)
          const hour = columnMap.hour !== undefined 
            ? parseFloat(values[columnMap.hour])
            : index; // Auto-generate hour number starting from 0
          
          // Get required values
          const dryBulb = parseFloat(values[columnMap.dry_bulb_c]);
          const humidity = parseFloat(values[columnMap.relative_humidity]);

          // Validate data types
          if (isNaN(hour) || isNaN(dryBulb) || isNaN(humidity)) {
            throw new Error(`Invalid data at row ${index + 2}: hour=${hour}, temp=${dryBulb}, humidity=${humidity}`);
          }

          // Validate ranges (allow humidity up to 105% to handle measurement errors, then cap at 100%)
          if (humidity < 0 || humidity > 105) {
            throw new Error(`Invalid humidity at row ${index + 2}: ${humidity}% (must be 0-105)`);
          }
          if (dryBulb < -50 || dryBulb > 60) {
            throw new Error(`Invalid temperature at row ${index + 2}: ${dryBulb}°C (must be -50 to 60)`);
          }

          // Cap humidity at 100% for calculations
          const cappedHumidity = Math.min(humidity, 100);
          if (humidity > 100) {
            cappedCount++;
          }

          // Get optional values
          const pressure = columnMap.pressure !== undefined 
            ? parseFloat(values[columnMap.pressure]) * 1000 // Convert kPa to Pa if needed
            : 101325; // Standard atmospheric pressure in Pa
          
          const windSpeed = columnMap.wind_speed !== undefined 
            ? parseFloat(values[columnMap.wind_speed])
            : 0;

          return {
            hour,
            dry_bulb_c: dryBulb,
            relative_humidity: cappedHumidity,
            pressure_pa: pressure,
            wind_speed_ms: windSpeed,
          };
        });

        console.log('✅ [CSV] Parsed', data.length, 'data rows');
        console.log('✅ [CSV] Sample data (first 3 rows):', data.slice(0, 3));
        
        if (cappedCount > 0) {
          console.log(`⚠️ [CSV] ${cappedCount} humidity values were capped from >100% to 100%`);
        }

        setWeatherData(data);
        setCsvSuccess(true);
        setCsvError(null);
        console.log('✅ [CSV] Weather data parsed successfully:', data.length, 'rows');
        console.log('✅ [CSV] Sample data:', data.slice(0, 3));
        console.log('✅ [CSV] Calling onConfigChange with weatherData');
      } catch (err: any) {
        console.error('❌ [CSV] Parsing error:', err);
        setCsvError(err.message || 'Failed to parse CSV file');
        setCsvSuccess(false);
      }
    };

    reader.onerror = () => {
      console.error('❌ [CSV] File read error');
      setCsvError('Failed to read file');
      setCsvSuccess(false);
    };

    reader.readAsText(file);
  };

  useEffect(() => {
    if (selectedServer) {
      // Auto-calculate rack power density if set to 0
      const calculatedRackDensity = rackPowerDensity === 0 
        ? (totalServers / numberOfRacks) * selectedServer.max_power_w / 1000
        : rackPowerDensity;

      // Calculate effective emissions factor for market-based accounting
      const effectiveEmissionsFactor = emissionsAccountingMethod === "market_based"
        ? gridEmissionsFactor * (1 - renewableEnergyPercentage / 100)
        : gridEmissionsFactor;

      // 🔍 DEBUG: Log weatherData before calling onConfigChange
      console.log('🔍 [USEEFFECT] useEffect triggered');
      console.log('🔍 [USEEFFECT] weatherData state:', weatherData?.length || 0, 'rows');
      if (weatherData && weatherData.length > 0) {
        console.log('✅ [USEEFFECT] Weather data exists, sample:', weatherData.slice(0, 2));
      } else {
        console.log('⚠️ [USEEFFECT] No weather data in state');
      }

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
        workloadType,
        averageITUtilization,
        peakITUtilization,
        rackPowerDensity: calculatedRackDensity,
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
        electricityRate,
        waterRate,
        gridEmissionsFactor,
        effectiveEmissionsFactor,
        annualElectricityInflation,
        annualWaterInflation,
        carbonPrice,
        carbonPriceGrowth,
        emissionsAccountingMethod,
        renewableEnergyPercentage,
        scenarioType,
        temperatureOffset,
        humidityAdjustment,
      });
    }
  }, [
    totalServers,
    serversPerRack,
    numberOfRacks,
    serverType,
    selectedServer,
    powerUtilizationModel,
    workloadType,
    averageITUtilization,
    peakITUtilization,
    rackPowerDensity,
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
    electricityRate,
    waterRate,
    gridEmissionsFactor,
    annualElectricityInflation,
    annualWaterInflation,
    carbonPrice,
    carbonPriceGrowth,
    emissionsAccountingMethod,
    renewableEnergyPercentage,
    scenarioType,
    temperatureOffset,
    humidityAdjustment,
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

          {/* AI Workload Module Section */}
          <div className="md:col-span-2 mt-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              🔹 AI Workload Module
            </h3>
          </div>

          {/* Workload Type Dropdown */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              🔹 Workload Type
            </label>
            <select
              value={workloadType}
              onChange={(e) => setWorkloadType(e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="traditional">Traditional IT</option>
              <option value="ai_training">AI Training</option>
              <option value="ai_inference">AI Inference</option>
              <option value="mixed_ai">Mixed AI + Traditional</option>
            </select>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Select workload type to determine power profile and cooling requirements
            </p>
          </div>

          {/* Average IT Utilization */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              4️⃣ Average IT Utilization (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                value={averageITUtilization}
                onChange={(e) => setAverageITUtilization(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <input
                type="number"
                min={10}
                max={100}
                step={1}
                value={averageITUtilization}
                onChange={(e) => setAverageITUtilization(Number(e.target.value))}
                className={`w-24 p-2 border rounded-lg text-center ${
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
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>10% (Light)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>60% (Default)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>100% (Heavy)</span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Average server utilization over time
            </p>
          </div>

          {/* Peak IT Utilization */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              5️⃣ Peak Utilization (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={peakITUtilization}
                onChange={(e) => setPeakITUtilization(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <input
                type="number"
                min={50}
                max={100}
                step={1}
                value={peakITUtilization}
                onChange={(e) => setPeakITUtilization(Number(e.target.value))}
                className={`w-24 p-2 border rounded-lg text-center ${
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
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>50%</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>90% (Default)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>100%</span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Maximum server utilization during peak periods
            </p>
          </div>

          {/* Server Type Dropdown */}
          <div className="md:col-span-2 mt-6">
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

          {/* Rack Power Density */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              6️⃣ Rack Power Density (kW per rack)
            </label>
            <input
              type="number"
              min={5}
              max={150}
              step={0.1}
              value={rackPowerDensity === 0 && selectedServer 
                ? ((totalServers / numberOfRacks) * selectedServer.max_power_w / 1000).toFixed(1)
                : rackPowerDensity}
              onChange={(e) => setRackPowerDensity(Number(e.target.value))}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {rackPowerDensity === 0 
                ? "Auto-calculated based on server configuration" 
                : "Manual override - used to determine air/evap feasibility"}
            </p>
          </div>

          {/* Rack Density Warning */}
          {selectedServer && (
            <div className="md:col-span-2">
              {(() => {
                const calculatedDensity = rackPowerDensity === 0 
                  ? (totalServers / numberOfRacks) * selectedServer.max_power_w / 1000
                  : rackPowerDensity;
                
                if (calculatedDensity >= 80) {
                  return (
                    <div className={`p-3 rounded-lg flex items-start ${
                      isDark
                        ? "bg-red-900/20 border border-red-500"
                        : "bg-red-50 border border-red-300"
                    }`}>
                      <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>
                        <div className="font-semibold">⚠️ High Rack Density: {calculatedDensity.toFixed(1)} kW/rack</div>
                        <div className="mt-1">
                          Liquid cooling recommended for densities ≥80 kW/rack. Air/evaporative cooling may be insufficient.
                        </div>
                      </div>
                    </div>
                  );
                } else if (calculatedDensity >= 40) {
                  return (
                    <div className={`p-3 rounded-lg flex items-start ${
                      isDark
                        ? "bg-yellow-900/20 border border-yellow-500"
                        : "bg-yellow-50 border border-yellow-300"
                    }`}>
                      <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className={`text-sm ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>
                        <div className="font-semibold">⚠️ Moderate Rack Density: {calculatedDensity.toFixed(1)} kW/rack</div>
                        <div className="mt-1">
                          Air/evaporative cooling under stress at 40-50 kW/rack. Monitor inlet temperatures closely.
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className={`p-3 rounded-lg flex items-start ${
                      isDark
                        ? "bg-green-900/20 border border-green-500"
                        : "bg-green-50 border border-green-300"
                    }`}>
                      <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div className={`text-sm ${isDark ? "text-green-400" : "text-green-600"}`}>
                        <div className="font-semibold">✓ Normal Rack Density: {calculatedDensity.toFixed(1)} kW/rack</div>
                        <div className="mt-1">
                          Air/evaporative cooling is suitable for this density level.
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* Auto-calculated Airflow Display */}
          {selectedServer && totalServers > 0 && (
            <div className="md:col-span-2">
              <div className={`p-4 rounded-lg border ${
                isDark 
                  ? "bg-blue-900/20 border-blue-700/30" 
                  : "bg-blue-50 border-blue-200"
              }`}>
                <div className="flex items-start gap-3">
                  <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    isDark ? "text-blue-400" : "text-blue-600"
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className={`text-sm ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                    <div className="font-semibold mb-1">
                      🌀 Auto-Calculated Airflow: {maxAirflowCapacity.toLocaleString()} CFM
                    </div>
                    <div className="text-xs opacity-90">
                      Based on {totalServers} servers × {selectedServer.max_airflow_cfm || 180} CFM/server × 1.2 safety margin
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              Required: dry_bulb (°C), relative_humidity (%) | Optional: hour, pressure, wind_speed
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

          {/* 2030 Scenario Controls Section */}
          <div className="md:col-span-2 mt-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              🔹 Future Scenario Settings (2025–2030)
            </h3>
          </div>

          {/* Scenario Type Dropdown */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              1️⃣ Scenario Type
            </label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="baseline_2025">Baseline (2025)</option>
              <option value="moderate_growth_2030">Moderate Growth (2030)</option>
              <option value="ai_growth">AI Growth</option>
              <option value="energy_carbon_pressure">Energy & Carbon Pressure</option>
            </select>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Select future scenario for 2025-2030 projections
            </p>
          </div>

          {/* Temperature Offset */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              2️⃣ Temperature Offset (°C)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={-2}
                max={4}
                step={0.1}
                value={temperatureOffset}
                onChange={(e) => setTemperatureOffset(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <input
                type="number"
                min={-2}
                max={4}
                step={0.1}
                value={temperatureOffset}
                onChange={(e) => setTemperatureOffset(Number(e.target.value))}
                className={`w-24 p-2 border rounded-lg text-center ${
                  isDark
                    ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                °C
              </span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>-2°C (Cooler)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>+1°C (Default)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>+4°C (Warmer)</span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Average climate warming adjustment applied to all hourly weather data
            </p>
          </div>

          {/* Relative Humidity Adjustment */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              3️⃣ Relative Humidity Adjustment (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={-10}
                max={10}
                step={1}
                value={humidityAdjustment}
                onChange={(e) => setHumidityAdjustment(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <input
                type="number"
                min={-10}
                max={10}
                step={1}
                value={humidityAdjustment}
                onChange={(e) => setHumidityAdjustment(Number(e.target.value))}
                className={`w-24 p-2 border rounded-lg text-center ${
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
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>-10% (Drier)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>0% (Default)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>+10% (Humid)</span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Adjusts ambient humidity to simulate climate shift
            </p>
          </div>

          {/* Scenario Description Box */}
          <div className="md:col-span-2">
            <div
              className={`p-4 rounded-lg ${
                isDark ? "bg-[#0f1425] border border-[#3f4a68]" : "bg-blue-50 border border-blue-200"
              }`}
            >
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className={`text-sm ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                  <div className="font-semibold mb-1">
                    {scenarioType === "baseline_2025" && "Baseline (2025) - Current conditions"}
                    {scenarioType === "moderate_growth_2030" && "Moderate Growth (2030) - 5% annual IT load growth"}
                    {scenarioType === "ai_growth" && "AI Growth - 25% annual growth, 1.5x rack density"}
                    {scenarioType === "energy_carbon_pressure" && "Energy & Carbon Pressure - Carbon tax escalation, grid decarbonization"}
                  </div>
                  <div className="text-xs">
                    {scenarioType === "baseline_2025" && "Standard projection with modest growth assumptions"}
                    {scenarioType === "moderate_growth_2030" && "Typical enterprise data center growth trajectory"}
                    {scenarioType === "ai_growth" && "High-density AI/ML workloads with increased cooling demands"}
                    {scenarioType === "energy_carbon_pressure" && "Rising energy costs and carbon regulations impact OPEX"}
                  </div>
                </div>
              </div>
            </div>
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

          {/* Cost & Environmental Impact Section */}
          <div className="md:col-span-2 mt-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              Cost & Environmental Impact
            </h3>
          </div>

          {/* Electricity Rate */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Electricity Rate ($/kWh)
            </label>
            <input
              type="number"
              min={0.01}
              max={1.0}
              step={0.01}
              value={electricityRate}
              onChange={(e) => setElectricityRate(Number(e.target.value))}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Local electricity cost per kilowatt-hour (US avg: $0.12)
            </p>
          </div>

          {/* Water Rate */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Water Rate ($/L)
            </label>
            <input
              type="number"
              min={0.0001}
              max={0.01}
              step={0.0001}
              value={waterRate}
              onChange={(e) => setWaterRate(Number(e.target.value))}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Local water cost per liter (Municipal avg: $0.001)
            </p>
          </div>

          {/* Grid Emissions Factor */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Grid Emissions Factor (kg CO₂/kWh)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.01}
                value={gridEmissionsFactor}
                onChange={(e) => setGridEmissionsFactor(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <input
                type="number"
                min={0.1}
                max={1.0}
                step={0.01}
                value={gridEmissionsFactor}
                onChange={(e) => setGridEmissionsFactor(Number(e.target.value))}
                className={`w-24 p-2 border rounded-lg text-center ${
                  isDark
                    ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                kg CO₂/kWh
              </span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>0.1 (Clean)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>0.45 (Mixed)</span>
              <span className={isDark ? "text-gray-500" : "text-gray-500"}>1.0 (Coal)</span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Carbon intensity of local electricity grid (US avg: 0.45)
            </p>
          </div>

          {/* Financial Escalation Section */}
          <div className="md:col-span-2 mt-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              🔹 Financial Projection (2025–2030)
            </h3>
          </div>

          {/* Annual Electricity Inflation */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              7️⃣ Annual Electricity Inflation (%)
            </label>
            <input
              type="number"
              min={0}
              max={15}
              step={0.1}
              value={annualElectricityInflation}
              onChange={(e) => setAnnualElectricityInflation(Number(e.target.value))}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Range: 0-15% | Default: 4% | Annual electricity cost escalation rate
            </p>
          </div>

          {/* Annual Water Cost Inflation */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              8️⃣ Annual Water Cost Inflation (%)
            </label>
            <input
              type="number"
              min={0}
              max={15}
              step={0.1}
              value={annualWaterInflation}
              onChange={(e) => setAnnualWaterInflation(Number(e.target.value))}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Range: 0-15% | Default: 3% | Annual water cost escalation rate
            </p>
          </div>

          {/* Carbon Price */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              9️⃣ Carbon Price ($ per ton CO₂)
            </label>
            <input
              type="number"
              min={0}
              max={200}
              step={1}
              value={carbonPrice}
              onChange={(e) => setCarbonPrice(Number(e.target.value))}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Range: 0-200 | Default: $50 | Optional regulatory carbon cost applied to emissions
            </p>
          </div>

          {/* Carbon Price Growth */}
          <div>
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              🔟 Carbon Price Growth (% per year)
            </label>
            <input
              type="number"
              min={0}
              max={15}
              step={0.1}
              value={carbonPriceGrowth}
              onChange={(e) => setCarbonPriceGrowth(Number(e.target.value))}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Range: 0-15% | Default: 5% | Annual carbon price escalation rate
            </p>
          </div>

          {/* Carbon Accounting Mode Section */}
          <div className="md:col-span-2 mt-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              🔹 Carbon Accounting Mode
            </h3>
          </div>

          {/* Emissions Accounting Method */}
          <div className="md:col-span-2">
            <label
              className={`block mb-2 font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              1️⃣1️⃣ Emissions Accounting Method
            </label>
            <select
              value={emissionsAccountingMethod}
              onChange={(e) => setEmissionsAccountingMethod(e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="location_based">Location-Based (Grid Average)</option>
              <option value="market_based">Market-Based (Renewable PPA / REC adjusted)</option>
            </select>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Location-Based uses grid average emissions | Market-Based accounts for renewable energy purchases
            </p>
          </div>

          {/* Renewable Energy Percentage (conditional) */}
          {emissionsAccountingMethod === "market_based" && (
            <div className="md:col-span-2">
              <label
                className={`block mb-2 font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                1️⃣2️⃣ Renewable Energy Percentage (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={renewableEnergyPercentage}
                  onChange={(e) => setRenewableEnergyPercentage(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={renewableEnergyPercentage}
                  onChange={(e) => setRenewableEnergyPercentage(Number(e.target.value))}
                  className={`w-24 p-2 border rounded-lg text-center ${
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
                <span className={isDark ? "text-gray-500" : "text-gray-500"}>0% (No Renewables)</span>
                <span className={isDark ? "text-gray-500" : "text-gray-500"}>50%</span>
                <span className={isDark ? "text-gray-500" : "text-gray-500"}>100% (Fully Renewable)</span>
              </div>
              <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Percentage of electricity from renewable sources (PPA, RECs, on-site generation)
              </p>
            </div>
          )}

          {/* Market-Based Emissions Info Box */}
          {emissionsAccountingMethod === "market_based" && (
            <div className="md:col-span-2">
              <div
                className={`p-4 rounded-lg ${
                  isDark ? "bg-[#0f1425] border border-[#3f4a68]" : "bg-green-50 border border-green-200"
                }`}
              >
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className={`text-sm ${isDark ? "text-green-400" : "text-green-700"}`}>
                    <div className="font-semibold mb-1">Market-Based Accounting Active</div>
                    <div className="text-xs">
                      Emissions will be calculated as: Grid Emissions × (1 - Renewable %) = {gridEmissionsFactor.toFixed(2)} × {(1 - renewableEnergyPercentage / 100).toFixed(2)} = {(gridEmissionsFactor * (1 - renewableEnergyPercentage / 100)).toFixed(3)} kg CO₂/kWh
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default EvaporativeCoolingForm;
