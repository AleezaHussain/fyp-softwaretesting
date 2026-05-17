import React, { useState, useCallback, useMemo } from "react";
import { Upload, CloudRain, Mountain, AlertCircle, CheckCircle2, FileText, Thermometer, Cpu, Droplets, Settings, DollarSign, Zap } from "lucide-react";
import WeatherLocationPicker from "./WeatherLocationPicker";
import { ChilledWaterWeatherPoint } from "../../services/weatherService";

// Custom slider styles
const sliderStyles = `
  .slider-thumb::-webkit-slider-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border: 3px solid #3b82f6;
    transition: all 0.2s ease;
  }
  
  .slider-thumb::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
  }
  
  .slider-thumb::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border: 3px solid #3b82f6;
    transition: all 0.2s ease;
  }
  
  .slider-thumb::-moz-range-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
  }
`;

export interface ChilledWaterCoolingFormProps {
  isDark: boolean;
  isTransitioning: boolean;
  currentConfig: any;
  currentInput: any;
  onConfigChange: (config: any) => void;
}

interface WeatherFileMetadata {
  location: string;
  elevation: number;
  rowCount: number;
  hasValidData: boolean;
}

interface ParsedWeatherData {
  hour: number;
  dry_bulb_c: number;
  wet_bulb_c: number;
  relative_humidity: number;
  atmospheric_pressure_pa: number;
}

