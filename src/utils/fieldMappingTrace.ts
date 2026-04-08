/**
 * fieldMappingTrace.ts
 *
 * Logs a clear mapping of every UI-displayed value → its CoolSim API output field.
 * Call this whenever simulation result data is loaded/displayed.
 *
 * Usage:
 *   import { traceFieldMapping } from '../utils/fieldMappingTrace'
 *   traceFieldMapping('CHILLED WATER', resultData, storedResult)
 */

export function traceFieldMapping(
  technique: string,
  resultData: any,
  storedResult?: {
    energy_consumed_kwh?: number;
    cooling_efficiency?: number;
    cost_saving_percent?: number;
    runtime_minutes?: number;
  } | null,
) {
  const rd = resultData ?? {};

  // ── resolve all source paths ──────────────────────────────────────────────
  const metrics = rd?.results?.metrics ?? {};
  const annual  = rd?.results?.annual  ?? rd?.summary ?? {};
  const econ    = rd?.results?.economics ?? {};
  const summary = rd?.summary ?? {};
  const mlRec   = rd?.mlRecommendation ?? {};
  const gates   = rd?.results?.phase4Gates ?? {};

  // Air economizer has two shapes depending on which controller responded:
  // Shape A (EconomizerController /api/simulate): hourlyResults[], projection.yearlyData[]
  // Shape B (SimulationController /api/simulation/run): hourlyProfile[], tcoForecast[]
  const hourly: any[] = rd?.results?.hourlyResults ?? rd?.hourlyResults ?? rd?.hourlyProfile ?? [];
  const yearly: any[] = rd?.projection?.yearlyData ?? rd?.results?.projection?.yearlyData ?? rd?.tcoForecast ?? [];
  const apiPayload = rd?._api_payload ?? {};

  // Detect which shape we have
  const isShapeA = !!(rd?.hourlyResults && rd?.hourlyResults[0]?.itLoad_kW !== undefined);
  const isShapeB = !!(rd?.hourlyProfile && rd?.hourlyProfile[0]?.itLoadKW !== undefined);
  const isChilledWater = !!(rd?.results?.metrics?.averageCOP !== undefined);
  const detectedShape = isChilledWater ? "CHILLED WATER" : isShapeA ? "AIR ECON Shape A (EconomizerController)" : isShapeB ? "AIR ECON Shape B (SimulationController)" : "UNKNOWN";

  console.log(`%c  Response shape detected: ${detectedShape}`, "color:#fbbf24;font-weight:bold");
  console.log("  hourlyResults path:", rd?.hourlyResults ? "rd.hourlyResults" : rd?.hourlyProfile ? "rd.hourlyProfile" : "NOT FOUND");
  console.log("  yearly data path:", rd?.projection?.yearlyData ? "rd.projection.yearlyData" : rd?.tcoForecast ? "rd.tcoForecast" : "NOT FOUND");

  // ── helper: resolve with source label ────────────────────────────────────
  function resolve(candidates: [string, any][]): { value: any; source: string } {
    for (const [path, val] of candidates) {
      if (val !== undefined && val !== null) return { value: val, source: path };
    }
    return { value: undefined, source: "NOT FOUND" };
  }

  // ── build mapping table ───────────────────────────────────────────────────
  const mappings: { ui_label: string; value: any; source: string; unit: string }[] = [];

  const add = (label: string, unit: string, candidates: [string, any][]) => {
    const { value, source } = resolve(candidates);
    mappings.push({ ui_label: label, value, source, unit });
  };

  // ── Simulations list page fields ──────────────────────────────────────────
  add("IT Load (kW)",        "kW",  [
    ["_api_payload.totalITLoadKW",                    apiPayload?.totalITLoadKW],
    ["_api_payload.peakITLoadKW",                     apiPayload?.peakITLoadKW],
    ["_api_payload.it_load.total_it_power_kw",        apiPayload?.it_load?.total_it_power_kw],
    ["computed: serversPerRack×numberOfRacks×avgPower", undefined], // computed in getUserSimulations
  ]);
  add("Number of Racks",     "",    [
    ["_api_payload.numberOfRacks",                    apiPayload?.numberOfRacks],
    ["_api_payload.it_load.racks",                    apiPayload?.it_load?.racks],
  ]);
  add("Location",            "",    [
    ["_api_payload.location",                         apiPayload?.location],
    ["_api_payload.weatherFile",                      apiPayload?.weatherFile],
    ["_api_payload.weatherData.location",             apiPayload?.weatherData?.location],
  ]);
  add("Energy Saved %",      "%",   [
    ["simulation_results.cost_saving_percent",        storedResult?.cost_saving_percent],
  ]);

  // ── Stored result row (simulation_results table) ──────────────────────────
  add("energy_consumed_kwh (DB)", "kWh", [
    ["simulation_results.energy_consumed_kwh",        storedResult?.energy_consumed_kwh],
    ["resultData.totalEnergyConsumption",             rd?.totalEnergyConsumption],
    ["resultData.energy.electricity_kwh_total",       rd?.energy?.electricity_kwh_total],
    ["resultData.summary.totalEnergy_kWh",            summary?.totalEnergy_kWh],
  ]);
  add("cooling_efficiency (DB)", "PUE", [
    ["simulation_results.cooling_efficiency",         storedResult?.cooling_efficiency],
    ["resultData.summary.averagePUE",                 summary?.averagePUE],
    ["resultData.performance.pue_average",            rd?.performance?.pue_average],
    ["resultData.cooling_efficiency",                 rd?.cooling_efficiency],
  ]);
  add("cost_saving_percent (DB)", "%", [
    ["simulation_results.cost_saving_percent",        storedResult?.cost_saving_percent],
    ["resultData.summary.energySavingsPercent",       summary?.energySavingsPercent],
    ["resultData.cost.savings_percent",               rd?.cost?.savings_percent],
  ]);
  add("runtime_minutes (DB)", "min", [
    ["simulation_results.runtime_minutes",            storedResult?.runtime_minutes],
    ["resultData.runtimeMinutes",                     rd?.runtimeMinutes],
    ["resultData._simulationDurationMs / 60000",      rd?._simulationDurationMs ? rd._simulationDurationMs / 60000 : undefined],
  ]);

  // ── Detail page / Reports KPI grid ───────────────────────────────────────
  add("PUE",              "",          [
    ["results.metrics.pue",                           metrics?.pue],
    ["summary.averagePUE",                            summary?.averagePUE],
  ]);
  add("Avg COP",          "",          [
    ["results.metrics.averageCOP",                    metrics?.averageCOP],
    ["summary.averageCOP",                            summary?.averageCOP],
  ]);
  add("WUE",              "L/kWh",     [
    ["results.metrics.wue",                           metrics?.wue],
  ]);
  add("CUE",              "kgCO₂/kWh", [
    ["results.metrics.cue",                           metrics?.cue],
    ["summary.averageCUE",                            summary?.averageCUE],
  ]);
  add("Total Energy",     "kWh",       [
    ["results.annual.energyConsumption_kWh (chilled water)",  annual?.energyConsumption_kWh],
    ["summary.totalEnergy_kWh (Shape A — EconomizerController)", summary?.totalEnergy_kWh],
    ["summary.totalEnergyKWh (Shape B — SimulationController)",  summary?.totalEnergyKWh],
  ]);
  add("IT Energy",        "kWh",       [
    ["summary.totalItEnergy_kWh (Shape A)",  summary?.totalItEnergy_kWh],
    ["summary.totalItEnergyKWh (Shape B)",   summary?.totalItEnergyKWh],
  ]);
  add("Cooling Energy",   "kWh",       [
    ["summary.totalCoolingEnergy_kWh (Shape A)",  summary?.totalCoolingEnergy_kWh],
    ["summary.totalCoolingEnergyKWh (Shape B)",   summary?.totalCoolingEnergyKWh],
    ["results.annual.coolingLoad_kWh (chilled water)", annual?.coolingLoad_kWh],
  ]);
  add("Water Usage",      "L",         [
    ["results.annual.waterUsage_L",                   annual?.waterUsage_L],
    ["summary.waterUsage_liters",                     summary?.waterUsage_liters],
  ]);
  add("Carbon Emissions", "kg",        [
    ["results.annual.carbonEmissions_kg",             annual?.carbonEmissions_kg],
    ["summary.totalCarbonEmissions_kg",               summary?.totalCarbonEmissions_kg],
  ]);
  add("Annual Cost",      "USD",       [
    ["results.annual.cost_USD",                       annual?.cost_USD],
    ["results.economics.opex_annual_USD",             econ?.opex_annual_USD],
    ["summary.annualOpExUSD",                         summary?.annualOpExUSD],
  ]);
  add("CAPEX",            "USD",       [
    ["results.economics.capex_USD",                   econ?.capex_USD],
    ["summary.totalCapexUSD",                         summary?.totalCapexUSD],
  ]);
  add("NPV",              "USD",       [
    ["results.economics.npv_USD",                     econ?.npv_USD],
  ]);
  add("Payback Period",   "yrs",       [
    ["results.economics.paybackPeriod_years",         econ?.paybackPeriod_years],
    ["summary.paybackPeriodYears",                    summary?.paybackPeriodYears],
  ]);
  add("Energy Savings",   "%",         [
    ["summary.energySavingsPercent",                  summary?.energySavingsPercent],
  ]);
  add("Carbon Savings",   "kg",        [
    ["summary.carbonSavings_kg",                      summary?.carbonSavings_kg],
  ]);

  // ── Phase 4 gates ─────────────────────────────────────────────────────────
  Object.entries(gates).forEach(([key, val]) => {
    mappings.push({ ui_label: `Gate: ${key}`, value: val, source: `results.phase4Gates.${key}`, unit: "" });
  });

  // ── ML Recommendation ─────────────────────────────────────────────────────
  add("ML Recommended Technique", "", [
    ["mlRecommendation.model_recommendation",         mlRec?.model_recommendation],
  ]);
  add("ML Current Technique",     "", [
    ["mlRecommendation.current_technique",            mlRec?.current_technique],
  ]);

  // ── Hourly data summary ───────────────────────────────────────────────────
  if (hourly.length > 0) {
    const h0 = hourly[0];
    // Shape A fields: itLoad_kW, fanPower_kW, mechPower_kW, totalPower_kW, pue, cue
    // Shape B fields: itLoadKW, fanPowerKW, mechPowerKW, totalPowerKW, pue, cue
    const itLoadVal = h0?.itLoad_kW ?? h0?.itLoadKW;
    const itLoadSrc = h0?.itLoad_kW !== undefined ? "hourlyResults[0].itLoad_kW (Shape A)" : h0?.itLoadKW !== undefined ? "hourlyProfile[0].itLoadKW (Shape B)" : "NOT FOUND";
    const copVal = h0?.cop;
    const ambientVal = h0?.ambientTemp_C ?? h0?.outdoorTempC ?? h0?.tempC;
    const ambientSrc = h0?.ambientTemp_C !== undefined ? "ambientTemp_C (chilled water)" : h0?.outdoorTempC !== undefined ? "outdoorTempC (Shape A)" : h0?.tempC !== undefined ? "tempC (Shape B)" : "NOT FOUND";
    const fanVal = h0?.fanPower_kW ?? h0?.fanPowerKW;
    const pueVal = h0?.pue;
    const modeVal = h0?.mode;

    mappings.push({ ui_label: `Hourly[0] IT Load`, value: itLoadVal, source: itLoadSrc, unit: "kW" });
    mappings.push({ ui_label: `Hourly[0] COP`, value: copVal, source: `hourlyResults[0].cop  (${hourly.length} total rows)`, unit: "" });
    mappings.push({ ui_label: `Hourly[0] Ambient Temp`, value: ambientVal, source: ambientSrc, unit: "°C" });
    mappings.push({ ui_label: `Hourly[0] Fan Power`, value: fanVal, source: h0?.fanPower_kW !== undefined ? "fanPower_kW (Shape A)" : "fanPowerKW (Shape B)", unit: "kW" });
    mappings.push({ ui_label: `Hourly[0] PUE`, value: pueVal, source: "hourlyResults[0].pue", unit: "" });
    mappings.push({ ui_label: `Hourly[0] Mode`, value: modeVal, source: "hourlyResults[0].mode", unit: "" });
  }

  // ── 5-year projection ─────────────────────────────────────────────────────
  if (yearly.length > 0) {
    const y1 = yearly[0];
    mappings.push({
      ui_label: `Year 1 Total Cost`,
      value: y1?.totalCostUSD,
      source: `projection.yearlyData[0].totalCostUSD`,
      unit: "USD",
    });
    mappings.push({
      ui_label: `Year 1 Savings`,
      value: y1?.costSavingsUSD,
      source: `projection.yearlyData[0].costSavingsUSD`,
      unit: "USD",
    });
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  console.group(`🗺️  FIELD MAPPING TRACE — ${technique}`);
  console.log(`%cEvery UI value → its CoolSim API output field`, "color:#5ce1e5;font-weight:bold");
  console.log("");

  // Group by category
  const categories: Record<string, typeof mappings> = {
    "📋 Simulations List Page":  mappings.slice(0, 4),
    "💾 Stored in DB (simulation_results)": mappings.slice(4, 8),
    "📊 Detail Page / Reports KPI Grid": mappings.slice(8, 22),
    "🚪 Phase 4 Gates": mappings.filter(m => m.ui_label.startsWith("Gate:")),
    "🤖 ML Recommendation": mappings.filter(m => m.ui_label.startsWith("ML")),
    "⏱ Hourly Data (first row sample)": mappings.filter(m => m.ui_label.startsWith("Hourly")),
    "📈 5-Year Projection (first year)": mappings.filter(m => m.ui_label.startsWith("Year")),
  };

  for (const [cat, rows] of Object.entries(categories)) {
    if (rows.length === 0) continue;
    console.group(cat);
    console.table(
      rows.map(r => ({
        "UI Label":   r.ui_label,
        "Value":      r.value !== undefined ? r.value : "—",
        "Unit":       r.unit || "—",
        "CoolSim Field": r.source,
      }))
    );
    console.groupEnd();
  }

  console.groupEnd();
}
