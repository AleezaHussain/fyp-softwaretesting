import React, { useEffect, useState } from "react";
import { traceFieldMapping } from "../../utils/fieldMappingTrace";
import { Info, Loader2 } from "lucide-react";

const METRICS_API =
  import.meta.env.VITE_METRICS_EXPLANATION_API_URL ??
  "http://localhost:8005/api";

const Tip: React.FC<{ text: string; isDark: boolean }> = ({ text, isDark }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="opacity-40 hover:opacity-100 transition-opacity"
        tabIndex={-1}
      >
        <Info className="w-3 h-3" />
      </button>
      {show && (
        <span
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-56 text-xs rounded-lg px-2.5 py-1.5 shadow-xl pointer-events-none ${isDark ? "bg-[#27304a] text-gray-200 border border-[#3f4a68]" : "bg-gray-900 text-white"}`}
        >
          {text}
        </span>
      )}
    </span>
  );
};

interface Props {
  resultData: any;
  result?: {
    energy_consumed_kwh: number;
    cooling_efficiency: number;
    cost_saving_percent: number;
    runtime_minutes: number;
    recommendation?: string;
  };
  isDark: boolean;
}

export const SimulationDetailedView: React.FC<Props> = ({
  resultData,
  result,
  isDark,
}) => {
  const rd = resultData ?? {};
  const metrics = rd?.results?.metrics ?? {};
  const annual = rd?.results?.annual ?? {};
  const econ = rd?.results?.economics ?? {};
  const s = rd?.summary ?? {};

  // Detect technique â€” use explicit coolingTechnique field first, then structural fallback
  const rawTechnique = (
    rd?.coolingTechnique ??
    rd?.simulation_type ??
    ""
  ).toLowerCase();
  const isEvap = rawTechnique.includes("evap") || !!rd?.rawEvaporativeData;
  const isAir =
    !isEvap &&
    (rawTechnique.includes("air") ||
      rawTechnique.includes("economizer") ||
      !!rd?.airflowViolations ||
      !!rd?.rackAnalysis ||
      s.totalItEnergy_kWh !== undefined);
  const isChilled =
    !isEvap &&
    !isAir &&
    (rawTechnique.includes("chilled") ||
      rawTechnique.includes("water") ||
      !!rd?.results?.phase4Gates ||
      metrics.averageCOP !== undefined);

  // Evaporative raw fields
  const evapRaw = rd?.rawEvaporativeData ?? {};
  const evapRes = evapRaw?.results ?? {};
  const evapPerf = evapRes?.performance ?? {};
  // â”€â”€ Common KPIs â€” technique-aware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const commonPUE = isEvap
    ? (evapPerf.pue_average ?? rd?.pue)
    : (metrics.pue ?? s.averagePUE);
  const commonTotalEnergy = isEvap
    ? (evapRes.energy?.electricity_kwh_total ?? rd?.totalEnergyConsumption)
    : (annual.energyConsumption_kWh ?? s.totalEnergy_kWh);
  const commonCarbon = isEvap
    ? (evapRes.emissions?.co2_kg_total ?? rd?.carbonFootprint)
    : (annual.carbonEmissions_kg ?? s.totalCarbonEmissions_kg);

  useEffect(() => {
    if (resultData) {
      const t = isChilled
        ? "CHILLED WATER"
        : isAir
          ? "AIR ECONOMIZER"
          : "EVAPORATIVE";
      traceFieldMapping(t, resultData, result ?? undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // â”€â”€ AI metrics explanation â€” cached per simulation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ── AI cooling assessment explanation (evaporative only) ─────
  const [assessExplanation, setAssessExplanation] = useState<string | null>(null);
  const [assessInsight, setAssessInsight] = useState<string | null>(null);
  const [assessLoading, setAssessLoading] = useState(false);

  useEffect(() => {
    if (!resultData) return;
    const kpis = [...common, ...chilled, ...air, ...evap].filter(
      (k) => k.value !== undefined && k.value !== null,
    );
    if (kpis.length === 0) return;

    const metricsPayload = kpis.map((k) => ({
      label: k.label,
      value: k.value,
      unit: k.unit ?? "",
    }));

    // Build rack analysis summary for air-side simulations
    const rackSummary =
      isAir && rd?.rackAnalysis
        ? {
            totalRacks: rd.rackAnalysis.totalRacks,
            hotspotRacks: rd.rackAnalysis.hotspotRacks,
            maxRackLoadKW: rd.rackAnalysis.maxRackLoadKW,
            averageRackLoadKW: rd.rackAnalysis.averageRackLoadKW,
            loadImbalanceFactor: rd.rackAnalysis.loadImbalanceFactor,
            airflowViolationCount:
              rd.rackAnalysis.airflowViolations?.length ?? 0,
            hotspotThresholdKW: 26.8,
          }
        : null;

    // Build 5-year projection summary for air-side simulations
    const projSummary =
      isAir && rd?.projection
        ? {
            forecastYears: rd.projection.forecastYears ?? null,
            totalEnergy_kWh: rd.projection.totalEnergy ?? null,
            totalCost_USD: rd.projection.totalCost ?? null,
            totalSavings_USD: rd.projection.totalSavings ?? null,
            totalCarbonTax_USD: rd.projection.totalCarbonTax ?? null,
            totalEmissions_tCO2: rd.projection.totalEmissions ?? null,
            npvSavings_USD: rd.projection.npvSavings ?? null,
            adjustedPaybackYears: rd.projection.adjustedPaybackYears ?? null,
            year1: rd.projection.yearlyData?.[0]
              ? {
                  energyKWh: rd.projection.yearlyData[0].energyKWh,
                  energyCostUSD: rd.projection.yearlyData[0].energyCostUSD,
                  carbonTaxUSD: rd.projection.yearlyData[0].carbonTaxUSD,
                  totalCostUSD: rd.projection.yearlyData[0].totalCostUSD,
                  costSavingsUSD: rd.projection.yearlyData[0].costSavingsUSD,
                  emissionsTonsCO2:
                    rd.projection.yearlyData[0].emissionsTonsCO2,
                }
              : null,
            year5: rd.projection.yearlyData?.slice(-1)[0]
              ? {
                  energyKWh: rd.projection.yearlyData.slice(-1)[0].energyKWh,
                  energyCostUSD:
                    rd.projection.yearlyData.slice(-1)[0].energyCostUSD,
                  carbonTaxUSD:
                    rd.projection.yearlyData.slice(-1)[0].carbonTaxUSD,
                  totalCostUSD:
                    rd.projection.yearlyData.slice(-1)[0].totalCostUSD,
                  costSavingsUSD:
                    rd.projection.yearlyData.slice(-1)[0].costSavingsUSD,
                  emissionsTonsCO2:
                    rd.projection.yearlyData.slice(-1)[0].emissionsTonsCO2,
                }
              : null,
          }
        : null;

    // Cache key includes projection + assessment fingerprints so old cached explanations are invalidated
    const projFingerprint = projSummary
      ? `|proj:${projSummary.totalCost_USD?.toFixed(0)}:${projSummary.adjustedPaybackYears}`
      : "";

    // Build cooling assessment summary for evaporative simulations
    const assessmentSummary =
      !isChilled && !isAir && rd?.rawEvaporativeData?.cooling_assessment
        ? {
            status: rd.rawEvaporativeData.cooling_assessment.status,
            confidence: rd.rawEvaporativeData.cooling_assessment.confidence,
            checks: rd.rawEvaporativeData.cooling_assessment.checks,
            key_metrics: rd.rawEvaporativeData.cooling_assessment.key_metrics,
            hourly_failures: {
              temperature_violations:
                rd.rawEvaporativeData.cooling_assessment.hourly_failures
                  ?.temperature_violations,
              capacity_violations:
                rd.rawEvaporativeData.cooling_assessment.hourly_failures
                  ?.capacity_violations,
              humidity_violations:
                rd.rawEvaporativeData.cooling_assessment.hourly_failures
                  ?.humidity_violations,
            },
            recommendations:
              rd.rawEvaporativeData.cooling_assessment.recommendations,
            engineering_notes:
              rd.rawEvaporativeData.cooling_assessment.engineering_notes,
          }
        : null;

    const assessFingerprint = assessmentSummary
      ? `|assess:${assessmentSummary.status}:${(assessmentSummary.confidence ?? 0).toFixed(2)}`
      : "";
    const cacheKey = `metrics_explanation_ui_${kpis
      .slice(0, 4)
      .map((k) => `${k.label}:${k.value}`)
      .join("|")}${projFingerprint}${assessFingerprint}`;

    // Check localStorage cache first â€” show immediately if available
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setAiExplanation(parsed.explanation ?? null);
        setAiInsight(parsed.keyInsight ?? null);
        return;
      }
    } catch {
      // ignore storage errors
    }

    const techniqueLabel = isChilled
      ? "Chilled Water"
      : isAir
        ? "Air-Side Economizer"
        : "Evaporative Cooling";

    setAiLoading(true);
    fetch(`${METRICS_API}/explain-metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        technique: techniqueLabel,
        metrics: metricsPayload,
        simulationContext: {
          technique: techniqueLabel,
          ...(rackSummary ? { rackAnalysis: rackSummary } : {}),
          ...(projSummary ? { projection: projSummary } : {}),
          ...(assessmentSummary
            ? { coolingAssessment: assessmentSummary }
            : {}),
        },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const explanation = data.explanation ?? null;
        const keyInsight = data.keyInsight ?? null;
        setAiExplanation(explanation);
        setAiInsight(keyInsight);
        // Cache for future views
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ explanation, keyInsight }),
          );
        } catch {
          // ignore storage errors
        }
      })
      .catch(() => {
        /* silently skip if API not running */
      })
      .finally(() => setAiLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cooling assessment explanation (evaporative only) ────────
  useEffect(() => {
    if (!resultData || isChilled || isAir) return;
    const ca = rd?.rawEvaporativeData?.cooling_assessment ?? rd?.coolingAdequacy;
    if (!ca || Object.keys(ca).length === 0) return;

    const km = ca.key_metrics ?? ca.keyMetrics ?? {};
    const checks = ca.checks ?? {};
    const hf = ca.hourly_failures ?? {};
    const recs: string[] = ca.recommendations ?? [];
    const notes: string[] = ca.engineering_notes ?? ca.engineeringNotes ?? [];

    // Build a stable cache key from the assessment status + confidence
    const cacheKey = `assess_explanation_v1_${ca.status}_${(ca.confidence ?? 0).toFixed(2)}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setAssessExplanation(parsed.explanation ?? null);
        setAssessInsight(parsed.keyInsight ?? null);
        return;
      }
    } catch { /* ignore */ }

    // Build metrics payload from all cooling assessment fields
    const assessMetrics = [
      { label: "Assessment Status",       value: ca.status,                                    unit: "" },
      { label: "Confidence",              value: ca.confidence != null ? +(ca.confidence * 100).toFixed(0) : null, unit: "%" },
      { label: "PUE Avg",                 value: km.pue_avg,                                   unit: "" },
      { label: "Heat Load Avg",           value: km.heat_load_avg_kw,                          unit: "kW" },
      { label: "Max Inlet Temp",          value: km.max_inlet_temp_c,                          unit: "°C" },
      { label: "Cooling Capacity Avg",    value: km.cooling_capacity_avg_kw,                   unit: "kW" },
      { label: "Max Humidity",            value: km.max_humidity_percent > 0 ? km.max_humidity_percent : null, unit: "%" },
      { label: "Check: Heat Balance",     value: checks.heat_balance ? "PASS" : "FAIL",        unit: "" },
      { label: "Check: Inlet Temp OK",    value: checks.inlet_temperature_ok ? "PASS" : "FAIL", unit: "" },
      { label: "Check: Humidity OK",      value: checks.humidity_ok ? "PASS" : "FAIL",         unit: "" },
      { label: "Check: Energy Efficiency",value: checks.energy_efficiency_ok ? "PASS" : "FAIL", unit: "" },
      { label: "Temp Violations",         value: hf.temperature_violations,                    unit: "hrs" },
      { label: "Capacity Violations",     value: hf.capacity_violations,                       unit: "hrs" },
      { label: "Humidity Violations",     value: hf.humidity_violations,                       unit: "hrs" },
    ].filter(m => m.value !== null && m.value !== undefined);

    const capacityDeficit = km.cooling_capacity_avg_kw != null && km.heat_load_avg_kw != null
      ? +(km.cooling_capacity_avg_kw - km.heat_load_avg_kw).toFixed(2)
      : null;
    if (capacityDeficit != null) {
      assessMetrics.push({ label: capacityDeficit < 0 ? "Capacity Deficit" : "Capacity Surplus", value: capacityDeficit, unit: "kW" });
    }

    setAssessLoading(true);
    fetch(`${METRICS_API}/explain-metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        technique: "Evaporative Cooling Assessment",
        metrics: assessMetrics,
        simulationContext: {
          technique: "Evaporative Cooling",
          assessmentStatus: ca.status,
          engineeringNotes: notes,
          recommendations: recs,
        },
      }),
    })
      .then(r => r.json())
      .then(data => {
        const explanation = data.explanation ?? null;
        const keyInsight = data.keyInsight ?? null;
        setAssessExplanation(explanation);
        setAssessInsight(keyInsight);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ explanation, keyInsight }));
        } catch { /* ignore */ }
      })
      .catch(() => { /* silently skip */ })
      .finally(() => setAssessLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtV = (v: any, unit: string): string => {
    if (v == null) return "â€”";
    if (typeof v !== "number") return String(v);
    if (unit === "USD")
      return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (v > 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v > 1_000)
      return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return v.toFixed(v > 100 ? 1 : 3);
  };

  const gateColor = (v: string) =>
    v === "PASS"
      ? isDark
        ? "text-green-400 bg-green-500/10"
        : "text-green-700 bg-green-100"
      : isDark
        ? "text-red-400 bg-red-500/10"
        : "text-red-700 bg-red-100";

  type KPI = {
    label: string;
    value: any;
    unit: string;
    tip: string;
    color?: string;
  };

  // â”€â”€ Common KPIs (all techniques) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const common: KPI[] = [
    {
      label: "PUE",
      value: commonPUE,
      unit: "",
      tip: "Power Usage Effectiveness: ratio of total facility power to IT power. A value of 1.0 is ideal; lower means more efficient cooling.",
    },
    {
      label: "Total Energy",
      value: commonTotalEnergy,
      unit: "kWh",
      tip: "Total annual electricity consumed by the entire facility including IT equipment and all cooling systems.",
    },
    {
      label: "Carbon (kg)",
      value: commonCarbon,
      unit: "kg",
      tip: "Total COâ‚‚ emissions for the year, calculated from total electricity consumption multiplied by the grid carbon intensity factor.",
    },
    {
      label: "Runtime",
      value: result?.runtime_minutes,
      unit: "min",
      tip: "Wall-clock time taken by the simulation engine to complete the full 8,760-hour annual co-simulation run.",
    },
  ];

  // â”€â”€ Chilled Water KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const chilled: KPI[] = isChilled
    ? [
        {
          label: "Avg COP",
          value: metrics.averageCOP,
          unit: "",
          tip: "Coefficient of Performance: cooling output divided by compressor power input. Higher values mean the chiller produces more cooling per unit of electricity consumed.",
          color: "#5ce1e5",
        },
        {
          label: "WUE",
          value: metrics.wue,
          unit: "L/kWh",
          tip: "Water Usage Effectiveness: litres of water consumed per kWh of IT energy. Lower is better. Reflects cooling tower evaporation losses.",
          color: "#3b82f6",
        },
        {
          label: "Peak Cool (kW)",
          value: metrics.peakCoolingLoad_kW,
          unit: "kW",
          tip: "Maximum instantaneous cooling load observed during the simulation. Determines the minimum chiller capacity required for the site.",
          color: "#8b5cf6",
        },
        {
          label: "Cooling Load",
          value: annual.coolingLoad_kWh,
          unit: "kWh",
          tip: "Total annual cooling energy delivered by the chiller plant to the white space. The difference between this and total energy is auxiliary overhead.",
          color: "#8b5cf6",
        },
        {
          label: "Water Usage",
          value: annual.waterUsage_L,
          unit: "L",
          tip: "Total litres of water consumed annually by the cooling tower evaporation process. A critical constraint in water-scarce regions.",
          color: "#3b82f6",
        },
        {
          label: "Annual Cost",
          value: annual.cost_USD ?? econ.opex_annual_USD,
          unit: "USD",
          tip: "Total annual operating expenditure including electricity and maintenance costs. Excludes capital expenditure amortisation.",
          color: "#10b981",
        },
        {
          label: "Ann. Savings",
          value: rd?.annualSavingsUSD ?? econ.annualSavingsUSD,
          unit: "USD",
          tip: "Annual cost savings compared to a PUE 1.8 baseline mechanical-only system. Represents the financial benefit of the cooling strategy.",
          color: "#10b981",
        },
        {
          label: "CAPEX",
          value: econ.capex_USD,
          unit: "USD",
          tip: "Capital expenditure: the upfront installation cost for the full chilled water plant including chillers, pumps, cooling towers, and CRAH units.",
          color: "#f59e0b",
        },
        {
          label: "LCCP",
          value: econ.lccp_USD,
          unit: "USD",
          tip: "Life-Cycle Cost of Plant: total cost over 15 years including CAPEX and the net present value of all annual operating expenditures.",
          color: "#ef4444",
        },
        {
          label: "NPV",
          value: econ.npv_USD,
          unit: "USD",
          tip: "Net Present Value: present value of future savings minus CAPEX. A positive value means the investment is profitable over the analysis horizon.",
          color: (econ.npv_USD ?? 0) >= 0 ? "#10b981" : "#ef4444",
        },
        {
          label: "Payback",
          value: econ.paybackPeriod_years,
          unit: "yrs",
          tip: "Simple payback period years until the capital investment is recovered from annual savings versus the baseline system.",
          color: "#5ce1e5",
        },
      ]
    : [];

  // â”€â”€ Air Economizer KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const air: KPI[] = isAir
    ? [
        {
          label: "CUE",
          value: s.averageCUE,
          unit: "kgCOâ‚‚/kWh",
          tip: "Carbon Usage Effectiveness: kilograms of COâ‚‚ emitted per kWh of IT energy served. Lower values indicate a greener cooling operation.",
          color: "#8b5cf6",
        },
        {
          label: "IT Energy",
          value: s.totalItEnergy_kWh,
          unit: "kWh",
          tip: "Total annual energy consumed by IT equipment only (servers, storage, networking). Excludes all cooling overhead.",
          color: "#5ce1e5",
        },
        {
          label: "Cooling Energy",
          value: s.totalCoolingEnergy_kWh,
          unit: "kWh",
          tip: "Total annual energy consumed by the cooling system (fans, compressors). The difference between total facility energy and IT energy.",
          color: "#8b5cf6",
        },
        {
          label: "Elec Cost",
          value: s.electricityCostUSD,
          unit: "USD",
          tip: "Annual electricity cost calculated as total facility energy multiplied by the electricity tariff rate.",
          color: "#10b981",
        },
        {
          label: "Carbon Tax",
          value: s.carbonTaxCostUSD,
          unit: "USD",
          tip: "Annual carbon tax liability: total COâ‚‚ emissions multiplied by the regulatory carbon price per tonne.",
          color: "#f59e0b",
        },
        {
          label: "Annual OpEx",
          value: s.annualOpExUSD,
          unit: "USD",
          tip: "Total annual operating expenditure: the sum of electricity cost and carbon tax for the year.",
          color: "#10b981",
        },
        {
          label: "CAPEX",
          value: s.totalCapexUSD,
          unit: "USD",
          tip: "Capital expenditure: the upfront installation cost for the air-side economizer system.",
          color: "#f59e0b",
        },
        {
          label: "Ann. Savings",
          value: s.annualSavingsUSD,
          unit: "USD",
          tip: "Annual cost savings compared to a PUE 1.8 baseline mechanical-only system.",
          color: "#10b981",
        },
        {
          label: "Energy Sav %",
          value: s.energySavingsPercent,
          unit: "%",
          tip: "Percentage of energy saved compared to a PUE 1.8 baseline. Reflects how much the economizer reduces total facility energy consumption.",
          color: "#10b981",
        },
        {
          label: "Carbon Sav",
          value: s.carbonSavings_kg,
          unit: "kg",
          tip: "Kilograms of COâ‚‚ avoided compared to the baseline system. Quantifies the environmental benefit of using free cooling.",
          color: "#10b981",
        },
        {
          label: "Payback",
          value: s.paybackPeriodYears,
          unit: "yrs",
          tip: "Simple payback period: years until the capital investment is recovered from annual savings versus the baseline.",
          color: "#5ce1e5",
        },
      ]
    : [];

  // â”€â”€ Evaporative KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const evapCost = evapRes?.cost ?? {};
  const evapOpex = evapRes?.opex ?? {};
  const evapWater = evapRes?.water ?? {};
  const evapEnergy = evapRes?.energy ?? {};
  const evapEmit = evapRes?.emissions ?? {};
  const evapAssessRaw =
    evapRaw?.cooling_assessment ?? rd?.coolingAdequacy ?? {};
  const evapChecks = evapAssessRaw?.checks ?? {};
  const evapKeyM =
    evapAssessRaw?.key_metrics ?? evapAssessRaw?.keyMetrics ?? {};
  const evapHourlyF = evapAssessRaw?.hourly_failures ?? {};
  const evapRecs: string[] = evapAssessRaw?.recommendations ?? [];
  const evapNotes: string[] =
    evapAssessRaw?.engineering_notes ?? evapAssessRaw?.engineeringNotes ?? [];

  const evap: KPI[] =
    !isChilled && !isAir
      ? [
          // â”€â”€ Performance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          {
            label: "PUE Average",
            value: evapPerf.pue_average ?? evapKeyM.pue_avg,
            unit: "",
            tip: "Average Power Usage Effectiveness across all 8,760 hours. 1.0 is ideal; below 1.05 is world-class.",
            color: "#5ce1e5",
          },
          {
            label: "PUE Max",
            value: evapPerf.pue_max,
            unit: "",
            tip: "Peak PUE observed during the simulation i.e. the worst-case efficiency hour. Indicates how much overhead spikes under peak IT load.",
            color: "#5ce1e5",
          },
          {
            label: "CUE",
            value: evapPerf.cue_average ?? rd?.cue,
            unit: "kgCOâ‚‚/kWh",
            tip: "Carbon Usage Effectiveness: kg of COâ‚‚ per kWh of IT energy. Below 0.3 is excellent; above 0.6 is concerning.",
            color: "#8b5cf6",
          },
          {
            label: "WUE",
            value: evapPerf.wue_average ?? rd?.wue,
            unit: "L/kWh",
            tip: "Water Usage Effectiveness: litres of water per kWh of IT energy. Zero in DEC mode means no water is consumed.",
            color: "#3b82f6",
          },
          {
            label: "Availability",
            value: evapPerf.availability_percent,
            unit: "%",
            tip: "Percentage of simulation hours where cooling was sufficient. 100% means no cooling failures occurred.",
            color: "#10b981",
          },
          {
            label: "Failure Hours",
            value: evapPerf.cooling_failure_hours ?? rd?.cooling_failure_hours,
            unit: "hrs",
            tip: "Hours where cooling capacity was insufficient to maintain safe rack inlet temperatures. Zero is required for reliable operation.",
            color: "#ef4444",
          },
          {
            label: "Sim Hours",
            value: evapPerf.total_simulation_hours,
            unit: "hrs",
            tip: "Total hours simulated: should be 8,760 for a full annual simulation.",
            color: "#6b7280",
          },
          // â”€â”€ Energy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          {
            label: "Total Electricity",
            value:
              evapEnergy.electricity_kwh_total ?? rd?.totalEnergyConsumption,
            unit: "kWh",
            tip: "Total annual electricity consumed by the entire facility (IT + all cooling loads).",
            color: "#5ce1e5",
          },
          {
            label: "IT Energy",
            value: evapEnergy.it_kwh ?? rd?.it_kwh,
            unit: "kWh",
            tip: "Annual energy consumed by IT equipment only. Excludes fan, pump, and DX compressor energy.",
            color: "#5ce1e5",
          },
          {
            label: "Fan Energy",
            value: evapEnergy.fan_kwh ?? rd?.fan_kwh,
            unit: "kWh",
            tip: "Annual energy consumed by supply and return fans. In pure DEC mode this is the only cooling electrical load.",
            color: "#8b5cf6",
          },
          {
            label: "DX Backup",
            value: evapEnergy.dx_kwh ?? rd?.dx_kwh,
            unit: "kWh",
            tip: "Annual energy consumed by the DX compressor backup. Zero means the system operated in pure evaporative mode throughout.",
            color: "#ef4444",
          },
          {
            label: "Pump Energy",
            value: evapEnergy.pump_kwh ?? rd?.pump_kwh,
            unit: "kWh",
            tip: "Annual energy consumed by water circulation pumps. Zero in direct evaporative mode with no pump circuit.",
            color: "#8b5cf6",
          },
          {
            label: "Auxiliary",
            value: evapEnergy.auxiliary_kwh ?? rd?.auxiliary_kwh,
            unit: "kWh",
            tip: "Total auxiliary (non-IT) energy: fan + pump + DX combined. Represents the cooling overhead above IT energy.",
            color: "#8b5cf6",
          },
          // â”€â”€ Cost â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          {
            label: "Electricity Cost",
            value: evapCost.electricity_usd ?? rd?.electricity_usd,
            unit: "USD",
            tip: "Annual electricity cost for all facility loads at the configured tariff rate.",
            color: "#10b981",
          },
          {
            label: "Water Cost",
            value: evapCost.water_usd,
            unit: "USD",
            tip: "Annual water cost. Zero in DEC mode where no makeup water is consumed.",
            color: "#3b82f6",
          },
          {
            label: "Total Cost",
            value: evapCost.total_energy_cost_usd ?? rd?.estimatedCost,
            unit: "USD",
            tip: "Total annual operating cost: electricity plus water.",
            color: "#10b981",
          },
          {
            label: "OpEx Total",
            value: evapOpex.opex_total_usd ?? rd?.opex_total_usd,
            unit: "USD",
            tip: "Total annual operational expenditure including all running costs.",
            color: "#10b981",
          },
          {
            label: "OpEx/kWh IT",
            value: evapOpex.opex_per_kwh_it ?? rd?.opex_per_kwh_it,
            unit: "USD",
            tip: "Operating cost per kWh of IT energy served. Normalises cost for comparison across different IT load scales.",
            color: "#10b981",
          },
          {
            label: "OpEx/Server/yr",
            value:
              evapOpex.opex_per_server_annual ?? rd?.opex_per_server_annual,
            unit: "USD",
            tip: "Annual operating cost per physical server. Useful for per-unit cost benchmarking.",
            color: "#10b981",
          },
          // â”€â”€ Emissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          {
            label: "COâ‚‚ Total",
            value: evapEmit.co2_kg_total ?? rd?.carbonFootprint,
            unit: "kg",
            tip: "Total annual COâ‚‚ emissions from facility electricity consumption.",
            color: "#ef4444",
          },
          {
            label: "COâ‚‚/kWh IT",
            value: evapEmit.co2_kg_per_kwh_it ?? rd?.co2_kg_per_kwh_it,
            unit: "kg",
            tip: "Carbon intensity per unit of IT work. Below 0.3 kg/kWh is excellent; above 0.6 is concerning.",
            color: "#ef4444",
          },
          {
            label: "COâ‚‚/Server/yr",
            value:
              evapEmit.co2_kg_per_server_annual ?? rd?.co2_kg_per_server_annual,
            unit: "kg",
            tip: "Annual COâ‚‚ emissions per physical server. Useful for per-unit carbon benchmarking.",
            color: "#ef4444",
          },
          // â”€â”€ Water â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          {
            label: "Water Total",
            value: evapWater.water_liters_total ?? rd?.waterConsumption,
            unit: "L",
            tip: "Total annual water consumption. Zero in indirect evaporative mode; non-zero in direct mode where water evaporates into supply air.",
            color: "#3b82f6",
          },
          {
            label: "Evaporation",
            value: evapWater.evaporation_liters,
            unit: "L",
            tip: "Water lost to evaporation into the supply airstream. This is the primary water consumption mechanism in DEC systems.",
            color: "#3b82f6",
          },
          {
            label: "Makeup Water",
            value: evapWater.makeup_liters,
            unit: "L",
            tip: "Fresh water added to replace evaporation losses. Zero in pure DEC mode with no recirculating water circuit.",
            color: "#3b82f6",
          },
          {
            label: "Blowdown",
            value: evapWater.blowdown_liters,
            unit: "L",
            tip: "Water discharged to prevent mineral concentration buildup in recirculating systems. Zero in single-pass DEC mode.",
            color: "#3b82f6",
          },
          // Max Inlet Temp, Cooling Cap Avg, Heat Load Avg shown in Cooling Assessment section below
        ]
      : [];

  const allKpis = [...common, ...chilled, ...air, ...evap].filter(
    (k) => k.value !== undefined && k.value !== null,
  );
  const gates = rd?.results?.phase4Gates;
  const techniqueLabel = isChilled
    ? "Chilled Water"
    : isAir
      ? "Air Economizer"
      : "Evaporative";
  const techniqueColor = isChilled ? "#3b82f6" : isAir ? "#5ce1e5" : "#10b981";

  return (
    <div className="space-y-6">
      {/* Technique badge */}
      <div className="flex items-center gap-2">
        <span
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: `${techniqueColor}20`, color: techniqueColor }}
        >
          {techniqueLabel}
        </span>
      </div>

      {/* AI Metrics Analysis */}
      {(aiLoading || aiExplanation) && (
        <div className="space-y-1">
          {aiLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span
                className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                Analysing metrics...
              </span>
            </div>
          ) : (
            <>
              <p
                className={`text-sm leading-relaxed text-justify ${isDark ? "text-gray-100" : "text-gray-900"}`}
              >
                {aiExplanation}
              </p>
              {aiInsight && (
                <p
                  className={`text-sm leading-relaxed text-justify italic ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  {aiInsight}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* KPI Grid */}
      {allKpis.length > 0 && (
        <div>
          <h3
            className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {allKpis.map((kpi) => (
              <div
                key={kpi.label}
                className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}
              >
                <div
                  className={`text-xs mb-1 flex items-center ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  {kpi.label}
                  <Tip text={kpi.tip} isDark={isDark} />
                </div>
                <div
                  className="font-bold text-sm leading-tight"
                  style={{ color: kpi.color ?? (isDark ? "#fff" : "#111") }}
                >
                  {fmtV(kpi.value, kpi.unit)}
                  {kpi.unit && kpi.unit !== "USD" && (
                    <span
                      className={`text-xs font-normal ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {kpi.unit}
                    </span>
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
          <h3
            className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Phase 4 Compliance Gates
            <Tip
              text="Engineering readiness gates evaluated by the simulation engine. PASS means the constraint is satisfied; FAIL means it is violated. These gates determine whether the technique is suitable for production deployment."
              isDark={isDark}
            />
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(gates).map(([key, val]) => (
              <div
                key={key}
                className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}
              >
                <div
                  className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </div>
                <span
                  className={`text-sm font-bold px-2 py-0.5 rounded-full ${gateColor(String(val))}`}
                >
                  {String(val) === "PASS" ? "✓ PASS" : "✗ FAIL"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ── Evaporative Cooling Assessment (standalone section) ── */}
      {!isChilled && !isAir && evapAssessRaw && Object.keys(evapAssessRaw).length > 0 && (
        <div>
          <h3 className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Cooling Assessment
            <Tip text="The simulation engine's verdict on whether the evaporative system adequately cooled the data center. Checks cover heat balance, inlet temperature, humidity, and energy efficiency." isDark={isDark} />
          </h3>

          {/* AI Cooling Assessment Explanation */}
          {(assessLoading || assessExplanation) && (
            <div className="mb-4 space-y-2">
              {assessLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Analysing cooling assessment...</span>
                </div>
              ) : (
                <>
                  <p className={`text-sm leading-relaxed text-justify ${isDark ? "text-gray-100" : "text-gray-900"}`}>{assessExplanation}</p>
                  {assessInsight && (
                    <p className={`text-sm leading-relaxed text-justify italic ${isDark ? "text-gray-300" : "text-gray-700"}`}>{assessInsight}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Status + Confidence banner */}
          <div className={`flex items-center gap-4 rounded-xl border px-4 py-3 mb-4 ${evapAssessRaw.status === "ADEQUATE" ? (isDark ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200") : (isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200")}`}>
            <div>
              <p className={`text-sm font-bold ${evapAssessRaw.status === "ADEQUATE" ? (isDark ? "text-green-400" : "text-green-700") : "text-red-500"}`}>
                Status: {evapAssessRaw.status ?? "—"}
              </p>
              {evapAssessRaw.confidence != null && (
                <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Confidence: {(evapAssessRaw.confidence * 100).toFixed(0)}%
                  <Tip text="Simulation engine confidence in this verdict. Above 90% means the result is statistically reliable." isDark={isDark} />
                </p>
              )}
            </div>
          </div>

          {/* Compliance Checks */}
          {Object.keys(evapChecks).length > 0 && (
            <div className="mb-4">
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Compliance Checks</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(evapChecks).map(([key, val]) => {
                  const pass = val === true || String(val) === "true";
                  const tipMap: Record<string, string> = {
                    heat_balance: "Whether the cooling capacity matches or exceeds the IT heat load on average. FAIL means the system is undersized for the workload.",
                    inlet_temperature_ok: "Whether rack inlet temperatures stayed below the ASHRAE A1 limit of 27°C throughout the simulation.",
                    humidity_ok: "Whether supply air humidity stayed within ASHRAE limits. High humidity risks condensation on IT equipment.",
                    energy_efficiency_ok: "Whether the system achieved an acceptable PUE. PASS means the cooling overhead is within efficient operating bounds.",
                  };
                  return (
                    <div key={key} className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                      <div className={`text-xs mb-1 flex items-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {key.replace(/_/g, " ")}<Tip text={tipMap[key] ?? key} isDark={isDark} />
                      </div>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${pass ? (isDark ? "text-green-400 bg-green-500/10" : "text-green-700 bg-green-100") : (isDark ? "text-red-400 bg-red-500/10" : "text-red-700 bg-red-100")}`}>
                        {pass ? "✓ PASS" : "✗ FAIL"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Key Assessment Metrics */}
          {Object.keys(evapKeyM).length > 0 && (
            <div className="mb-4">
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Key Assessment Metrics</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[
                  { key: "pue_avg",                 label: "PUE Avg",           unit: "",   tip: "Average PUE computed by the assessment engine." },
                  { key: "heat_load_avg_kw",         label: "Heat Load Avg",     unit: "kW", tip: "Average IT heat load per hour. Cooling capacity must exceed this." },
                  { key: "max_inlet_temp_c",         label: "Max Inlet Temp",    unit: "°C", tip: "Maximum rack inlet temperature. Must stay below 27°C for ASHRAE A1 compliance." },
                  { key: "cooling_capacity_avg_kw",  label: "Cooling Cap Avg",   unit: "kW", tip: "Average cooling capacity delivered. If below heat load average, a thermal deficit exists." },
                  { key: "max_humidity_percent",     label: "Max Humidity",      unit: "%",  tip: "Maximum supply air humidity. High values risk condensation on IT equipment." },
                  { key: "min_wetbulb_depression_c", label: "Min WB Depression", unit: "°C", tip: "Minimum wet-bulb depression. Larger values mean more evaporative cooling potential." },
                ].map(({ key, label, unit, tip }) => {
                  const raw = evapKeyM[key];
                  if (raw == null || raw === 1.7976931348623157e308) return null;
                  const display = typeof raw === "number" ? raw.toFixed(raw > 100 ? 1 : 3) : String(raw);
                  const isWarning = (key === "max_inlet_temp_c" && raw > 27) || (key === "max_humidity_percent" && raw > 60);
                  return (
                    <div key={key} className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                      <div className={`text-xs mb-1 flex items-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {label}<Tip text={tip} isDark={isDark} />
                      </div>
                      <div className={`font-bold text-sm ${isWarning ? "text-red-500" : isDark ? "text-white" : "text-gray-900"}`}>
                        {display}{unit && <span className={`text-xs font-normal ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{unit}</span>}
                      </div>
                    </div>
                  );
                })}
                {/* Derived: capacity deficit / surplus */}
                {evapKeyM.cooling_capacity_avg_kw != null && evapKeyM.heat_load_avg_kw != null && (() => {
                  const diff = evapKeyM.cooling_capacity_avg_kw - evapKeyM.heat_load_avg_kw;
                  const isDeficit = diff < 0;
                  return (
                    <div className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                      <div className={`text-xs mb-1 flex items-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {isDeficit ? "Capacity Deficit" : "Capacity Surplus"}
                        <Tip text={isDeficit ? "Cooling delivers less than IT heat load — system is undersized." : "Cooling delivers more than IT heat load — system is adequately sized."} isDark={isDark} />
                      </div>
                      <div className={`font-bold text-sm ${isDeficit ? "text-red-500" : "text-green-500"}`}>
                        {isDeficit ? "" : "+"}{diff.toFixed(2)} kW
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Hourly Failure Counts */}
          {(evapHourlyF.capacity_violations != null || evapHourlyF.humidity_violations != null || evapHourlyF.temperature_violations != null) && (
            <div className="mb-4">
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Hourly Failure Counts</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "temperature_violations", label: "Temp Violations",    tip: "Hours where rack inlet temperature exceeded 27°C (ASHRAE A1 limit)." },
                  { key: "capacity_violations",    label: "Capacity Violations", tip: "Hours where cooling capacity was insufficient to remove all IT heat." },
                  { key: "humidity_violations",    label: "Humidity Violations", tip: "Hours where supply air humidity exceeded ASHRAE limits." },
                ].map(({ key, label, tip }) => {
                  const val = evapHourlyF[key];
                  if (val == null) return null;
                  return (
                    <div key={key} className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                      <div className={`text-xs mb-1 flex items-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {label}<Tip text={tip} isDark={isDark} />
                      </div>
                      <div className={`font-bold text-sm ${val > 0 ? "text-red-500" : "text-green-500"}`}>{val} hrs</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Engineering Notes */}
          {evapNotes.length > 0 && (
            <div className={`rounded-xl border px-4 py-3 mb-3 text-xs ${isDark ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
              <p className={`font-semibold mb-2 ${isDark ? "text-blue-400" : "text-blue-700"}`}>Engineering Notes</p>
              {evapNotes.map((n: string, i: number) => <div key={i} className="mb-1 last:mb-0">ℹ {n}</div>)}
            </div>
          )}

          {/* Recommendations */}
          {evapRecs.length > 0 && (
            <div className={`rounded-xl border px-4 py-3 text-xs ${isDark ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-300" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
              <p className={`font-semibold mb-2 ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>Recommendations</p>
              {evapRecs.map((r: string, i: number) => <div key={i} className="mb-1 last:mb-0">→ {r}</div>)}
            </div>
          )}
        </div>
      )}

      {/* ── Air Economizer — Airflow Violations ── */}
      {rd?.airflowViolations && (
        <div>
          <h3 className={`text-base font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Airflow Analysis
            <Tip text="Airflow violations occur when the required cubic feet per minute (CFM) to remove IT heat exceeds the physical airflow envelope of the economizer. Each violation hour means the system cannot deliver enough cooling through air movement alone." isDark={isDark} />
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
              <div className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Violation Hours
                <Tip text="Total hours during the year where required airflow exceeded the system's physical CFM limit. Each violation hour means servers were at risk of overheating." isDark={isDark} />
              </div>
              <div className={`font-bold text-sm ${rd.airflowViolations.totalViolationHours > 0 ? "text-red-500" : "text-green-500"}`}>
                {rd.airflowViolations.totalViolationHours}
                <span className={`text-xs font-normal ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>({rd.airflowViolations.percentageHours}% of year)</span>
              </div>
            </div>
            {Object.entries(rd.airflowViolations.modeBreakdown ?? {}).map(([mode, count]) => (
              <div key={mode} className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                <div className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {mode}
                  <Tip text={mode === "FULL_ECON" ? "Hours where outdoor air alone provided all cooling — no mechanical backup needed. More FULL_ECON hours = lower energy cost." : mode === "MECHANICAL_ONLY" ? "Hours where outdoor temperature was too high for free cooling and the mechanical DX unit took over entirely. These hours have the highest energy cost." : "Hours where partial economization was used alongside mechanical backup."} isDark={isDark} />
                </div>
                <div className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{String(count)} hrs</div>
              </div>
            ))}
          </div>
          {rd.airflowViolations.uniqueMessages?.length > 0 && (
            <div className={`p-3 rounded-xl border text-xs ${isDark ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}>
              <p className={`font-semibold mb-2 ${isDark ? "text-red-400" : "text-red-700"}`}>Simulation violation messages:</p>
              {rd.airflowViolations.uniqueMessages.map((msg: string, i: number) => (
                <div key={i} className="mb-1 last:mb-0">⚠ {msg}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CloudSim metadata ── */}
      {rd?.cloudSimEnabled && (
        <div className={`p-4 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
          <div className={`text-sm font-bold mb-2 ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>☁ CloudSim Workload</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Mode: </span><span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rd.workloadMode ?? "—"}</span></div>
            <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Avg Utilisation: </span><span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rd.averageUtilization != null ? `${(rd.averageUtilization * 100).toFixed(1)}%` : "—"}</span></div>
            {rd.rackAnalysis && (<>
              <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Total Racks: </span><span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rd.rackAnalysis.totalRacks}</span></div>
              <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Hotspot Racks: </span><span className="font-semibold text-red-500">{rd.rackAnalysis.hotspotRacks} / {rd.rackAnalysis.totalRacks}</span></div>
              <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Max Rack Load: </span><span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rd.rackAnalysis.maxRackLoadKW?.toFixed(1)} kW</span></div>
              <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Avg Rack Load: </span><span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rd.rackAnalysis.averageRackLoadKW?.toFixed(1)} kW</span></div>
              <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>Load Imbalance: </span><span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rd.rackAnalysis.loadImbalanceFactor?.toFixed(4)}<Tip text="Load imbalance factor: 0 = all racks carry identical load (perfectly balanced); 1 = all load concentrated on one rack. Values near 0 are ideal for uniform cooling." isDark={isDark} /></span></div>
              {rd.rackAnalysis.airflowViolations?.length > 0 && (
                <div><span className={isDark ? "text-gray-400" : "text-gray-500"}>CFM Violations: </span><span className="font-semibold text-red-500">{rd.rackAnalysis.airflowViolations.length} racks</span></div>
              )}
            </>)}
          </div>
        </div>
      )}

      {/* ── Per-Rack Hotspot & Airflow Violations moved to Raw Data tab ── */}

      {!result?.recommendation && (
        <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-gray-200 text-gray-600"}`}>
          <p className="text-sm">No recommendation summary was saved with this simulation.</p>
        </div>
      )}

      {/* ── 5-Year Financial & Emissions Projection (Air-Side) ── */}
      {isAir && rd?.projection && (
        <div>
          <h3 className={`text-base font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            5-Year Financial &amp; Emissions Projection
            <Tip text="Forward-looking projection of energy cost, carbon tax, and emissions over the forecast period. Each year accounts for electricity price escalation, carbon tax growth, and climate-change temperature offset." isDark={isDark} />
          </h3>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {[
              { label: "Forecast Years",  value: rd.projection.forecastYears ?? "—",                                                                                    unit: "yrs",    tip: "Number of years covered by the financial projection.",                                                                                                  color: isDark ? "#5ce1e5" : "#0ea5e9" },
              { label: "Total Energy",    value: rd.projection.totalEnergy != null ? `${(rd.projection.totalEnergy / 1000).toFixed(1)}k` : "—",                         unit: "kWh",    tip: "Cumulative facility energy consumption across all forecast years, accounting for annual load growth.",                                               color: isDark ? "#a78bfa" : "#7c3aed" },
              { label: "Total Cost",      value: rd.projection.totalCost != null ? `$${rd.projection.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—",  unit: "",  tip: "Total operating expenditure (electricity + carbon tax) summed across all forecast years.",                                                          color: isDark ? "#f87171" : "#dc2626" },
              { label: "Total Savings",   value: rd.projection.totalSavings != null ? `$${rd.projection.totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—", unit: "", tip: "Cumulative cost savings versus a PUE 1.8 mechanical-only baseline across all forecast years.",                                                    color: isDark ? "#34d399" : "#059669" },
              { label: "Total Carbon Tax",value: rd.projection.totalCarbonTax != null ? `$${rd.projection.totalCarbonTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—", unit: "", tip: "Cumulative carbon tax liability across all forecast years. Grows each year as the carbon price escalates.",                                      color: isDark ? "#fbbf24" : "#d97706" },
              { label: "Total Emissions", value: rd.projection.totalEmissions != null ? `${rd.projection.totalEmissions.toFixed(1)}` : "—",                             unit: "t CO₂",  tip: "Cumulative CO₂ emissions in tonnes across all forecast years.",                                                                                       color: isDark ? "#fb923c" : "#ea580c" },
            ].map(({ label, value, unit, tip, color }) => (
              <div key={label} className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                <div className={`text-xs mb-1 flex items-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>{label}<Tip text={tip} isDark={isDark} /></div>
                <div className="font-bold text-sm" style={{ color }}>
                  {value}{unit && <span className={`text-xs font-normal ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Adjusted payback banner */}
          {rd.projection.adjustedPaybackYears != null && (
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 mb-4 ${rd.projection.adjustedPaybackYears >= 999 ? (isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200") : rd.projection.adjustedPaybackYears > 10 ? (isDark ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200") : (isDark ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200")}`}>
              <div>
                <p className={`text-sm font-bold ${rd.projection.adjustedPaybackYears >= 999 ? "text-red-500" : rd.projection.adjustedPaybackYears > 10 ? (isDark ? "text-yellow-400" : "text-yellow-700") : (isDark ? "text-green-400" : "text-green-700")}`}>
                  Adjusted Payback Period: {rd.projection.adjustedPaybackYears >= 999 ? "Not achieved within forecast horizon" : `${rd.projection.adjustedPaybackYears} years`}
                </p>
                <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {rd.projection.adjustedPaybackYears >= 999 ? "The cumulative savings do not recover the CAPEX within the forecast period. This indicates the economizer is not financially viable at the current workload density and climate." : rd.projection.adjustedPaybackYears > 10 ? "Payback exceeds 10 years — commercially marginal. Consider higher-density workloads or a cooler climate to improve the business case." : "Payback within 10 years — commercially viable investment."}
                </p>
              </div>
            </div>
          )}

          {/* NPV savings */}
          {rd.projection.npvSavings != null && (
            <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-4 ${rd.projection.npvSavings >= 0 ? (isDark ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200") : (isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200")}`}>
              <p className={`text-sm font-bold ${rd.projection.npvSavings >= 0 ? (isDark ? "text-green-400" : "text-green-700") : "text-red-500"}`}>
                NPV of Savings: ${rd.projection.npvSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                <span className={`text-xs font-normal ml-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {rd.projection.npvSavings >= 0 ? "Positive — savings exceed CAPEX in present-value terms" : "Negative — CAPEX exceeds discounted savings over the forecast period"}
                </span>
              </p>
            </div>
          )}

          <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            Full year-by-year breakdown is available in the <strong>Raw Data</strong> tab under &ldquo;Yearly Projection / TCO Forecast&rdquo;.
          </p>
        </div>
      )}
    </div>
  );
};
