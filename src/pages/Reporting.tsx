import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/shared/Sidebar";
import { useAuthStore } from "../store/store";
import { useThemeStore } from "../hooks/useTheme";
import {
  getUserSimulations,
  SimulationWithResults,
} from "../services/simulationService";
import {
  ExternalLink,
  TrendingUp,
  Zap,
  Droplets,
  Activity,
} from "lucide-react";

// ─── Simulation Results Table ─────────────────────────────────────────────────
const SimResultsTable: React.FC<{
  simulations: SimulationWithResults[];
  isDark: boolean;
}> = ({ simulations, isDark }) => {
  const navigate = useNavigate();
  const PAGE_SIZE = 5;
  const completed = simulations.filter((s) => s.status === "completed");
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(completed.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedRows = completed.slice(pageStart, pageStart + PAGE_SIZE);

  if (completed.length === 0)
    return (
      <div
        className={`text-center py-10 ${isDark ? "text-gray-400" : "text-gray-500"}`}
      >
        No completed simulations yet.
      </div>
    );

  const th = (extra = "") =>
    `px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${isDark ? "text-gray-400 bg-[#0a0e27]" : "text-gray-500 bg-gray-50"} ${extra}`;
  const td = `px-3 py-2 text-xs whitespace-nowrap`;

  const statusBadge = (status: string) => {
    if (status === "completed") {
      return isDark
        ? "bg-green-500/20 text-green-400"
        : "bg-green-100 text-green-700";
    }
    if (status === "failed") {
      return isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700";
    }
    if (status === "running") {
      return isDark
        ? "bg-yellow-500/20 text-yellow-400"
        : "bg-yellow-100 text-yellow-700";
    }
    return isDark
      ? "bg-gray-500/20 text-gray-300"
      : "bg-gray-100 text-gray-700";
  };

  return (
    <div
      className={`rounded-xl border overflow-hidden ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className={`border-b ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
            >
              <th className={th()}>Simulation</th>
              <th className={th()}>Type</th>
              <th className={th()}>Status</th>
              <th className={th()}>Completed</th>
              <th className={th()}></th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((sim, i) => {
              const rowBg =
                i % 2 === 0
                  ? isDark
                    ? "bg-[#1a1f3a]"
                    : "bg-white"
                  : isDark
                    ? "bg-[#0a0e27]"
                    : "bg-gray-50/50";
              const badge =
                sim.simulation_type === "water"
                  ? isDark
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-blue-100 text-blue-700"
                  : sim.simulation_type === "air"
                    ? isDark
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-cyan-100 text-cyan-700"
                    : isDark
                      ? "bg-green-500/20 text-green-400"
                      : "bg-green-100 text-green-700";
              return (
                <tr
                  key={sim.id}
                  className={`${rowBg} border-t ${isDark ? "border-[#3f4a68]" : "border-gray-100"} hover:opacity-90`}
                >
                  <td className={`${td} max-w-[150px]`}>
                    <div
                      className={`truncate font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                      title={sim.name}
                    >
                      {sim.name}
                    </div>
                  </td>
                  <td className={td}>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge}`}
                    >
                      {sim.simulation_type?.toUpperCase()}
                    </span>
                  </td>
                  <td className={td}>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge(sim.status)}`}
                    >
                      {sim.status.toUpperCase()}
                    </span>
                  </td>
                  <td
                    className={`${td} ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {sim.result?.completed_at
                      ? new Date(sim.result.completed_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className={td}>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => navigate(`/simulation/${sim.id}`)}
                        title="View simulation"
                        aria-label="View simulation"
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className={`px-4 py-3 border-t text-xs flex items-center justify-between gap-4 ${isDark ? "border-[#3f4a68] text-gray-400" : "border-gray-100 text-gray-500"}`}
      >
        <span>
          Showing {pageStart + 1}-
          {Math.min(pageStart + PAGE_SIZE, completed.length)} of{" "}
          {completed.length}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              currentPage === 1
                ? isDark
                  ? "bg-[#27304a] text-gray-600 cursor-not-allowed"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                : isDark
                  ? "bg-[#27304a] text-gray-200 hover:bg-[#3f4a68]"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, idx) => {
            const page = idx + 1;
            const active = page === currentPage;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors ${
                  active
                    ? isDark
                      ? "bg-cyan-500/30 text-cyan-300"
                      : "bg-cyan-100 text-cyan-700"
                    : isDark
                      ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68]"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              currentPage === totalPages
                ? isDark
                  ? "bg-[#27304a] text-gray-600 cursor-not-allowed"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                : isDark
                  ? "bg-[#27304a] text-gray-200 hover:bg-[#3f4a68]"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Reporting page ──────────────────────────────────────────────────────
export const Reporting: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isDark = useThemeStore((state) => state.isDark);
  const [dbSimulations, setDbSimulations] = useState<SimulationWithResults[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);
    getUserSimulations(user.id)
      .then((r) => {
        if (r.success && r.data) setDbSimulations(r.data.simulations || []);
      })
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  const completed = dbSimulations.filter((s) => s.status === "completed");

  const section = `rounded-2xl p-6 mb-6 ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`;
  const h2 = `text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`;
  const sub = `text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`;

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}>
      <Sidebar />
      <main className="lg:ml-56 p-6">
        {/* Page header */}
        <div className="mb-8">
          <h1
            className={`text-3xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Reports{" "}
            <span className={isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}>
              &amp; Analytics
            </span>
          </h1>
          <p className={sub}>
            Generate, explore, and export detailed simulation reports.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              icon: Activity,
              label: "Total Simulations",
              value: dbSimulations.length,
              color: "#5ce1e5",
            },
            {
              icon: TrendingUp,
              label: "Completed",
              value: completed.length,
              color: "#10b981",
            },
            {
              icon: Zap,
              label: "Techniques Used",
              value: new Set(completed.map((s) => s.simulation_type)).size,
              color: "#8b5cf6",
            },
            {
              icon: Droplets,
              label: "With Results",
              value: completed.filter((s) => s.result?.result_data).length,
              color: "#f59e0b",
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className={`p-4 rounded-xl border ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" style={{ color }} />
                <span
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  {label}
                </span>
              </div>
              <div
                className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Simulation Results Table */}
        <div className={section}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className={h2}>Simulation Results</h2>
              <p className={`${sub} mt-0.5`}>
                {completed.length} completed simulation
                {completed.length !== 1 ? "s" : ""}
              </p>
            </div>
            {isLoading && (
              <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <SimResultsTable simulations={dbSimulations} isDark={isDark} />
        </div>
      </main>
    </div>
  );
};
