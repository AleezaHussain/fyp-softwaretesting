import React, { useState, useEffect } from "react";
import { Sidebar } from "../components/shared/Sidebar";
import { useAuthStore, useSimulationStore } from "../store/store";
import { useThemeStore } from "../hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { getUserSimulations, getUserUUID } from "../services/simulationService";
import {
  Search,
  Filter,
  Download,
  Eye,
  Play,
  Trash2,
  Zap,
  BarChart3,
  Activity,
  CheckCircle,
} from "lucide-react";

// Delete Button Component with Modal
interface DeleteButtonProps {
  sim: any;
  isDark: boolean;
}

const DeleteButtonWithModal: React.FC<DeleteButtonProps> = ({
  sim,
  isDark,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await useSimulationStore.getState().deleteSimulation(Number(sim.id));
      // Dispatch event to update parent
      window.dispatchEvent(
        new CustomEvent("simulation-deleted", {
          detail: { id: sim.id },
        }),
      );
      setShowConfirm(false);
    } catch (err: any) {
      alert("Failed to delete simulation: " + (err?.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`p-2.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
          isDark
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "bg-red-100 text-red-600 hover:bg-red-200"
        }`}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className={`rounded-2xl p-6 max-w-md w-full mx-4 ${
              isDark
                ? "bg-[#1a1f3a] border border-[#3f4a68]"
                : "bg-white border border-gray-200"
            }`}
          >
            <h3
              className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Delete Simulation
            </h3>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Are you sure you want to delete "{sim.name}"? This action cannot
              be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isDark
                    ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68]"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isDeleting
                    ? "opacity-50 cursor-not-allowed"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Simulation Card Component
interface SimulationCardProps {
  simulation: any;
  index: number;
}

const techniqueDisplayName = (tech: string): string => {
  const t = (tech || "").toLowerCase().replace(/[_\s-]/g, "");
  if (t.includes("air") || t.includes("economizer") || t.includes("econ")) return "Air-Side Economizer";
  if (t.includes("chilled") || t.includes("water")) return "Chilled Water";
  if (t.includes("evap")) return "Evaporative Cooling";
  return tech || "Unknown";
};

const techniqueColor = (tech: string): string => {
  const t = (tech || "").toLowerCase();
  if (t.includes("air") || t.includes("econ")) return "#5ce1e5";
  if (t.includes("chilled") || t.includes("water")) return "#3b82f6";
  if (t.includes("evap")) return "#10b981";
  return "#8b5cf6";
};

// ── Extract common metrics that exist across ALL three techniques ─────────────
// Air:     summary.averagePUE, summary.totalEnergy_kWh, summary.annualOpExUSD, summary.totalCarbonEmissions_kg
// Chilled: results.metrics.pue, results.annual.energyConsumption_kWh, results.annual.cost_USD, results.annual.carbonEmissions_kg
// Evap:    rawEvaporativeData.results.performance.pue_average, energy.electricity_kwh_total, cost.total_energy_cost_usd, emissions.co2_kg_total
const extractCardMetrics = (sim: any) => {
  const rd  = sim?.result?.result_data ?? {};
  const s   = rd?.summary ?? {};
  const annual  = rd?.results?.annual ?? {};
  const metrics = rd?.results?.metrics ?? {};
  const econ    = rd?.results?.economics ?? {};

  const name = techniqueDisplayName(sim.coolingTechnique || sim.simulation_type);
  const isAir  = name.includes("Air");
  const isEvap = name.includes("Evaporative");

  if (isEvap) {
    // Evaporative: read directly from rawEvaporativeData or top-level transformed fields
    const evapRes  = rd?.rawEvaporativeData?.results ?? {};
    const evapPerf = evapRes?.performance ?? {};
    const evapAssess = rd?.coolingAdequacy ?? rd?.rawEvaporativeData?.cooling_assessment ?? {};
    const km = evapAssess?.keyMetrics ?? evapAssess?.key_metrics ?? {};
    return {
      pue:         evapPerf.pue_average        ?? rd?.pue         ?? null,
      totalEnergy: evapRes.energy?.electricity_kwh_total ?? rd?.totalEnergyConsumption ?? null,
      annualCost:  evapRes.cost?.total_energy_cost_usd   ?? rd?.estimatedCost          ?? null,
      carbon:      evapRes.emissions?.co2_kg_total       ?? rd?.carbonFootprint         ?? null,
      // Evap-specific extras shown instead of payback (evap has no payback)
      pueMax:      evapPerf.pue_max            ?? rd?.pue_max     ?? null,
      cue:         evapPerf.cue_average        ?? rd?.cue         ?? null,
      maxInletTemp: km.max_inlet_temp_c        ?? null,
      assessStatus: evapAssess?.status         ?? null,
      isAir: false,
      isEvap: true,
    };
  }

  if (isAir) {
    return {
      pue:        s.averagePUE ?? rd.averagePUE ?? null,
      totalEnergy: s.totalEnergy_kWh ?? s.totalEnergyKWh ?? null,
      annualCost: s.annualOpExUSD ?? s.estimatedOpExUSD ?? null,
      carbon:     s.totalCarbonEmissions_kg ?? s.totalCarbonKg ?? null,
      payback:    s.paybackPeriodYears ?? null,
      isAir: true,
      isEvap: false,
    };
  }

  // Chilled water
  return {
    pue:        metrics.pue ?? rd.pue ?? null,
    totalEnergy: annual.energyConsumption_kWh ?? rd.totalEnergy_kWh ?? null,
    annualCost: annual.cost_USD ?? econ.opex_annual_USD ?? null,
    carbon:     annual.carbonEmissions_kg ?? rd.totalCarbonEmissions_kg ?? null,
    payback:    econ.paybackPeriod_years ?? rd.paybackPeriod_years ?? null,
    isAir: false,
    isEvap: false,
  };
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Removed isAirSimulation — now using techniqueDisplayName for all techniques

const SimulationCard: React.FC<SimulationCardProps> = ({
  simulation,
  index,
}) => {
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);

  // PDF download handler
  const handleDownload = () => {
    import("../utils/pdfExport").then(({ generateSimulationPDF }) => {
      const pdfData = {
        simulation: {
          id: simulation.id,
          name: simulation.name,
          description: simulation.description || "",
          simulation_type: simulation.coolingTechnique || "N/A",
          created_at:
            simulation.createdAt ||
            simulation.timestamp ||
            new Date().toISOString(),
          status: simulation.status || "N/A",
        },
        result: {
          energy_consumed_kwh:
            simulation.totalEnergyConsumption ||
            simulation.result?.energy_consumed_kwh ||
            0,
          cooling_efficiency:
            simulation.cooling_efficiency ||
            simulation.result?.cooling_efficiency ||
            0,
          cost_saving_percent:
            simulation.cost_saving_percent ||
            simulation.result?.cost_saving_percent ||
            0,
          runtime_minutes:
            simulation.runtimeMinutes ||
            simulation.result?.runtime_minutes ||
            0,
          completed_at:
            simulation.completedAt || simulation.result?.completed_at || "",
          result_data:
            simulation.result_data ||
            simulation.rawEvaporativeData ||
            simulation.rawChilledWaterData ||
            simulation,
        },
      };
      generateSimulationPDF(pdfData);
    });
  };

  const handleResume = async () => {
    const payload = simulation.result?.result_data?._api_payload;
    if (!payload) {
      alert("No previous input found to resume simulation.");
      return;
    }
    const { useSimulationStore } = await import("../store/store");
    useSimulationStore.getState().setCurrentSimulation(simulation);
    useSimulationStore.getState().runSimulation(payload);
  };

  return (
    <div
      className={`group rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
        isDark
          ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68] hover:border-[#5ce1e5]/30"
          : "bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-[#0ea5e9]/30"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {simulation.name}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            simulation.status === "completed"
              ? isDark
                ? "bg-green-500/20 text-green-400"
                : "bg-green-100 text-green-700"
              : simulation.status === "running"
                ? isDark
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-blue-100 text-blue-700"
                : simulation.status === "pending"
                  ? isDark
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-yellow-100 text-yellow-700"
                  : isDark
                    ? "bg-gray-500/20 text-gray-400"
                    : "bg-gray-100 text-gray-700"
          }`}
        >
          {simulation.status || "N/A"}
        </span>
      </div>

      <p
        className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}
      >
        {simulation.description || "No description provided"}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>Technique</p>
          <p className="font-medium text-sm" style={{ color: techniqueColor(simulation.coolingTechnique) }}>
            {techniqueDisplayName(simulation.coolingTechnique || simulation.simulation_type)}
          </p>
        </div>
        {(() => {
          const m = extractCardMetrics(simulation);
          const fmt = (v: number | null, unit: string) =>
            v == null ? "—" : v > 1_000_000
              ? `${(v / 1_000_000).toFixed(2)}M ${unit}`
              : v > 1_000
                ? `${(v / 1_000).toFixed(1)}k ${unit}`
                : `${v.toFixed(v > 100 ? 0 : 3)} ${unit}`;
          return (
            <>
              <div>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>PUE</p>
                <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {m.pue != null ? m.pue.toFixed(4) : "—"}
                </p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>Total Energy</p>
                <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {fmt(m.totalEnergy, "kWh")}
                </p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>Annual Cost</p>
                <p className={`font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>
                  {m.annualCost != null ? `$${m.annualCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
                </p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>Carbon (kg)</p>
                <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {fmt(m.carbon, "kg")}
                </p>
              </div>
              {m.isEvap ? (
                <>
                  <div>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>PUE Max</p>
                    <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      {(m as any).pueMax != null ? (m as any).pueMax.toFixed(4) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>Max Inlet Temp</p>
                    <p className={`font-medium ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                      {(m as any).maxInletTemp != null ? `${(m as any).maxInletTemp.toFixed(1)} °C` : "—"}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>Payback</p>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {(m as any).payback != null ? `${(m as any).payback.toFixed(1)} yrs` : "—"}
                  </p>
                </div>
              )}
            </>
          );
        })()}
        <div>
          <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>Created</p>
          <p className={`font-medium text-xs ${isDark ? "text-white" : "text-gray-900"}`}>
            {formatDate(simulation.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/simulation/${simulation.id}`)}
          className={`flex-1 py-2.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
            isDark
              ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
              : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />
            View Details
          </div>
        </button>

        {simulation.status === "canceled" && (
          <button
            onClick={handleResume}
            className={`px-4 py-2 rounded-lg font-bold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isDark
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            Resume
          </button>
        )}

        <button
          onClick={handleDownload}
          className={`p-2.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
            isDark
              ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
          }`}
        >
          <Download className="w-4 h-4" />
        </button>

        <DeleteButtonWithModal sim={simulation} isDark={isDark} />
      </div>
    </div>
  );
};

export const Simulations: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isDark = useThemeStore((state) => state.isDark);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [techniqueFilter, setTechniqueFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [simulations, setSimulations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate stats from simulations
  const totalSimulations = simulations.length;
  const completedSimulations = simulations.filter(
    (s) => s.status === "completed",
  ).length;
  const runningSimulations = simulations.filter(
    (s) => s.status === "running",
  ).length;
  const completedWithData = simulations.filter(
    (s) => s.status === "completed" && s.result?.result_data,
  );
  const avgPUE =
    completedWithData.length > 0
      ? completedWithData.reduce((acc, s) => {
          const m = extractCardMetrics(s);
          return acc + (m.pue ?? 0);
        }, 0) / completedWithData.length
      : 0;

  // Filter simulations based on search and filters
  const filteredSimulations = simulations.filter((sim) => {
    const matchesSearch =
      sim.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sim.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sim.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || sim.status === statusFilter;
    const matchesTechnique =
      techniqueFilter === "all" ||
      techniqueDisplayName(sim.coolingTechnique || sim.simulation_type).toLowerCase().includes(techniqueFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesTechnique;
  });

  // Fetch simulations from database
  useEffect(() => {
    const fetchSimulations = async () => {
      console.log("[Simulations] user object:", user);
      console.log("[Simulations] user.authUserId:", user?.authUserId);

      // Check if user is logged in
      if (!user?.authUserId) {
        console.log("[Simulations] No authUserId found, skipping fetch");
        return;
      }

      setIsLoading(true);
      try {
        // Get the actual UUID from the users table using auth_user_id
        const userUUID = await getUserUUID(user.authUserId);
        console.log("[DEBUG] Resolved user UUID:", userUUID);

        if (!userUUID) {
          console.log("[DEBUG] No user UUID found, cannot fetch simulations");
          setSimulations([]);
          return;
        }

        // Fetch simulations using the actual user UUID
        const response = await getUserSimulations(userUUID);
        console.log("[DEBUG] getUserSimulations response:", response);

        if (response.success && response.data) {
          setSimulations(response.data.simulations || []);
        } else {
          console.warn(
            "[DEBUG] No simulations found or error:",
            response.error,
          );
          setSimulations([]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setSimulations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimulations();

    // Listen for simulation-deleted event to update local state
    const handleSimDeleted = (e: any) => {
      if (e?.detail?.id) {
        setSimulations((prev) =>
          prev.filter((sim) => Number(sim.id) !== Number(e.detail.id)),
        );
      }
    };

    window.addEventListener("simulation-deleted", handleSimDeleted);
    return () => {
      window.removeEventListener("simulation-deleted", handleSimDeleted);
    };
  }, [user?.authUserId]); // Re-fetch when authUserId changes

  return (
    <div className="min-h-screen">
      <Sidebar />

      <main className="relative lg:ml-64 p-4 lg:p-8">
        {/* Header Section */}
        <div className="relative mb-8 lg:mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1
                className={`text-3xl lg:text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
              >
                <span className={isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}>
                  Simulations
                </span>{" "}
                Management
              </h1>
              <p
                className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                View, manage, and analyze all your cooling optimization
                simulations
              </p>
            </div>

            {/* New Simulation Button */}
            <button
              onClick={() => navigate("/input-management")}
              className={`group relative px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 overflow-hidden ${
                isDark
                  ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
                  : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
              }`}
            >
              <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 transition-all duration-700 group-hover:left-full" />
              <span className="relative flex items-center justify-center gap-3">
                <Play className="w-5 h-5" />
                <span>New Simulation</span>
              </span>
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Stats cards remain the same */}
            <div
              className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                isDark
                  ? "bg-[#1a1f3a]/50 border border-[#3f4a68] hover:border-[#5ce1e5]/30"
                  : "bg-white/50 border border-gray-200 hover:border-[#0ea5e9]/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${isDark ? "bg-black/30" : "bg-gray-100"}`}
                >
                  <BarChart3
                    className={`w-5 h-5 ${isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}`}
                  />
                </div>
                <div>
                  <div
                    className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {totalSimulations}
                  </div>
                  <div
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Total Simulations
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                isDark
                  ? "bg-[#1a1f3a]/50 border border-[#3f4a68] hover:border-[#10b981]/30"
                  : "bg-white/50 border border-gray-200 hover:border-[#10b981]/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${isDark ? "bg-black/30" : "bg-gray-100"}`}
                >
                  <CheckCircle
                    className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`}
                  />
                </div>
                <div>
                  <div
                    className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {completedSimulations}
                  </div>
                  <div
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Completed
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                isDark
                  ? "bg-[#1a1f3a]/50 border border-[#3f4a68] hover:border-[#3b82f6]/30"
                  : "bg-white/50 border border-gray-200 hover:border-[#3b82f6]/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${isDark ? "bg-black/30" : "bg-gray-100"}`}
                >
                  <Activity
                    className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`}
                  />
                </div>
                <div>
                  <div
                    className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {runningSimulations}
                  </div>
                  <div
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Running
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                isDark
                  ? "bg-[#1a1f3a]/50 border border-[#3f4a68] hover:border-[#fbbf24]/30"
                  : "bg-white/50 border border-gray-200 hover:border-[#f59e0b]/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${isDark ? "bg-black/30" : "bg-gray-100"}`}
                >
                  <Zap
                    className={`w-5 h-5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`}
                  />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {avgPUE > 0 ? avgPUE.toFixed(3) : "—"}
                  </div>
                  <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Avg. PUE (completed)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & View Toggle Section */}
        <div
          className={`rounded-2xl p-6 mb-8 ${
            isDark
              ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
              : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter
                className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}
              />
              <span
                className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Filter & Search
              </span>
            </div>
            {/* View Mode Toggle */}
            <div
              className={`flex items-center gap-2 p-1 rounded-xl ${isDark ? "bg-[#27304a]" : "bg-gray-100"}`}
            >
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "grid"
                    ? isDark
                      ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
                      : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
                    : isDark
                      ? "text-gray-400 hover:text-white"
                      : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "list"
                    ? isDark
                      ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
                      : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
                    : isDark
                      ? "text-gray-400 hover:text-white"
                      : "text-gray-600 hover:text-gray-900"
                }`}
              >
                List View
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Search */}
            <div className="relative">
              <Search
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
              />
              <input
                type="text"
                placeholder="Search simulations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all ${
                  isDark
                    ? "bg-[#1a1f3a] border-[#3f4a68] text-white focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20"
                    : "bg-white border-gray-300 text-gray-900 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20"
                }`}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20"
                  : "bg-white border-gray-300 text-gray-900 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20"
              }`}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            {/* Technique Filter */}
            <select
              value={techniqueFilter}
              onChange={(e) => setTechniqueFilter(e.target.value)}
              className={`px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all ${
                isDark
                  ? "bg-[#1a1f3a] border-[#3f4a68] text-white focus:border-[#5ce1e5] focus:ring-[#5ce1e5]/20"
                  : "bg-white border-gray-300 text-gray-900 focus:border-[#0ea5e9] focus:ring-[#0ea5e9]/20"
              }`}
            >
              <option value="all">All Techniques</option>
              <option value="air economizer">Air-Side Economizer</option>
              <option value="chilled water">Chilled Water</option>
              <option value="evaporative">Evaporative Cooling</option>
            </select>
          </div>

          {/* Section Heading */}
          <div className="flex flex-col gap-2 mb-4">
            <h3
              className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              All Simulations
            </h3>
            <p
              className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Showing {filteredSimulations.length} of {simulations.length}{" "}
              simulations
            </p>
          </div>

          {/* Simulations Grid/List */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5ce1e5]"></div>
            </div>
          ) : (
            <>
              {filteredSimulations.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSimulations.map((sim, index) => (
                      <SimulationCard
                        key={sim.id}
                        simulation={sim}
                        index={index}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSimulations.map((sim) => (
                      <div
                        key={sim.id}
                        className={`group rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${
                          isDark
                            ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68] hover:border-[#5ce1e5]/30"
                            : "bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-[#0ea5e9]/30"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-6 flex-1">
                          <div className="flex flex-col gap-1 min-w-[180px]">
                            <span className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                              {sim.name}
                            </span>
                            <span className="text-xs font-medium" style={{ color: techniqueColor(sim.coolingTechnique) }}>
                              {techniqueDisplayName(sim.coolingTechnique || sim.simulation_type)}
                            </span>
                          </div>
                          {(() => {
                            const m = extractCardMetrics(sim);
                            const fmt = (v: number | null, unit: string) =>
                              v == null ? "—" : v > 1_000_000
                                ? `${(v / 1_000_000).toFixed(2)}M ${unit}`
                                : v > 1_000
                                  ? `${(v / 1_000).toFixed(1)}k ${unit}`
                                  : `${v.toFixed(v > 100 ? 0 : 3)} ${unit}`;
                            return (
                              <>
                                <div className="flex flex-col gap-1 min-w-[90px]">
                                  <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>PUE</span>
                                  <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                    {m.pue != null ? m.pue.toFixed(4) : "—"}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1 min-w-[120px]">
                                  <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Total Energy</span>
                                  <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                    {fmt(m.totalEnergy, "kWh")}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1 min-w-[110px]">
                                  <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Annual Cost</span>
                                  <span className={`font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>
                                    {m.annualCost != null ? `$${m.annualCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1 min-w-[110px]">
                                  <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Carbon (kg)</span>
                                  <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                    {fmt(m.carbon, "kg")}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1 min-w-[90px]">
                                  {m.isEvap ? (
                                    <>
                                      <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Max Inlet Temp</span>
                                      <span className={`font-medium ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                                        {(m as any).maxInletTemp != null ? `${(m as any).maxInletTemp.toFixed(1)} °C` : "—"}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Payback</span>
                                      <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                        {(m as any).payback != null ? `${(m as any).payback.toFixed(1)} yrs` : "—"}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                          <div className="flex flex-col gap-1 min-w-[120px]">
                            <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Created</span>
                            <span className={`font-medium text-xs ${isDark ? "text-white" : "text-gray-900"}`}>
                              {formatDate(sim.createdAt)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 min-w-[90px]">
                            <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Status</span>
                            <span className={`font-medium capitalize ${
                              sim.status === "completed" ? isDark ? "text-green-400" : "text-green-600"
                              : sim.status === "running" ? isDark ? "text-blue-400" : "text-blue-600"
                              : sim.status === "pending" ? isDark ? "text-yellow-400" : "text-yellow-600"
                              : isDark ? "text-gray-400" : "text-gray-600"
                            }`}>
                              {sim.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 md:mt-0">
                          <button
                            onClick={() => navigate(`/simulation/${sim.id}`)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                              isDark
                                ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
                                : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              import("../utils/pdfExport").then(
                                ({ generateSimulationPDF }) => {
                                  const pdfData = {
                                    simulation: {
                                      id: sim.id,
                                      name: sim.name,
                                      description: sim.description || "",
                                      simulation_type:
                                        sim.coolingTechnique || "N/A",
                                      created_at:
                                        sim.createdAt ||
                                        sim.timestamp ||
                                        new Date().toISOString(),
                                      status: sim.status || "N/A",
                                    },
                                    result: {
                                      energy_consumed_kwh:
                                        sim.totalEnergyConsumption ||
                                        sim.result?.energy_consumed_kwh ||
                                        0,
                                      cooling_efficiency:
                                        sim.cooling_efficiency ||
                                        sim.result?.cooling_efficiency ||
                                        0,
                                      cost_saving_percent:
                                        sim.cost_saving_percent ||
                                        sim.result?.cost_saving_percent ||
                                        0,
                                      runtime_minutes:
                                        sim.runtimeMinutes ||
                                        sim.result?.runtime_minutes ||
                                        0,
                                      completed_at:
                                        sim.completedAt ||
                                        sim.result?.completed_at ||
                                        "",
                                      result_data:
                                        sim.result_data ||
                                        sim.rawEvaporativeData ||
                                        sim.rawChilledWaterData ||
                                        sim,
                                    },
                                  };
                                  generateSimulationPDF(pdfData);
                                },
                              );
                            }}
                            className={`p-2 rounded-lg transition-all hover:scale-105 ${
                              isDark
                                ? "hover:bg-[#27304a] text-gray-400 hover:text-white"
                                : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                            }`}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <DeleteButtonWithModal sim={sim} isDark={isDark} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="inline-block p-4 rounded-full bg-gradient-to-r from-[#5ce1e5]/10 to-[#0ea5e9]/10 mb-4">
                    <BarChart3
                      className={`w-12 h-12 ${isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}`}
                    />
                  </div>
                  <h4
                    className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    No simulations found
                  </h4>
                  <p
                    className={`mb-6 max-w-md mx-auto ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    {searchTerm ||
                    statusFilter !== "all" ||
                    techniqueFilter !== "all"
                      ? "No simulations match your current filters. Try adjusting your search criteria."
                      : "You haven't run any simulations yet. Start your first cooling optimization simulation to see results here."}
                  </p>
                  <button
                    onClick={() => navigate("/input-management")}
                    className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                      isDark
                        ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
                        : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
                    }`}
                  >
                    Start First Simulation
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-in {
          animation-duration: 0.6s;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
};
