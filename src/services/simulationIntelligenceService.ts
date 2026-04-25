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

  const avgTempC = simulationHourly ? (mean(simulationHourly.tempC) ?? 30) : 30;
  const avgRH = simulationHourly ? (mean(simulationHourly.rh) ?? 50) : 50;
  const avgItLoad = simulationHourly ? (mean(simulationHourly.itLoadKW) ?? 100) : toNumber(
    apiPayload?.it_load?.total_it_power_kw ||
    apiPayload?.totalITLoadKW ||
    input?.itLoad ||
    100,
    100,
  );

  return {
    tempC: +avgTempC.toFixed(2),
    rh: +avgRH.toFixed(2),
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
  const safeTempC = tempC.length > 0 ? tempC : Array(len).fill(30);
  const safeRH = rh.length > 0 ? rh : Array(len).fill(50);
  const safeItLoad = itLoadKW.length > 0 ? itLoadKW : Array(len).fill(100);

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
  const summary = resultData?.summary ?? {};
  const annual = resultData?.results?.annual ?? {};
  const econ = resultData?.results?.economics ?? resultData?.economics ?? {};

  const energy_kwh = toNumber(
    summary?.totalEnergy_kWh ||  // Air Economizer
    resultData?.totalEnergyConsumption ||  // Evaporative
    resultData?.totalEnergy_kWh ||  // Chilled Water flat
    annual?.energyConsumption_kWh ||  // Chilled Water nested
    resultData?.energy?.electricity_kwh_total || 0,
    0,
  );

  const water_liters = toNumber(
    summary?.waterUsage_liters ||  // Air Economizer
    summary?.waterUsage_L ||  // Chilled Water summary
    resultData?.waterUsage_L ||  // Chilled Water flat
    resultData?.annual_water_liters ||  // Chilled Water flat alt
    resultData?.waterConsumption ||  // Evaporative
    annual?.waterUsage_L ||  // Chilled Water nested
    resultData?.water?.consumption_liters_total || 0,
    0,
  );

  const cost = toNumber(
    summary?.estimatedOpExUSD ||  // Air Economizer
    summary?.electricityCostUSD ||  // Air Economizer alt
    resultData?.estimatedCost ||  // Evaporative + Chilled
    resultData?.opex_annual_USD ||  // Chilled Water flat
    annual?.cost_USD ||  // Chilled Water nested
    econ?.opex_annual_USD ||  // Chilled Water economics
    resultData?.cost?.total_energy_cost_usd || 0,
    0,
  );

  const emissions_kg = toNumber(
    summary?.totalCarbonEmissions_kg ||  // Air Economizer ← was missing
    resultData?.carbonFootprint ||  // Evaporative + Chilled flat
    resultData?.totalCarbonEmissions_kg ||  // Chilled Water flat
    resultData?.annual_emissions_kg ||  // Chilled Water flat alt
    annual?.carbonEmissions_kg ||  // Chilled Water nested
    resultData?.emissions?.total_kg_co2 || 0,
    0,
  );

  console.log(`📊 [ML] Actual metrics — energy:${energy_kwh.toFixed(0)}kWh cost:$${cost.toFixed(0)} emissions:${emissions_kg.toFixed(0)}kg water:${water_liters.toFixed(0)}L`);

  return { energy_kwh, water_liters, cost, emissions_kg };
};

/**
 * Generate estimated technique results for all 3 cooling methods.
 * Uses climate-aware dynamic efficiency factors derived from actual site conditions
 * (temperature, humidity, IT load) so estimates are realistic for the specific site.
 */
