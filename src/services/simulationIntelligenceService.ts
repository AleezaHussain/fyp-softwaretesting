type SupportedTechnique = "AirEconomizer" | "ChilledWater" | "Evaporative";

interface RecommendScenario {
  tempC: number;
  rh: number;
  itLoadKW: number;
  electricityPrice: number;
  waterPrice: number;
  carbonFactor: number;
}

interface TechniqueResult {
  tech: SupportedTechnique;
  feasible: boolean;
  energy_kwh: number;
  water_liters: number;
  cost: number;
  emissions_kg: number;
  violations: number;
}

interface ComparisonTableRow {
  tech: string;
  feasible: boolean;
  score: number;
  cost: number;
  emissions_kg: number;
  water_liters: number;
  violations: number;
  annual_cost: number;
  annual_emissions_kg: number;
  annual_water_liters: number;
}

export interface MLRecommendationResponse {
  current_technique?: string;
  generated_at_utc?: string;
  model_recommendation?: string;
  why_this_is_recommended?: string[];
  future_impact_paragraph?: string;
  comparison_table?: ComparisonTableRow[];
}

const RECOMMENDER_API_URL =
  import.meta.env.VITE_RECOMMENDER_API_URL || "http://localhost:8001";

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapTechniqueForModel = (technique: string): SupportedTechnique => {
  const normalized = String(technique || "").toLowerCase();
  if (normalized.includes("air")) return "AirEconomizer";
  if (normalized.includes("water")) return "ChilledWater";
  return "Evaporative";
};

const deriveScenario = (
  input: any,
  apiPayload: any,
  simulationHourly: { tempC: number[]; rh: number[]; itLoadKW: number[] } | null,
): RecommendScenario => {
  // Compute averages from the actual hourly arrays (same data sent to server)
  // This ensures buildTechniqueResults uses the same values the server uses
  const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const avgTempC   = simulationHourly ? (mean(simulationHourly.tempC)   ?? 30)  : 30;
  const avgRH      = simulationHourly ? (mean(simulationHourly.rh)      ?? 50)  : 50;
  const avgItLoad  = simulationHourly ? (mean(simulationHourly.itLoadKW) ?? 100) : toNumber(
    apiPayload?.it_load?.total_it_power_kw ||
    apiPayload?.totalITLoadKW ||
    input?.itLoad ||
    100,
    100,
  );

  return {
    tempC:    +avgTempC.toFixed(2),
    rh:       +avgRH.toFixed(2),
    itLoadKW: +avgItLoad.toFixed(4),
    electricityPrice: toNumber(
      apiPayload?.rates?.electricity_usd_per_kwh ||
        apiPayload?.electricityTariff ||
        input?.electricityTariff,
      0.12,
    ),
    waterPrice: toNumber(apiPayload?.rates?.water_usd_per_liter, 0.001),
    carbonFactor: toNumber(
      apiPayload?.emissions?.grid_kgco2_per_kwh ||
        apiPayload?.carbonIntensity ||
        input?.co2EmissionFactor,
      0.45,
    ),
  };
};

/**
 * Build simulation_hourly payload from result data.
 * The new recommend_api.py requires this and computes averages server-side.
 * Handles all three technique hourly field name variants.
 */
const buildSimulationHourly = (resultData: any): { tempC: number[]; rh: number[]; itLoadKW: number[] } | null => {
  // Air economizer: hourlyResults[i].outdoorTempC / outdoorRH / itLoad_kW
  //                 or hourlyProfile[i].tempC / rh / itLoadKW
  // Chilled water:  results.hourlyResults[i].ambientTemp_C / (no RH) / itLoad_kW
  // Evaporative:    hourly_data[i].ambientTempC / ambientHumidity / itLoadKW
  //                 or hourlyData[i] (transformed)

  const hourly: any[] =
    resultData?.hourlyResults ??
    resultData?.hourlyProfile ??
    resultData?.results?.hourlyResults ??
    resultData?.hourlyData ??
    resultData?.rawEvaporativeData?.hourly_data ??
    [];

  if (hourly.length === 0) return null;

  const tempC: number[] = [];
  const rh: number[] = [];
  const itLoadKW: number[] = [];

  for (const h of hourly) {
    // Temperature — try all field name variants
    const t = h.outdoorTempC ?? h.ambientTemp_C ?? h.ambientTempC ?? h.tempC ?? null;
    if (t !== null && Number.isFinite(Number(t))) tempC.push(Number(t));

    // Relative humidity — not available in chilled water hourly, that's fine
    const r = h.outdoorRH ?? h.rh ?? h.ambientHumidity ?? null;
    if (r !== null && Number.isFinite(Number(r))) rh.push(Number(r));

    // IT load — try all field name variants
    const it = h.itLoad_kW ?? h.itLoadKW ?? h.itLoad ?? null;
    if (it !== null && Number.isFinite(Number(it))) itLoadKW.push(Number(it));
  }

  if (tempC.length === 0 && itLoadKW.length === 0) return null;

  // Fill missing arrays with defaults so server can still compute averages
  const len = Math.max(tempC.length, rh.length, itLoadKW.length);
  const safeTempC   = tempC.length   > 0 ? tempC   : Array(len).fill(30);
  const safeRH      = rh.length      > 0 ? rh      : Array(len).fill(50);
  const safeItLoad  = itLoadKW.length > 0 ? itLoadKW : Array(len).fill(100);

  console.log(`🔧 [ML] simulation_hourly built: ${len} rows — tempC[${safeTempC.length}] rh[${safeRH.length}] itLoadKW[${safeItLoad.length}]`);
  console.log(`🔧 [ML] Sample hour 0: tempC=${safeTempC[0]?.toFixed(1)} rh=${safeRH[0]?.toFixed(1)} itLoadKW=${safeItLoad[0]?.toFixed(2)}`);

  return { tempC: safeTempC, rh: safeRH, itLoadKW: safeItLoad };
};

