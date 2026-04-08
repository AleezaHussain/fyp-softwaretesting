import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/store";
import { useThemeStore } from "../../hooks/useTheme";
import { getUserSimulations } from "../../services/simulationService";
import {
  Download,
  Eye,
  FileText,
  MoreVertical,
  CheckCircle,
} from "lucide-react";
import { generateSimulationPDF } from "../../utils/pdfExport";
import { SimulationDetailedView } from "../simulation/SimulationDetailedView";

// Dropdown Menu Component
const ActionDropdown: React.FC<{
  isDark: boolean;
  onViewDetails: () => void;
  onFullReport: () => void;
  onExportPDF: () => void;
}> = ({ isDark, onViewDetails, onFullReport, onExportPDF }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-all ${
          isDark
            ? "hover:bg-[#3f4a68] text-gray-400 hover:text-white"
            : "hover:bg-gray-200 text-gray-600 hover:text-gray-900"
        }`}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-1 w-48 rounded-lg shadow-lg z-50 ${
            isDark
              ? "bg-[#27304a] border border-[#3f4a68]"
              : "bg-white border border-gray-200"
          }`}
        >
          <button
            onClick={() => { onViewDetails(); setIsOpen(false); }}
            className={`w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-opacity-50 transition-all ${isDark ? "text-gray-300 hover:bg-[#1a1f3a]" : "text-gray-700 hover:bg-gray-100"} border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>
          <button
            onClick={() => { onFullReport(); setIsOpen(false); }}
            className={`w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-opacity-50 transition-all ${isDark ? "text-gray-300 hover:bg-[#1a1f3a]" : "text-gray-700 hover:bg-gray-100"} border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
          >
            <FileText className="w-4 h-4" />
            Open Full Report Page
          </button>
          <button
            onClick={() => { onExportPDF(); setIsOpen(false); }}
            className={`w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-opacity-50 transition-all ${isDark ? "text-gray-300 hover:bg-[#1a1f3a]" : "text-gray-700 hover:bg-gray-100"}`}
          >
            <Download className="w-4 h-4" />
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
};

export const SimulationResultsTable: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isDark = useThemeStore((state) => state.isDark);

  const [dbSimulations, setDbSimulations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSimId, setExpandedSimId] = useState<number | null>(null);

  // Fetch simulations from database
  useEffect(() => {
    const fetchSimulations = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Use user.id directly as UUID string
        const response = await getUserSimulations(user.id);
        if (response.success && response.data) {
          setDbSimulations(response.data.simulations || []);
        }
      } catch (error) {
        console.error("Failed to fetch simulations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimulations();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <p className={`mt-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Loading simulations...
        </p>
      </div>
    );
  }

  const completedSimulations = dbSimulations.filter(
    (sim) => sim.status === "completed",
  );

  if (completedSimulations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
          No simulation results available. Run a simulation to see results here.
        </p>
      </div>
    );
  }

  const handleFullReport = (simId: number) => {
    navigate(`/simulation/${simId}`);
  };

  const handleExportPDF = (sim: any) => {
    try {
      generateSimulationPDF({
        simulation: {
          id: sim.id,
          name: sim.name,
          description: sim.description,
          simulation_type: sim.simulation_type,
          created_at: sim.created_at,
          status: sim.status,
        },
        result: {
          energy_consumed_kwh: sim.result?.energy_consumed_kwh || 0,
          cooling_efficiency: sim.result?.cooling_efficiency || 0,
          cost_saving_percent: sim.result?.cost_saving_percent || 0,
          runtime_minutes: sim.result?.runtime_minutes || 0,
          completed_at: sim.result?.completed_at,
          result_data: sim.result?.result_data || {},
        },
      });
    } catch (error) {
      console.error("Failed to export PDF:", error);
    }
  };

  return (
    <div className="space-y-4">
      {completedSimulations.map((sim) => (
        <div
          key={sim.id}
          className={`rounded-xl border-2 transition-all overflow-hidden ${
            expandedSimId === sim.id
              ? isDark
                ? "border-[#5ce1e5] bg-[#5ce1e5]/5"
                : "border-[#0ea5e9] bg-[#0ea5e9]/5"
              : isDark
                ? "border-[#3f4a68] hover:border-[#5ce1e5]/50"
                : "border-gray-200 hover:border-[#0ea5e9]/50"
          }`}
        >
          {/* Simulation Header */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3
                    className={`font-bold text-lg ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {sim.name}
                  </h3>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 ${
                      sim.simulation_type === "air"
                        ? isDark
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-cyan-100 text-cyan-700"
                        : sim.simulation_type === "water"
                          ? isDark
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-purple-100 text-purple-700"
                          : isDark
                            ? "bg-green-500/20 text-green-400"
                            : "bg-green-100 text-green-700"
                    }`}
                  >
                    <CheckCircle className="w-3 h-3" />
                    {sim.simulation_type?.toUpperCase()}
                  </span>
                </div>
                <p
                  className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  {sim.description || "No description"}
                </p>
                <span
                  className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}
                >
                  Created: {new Date(sim.created_at).toLocaleString()}
                  {sim.result?.completed_at && (
                    <>
                      {" "}
                      • Completed:{" "}
                      {new Date(sim.result.completed_at).toLocaleString()}
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <ActionDropdown
                  isDark={isDark}
                  onViewDetails={() =>
                    setExpandedSimId(expandedSimId === sim.id ? null : sim.id)
                  }
                  onFullReport={() => handleFullReport(sim.id)}
                  onExportPDF={() => handleExportPDF(sim)}
                />
              </div>
            </div>

            {/* Quick Stats */}
            {sim.result && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
                <div>
                  <div
                    className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Energy Consumed
                  </div>
                  <div
                    className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {sim.result.energy_consumed_kwh?.toFixed(2) || "0.00"} kWh
                  </div>
                </div>
                <div>
                  <div
                    className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Cooling Efficiency (PUE)
                  </div>
                  <div
                    className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {sim.result.cooling_efficiency?.toFixed(2) || "0.00"}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Cost Savings
                  </div>
                  <div className={`font-bold text-lg text-green-500`}>
                    {sim.result.cost_saving_percent?.toFixed(1) || "0.0"}%
                  </div>
                </div>
                <div>
                  <div
                    className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Runtime
                  </div>
                  <div
                    className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {sim.result.runtime_minutes?.toFixed(2) || "0"} min
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Expanded Details */}
          {expandedSimId === sim.id && sim.result?.result_data && (
            <div className={`p-6 border-t ${isDark ? "border-gray-700 bg-[#1a1f3a]/50" : "border-gray-200 bg-gray-50"}`}>
              <div className="flex items-center justify-between mb-5">
                <h4 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                  Detailed Results
                </h4>
                <button
                  onClick={() => navigate(`/simulation/${sim.id}`)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"}`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Full Page
                </button>
              </div>

              <SimulationDetailedView
                resultData={sim.result.result_data}
                result={sim.result}
                isDark={isDark}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
