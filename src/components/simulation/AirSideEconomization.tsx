// AirSideEconomization.tsx - COMPLETE CORRECTED VERSION WITH DARK MODE FIXES
import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  Zap,
  Wind,
  DollarSign,
  TrendingDown,
  AlertCircle,
  Cloud,
  BarChart3,
  Server as ServerIcon,
  Cpu,
  HardDrive,
  MemoryStick,
  Clock,
} from "lucide-react";

// Import Supabase
import { supabase } from "../../lib/supabase";
import { useSimulationStore } from "../../store/store";
import WeatherLocationPicker from "./WeatherLocationPicker";

// Define interfaces for fetched data
interface Server {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  max_power_w: number;
  idle_power_w: number;
  typical_power_w: number;
  form_factor: string;
  cooling_type: string;
  typical_utilization: number;
  cpu_type: string;
  memory_gb: number;
  storage_tb: number;
  release_year: number;
  efficiency_rating: string;
  avg_utilization_percent?: number;
  peak_utilization_percent?: number;
  weight_kg?: number;
  dimensions?: string;
}

interface CountryTariff {
  id: string;
  country_name: string;
  electricity_tariff: number;
  co2_grid_factor: number;
}

interface FanParameter {
  id: string;
  param_group: string;
  param_key: string;
  display_name: string;
  min_value: number;
  max_value: number;
  unit: string;
  status_label: string;
  description: string;
}

interface AirSideEconomizationProps {
  serverType?: string;
  numberOfRacks?: number;
  serversPerRack?: number;
  averageUtilization?: number;
  peakUtilization?: number;
  fans?: { bestFans: number; averageFans: number; oldFans: number };
  region?: string;
  onConfigChange?: (config: any) => void;
  locationData?: Array<{
    timestamp: string;
    temperature: number;
    humidity: number;
  }>;
  countryId?: string;
  serverId?: string;
  isDark?: boolean;
  isTransitioning?: boolean;
}

