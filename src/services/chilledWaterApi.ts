/**
 * Chilled Water Cooling System API Service
 * Handles communication with the Java Spring Boot backend
 */

const API_BASE_URL = import.meta.env.VITE_CHILLED_WATER_API_URL || 'http://localhost:8081/api/v1';

export interface ChilledWaterSimulationRequest {
  weatherData: {
    fileName: string;
    location: string;
    elevation: number;
    dataPoints: Array<{
      hour: number;
      dry_bulb_c: number;
      wet_bulb_c: number;
      relative_humidity: number;
      atmospheric_pressure_pa: number;
    }>;
    hasValidData: boolean;
  };
  climateScenario: {
    warmingDelta: number;
    temperatureOffset: number;
  };
  siteParameters: {
    altitude: number;
    altitudeDisplay: number;
    altitudeUnit: string;
  };
  simulation: {
    time_horizon_hours: number;
  };
  itInfrastructure: {
    numberOfRacks: number;
    serversPerRack: number;
    totalServers: number;
    serverIdlePowerW: number;
    serverMaxPowerW: number;
    workloadType: string;
    workloadLabel: string;
    refreshCycle: number;
    throttlingPenalty: number;
    avgCpuUtilization: number;
    totalITLoadKW: number;
    peakITLoadKW: number;
  };
  waterStress: {
    waterStressLevel: string;
    waterStressLabel: string;
    wueThreshold: number;
    waterRiskLevel: string;
  };
  mechanicalSpecs: {
    chillerType: string;
    chillerLabel: string;
    chillerRefCOP: number;
    chillerRefCOPMin: number;
    chillerRefCOPMax: number;
    supplyWaterTempC: number;
    isInEfficientZone: boolean;
    foulingFactor: number;
  };
  economicEnvironmental: {
    baseElectricityRate: number;
    touEnabled: boolean;
    peakMultiplier: number;
    offPeakMultiplier: number;
    priceProfile: Array<{
      hour: number;
      rate: number;
      multiplier: number;
      label: string;
    }>;
    carbonIntensity: number;
    refrigerantType: string;
    refrigerantLabel: string;
    refrigerantGWP: number;
    useIPCCPathway: boolean;
    carbonTax2030: number;
    carbonTaxLevel: string;
    gate4Status: string;
  };
}

export interface ChilledWaterSimulationResponse {
  status: string;
  simulationId: string;
  executionTime: number;
  results: {
    annual: {
      energyConsumption_kWh: number;
      coolingLoad_kWh: number;
      waterUsage_L: number;
      cost_USD: number;
      carbonEmissions_kg: number;
    };
    metrics: {
      pue: number;
      wue: number;
      averageCOP: number;
      peakCoolingLoad_kW: number;
    };
    economics: {
      capex_USD: number;
      opex_annual_USD: number;
      lccp_USD: number;
      npv_USD: number;
      paybackPeriod_years: number;
    };
    phase4Gates: {
      thermalCompliance: string;
      waterConstraint: string;
      carbonLiability: string;
      economicViability: string;
    };
    hourlyResults: Array<{
      hour: number;
      ambientTemp_C: number;
      itLoad_kW: number;
      coolingLoad_kW: number;
      chillerPower_kW: number;
      cop: number;
      waterUsage_L: number;
      cost_USD: number;
      carbonEmissions_kg: number;
    }>;
  };
}

/**
 * Run chilled water cooling simulation
 */
export async function runChilledWaterSimulation(
  request: ChilledWaterSimulationRequest,
  signal?: AbortSignal
): Promise<ChilledWaterSimulationResponse> {
  try {
    console.log('🚀 [API] Sending chilled water simulation request to backend...');
    console.log('🚀 [API] Request payload:', JSON.stringify(request, null, 2));

    const response = await fetch(`${API_BASE_URL}/chilled-water/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Backend API error: ${response.status} ${response.statusText}. ${errorData.message || ''}`
      );
    }

    const data: ChilledWaterSimulationResponse = await response.json();
    console.log('✅ [API] Simulation completed successfully:', data);

    return data;
  } catch (error: any) {
    console.error('❌ [API] Chilled water simulation failed:', error);
    throw new Error(`Failed to run chilled water simulation: ${error.message}`);
  }
}

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('❌ [API] Backend health check failed:', error);
    return false;
  }
}

