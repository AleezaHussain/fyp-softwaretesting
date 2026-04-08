/**
 * Full-page report view — opened when user clicks a template card.
 * Route: /reports/:templateId
 * Shows a simulation selector at the top, then the full report for that sim.
 */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/shared/Sidebar";
import { useAuthStore } from "../store/store";
import { useThemeStore } from "../hooks/useTheme";
import { getUserSimulations, SimulationWithResults } from "../services/simulationService";
import { ReportTemplateContent } from "../components/reports/ReportTemplateContent";
import { generateSimulationPDF } from "../utils/pdfExport";
import { ArrowLeft, Download, BarChart3, Thermometer, Leaf, FileText, ChevronDown } from "lucide-react";

const TEMPLATE_META: Record<string, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  executive:      { label: "Executive Summary",      color: "#5ce1e5", icon: <BarChart3 className="w-5 h-5" />,   desc: "High-level KPIs, financial overview, and ML recommendations." },
  technical:      { label: "Technical Deep Dive",    color: "#ef4444", icon: <Thermometer className="w-5 h-5" />, desc: "Hourly performance, compliance gates, and efficiency analysis." },
  sustainability: { label: "Sustainability Report",  color: "#10b981", icon: <Leaf className="w-5 h-5" />,        desc: "Carbon footprint, water usage, and green impact metrics." },
  comprehensive:  { label: "Comprehensive Analysis", color: "#8b5cf6", icon: <FileText className="w-5 h-5" />,    desc: "Full report — all metrics, charts, ML comparison, and projections." },
};

export const ReportPage: React.FC = () => {
  const { templateId = "executive" } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isDark = useThemeStore((state) => state.isDark);

  const [simulations, setSimulations] = useState<SimulationWithResults[]>([]);
  const [selectedSim, setSelectedSim] = useState<SimulationWithResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const meta = TEMPLATE_META[templateId] ?? TEMPLATE_META.executive;
  const completed = simulations.filter(s => s.status === "completed" && s.result?.result_data);

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);
    getUserSimulations(user.id)
      .then(r => {
        if (r.success && r.data) {
          const sims = r.data.simulations || [];
          setSimulations(sims);
          const done = sims.filter(s => s.status === "completed" && s.result?.result_data);
          if (done.length > 0) setSelectedSim(done[0]);
        }
      })
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  const handleExport = () => {
    if (!selectedSim?.result) return;
    generateSimulationPDF({
      simulation: {
        id: selectedSim.id,
        name: selectedSim.name,
        description: selectedSim.description,
        simulation_type: selectedSim.simulation_type,
        created_at: selectedSim.created_at,
        status: selectedSim.status,
      },
      result: {
        energy_consumed_kwh: selectedSim.result.energy_consumed_kwh ?? 0,
        cooling_efficiency: selectedSim.result.cooling_efficiency ?? 0,
        cost_saving_percent: selectedSim.result.cost_saving_percent ?? 0,
        runtime_minutes: selectedSim.result.runtime_minutes ?? 0,
        completed_at: selectedSim.result.completed_at,
        result_data: selectedSim.result.result_data ?? {},
      },
    });
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}>
      <Sidebar />
      <main className="lg:ml-64">

        {/* Sticky header */}
        <div className={`sticky top-0 z-20 border-b ${isDark ? "bg-[#0a0e27]/95 border-[#3f4a68]" : "bg-white/95 border-gray-200"} backdrop-blur-sm`}>
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            {/* Left: back + title */}
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => navigate("/reports")}
                className={`flex items-center gap-1.5 text-sm font-medium shrink-0 ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"} transition-colors`}
              >
                <ArrowLeft className="w-4 h-4" />
                Reports
              </button>
              <div className="w-px h-5 bg-gray-600 opacity-30 shrink-0" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg shrink-0" style={{ background: `${meta.color}20` }}>
                  <span style={{ color: meta.color }}>{meta.icon}</span>
                </div>
                <div className="min-w-0">
                  <div className={`font-bold text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}>{meta.label}</div>
                  <div className={`text-xs truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>{meta.desc}</div>
                </div>
              </div>
            </div>

            {/* Right: simulation selector + export */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Simulation picker */}
              <div className="relative">
                <button
                  onClick={() => setSelectorOpen(!selectorOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    isDark
                      ? "bg-[#1a1f3a] border-[#3f4a68] text-gray-300 hover:border-cyan-500/50"
                      : "bg-white border-gray-200 text-gray-700 hover:border-cyan-400"
                  }`}
                >
                  <span className="max-w-[180px] truncate">
                    {selectedSim ? selectedSim.name : isLoading ? "Loading…" : "Select simulation"}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${selectorOpen ? "rotate-180" : ""}`} />
                </button>

                {selectorOpen && completed.length > 0 && (
                  <div className={`absolute right-0 top-full mt-1 w-72 rounded-xl border shadow-xl z-30 overflow-hidden ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
                    <div className={`px-3 py-2 text-xs font-semibold border-b ${isDark ? "text-gray-400 border-[#3f4a68]" : "text-gray-500 border-gray-100"}`}>
                      {completed.length} completed simulation{completed.length !== 1 ? "s" : ""}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {completed.map(sim => (
                        <button
                          key={sim.id}
                          onClick={() => { setSelectedSim(sim); setSelectorOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                            selectedSim?.id === sim.id
                              ? isDark ? "bg-cyan-500/15 text-cyan-400" : "bg-cyan-50 text-cyan-700"
                              : isDark ? "text-gray-300 hover:bg-[#27304a]" : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${
                            sim.simulation_type === "water" ? isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"
                            : sim.simulation_type === "air" ? isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-700"
                            : isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"
                          }`}>
                            {sim.simulation_type?.toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{sim.name}</div>
                            <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                              {sim.result?.completed_at ? new Date(sim.result.completed_at).toLocaleDateString() : "—"}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Export PDF */}
              {selectedSim?.result && (
                <button
                  onClick={handleExport}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 ${isDark ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white" : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"}`}
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : completed.length === 0 ? (
            <div className={`text-center py-20 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <div className="text-lg font-medium mb-1">No completed simulations</div>
              <div className="text-sm">Run a simulation first to generate a report.</div>
              <button
                onClick={() => navigate("/input-management")}
                className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
              >
                Run Simulation
              </button>
            </div>
          ) : selectedSim ? (
            <ReportTemplateContent
              selectedTemplate={templateId}
              simulations={[selectedSim]}
              isDark={isDark}
            />
          ) : null}
        </div>

      </main>
    </div>
  );
};