/**
 * Extract actual metrics from simulation result data
 */
const extractActualMetrics = (
  resultData: any,
  apiPayload: any,
): {
  energy_kwh: number;
  water_liters: number;
  cost: number;
  emissions_kg: number;
} => {
  // Try multiple paths to find energy
  const energy_kwh = toNumber(
    resultData?.energy?.electricity_kwh_total ||
      resultData?.summary?.totalEnergy_kWh ||
      resultData?.results?.annual?.energyConsumption_kWh ||
      resultData?.totalEnergyConsumption ||
      resultData?.energy?.total_kwh,
    0,
  );

  // Try multiple paths to find water usage
  const water_liters = toNumber(
    resultData?.water?.consumption_liters_total ||
      resultData?.summary?.waterUsage_L ||
      resultData?.results?.totals?.waterConsumption_L ||
      resultData?.waterConsumption ||
      0,
    0,
  );

  // Try multiple paths to find cost
  const cost = toNumber(
    resultData?.cost?.total_energy_cost_usd ||
      resultData?.summary?.estimatedOpExUSD ||
      resultData?.results?.annual?.cost_USD ||
      resultData?.operatingCost ||
      resultData?.cost?.total_usd,
    0,
  );

  // Try multiple paths to find emissions
  const emissions_kg = toNumber(
    resultData?.emissions?.total_kg_co2 ||
      resultData?.summary?.totalCarbon_kgCO2 ||
      resultData?.results?.annual?.carbonEmissions_kgCO2 ||
      resultData?.carbonEmissions ||
      0,
    0,
  );

  return { energy_kwh, water_liters, cost, emissions_kg };
};

/**
 * Generate estimated technique results for all 3 cooling methods
 * Uses actual results from current technique + estimation factors for others
 */
const buildTechniqueResults = (
  scenario: RecommendScenario,
  currentTechnique: SupportedTechnique,
  resultData: any,
  apiPayload: any,
): TechniqueResult[] => {
  const actual = extractActualMetrics(resultData, apiPayload);

  // Efficiency factors relative to ChilledWater baseline
  // These are typical ratios based on cooling system characteristics
  const techFactors: Record<
    SupportedTechnique,
    {
      energyFactor: number;
      waterFactor: number;
      costFactor: number;
      emissionsFactor: number;
    }
  > = {
    AirEconomizer: {
      energyFactor: 0.6, // Uses less energy when conditions allow
      waterFactor: 0.1, // Minimal water use
      costFactor: 0.5, // Lower operating cost
      emissionsFactor: 0.55, // Lower emissions due to less energy
    },
    Evaporative: {
      energyFactor: 0.75, // Moderate energy use
      waterFactor: 2.5, // High water consumption
      costFactor: 0.7, // Moderate cost
      emissionsFactor: 0.7, // Moderate emissions
    },
    ChilledWater: {
      energyFactor: 1.0, // Baseline
      waterFactor: 1.0, // Baseline
      costFactor: 1.0, // Baseline
      emissionsFactor: 1.0, // Baseline
    },
  };

  // Feasibility checks based on scenario
  const checkFeasibility = (
    tech: SupportedTechnique,
  ): { feasible: boolean; violations: number } => {
    let violations = 0;

    if (tech === "AirEconomizer") {
      // Air economizer needs cool outside air
      if (scenario.tempC > 27) violations++; // Too hot
      if (scenario.rh > 80) violations++; // Too humid
      return { feasible: violations === 0, violations };
    }

    if (tech === "Evaporative") {
      // Evaporative cooling needs low humidity
      if (scenario.rh > 70) violations++; // Too humid
      if (scenario.tempC > 45) violations++; // Too hot even for evap
      return { feasible: violations === 0, violations };
    }

    // ChilledWater is always feasible (mechanical cooling)
    return { feasible: true, violations: 0 };
  };

  // If we have actual data, use it as baseline and estimate others
  // If no actual data, estimate based on scenario
  const hasActualData = actual.energy_kwh > 0 || actual.cost > 0;

  let baselineEnergy: number;
  let baselineWater: number;
  let baselineCost: number;
  let baselineEmissions: number;

  if (hasActualData) {
    // Scale actual data to ChilledWater baseline
    const currentFactor = techFactors[currentTechnique];
    baselineEnergy = actual.energy_kwh / currentFactor.energyFactor;
    baselineWater =
      actual.water_liters / currentFactor.waterFactor ||
      scenario.itLoadKW * 0.5; // Estimate if zero
    baselineCost = actual.cost / currentFactor.costFactor;
    baselineEmissions = actual.emissions_kg / currentFactor.emissionsFactor;
  } else {
    // Estimate baseline from scenario (annual estimates)
    const hoursPerYear = 8760;
    const avgPUE = 1.6; // Typical data center PUE
    baselineEnergy = scenario.itLoadKW * hoursPerYear * avgPUE;
    baselineCost = baselineEnergy * scenario.electricityPrice;
    baselineEmissions = baselineEnergy * scenario.carbonFactor;
    baselineWater = scenario.itLoadKW * hoursPerYear * 0.5; // L per kWh cooling
  }

  // Build results for all 3 techniques
  const techniques: SupportedTechnique[] = [
    "AirEconomizer",
    "Evaporative",
    "ChilledWater",
  ];

  return techniques.map((tech) => {
    const factors = techFactors[tech];
    const { feasible, violations } = checkFeasibility(tech);

    return {
      tech,
      feasible,
      energy_kwh: baselineEnergy * factors.energyFactor,
      water_liters: baselineWater * factors.waterFactor,
      cost: baselineCost * factors.costFactor,
      emissions_kg: baselineEmissions * factors.emissionsFactor,
      violations,
    };
  });
};

