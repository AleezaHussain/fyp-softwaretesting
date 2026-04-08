import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/shared/Sidebar";
import { useThemeStore } from "../hooks/useTheme";
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
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { ArrayDataSection } from "../components/simulation/ArrayDataSection";
import { SimulationCharts } from "../components/simulation/SimulationCharts";
import { generateSimulationPDF } from "../utils/pdfExport";
import { SimulationDetailedView } from "../components/simulation/SimulationDetailedView";

interface SimulationData {
  id: number;
  name: string;
  description: string;
  simulation_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  result?: {
    id: number;
    runtime_minutes: number;
    energy_consumed_kwh: number;
    cooling_efficiency: number;
    cost_saving_percent: number;
    result_data: any; // Contains _api_payload inside
    completed_at: string;
  };
}

const SimulationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const simId = Number(id);
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tab state removed — single summary view

  useEffect(() => {
    if (!id || isNaN(simId)) {
      setError("Invalid simulation ID");
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

      // Fetch simulation with results
      if (!id || isNaN(simId)) {
        setError("Invalid simulation ID");
        setLoading(false);
        return;
      }
      const { data: simData, error: simError } = await supabase
        .from("simulations")
        .select("*")
        .eq("id", simId)
        .single();

      if (simError) throw simError;

      // Fetch results if they exist
      const { data: resultData, error: resultError } = await supabase
        .from("simulation_results")
        .select("*")
        .eq("simulation_id", simId)
        .maybeSingle(); // maybeSingle returns null instead of 406 when no row exists

      // It's okay if results don't exist yet (simulation might be running)
      if (resultError && resultError.code !== "PGRST116") {
        console.error("Error fetching results:", resultError);
      }

      setSimulation({
        ...simData,
        result: resultData || undefined,
      });

      // Log activity
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
      console.error("Error fetching simulation:", err);
      setError(err.message || "Failed to load simulation details");
    } finally {
      setLoading(false);
    }
  };

  // copyToClipboard removed — API tab removed

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "running":
        return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTechniqueIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case "AIR ECONOMIZER":
        return <Wind className="w-6 h-6 text-cyan-500" />;
      case "CHILLED WATER":
        return <Droplets className="w-6 h-6 text-blue-500" />;
      case "EVAPORATIVE":
        return <Thermometer className="w-6 h-6 text-purple-500" />;
      default:
        return <Zap className="w-6 h-6 text-gray-500" />;
    }
  };

  const getTechniqueColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case "AIR ECONOMIZER":
        return "from-cyan-500 to-blue-500";
      case "CHILLED WATER":
        return "from-blue-500 to-purple-500";
      case "EVAPORATIVE":
        return "from-purple-500 to-pink-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const handleExportPDF = () => {
    if (!simulation?.result) return;
    generateSimulationPDF({
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
    });
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}>
        <Sidebar />
        <main className="lg:ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <Activity
                className={`w-12 h-12 mx-auto mb-4 animate-spin ${isDark ? "text-[#5ce1e5]" : "text-blue-500"}`}
              />
              <p className={isDark ? "text-gray-300" : "text-gray-600"}>
                Loading simulation details...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !simulation) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}>
        <Sidebar />
        <main className="lg:ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <p
                className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}
              >
                {error || "Simulation not found"}
              </p>
              <button
                onClick={() => navigate("/simulations")}
                className={`px-6 py-2 rounded-lg ${
                  isDark
                    ? "bg-[#27304a] text-white hover:bg-[#3f4a68]"
                    : "bg-white text-gray-900 hover:bg-gray-100"
                } transition-colors`}
              >
                Back to Simulations
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="lg:ml-64 p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/simulations")}
            className={`flex items-center gap-2 mb-4 ${
              isDark
                ? "text-gray-300 hover:text-white"
                : "text-gray-600 hover:text-gray-900"
            } transition-colors`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Simulations</span>
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-xl bg-gradient-to-r ${getTechniqueColor(simulation.simulation_type)}`}
              >
                {getTechniqueIcon(simulation.simulation_type)}
              </div>
              <div>
                <h1
                  className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {simulation.name}
                </h1>
                <p
                  className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  {simulation.description || "No description provided"}
                </p>
              </div>
            </div>

            {/* Export PDF button */}
            {simulation.result && (
              <button
                onClick={handleExportPDF}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 ${
                  isDark
                    ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white shadow-lg shadow-cyan-500/20"
                    : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white shadow-lg shadow-cyan-500/20"
                }`}
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Status */}
          <div
            className={`p-4 rounded-xl ${
              isDark ? "bg-[#1a1f3a]" : "bg-white"
            } border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(simulation.status)}
              <span
                className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                Status
              </span>
            </div>
            <p
              className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {simulation.status}
            </p>
          </div>

          {/* Technique */}
          <div
            className={`p-4 rounded-xl ${
              isDark ? "bg-[#1a1f3a]" : "bg-white"
            } border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap
                className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}
              />
              <span
                className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                Technique
              </span>
            </div>
            <p
              className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {simulation.simulation_type}
            </p>
          </div>

          {/* Created */}
          <div
            className={`p-4 rounded-xl ${
              isDark ? "bg-[#1a1f3a]" : "bg-white"
            } border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar
                className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
              />
              <span
                className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                Created
              </span>
            </div>
            <p
              className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {new Date(simulation.created_at).toLocaleDateString()}
            </p>
            <p
              className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}
            >
              {new Date(simulation.created_at).toLocaleTimeString()}
            </p>
          </div>

          {/* Completed */}
          <div
            className={`p-4 rounded-xl ${
              isDark ? "bg-[#1a1f3a]" : "bg-white"
            } border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock
                className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`}
              />
              <span
                className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                Completed
              </span>
            </div>
            {simulation.result?.completed_at ? (
              <>
                <p
                  className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {new Date(
                    simulation.result.completed_at,
                  ).toLocaleDateString()}
                </p>
                <p
                  className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}
                >
                  {new Date(
                    simulation.result.completed_at,
                  ).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <p
                className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}
              >
                Not completed
              </p>
            )}
          </div>
        </div>

        {/* Summary Content */}
        <>
            {/* Results Section */}
            {simulation.result && (
              <div
                className={`p-6 rounded-xl mb-6 ${
                  isDark ? "bg-[#1a1f3a]" : "bg-white"
                } border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
              >
                <h2
                  className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Performance Metrics
                </h2>

                {/* Performance Metrics — technique-aware */}
                {(() => {
                  const rd = simulation.result.result_data ?? {};
                  const simType = (simulation.simulation_type ?? "").toLowerCase();
                  const isEvap = rd?.coolingTechnique === "evaporative" || simType.includes("evap");
                  const isAir  = rd?.coolingTechnique === "air_economizer" || simType.includes("air");

                  // Evaporative: read real metrics from result_data
                  const evapPerf   = rd?.rawEvaporativeData?.results?.performance ?? {};
                  const evapAssess = rd?.coolingAdequacy ?? rd?.rawEvaporativeData?.cooling_assessment ?? {};
                  const km         = evapAssess?.keyMetrics ?? evapAssess?.key_metrics ?? {};

                  // Card definitions per technique
                  const cards = isEvap ? [
                    {
                      icon: <Clock className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />,
                      label: "Runtime",
                      value: `${simulation.result.runtime_minutes}`,
                      unit: "min",
                    },
                    {
                      icon: <Zap className={`w-5 h-5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`} />,
                      label: "PUE Average",
                      value: (evapPerf.pue_average ?? rd?.pue ?? 0).toFixed(4),
                      unit: "",
                    },
                    {
                      icon: <TrendingDown className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`} />,
                      label: "Cooling Cap Avg",
                      value: (km.cooling_capacity_avg_kw ?? 0).toFixed(2),
                      unit: "kW",
                    },
                    {
                      icon: <DollarSign className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />,
                      label: "Annual Cost",
                      value: `$${(rd?.rawEvaporativeData?.results?.cost?.total_energy_cost_usd ?? rd?.estimatedCost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                      unit: "",
                    },
                  ] : isAir ? [
                    {
                      icon: <Clock className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />,
                      label: "Runtime",
                      value: `${simulation.result.runtime_minutes}`,
                      unit: "min",
                    },
                    {
                      icon: <Zap className={`w-5 h-5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`} />,
                      label: "Energy Consumed",
                      value: simulation.result.energy_consumed_kwh.toFixed(2),
                      unit: "kWh",
                    },
                    {
                      icon: <TrendingDown className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`} />,
                      label: "Energy Savings",
                      value: (rd?.summary?.energySavingsPercent ?? simulation.result.cost_saving_percent ?? 0).toFixed(1),
                      unit: "%",
                    },
                    {
                      icon: <DollarSign className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />,
                      label: "Annual Savings",
                      value: `$${(rd?.summary?.annualSavingsUSD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                      unit: "",
                    },
                  ] : [
                    // Chilled water
                    {
                      icon: <Clock className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />,
                      label: "Runtime",
                      value: `${simulation.result.runtime_minutes}`,
                      unit: "min",
                    },
                    {
                      icon: <Zap className={`w-5 h-5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`} />,
                      label: "Energy Consumed",
                      value: simulation.result.energy_consumed_kwh.toFixed(2),
                      unit: "kWh",
                    },
                    {
                      icon: <TrendingDown className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`} />,
                      label: "PUE",
                      value: (rd?.results?.metrics?.pue ?? simulation.result.cooling_efficiency ?? 0).toFixed(4),
                      unit: "",
                    },
                    {
                      icon: <DollarSign className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />,
                      label: "Annual Cost",
                      value: `$${(rd?.results?.annual?.cost_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                      unit: "",
                    },
                  ];

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {cards.map(({ icon, label, value, unit }) => (
                        <div key={label} className={`p-4 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            {icon}
                            <span className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>{label}</span>
                          </div>
                          <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                            {value}
                            {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Charts / Visualizations */}
            {simulation.result?.result_data && (
              <SimulationCharts
                resultData={simulation.result.result_data}
                simulationType={simulation.simulation_type}
                isDark={isDark}
              />
            )}

            {/* Detailed Results — same view as Reports page */}
            {simulation.result?.result_data && (
              <div
                className={`p-6 rounded-xl mb-6 ${isDark ? "bg-[#1a1f3a]" : "bg-white"} border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
              >
                <h2
                  className={`text-xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Detailed Results
                </h2>
                <SimulationDetailedView
                  resultData={simulation.result.result_data}
                  result={simulation.result}
                  isDark={isDark}
                />
              </div>
            )}
            {/* Array Data Section - full expandable tables for all arrays */}
            {simulation.result?.result_data && (
              <ArrayDataSection
                resultData={simulation.result.result_data}
                isDark={isDark}
              />
            )}

            {/* No Results Message for Summary Tab */}
            {!simulation.result &&
              simulation.status.toLowerCase() !== "running" && (
                <div
                  className={`p-8 rounded-xl text-center ${
                    isDark ? "bg-[#1a1f3a]" : "bg-white"
                  } border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
                >
                  <XCircle
                    className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-400"}`}
                  />
                  <p
                    className={`text-lg font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    No results available
                  </p>
                  <p
                    className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}
                  >
                    This simulation hasn't produced any results yet
                  </p>
                </div>
              )}

            {/* Running Message for Summary Tab */}
            {simulation.status.toLowerCase() === "running" && (
              <div
                className={`p-8 rounded-xl text-center ${
                  isDark ? "bg-[#1a1f3a]" : "bg-white"
                } border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
              >
                <Activity
                  className={`w-12 h-12 mx-auto mb-3 text-blue-500 animate-pulse`}
                />
                <p
                  className={`text-lg font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  Simulation in progress
                </p>
                <p
                  className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}
                >
                  Results will appear here when the simulation completes
                </p>
              </div>
            )}
          </>
      </main>
    </div>
  );
};

export default SimulationDetail;