/**
 * Main function to simulate chilled water cooling
 * This is called from the store when user clicks "Run Simulation"
 */
export async function simulateChilledWater(config: any, signal?: AbortSignal): Promise<ChilledWaterSimulationResponse> {
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║  CHILLED WATER SIMULATION - FRONTEND TO BACKEND                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📦 [FRONTEND] Raw config received from form:', config);
  console.log('');
  console.log('🔄 [FRONTEND] Transforming config to API request format...');
  
  // Transform the frontend config to backend API format
  const apiRequest = transformConfigToApiRequest(config);
  
  console.log('');
  console.log('📋 [FRONTEND] Transformed API Request:');
  console.log('  Weather Data:');
  console.log('    • File:', apiRequest.weatherData.fileName);
  console.log('    • Location:', apiRequest.weatherData.location);
  console.log('    • Data Points:', apiRequest.weatherData.dataPoints.length);
  console.log('    • Valid:', apiRequest.weatherData.hasValidData);
  console.log('');
  console.log('  Climate Scenario:');
  console.log('    • Warming Delta:', apiRequest.climateScenario.warmingDelta, '°C');
  console.log('');
  console.log('  Site Parameters:');
  console.log('    • Altitude:', apiRequest.siteParameters.altitude, apiRequest.siteParameters.altitudeUnit);
  console.log('');
  console.log('  IT Infrastructure:');
  console.log('    • Total Servers:', apiRequest.itInfrastructure.totalServers);
  console.log('    • Racks:', apiRequest.itInfrastructure.numberOfRacks);
  console.log('    • Workload:', apiRequest.itInfrastructure.workloadLabel);
  console.log('    • CPU Utilization:', apiRequest.itInfrastructure.avgCpuUtilization, '%');
  console.log('    • Total IT Load:', apiRequest.itInfrastructure.totalITLoadKW, 'kW');
  console.log('');
  console.log('  Water Stress:');
  console.log('    • Level:', apiRequest.waterStress.waterStressLabel);
  console.log('    • WUE Threshold:', apiRequest.waterStress.wueThreshold, 'L/kWh');
  console.log('');
  console.log('  Mechanical Specs:');
  console.log('    • Chiller Type:', apiRequest.mechanicalSpecs.chillerLabel);
  console.log('    • Reference COP:', apiRequest.mechanicalSpecs.chillerRefCOP);
  console.log('    • Supply Water Temp:', apiRequest.mechanicalSpecs.supplyWaterTempC, '°C');
  console.log('    • Fouling Factor:', apiRequest.mechanicalSpecs.foulingFactor);
  console.log('');
  console.log('  Economic & Environmental:');
  console.log('    • Electricity Rate:', apiRequest.economicEnvironmental.baseElectricityRate, '$/kWh');
  console.log('    • TOU Enabled:', apiRequest.economicEnvironmental.touEnabled);
  console.log('    • Carbon Intensity:', apiRequest.economicEnvironmental.carbonIntensity, 'kg/kWh');
  console.log('    • Refrigerant:', apiRequest.economicEnvironmental.refrigerantLabel, '(GWP:', apiRequest.economicEnvironmental.refrigerantGWP + ')');
  console.log('    • Carbon Tax 2030:', apiRequest.economicEnvironmental.carbonTax2030, '$/ton');
  console.log('');
  console.log('🌐 [FRONTEND] Sending request to backend:', `${API_BASE_URL}/chilled-water/simulate`);
  console.log('');
  
  // Call the backend API
  const response = await runChilledWaterSimulation(apiRequest, signal);
  
  console.log('');
  console.log('✅ [FRONTEND] Backend response received!');
  console.log('  Simulation ID:', response.simulationId);
  console.log('  Execution Time:', response.executionTime, 'ms');
  console.log('  Status:', response.status);
  console.log('');
  console.log('📊 [FRONTEND] Results Summary:');
  console.log('  Annual Energy:', response.results.annual.energyConsumption_kWh.toFixed(2), 'kWh');
  console.log('  Annual Cost:', response.results.annual.cost_USD.toFixed(2), '$');
  console.log('  PUE:', response.results.metrics.pue.toFixed(3));
  console.log('  WUE:', response.results.metrics.wue.toFixed(3), 'L/kWh');
  console.log('  Average COP:', response.results.metrics.averageCOP.toFixed(2));
  console.log('');
  console.log('🚪 [FRONTEND] Phase 4 Gates:');
  console.log('  Thermal Compliance:', response.results.phase4Gates.thermalCompliance);
  console.log('  Water Constraint:', response.results.phase4Gates.waterConstraint);
  console.log('  Carbon Liability:', response.results.phase4Gates.carbonLiability);
  console.log('  Economic Viability:', response.results.phase4Gates.economicViability);
  console.log('');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  
  return response;
}