export const getMLRecommendation = async (
  input: any,
  technique: string,
  apiPayload: any,
  resultData: any,
): Promise<MLRecommendationResponse | null> => {
  try {
    // Build hourly arrays first — used by both scenario derivation and server
    const simulationHourly = buildSimulationHourly(resultData);

    // Derive scenario using real averages from hourly data
    const scenario = deriveScenario(input, apiPayload, simulationHourly);
    const currentTechnique = mapTechniqueForModel(technique);
    const techniqueResults = buildTechniqueResults(
      scenario,
      currentTechnique,
      resultData,
      apiPayload,
    );

    console.group("🤖 [ML RECOMMEND] Sending to server");
    console.log(`━━━ Hourly rows          : ${simulationHourly ? Object.values(simulationHourly)[0].length : "none"}`);
    console.log(`━━━ avg tempC            : ${scenario.tempC} °C`);
    console.log(`━━━ avg rh               : ${scenario.rh} %`);
    console.log(`━━━ avg itLoadKW         : ${scenario.itLoadKW} kW`);
    console.log(`━━━ electricityPrice     : ${scenario.electricityPrice} USD/kWh`);
    console.log(`━━━ waterPrice           : ${scenario.waterPrice} USD/L`);
    console.log(`━━━ carbonFactor         : ${scenario.carbonFactor} kgCO2/kWh`);
    console.log(`━━━ current_technique    : ${currentTechnique}`);
    console.log("━━━ technique_results    :", techniqueResults);
    console.groupEnd();

    const body: any = {
      scenario,
      current_technique: currentTechnique,
      technique_results: techniqueResults,
      metrics_unit: "annual",
    };

    if (simulationHourly) {
      body.simulation_hourly = simulationHourly;
    }

    const response = await fetch(`${RECOMMENDER_API_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn("ML recommendation request failed:", response.status, errText);
      return null;
    }

    const data = (await response.json()) as MLRecommendationResponse;

    console.group("🤖 [ML RECOMMEND] Server response");
    console.log(`━━━ ML prediction        : ${data.model_recommendation}`);
    console.log(`━━━ current_technique    : ${currentTechnique}`);
    console.log("━━━ full response        :", data);
    console.groupEnd();

    return data;
  } catch (error) {
    console.warn("ML recommendation unavailable:", error);
    return null;
  }
};

export const generateSimulationDescription = async (
  simulationName: string,
  technique: string,
  resultData: any,
  mlRecommendation: MLRecommendationResponse | null,
): Promise<string> => {
  const fallbackDescription = `${simulationName} evaluated ${technique.toLowerCase()} cooling performance with recorded energy, cost, and sustainability metrics.`;

  try {
    const response = await fetch(`${RECOMMENDER_API_URL}/describe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        simulation_name: simulationName,
        technique,
        result_data: resultData,
        recommendation: mlRecommendation,
      }),
    });

    if (!response.ok) {
      return fallbackDescription;
    }

    const data = await response.json();
    const content = data?.description;
    if (!content || typeof content !== "string") {
      return fallbackDescription;
    }

    return content.trim();
  } catch (error) {
    console.warn("OpenRouter description generation failed:", error);
    return fallbackDescription;
  }
};
