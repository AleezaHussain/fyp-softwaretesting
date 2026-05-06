import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/shared/Sidebar";
import { useThemeStore } from "../hooks/useTheme";
import { useSimulationStore } from "../store/store";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Zap,
  TrendingDown,
  DollarSign,
  CheckCircle,
  XCircle,
  Activity,
  Wind,
  Droplets,
  Thermometer,
  Download,
  BarChart3,
  Table2,
  FileText,
  LayoutDashboard,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { ArrayDataSection } from "../components/simulation/ArrayDataSection";
import { SimulationCharts, SimulationChartsHandle } from "../components/simulation/SimulationCharts";
import { generateSimulationPDF } from "../utils/pdfExport";
import { SimulationDetailedView } from "../components/simulation/SimulationDetailedView";
import { SimulationRecommendations } from "../components/simulation/SimulationRecommendations";

interface SimulationData {
  id: number;
  name: string;
  description: string;
  simulation_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
  input_config?: any;
  result?: {
    id: number;
    runtime_minutes: number;
    energy_consumed_kwh: number;
    cooling_efficiency: number;
    cost_saving_percent: number;
    result_data: any;
    completed_at: string;
  };
}

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "charts", label: "Charts", icon: BarChart3 },
  { id: "metrics", label: "Detailed Metrics", icon: FileText },
  { id: "recommendations", label: "Recommendations", icon: Sparkles },
  { id: "raw", label: "Raw Data", icon: Table2 },
];

const SimulationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const simId = Number(id);
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const simulationFailureReason = useSimulationStore((s) => s.simulationFailureReason);
  const runSimulation = useSimulationStore((s) => s.runSimulation);
  const isSimulationRunning = useSimulationStore((s) => s.isSimulationRunning);
  const cachedSimulationDetails = useSimulationStore((s) => s.cachedSimulationDetails);
  const setCachedSimulationDetail = useSimulationStore((s) => s.setCachedSimulationDetail);
  const invalidateSimulationDetail = useSimulationStore((s) => s.invalidateSimulationDetail);
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [isRerunning, setIsRerunning] = useState(false);
  const [rerunWarning, setRerunWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const chartsRef = useRef<SimulationChartsHandle>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!id || isNaN(simId)) {
      setError("Invalid simulation ID");
      setLoading(false);
      return;
    }

    // Cache hit — serve immediately, no DB call
    const cached = cachedSimulationDetails[simId];
    if (cached) {
      setSimulation(cached);
      setLoading(false);
      return;
    }

    fetchSimulationDetails();
    // eslint-disable-next-line
  }, [id]);

  const fetchSimulationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: simData, error: simError } = await supabase
        .from("simulations")
        .select("*")
        .eq("id", simId)
        .single();
      if (simError) throw simError;

      const { data: resultData, error: resultError } = await supabase
        .from("simulation_results")
        .select("*")
        .eq("simulation_id", simId)
        .maybeSingle();
      if (resultError && resultError.code !== "PGRST116")
        console.error("Error fetching results:", resultError);

      const fullData = { ...simData, result: resultData || undefined };
      setSimulation(fullData);

      // Store in cache so revisiting this page skips the DB call
      setCachedSimulationDetail(simId, fullData);

      try {
        const { supabase: sb } = await import("../lib/supabase");
        const {
          data: { user },
        } = await sb.auth.getUser();
        if (user) {
          const { logActivity } = await import("../services/activityService");
          await logActivity(user.id, "simulation_viewed", {
            entity_type: "simulation",
            entity_id: String(simId),
            metadata: { name: simData?.name },
          });
        }
      } catch {
        /* ignore */
      }
    } catch (err: any) {
      setError(err.message || "Failed to load simulation details");
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = async () => {
    if (!simulation) return;
    setIsRerunning(true);

    // Listen for the completion event to get the new simulation ID
    const onComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.simulationId) {
        navigate(`/simulation/${detail.simulationId}`);
      }
      window.removeEventListener("simulation-completed", onComplete);
      window.removeEventListener("simulation-failed", onFailed);
    };
    const onFailed = () => {
      window.removeEventListener("simulation-completed", onComplete);
      window.removeEventListener("simulation-failed", onFailed);
    };
    window.addEventListener("simulation-completed", onComplete);
    window.addEventListener("simulation-failed", onFailed);

    try {
      // Pull stored config — prefer input_config, fall back to _api_payload in result_data
      const storedConfig = simulation.input_config
        || simulation.result?.result_data?._api_payload
        || null;

      if (!storedConfig) {
        navigate("/input-management");
        return;
      }

      const simTypeLower = simulation.simulation_type.toLowerCase();
      const coolingTechnique = simulation.simulation_type;

      let simulationInput: any;

      if (simTypeLower.includes("evap")) {
        // For evaporative: the store expects input.evaporativeConfig with weatherData inside it
        const evapConfig = {
          ...storedConfig,
          // weatherData may be at top level or nested — normalise both
          weatherData: storedConfig.weatherData || storedConfig.evaporativeConfig?.weatherData || [],
        };

        // If weatherData is empty (stripped in old saves), we can't re-run silently
        if (!evapConfig.weatherData || evapConfig.weatherData.length === 0) {
          setRerunWarning("Weather data was not saved with this simulation. Please reconfigure and re-run from the input page.");
          navigate("/input-management");
          return;
        }

        simulationInput = {
          coolingTechnique,
          dataCenterName: simulation.name,
          evaporativeConfig: evapConfig,
          ...evapConfig,
        };
      } else if (simTypeLower.includes("water") || simTypeLower.includes("chilled")) {
        const waterConfig = {
          ...storedConfig,
          weatherData: storedConfig.weatherData || storedConfig.chilledWaterConfig?.weatherData || [],
        };

        if (!waterConfig.weatherData || waterConfig.weatherData.length === 0) {
          setRerunWarning("Weather data was not saved with this simulation. Please reconfigure and re-run from the input page.");
          navigate("/input-management");
          return;
        }

        simulationInput = {
          coolingTechnique,
          dataCenterName: simulation.name,
          chilledWaterConfig: waterConfig,
          ...waterConfig,
        };
      } else {
        // Air-side
        simulationInput = {
          coolingTechnique,
          dataCenterName: simulation.name,
          airSideConfig: storedConfig,
          ...storedConfig,
        };
      }

      await runSimulation(simulationInput);
      // Invalidate this simulation's detail cache so the re-run result is fetched fresh
      invalidateSimulationDetail(simId);
      // Navigation is handled by the simulation-completed event listener above
    } catch (err: any) {
      console.error("Re-run failed:", err);
      window.removeEventListener("simulation-completed", onComplete);
      window.removeEventListener("simulation-failed", onFailed);
    } finally {
      setIsRerunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "running":
        return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
      case "cancelled":
      case "canceled":
        return <XCircle className="w-5 h-5 text-orange-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTechniqueIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("air")) return <Wind className="w-6 h-6 text-cyan-500" />;
    if (t.includes("chilled") || t.includes("water"))
      return <Droplets className="w-6 h-6 text-blue-500" />;
    if (t.includes("evap"))
      return <Thermometer className="w-6 h-6 text-purple-500" />;
    return <Zap className="w-6 h-6 text-gray-500" />;
  };

  const getTechniqueColor = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("air")) return "from-cyan-500 to-blue-500";
    if (t.includes("chilled") || t.includes("water"))
      return "from-blue-500 to-purple-500";
    if (t.includes("evap")) return "from-purple-500 to-pink-500";
    return "from-gray-500 to-gray-600";
  };

  const handleExportPDF = async () => {
    if (!simulation?.result) return;
    setIsExporting(true);

    // Switch to charts tab so the chart component is mounted and capturable
    const prevTab = activeTab;
    setActiveTab("charts");
    // Give React time to mount the charts tab + ResponsiveContainer layout pass
    await new Promise<void>((r) => setTimeout(r, 800));

    let capturedCharts: Record<string, string> = {};
    try {
      if (chartsRef.current) {
        capturedCharts = await chartsRef.current.captureAllCharts();
      }
    } catch (e) {
      console.warn("Chart capture failed, continuing without chart images", e);
    }

    // Fetch AI metrics explanation — check cache first
    let aiMetricsExplanation: string | undefined;
    let aiMetricsInsight: string | undefined;
    const cacheKey = `metrics_explanation_${simulation.id}`;
    
    try {
      // Try localStorage first
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        aiMetricsExplanation = parsed.explanation;
        aiMetricsInsight = parsed.keyInsight;
      } else {
        // Generate fresh from API
        const METRICS_API = import.meta.env.VITE_METRICS_EXPLANATION_API_URL ?? "http://localhost:8005/api";
        const rd2 = simulation.result.result_data ?? {};
        const m2 = rd2?.results?.metrics ?? {};
        const a2 = rd2?.results?.annual ?? {};
        const e2 = rd2?.results?.economics ?? {};
        const s2 = rd2?.summary ?? {};
        const evapPerf2 = rd2?.rawEvaporativeData?.results?.performance ?? {};
        const evapCost2 = rd2?.rawEvaporativeData?.results?.cost ?? {};
        const evapWater2 = rd2?.rawEvaporativeData?.results?.water ?? {};
        const simType2 = (simulation.simulation_type ?? "").toLowerCase();
        const isEvap = rd2?.coolingTechnique === "evaporative" || simType2.includes("evap");
        const isAir = rd2?.coolingTechnique === "air_economizer" || simType2.includes("air");

        // Build full metrics list from result_data directly
        const allMetrics: { label: string; value: any; unit: string }[] = [
          { label: "Runtime", value: simulation.result.runtime_minutes, unit: "min" },
          ...(isAir ? [
            { label: "Average PUE", value: s2.averagePUE, unit: "" },
            { label: "Average CUE", value: s2.averageCUE, unit: "kgCO2/kWh" },
            { label: "IT Energy", value: s2.totalItEnergy_kWh, unit: "kWh" },
            { label: "Cooling Energy", value: s2.totalCoolingEnergy_kWh, unit: "kWh" },
            { label: "Electricity Cost", value: s2.electricityCostUSD, unit: "USD" },
            { label: "Carbon Tax", value: s2.carbonTaxCostUSD, unit: "USD" },
            { label: "Annual OpEx", value: s2.annualOpExUSD, unit: "USD" },
            { label: "CAPEX", value: s2.totalCapexUSD, unit: "USD" },
            { label: "Payback Period", value: s2.paybackPeriodYears, unit: "years" },
            { label: "Carbon Savings", value: s2.carbonSavings_kg, unit: "kg" },
          ] : isEvap ? [
            { label: "PUE Average", value: evapPerf2.pue_average, unit: "" },
            { label: "WUE", value: evapPerf2.wue_average, unit: "L/kWh" },
            { label: "CUE", value: evapPerf2.cue_average, unit: "kgCO2/kWh" },
            { label: "Annual Water", value: evapWater2.total_liters, unit: "L" },
            { label: "Annual Cost", value: evapCost2.total_energy_cost_usd, unit: "USD" },
          ] : [
            { label: "Average COP", value: m2.averageCOP, unit: "" },
            { label: "PUE", value: m2.pue, unit: "" },
            { label: "WUE", value: m2.wue, unit: "L/kWh" },
            { label: "CUE", value: m2.cue, unit: "kgCO2/kWh" },
            { label: "Annual Energy", value: a2.energyConsumption_kWh, unit: "kWh" },
            { label: "Annual Water", value: a2.waterUsage_L, unit: "L" },
            { label: "Annual Carbon", value: a2.carbonEmissions_kg, unit: "kg" },
            { label: "CAPEX", value: e2.capex_USD, unit: "USD" },
            { label: "NPV", value: e2.npv_USD, unit: "USD" },
            { label: "Payback Period", value: e2.paybackPeriod_years, unit: "years" },
            { label: "LCCP", value: e2.lccp_USD, unit: "USD" },
          ]),
        ].filter(m => m.value !== null && m.value !== undefined);

        const resp = await fetch(`${METRICS_API}/explain-metrics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            technique: simulation.simulation_type,
            metrics: allMetrics,
            simulationContext: { technique: simulation.simulation_type },
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          aiMetricsExplanation = data.explanation;
          aiMetricsInsight = data.keyInsight;
          // Cache for future exports
          localStorage.setItem(cacheKey, JSON.stringify({ explanation: aiMetricsExplanation, keyInsight: aiMetricsInsight }));
        }
      }
    } catch (e) {
      console.warn("Metrics explanation fetch failed", e);
      // Continue without explanation
    }

    // Restore previous tab
    setActiveTab(prevTab);

    await generateSimulationPDF({
      simulation: {
        id: simulation.id,
        name: simulation.name,
        description: simulation.description,
        simulation_type: simulation.simulation_type,
        created_at: simulation.created_at,
        status: simulation.status,
      },
      result: {
        energy_consumed_kwh: simulation.result.energy_consumed_kwh,
        cooling_efficiency: simulation.result.cooling_efficiency,
        cost_saving_percent: simulation.result.cost_saving_percent,
        runtime_minutes: simulation.result.runtime_minutes,
        completed_at: simulation.result.completed_at,
        result_data: simulation.result.result_data,
      },
      capturedCharts,
      aiMetricsExplanation,
      aiMetricsInsight,
    });

    setIsExporting(false);
  };

  // ── shared styles ─────────────────────────────────────────────────────────
  const bg = isDark ? "bg-[#0a0e27]" : "bg-gray-50";
  const card = `${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"} border rounded-xl`;
  const text = isDark ? "text-white" : "text-gray-900";
  const muted = isDark ? "text-gray-400" : "text-gray-600";

  // ── loading / error states ────────────────────────────────────────────────
  if (loading)
    return (
      <div className={`min-h-screen ${bg}`}>
        <Sidebar />
        <main className="lg:ml-56 flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${isDark ? "border-[#5ce1e5]" : "border-[#0ea5e9]"}`}
            />
            <p className={`text-sm ${muted}`}>Loading simulation details...</p>
          </div>
        </main>
      </div>
    );

  if (error || !simulation)
    return (
      <div className={`min-h-screen ${bg}`}>
        <Sidebar />
        <main className="lg:ml-56 flex items-center justify-center h-screen">
          <div className="text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className={`mb-4 ${muted}`}>{error || "Simulation not found"}</p>
            <button
              onClick={() => navigate("/reports")}
              className={`px-6 py-2 rounded-lg ${isDark ? "bg-[#27304a] text-white hover:bg-[#3f4a68]" : "bg-white text-gray-900 hover:bg-gray-100"} transition-colors`}
            >
              Back to Reports
            </button>
          </div>
        </main>
      </div>
    );

  const rd = simulation.result?.result_data ?? {};

  const simType = (simulation.simulation_type ?? "").toLowerCase();
  const isEvap =
    rd?.coolingTechnique === "evaporative" || simType.includes("evap");
  const isAir =
    rd?.coolingTechnique === "air_economizer" || simType.includes("air");
  const evapPerf = rd?.rawEvaporativeData?.results?.performance ?? {};
  const evapAssess =
    rd?.coolingAdequacy ?? rd?.rawEvaporativeData?.cooling_assessment ?? {};
  const km = evapAssess?.keyMetrics ?? evapAssess?.key_metrics ?? {};

  // Overview KPI cards
  const kpiCards = isEvap
    ? [
        {
          icon: (
            <Clock
              className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}
            />
          ),
          label: "Runtime",
          value: `${simulation.result?.runtime_minutes}`,
          unit: "min",
        },
        {
          icon: (
            <Zap
              className={`w-5 h-5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`}
            />
          ),
          label: "PUE Average",
          value: (evapPerf.pue_average ?? rd?.pue ?? 0).toFixed(4),
          unit: "",
        },
        {
          icon: (
            <TrendingDown
              className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`}
            />
          ),
          label: "Cooling Cap Avg",
          value: (km.cooling_capacity_avg_kw ?? 0).toFixed(2),
          unit: "kW",
        },
        {
          icon: (
            <DollarSign
              className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
            />
          ),
          label: "Annual Cost",
          value: `$${(rd?.rawEvaporativeData?.results?.cost?.total_energy_cost_usd ?? rd?.estimatedCost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          unit: "",
        },
      ]
    : isAir
      ? [
          {
            icon: (
              <Clock
                className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}
              />
            ),
            label: "Runtime",
            value: `${simulation.result?.runtime_minutes}`,
            unit: "min",
          },
          {
            icon: (
              <Zap
                className={`w-5 h-5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`}
              />
            ),
            label: "Energy Consumed",
            value: (simulation.result?.energy_consumed_kwh ?? 0).toFixed(2),
            unit: "kWh",
          },
          {
            icon: (
              <TrendingDown
                className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`}
              />
            ),
            label: "Energy Savings",
            value: (
              rd?.summary?.energySavingsPercent ??
              simulation.result?.cost_saving_percent ??
              0
            ).toFixed(1),
            unit: "%",
          },
          {
            icon: (
              <DollarSign
                className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
              />
            ),
            label: "Annual Savings",
            value: `$${(rd?.summary?.annualSavingsUSD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            unit: "",
          },
        ]
      : [
          {
            icon: (
              <Clock
                className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}
              />
            ),
            label: "Runtime",
            value: `${simulation.result?.runtime_minutes}`,
            unit: "min",
          },
          {
            icon: (
              <Zap
                className={`w-5 h-5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`}
              />
            ),
            label: "Energy Consumed",
            value: (simulation.result?.energy_consumed_kwh ?? 0).toFixed(2),
            unit: "kWh",
          },
          {
            icon: (
              <TrendingDown
                className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`}
              />
            ),
            label: "PUE",
            value: (
              rd?.results?.metrics?.pue ??
              simulation.result?.cooling_efficiency ??
              0
            ).toFixed(4),
            unit: "",
          },
          {
            icon: (
              <DollarSign
                className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
              />
            ),
            label: "Annual Cost",
            value: `$${(rd?.results?.annual?.cost_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            unit: "",
          },
        ];

  return (
    <div className={`min-h-screen ${bg}`}>
      <Sidebar />
      <main className="lg:ml-56 p-6">
        {/* ── Page header ── */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/reports")}
            className={`flex items-center gap-2 mb-4 ${isDark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"} transition-colors`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Reports</span>
          </button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-xl bg-gradient-to-r ${getTechniqueColor(simulation.simulation_type)}`}
              >
                {getTechniqueIcon(simulation.simulation_type)}
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${text}`}>
                  {simulation.name}
                </h1>
                <p className={`text-sm ${muted}`}>
                  {simulation.description || "No description provided"}
                </p>
              </div>
            </div>
            {simulation.result && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                    isDark
                      ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white shadow-lg shadow-cyan-500/20"
                      : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white shadow-lg shadow-cyan-500/20"
                  }`}
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Capturing charts...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export PDF
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Info strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              icon: getStatusIcon(simulation.status),
              label: "Status",
              value: simulation.status,
            },
            {
              icon: (
                <Zap
                  className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}
                />
              ),
              label: "Technique",
              value: simulation.simulation_type,
            },
            {
              icon: (
                <Calendar
                  className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                />
              ),
              label: "Created",
              value: new Date(simulation.created_at).toLocaleDateString(),
            },
            {
              icon: (
                <Clock
                  className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`}
                />
              ),
              label: "Completed",
              value: simulation.result?.completed_at
                ? new Date(simulation.result.completed_at).toLocaleDateString()
                : "—",
            },
          ].map(({ icon, label, value }) => (
            <div key={label} className={`p-4 ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className={`text-xs font-medium ${muted}`}>{label}</span>
              </div>
              <p className={`font-semibold text-sm ${text}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Tab bar ── */}
        <div
          className={`flex gap-1 p-1 rounded-xl mb-6 ${isDark ? "bg-[#1a1f3a]" : "bg-gray-100"}`}
        >
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setActiveTab(tid)}
              className={`flex items-center gap-2 flex-1 justify-center py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tid
                  ? isDark
                    ? "bg-[#5ce1e5]/20 text-[#5ce1e5] border border-[#5ce1e5]/30"
                    : "bg-white text-blue-700 shadow border border-blue-100"
                  : isDark
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── No results placeholder ── */}
        {!simulation.result && (
          <div className={`p-10 rounded-xl text-center ${card}`}>
            {simulation.status.toLowerCase() === "running" ? (
              <>
                <Activity className="w-12 h-12 mx-auto mb-3 text-blue-500 animate-pulse" />
                <p className={`text-lg font-medium ${text}`}>Simulation in progress</p>
                <p className={`text-sm ${muted}`}>Results will appear here when complete</p>
              </>
            ) : simulation.status.toLowerCase() === "failed" ? (
              <>
                <XCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                <p className={`text-lg font-medium text-red-500`}>Simulation Failed</p>
                <p className={`text-sm ${muted} mt-1`}>This simulation encountered an error and could not complete.</p>
                {(simulation.error_message || rd?.failureReason || simulationFailureReason) && (
                  <div className={`mt-4 mx-auto max-w-lg px-4 py-3 rounded-xl text-sm text-left border ${
                    isDark ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-red-50 border-red-200 text-red-700"
                  }`}>
                    <p className="font-semibold mb-1">Error Details:</p>
                    <p className="leading-relaxed font-mono text-xs break-all">
                      {simulation.error_message || rd?.failureReason || simulationFailureReason}
                    </p>
                  </div>
                )}

                {/* Warning box — shown when weather data is missing for re-run */}
                {rerunWarning && (
                  <div className={`mt-4 mx-auto max-w-lg rounded-xl border overflow-hidden`}>
                    <div className={`flex items-start gap-3 px-4 py-3 ${
                      isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"
                    }`}>
                      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        isDark ? "bg-amber-500/20" : "bg-amber-100"
                      }`}>
                        <AlertCircle className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-semibold text-sm ${isDark ? "text-amber-300" : "text-amber-800"}`}>
                          Weather Data Not Available
                        </p>
                        <p className={`text-xs mt-1 leading-relaxed ${isDark ? "text-amber-400/80" : "text-amber-700"}`}>
                          {rerunWarning}
                        </p>
                        <button
                          onClick={() => navigate("/input-management")}
                          className={`mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-105 ${
                            isDark
                              ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                        >
                          <RefreshCw className="w-3 h-3" />
                          Go to Configuration
                        </button>
                      </div>
                      <button
                        onClick={() => setRerunWarning(null)}
                        className={`shrink-0 text-lg leading-none opacity-50 hover:opacity-100 transition-opacity ${
                          isDark ? "text-amber-300" : "text-amber-700"
                        }`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {!rerunWarning && (
                  <button
                    onClick={handleRerun}
                    disabled={isRerunning || isSimulationRunning}
                    className={`mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                      isDark
                        ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
                        : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
                    }`}
                  >
                    {isRerunning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Re-run Simulation
                      </>
                    )}
                  </button>
                )}
              </>
            ) : simulation.status.toLowerCase() === "cancelled" || simulation.status.toLowerCase() === "canceled" ? (
              <>
                <XCircle className="w-12 h-12 mx-auto mb-3 text-orange-400" />
                <p className={`text-lg font-medium text-orange-400`}>Simulation Cancelled</p>
                <p className={`text-sm ${muted} mt-1`}>This simulation was cancelled before it could complete.</p>
              </>
            ) : (
              <>
                <XCircle className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
                <p className={`text-lg font-medium ${text}`}>No results available</p>
                <p className={`text-sm ${muted}`}>This simulation hasn't produced any results yet</p>
              </>
            )}
          </div>
        )}

        {/* ── TAB: Overview ── */}
        {activeTab === "overview" && simulation.result && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className={`p-6 ${card}`}>
              <h2 className={`text-lg font-bold mb-4 ${text}`}>
                Performance Summary
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map(({ icon, label, value, unit }) => (
                  <div
                    key={label}
                    className={`p-4 rounded-xl ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {icon}
                      <span className={`text-xs font-medium ${muted}`}>
                        {label}
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${text}`}>
                      {value}
                      {unit && (
                        <span className="text-sm font-normal ml-1">{unit}</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulation info */}
            <div className={`p-6 ${card}`}>
              <h2 className={`text-lg font-bold mb-4 ${text}`}>
                Simulation Info
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ["Simulation ID", `#${simulation.id}`],
                  ["Type", simulation.simulation_type],
                  ["Status", simulation.status],
                  ["Created", new Date(simulation.created_at).toLocaleString()],
                  [
                    "Completed",
                    simulation.result.completed_at
                      ? new Date(
                          simulation.result.completed_at,
                        ).toLocaleString()
                      : "—",
                  ],
                  ["Runtime", `${simulation.result.runtime_minutes} min`],
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    className={`flex justify-between py-2 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`}
                  >
                    <span className={`text-sm ${muted}`}>{label}</span>
                    <span className={`text-sm font-semibold ${text}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Charts ── */}
        {activeTab === "charts" && simulation.result?.result_data && (
          <div className={`p-6 ${card}`}>
            <h2 className={`text-lg font-bold mb-6 ${text}`}>Visualisations</h2>
            <SimulationCharts
              ref={chartsRef}
              resultData={simulation.result.result_data}
              simulationType={simulation.simulation_type}
              simulationName={simulation.name}
              simulationDescription={simulation.description}
              isDark={isDark}
            />
          </div>
        )}

        {/* ── TAB: Detailed Metrics ── */}
        {activeTab === "metrics" && simulation.result?.result_data && (
          <div className={`p-6 ${card}`}>
            <h2 className={`text-lg font-bold mb-6 ${text}`}>
              Detailed Metrics
            </h2>
            <SimulationDetailedView
              resultData={simulation.result.result_data}
              result={simulation.result}
              isDark={isDark}
            />
          </div>
        )}

        {/* ── TAB: Recommendations ── */}
        {activeTab === "recommendations" && simulation.result?.result_data && (
          <div className={`p-6 ${card}`}>
            <h2 className={`text-lg font-bold mb-6 ${text}`}>
              Recommendations
            </h2>
            <SimulationRecommendations
              resultData={simulation.result.result_data}
              result={simulation.result}
              isDark={isDark}
            />
          </div>
        )}

        {/* ── TAB: Raw Data ── */}
        {activeTab === "raw" && simulation.result?.result_data && (
          <div>
            <div
              className={`p-4 mb-4 rounded-xl border ${isDark ? "bg-amber-900/10 border-amber-700/30" : "bg-amber-50 border-amber-200"}`}
            >
              <p
                className={`text-sm ${isDark ? "text-amber-300" : "text-amber-700"}`}
              >
                Raw array data from the simulation engine. Expand any section to
                inspect hourly records.
              </p>
            </div>
            <ArrayDataSection
              resultData={simulation.result.result_data}
              isDark={isDark}
              simulationId={simulation.id}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default SimulationDetail;