/**
 * Transform frontend config to backend API format
 */
export function transformConfigToApiRequest(
  config: any
): ChilledWaterSimulationRequest {
  return {
    weatherData: {
      fileName: config.weatherFile || 'unknown.epw',
      location: config.weatherMetadata?.location || 'Unknown Location',
      elevation: config.weatherMetadata?.elevation || 0,
      dataPoints: config.weatherData || [],
      hasValidData: config.weatherMetadata?.hasValidData || false,
    },
    climateScenario: {
      warmingDelta: config.warmingDelta || 0.0,
      temperatureOffset: config.temperatureOffset || config.warmingDelta || 0.0,
    },
    siteParameters: {
      altitude: config.altitude || 0,
      altitudeDisplay: config.altitudeDisplay || config.altitude || 0,
      altitudeUnit: config.altitudeUnit || 'meters',
    },
    simulation: {
      time_horizon_hours: config.simulationDuration || 8760,
    },
    itInfrastructure: {
      numberOfRacks: config.numberOfRacks || 5,
      serversPerRack: config.serversPerRack || 10,
      totalServers: config.totalServers || 50,
      serverIdlePowerW: config.serverIdlePowerW || 150,
      serverMaxPowerW: config.serverMaxPowerW || 500,
      workloadType: config.workloadType || 'enterprise',
      workloadLabel: config.workloadLabel || 'Enterprise',
      refreshCycle: config.refreshCycle || 5,
      throttlingPenalty: config.throttlingPenalty || 0,
      avgCpuUtilization: config.avgCpuUtilization || 60,
      totalITLoadKW: config.totalITLoadKW || 0,
      peakITLoadKW: config.peakITLoadKW || 0,
    },
    waterStress: {
      waterStressLevel: config.waterStressLevel || 'low',
      waterStressLabel: config.waterStressLabel || 'Low',
      wueThreshold: config.wueThreshold || 5.0,
      waterRiskLevel: config.waterRiskLevel || 'LOW',
    },
    mechanicalSpecs: {
      chillerType: config.chillerType || 'air_cooled_scroll',
      chillerLabel: config.chillerLabel || 'Air-Cooled Scroll',
      chillerRefCOP: config.chillerRefCOP || 3.5,
      chillerRefCOPMin: config.chillerRefCOPMin || 3.2,
      chillerRefCOPMax: config.chillerRefCOPMax || 3.8,
      supplyWaterTempC: config.supplyWaterTempC || 7.0,
      isInEfficientZone: config.isInEfficientZone || false,
      foulingFactor: config.foulingFactor || 1.0,
    },
    economicEnvironmental: {
      baseElectricityRate: config.baseElectricityRate || 0.12,
      touEnabled: config.touEnabled || false,
      peakMultiplier: config.peakMultiplier || 1.5,
      offPeakMultiplier: config.offPeakMultiplier || 0.7,
      priceProfile: config.priceProfile || [],
      carbonIntensity: config.carbonIntensity || 0.5,
      refrigerantType: config.refrigerantType || 'r134a',
      refrigerantLabel: config.refrigerantLabel || 'R-134a',
      refrigerantGWP: config.refrigerantGWP || 1430,
      useIPCCPathway: config.useIPCCPathway !== undefined ? config.useIPCCPathway : true,
      carbonTax2030: config.carbonTax2030 || 254,
      carbonTaxLevel: config.carbonTaxLevel || 'Moderate',
      gate4Status: config.gate4Status || 'PASS',
    },
  };
}