const ChilledWaterCoolingForm: React.FC<ChilledWaterCoolingFormProps> = ({
  isDark,
  isTransitioning,
  currentConfig,
  currentInput,
  onConfigChange,
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // 1. Weather Data Upload State
  const [weatherFile, setWeatherFile] = useState<File | null>(null);
  const [weatherData, setWeatherData] = useState<ParsedWeatherData[]>([]);
  const [weatherMetadata, setWeatherMetadata] = useState<WeatherFileMetadata | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 2. Climate Scenario State - Warming Delta (ΔT)
  const [warmingDelta, setWarmingDelta] = useState<number>(
    currentConfig?.warmingDelta || 0.0
  );

  // 3. Site Altitude State
  const [altitude, setAltitude] = useState<number>(
    currentConfig?.altitude || 0
  );
  const [altitudeUnit, setAltitudeUnit] = useState<"meters" | "feet">(
    currentConfig?.altitudeUnit || "meters"
  );

  // 4. IT Infrastructure & Workload State
  const [numberOfRacks, setNumberOfRacks] = useState<number>(
    currentConfig?.numberOfRacks || 5
  );
  const [serversPerRack, setServersPerRack] = useState<number>(
    currentConfig?.serversPerRack || 10
  );
  const [serverIdlePowerW, setServerIdlePowerW] = useState<number>(
    currentConfig?.serverIdlePowerW || 150
  );
  const [serverMaxPowerW, setServerMaxPowerW] = useState<number>(
    currentConfig?.serverMaxPowerW || 500
  );
  const [workloadType, setWorkloadType] = useState<string>(
    currentConfig?.workloadType || "enterprise"
  );
  const [avgCpuUtilization, setAvgCpuUtilization] = useState<number>(
    currentConfig?.avgCpuUtilization || 60
  );

  // 5. Water Stress Level State
  const [waterStressLevel, setWaterStressLevel] = useState<string>(
    currentConfig?.waterStressLevel || "low"
  );

  // 6. Mechanical Specs State
  const [chillerType, setChillerType] = useState<string>(
    currentConfig?.chillerType || "air_cooled_scroll"
  );
  const [supplyWaterTempC, setSupplyWaterTempC] = useState<number>(
    currentConfig?.supplyWaterTempC || 7.0
  );
  const [foulingFactor, setFoulingFactor] = useState<number>(
    currentConfig?.foulingFactor || 1.0
  );

  // 7. Simulation Duration State
  const [simulationDuration, setSimulationDuration] = useState<number>(
    currentConfig?.simulationDuration || 8760
  );

  // 8. Economic & Environmental State
  const [baseElectricityRate, setBaseElectricityRate] = useState<number>(
    currentConfig?.baseElectricityRate || 0.12
  );
  const [touEnabled, setTouEnabled] = useState<boolean>(
    currentConfig?.touEnabled ?? false
  );
  const [peakMultiplier, setPeakMultiplier] = useState<number>(
    currentConfig?.peakMultiplier || 1.5
  );
  const [offPeakMultiplier, setOffPeakMultiplier] = useState<number>(
    currentConfig?.offPeakMultiplier || 0.7
  );
  const [carbonIntensity, setCarbonIntensity] = useState<number>(
    currentConfig?.carbonIntensity || 0.5
  );
  const [refrigerantType, setRefrigerantType] = useState<string>(
    currentConfig?.refrigerantType || "r134a"
  );
  const [showCarbonFetchSuccess, setShowCarbonFetchSuccess] = useState<boolean>(false);
  const [useIPCCPathway, setUseIPCCPathway] = useState<boolean>(
    currentConfig?.useIPCCPathway ?? true
  );
  const [carbonTax2030, setCarbonTax2030] = useState<number>(
    currentConfig?.carbonTax2030 || 254
  );

  // Auto-set carbon tax to IPCC pathway when enabled
  React.useEffect(() => {
    if (useIPCCPathway) {
      setCarbonTax2030(254); // IPCC 1.5°C pathway target for 2030
    }
  }, [useIPCCPathway]);

  // ============================================================================
  // ALTITUDE CONVERSION UTILITIES
  // ============================================================================
  
  const convertAltitude = useCallback((value: number, from: "meters" | "feet", to: "meters" | "feet"): number => {
    if (from === to) return value;
    if (from === "meters" && to === "feet") return value * 3.28084;
    if (from === "feet" && to === "meters") return value / 3.28084;
    return value;
  }, []);

  const altitudeInMeters = useMemo(() => {
    return altitudeUnit === "meters" ? altitude : convertAltitude(altitude, "feet", "meters");
  }, [altitude, altitudeUnit, convertAltitude]);

  // ============================================================================
  // WORKLOAD TYPE UTILITIES
  // ============================================================================
  
  const workloadTypes = [
    {
      id: "ai_training",
      label: "AI Training",
      icon: "🧠",
      description: "High-density GPU workloads",
      refreshCycle: 3,
      throttlingPenalty: 15,
      typicalUtilization: 96,
      color: isDark ? "from-purple-500/20 to-purple-600/20" : "from-purple-50 to-purple-100",
      borderColor: isDark ? "border-purple-500/50" : "border-purple-300",
    },
    {
      id: "ai_inference",
      label: "AI Inference",
      icon: "⚡",
      description: "Latency-sensitive serving",
      refreshCycle: 3,
      throttlingPenalty: 25,
      typicalUtilization: 75,
      color: isDark ? "from-blue-500/20 to-blue-600/20" : "from-blue-50 to-blue-100",
      borderColor: isDark ? "border-blue-500/50" : "border-blue-300",
    },
    {
      id: "enterprise",
      label: "Enterprise",
      icon: "🏢",
      description: "Traditional workloads",
      refreshCycle: 5,
      throttlingPenalty: 0,
      typicalUtilization: 60,
      color: isDark ? "from-gray-500/20 to-gray-600/20" : "from-gray-50 to-gray-100",
      borderColor: isDark ? "border-gray-500/50" : "border-gray-300",
    },
  ];

  const selectedWorkload = useMemo(
    () => workloadTypes.find(w => w.id === workloadType) || workloadTypes[2],
    [workloadType, isDark]
  );

  // Calculate total servers and IT load
  const totalServers = useMemo(() => numberOfRacks * serversPerRack, [numberOfRacks, serversPerRack]);
  
  const totalITLoadKW = useMemo(() => {
    const avgPowerPerServer = serverIdlePowerW + (serverMaxPowerW - serverIdlePowerW) * (avgCpuUtilization / 100);
    return (totalServers * avgPowerPerServer) / 1000;
  }, [totalServers, serverIdlePowerW, serverMaxPowerW, avgCpuUtilization]);

  const peakITLoadKW = useMemo(() => {
    return (totalServers * serverMaxPowerW) / 1000;
  }, [totalServers, serverMaxPowerW]);

  const getUtilizationColor = useCallback((utilization: number): string => {
    if (utilization < 40) return isDark ? "text-green-400" : "text-green-600";
    if (utilization < 70) return isDark ? "text-yellow-400" : "text-yellow-600";
    if (utilization < 90) return isDark ? "text-orange-400" : "text-orange-600";
    return isDark ? "text-red-400" : "text-red-600";
  }, [isDark]);

  // ============================================================================
  // WATER STRESS UTILITIES
  // ============================================================================
  
  const waterStressLevels = [
    {
      id: "low",
      label: "Low",
      description: "Abundant water resources",
      wueThreshold: 5.0,
      icon: "💧",
      color: isDark ? "text-blue-400" : "text-blue-600",
      bgColor: isDark ? "bg-blue-500/10" : "bg-blue-50",
      borderColor: isDark ? "border-blue-500/30" : "border-blue-200",
      riskLevel: "LOW",
    },
    {
      id: "low_medium",
      label: "Low-Medium",
      description: "Adequate water availability",
      wueThreshold: 3.0,
      icon: "💦",
      color: isDark ? "text-cyan-400" : "text-cyan-600",
      bgColor: isDark ? "bg-cyan-500/10" : "bg-cyan-50",
      borderColor: isDark ? "border-cyan-500/30" : "border-cyan-200",
      riskLevel: "LOW",
    },
    {
      id: "medium_high",
      label: "Medium-High",
      description: "Moderate water constraints",
      wueThreshold: 2.0,
      icon: "🌊",
      color: isDark ? "text-yellow-400" : "text-yellow-600",
      bgColor: isDark ? "bg-yellow-500/10" : "bg-yellow-50",
      borderColor: isDark ? "border-yellow-500/30" : "border-yellow-200",
      riskLevel: "MODERATE",
    },
    {
      id: "high",
      label: "High",
      description: "Significant water stress",
      wueThreshold: 1.5,
      icon: "⚠️",
      color: isDark ? "text-orange-400" : "text-orange-600",
      bgColor: isDark ? "bg-orange-500/10" : "bg-orange-50",
      borderColor: isDark ? "border-orange-500/30" : "border-orange-200",
      riskLevel: "HIGH",
    },
    {
      id: "very_high",
      label: "Very High",
      description: "Extreme water scarcity",
      wueThreshold: 1.0,
      icon: "🚨",
      color: isDark ? "text-red-400" : "text-red-600",
      bgColor: isDark ? "bg-red-500/10" : "bg-red-50",
      borderColor: isDark ? "border-red-500/30" : "border-red-200",
      riskLevel: "CRITICAL",
    },
  ];

  const selectedWaterStress = useMemo(
    () => waterStressLevels.find(w => w.id === waterStressLevel) || waterStressLevels[0],
    [waterStressLevel, isDark]
  );

  // ============================================================================
  // CHILLER TYPE UTILITIES
  // ============================================================================
  
  const chillerTypes = [
    {
      id: "air_cooled_scroll",
      label: "Air-Cooled Scroll",
      description: "Small Edge Data Centers",
      refCOPMin: 3.2,
      refCOPMax: 3.8,
      refCOP: 3.5,
      waterUsage: "None",
      icon: "🌬️",
      color: isDark ? "text-cyan-400" : "text-cyan-600",
    },
    {
      id: "air_cooled_screw",
      label: "Air-Cooled Screw",
      description: "Mid-sized Edge Facilities",
      refCOPMin: 3.5,
      refCOPMax: 4.5,
      refCOP: 4.0,
      waterUsage: "None",
      icon: "💨",
      color: isDark ? "text-blue-400" : "text-blue-600",
    },
    {
      id: "water_cooled_screw",
      label: "Water-Cooled Screw",
      description: "High Efficiency / High Water Use",
      refCOPMin: 4.8,
      refCOPMax: 5.8,
      refCOP: 5.3,
      waterUsage: "High",
      icon: "💧",
      color: isDark ? "text-indigo-400" : "text-indigo-600",
    },
  ];

  const selectedChiller = useMemo(
    () => chillerTypes.find(c => c.id === chillerType) || chillerTypes[0],
    [chillerType, isDark]
  );

  // Supply water temp efficient zone (7-12°C)
  const isInEfficientZone = useMemo(
    () => supplyWaterTempC >= 7 && supplyWaterTempC <= 12,
    [supplyWaterTempC]
  );

  const getSupplyTempColor = useCallback((temp: number): string => {
    if (temp >= 7 && temp <= 12) return isDark ? "text-green-400" : "text-green-600";
    if (temp < 7) return isDark ? "text-blue-400" : "text-blue-600";
    return isDark ? "text-orange-400" : "text-orange-600";
  }, [isDark]);

  const getFoulingColor = useCallback((fouling: number): string => {
    if (fouling <= 1.05) return isDark ? "text-green-400" : "text-green-600";
    if (fouling <= 1.15) return isDark ? "text-yellow-400" : "text-yellow-600";
    if (fouling <= 1.25) return isDark ? "text-orange-400" : "text-orange-600";
    return isDark ? "text-red-400" : "text-red-600";
  }, [isDark]);

  const getSupplyTempSliderBackground = useCallback((temp: number): string => {
    const percentage = ((temp - 5) / (15 - 5)) * 100;
    const efficientStart = ((7 - 5) / (15 - 5)) * 100; // 20%
    const efficientEnd = ((12 - 5) / (15 - 5)) * 100; // 70%
    
    if (isDark) {
      return `linear-gradient(to right,
        #3b82f6 0%,
        #3b82f6 ${efficientStart}%,
        #10b981 ${efficientStart}%,
        #10b981 ${efficientEnd}%,
        #f59e0b ${efficientEnd}%,
        #f59e0b ${percentage}%,
        #4b5563 ${percentage}%,
        #4b5563 100%)`;
    } else {
      return `linear-gradient(to right,
        #60a5fa 0%,
        #60a5fa ${efficientStart}%,
        #34d399 ${efficientStart}%,
        #34d399 ${efficientEnd}%,
        #fbbf24 ${efficientEnd}%,
        #fbbf24 ${percentage}%,
        #d1d5db ${percentage}%,
        #d1d5db 100%)`;
    }
  }, [isDark]);

  const getFoulingSliderBackground = useCallback((fouling: number): string => {
    const percentage = ((fouling - 1.0) / (1.3 - 1.0)) * 100;
    
    if (isDark) {
      return `linear-gradient(to right,
        #10b981 0%,
        #10b981 ${percentage * 0.33}%,
        #fbbf24 ${percentage * 0.33}%,
        #fbbf24 ${percentage * 0.67}%,
        #f59e0b ${percentage * 0.67}%,
        #f59e0b ${percentage * 0.9}%,
        #ef4444 ${percentage * 0.9}%,
        #ef4444 ${percentage}%,
        #4b5563 ${percentage}%,
        #4b5563 100%)`;
    } else {
      return `linear-gradient(to right,
        #34d399 0%,
        #34d399 ${percentage * 0.33}%,
        #fbbf24 ${percentage * 0.33}%,
        #fbbf24 ${percentage * 0.67}%,
        #fbbf24 ${percentage * 0.67}%,
        #fbbf24 ${percentage * 0.9}%,
        #f87171 ${percentage * 0.9}%,
        #f87171 ${percentage}%,
        #d1d5db ${percentage}%,
        #d1d5db 100%)`;
    }
  }, [isDark]);

  // ============================================================================
  // ECONOMIC & ENVIRONMENTAL UTILITIES
  // ============================================================================
  
  const refrigerantTypes = [
    {
      id: "r134a",
      label: "R-134a",
      description: "Common, high GWP",
      gwp: 1430,
      color: isDark ? "text-red-400" : "text-red-600",
    },
    {
      id: "r1234yf",
      label: "R-1234yf",
      description: "Low GWP alternative",
      gwp: 4,
      color: isDark ? "text-green-400" : "text-green-600",
    },
    {
      id: "r410a",
      label: "R-410A",
      description: "High efficiency, high GWP",
      gwp: 2088,
      color: isDark ? "text-orange-400" : "text-orange-600",
    },
  ];

  const selectedRefrigerant = useMemo(
    () => refrigerantTypes.find(r => r.id === refrigerantType) || refrigerantTypes[0],
    [refrigerantType]
  );

  // Generate 24-hour price profile for visualization
  const priceProfile = useMemo(() => {
    const profile = [];
    for (let hour = 0; hour < 24; hour++) {
      let multiplier = 1.0; // Partial-peak default
      
      if (touEnabled) {
        // Peak hours (12:00 PM - 6:00 PM)
        if (hour >= 12 && hour < 18) {
          multiplier = peakMultiplier;
        }
        // Off-peak hours (10:00 PM - 6:00 AM)
        else if (hour >= 22 || hour < 6) {
          multiplier = offPeakMultiplier;
        }
      }
      
      profile.push({
        hour,
        rate: baseElectricityRate * multiplier,
        multiplier,
        label: hour === 0 ? '12AM' : hour === 12 ? '12PM' : hour < 12 ? `${hour}AM` : `${hour-12}PM`,
      });
    }
    return profile;
  }, [baseElectricityRate, touEnabled, peakMultiplier, offPeakMultiplier]);

  const maxRate = useMemo(() => Math.max(...priceProfile.map(p => p.rate)), [priceProfile]);

  // Fetch regional carbon intensity based on location
  const handleFetchRegionalCarbon = useCallback(() => {
    if (weatherMetadata?.location) {
      // Simplified regional lookup (in production, use actual API)
      const location = weatherMetadata.location.toLowerCase();
      let regionalCarbon = 0.5; // Default
      
      if (location.includes('california') || location.includes('ca')) {
        regionalCarbon = 0.25; // Clean grid
      } else if (location.includes('texas') || location.includes('tx')) {
        regionalCarbon = 0.45;
      } else if (location.includes('arizona') || location.includes('az')) {
        regionalCarbon = 0.48;
      } else if (location.includes('washington') || location.includes('wa')) {
        regionalCarbon = 0.15; // Hydro-heavy
      } else if (location.includes('wyoming') || location.includes('wy')) {
        regionalCarbon = 0.75; // Coal-heavy
      }
      
      setCarbonIntensity(regionalCarbon);
      setShowCarbonFetchSuccess(true);
      setTimeout(() => setShowCarbonFetchSuccess(false), 3000);
    }
  }, [weatherMetadata]);

  const getCarbonTaxColor = useCallback((tax: number): string => {
    if (tax < 100) return isDark ? "text-green-400" : "text-green-600";
    if (tax < 254) return isDark ? "text-blue-400" : "text-blue-600";
    if (tax < 300) return isDark ? "text-yellow-400" : "text-yellow-600";
    if (tax < 400) return isDark ? "text-orange-400" : "text-orange-600";
    return isDark ? "text-red-400" : "text-red-600";
  }, [isDark]);

  const getCarbonTaxSliderBackground = useCallback((tax: number): string => {
    const percentage = (tax / 500) * 100;
    const ipccTarget = (254 / 500) * 100; // 50.8%
    
    if (isDark) {
      return `linear-gradient(to right,
        #10b981 0%,
        #10b981 ${percentage * 0.2}%,
        #3b82f6 ${percentage * 0.2}%,
        #3b82f6 ${ipccTarget}%,
        #fbbf24 ${ipccTarget}%,
        #fbbf24 ${percentage * 0.6}%,
        #f59e0b ${percentage * 0.6}%,
        #f59e0b ${percentage * 0.8}%,
        #ef4444 ${percentage * 0.8}%,
        #ef4444 ${percentage}%,
        #4b5563 ${percentage}%,
        #4b5563 100%)`;
    } else {
      return `linear-gradient(to right,
        #34d399 0%,
        #34d399 ${percentage * 0.2}%,
        #60a5fa ${percentage * 0.2}%,
        #60a5fa ${ipccTarget}%,
        #fbbf24 ${ipccTarget}%,
        #fbbf24 ${percentage * 0.6}%,
        #fbbf24 ${percentage * 0.6}%,
        #fbbf24 ${percentage * 0.8}%,
        #f87171 ${percentage * 0.8}%,
        #f87171 ${percentage}%,
        #d1d5db ${percentage}%,
        #d1d5db 100%)`;
    }
  }, [isDark]);

  const handleAltitudeUnitToggle = () => {
    const newUnit = altitudeUnit === "meters" ? "feet" : "meters";
    const convertedValue = convertAltitude(altitude, altitudeUnit, newUnit);
    setAltitudeUnit(newUnit);
    setAltitude(Math.round(convertedValue));
  };

  // ============================================================================
  // WEATHER FILE PARSING
  // ============================================================================
  
  const parseEPWFile = useCallback((content: string): { data: ParsedWeatherData[], metadata: WeatherFileMetadata } => {
    const lines = content.split('\n').filter(line => line.trim());
    
    // EPW format: First 8 lines are header
    if (lines.length < 10) {
      throw new Error("Invalid EPW file: Too few lines");
    }

    // Parse location from first line: LOCATION,city,state,country,source,WMO,lat,lon,tz,elevation
    const locationLine = lines[0].split(',');
    const location = `${locationLine[1]}, ${locationLine[2]}, ${locationLine[3]}`.trim();
    const elevation = parseFloat(locationLine[9]) || 0;

    // Parse data lines (skip first 8 header lines)
    const data: ParsedWeatherData[] = [];
    
    for (let i = 8; i < lines.length && i < 8768; i++) { // 8760 hours + 8 header lines
      const values = lines[i].split(',');
      
      if (values.length < 10) continue;

      // EPW columns: Year,Month,Day,Hour,Minute,DataSource,DryBulb,DewPoint,RelHum,AtmPress,...
      const hour = parseInt(values[3]) - 1; // EPW hours are 1-24, convert to 0-23
      const dryBulb = parseFloat(values[6]);
      const dewPoint = parseFloat(values[7]);
      const relHum = parseFloat(values[8]);
      const atmPress = parseFloat(values[9]);

      // Calculate wet bulb temperature (simplified Magnus formula)
      const wetBulb = dryBulb * Math.atan(0.151977 * Math.sqrt(relHum + 8.313659)) +
                      Math.atan(dryBulb + relHum) - Math.atan(relHum - 1.676331) +
                      0.00391838 * Math.pow(relHum, 1.5) * Math.atan(0.023101 * relHum) - 4.686035;

      data.push({
        hour: (i - 8),
        dry_bulb_c: dryBulb,
        wet_bulb_c: wetBulb,
        relative_humidity: relHum,
        atmospheric_pressure_pa: atmPress,
      });
    }

    return {
      data,
      metadata: {
        location,
        elevation,
        rowCount: data.length,
        hasValidData: data.length >= 8760,
      },
    };
  }, []);

  const parseCSVFile = useCallback((content: string): { data: ParsedWeatherData[], metadata: WeatherFileMetadata } => {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error("CSV file is empty or invalid");
    }

    // Parse header
    const rawHeader = lines[0].split(',').map(h => h.trim());
    const header = rawHeader.map(h => h.toLowerCase().replace(/\s+/g, '_'));

    // Map column names - support multiple naming conventions
    const columnMap: any = {};
    header.forEach((col, i) => {
      // Timestamp/Hour
      if (col.includes('timestamp') || col.includes('hour') || col.includes('time')) {
        columnMap.hour = i;
      }
      // Dry Bulb Temperature
      if (col.includes('dry_bulb') || col.includes('drybulb') || col.includes('dry bulb') || 
          (col.includes('temp') && !col.includes('dew') && !col.includes('wet'))) {
        columnMap.dry_bulb_c = i;
      }
      // Dew Point Temperature
      if (col.includes('dew_point') || col.includes('dewpoint') || col.includes('dew point')) {
        columnMap.dew_point_c = i;
      }
      // Wet Bulb Temperature (if provided)
      if (col.includes('wet_bulb') || col.includes('wetbulb') || col.includes('wet bulb')) {
        columnMap.wet_bulb_c = i;
      }
      // Relative Humidity
      if (col.includes('relative') || col.includes('humidity') || col.includes('rh') || col.includes('rel_hum')) {
        columnMap.relative_humidity = i;
      }
      // Atmospheric Pressure
      if (col.includes('pressure') || col.includes('atm') || col.includes('press')) {
        columnMap.pressure = i;
      }
    });

    // Validate required columns
    if (columnMap.dry_bulb_c === undefined) {
      throw new Error(`Missing required column: dry_bulb or temperature. Found: ${rawHeader.join(', ')}`);
    }
    if (columnMap.relative_humidity === undefined) {
      throw new Error(`Missing required column: relative_humidity. Found: ${rawHeader.join(', ')}`);
    }

    console.log('📊 CSV Column Mapping:', {
      hour: columnMap.hour !== undefined ? rawHeader[columnMap.hour] : 'auto-generated',
      dry_bulb: rawHeader[columnMap.dry_bulb_c],
      dew_point: columnMap.dew_point_c !== undefined ? rawHeader[columnMap.dew_point_c] : 'not provided',
      wet_bulb: columnMap.wet_bulb_c !== undefined ? rawHeader[columnMap.wet_bulb_c] : 'will calculate',
      humidity: rawHeader[columnMap.relative_humidity],
      pressure: columnMap.pressure !== undefined ? rawHeader[columnMap.pressure] : 'default 101325 Pa'
    });

    // Parse data rows
    const data: ParsedWeatherData[] = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      
      const hour = columnMap.hour !== undefined ? parseFloat(values[columnMap.hour]) : index;
      const dryBulb = parseFloat(values[columnMap.dry_bulb_c]);
      const humidity = Math.min(Math.max(parseFloat(values[columnMap.relative_humidity]), 0), 100);
      const pressure = columnMap.pressure !== undefined
        ? parseFloat(values[columnMap.pressure])
        : 101325; // Standard atmospheric pressure at sea level

      if (isNaN(dryBulb) || isNaN(humidity)) {
        throw new Error(`Invalid data at row ${index + 2}: dry_bulb=${dryBulb}, humidity=${humidity}`);
      }

      // Calculate wet bulb temperature using psychrometric formula
      // This is a simplified Stull formula (2011) - accurate within 0.3°C
      let wetBulb: number;
      
      if (columnMap.wet_bulb_c !== undefined && values[columnMap.wet_bulb_c]) {
        // Use provided wet bulb if available
        wetBulb = parseFloat(values[columnMap.wet_bulb_c]);
      } else {
        // Calculate wet bulb from dry bulb and relative humidity
        // Stull (2011) formula: Tw = T * atan[0.151977(RH% + 8.313659)^0.5] + atan(T + RH%) - atan(RH% - 1.676331) + 0.00391838(RH%)^1.5 * atan(0.023101 * RH%) - 4.686035
        const T = dryBulb;
        const RH = humidity;
        
        wetBulb = T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
                  Math.atan(T + RH) - 
                  Math.atan(RH - 1.676331) +
                  0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 
                  4.686035;
      }

      // Validate wet bulb is physically possible (must be <= dry bulb)
      if (wetBulb > dryBulb) {
        console.warn(`⚠️ Row ${index + 2}: Wet bulb (${wetBulb.toFixed(2)}°C) > Dry bulb (${dryBulb.toFixed(2)}°C). Capping to dry bulb.`);
        wetBulb = dryBulb;
      }

      return {
        hour,
        dry_bulb_c: dryBulb,
        wet_bulb_c: wetBulb,
        relative_humidity: humidity,
        atmospheric_pressure_pa: pressure,
      };
    });

    console.log(`✅ Parsed ${data.length} weather data points`);
    console.log(`📊 Sample data point:`, data[0]);

    return {
      data,
      metadata: {
        location: "Custom Location (CSV)",
        elevation: 0,
        rowCount: data.length,
        hasValidData: data.length >= 8760,
      },
    };
  }, []);

  const handleFileProcessing = useCallback(async (file: File) => {
    setIsProcessing(true);
    setUploadError(null);

    try {
      const content = await file.text();
      const isEPW = file.name.toLowerCase().endsWith('.epw');
      const isCSV = file.name.toLowerCase().endsWith('.csv');

      if (!isEPW && !isCSV) {
        throw new Error("Please upload a .epw or .csv file");
      }

      const { data, metadata } = isEPW 
        ? parseEPWFile(content)
        : parseCSVFile(content);

      if (!metadata.hasValidData) {
        throw new Error(`Insufficient data: Found ${metadata.rowCount} hours, need 8760`);
      }

      setWeatherFile(file);
      setWeatherData(data);
      setWeatherMetadata(metadata);
      
      // Auto-set elevation from EPW file
      if (isEPW && metadata.elevation > 0) {
        setAltitude(Math.round(metadata.elevation));
        setAltitudeUnit("meters");
      }

      console.log('✅ Weather file parsed:', metadata);
    } catch (error: any) {
      console.error('❌ Weather file parsing error:', error);
      setUploadError(error.message || "Failed to parse weather file");
      setWeatherFile(null);
      setWeatherData([]);
      setWeatherMetadata(null);
    } finally {
      setIsProcessing(false);
    }
  }, [parseEPWFile, parseCSVFile]);

  // ============================================================================
  // DRAG & DROP HANDLERS
  // ============================================================================
  
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileProcessing(files[0]);
    }
  }, [handleFileProcessing]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcessing(files[0]);
    }
  }, [handleFileProcessing]);

  // ============================================================================
  // WARMING DELTA UTILITIES
  // ============================================================================
  
  const getWarmingColor = useCallback((delta: number): string => {
    if (delta === 0) return isDark ? "text-blue-400" : "text-blue-600";
    if (delta <= 0.5) return isDark ? "text-green-400" : "text-green-600";
    if (delta <= 1.0) return isDark ? "text-orange-400" : "text-orange-600";
    return isDark ? "text-red-400" : "text-red-600";
  }, [isDark]);

  const getWarmingLabel = useCallback((delta: number): string => {
    if (delta === 0) return "Baseline (No Warming)";
    if (delta <= 0.5) return "Mild Warming";
    if (delta <= 1.0) return "Moderate Warming (RCP 4.5)";
    return "High Warming (RCP 8.5)";
  }, []);

  const getSliderBackground = useCallback((delta: number): string => {
    const percentage = (delta / 1.5) * 100;
    if (isDark) {
      return `linear-gradient(to right, 
        #3b82f6 0%, 
        #10b981 ${percentage * 0.33}%, 
        #f59e0b ${percentage * 0.67}%, 
        #ef4444 ${percentage}%, 
        #4b5563 ${percentage}%, 
        #4b5563 100%)`;
    } else {
      return `linear-gradient(to right, 
        #60a5fa 0%, 
        #34d399 ${percentage * 0.33}%, 
        #fbbf24 ${percentage * 0.67}%, 
        #f87171 ${percentage}%, 
        #d1d5db ${percentage}%, 
        #d1d5db 100%)`;
    }
  }, [isDark]);

  // ============================================================================
  // SYNC WITH PARENT
  // ============================================================================
  
  React.useEffect(() => {
    onConfigChange({
      weatherFile: weatherFile?.name,
      weatherData,
      weatherMetadata,
      warmingDelta,
      temperatureOffset: warmingDelta,
      altitude: altitudeInMeters,
      altitudeUnit,
      altitudeDisplay: altitude,
      numberOfRacks,
      serversPerRack,
      totalServers,
      serverIdlePowerW,
      serverMaxPowerW,
      workloadType,
      workloadLabel: selectedWorkload.label,
      refreshCycle: selectedWorkload.refreshCycle,
      throttlingPenalty: selectedWorkload.throttlingPenalty,
      avgCpuUtilization,
      totalITLoadKW,
      peakITLoadKW,
      waterStressLevel,
      waterStressLabel: selectedWaterStress.label,
      wueThreshold: selectedWaterStress.wueThreshold,
      waterRiskLevel: selectedWaterStress.riskLevel,
      chillerType,
      chillerLabel: selectedChiller.label,
      chillerRefCOP: selectedChiller.refCOP,
      chillerRefCOPMin: selectedChiller.refCOPMin,
      chillerRefCOPMax: selectedChiller.refCOPMax,
      chillerWaterUsage: selectedChiller.waterUsage,
      supplyWaterTempC,
      isInEfficientZone,
      foulingFactor,
      simulationDuration,
      baseElectricityRate,
      touEnabled,
      peakMultiplier,
      offPeakMultiplier,
      priceProfile,
      carbonIntensity,
      refrigerantType,
      refrigerantLabel: selectedRefrigerant.label,
      refrigerantGWP: selectedRefrigerant.gwp,
      useIPCCPathway,
      carbonTax2030,
      carbonTaxLevel: carbonTax2030 < 100 ? "Low" : carbonTax2030 < 254 ? "Moderate" : carbonTax2030 < 400 ? "High" : "Extreme",
      gate4Status: carbonTax2030 < 300 ? "PASS" : "FAIL",
    });
  }, [
    weatherFile, 
    weatherData, 
    weatherMetadata, 
    warmingDelta, 
    altitude, 
    altitudeUnit, 
    altitudeInMeters,
    numberOfRacks,
    serversPerRack,
    totalServers,
    serverIdlePowerW,
    serverMaxPowerW,
    workloadType,
    selectedWorkload,
    avgCpuUtilization,
    totalITLoadKW,
    peakITLoadKW,
    waterStressLevel,
    selectedWaterStress,
    chillerType,
    selectedChiller,
    supplyWaterTempC,
    isInEfficientZone,
    foulingFactor,
    simulationDuration,
    baseElectricityRate,
    touEnabled,
    peakMultiplier,
    offPeakMultiplier,
    priceProfile,
    carbonIntensity,
    refrigerantType,
    selectedRefrigerant,
    useIPCCPathway,
    carbonTax2030,
    onConfigChange
  ]);

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <style>{sliderStyles}</style>
      <div
        className={`max-w-6xl mx-auto transition-all duration-500 ${
          isTransitioning ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0"
        }`}
      >
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <h2 className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
          Configure Chilled Water Cooling
        </h2>
        <p className={`text-lg max-w-2xl mx-auto ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Upload weather data, select climate scenario, and configure site parameters for engineering-grade analysis.
        </p>
      </div>

      {/* Main Configuration Panel */}
      <div
        className={`p-8 rounded-2xl space-y-8 ${
          isDark
            ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
            : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
        }`}
      >
        
        {/* ====================================================================
            1. WEATHER DATA — LOCATION PICKER (auto-fetch from EnergyPlus)
            ==================================================================== */}
        <WeatherLocationPicker
          mode="chilled-water"
          isDark={isDark}
          onWeatherLoaded={(result) => {
            const points = result.data as ChilledWaterWeatherPoint[];
            setWeatherData(points as any);
            setWeatherMetadata({
              location:     result.location ?? result.city,
              elevation:    result.elevation ?? 0,
              rowCount:     result.hours,
              hasValidData: result.hours >= 8760,
            });
            setWeatherFile({ name: result.city + ".epw", size: 0 } as any);
          }}
        />

        {/* ====================================================================
            2. WARMING DELTA (ΔT) - RANGE SLIDER
            ==================================================================== */}
        <div>
          <label className={`block mb-3 font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
            <Thermometer className="inline-block w-5 h-5 mr-2 mb-1" />
            Warming Delta (ΔT)
          </label>
          <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Adjust temperature offset to model climate warming scenarios (T<sub>ambient</sub> = T<sub>base</sub> + ΔT)
          </p>

          {/* Dynamic Label with Live Value */}
          <div className="flex items-center justify-between mb-4">
            <div className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {getWarmingLabel(warmingDelta)}
            </div>
            <div className={`text-2xl font-bold ${getWarmingColor(warmingDelta)}`}>
              {warmingDelta === 0 ? "0.0°C" : `+${warmingDelta.toFixed(1)}°C`}
            </div>
          </div>

          {/* Range Slider */}
          <div className="relative">
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.1}
              value={warmingDelta}
              onChange={(e) => setWarmingDelta(Number(e.target.value))}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: getSliderBackground(warmingDelta),
              }}
            />
            
            {/* Tick Marks */}
            <div className="flex justify-between mt-2 px-1">
              {[0, 0.5, 1.0, 1.5].map((tick) => (
                <div key={tick} className="flex flex-col items-center">
                  <div className={`w-0.5 h-2 ${isDark ? "bg-gray-600" : "bg-gray-400"}`} />
                  <span className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    {tick.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Scenario Reference Guide */}
          <div className={`mt-4 p-4 rounded-lg ${isDark ? "bg-[#1a1f3a]" : "bg-gray-50"}`}>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className={`font-medium mb-1 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                  0.0°C
                </div>
                <div className={isDark ? "text-gray-400" : "text-gray-600"}>
                  Baseline 2026
                </div>
              </div>
              <div>
                <div className={`font-medium mb-1 ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                  +1.0°C
                </div>
                <div className={isDark ? "text-gray-400" : "text-gray-600"}>
                  RCP 4.5 (2030)
                </div>
              </div>
              <div>
                <div className={`font-medium mb-1 ${isDark ? "text-red-400" : "text-red-600"}`}>
                  +1.5°C
                </div>
                <div className={isDark ? "text-gray-400" : "text-gray-600"}>
                  RCP 8.5 (2030)
                </div>
              </div>
            </div>
          </div>

          {/* Physics Impact Note */}
          {warmingDelta > 0 && (
            <div className={`mt-3 flex items-start space-x-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                All ambient temperatures will be increased by {warmingDelta.toFixed(1)}°C in the simulation loop.
                This affects chiller COP, cooling tower performance, and thermal compliance.
              </span>
            </div>
          )}
        </div>

        {/* ====================================================================
            3. IT INFRASTRUCTURE & WORKLOAD
            ==================================================================== */}
        <div>
          <label className={`block mb-3 font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
            <Cpu className="inline-block w-5 h-5 mr-2 mb-1" />
            IT Infrastructure & Workload
          </label>
          <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Configure hardware scale and workload characteristics (CloudSim Plus integration)
          </p>

          {/* Summary Stats */}
          <div className={`mb-6 p-4 rounded-xl ${isDark ? "bg-[#1a1f3a]" : "bg-gray-50"}`}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {totalServers}
                </div>
                <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Total Servers
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                  {totalITLoadKW.toFixed(1)} kW
                </div>
                <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Avg IT Load
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                  {peakITLoadKW.toFixed(1)} kW
                </div>
                <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Peak IT Load
                </div>
              </div>
            </div>
          </div>

          {/* Hardware Scale */}
          <div className="space-y-4 mb-6">
            <div className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Hardware Scale
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Number of Racks */}
              <div>
                <label className={`block mb-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Number of Racks <span className="opacity-60">(1–50)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={numberOfRacks}
                  onChange={(e) => setNumberOfRacks(Math.max(1, Number(e.target.value)))}
                  className={`
                    w-full p-3 border rounded-lg
                    ${isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                    ${numberOfRacks < 1 || numberOfRacks > 50 ? "border-red-500 ring-1 ring-red-500" : ""}
                  `}
                />
                {(numberOfRacks < 1 || numberOfRacks > 50) && (
                  <p className="text-red-500 text-xs mt-1">Must be between 1 and 50</p>
                )}
              </div>

              {/* Servers per Rack */}
              <div>
                <label className={`block mb-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Servers per Rack <span className="opacity-60">(1–42)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={42}
                  value={serversPerRack}
                  onChange={(e) => setServersPerRack(Math.max(1, Number(e.target.value)))}
                  className={`
                    w-full p-3 border rounded-lg
                    ${isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                    ${serversPerRack < 1 || serversPerRack > 42 ? "border-red-500 ring-1 ring-red-500" : ""}
                  `}
                />
                {(serversPerRack < 1 || serversPerRack > 42) && (
                  <p className="text-red-500 text-xs mt-1">Must be between 1 and 42</p>
                )}
              </div>
            </div>
          </div>

          {/* Power Profile */}
          <div className="space-y-4 mb-6">
            <div className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Power Profile (per server)
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Idle Power */}
              <div>
                <label className={`block mb-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Idle Power (W) <span className="opacity-60">(50–500)</span>
                </label>
                <input
                  type="number"
                  min={50}
                  max={500}
                  step={10}
                  value={serverIdlePowerW}
                  onChange={(e) => setServerIdlePowerW(Math.max(50, Number(e.target.value)))}
                  className={`
                    w-full p-3 border rounded-lg
                    ${isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                    ${serverIdlePowerW < 50 || serverIdlePowerW > 500 ? "border-red-500 ring-1 ring-red-500" : ""}
                  `}
                />
                {(serverIdlePowerW < 50 || serverIdlePowerW > 500) && (
                  <p className="text-red-500 text-xs mt-1">Must be between 50W and 500W</p>
                )}
              </div>

              {/* Max Power */}
              <div>
                <label className={`block mb-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Max Power (W) <span className="opacity-60">(100–2000)</span>
                </label>
                <input
                  type="number"
                  min={100}
                  max={2000}
                  step={50}
                  value={serverMaxPowerW}
                  onChange={(e) => setServerMaxPowerW(Math.max(100, Number(e.target.value)))}
                  className={`
                    w-full p-3 border rounded-lg
                    ${isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                    ${serverMaxPowerW < 100 || serverMaxPowerW > 2000 ? "border-red-500 ring-1 ring-red-500" : ""}
                  `}
                />
                {(serverMaxPowerW < 100 || serverMaxPowerW > 2000) && (
                  <p className="text-red-500 text-xs mt-1">Must be between 100W and 2000W</p>
                )}
              </div>
            </div>
          </div>

          {/* Workload Type Preset */}
          <div className="space-y-4 mb-6">
            <div className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Workload Type (Preset)
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {workloadTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setWorkloadType(type.id);
                    setAvgCpuUtilization(type.typicalUtilization);
                  }}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-300 text-center
                    ${workloadType === type.id
                      ? `bg-gradient-to-br ${type.color} ${type.borderColor} shadow-lg`
                      : isDark
                        ? "bg-[#1a1f3a] border-[#3f4a68] hover:border-[#4f5a78]"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }
                  `}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className={`font-semibold text-sm mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {type.label}
                  </div>
                  <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {type.description}
                  </div>
                  {workloadType === type.id && (
                    <div className="mt-2 pt-2 border-t border-current/20">
                      <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Refresh: {type.refreshCycle}yr
                        {type.throttlingPenalty > 0 && ` • Penalty: ${type.throttlingPenalty}%`}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Duration Options */}
          <div className="space-y-4 mb-6">
            <div className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Simulation Duration
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { hours: 730, label: "1 Month" },
                { hours: 2190, label: "3 Months" },
                { hours: 4380, label: "6 Months" },
                { hours: 8760, label: "Full Year" },
              ].map((option) => (
                <button
                  key={option.hours}
                  onClick={() => setSimulationDuration(option.hours)}
                  className={`
                    p-3 rounded-lg border-2 transition-all duration-300 text-center
                    ${simulationDuration === option.hours
                      ? isDark
                        ? "bg-blue-500/20 border-blue-500 shadow-lg"
                        : "bg-blue-50 border-blue-500 shadow-lg"
                      : isDark
                        ? "bg-[#1a1f3a] border-[#3f4a68] hover:border-[#4f5a78]"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }
                  `}
                >
                  <div className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CPU Utilization Curve */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Average CPU Utilization
              </div>
              <div className={`text-xl font-bold ${getUtilizationColor(avgCpuUtilization)}`}>
                {avgCpuUtilization}%
              </div>
            </div>

            {/* Utilization Slider */}
            <div className="relative">
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={avgCpuUtilization}
                onChange={(e) => setAvgCpuUtilization(Number(e.target.value))}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: `linear-gradient(to right, 
                    #10b981 0%, 
                    #10b981 ${avgCpuUtilization * 0.4}%, 
                    #fbbf24 ${avgCpuUtilization * 0.4}%, 
                    #fbbf24 ${avgCpuUtilization * 0.7}%, 
                    #f59e0b ${avgCpuUtilization * 0.7}%, 
                    #f59e0b ${avgCpuUtilization * 0.9}%, 
                    #ef4444 ${avgCpuUtilization * 0.9}%, 
                    #ef4444 ${avgCpuUtilization}%, 
                    ${isDark ? '#4b5563' : '#d1d5db'} ${avgCpuUtilization}%, 
                    ${isDark ? '#4b5563' : '#d1d5db'} 100%)`
                }}
              />
              
              {/* Tick Marks */}
              <div className="flex justify-between mt-2 px-1">
                {[0, 25, 50, 75, 100].map((tick) => (
                  <div key={tick} className="flex flex-col items-center">
                    <div className={`w-0.5 h-2 ${isDark ? "bg-gray-600" : "bg-gray-400"}`} />
                    <span className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      {tick}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Utilization Impact */}
            <div className={`p-3 rounded-lg ${isDark ? "bg-[#1a1f3a]" : "bg-gray-50"}`}>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Current Power/Server
                  </div>
                  <div className={isDark ? "text-white" : "text-gray-900"}>
                    {(serverIdlePowerW + (serverMaxPowerW - serverIdlePowerW) * (avgCpuUtilization / 100)).toFixed(0)} W
                  </div>
                </div>
                <div>
                  <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Power Efficiency
                  </div>
                  <div className={isDark ? "text-white" : "text-gray-900"}>
                    {((avgCpuUtilization / 100) / ((serverIdlePowerW + (serverMaxPowerW - serverIdlePowerW) * (avgCpuUtilization / 100)) / serverMaxPowerW) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            4. WATER STRESS LEVEL
            ==================================================================== */}
        <div>
          <label className={`block mb-3 font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
            <Droplets className="inline-block w-5 h-5 mr-2 mb-1" />
            Water Stress Level
          </label>
          <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Regional water availability affects Phase 4 "Water Constraint" gate (WUE threshold)
          </p>

          {/* Custom Dropdown */}
          <div className="relative">
            <select
              value={waterStressLevel}
              onChange={(e) => setWaterStressLevel(e.target.value)}
              className={`
                w-full p-4 pr-12 border rounded-xl appearance-none cursor-pointer text-base font-medium
                ${isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                  : "bg-white border-gray-300 text-gray-900"
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                transition-all
              `}
            >
              {waterStressLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.icon} {level.label} - {level.description}
                </option>
              ))}
            </select>
            
            {/* Dropdown Arrow */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Selected Level Details Card */}
          <div className={`
            mt-4 p-4 rounded-xl border-2 transition-all
            ${selectedWaterStress.bgColor} ${selectedWaterStress.borderColor}
          `}>
            <div className="flex items-start space-x-3">
              <div className="text-3xl">{selectedWaterStress.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className={`font-semibold text-lg ${selectedWaterStress.color}`}>
                    {selectedWaterStress.label} Water Stress
                  </div>
                  <div className={`
                    px-3 py-1 rounded-full text-xs font-bold
                    ${selectedWaterStress.riskLevel === "LOW" 
                      ? isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"
                      : selectedWaterStress.riskLevel === "MODERATE"
                      ? isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700"
                      : selectedWaterStress.riskLevel === "HIGH"
                      ? isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-700"
                      : isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"
                    }
                  `}>
                    {selectedWaterStress.riskLevel} RISK
                  </div>
                </div>
                
                <div className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {selectedWaterStress.description}
                </div>

                {/* WUE Threshold */}
                <div className={`
                  p-3 rounded-lg
                  ${isDark ? "bg-[#1a1f3a]" : "bg-white"}
                `}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        WUE Threshold
                      </div>
                      <div className={`text-lg font-bold ${selectedWaterStress.color}`}>
                        {selectedWaterStress.wueThreshold.toFixed(1)} L/kWh
                      </div>
                    </div>
                    <div>
                      <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Phase 4 Gate
                      </div>
                      <div className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        Water Constraint
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning for High Stress */}
                {(selectedWaterStress.riskLevel === "HIGH" || selectedWaterStress.riskLevel === "CRITICAL") && (
                  <div className={`
                    mt-3 p-3 rounded-lg flex items-start space-x-2
                    ${isDark ? "bg-orange-500/10" : "bg-orange-50"}
                  `}>
                    <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      selectedWaterStress.riskLevel === "CRITICAL" ? "text-red-500" : "text-orange-500"
                    }`} />
                    <div className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {selectedWaterStress.riskLevel === "CRITICAL" ? (
                        <>
                          <strong>Critical Water Scarcity:</strong> Evaporative cooling may face permit denial. 
                          Consider dry cooling or liquid cooling alternatives.
                        </>
                      ) : (
                        <>
                          <strong>High Water Stress:</strong> System will be evaluated against strict WUE limits. 
                          Optimize cooling tower efficiency and consider water recycling.
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            6. MECHANICAL SPECS (ADVANCED)
            ==================================================================== */}
        <div>
          <label className={`block mb-3 font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
            <Settings className="inline-block w-5 h-5 mr-2 mb-1" />
            Mechanical Specs (Advanced)
          </label>
          <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Configure chiller type, supply temperature, and equipment degradation
          </p>

          {/* Chiller Type Preset */}
          <div className="mb-6">
            <div className={`text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Chiller Type
            </div>
            
            <div className="relative">
              <select
                value={chillerType}
                onChange={(e) => setChillerType(e.target.value)}
                className={`
                  w-full p-4 pr-12 border rounded-xl appearance-none cursor-pointer text-base font-medium
                  ${isDark
                    ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                    : "bg-white border-gray-300 text-gray-900"
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  transition-all
                `}
              >
                {chillerTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.label} - {type.description}
                  </option>
                ))}
              </select>
              
              {/* Dropdown Arrow */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Chiller Details Card */}
            <div className={`
              mt-4 p-4 rounded-xl border
              ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-gray-50 border-gray-200"}
            `}>
              <div className="flex items-start space-x-3">
                <div className="text-3xl">{selectedChiller.icon}</div>
                <div className="flex-1">
                  <div className={`font-semibold mb-2 ${selectedChiller.color}`}>
                    {selectedChiller.label}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Reference COP
                      </div>
                      <div className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {selectedChiller.refCOPMin.toFixed(1)} – {selectedChiller.refCOPMax.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Water Usage
                      </div>
                      <div className={`font-bold ${
                        selectedChiller.waterUsage === "None" 
                          ? isDark ? "text-green-400" : "text-green-600"
                          : isDark ? "text-blue-400" : "text-blue-600"
                      }`}>
                        {selectedChiller.waterUsage}
                      </div>
                    </div>
                  </div>

                  <div className={`mt-3 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    <strong>Application:</strong> {selectedChiller.description}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supply Water Temperature (T_chw) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Supply Water Temperature (T<sub>chw</sub>)
              </div>
              <div className={`text-xl font-bold ${getSupplyTempColor(supplyWaterTempC)}`}>
                {supplyWaterTempC.toFixed(1)}°C
              </div>
            </div>

            {/* Efficient Zone Indicator */}
            {isInEfficientZone && (
              <div className={`mb-3 flex items-center space-x-2 text-sm ${isDark ? "text-green-400" : "text-green-600"}`}>
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">In Efficient Zone (7-12°C)</span>
              </div>
            )}

            {/* Temperature Slider */}
            <div className="relative">
              <input
                type="range"
                min={5}
                max={15}
                step={0.5}
                value={supplyWaterTempC}
                onChange={(e) => setSupplyWaterTempC(Number(e.target.value))}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: getSupplyTempSliderBackground(supplyWaterTempC),
                }}
              />
              
              {/* Tick Marks */}
              <div className="flex justify-between mt-2 px-1">
                {[5, 7, 9, 12, 15].map((tick) => (
                  <div key={tick} className="flex flex-col items-center">
                    <div className={`w-0.5 h-2 ${
                      tick >= 7 && tick <= 12 
                        ? isDark ? "bg-green-500" : "bg-green-600"
                        : isDark ? "bg-gray-600" : "bg-gray-400"
                    }`} />
                    <span className={`text-xs mt-1 ${
                      tick >= 7 && tick <= 12
                        ? isDark ? "text-green-400" : "text-green-600"
                        : isDark ? "text-gray-500" : "text-gray-500"
                    }`}>
                      {tick}°C
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Temperature Zone Info */}
            <div className={`mt-4 p-3 rounded-lg ${isDark ? "bg-[#1a1f3a]" : "bg-gray-50"}`}>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className={`font-medium mb-1 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                    &lt; 7°C
                  </div>
                  <div className={isDark ? "text-gray-400" : "text-gray-600"}>
                    High COP, Risk of condensation
                  </div>
                </div>
                <div className="text-center">
                  <div className={`font-medium mb-1 ${isDark ? "text-green-400" : "text-green-600"}`}>
                    7-12°C
                  </div>
                  <div className={isDark ? "text-gray-400" : "text-gray-600"}>
                    Efficient Zone ✓
                  </div>
                </div>
                <div className="text-center">
                  <div className={`font-medium mb-1 ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                    &gt; 12°C
                  </div>
                  <div className={isDark ? "text-gray-400" : "text-gray-600"}>
                    Lower COP, Thermal risk
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fouling Factor */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Fouling Factor
              </div>
              <div className={`text-xl font-bold ${getFoulingColor(foulingFactor)}`}>
                {foulingFactor.toFixed(2)}
              </div>
            </div>

            <p className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Equipment degradation multiplier (1.0 = clean, 1.3 = 30% degraded)
            </p>

            {/* Fouling Slider */}
            <div className="relative">
              <input
                type="range"
                min={1.0}
                max={1.3}
                step={0.01}
                value={foulingFactor}
                onChange={(e) => setFoulingFactor(Number(e.target.value))}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: getFoulingSliderBackground(foulingFactor),
                }}
              />
              
              {/* Tick Marks */}
              <div className="flex justify-between mt-2 px-1">
                {[1.0, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30].map((tick) => (
                  <div key={tick} className="flex flex-col items-center">
                    <div className={`w-0.5 h-2 ${isDark ? "bg-gray-600" : "bg-gray-400"}`} />
                    <span className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      {tick.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fouling Impact */}
            <div className={`mt-4 p-3 rounded-lg ${isDark ? "bg-[#1a1f3a]" : "bg-gray-50"}`}>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    COP Impact
                  </div>
                  <div className={`font-bold ${getFoulingColor(foulingFactor)}`}>
                    -{((foulingFactor - 1) * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Power Increase
                  </div>
                  <div className={`font-bold ${getFoulingColor(foulingFactor)}`}>
                    +{((foulingFactor - 1) * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Condition
                  </div>
                  <div className={`font-bold ${getFoulingColor(foulingFactor)}`}>
                    {foulingFactor <= 1.05 ? "Clean" : foulingFactor <= 1.15 ? "Good" : foulingFactor <= 1.25 ? "Fair" : "Poor"}
                  </div>
                </div>
              </div>
            </div>

            {/* Maintenance Warning */}
            {foulingFactor > 1.2 && (
              <div className={`
                mt-3 p-3 rounded-lg flex items-start space-x-2
                ${isDark ? "bg-orange-500/10" : "bg-orange-50"}
              `}>
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
                <div className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  <strong>High Fouling Detected:</strong> Equipment degradation exceeds 20%. 
                  Schedule maintenance to restore efficiency and prevent thermal issues.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================================
            7. ECONOMIC & ENVIRONMENTAL IMPACT
            ==================================================================== */}
        <div>
          <label className={`block mb-3 font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
            <DollarSign className="inline-block w-5 h-5 mr-2 mb-1" />
            Economic & Environmental Impact
          </label>
          <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Configure electricity rates, carbon intensity, and refrigerant type for LCCP and NPV calculations
          </p>

          {/* Electricity Rate & TOU */}
          <div className="mb-6">
            <div className={`text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Electricity Rate
            </div>

            {/* Base Rate Input */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1">
                <label className={`block mb-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Base Rate ($/kWh) <span className="opacity-60">(0.01–1.00)</span>
                </label>
                <input
                  type="number"
                  min={0.01}
                  max={1.0}
                  step={0.01}
                  value={baseElectricityRate}
                  onChange={(e) => setBaseElectricityRate(Math.max(0.01, Number(e.target.value)))}
                  className={`
                    w-full p-3 border rounded-lg
                    ${isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                    ${baseElectricityRate < 0.01 || baseElectricityRate > 1.0 ? "border-red-500 ring-1 ring-red-500" : ""}
                  `}
                />
                {(baseElectricityRate < 0.01 || baseElectricityRate > 1.0) && (
                  <p className="text-red-500 text-xs mt-1">Must be between $0.01 and $1.00 per kWh</p>
                )}
              </div>

              {/* TOU Toggle Switch */}
              <div>
                <label className={`block mb-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Time-of-Use (TOU)
                </label>
                <button
                  onClick={() => setTouEnabled(!touEnabled)}
                  className={`
                    relative w-16 h-8 rounded-full transition-colors duration-300
                    ${touEnabled
                      ? isDark ? "bg-blue-500" : "bg-blue-600"
                      : isDark ? "bg-gray-600" : "bg-gray-400"
                    }
                  `}
                >
                  <div className={`
                    absolute top-1 w-6 h-6 rounded-full bg-white transition-transform duration-300
                    ${touEnabled ? "left-9" : "left-1"}
                  `} />
                </button>
              </div>
            </div>

            {/* TOU Schedule (Expandable) */}
            <div className={`
              overflow-hidden transition-all duration-500
              ${touEnabled ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}
            `}>
              <div className={`
                p-4 rounded-xl border
                ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-gray-50 border-gray-200"}
              `}>
                <div className={`text-sm font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                  TOU Schedule
                </div>

                {/* Schedule Table */}
                <div className="space-y-3 mb-4">
                  {/* Peak Hours */}
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Peak Hours
                    </div>
                    <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      12:00 PM – 6:00 PM
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={1.0}
                        max={3.0}
                        step={0.1}
                        value={peakMultiplier}
                        onChange={(e) => setPeakMultiplier(Number(e.target.value))}
                        className={`
                          w-20 p-2 border rounded text-sm
                          ${isDark
                            ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                            : "bg-white border-gray-300 text-gray-900"
                          }
                        `}
                      />
                      <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        × base
                      </span>
                    </div>
                  </div>

                  {/* Off-Peak Hours */}
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Off-Peak Hours
                    </div>
                    <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      10:00 PM – 6:00 AM
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={0.3}
                        max={1.0}
                        step={0.1}
                        value={offPeakMultiplier}
                        onChange={(e) => setOffPeakMultiplier(Number(e.target.value))}
                        className={`
                          w-20 p-2 border rounded text-sm
                          ${isDark
                            ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                            : "bg-white border-gray-300 text-gray-900"
                          }
                        `}
                      />
                      <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        × base
                      </span>
                    </div>
                  </div>

                  {/* Partial-Peak (Default) */}
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Partial-Peak
                    </div>
                    <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      All other hours
                    </div>
                    <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      1.0× base
                    </div>
                  </div>
                </div>

                {/* 24-Hour Price Profile Visualization */}
                <div>
                  <div className={`text-xs font-medium mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    24-Hour Price Profile
                  </div>
                  <div className="flex items-end space-x-0.5 h-24">
                    {priceProfile.map((hour) => (
                      <div
                        key={hour.hour}
                        className="flex-1 flex flex-col items-center group relative"
                      >
                        {/* Bar */}
                        <div
                          className={`
                            w-full rounded-t transition-all
                            ${hour.multiplier === peakMultiplier
                              ? isDark ? "bg-red-500" : "bg-red-400"
                              : hour.multiplier === offPeakMultiplier
                              ? isDark ? "bg-green-500" : "bg-green-400"
                              : isDark ? "bg-blue-500" : "bg-blue-400"
                            }
                          `}
                          style={{ height: `${(hour.rate / maxRate) * 100}%` }}
                        />
                        
                        {/* Tooltip */}
                        <div className={`
                          absolute bottom-full mb-2 hidden group-hover:block
                          px-2 py-1 rounded text-xs whitespace-nowrap z-10
                          ${isDark ? "bg-gray-800 text-white" : "bg-gray-900 text-white"}
                        `}>
                          {hour.label}: ${hour.rate.toFixed(3)}/kWh
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className={isDark ? "text-gray-500" : "text-gray-500"}>12AM</span>
                    <span className={isDark ? "text-gray-500" : "text-gray-500"}>6AM</span>
                    <span className={isDark ? "text-gray-500" : "text-gray-500"}>12PM</span>
                    <span className={isDark ? "text-gray-500" : "text-gray-500"}>6PM</span>
                    <span className={isDark ? "text-gray-500" : "text-gray-500"}>12AM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Carbon Intensity */}
          <div className="mb-6">
            <div className={`text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Carbon Intensity
            </div>

            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <label className={`block mb-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Grid Carbon Factor (kg CO₂/kWh)
                </label>
                <input
                  type="number"
                  min={0.01}
                  max={2.0}
                  step={0.01}
                  value={carbonIntensity}
                  onChange={(e) => setCarbonIntensity(Math.max(0.01, Number(e.target.value)))}
                  className={`
                    w-full p-3 border rounded-lg
                    ${isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                      : "bg-white border-gray-300 text-gray-900"
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  `}
                />
              </div>

              {/* Geo-Lookup Button */}
              <button
                onClick={handleFetchRegionalCarbon}
                disabled={!weatherMetadata?.location}
                className={`
                  px-4 py-3 rounded-lg font-medium transition-all flex items-center space-x-2
                  ${!weatherMetadata?.location
                    ? isDark 
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : isDark
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }
                `}
              >
                <Zap className="w-4 h-4" />
                <span className="text-sm">Fetch Regional</span>
              </button>
            </div>

            {/* Success Message */}
            {showCarbonFetchSuccess && (
              <div className={`
                mt-3 p-3 rounded-lg flex items-center space-x-2
                ${isDark ? "bg-green-500/10" : "bg-green-50"}
              `}>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className={`text-sm ${isDark ? "text-green-400" : "text-green-700"}`}>
                  Regional carbon intensity loaded for {weatherMetadata?.location}
                </span>
              </div>
            )}

            {!weatherMetadata?.location && (
              <div className={`mt-3 text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                Upload weather file to enable regional carbon lookup
              </div>
            )}
          </div>

          {/* Refrigerant Type */}
          <div className="mb-6">
            <div className={`text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Refrigerant Type
            </div>

            <div className="relative">
              <select
                value={refrigerantType}
                onChange={(e) => setRefrigerantType(e.target.value)}
                className={`
                  w-full p-4 pr-12 border rounded-xl appearance-none cursor-pointer text-base font-medium
                  ${isDark
                    ? "bg-[#1a1f3a] border-[#3f4a68] text-white"
                    : "bg-white border-gray-300 text-gray-900"
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  transition-all
                `}
              >
                {refrigerantTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label} - {type.description} (GWP: {type.gwp})
                  </option>
                ))}
              </select>
              
              {/* Dropdown Arrow */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Refrigerant Details Card */}
            <div className={`
              mt-4 p-4 rounded-xl border
              ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-gray-50 border-gray-200"}
            `}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className={`text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Global Warming Potential (GWP)
                  </div>
                  <div className={`text-2xl font-bold ${selectedRefrigerant.color}`}>
                    {selectedRefrigerant.gwp}
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    100-year horizon
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Scope 1 Impact
                  </div>
                  <div className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                    {selectedRefrigerant.gwp < 100 ? "Low" : selectedRefrigerant.gwp < 1000 ? "Moderate" : "High"}
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    Direct emissions
                  </div>
                </div>
              </div>

              {/* Environmental Note */}
              {selectedRefrigerant.gwp > 1000 && (
                <div className={`
                  mt-3 p-3 rounded-lg flex items-start space-x-2
                  ${isDark ? "bg-orange-500/10" : "bg-orange-50"}
                `}>
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
                  <div className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    <strong>High GWP Refrigerant:</strong> Consider switching to low-GWP alternatives 
                    like R-1234yf to reduce Scope 1 emissions and comply with environmental regulations.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Carbon Tax (Dual-Mode) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Carbon Tax (2030)
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  IPCC 1.5°C Pathway
                </span>
                <button
                  onClick={() => setUseIPCCPathway(!useIPCCPathway)}
                  className={`
                    relative w-16 h-8 rounded-full transition-colors duration-300
                    ${useIPCCPathway
                      ? isDark ? "bg-green-500" : "bg-green-600"
                      : isDark ? "bg-gray-600" : "bg-gray-400"
                    }
                  `}
                >
                  <div className={`
                    absolute top-1 w-6 h-6 rounded-full bg-white transition-transform duration-300
                    ${useIPCCPathway ? "left-9" : "left-1"}
                  `} />
                </button>
              </div>
            </div>

            <p className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {useIPCCPathway 
                ? "Using IPCC 1.5°C pathway: $50/ton (2026) → $254/ton (2030)"
                : "Manual carbon tax for sensitivity analysis and local regulations"
              }
            </p>

            {/* Carbon Tax Value Display */}
            <div className="flex items-center justify-between mb-4">
              <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Carbon Tax Rate
              </div>
              <div className={`text-3xl font-bold ${getCarbonTaxColor(carbonTax2030)}`}>
                ${carbonTax2030}/ton
              </div>
            </div>

            {/* Carbon Tax Slider */}
            <div className="relative">
              <input
                type="range"
                min={0}
                max={500}
                step={10}
                value={carbonTax2030}
                onChange={(e) => !useIPCCPathway && setCarbonTax2030(Number(e.target.value))}
                disabled={useIPCCPathway}
                className={`
                  w-full h-3 rounded-lg appearance-none cursor-pointer slider-thumb
                  ${useIPCCPathway ? "opacity-50 cursor-not-allowed" : ""}
                `}
                style={{
                  background: getCarbonTaxSliderBackground(carbonTax2030),
                }}
              />
              
              {/* Tick Marks */}
              <div className="flex justify-between mt-2 px-1">
                {[0, 100, 200, 254, 300, 400, 500].map((tick) => (
                  <div key={tick} className="flex flex-col items-center">
                    <div className={`w-0.5 h-2 ${
                      tick === 254 
                        ? isDark ? "bg-green-500" : "bg-green-600"
                        : isDark ? "bg-gray-600" : "bg-gray-400"
                    }`} />
                    <span className={`text-xs mt-1 ${
                      tick === 254
                        ? isDark ? "text-green-400" : "text-green-600"
                        : isDark ? "text-gray-500" : "text-gray-500"
                    }`}>
                      ${tick}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* IPCC Pathway Indicator */}
            {useIPCCPathway && (
              <div className={`
                mt-4 p-3 rounded-lg flex items-center space-x-2
                ${isDark ? "bg-green-500/10" : "bg-green-50"}
              `}>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <div className={`text-xs ${isDark ? "text-green-400" : "text-green-700"}`}>
                  <strong>IPCC 1.5°C Pathway Active:</strong> Carbon tax locked to $254/ton (2030 target) 
                  for scientifically-aligned climate scenario.
                </div>
              </div>
            )}

            {/* Gate 4 Warning (Carbon Liability) */}
            {!useIPCCPathway && carbonTax2030 >= 300 && (
              <div className={`
                mt-4 p-3 rounded-lg flex items-start space-x-2
                ${isDark ? "bg-red-500/10" : "bg-red-50"}
              `}>
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                <div className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  <strong>Gate 4 Warning - Carbon Liability:</strong> At ${carbonTax2030}/ton, 
                  carbon tax may exceed 30% of annual OpEx. System is NOT FUTURE-PROOF. 
                  Consider renewable energy or high-efficiency cooling.
                </div>
              </div>
            )}

            {/* Sensitivity Analysis Info */}
            {!useIPCCPathway && (
              <div className={`mt-4 p-4 rounded-xl ${isDark ? "bg-[#1a1f3a]" : "bg-gray-50"}`}>
                <div className={`text-xs font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Sensitivity Analysis Impact
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Tax Level
                    </div>
                    <div className={`font-bold ${getCarbonTaxColor(carbonTax2030)}`}>
                      {carbonTax2030 < 100 ? "Low" : carbonTax2030 < 254 ? "Moderate" : carbonTax2030 < 400 ? "High" : "Extreme"}
                    </div>
                  </div>
                  <div>
                    <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      NPV Impact
                    </div>
                    <div className={`font-bold ${
                      carbonTax2030 < 200 
                        ? isDark ? "text-green-400" : "text-green-600"
                        : carbonTax2030 < 350
                        ? isDark ? "text-yellow-400" : "text-yellow-600"
                        : isDark ? "text-red-400" : "text-red-600"
                    }`}>
                      {carbonTax2030 < 200 ? "Positive" : carbonTax2030 < 350 ? "Marginal" : "Negative"}
                    </div>
                  </div>
                  <div>
                    <div className={`font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Gate 4 Status
                    </div>
                    <div className={`font-bold ${
                      carbonTax2030 < 300
                        ? isDark ? "text-green-400" : "text-green-600"
                        : isDark ? "text-red-400" : "text-red-600"
                    }`}>
                      {carbonTax2030 < 300 ? "PASS" : "FAIL"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================================
            8. SITE ALTITUDE - UNIT-AWARE NUMBER INPUT
            ==================================================================== */}
        <div>
          <label className={`block mb-3 font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
            <Mountain className="inline-block w-5 h-5 mr-2 mb-1" />
            Site Altitude
          </label>
          <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Altitude affects air density (ρ) and cooling system performance
          </p>

          <div className="flex items-center space-x-4">
            {/* Number Input */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={altitudeUnit === "meters" ? 5000 : 16404}
                  step={altitudeUnit === "meters" ? 10 : 50}
                  value={altitude}
                  onChange={(e) => {
                    const value = Math.max(0, Number(e.target.value));
                    setAltitude(value);
                  }}
                  className={`
                    w-full p-4 pr-20 border rounded-xl text-lg font-medium
                    ${isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-white focus:border-blue-500"
                      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all
                  `}
                  placeholder="0"
                />
                
                {/* Unit Label Inside Input */}
                <div className={`
                  absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium
                  ${isDark ? "text-gray-400" : "text-gray-600"}
                `}>
                  {altitudeUnit === "meters" ? "m" : "ft"}
                </div>
              </div>
            </div>

            {/* Unit Toggle Switch */}
            <button
              onClick={handleAltitudeUnitToggle}
              className={`
                px-6 py-4 rounded-xl border-2 font-medium transition-all duration-300
                ${isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white hover:border-blue-500"
                  : "bg-white border-gray-300 text-gray-900 hover:border-blue-500"
                }
                hover:shadow-lg
              `}
            >
              <div className="flex items-center space-x-2">
                <span className={altitudeUnit === "meters" ? "font-bold" : ""}>m</span>
                <div className={`
                  w-10 h-5 rounded-full relative transition-colors
                  ${altitudeUnit === "meters"
                    ? isDark ? "bg-blue-500" : "bg-blue-600"
                    : isDark ? "bg-gray-600" : "bg-gray-400"
                  }
                `}>
                  <div className={`
                    absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform
                    ${altitudeUnit === "meters" ? "left-0.5" : "left-5"}
                  `} />
                </div>
                <span className={altitudeUnit === "feet" ? "font-bold" : ""}>ft</span>
              </div>
            </button>
          </div>

          {/* Conversion Display */}
          <div className={`mt-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {altitudeUnit === "meters" ? (
              <span>≈ {convertAltitude(altitude, "meters", "feet").toFixed(0)} feet</span>
            ) : (
              <span>≈ {convertAltitude(altitude, "feet", "meters").toFixed(0)} meters</span>
            )}
            <span className="mx-2">•</span>
            <span>Air density impact: {((1 - altitudeInMeters / 10000) * 100).toFixed(1)}% of sea level</span>
          </div>

          {/* Validation Warning */}
          {altitude < 0 && (
            <div className="mt-3 flex items-center space-x-2 text-yellow-500">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                Negative altitude detected. Are you modeling a below-sea-level data center?
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
    </>
  );
};

export default ChilledWaterCoolingForm;