const buildTechniqueResults = (
  scenario: RecommendScenario,
  currentTechnique: SupportedTechnique,
  resultData: any,
  apiPayload: any,
): TechniqueResult[] => {
  const actual = extractActualMetrics(resultData, apiPayload);

  // ── Climate-aware dynamic efficiency factors ──────────────────────────────
  // AirEconomizer: efficiency degrades as temp rises above 18°C and humidity above 60%
  // At 18°C it's near-free cooling; at 35°C it's barely usable
  const tempC = scenario.tempC;
  const rh = scenario.rh;

  // AirEconomizer cost factor: 0.3 at ideal (18°C, 40% RH) → 0.85 at hot/humid (35°C, 80% RH)
  const airTempPenalty = Math.min(Math.max((tempC - 18) / 20, 0), 1);   // 0→1 as temp goes 18→38°C
  const airRhPenalty = Math.min(Math.max((rh - 40) / 50, 0), 1);      // 0→1 as RH goes 40→90%
  const airCostFactor = 0.30 + 0.55 * (airTempPenalty * 0.7 + airRhPenalty * 0.3);
  const airEnergyFactor = 0.35 + 0.50 * airTempPenalty;
  const airEmissionsFactor = airEnergyFactor * 0.95; // slightly better than energy ratio
  const airWaterFactor = 0.05 + 0.10 * airRhPenalty; // near-zero water, tiny humidity effect

  // Evaporative: efficiency degrades sharply as humidity rises above 40%
  // At 20% RH it's excellent; at 70%+ RH it barely works
  const evapRhPenalty = Math.min(Math.max((rh - 20) / 60, 0), 1);     // 0→1 as RH goes 20→80%
  const evapTempBonus = Math.min(Math.max((tempC - 15) / 30, 0), 0.3); // slight benefit in heat
  const evapCostFactor = 0.45 + 0.40 * evapRhPenalty - evapTempBonus * 0.1;
  const evapEnergyFactor = 0.50 + 0.35 * evapRhPenalty;
  const evapEmissionsFactor = evapEnergyFactor * 0.95;
  // Water use increases with temperature (more evaporation needed) and decreases with humidity
  const evapWaterFactor = 1.5 + 1.5 * (1 - evapRhPenalty) + 0.5 * airTempPenalty;

  // ChilledWater: mechanical, always consistent — slight efficiency gain at higher IT loads
  const cwLoadBonus = Math.min(Math.max((scenario.itLoadKW - 200) / 2000, 0), 0.1);
  const cwCostFactor = 1.0 - cwLoadBonus;
  const cwEnergyFactor = 1.0 - cwLoadBonus;
  const cwEmissionsFactor = 1.0 - cwLoadBonus;
  const cwWaterFactor = 0.8 + 0.3 * airTempPenalty; // cooling tower water increases with heat

  const techFactors: Record<SupportedTechnique, { energyFactor: number; waterFactor: number; costFactor: number; emissionsFactor: number }> = {
    AirEconomizer: { energyFactor: airEnergyFactor, waterFactor: airWaterFactor, costFactor: airCostFactor, emissionsFactor: airEmissionsFactor },
    Evaporative: { energyFactor: evapEnergyFactor, waterFactor: evapWaterFactor, costFactor: evapCostFactor, emissionsFactor: evapEmissionsFactor },
    ChilledWater: { energyFactor: cwEnergyFactor, waterFactor: cwWaterFactor, costFactor: cwCostFactor, emissionsFactor: cwEmissionsFactor },
  };

  console.log(`🌡️ [ML] Dynamic factors @ tempC=${tempC} rh=${rh}% itLoad=${scenario.itLoadKW}kW`);
  console.log(`   AirEcon  → cost:${airCostFactor.toFixed(2)} energy:${airEnergyFactor.toFixed(2)} water:${airWaterFactor.toFixed(2)}`);
  console.log(`   Evap     → cost:${evapCostFactor.toFixed(2)} energy:${evapEnergyFactor.toFixed(2)} water:${evapWaterFactor.toFixed(2)}`);
  console.log(`   ChilledW → cost:${cwCostFactor.toFixed(2)} energy:${cwEnergyFactor.toFixed(2)} water:${cwWaterFactor.toFixed(2)}`);

  // ── Feasibility checks ────────────────────────────────────────────────────
  const checkFeasibility = (tech: SupportedTechnique): { feasible: boolean; violations: number } => {
    let violations = 0;
    if (tech === "AirEconomizer") {
      if (tempC > 27) violations++;
      if (rh > 80) violations++;
      return { feasible: violations === 0, violations };
    }
    if (tech === "Evaporative") {
      if (rh > 70) violations++;
      if (tempC > 45) violations++;
      return { feasible: violations === 0, violations };
    }
    return { feasible: true, violations: 0 }; // ChilledWater always feasible
  };

  // ── Baseline from current sim's real data ─────────────────────────────────
  const hasActualData = actual.energy_kwh > 0 || actual.cost > 0;
  let baselineEnergy: number;
  let baselineWater: number;
  let baselineCost: number;
  let baselineEmissions: number;

  if (hasActualData) {
    const currentFactor = techFactors[currentTechnique];
    baselineEnergy = actual.energy_kwh / currentFactor.energyFactor;
    baselineWater = actual.water_liters > 0
      ? actual.water_liters / currentFactor.waterFactor
      : scenario.itLoadKW * 8760 * 0.3;
    baselineCost = actual.cost / currentFactor.costFactor;
    baselineEmissions = actual.emissions_kg / currentFactor.emissionsFactor;
  } else {
    const hoursPerYear = 8760;
    const avgPUE = 1.4 + 0.3 * airTempPenalty; // PUE rises with temperature
    baselineEnergy = scenario.itLoadKW * hoursPerYear * avgPUE;
    baselineCost = baselineEnergy * scenario.electricityPrice;
    baselineEmissions = baselineEnergy * scenario.carbonFactor;
    baselineWater = scenario.itLoadKW * hoursPerYear * 0.4;
  }

  return (["AirEconomizer", "Evaporative", "ChilledWater"] as SupportedTechnique[]).map((tech) => {
    const f = techFactors[tech];
    const { feasible, violations } = checkFeasibility(tech);
    return {
      tech,
      feasible,
      energy_kwh: baselineEnergy * f.energyFactor,
      water_liters: baselineWater * f.waterFactor,
      cost: baselineCost * f.costFactor,
      emissions_kg: baselineEmissions * f.emissionsFactor,
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

    // Build technique results using climate-aware dynamic factors
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

    // Add simulation-specific findings for stronger justification
    const airflowViolations = resultData?.airflowViolations;
    const coolingAdequacy = resultData?.coolingAdequacy;
    const rackAnalysis = resultData?.rackAnalysis;

    const simContext: Record<string, any> = {};

    // Air economizer findings
    if (airflowViolations?.percentageHours != null) {
      simContext.airflow_violation_pct = airflowViolations.percentageHours;
      simContext.total_violation_hours = airflowViolations.totalViolationHours;
      simContext.violation_message = airflowViolations.uniqueMessages?.[0] ?? null;
    }
    if (rackAnalysis?.hotspotRacks != null) {
      simContext.hotspot_racks = rackAnalysis.hotspotRacks;
      simContext.total_racks = rackAnalysis.totalRacks;
      simContext.max_rack_load_kw = rackAnalysis.maxRackLoadKW;
    }

    // Evaporative findings
    if (coolingAdequacy?.status) {
      simContext.cooling_adequacy_status = coolingAdequacy.status;
    }
    if (coolingAdequacy?.hourlyFailures?.critical_hours != null) {
      simContext.critical_hours = coolingAdequacy.hourlyFailures.critical_hours;
    }

    // Phase 4 gates (chilled water)
    const phase4 = resultData?.results?.phase4Gates ?? resultData?.phase4Gates;
    if (phase4) {
      const failed = Object.entries(phase4)
        .filter(([, v]) => v === "FAIL" || v === false)
        .map(([k]) => k);
      if (failed.length > 0) simContext.failed_gates = failed;
    }

    // Current technique actual metrics — use the same robust extractor
    const currentMetrics = extractActualMetrics(resultData, apiPayload);
    simContext.current_annual_cost = currentMetrics.cost > 0 ? currentMetrics.cost : null;
    simContext.current_annual_emissions = currentMetrics.emissions_kg > 0 ? currentMetrics.emissions_kg : null;
    simContext.current_annual_water = currentMetrics.water_liters > 0 ? currentMetrics.water_liters : null;
    simContext.current_pue = resultData?.pue ?? resultData?.summary?.averagePUE ?? resultData?.results?.summary?.averagePUE ?? null;

    if (Object.keys(simContext).length > 0) {
      body.simulation_context = simContext;
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