const AirSideEconomization: React.FC<AirSideEconomizationProps> = ({
  serverType = "",
  numberOfRacks = 5,
  serversPerRack = 10,
  averageUtilization = 45,
  peakUtilization = 85,
  fans: initialFans = { bestFans: 2, averageFans: 4, oldFans: 0 },
  region = "",
  onConfigChange,
  locationData,
  countryId = "",
  serverId = "",
  isDark = false,
  isTransitioning = false,
}) => {
  // New physical fields state
  const [supplyAirTemp, setSupplyAirTemp] = useState(18.0); // °C, default
  const [returnAirTemp, setReturnAirTemp] = useState(30.0); // °C, default
  const [airflowCFM, setAirflowCFM] = useState(2000); // CFM, default
  const [deltaT, setDeltaT] = useState(12.0); // °C, default (return - supply)
  const [servers, setServers] = useState<Server[]>([]);
  const [countries, setCountries] = useState<CountryTariff[]>([]);
  const [fanParameters, setFanParameters] = useState<FanParameter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);

  // Zustand store updater
  const updateSimulationInput = useSimulationStore(
    (state) => state.updateSimulationInput,
  );

  // Initialize from props
  const [selectedCountryId, setSelectedCountryId] = useState<string>(
    countryId || "",
  );

  const [error, setError] = useState<string>("");

  // Local state
  const [localServerType, setLocalServerType] = useState<string>(
    serverId || serverType || "",
  );
  const [localNumberOfRacks, setLocalNumberOfRacks] = useState(numberOfRacks);
  const [localServersPerRack, setLocalServersPerRack] =
    useState(serversPerRack);
  // Dynamically set utilization from selected server
  const [localAvgUtil, setLocalAvgUtil] = useState(
    selectedServer?.avg_utilization_percent ?? averageUtilization,
  );
  const [localPeakUtil, setLocalPeakUtil] = useState(
    selectedServer?.peak_utilization_percent ?? peakUtilization,
  );

  // Update utilization when selectedServer changes
  useEffect(() => {
    if (selectedServer) {
      setLocalAvgUtil(Number(selectedServer.avg_utilization_percent) || 0);
      setLocalPeakUtil(Number(selectedServer.peak_utilization_percent) || 0);
    }
  }, [selectedServer]);
  const [localFans, setLocalFans] = useState(initialFans);

  // Fan efficiency from database parameters
  const [bestFanEfficiency, setBestFanEfficiency] = useState(0.35);
  const [avgFanEfficiency, setAvgFanEfficiency] = useState(0.6);
  const [oldFanEfficiency, setOldFanEfficiency] = useState(1.0);

  const [localLocationData, setLocalLocationData] = useState<any[]>([]);

  // ========================================================================
  // CLOUDSIM PARAMETERS (enableCloudSim hardcoded to true in store)
  // ========================================================================
  const [aiWorkloadMode, setAiWorkloadMode] = useState<string>("AI_TRAINING");
  const [computeIntensityFactor, setComputeIntensityFactor] = useState(1.2);

  // Simulation Duration (for demo purposes)
  const [simulationDuration, setSimulationDuration] = useState<number>(730); // Default: 1 month

  // Advanced Economizer Controls (Optional)
  const [economizerMaxOutdoorTemp, setEconomizerMaxOutdoorTemp] = useState(24); // °C, default 24
  const [economizerMaxHumidity, setEconomizerMaxHumidity] = useState(60); // %, default 60
  const [minOutdoorAirFraction, setMinOutdoorAirFraction] = useState(0.2); // default 0.2

  // Mechanical Cooling COP
  const [mechanicalCOP] = useState(5.0); // default 5.0

  // Economic Parameters (CAPEX)
  const [capexPerCFM] = useState(2.5); // $/CFM, default 2.5
  const [fixedEconomizerCapex] = useState(20000); // $, default 20000

  // ========================================================================
  // FINANCIAL PROJECTION PARAMETERS (2025-2030)
  // ========================================================================
  const [annualElectricityInflation, setAnnualElectricityInflation] = useState<number>(3.5); // %, default 3.5%
  const [carbonPrice, setCarbonPrice] = useState<number>(126.0); // $/ton CO2, EU 2030 target
  const [carbonPriceGrowth, setCarbonPriceGrowth] = useState<number>(15.0); // %/year, default 15%
  const [temperatureOffset, setTemperatureOffset] = useState<number>(0.0); // °C over 5 years, climate change impact
  const [forecastYears] = useState<number>(5); // Fixed 5-year projection (2025-2030)

  const lastSentRef = useRef<string>("");
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update selectedCountryId when countryId prop changes
  useEffect(() => {
    if (countryId && countryId !== selectedCountryId) {
      setSelectedCountryId(countryId);
    }
  }, [countryId]);

  // Update server selection when serverId prop changes
  useEffect(() => {
    if (serverId && serverId !== localServerType) {
      setLocalServerType(serverId);
    }
  }, [serverId]);

  // Handle incoming serverType prop (for backward compatibility)
  useEffect(() => {
    if (!serverType || !servers.length) return;

    // Only process if we don't already have a serverId prop
    if (!serverId) {
      let match = servers.find((s) => String(s.id) === String(serverType));

      if (!match) {
        match = servers.find((s) => s.name === serverType);
      }

      if (!match) {
        match = servers.find(
          (s) =>
            `${s.manufacturer} - ${s.name} (${s.model || "Standard"})` ===
            serverType,
        );
      }

      if (match) {
        setLocalServerType(match.id);
      } else {
        setLocalServerType("");
      }
    }
  }, [serverType, servers, serverId]);

  // Server selection
  useEffect(() => {
    if (!localServerType) {
      setSelectedServer(null);
      return;
    }

    const server = servers.find(
      (s) => String(s.id) === String(localServerType),
    );

    if (server) {
      setSelectedServer(server);
    } else {
      setSelectedServer(null);
    }
  }, [localServerType, servers]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      setError(""); // Clear any previous errors
      await Promise.all([
        fetchServers(),
        fetchCountries(),
        fetchFanParameters(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      // Don't set error here - let individual fetch functions handle it
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from("servers")
        .select("*")
        .order("manufacturer")
        .order("name");

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Failed to fetch servers: ${error.message}`);
      }

      if (data) {
        console.log("Number of rows returned from servers table:", data.length);
      }

      if (data && data.length > 0) {
        console.log(`✅ Loaded ${data.length} servers from database`);
        setServers(data);

        // If we have a serverId prop, try to select it
        if (serverId) {
          const server = data.find((s) => String(s.id) === String(serverId));
          if (server) {
            setSelectedServer(server);
          }
        }
      } else {
        console.warn("⚠️ No servers in database, using fallback defaults");
        useFallbackData();
      }
    } catch (error) {
      console.error("❌ Error fetching servers, using fallback defaults:", error);
      useFallbackData();
    }
  };
  
  const useFallbackData = () => {
    // Safe default server configurations
    const fallbackServers: Server[] = [
      {
        id: "fallback-1",
        name: "Standard Server",
        manufacturer: "Generic",
        model: "2U Rack Server",
        max_power_w: 750,
        idle_power_w: 150,
        typical_power_w: 450,
        form_factor: "2U",
        cooling_type: "Air-cooled",
        typical_utilization: 45,
        cpu_type: "Intel Xeon",
        memory_gb: 256,
        storage_tb: 4,
        release_year: 2022,
        efficiency_rating: "80 Plus Platinum",
        avg_utilization_percent: 45,
        peak_utilization_percent: 85,
      },
      {
        id: "fallback-2",
        name: "High-Performance Server",
        manufacturer: "Generic",
        model: "2U HPC Server",
        max_power_w: 1200,
        idle_power_w: 200,
        typical_power_w: 700,
        form_factor: "2U",
        cooling_type: "Air-cooled",
        typical_utilization: 60,
        cpu_type: "Intel Xeon Scalable",
        memory_gb: 512,
        storage_tb: 8,
        release_year: 2023,
        efficiency_rating: "80 Plus Titanium",
        avg_utilization_percent: 60,
        peak_utilization_percent: 95,
      },
    ];
    
    const fallbackCountries: CountryTariff[] = [
      { id: "fallback-us", country_name: "United States", electricity_tariff: 0.15, co2_grid_factor: 0.055 },
      { id: "fallback-de", country_name: "Germany", electricity_tariff: 0.35, co2_grid_factor: 0.045 },
      { id: "fallback-cn", country_name: "China", electricity_tariff: 0.08, co2_grid_factor: 0.065 },
    ];
    
    const fallbackFanParams: FanParameter[] = [
      {
        id: "fallback-best",
        param_group: "fan_efficiency",
        param_key: "best_fan",
        display_name: "Best-in-class Fans",
        min_value: 0.30,
        max_value: 0.40,
        unit: "W/CFM",
        status_label: "Excellent",
        description: "High-efficiency EC fans with VFD",
      },
      {
        id: "fallback-avg",
        param_group: "fan_efficiency",
        param_key: "average_fan",
        display_name: "Average Fans",
        min_value: 0.50,
        max_value: 0.70,
        unit: "W/CFM",
        status_label: "Good",
        description: "Standard fans with VFD",
      },
      {
        id: "fallback-legacy",
        param_group: "fan_efficiency",
        param_key: "legacy_fan",
        display_name: "Legacy Fans",
        min_value: 0.80,
        max_value: 1.20,
        unit: "W/CFM",
        status_label: "Poor",
        description: "Old constant-speed fans",
      },
    ];
    
    setServers(fallbackServers);
    setCountries(fallbackCountries);
    setFanParameters(fallbackFanParams);
    
    // Auto-select first server and country
    if (fallbackServers.length > 0) {
      setLocalServerType(fallbackServers[0].id);
      setSelectedServer(fallbackServers[0]);
    }
    if (fallbackCountries.length > 0) {
      setSelectedCountryId(fallbackCountries[0].id);
    }
    
    // Set fan efficiencies
    setBestFanEfficiency(0.35);
    setAvgFanEfficiency(0.6);
    setOldFanEfficiency(1.0);
    
    console.log("✅ Loaded fallback data successfully");
  };

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from("tariff_carbon")
        .select("id, country_name, electricity_tariff, co2_grid_factor")
        .order("country_name");

      if (error) {
        console.warn("⚠️ Supabase countries error, will use fallback if needed:", error);
        return; // Let useFallbackData handle it
      }

      if (data && data.length > 0) {
        const normalized: CountryTariff[] = data.map((row) => ({
          id: String(row.id),
          country_name: row.country_name,
          electricity_tariff: Number(row.electricity_tariff ?? 0),
          co2_grid_factor: Number(row.co2_grid_factor ?? 0),
        }));

        console.log(`✅ Loaded ${normalized.length} countries from database`);
        setCountries(normalized);

        // If we have a countryId prop, verify it exists
        if (countryId) {
          const country = normalized.find(
            (c) => String(c.id) === String(countryId),
          );
          if (!country) {
            console.warn(`Country with ID ${countryId} not found in database`);
          }
        }
      } else {
        console.warn("⚠️ No countries found in tariff_carbon table");
      }
    } catch (error) {
      console.warn("⚠️ Error fetching countries, will use fallback if needed:", error);
    }
  };

  const fetchFanParameters = async () => {
    try {
      const { data, error } = await supabase
        .from("parameter")
        .select(
          "id, param_group, param_key, display_name, min_value, max_value, unit, status_label, description",
        )
        .eq("param_group", "fan_efficiency")
        .order("id");

      if (error) {
        console.warn("⚠️ Supabase fan parameters error, will use fallback if needed:", error);
        return; // Let useFallbackData handle it
      }

      if (data && data.length > 0) {
        const normalized: FanParameter[] = data.map((row) => ({
          id: String(row.id),
          param_group: row.param_group,
          param_key: row.param_key,
          display_name: row.display_name,
          min_value: Number(row.min_value ?? 0),
          max_value: Number(row.max_value ?? 0),
          unit: row.unit,
          status_label: row.status_label,
          description: row.description,
        }));

        setFanParameters(normalized);

        normalized.forEach((param) => {
          const key = (
            param.param_key ||
            param.display_name ||
            ""
          ).toLowerCase();
          const defaultValue =
            (param.min_value + param.max_value) / 2 ||
            param.max_value ||
            param.min_value;

          if (key.includes("best")) {
            setBestFanEfficiency(defaultValue);
          } else if (key.includes("average") || key.includes("vfd")) {
            setAvgFanEfficiency(defaultValue);
          } else if (key.includes("legacy") || key.includes("old")) {
            setOldFanEfficiency(defaultValue);
          }
        });
      }
    } catch (error) {
      console.warn("⚠️ Error fetching fan parameters, will use fallback if needed:", error);
    }
  };

  const selectedCountry = useMemo(() => {
    return countries.find((c) => String(c.id) === selectedCountryId);
  }, [countries, selectedCountryId]);

  // Handle country selection change
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountryId = e.target.value;
    setSelectedCountryId(newCountryId);

    // Notify parent component of change
    if (onConfigChange && newCountryId) {
      const country = countries.find((c) => String(c.id) === newCountryId);
      if (country) {
        onConfigChange({
          countryId: newCountryId,
          country: country.country_name,
          electricityTariff: country.electricity_tariff,
          carbon_intensity: country.co2_grid_factor, // changed to match backend
        });
      }
    }
  };

  // Handle server selection change
  const handleServerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serverId = e.target.value;

    if (!serverId) {
      setLocalServerType("");
      setSelectedServer(null);
      // Clear server fields in global state
      updateSimulationInput({
        serverMaxPowerW: undefined,
        serverIdlePowerW: undefined,
        averageUtilization: undefined,
        peakUtilization: undefined,
      });
      return;
    }

    setLocalServerType(serverId);
    const server = servers.find((s) => String(s.id) === serverId);
    if (server) {
      // Convert all relevant fields to numbers (if not null/undefined)
      const normalizedServer = {
        ...server,
        max_power_w:
          server.max_power_w !== undefined && server.max_power_w !== null
            ? Number(server.max_power_w)
            : 0,
        idle_power_w:
          server.idle_power_w !== undefined && server.idle_power_w !== null
            ? Number(server.idle_power_w)
            : 0,
        avg_utilization_percent:
          server.avg_utilization_percent !== undefined &&
          server.avg_utilization_percent !== null
            ? Number(server.avg_utilization_percent)
            : 0,
        peak_utilization_percent:
          server.peak_utilization_percent !== undefined &&
          server.peak_utilization_percent !== null
            ? Number(server.peak_utilization_percent)
            : 0,
        typical_utilization:
          server.typical_utilization !== undefined &&
          server.typical_utilization !== null
            ? Number(server.typical_utilization)
            : 0,
      };
      setSelectedServer(normalizedServer);

      // Log Supabase server values for simulation payload
      console.log("[Simulation Payload] Selected server values:", {
        max_power_w: normalizedServer.max_power_w,
        idle_power_w: normalizedServer.idle_power_w,
        avg_utilization_percent: normalizedServer.avg_utilization_percent,
        peak_utilization_percent: normalizedServer.peak_utilization_percent,
      });

      // Update Zustand store with selected server fields
      updateSimulationInput({
        serverMaxPowerW: normalizedServer.max_power_w,
        serverIdlePowerW: normalizedServer.idle_power_w,
        averageUtilization:
          normalizedServer.avg_utilization_percent ??
          normalizedServer.typical_utilization,
        peakUtilization: normalizedServer.peak_utilization_percent ?? undefined,
      });

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
          peak_utilization_percent: normalizedServer.peak_utilization_percent,
        });
      }
    }
  };

  // Handle location data upload
  const handleLocationDataUpload = (result: any) => {
    // Extract the data array from the result object
    const weatherData = result.data || result || [];
    setLocalLocationData(weatherData);
    console.log("[AirSideEconomization] Weather data loaded:", weatherData.length, "hours");
  };

  // Handle fan count changes
  const handleFanChange = useCallback(
    (type: "bestFans" | "averageFans" | "oldFans", value: number) => {
      setLocalFans((prev) => {
        const updated = {
          ...prev,
          [type]: Math.max(0, Math.min(50, value)),
        };
        console.log(`[DEBUG] Fan count changed:`, type, value, updated);
        return updated;
      });
    },
    [],
  );

  // Handle efficiency changes
  const handleEfficiencyChange = useCallback(
    (type: "best" | "average" | "old", value: number) => {
      const param = getFanParameter(type);
      const clampedValue = Math.max(param.min, Math.min(param.max, value));
      console.log(`[DEBUG] Fan efficiency changed:`, type, value, clampedValue);
      switch (type) {
        case "best":
          setBestFanEfficiency(clampedValue);
          break;
        case "average":
          setAvgFanEfficiency(clampedValue);
          break;
        case "old":
          setOldFanEfficiency(clampedValue);
          break;
      }
    },
    [fanParameters],
  );

  // Get fan parameter ranges
  const getFanParameter = (type: "best" | "average" | "old") => {
    const param = fanParameters.find((p) => {
      const key = (p.param_key || p.display_name || "").toLowerCase();
      if (type === "best") return key.includes("best");
      if (type === "average")
        return key.includes("average") || key.includes("vfd");
      return key.includes("legacy") || key.includes("old");
    });

    if (param) {
      const defaultValue =
        (param.min_value + param.max_value) / 2 ||
        param.max_value ||
        param.min_value;
      return {
        min: param.min_value,
        max: param.max_value,
        default: defaultValue,
        description: param.description,
        unit: param.unit,
      };
    }

    // Fallback defaults
    return {
      min: type === "best" ? 0.3 : type === "average" ? 0.5 : 0.8,
      max: type === "best" ? 0.4 : type === "average" ? 0.7 : 1.2,
      default: type === "best" ? 0.35 : type === "average" ? 0.6 : 1.0,
      description: "",
      unit: "W/CFM",
    };
  };

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
        perServerPower: 0,
      };
    }

    const numberOfServers = localNumberOfRacks * localServersPerRack;
    const avgPowerPerServer =
      selectedServer.typical_power_w ||
      (selectedServer.max_power_w + selectedServer.idle_power_w) / 2;
    const totalITPowerKW =
      (numberOfServers * avgPowerPerServer * localAvgUtil) / 100 / 1000;
    const estimatedCFM = numberOfServers * 20;
    const totalFans =
      localFans.bestFans + localFans.averageFans + localFans.oldFans;

    const bestFanPower =
      totalFans > 0
        ? (localFans.bestFans / totalFans) * estimatedCFM * bestFanEfficiency
        : 0;
    const avgFanPower =
      totalFans > 0
        ? (localFans.averageFans / totalFans) * estimatedCFM * avgFanEfficiency
        : 0;
    const oldFanPower =
      totalFans > 0
        ? (localFans.oldFans / totalFans) * estimatedCFM * oldFanEfficiency
        : 0;

    const totalFanPowerKW = (bestFanPower + avgFanPower + oldFanPower) / 1000;
    const totalCoolingPowerKW = totalITPowerKW + totalFanPowerKW;

    const tariff = selectedCountry?.electricity_tariff ?? 0.15;
    const carbonIntensity = selectedCountry?.co2_grid_factor ?? 0;
    const annualCostUSD = totalCoolingPowerKW * 8760 * tariff;

    return {
      numberOfServers,
      totalITPowerKW,
      totalFanPowerKW,
      totalCoolingPowerKW,
      annualCostUSD,
      tariff,
      carbonIntensity,
      perServerPower: Math.round(avgPowerPerServer),
    };
  }, [
    selectedServer,
    selectedCountry,
    localNumberOfRacks,
    localServersPerRack,
    localAvgUtil,
    localFans,
    bestFanEfficiency,
    avgFanEfficiency,
    oldFanEfficiency,
  ]);

  const {
    numberOfServers,
    totalITPowerKW,
    totalFanPowerKW,
    totalCoolingPowerKW,
    annualCostUSD,
    tariff,
    // perServerPower unused
  } = calculations;

  // Debounced config update
  useEffect(() => {
    if (!onConfigChange || !selectedServer || !selectedCountry) return;

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
      serverMaxPowerW:
        selectedServer.max_power_w !== undefined &&
        selectedServer.max_power_w !== null
          ? Number(selectedServer.max_power_w)
          : undefined,
      serverIdlePowerW:
        selectedServer.idle_power_w !== undefined &&
        selectedServer.idle_power_w !== null
          ? Number(selectedServer.idle_power_w)
          : undefined,
      averageUtilization: Number(localAvgUtil),
      peakUtilization: Number(localPeakUtil),
      fans: {
        bestQuantity: localFans.bestFans,
        bestEfficiency: bestFanEfficiency,
        averageQuantity: localFans.averageFans,
        averageEfficiency: avgFanEfficiency,
        legacyQuantity: localFans.oldFans,
        legacyEfficiency: oldFanEfficiency,
      },
      country: selectedCountry?.country_name || "",
      countryId: selectedCountry?.id || "",
      regionName: "",
      electricityTariff: selectedCountry?.electricity_tariff || 0.15,
      carbonIntensity: selectedCountry?.co2_grid_factor || 0,
      currency: "",
      itPowerKW: totalITPowerKW,
      fanPowerKW: totalFanPowerKW,
      totalCoolingPowerKW,
      annualCostUSD,
      fanEfficiency: {
        best: bestFanEfficiency,
        average: avgFanEfficiency,
        old: oldFanEfficiency,
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
      // CloudSim Parameters (enableCloudSim hardcoded to true in store)
      aiWorkloadMode,
      computeIntensityFactor,
      // Simulation Duration
      simulationDuration,
      // Financial Projection Parameters (2025-2030)
      forecastYears,
      energyEscalationRate: annualElectricityInflation / 100, // Convert % to decimal
      carbonTaxProjected: carbonPrice,
      climateChangeOffsetC: temperatureOffset / forecastYears, // Annual rate
    };

    try {
      const serialized = JSON.stringify(payload);
      if (lastSentRef.current !== serialized) {
        lastSentRef.current = serialized;
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        // Log the payload that will be sent when Continue is clicked
        console.log(
          "[AirSideEconomization] Prepared payload for sending:",
          payload,
        );
        updateTimeoutRef.current = setTimeout(() => {
          onConfigChange(payload);
        }, 150);
      }
    } catch (e) {
      console.error("Error serializing config:", e);
      setTimeout(() => {
        onConfigChange(payload);
      }, 150);
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
    aiWorkloadMode,
    computeIntensityFactor,
    simulationDuration,
    annualElectricityInflation,
    carbonPrice,
    carbonPriceGrowth,
    temperatureOffset,
    forecastYears,
    economizerMaxOutdoorTemp,
    economizerMaxHumidity,
    minOutdoorAirFraction,
    mechanicalCOP,
    capexPerCFM,
    fixedEconomizerCapex,
  ]);

  // Initialize location data from props
  useEffect(() => {
    if (locationData && locationData.length > 0) {
      setLocalLocationData(locationData);
    }
  }, [locationData]);

  // Render new physical fields UI - FIXED DARK MODE
  const renderPhysicalFields = () => (
    <div className={`mt-6 p-6 rounded-xl border ${isDark ? "bg-[#1a2a4a] border-[#3f4a68]" : "bg-blue-50 border-blue-200"}`}>
      <h4 className={`text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
        Physical Parameters
      </h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Supply Air Temp (°C) <span className="font-normal opacity-60">5–30</span>
          </label>
          <input
            type="number"
            min={5}
            max={30}
            step={0.1}
            value={supplyAirTemp}
            onChange={(e) => setSupplyAirTemp(Number(e.target.value))}
            className={`w-full border rounded px-2 py-1 ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"} ${supplyAirTemp < 5 || supplyAirTemp > 30 ? "border-red-500 ring-1 ring-red-500" : ""}`}
          />
          {(supplyAirTemp < 5 || supplyAirTemp > 30) && (
            <p className="text-red-500 text-xs mt-1">Must be between 5°C and 30°C</p>
          )}
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Return Air Temp (°C) <span className="font-normal opacity-60">10–50</span>
          </label>
          <input
            type="number"
            min={10}
            max={50}
            step={0.1}
            value={returnAirTemp}
            onChange={(e) => setReturnAirTemp(Number(e.target.value))}
            className={`w-full border rounded px-2 py-1 ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"} ${returnAirTemp < 10 || returnAirTemp > 50 ? "border-red-500 ring-1 ring-red-500" : ""}`}
          />
          {(returnAirTemp < 10 || returnAirTemp > 50) && (
            <p className="text-red-500 text-xs mt-1">Must be between 10°C and 50°C</p>
          )}
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Airflow (CFM) <span className="font-normal opacity-60">100–100,000</span>
          </label>
          <input
            type="number"
            min={100}
            max={100000}
            step={10}
            value={airflowCFM}
            onChange={(e) => setAirflowCFM(Number(e.target.value))}
            className={`w-full border rounded px-2 py-1 ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"} ${airflowCFM < 100 || airflowCFM > 100000 ? "border-red-500 ring-1 ring-red-500" : ""}`}
          />
          {(airflowCFM < 100 || airflowCFM > 100000) && (
            <p className="text-red-500 text-xs mt-1">Must be between 100 and 100,000 CFM</p>
          )}
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            ΔT (Return - Supply, °C) <span className="font-normal opacity-60">1–40</span>
          </label>
          <input
            type="number"
            min={1}
            max={40}
            step={0.1}
            value={deltaT}
            onChange={(e) => setDeltaT(Number(e.target.value))}
            className={`w-full border rounded px-2 py-1 ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"} ${deltaT < 1 || deltaT > 40 ? "border-red-500 ring-1 ring-red-500" : ""}`}
          />
          {(deltaT < 1 || deltaT > 40) && (
            <p className="text-red-500 text-xs mt-1">Must be between 1°C and 40°C</p>
          )}
        </div>
      </div>
    </div>
  );

  // Server details section - FIXED DARK MODE
  const renderServerDetails = () => {
    if (!selectedServer) {
      return (
        <div className={`mt-6 p-6 rounded-xl border ${isDark ? "bg-yellow-900/20 border-yellow-700" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-5 h-5 ${isDark ? "text-yellow-500" : "text-yellow-600"}`} />
            <p className={isDark ? "text-yellow-300" : "text-yellow-700"}>
              Please select a server type to view details
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div
          key={selectedServer.id}
          className={`mt-6 p-6 rounded-xl border animate-fade-in ${
            isDark 
              ? "bg-gradient-to-br from-[#1a2a4a] to-[#1f2d4d] border-[#3f4a68]" 
              : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className={`text-lg font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                {selectedServer.name}
              </h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {selectedServer.manufacturer} •{" "}
                {selectedServer.model || "Standard Model"}
                {selectedServer.release_year &&
                  ` • Released: ${selectedServer.release_year}`}
              </p>
            </div>
            {selectedServer.efficiency_rating && (
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                isDark ? "bg-green-900/30 text-green-300 border border-green-700" : "bg-green-100 text-green-800"
              }`}>
                {selectedServer.efficiency_rating} Efficiency
              </span>
            )}
          </div>

          {/* Power Specifications */}
          <div className="mb-4">
            <h4 className={`text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Power Specifications
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`p-3 rounded-lg border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>Max Power</span>
                </div>
                <div className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {selectedServer.max_power_w.toLocaleString()} W
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-gray-500" />
                  <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>Idle Power</span>
                </div>
                <div className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {selectedServer.idle_power_w.toLocaleString()} W
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Wind className="w-4 h-4 text-cyan-500" />
                  <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>Cooling Type</span>
                </div>
                <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {selectedServer.cooling_type || "Air-cooled"}
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-green-500" />
                  <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>Avg Utilization</span>
                </div>
                <div className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {selectedServer.avg_utilization_percent ?? selectedServer.typical_utilization ?? 45}%
                </div>
              </div>
            </div>
          </div>

          {/* Hardware Specifications */}
          <div className="mb-4">
            <h4 className={`text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Hardware Specifications
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`p-3 rounded-lg border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <ServerIcon className="w-4 h-4 text-purple-500" />
                  <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Form Factor
                  </span>
                </div>
                <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {selectedServer.form_factor}
                </div>
              </div>

              {selectedServer.cpu_type && (
                <div className={`p-3 rounded-lg border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-4 h-4 text-gray-500" />
                    <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      CPU
                    </span>
                  </div>
                  <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {selectedServer.cpu_type}
                  </div>
                </div>
              )}

              {selectedServer.memory_gb > 0 && (
                <div className={`p-3 rounded-lg border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <MemoryStick className="w-4 h-4 text-gray-500" />
                    <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Memory
                    </span>
                  </div>
                  <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {selectedServer.memory_gb} GB
                  </div>
                </div>
              )}

              {selectedServer.storage_tb > 0 && (
                <div className={`p-3 rounded-lg border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="w-4 h-4 text-gray-500" />
                    <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Storage
                    </span>
                  </div>
                  <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {selectedServer.storage_tb} TB
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {renderPhysicalFields()}
      </>
    );
  };

  const wrapperClass = `max-w-6xl mx-auto transition-all duration-500 ${
    isTransitioning ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0"
  }`;

  if (isLoading) {
    return (
      <div className={wrapperClass}>
        <div className="space-y-8 animate-pulse">
          <div className={`rounded-2xl p-6 ${isDark ? "bg-[#1a1f3a]" : "bg-gray-100"}`}>
            <div className={`h-6 rounded w-1/3 mb-6 ${isDark ? "bg-[#27304a]" : "bg-gray-300"}`}></div>
            <div className="space-y-4">
              <div className={`h-10 rounded ${isDark ? "bg-[#27304a]" : "bg-gray-300"}`}></div>
              <div className={`h-40 rounded ${isDark ? "bg-[#27304a]" : "bg-gray-300"}`}></div>
            </div>
          </div>

          <div className={`rounded-2xl p-6 ${isDark ? "bg-[#1a1f3a]" : "bg-gray-100"}`}>
            <div className={`h-6 rounded w-1/3 mb-6 ${isDark ? "bg-[#27304a]" : "bg-gray-300"}`}></div>
            <div className="space-y-4">
              <div className={`h-4 rounded w-full ${isDark ? "bg-[#27304a]" : "bg-gray-300"}`}></div>
              <div className={`h-4 rounded w-2/3 ${isDark ? "bg-[#27304a]" : "bg-gray-300"}`}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Show warning banner instead of blocking the entire UI
    console.warn("⚠️ Using fallback data due to database error:", error);
  }

  return (
    <div className={wrapperClass}>
      {error && (
        <div className={`mb-6 p-4 rounded-xl border ${isDark ? "bg-yellow-900/20 border-yellow-700" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 mt-0.5 ${isDark ? "text-yellow-500" : "text-yellow-600"}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDark ? "text-yellow-300" : "text-yellow-900"}`}>Using Default Configuration</p>
              <p className={`text-xs mt-1 ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>
                Database connection unavailable. Using fallback server and country data.
              </p>
            </div>
            <button
              onClick={() => {
                setError("");
                fetchAllData();
              }}
              className={`text-xs underline ${isDark ? "text-yellow-400 hover:text-yellow-300" : "text-yellow-700 hover:text-yellow-900"}`}
            >
              Retry
            </button>
          </div>
        </div>
      )}
      
      <div className="text-center space-y-4 mb-12">
        <h2
          className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
        >
          Configure Air-Side Economization
        </h2>
        <p
          className={`text-lg max-w-2xl mx-auto ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          Optimize your cooling parameters for maximum efficiency and cost
          savings
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
            {
              icon: ServerIcon,
              label: "Total Racks",
              value: localNumberOfRacks,
            },
            {
              icon: Cpu,
              label: "Servers",
              value: localNumberOfRacks * localServersPerRack,
            },
            {
              icon: Wind,
              label: "Fan System",
              value: localFans ? "Mixed" : "Standard",
            },
            { icon: Cloud, label: "Region", value: region || "US Northeast" },
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
        <div className={`rounded-2xl p-6 border shadow-sm ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
          <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-blue-900/30" : "bg-blue-100"}`}>
              <ServerIcon className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <div>
              <h4 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                Server Configuration
              </h4>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Select server hardware from {servers.length} available
                configurations
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Server Selection */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                Server Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={localServerType}
                  onChange={handleServerChange}
                  className={`w-full border-2 rounded-xl px-4 py-3.5 focus:outline-none font-medium appearance-none ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white focus:border-[#5ce1e5]" : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"}`}
                  required
                >
                  <option value="">Select a server type...</option>
                  {servers.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.manufacturer} - {server.name} (
                      {server.model || "Standard"})
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg
                    className={`w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Select from {servers.length} available server configurations
              </p>
            </div>

            {/* Server Details Display */}
            {renderServerDetails()}

            {/* Rack and Server Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Number of Racks <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    value={localNumberOfRacks}
                    onChange={(e) =>
                      setLocalNumberOfRacks(Number(e.target.value))
                    }
                    min={1}
                    max={100}
                    className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${isDark ? "bg-[#3f4a68]" : "bg-gray-200"}`}
                  />
                  <div className="w-20">
                    <input
                      type="number"
                      value={localNumberOfRacks}
                      onChange={(e) =>
                        setLocalNumberOfRacks(Number(e.target.value))
                      }
                      min={1}
                      max={100}
                      className={`w-full border rounded-lg px-3 py-2 text-center ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    />
                  </div>
                </div>
                <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Range: 1-100 racks</p>
                {(localNumberOfRacks < 1 || localNumberOfRacks > 100) && (
                  <p className="text-red-500 text-xs mt-1">Must be between 1 and 100</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Servers per Rack <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    value={localServersPerRack}
                    onChange={(e) =>
                      setLocalServersPerRack(Number(e.target.value))
                    }
                    min={1}
                    max={50}
                    className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${isDark ? "bg-[#3f4a68]" : "bg-gray-200"}`}
                  />
                  <div className="w-20">
                    <input
                      type="number"
                      value={localServersPerRack}
                      onChange={(e) =>
                        setLocalServersPerRack(Number(e.target.value))
                      }
                      min={1}
                      max={50}
                      className={`w-full border rounded-lg px-3 py-2 text-center ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    />
                  </div>
                </div>
                <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Range: 1-50 servers per rack
                </p>
                {(localServersPerRack < 1 || localServersPerRack > 50) && (
                  <p className="text-red-500 text-xs mt-1">Must be between 1 and 50</p>
                )}
              </div>
            </div>

            {/* Quick Summary — computed directly from local state, independent of country selection */}
            {(() => {
              const totalServers = localNumberOfRacks * localServersPerRack;
              const avgUtil = selectedServer?.avg_utilization_percent
                ?? selectedServer?.typical_utilization
                ?? localAvgUtil;
              const maxPowerW = selectedServer?.max_power_w ?? 0;
              const totalITPower = maxPowerW > 0
                ? (totalServers * maxPowerW * avgUtil) / 100 / 1000
                : 0;
              return (
                <div className={`p-4 rounded-xl border-l-4 ${isDark ? "bg-[#1a2a4a] border-blue-500" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500"}`}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Total Servers</div>
                      <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{totalServers.toLocaleString()}</div>
                      <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{localNumberOfRacks} racks × {localServersPerRack}/rack</div>
                    </div>
                    <div>
                      <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Total IT Power</div>
                      <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {maxPowerW > 0 ? `${totalITPower.toFixed(1)} kW` : "—"}
                      </div>
                      <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>servers × max_power_w × avg_util</div>
                    </div>
                    <div>
                      <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Per Server Power</div>
                      <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {maxPowerW > 0 ? `${maxPowerW.toLocaleString()} W` : "—"}
                      </div>
                      <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>max_power_w from DB</div>
                    </div>
                    <div>
                      <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Avg Utilization</div>
                      <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{avgUtil}%</div>
                      <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>avg_utilization_percent from DB</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Simulation Duration Selector */}
        <div className={`rounded-2xl p-6 border shadow-sm ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
          <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-purple-900/30" : "bg-purple-100"}`}>
              <Clock className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
            </div>
            <div>
              <h4 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                ⏱️ Simulation Duration
              </h4>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Select simulation timeframe for faster demo or accurate annual analysis
              </p>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
              Time Horizon
            </label>
            <select
              value={simulationDuration}
              onChange={(e) => setSimulationDuration(Number(e.target.value))}
              className={`w-full border-2 rounded-xl px-4 py-3.5 focus:outline-none font-medium appearance-none ${
                isDark
                  ? "bg-[#27304a] border-[#3f4a68] text-white focus:border-[#5ce1e5]"
                  : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
              }`}
            >
              <option value={730}>1 Month (730 hours)</option>
              <option value={2190}>3 Months (2190 hours)</option>
              <option value={4380}>6 Months (4380 hours)</option>
              <option value={8760}>12 Months (8760 hours)</option>
            </select>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Select simulation duration based on analysis needs. Longer periods provide more comprehensive results.
            </p>
          </div>
        </div>

        {/* Utilization & Fans Section - FIXED DARK MODE for fan controls */}
        <div className={`rounded-2xl p-6 border shadow-sm ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
          <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-green-900/30" : "bg-green-100"}`}>
              <Wind className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`} />
            </div>
            <div>
              <h4 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                Utilization & Cooling
              </h4>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Set operational parameters and fan efficiency
              </p>
            </div>
          </div>

          {/* Utilization sliders — read-only, values from server DB */}
          <div className="space-y-6 mb-8">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Average Server Utilization
                </label>
                <span className="text-xl font-bold text-green-600">
                  {localAvgUtil}%
                </span>
              </div>
              <input
                type="range"
                value={localAvgUtil}
                readOnly
                disabled
                min={0}
                max={100}
                className="w-full h-2 bg-gradient-to-r from-green-200 to-green-500 rounded-lg appearance-none cursor-not-allowed opacity-70"
              />
              <div className={`flex justify-between text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                <span>0%</span>
                <span className="text-green-600 font-medium">avg_utilization_percent from server DB</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Peak Server Utilization
                </label>
                <span className="text-xl font-bold text-red-600">
                  {localPeakUtil}%
                </span>
              </div>
              <input
                type="range"
                value={localPeakUtil}
                readOnly
                disabled
                min={0}
                max={100}
                className="w-full h-2 bg-gradient-to-r from-orange-200 to-red-500 rounded-lg appearance-none cursor-not-allowed opacity-70"
              />
              <div className={`flex justify-between text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                <span>0%</span>
                <span className="text-red-500 font-medium">peak_utilization_percent from server DB</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Fan Configuration */}
          <div>
            <h5 className={`font-semibold text-sm mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Fan Configuration
            </h5>
            <div className="space-y-4">
              {[
                {
                  label: "Best-in-class Fans",
                  type: "best" as const,
                  efficiency: bestFanEfficiency,
                  setEfficiency: (v: number) =>
                    handleEfficiencyChange("best", v),
                  count: localFans.bestFans,
                  setCount: (v: number) => handleFanChange("bestFans", v),
                  bg: isDark ? "bg-green-900/20" : "bg-green-50",
                  border: isDark ? "border-green-700" : "border-green-200",
                  shellClass: "fan-shell fan-shell-best",
                  rotorClass: "fan-rotor fan-rotor-best",
                },
                {
                  label: "Average VFD Fans",
                  type: "average" as const,
                  efficiency: avgFanEfficiency,
                  setEfficiency: (v: number) =>
                    handleEfficiencyChange("average", v),
                  count: localFans.averageFans,
                  setCount: (v: number) => handleFanChange("averageFans", v),
                  bg: isDark ? "bg-yellow-900/20" : "bg-yellow-50",
                  border: isDark ? "border-yellow-700" : "border-yellow-200",
                  shellClass: "fan-shell fan-shell-average",
                  rotorClass: "fan-rotor fan-rotor-average",
                },
                {
                  label: "Legacy Fans",
                  type: "old" as const,
                  efficiency: oldFanEfficiency,
                  setEfficiency: (v: number) =>
                    handleEfficiencyChange("old", v),
                  count: localFans.oldFans,
                  setCount: (v: number) => handleFanChange("oldFans", v),
                  bg: isDark ? "bg-red-900/20" : "bg-red-50",
                  border: isDark ? "border-red-700" : "border-red-200",
                  shellClass: "fan-shell fan-shell-legacy",
                  rotorClass: "fan-rotor fan-rotor-legacy",
                },
              ].map((fan, idx) => {
                const param = getFanParameter(fan.type);

                return (
                  <div key={idx} className={`border rounded-lg p-4 ${fan.bg} ${fan.border}`}>
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
                        <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          {fan.label}
                        </div>
                      </div>
                      <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {fan.count} {fan.count === 1 ? "fan" : "fans"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Efficiency ({param.unit})
                        </label>
                        <input
                          type="number"
                          value={fan.efficiency}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (v >= param.min && v <= param.max)
                              fan.setEfficiency(v);
                          }}
                          min={param.min}
                          max={param.max}
                          step={0.01}
                          className={`w-full border rounded-lg px-3 py-2 text-sm ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"}`}
                        />
                        <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          Range: {param.min.toFixed(2)} - {param.max.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className={`block text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={fan.count}
                          onChange={(e) => fan.setCount(Number(e.target.value))}
                          min={0}
                          max={50}
                          className={`w-full border rounded-lg px-3 py-2 text-sm ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Advanced Economizer Controls (Optional) - FIXED DARK MODE */}
        <div className={`rounded-2xl p-6 border shadow-sm ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
          <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-cyan-900/30" : "bg-cyan-100"}`}>
              <Wind className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
            </div>
            <div>
              <h4 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                Advanced Economizer Controls{" "}
                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>(Optional)</span>
              </h4>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Fine-tune economizer operation for engineering analysis
              </p>
            </div>
          </div>
          <div className="space-y-6">
            {/* A) Economizer Max Outdoor Temperature (°C) */}
            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                Economizer Enable Temperature (°C)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={10}
                  max={30}
                  step={0.5}
                  value={economizerMaxOutdoorTemp}
                  onChange={(e) =>
                    setEconomizerMaxOutdoorTemp(Number(e.target.value))
                  }
                  className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${isDark ? "bg-blue-900/40" : "bg-blue-200"}`}
                />
                <input
                  type="number"
                  min={10}
                  max={30}
                  step={0.5}
                  value={economizerMaxOutdoorTemp}
                  onChange={(e) =>
                    setEconomizerMaxOutdoorTemp(Number(e.target.value))
                  }
                  className={`w-20 border rounded-lg px-3 py-2 text-center ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Outdoor air cooling is disabled above this temperature to avoid
                excessive heat load. (Range: 10–30°C, default 24°C)
              </p>
              {(economizerMaxOutdoorTemp < 10 || economizerMaxOutdoorTemp > 30) && (
                <p className="text-red-500 text-xs mt-1">Must be between 10°C and 30°C</p>
              )}
            </div>
            {/* B) Economizer Max Outdoor Humidity (%) */}
            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                Maximum Outdoor Humidity (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={40}
                  max={80}
                  step={5}
                  value={economizerMaxHumidity}
                  onChange={(e) =>
                    setEconomizerMaxHumidity(Number(e.target.value))
                  }
                  className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${isDark ? "bg-blue-900/40" : "bg-blue-200"}`}
                />
                <input
                  type="number"
                  min={40}
                  max={80}
                  step={5}
                  value={economizerMaxHumidity}
                  onChange={(e) =>
                    setEconomizerMaxHumidity(Number(e.target.value))
                  }
                  className={`w-20 border rounded-lg px-3 py-2 text-center ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Economizer operation is restricted when outdoor humidity exceeds
                this value. (Range: 40–80%, default 60%)
              </p>
              {(economizerMaxHumidity < 40 || economizerMaxHumidity > 80) && (
                <p className="text-red-500 text-xs mt-1">Must be between 40% and 80%</p>
              )}
            </div>
            {/* C) Minimum Outdoor Air Fraction */}
            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                Minimum Outdoor Air Fraction
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  value={minOutdoorAirFraction}
                  onChange={(e) =>
                    setMinOutdoorAirFraction(Number(e.target.value))
                  }
                  className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${isDark ? "bg-blue-900/40" : "bg-blue-200"}`}
                />
                <input
                  type="number"
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  value={minOutdoorAirFraction}
                  onChange={(e) =>
                    setMinOutdoorAirFraction(Number(e.target.value))
                  }
                  className={`w-20 border rounded-lg px-3 py-2 text-center ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Controls how much outside air is introduced during partial
                economizer operation. (Range: 0.1–0.5, default 0.2)
              </p>
            </div>
          </div>
        </div>

        {/* Financial Projection (2025-2030) - FIXED DARK MODE */}
        <div className={`rounded-2xl p-6 border shadow-sm ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
          <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
            <DollarSign className={`w-6 h-6 ${isDark ? "text-green-400" : "text-green-600"}`} />
            <div>
              <h4 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                Financial Projection (2025–2030)
              </h4>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Multi-year cost and emissions forecasting with escalation rates
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Annual Electricity Inflation */}
            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                Annual Electricity Inflation (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.1}
                  value={annualElectricityInflation}
                  onChange={(e) =>
                    setAnnualElectricityInflation(Number(e.target.value))
                  }
                  className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${isDark ? "bg-green-900/40" : "bg-green-200"}`}
                />
                <input
                  type="number"
                  min={0}
                  max={15}
                  step={0.1}
                  value={annualElectricityInflation}
                  onChange={(e) =>
                    setAnnualElectricityInflation(Number(e.target.value))
                  }
                  className={`w-20 border rounded-lg px-3 py-2 text-center ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Range: 0-15% | Default: 3.5% | Annual electricity cost escalation rate for 5-year projection
              </p>
            </div>

            {/* Carbon Price */}
            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                Carbon Price ($ per ton CO₂)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={carbonPrice}
                  onChange={(e) => setCarbonPrice(Number(e.target.value))}
                  className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${isDark ? "bg-green-900/40" : "bg-green-200"}`}
                />
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={carbonPrice}
                  onChange={(e) => setCarbonPrice(Number(e.target.value))}
                  className={`w-20 border rounded-lg px-3 py-2 text-center ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Range: 0-200 | Default: $126 | EU 2030 target carbon tax applied to emissions
              </p>
            </div>

            {/* Carbon Price Growth */}
            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                Carbon Price Growth (% per year)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={0.1}
                  value={carbonPriceGrowth}
                  onChange={(e) =>
                    setCarbonPriceGrowth(Number(e.target.value))
                  }
                  className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${isDark ? "bg-green-900/40" : "bg-green-200"}`}
                />
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.1}
                  value={carbonPriceGrowth}
                  onChange={(e) =>
                    setCarbonPriceGrowth(Number(e.target.value))
                  }
                  className={`w-20 border rounded-lg px-3 py-2 text-center ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Range: 0-20% | Default: 15% | Annual carbon price escalation rate
              </p>
            </div>

            {/* Temperature Offset (Climate Change) */}
            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                Temperature Offset (°C)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={temperatureOffset}
                  onChange={(e) =>
                    setTemperatureOffset(Number(e.target.value))
                  }
                  className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${isDark ? "bg-orange-900/40" : "bg-orange-200"}`}
                />
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={temperatureOffset}
                  onChange={(e) =>
                    setTemperatureOffset(Number(e.target.value))
                  }
                  className={`w-20 border rounded-lg px-3 py-2 text-center ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Range: 0-5°C | Default: 0°C | Climate change temperature increase over 5 years (reduces economizer effectiveness by ~3% per °C)
              </p>
            </div>

            {/* Info Box - FIXED DARK MODE */}
            <div className={`rounded-lg p-4 ${isDark ? "bg-blue-900/20 border border-blue-700" : "bg-blue-50 border border-blue-200"}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                <div className={`text-sm ${isDark ? "text-blue-300" : "text-blue-900"}`}>
                  <p className="font-semibold mb-1">5-Year Projection (2025-2030)</p>
                  <p className={`text-xs ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                    These parameters model future cost escalation, carbon pricing policies, and climate change impacts on cooling effectiveness. 
                    The backend calculates NPV (Net Present Value) and adjusted payback period considering these factors.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Country Tariff Section - FIXED DARK MODE */}
        <div className={`rounded-2xl p-6 border shadow-sm ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
          <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-amber-900/30" : "bg-amber-100"}`}>
              <DollarSign className={`w-5 h-5 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
            </div>
            <div>
              <h4 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                Country Tariff
              </h4>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Select your country for electricity pricing
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Country <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCountryId}
                onChange={handleCountryChange}
                className={`w-full border-2 rounded-xl px-4 py-3.5 focus:outline-none font-medium ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white focus:border-[#5ce1e5]" : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"}`}
                required
              >
                <option value="">Select a country...</option>
                {countries.map((country) => (
                  <option key={country.id} value={String(country.id)}>
                    {country.country_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCountry && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className={`p-4 rounded-xl border ${isDark ? "bg-amber-900/20 border-amber-700" : "bg-amber-50 border-amber-200"}`}>
                  <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                    Electricity Tariff
                  </div>
                  <div className={`text-2xl font-bold ${isDark ? "text-amber-300" : "text-amber-900"}`}>
                    ${selectedCountry.electricity_tariff.toFixed(3)}
                  </div>
                  <div className={`text-xs ${isDark ? "text-amber-400" : "text-amber-600"}`}>/ kWh</div>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? "bg-green-900/20 border-green-700" : "bg-green-50 border-green-200"}`}>
                  <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? "text-green-400" : "text-green-600"}`}>
                    Carbon Intensity
                  </div>
                  <div className={`text-2xl font-bold ${isDark ? "text-green-300" : "text-green-800"}`}>
                    {selectedCountry.co2_grid_factor.toFixed(3)}
                  </div>
                  <div className={`text-xs ${isDark ? "text-green-400" : "text-green-600"}`}>KgCO₂ / kWh</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location Weather Data — auto-fetch from EPW site */}
        <WeatherLocationPicker
          onWeatherLoaded={handleLocationDataUpload}
          isDark={isDark}
        />

        {/* CloudSim Workload Configuration - FIXED DARK MODE */}
        <div className={`rounded-2xl p-6 border shadow-sm ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
          <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-purple-900/30" : "bg-purple-100"}`}>
              <Cpu className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
            </div>
            <div>
              <h4 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                CloudSim Workload Engine
              </h4>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                AI-aware dynamic workload generation (Always Enabled)
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Info Banner - FIXED DARK MODE */}
            <div className={`p-4 rounded-xl border-l-4 ${isDark ? "bg-purple-900/20 border-purple-500" : "bg-purple-50 border-purple-500"}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 mt-0.5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                <div>
                  <p className={`text-sm font-medium mb-1 ${isDark ? "text-purple-300" : "text-purple-900"}`}>
                    CloudSim Integration Active
                  </p>
                  <p className={`text-xs ${isDark ? "text-purple-400" : "text-purple-700"}`}>
                    CloudSim Plus generates realistic AI-aware workload patterns based on your selected mode and intensity factor.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Workload Mode */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                AI Workload Mode
              </label>
              <select
                value={aiWorkloadMode}
                onChange={(e) => setAiWorkloadMode(e.target.value)}
                className={`w-full border-2 rounded-xl px-4 py-3 focus:outline-none font-medium ${isDark ? "bg-[#27304a] border-[#3f4a68] text-white focus:border-purple-400" : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"}`}
              >
                <option value="AI_TRAINING">AI Training (85-95% sustained utilization)</option>
                <option value="AI_INFERENCE">AI Inference (20%→95% bursty spikes)</option>
                <option value="MIXED">Mixed (70% enterprise + 30% AI)</option>
                <option value="ENTERPRISE">Enterprise (30-70% traditional)</option>
              </select>
              <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {aiWorkloadMode === "AI_TRAINING" && "Sustained high utilization for model training workloads"}
                {aiWorkloadMode === "AI_INFERENCE" && "Bursty spikes for inference serving workloads"}
                {aiWorkloadMode === "MIXED" && "Combination of enterprise and AI workloads"}
                {aiWorkloadMode === "ENTERPRISE" && "Traditional enterprise server utilization patterns"}
              </p>
            </div>

            {/* Compute Intensity Factor */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Compute Intensity Factor
                </label>
                <span className="text-xl font-bold text-purple-600">
                  {computeIntensityFactor.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                value={computeIntensityFactor}
                onChange={(e) => setComputeIntensityFactor(Number(e.target.value))}
                min={1.0}
                max={1.5}
                step={0.05}
                className="w-full h-2 bg-gradient-to-r from-purple-200 to-purple-600 rounded-lg appearance-none cursor-pointer"
              />
              <div className={`flex justify-between text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                <span>1.0x (Standard)</span>
                <span>1.5x (AI/HPC)</span>
              </div>
              <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Power multiplier for AI/HPC workloads (GPU/accelerator uplift)
              </p>
            </div>

            {/* CloudSim Configuration Summary - FIXED DARK MODE */}
            <div className={`p-4 rounded-xl ${isDark ? "bg-[#27304a]" : "bg-gray-50"}`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Workload Mode
                  </div>
                  <div className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {aiWorkloadMode.replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Intensity Factor
                  </div>
                  <div className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {computeIntensityFactor.toFixed(2)}x
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Total Servers
                  </div>
                  <div className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {localNumberOfRacks * localServersPerRack}
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Simulation Hours
                  </div>
                  <div className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {localLocationData.length > 0 ? localLocationData.length : 24}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Section — only shown when server + country are selected - FIXED DARK MODE */}
        {selectedServer && selectedCountry && totalITPowerKW > 0 && (
        <div className={`rounded-2xl p-6 border-2 ${isDark ? "bg-gradient-to-br from-[#1a2a4a] to-[#1f2d4d] border-[#3f4a68]" : "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200"}`}>
          <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${isDark ? "border-[#3f4a68]" : "border-blue-300"}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-blue-900/30" : "bg-blue-200"}`}>
              <TrendingDown className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-700"}`} />
            </div>
            <div>
              <h4 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                Annual Power & Cost Summary
              </h4>
              <p className={`text-sm ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                Based on current configuration
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-xl border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
              <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>IT Power</div>
              <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{totalITPowerKW.toFixed(1)} kW</div>
              <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>servers × max_power_w × avg_util</div>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
              <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Fan Power</div>
              <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{totalFanPowerKW.toFixed(1)} kW</div>
              <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Fan power consumption</div>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
              <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Total Power</div>
              <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{totalCoolingPowerKW.toFixed(1)} kW</div>
              <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>IT + Fan power</div>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? "bg-[#27304a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
              <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Est. Annual Cost</div>
              <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>${(annualCostUSD / 1000).toFixed(1)}k</div>
              <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>${tariff.toFixed(3)}/kWh × 8760 h</div>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? "bg-blue-900/20 border border-blue-700" : "bg-blue-100"}`}>
            <p className={`text-sm ${isDark ? "text-blue-300" : "text-blue-800"}`}>
              {selectedServer.manufacturer} {selectedServer.name} · {selectedServer.max_power_w.toLocaleString()} W max · {selectedServer.cooling_type}
              {" · "}{selectedCountry.country_name} · ${selectedCountry.electricity_tariff.toFixed(3)}/kWh
            </p>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default AirSideEconomization;