import React, { useEffect, useState } from "react";
import { traceFieldMapping } from "../../utils/fieldMappingTrace";
import { Info } from "lucide-react";

const Tip: React.FC<{ text: string; isDark: boolean }> = ({ text, isDark }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1">
      <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} className="opacity-40 hover:opacity-100 transition-opacity" tabIndex={-1}>
        <Info className="w-3 h-3" />
      </button>
      {show && (
        <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-56 text-xs rounded-lg px-2.5 py-1.5 shadow-xl pointer-events-none ${isDark ? "bg-[#27304a] text-gray-200 border border-[#3f4a68]" : "bg-gray-900 text-white"}`}>
          {text}
        </span>
      )}
    </span>
  );
};

interface Props {
  resultData: any;
  result?: { energy_consumed_kwh: number; cooling_efficiency: number; cost_saving_percent: number; runtime_minutes: number; recommendation?: string };
  isDark: boolean;
}

export const SimulationDetailedView: React.FC<Props> = ({ resultData, result, isDark }) => {
  const rd      = resultData ?? {};
  const metrics = rd?.results?.metrics ?? {};
  const annual  = rd?.results?.annual  ?? {};
  const econ    = rd?.results?.economics ?? {};
  const s       = rd?.summary ?? {};

  // Detect technique
  const isChilled = !!(metrics.averageCOP !== undefined || rd?.coolingTechnique === "chilled_water" || rd?.results?.phase4Gates);
  const isAir     = !!(rd?.airflowViolations || rd?.coolingTechnique === "air_economizer" || s.totalItEnergy_kWh);
  const isEvap    = rd?.coolingTechnique === "evaporative" || (!isChilled && !isAir);

  // Evaporative raw fields
  const evapRaw    = rd?.rawEvaporativeData ?? {};
  const evapRes    = evapRaw?.results ?? {};
  const evapPerf   = evapRes?.performance ?? {};
  const evapAssess = rd?.coolingAdequacy ?? evapRaw?.cooling_assessment ?? {};

  // ── Common KPIs — technique-aware ────────────────────────────────────────
  const commonPUE         = isEvap ? (evapPerf.pue_average ?? rd?.pue) : (metrics.pue ?? s.averagePUE);
  const commonTotalEnergy = isEvap ? (evapRes.energy?.electricity_kwh_total ?? rd?.totalEnergyConsumption) : (annual.energyConsumption_kWh ?? s.totalEnergy_kWh);
  const commonCarbon      = isEvap ? (evapRes.emissions?.co2_kg_total ?? rd?.carbonFootprint) : (annual.carbonEmissions_kg ?? s.totalCarbonEmissions_kg);

  useEffect(() => {
    if (resultData) {
      const t = isChilled ? "CHILLED WATER" : isAir ? "AIR ECONOMIZER" : "EVAPORATIVE";
      traceFieldMapping(t, resultData, result ?? undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtV = (v: any, unit: string): string => {
    if (v == null) return "—";
    if (typeof v !== "number") return String(v);
    if (unit === "USD") return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (v > 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v > 1_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return v.toFixed(v > 100 ? 1 : 3);
  };

  const gateColor = (v: string) =>
    v === "PASS" ? (isDark ? "text-green-400 bg-green-500/10" : "text-green-700 bg-green-100")
                 : (isDark ? "text-red-400 bg-red-500/10"   : "text-red-700 bg-red-100");

  type KPI = { label: string; value: any; unit: string; tip: string; color?: string };

  // ── Common KPIs (all techniques) ─────────────────────────────────────────
  const common: KPI[] = [
    { label: "PUE",          value: commonPUE,         unit: "",    tip: "Power Usage Effectiveness. Source: results.performance.pue_average (evap) / results.metrics.pue (chilled/air)" },
    { label: "Total Energy", value: commonTotalEnergy, unit: "kWh", tip: "Total annual energy. Source: results.energy.electricity_kwh_total (evap) / results.annual.energyConsumption_kWh" },
    { label: "Carbon (kg)",  value: commonCarbon,      unit: "kg",  tip: "Total CO₂ emissions. Source: results.emissions.co2_kg_total (evap) / results.annual.carbonEmissions_kg" },
    { label: "Runtime",      value: result?.runtime_minutes, unit: "min", tip: "Simulation wall-clock time" },
  ];

  // ── Chilled Water KPIs ────────────────────────────────────────────────────
  const chilled: KPI[] = isChilled ? [
    { label: "Avg COP",        value: metrics.averageCOP,                                  unit: "",      tip: "Coefficient of Performance. Source: results.metrics.averageCOP",       color: "#5ce1e5" },
    { label: "WUE",            value: metrics.wue,                                         unit: "L/kWh", tip: "Water Usage Effectiveness. Source: results.metrics.wue",               color: "#3b82f6" },
    { label: "Peak Cool (kW)", value: metrics.peakCoolingLoad_kW,                          unit: "kW",    tip: "Peak cooling load. Source: results.metrics.peakCoolingLoad_kW",        color: "#8b5cf6" },
    { label: "Cooling Load",   value: annual.coolingLoad_kWh,                              unit: "kWh",   tip: "Annual cooling energy. Source: results.annual.coolingLoad_kWh",        color: "#8b5cf6" },
    { label: "Water Usage",    value: annual.waterUsage_L,                                 unit: "L",     tip: "Annual water consumed. Source: results.annual.waterUsage_L",           color: "#3b82f6" },
    { label: "Annual Cost",    value: annual.cost_USD ?? econ.opex_annual_USD,             unit: "USD",   tip: "Annual operating cost. Source: results.annual.cost_USD — direct from CoolSim API",               color: "#10b981" },
    { label: "Ann. Savings",   value: rd?.annualSavingsUSD ?? econ.annualSavingsUSD,        unit: "USD",   tip: "annualSavings = opex_annual_USD × 0.1 (backend formula). Source: computed from results.economics.opex_annual_USD", color: "#10b981" },
    { label: "CAPEX",          value: econ.capex_USD,                                      unit: "USD",   tip: "Capital expenditure. Source: results.economics.capex_USD",             color: "#f59e0b" },
    { label: "LCCP",           value: econ.lccp_USD,                                       unit: "USD",   tip: "Life Cycle Cost of Plant. Source: results.economics.lccp_USD",         color: "#ef4444" },
    { label: "NPV",            value: econ.npv_USD,                                        unit: "USD",   tip: "Net Present Value. Source: results.economics.npv_USD",                 color: (econ.npv_USD ?? 0) >= 0 ? "#10b981" : "#ef4444" },
    { label: "Payback",        value: econ.paybackPeriod_years,                            unit: "yrs",   tip: "Payback period. Source: results.economics.paybackPeriod_years",        color: "#5ce1e5" },
  ] : [];

  // ── Air Economizer KPIs ───────────────────────────────────────────────────
  const air: KPI[] = isAir ? [
    { label: "CUE",            value: s.averageCUE,                                        unit: "kgCO₂/kWh", tip: "Carbon Usage Effectiveness. Source: summary.averageCUE",           color: "#8b5cf6" },
    { label: "IT Energy",      value: s.totalItEnergy_kWh,                                 unit: "kWh",   tip: "IT equipment energy. Source: summary.totalItEnergy_kWh",               color: "#5ce1e5" },
    { label: "Cooling Energy", value: s.totalCoolingEnergy_kWh,                            unit: "kWh",   tip: "Cooling system energy. Source: summary.totalCoolingEnergy_kWh",        color: "#8b5cf6" },
    { label: "Elec Cost",      value: s.electricityCostUSD,                                unit: "USD",   tip: "Electricity cost. Source: summary.electricityCostUSD",                 color: "#10b981" },
    { label: "Carbon Tax",     value: s.carbonTaxCostUSD,                                  unit: "USD",   tip: "Carbon tax cost. Source: summary.carbonTaxCostUSD",                    color: "#f59e0b" },
    { label: "Annual OpEx",    value: s.annualOpExUSD,                                     unit: "USD",   tip: "Total OpEx (elec + carbon tax). Source: summary.annualOpExUSD",        color: "#10b981" },
    { label: "CAPEX",          value: s.totalCapexUSD,                                     unit: "USD",   tip: "Capital expenditure. Source: summary.totalCapexUSD",                   color: "#f59e0b" },
    { label: "Ann. Savings",   value: s.annualSavingsUSD,                                  unit: "USD",   tip: "Annual savings vs baseline. Source: summary.annualSavingsUSD",         color: "#10b981" },
    { label: "Energy Sav %",   value: s.energySavingsPercent,                              unit: "%",     tip: "% energy saved vs PUE 1.8 baseline. Source: summary.energySavingsPercent", color: "#10b981" },
    { label: "Carbon Sav",     value: s.carbonSavings_kg,                                  unit: "kg",    tip: "CO₂ saved vs baseline. Source: summary.carbonSavings_kg",              color: "#10b981" },
    { label: "Payback",        value: s.paybackPeriodYears,                                unit: "yrs",   tip: "Payback period. Source: summary.paybackPeriodYears",                   color: "#5ce1e5" },
  ] : [];

  // ── Evaporative KPIs ──────────────────────────────────────────────────────
  const evap: KPI[] = (!isChilled && !isAir) ? [
    { label: "PUE",              value: rd?.pue ?? evapRes.performance?.pue_average,                    unit: "",      tip: "Power Usage Effectiveness. Source: results.performance.pue_average",                color: "#5ce1e5" },
    { label: "PUE Max",          value: rd?.pue_max ?? evapRes.performance?.pue_max,                    unit: "",      tip: "Peak PUE. Source: results.performance.pue_max",                                     color: "#5ce1e5" },
    { label: "CUE",              value: rd?.cue ?? evapRes.performance?.cue_average,                    unit: "kgCO₂/kWh", tip: "Carbon Usage Effectiveness. Source: results.performance.cue_average",          color: "#8b5cf6" },
    { label: "WUE",              value: rd?.wue ?? evapRes.performance?.wue_average,                    unit: "L/kWh", tip: "Water Usage Effectiveness. Source: results.performance.wue_average",               color: "#3b82f6" },
    { label: "Total Energy",     value: rd?.totalEnergyConsumption ?? evapRes.energy?.electricity_kwh_total, unit: "kWh", tip: "Total electricity. Source: results.energy.electricity_kwh_total",              color: "#f59e0b" },
    { label: "IT Energy",        value: rd?.it_kwh ?? evapRes.energy?.it_kwh,                           unit: "kWh",   tip: "IT equipment energy. Source: results.energy.it_kwh",                              color: "#5ce1e5" },
    { label: "Fan Energy",       value: rd?.fan_kwh ?? evapRes.energy?.fan_kwh,                         unit: "kWh",   tip: "Fan energy. Source: results.energy.fan_kwh",                                       color: "#8b5cf6" },
    { label: "DX Backup",        value: rd?.dx_kwh ?? evapRes.energy?.dx_kwh,                           unit: "kWh",   tip: "DX backup energy. Source: results.energy.dx_kwh",                                  color: "#ef4444" },
    { label: "Annual Cost",      value: rd?.estimatedCost ?? evapRes.cost?.total_energy_cost_usd,       unit: "USD",   tip: "Total energy cost. Source: results.cost.total_energy_cost_usd",                    color: "#10b981" },
    { label: "OpEx/kWh IT",      value: rd?.opex_per_kwh_it ?? evapRes.opex?.opex_per_kwh_it,           unit: "USD",   tip: "OpEx per kWh of IT load. Source: results.opex.opex_per_kwh_it",                    color: "#10b981" },
    { label: "CO₂ Total",        value: rd?.carbonFootprint ?? evapRes.emissions?.co2_kg_total,         unit: "kg",    tip: "Total CO₂ emissions. Source: results.emissions.co2_kg_total",                      color: "#ef4444" },
    { label: "CO₂/kWh IT",       value: rd?.co2_kg_per_kwh_it ?? evapRes.emissions?.co2_kg_per_kwh_it, unit: "kg",    tip: "CO₂ per kWh IT. Source: results.emissions.co2_kg_per_kwh_it",                      color: "#ef4444" },
    { label: "Water Total",      value: rd?.waterConsumption ?? evapRes.water?.water_liters_total,      unit: "L",     tip: "Total water usage. Source: results.water.water_liters_total",                       color: "#3b82f6" },
    { label: "Max Inlet Temp",   value: evapAssess?.keyMetrics?.max_inlet_temp_c ?? evapRaw?.cooling_assessment?.key_metrics?.max_inlet_temp_c, unit: "°C", tip: "Max rack inlet temperature. Source: cooling_assessment.key_metrics.max_inlet_temp_c", color: "#f59e0b" },
    { label: "Cooling Cap Avg",  value: evapAssess?.keyMetrics?.cooling_capacity_avg_kw ?? evapRaw?.cooling_assessment?.key_metrics?.cooling_capacity_avg_kw, unit: "kW", tip: "Avg cooling capacity. Source: cooling_assessment.key_metrics.cooling_capacity_avg_kw", color: "#10b981" },
    { label: "Failure Hours",    value: rd?.cooling_failure_hours ?? evapRes.performance?.cooling_failure_hours, unit: "hrs", tip: "Hours cooling was insufficient. Source: results.performance.cooling_failure_hours", color: "#ef4444" },
  ] : [];

  const allKpis = [...common, ...chilled, ...air, ...evap].filter(k => k.value !== undefined && k.value !== null);
  const gates = rd?.results?.phase4Gates;
  const techniqueLabel = isChilled ? "Chilled Water" : isAir ? "Air Economizer" : "Evaporative";
  const techniqueColor = isChilled ? "#3b82f6" : isAir ? "#5ce1e5" : "#10b981";

  return (
    <div className="space-y-6">

      {/* Technique badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${techniqueColor}20`, color: techniqueColor }}>
          {techniqueLabel}
        </span>
        <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          All values from CoolSim API — hover ⓘ for source field
        </span>
      </div>

      {/* KPI Grid */}
      {allKpis.length > 0 && (
        <div>
          <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>Performance Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {allKpis.map(kpi => (
              <div key={kpi.label} className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                <div className={`text-xs mb-1 flex items-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {kpi.label}<Tip text={kpi.tip} isDark={isDark} />
                </div>
                <div className="font-bold text-sm leading-tight" style={{ color: kpi.color ?? (isDark ? "#fff" : "#111") }}>
                  {fmtV(kpi.value, kpi.unit)}
                  {kpi.unit && kpi.unit !== "USD" && (
                    <span className={`text-xs font-normal ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{kpi.unit}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 4 Gates */}
      {gates && Object.keys(gates).length > 0 && (
        <div>
          <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Phase 4 Compliance Gates
            <Tip text="results.phase4Gates.* — PASS/FAIL compliance checks from CoolSim" isDark={isDark} />
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(gates).map(([key, val]) => (
              <div key={key} className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                <div className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{key.replace(/([A-Z])/g, " $1").trim()}</div>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${gateColor(String(val))}`}>
                  {String(val) === "PASS" ? "✓ PASS" : "✗ FAIL"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Air Economizer — Airflow Violations */}
      {rd?.airflowViolations && (
        <div>
          <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Airflow Analysis
            <Tip text="hourlyResults[i].airflowViolation / violationMsg — CFM limit violations" isDark={isDark} />
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
              <div className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Violation Hours</div>
              <div className={`font-bold text-sm ${rd.airflowViolations.totalViolationHours > 0 ? "text-red-500" : "text-green-500"}`}>
                {rd.airflowViolations.totalViolationHours}
                <span className={`text-xs font-normal ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>({rd.airflowViolations.percentageHours}%)</span>
              </div>
            </div>
            {Object.entries(rd.airflowViolations.modeBreakdown ?? {}).map(([mode, count]) => (
              <div key={mode} className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                <div className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{mode}</div>
                <div className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{String(count)} hrs</div>
              </div>
            ))}
          </div>
          {rd.airflowViolations.uniqueMessages?.length > 0 && (
            <div className={`p-3 rounded-xl border text-xs ${isDark ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}>
              {rd.airflowViolations.uniqueMessages.map((msg: string, i: number) => (
                <div key={i} className="mb-1 last:mb-0">⚠ {msg}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CloudSim metadata */}
      {rd?.cloudSimEnabled && (
        <div className={`p-4 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
          <div className={`text-sm font-bold mb-2 ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>☁ CloudSim Workload</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Mode: </span><span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rd.workloadMode ?? "—"}</span></div>
            <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Avg Util: </span><span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rd.averageUtilization != null ? `${(rd.averageUtilization * 100).toFixed(1)}%` : "—"}</span></div>
            {rd.rackAnalysis && <>
              <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Racks: </span><span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rd.rackAnalysis.totalRacks}</span></div>
              <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Hotspots: </span><span className="font-semibold text-red-500">{rd.rackAnalysis.hotspotRacks}</span></div>
              <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Max Rack: </span><span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rd.rackAnalysis.maxRackLoadKW?.toFixed(1)} kW</span></div>
            </>}
          </div>
        </div>
      )}

      {!result?.recommendation && (
        <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-gray-200 text-gray-600"}`}>
          <p className="text-sm">No recommendation summary was saved with this simulation.</p>
        </div>
      )}
    </div>
  );
};
