import React, { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { generateSimulationPDF } from "../../utils/pdfExport";

// ─── Colour palette ───────────────────────────────────────────────────────────
const COLORS = [
  "#5ce1e5",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
];

const tt = (isDark: boolean) => ({
  contentStyle: {
    background: isDark ? "#1a1f3a" : "#fff",
    border: `1px solid ${isDark ? "#3f4a68" : "#e5e7eb"}`,
    borderRadius: 8,
    color: isDark ? "#e2e8f0" : "#1f2937",
    fontSize: 11,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function card(isDark: boolean) {
  return `p-4 rounded-xl border ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`;
}

function sectionTitle(isDark: boolean) {
  return `text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`;
}

function extractMetrics(rd: any) {
  const metrics = rd?.results?.metrics ?? {};
  const annual = rd?.results?.annual ?? rd?.summary ?? {};
  const econ = rd?.results?.economics ?? {};
  const ml = rd?.mlRecommendation ?? {};
  return {
    pue: metrics.pue ?? rd?.summary?.averagePUE,
    wue: metrics.wue,
    cue: metrics.cue ?? rd?.summary?.averageCUE,
    cop: metrics.averageCOP ?? rd?.summary?.averageCOP,
    energy: annual.energyConsumption_kWh ?? rd?.summary?.totalEnergy_kWh,
    cooling: annual.coolingLoad_kWh,
    water: annual.waterUsage_L ?? rd?.summary?.waterUsage_liters,
    carbon: annual.carbonEmissions_kg ?? rd?.summary?.totalCarbonEmissions_kg,
    cost: annual.cost_USD ?? econ.opex_annual_USD ?? rd?.summary?.annualOpExUSD,
    capex: econ.capex_USD ?? rd?.summary?.totalCapexUSD,
    npv: econ.npv_USD,
    payback: econ.paybackPeriod_years ?? rd?.summary?.paybackPeriodYears,
    mlRec: ml.model_recommendation,
    compTable: ml.comparison_table ?? [],
    yearly:
      rd?.projection?.yearlyData ?? rd?.results?.projection?.yearlyData ?? [],
    hourly: rd?.results?.hourlyResults ?? rd?.hourlyResults ?? [],
    gates: rd?.results?.phase4Gates ?? {},
  };
}

function fmt(v: any, dec = 2) {
  if (v == null) return "—";
  if (typeof v === "number")
    return v > 1000
      ? v.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : v.toFixed(dec);
  return String(v);
}

// ─── Simulation selector ──────────────────────────────────────────────────────
function SimSelector({ simulations, selected, onSelect, isDark }: any) {
  return (
    <div
      className={`mb-6 p-4 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-gray-50 border-gray-200"}`}
    >
      <div
        className={`text-xs font-semibold mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
      >
        SELECT SIMULATION
      </div>
      <div className="flex flex-wrap gap-2">
        {simulations.map((sim: any) => (
          <button
            key={sim.id}
            onClick={() => onSelect(sim)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selected?.id === sim.id
                ? isDark
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : "bg-cyan-100 text-cyan-700 border border-cyan-300"
                : isDark
                  ? "bg-[#1a1f3a] text-gray-300 border border-[#3f4a68] hover:border-cyan-500/30"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-cyan-300"
            }`}
          >
            {sim.name}{" "}
            <span className={`ml-1 text-xs opacity-60`}>
              {sim.simulation_type?.toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── KPI grid ─────────────────────────────────────────────────────────────────
function KPIGrid({
  m,
  isDark,
}: {
  m: ReturnType<typeof extractMetrics>;
  isDark: boolean;
}) {
  const kpis = [
    { label: "PUE", value: fmt(m.pue, 3), unit: "", color: "#5ce1e5" },
    { label: "COP", value: fmt(m.cop, 2), unit: "", color: "#8b5cf6" },
    { label: "WUE", value: fmt(m.wue, 3), unit: "L/kWh", color: "#3b82f6" },
    { label: "CUE", value: fmt(m.cue, 3), unit: "kgCO₂/kWh", color: "#10b981" },
    {
      label: "Total Energy",
      value: fmt(m.energy),
      unit: "kWh",
      color: "#f59e0b",
    },
    { label: "Carbon", value: fmt(m.carbon), unit: "kg", color: "#ef4444" },
    {
      label: "Annual Cost",
      value: m.cost != null ? `$${fmt(m.cost)}` : "—",
      unit: "",
      color: "#10b981",
    },
    {
      label: "Payback",
      value: fmt(m.payback, 1),
      unit: "yrs",
      color: "#ec4899",
    },
  ].filter((k) => k.value !== "—");

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {kpis.map((k) => (
        <div
          key={k.label}
          className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}
        >
          <div className="text-xs mb-1" style={{ color: k.color }}>
            {k.label}
          </div>
          <div
            className={`font-bold text-lg leading-tight ${isDark ? "text-white" : "text-gray-900"}`}
          >
            {k.value}
            {k.unit && (
              <span
                className={`text-xs font-normal ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                {k.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Simulation results table ─────────────────────────────────────────────────
function SimResultsTable({ simulations, isDark, onNavigate }: any) {
  return (
    <div
      className={`rounded-xl border overflow-hidden ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={isDark ? "bg-[#0a0e27]" : "bg-gray-50"}>
              {[
                "Simulation",
                "Type",
                "PUE",
                "COP",
                "Energy (kWh)",
                "Carbon (kg)",
                "Cost (USD)",
                "Savings %",
                "Status",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className={`px-3 py-2.5 text-left font-semibold whitespace-nowrap ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {simulations.map((sim: any, i: number) => {
              const rd = sim.result?.result_data ?? {};
              const m = extractMetrics(rd);
              return (
                <tr
                  key={sim.id}
                  className={`border-t ${isDark ? "border-[#3f4a68]" : "border-gray-100"} ${i % 2 === 0 ? (isDark ? "bg-[#1a1f3a]" : "bg-white") : isDark ? "bg-[#0a0e27]" : "bg-gray-50/50"}`}
                >
                  <td
                    className={`px-3 py-2.5 font-medium max-w-[160px] truncate ${isDark ? "text-white" : "text-gray-900"}`}
                    title={sim.name}
                  >
                    {sim.name}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
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
                              : "bg-green-100 text-green-700"
                      }`}
                    >
                      {sim.simulation_type?.toUpperCase()}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2.5 font-mono ${isDark ? "text-cyan-400" : "text-cyan-700"}`}
                  >
                    {fmt(m.pue, 3)}
                  </td>
                  <td
                    className={`px-3 py-2.5 font-mono ${isDark ? "text-purple-400" : "text-purple-700"}`}
                  >
                    {fmt(m.cop, 2)}
                  </td>
                  <td
                    className={`px-3 py-2.5 font-mono ${isDark ? "text-yellow-400" : "text-yellow-700"}`}
                  >
                    {fmt(m.energy)}
                  </td>
                  <td
                    className={`px-3 py-2.5 font-mono ${isDark ? "text-red-400" : "text-red-600"}`}
                  >
                    {fmt(m.carbon)}
                  </td>
                  <td
                    className={`px-3 py-2.5 font-mono ${isDark ? "text-green-400" : "text-green-700"}`}
                  >
                    {m.cost != null ? `$${fmt(m.cost)}` : "—"}
                  </td>
                  <td className={`px-3 py-2.5 font-mono text-green-500`}>
                    {sim.result?.cost_saving_percent != null
                      ? `${Number(sim.result.cost_saving_percent).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"}`}
                    >
                      {sim.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => onNavigate(sim.id)}
                      className={`text-xs px-2 py-1 rounded-lg ${isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"}`}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 1. Executive Summary ─────────────────────────────────────────────────────
const ExecutiveSummary: React.FC<{ simulations: any[]; isDark: boolean }> = ({
  simulations,
  isDark,
}) => {
  const completed = simulations.filter(
    (s) => s.status === "completed" && s.result?.result_data,
  );
  const [sel, setSel] = useState(completed[0] ?? null);
  const navigate = useNavigate();

  const m = sel ? extractMetrics(sel.result.result_data) : null;

  // Technique comparison bar data
  const techData = completed.map((s) => {
    const mm = extractMetrics(s.result.result_data);
    return {
      name: s.simulation_type?.toUpperCase(),
      PUE: mm.pue ?? 0,
      COP: mm.cop ?? 0,
      Energy: mm.energy ? mm.energy / 1000 : 0,
    };
  });

  // 5-year projection
  const yearly = m?.yearly ?? [];

  return (
    <div className="space-y-6">
      <div
        className={`p-4 rounded-xl border-l-4 border-cyan-500 ${isDark ? "bg-cyan-500/10" : "bg-cyan-50"}`}
      >
        <div
          className={`text-sm font-semibold ${isDark ? "text-cyan-400" : "text-cyan-700"}`}
        >
          Executive Summary
        </div>
        <div
          className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          High-level KPIs and strategic recommendations for decision makers
          across all simulations.
        </div>
      </div>

      {completed.length === 0 ? (
        <div
          className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          No completed simulations yet.
        </div>
      ) : (
        <>
          <SimSelector
            simulations={completed}
            selected={sel}
            onSelect={setSel}
            isDark={isDark}
          />

          {m && <KPIGrid m={m} isDark={isDark} />}

          {/* Technique comparison */}
          {techData.length > 1 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                Technique Comparison — PUE & COP
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={techData} barGap={4}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#2d3748" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                      fill: isDark ? "#9ca3af" : "#6b7280",
                    }}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: isDark ? "#9ca3af" : "#6b7280",
                    }}
                  />
                  <Tooltip {...tt(isDark)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="PUE" fill="#5ce1e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="COP" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 5-year projection */}
          {yearly.length > 0 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                5-Year Financial Projection
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={yearly}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#2d3748" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="year"
                    tickFormatter={(v) => `Y${v}`}
                    tick={{
                      fontSize: 10,
                      fill: isDark ? "#9ca3af" : "#6b7280",
                    }}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: isDark ? "#9ca3af" : "#6b7280",
                    }}
                  />
                  <Tooltip
                    {...tt(isDark)}
                    formatter={(v: any) =>
                      `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="totalCostUSD"
                    fill="#ef444420"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Total Cost"
                  />
                  <Bar
                    dataKey="costSavingsUSD"
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                    name="Savings"
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeSavings"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={false}
                    name="Cumul. Savings"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ML recommendation */}
          {m?.mlRec && (
            <div
              className={`p-4 rounded-xl border-l-4 border-green-500 ${isDark ? "bg-green-500/10" : "bg-green-50"}`}
            >
              <div
                className={`text-sm font-bold mb-1 ${isDark ? "text-green-400" : "text-green-700"}`}
              >
                ✓ ML Recommendation
              </div>
              <div
                className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {m.mlRec}
              </div>
            </div>
          )}

          {/* All simulations table */}
          <div>
            <div
              className={`text-sm font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              All Simulations
            </div>
            <SimResultsTable
              simulations={completed}
              isDark={isDark}
              onNavigate={(id: number) => navigate(`/simulation/${id}`)}
            />
          </div>

          {/* Export */}
          {sel?.result && (
            <div className="flex justify-end">
              <button
                onClick={() =>
                  generateSimulationPDF({ simulation: sel, result: sel.result })
                }
                className={`px-5 py-2 rounded-xl text-sm font-semibold ${isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"}`}
              >
                Export PDF
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── 2. Technical Deep Dive ───────────────────────────────────────────────────
const TechnicalDeepDive: React.FC<{ simulations: any[]; isDark: boolean }> = ({
  simulations,
  isDark,
}) => {
  const completed = simulations.filter(
    (s) => s.status === "completed" && s.result?.result_data,
  );
  const [sel, setSel] = useState(completed[0] ?? null);
  const navigate = useNavigate();

  const m = sel ? extractMetrics(sel.result.result_data) : null;
  const hourly = m?.hourly ?? [];

  // Sample hourly for chart (every 73rd point = ~120 points from 8760)
  const step = Math.max(1, Math.ceil(hourly.length / 120));
  const sampledHourly = hourly
    .filter((_: any, i: number) => i % step === 0)
    .map((h: any, i: number) => ({
      hour: h.hour ?? h.timestampHour ?? i * step,
      cop: h.cop ?? 0,
      itLoad: h.itLoad_kW ?? h.it_kW ?? 0,
      coolingLoad: h.coolingLoad_kW ?? h.chillerPower_kW ?? 0,
      pue: h.pue ?? 0,
      temp: h.ambientTemp_C ?? h.outdoorTempC ?? 0,
    }));

  const gates = m?.gates ?? {};
  const gateEntries = Object.entries(gates);

  // Radar data from KPIs (normalised 0-10)
  const radarData = m
    ? [
        {
          metric: "PUE Eff",
          value: m.pue ? Math.max(0, 10 - (m.pue - 1) * 5) : 0,
        },
        { metric: "COP", value: m.cop ? Math.min(10, m.cop) : 0 },
        { metric: "WUE Eff", value: m.wue ? Math.max(0, 10 - m.wue * 2) : 0 },
        {
          metric: "Carbon",
          value: m.carbon ? Math.max(0, 10 - m.carbon / 10000) : 0,
        },
        {
          metric: "Cost Eff",
          value: m.cost ? Math.max(0, 10 - m.cost / 5000) : 0,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div
        className={`p-4 rounded-xl border-l-4 border-red-500 ${isDark ? "bg-red-500/10" : "bg-red-50"}`}
      >
        <div
          className={`text-sm font-semibold ${isDark ? "text-red-400" : "text-red-700"}`}
        >
          Technical Deep Dive
        </div>
        <div
          className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          Detailed hourly performance, system efficiency metrics, and compliance
          gates.
        </div>
      </div>

      {completed.length === 0 ? (
        <div
          className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          No completed simulations yet.
        </div>
      ) : (
        <>
          <SimSelector
            simulations={completed}
            selected={sel}
            onSelect={setSel}
            isDark={isDark}
          />
          {m && <KPIGrid m={m} isDark={isDark} />}

          {/* Phase 4 gates */}
          {gateEntries.length > 0 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                Phase 4 Compliance Gates
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {gateEntries.map(([key, val]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-lg text-center ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
                  >
                    <div
                      className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${String(val) === "PASS" ? (isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700") : isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"}`}
                    >
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Efficiency radar */}
          {radarData.length > 0 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                System Efficiency Radar
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={isDark ? "#2d3748" : "#e5e7eb"} />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{
                      fontSize: 11,
                      fill: isDark ? "#9ca3af" : "#6b7280",
                    }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="#5ce1e5"
                    fill="#5ce1e5"
                    fillOpacity={0.3}
                  />
                  <Tooltip {...tt(isDark)} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hourly COP + IT Load */}
          {sampledHourly.length > 0 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                Hourly COP & IT Load (sampled)
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={sampledHourly}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#2d3748" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                    label={{
                      value: "Hour",
                      position: "insideBottom",
                      offset: -2,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  />
                  <Tooltip {...tt(isDark)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cop"
                    stroke="#5ce1e5"
                    dot={false}
                    strokeWidth={1.5}
                    name="COP"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="itLoad"
                    fill="#8b5cf620"
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    name="IT Load kW"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hourly ambient temp */}
          {sampledHourly.length > 0 &&
            sampledHourly.some((h) => h.temp > 0) && (
              <div className={card(isDark)}>
                <div className={sectionTitle(isDark)}>
                  Ambient Temperature Profile (°C)
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={sampledHourly}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#f59e0b"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f59e0b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "#2d3748" : "#e5e7eb"}
                    />
                    <XAxis
                      dataKey="hour"
                      tick={{
                        fontSize: 9,
                        fill: isDark ? "#9ca3af" : "#6b7280",
                      }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 9,
                        fill: isDark ? "#9ca3af" : "#6b7280",
                      }}
                    />
                    <Tooltip {...tt(isDark)} />
                    <Area
                      type="monotone"
                      dataKey="temp"
                      stroke="#f59e0b"
                      fill="url(#tempGrad)"
                      strokeWidth={1.5}
                      name="Ambient °C"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

          {/* All simulations table */}
          <div>
            <div
              className={`text-sm font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              All Simulations
            </div>
            <SimResultsTable
              simulations={completed}
              isDark={isDark}
              onNavigate={(id: number) => navigate(`/simulation/${id}`)}
            />
          </div>
        </>
      )}
    </div>
  );
};

// ─── 3. Sustainability Report ─────────────────────────────────────────────────
const SustainabilityReport: React.FC<{
  simulations: any[];
  isDark: boolean;
}> = ({ simulations, isDark }) => {
  const completed = simulations.filter(
    (s) => s.status === "completed" && s.result?.result_data,
  );
  const [sel, setSel] = useState(completed[0] ?? null);
  const navigate = useNavigate();

  const m = sel ? extractMetrics(sel.result.result_data) : null;
  const yearly = m?.yearly ?? [];

  // Carbon breakdown pie
  const carbonPie = m
    ? [
        { name: "Cooling", value: m.cooling ? m.cooling * 0.5 : 0 },
        { name: "IT Load", value: m.energy ? m.energy * 0.4 : 0 },
        { name: "Lighting", value: m.energy ? m.energy * 0.05 : 0 },
        { name: "Other", value: m.energy ? m.energy * 0.05 : 0 },
      ].filter((d) => d.value > 0)
    : [];

  // Water usage over years
  const waterYearly = yearly.map((y: any) => ({
    year: `Y${y.year}`,
    water: y.energyKWh ? y.energyKWh * 0.18 : 0,
    carbon: y.emissionsTonsCO2 ? y.emissionsTonsCO2 * 1000 : 0,
  }));

  // Technique sustainability comparison
  const techSustain = completed.map((s) => {
    const mm = extractMetrics(s.result.result_data);
    return {
      name: s.simulation_type?.toUpperCase(),
      Carbon: mm.carbon ?? 0,
      Water: mm.water ? mm.water / 1000 : 0,
      CUE: mm.cue ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div
        className={`p-4 rounded-xl border-l-4 border-green-500 ${isDark ? "bg-green-500/10" : "bg-green-50"}`}
      >
        <div
          className={`text-sm font-semibold ${isDark ? "text-green-400" : "text-green-700"}`}
        >
          Sustainability Report
        </div>
        <div
          className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          Environmental impact, carbon footprint, water usage, and green
          metrics.
        </div>
      </div>

      {completed.length === 0 ? (
        <div
          className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          No completed simulations yet.
        </div>
      ) : (
        <>
          <SimSelector
            simulations={completed}
            selected={sel}
            onSelect={setSel}
            isDark={isDark}
          />

          {/* Sustainability KPIs */}
          {m && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
              {[
                {
                  label: "Carbon Emissions",
                  value: fmt(m.carbon),
                  unit: "kg CO₂",
                  color: "#ef4444",
                },
                {
                  label: "Water Usage",
                  value: fmt(m.water),
                  unit: "L",
                  color: "#3b82f6",
                },
                {
                  label: "CUE",
                  value: fmt(m.cue, 3),
                  unit: "kgCO₂/kWh",
                  color: "#10b981",
                },
                {
                  label: "WUE",
                  value: fmt(m.wue, 3),
                  unit: "L/kWh",
                  color: "#5ce1e5",
                },
              ]
                .filter((k) => k.value !== "—")
                .map((k) => (
                  <div
                    key={k.label}
                    className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}
                  >
                    <div className="text-xs mb-1" style={{ color: k.color }}>
                      {k.label}
                    </div>
                    <div
                      className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {k.value}{" "}
                      <span
                        className={`text-xs font-normal ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {k.unit}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Carbon breakdown pie */}
          {carbonPie.length > 0 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                Energy Consumption Breakdown
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={carbonPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {carbonPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...tt(isDark)}
                    formatter={(v: any) =>
                      `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Carbon & water over years */}
          {waterYearly.length > 0 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                Carbon & Water Trend (5-Year)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={waterYearly}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#2d3748" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="year"
                    tick={{
                      fontSize: 10,
                      fill: isDark ? "#9ca3af" : "#6b7280",
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  />
                  <Tooltip {...tt(isDark)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="carbon"
                    fill="#ef4444"
                    radius={[3, 3, 0, 0]}
                    name="Carbon kg"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="water"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Water kL"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Technique sustainability comparison */}
          {techSustain.length > 1 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                Technique Sustainability Comparison
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={techSustain} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#2d3748" : "#e5e7eb"}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{
                      fontSize: 10,
                      fill: isDark ? "#9ca3af" : "#6b7280",
                    }}
                    width={80}
                  />
                  <Tooltip {...tt(isDark)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="CUE"
                    fill="#10b981"
                    radius={[0, 3, 3, 0]}
                    name="CUE"
                  />
                  <Bar
                    dataKey="Water"
                    fill="#3b82f6"
                    radius={[0, 3, 3, 0]}
                    name="Water (kL)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div>
            <div
              className={`text-sm font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              All Simulations
            </div>
            <SimResultsTable
              simulations={completed}
              isDark={isDark}
              onNavigate={(id: number) => navigate(`/simulation/${id}`)}
            />
          </div>
        </>
      )}
    </div>
  );
};

// ─── 4. Comprehensive Analysis ────────────────────────────────────────────────
const ComprehensiveAnalysis: React.FC<{
  simulations: any[];
  isDark: boolean;
}> = ({ simulations, isDark }) => {
  const completed = simulations.filter(
    (s) => s.status === "completed" && s.result?.result_data,
  );
  const [sel, setSel] = useState(completed[0] ?? null);
  const navigate = useNavigate();

  const m = sel ? extractMetrics(sel.result.result_data) : null;
  const hourly = m?.hourly ?? [];
  const yearly = m?.yearly ?? [];
  const step = Math.max(1, Math.ceil(hourly.length / 120));

  const sampledHourly = hourly
    .filter((_: any, i: number) => i % step === 0)
    .map((h: any, i: number) => ({
      hour: h.hour ?? h.timestampHour ?? i * step,
      cop: h.cop ?? 0,
      itLoad: h.itLoad_kW ?? h.it_kW ?? 0,
      coolingLoad: h.coolingLoad_kW ?? h.chillerPower_kW ?? 0,
      pue: h.pue ?? 0,
      temp: h.ambientTemp_C ?? h.outdoorTempC ?? 0,
      water: h.waterUsage_L ?? 0,
    }));

  const gates = m?.gates ?? {};
  const compTable = m?.compTable ?? [];

  // All-technique comparison
  const allTech = completed.map((s) => {
    const mm = extractMetrics(s.result.result_data);
    return {
      name: s.simulation_type?.toUpperCase(),
      PUE: mm.pue ?? 0,
      COP: mm.cop ?? 0,
      Carbon: mm.carbon ? mm.carbon / 1000 : 0,
      Cost: mm.cost ? mm.cost / 1000 : 0,
      Water: mm.water ? mm.water / 1000 : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div
        className={`p-4 rounded-xl border-l-4 border-purple-500 ${isDark ? "bg-purple-500/10" : "bg-purple-50"}`}
      >
        <div
          className={`text-sm font-semibold ${isDark ? "text-purple-400" : "text-purple-700"}`}
        >
          Comprehensive Analysis
        </div>
        <div
          className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          Complete report — all metrics, charts, compliance gates, ML
          recommendations, and financial projections.
        </div>
      </div>

      {completed.length === 0 ? (
        <div
          className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          No completed simulations yet.
        </div>
      ) : (
        <>
          <SimSelector
            simulations={completed}
            selected={sel}
            onSelect={setSel}
            isDark={isDark}
          />
          {m && <KPIGrid m={m} isDark={isDark} />}

          {/* Phase 4 gates */}
          {Object.keys(gates).length > 0 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                Phase 4 Compliance Gates
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(gates).map(([key, val]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-lg text-center ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
                  >
                    <div
                      className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${String(val) === "PASS" ? (isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700") : isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"}`}
                    >
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hourly COP + cooling load */}
          {sampledHourly.length > 0 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                Hourly Performance — COP & Cooling Load
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={sampledHourly}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#2d3748" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  />
                  <YAxis
                    yAxisId="l"
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  />
                  <YAxis
                    yAxisId="r"
                    orientation="right"
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  />
                  <Tooltip {...tt(isDark)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    yAxisId="l"
                    type="monotone"
                    dataKey="cop"
                    stroke="#5ce1e5"
                    dot={false}
                    strokeWidth={1.5}
                    name="COP"
                  />
                  <Area
                    yAxisId="r"
                    type="monotone"
                    dataKey="coolingLoad"
                    fill="#8b5cf620"
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    name="Cooling kW"
                  />
                  <Area
                    yAxisId="r"
                    type="monotone"
                    dataKey="itLoad"
                    fill="#f59e0b20"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    name="IT Load kW"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 5-year projection */}
          {yearly.length > 0 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                5-Year Financial Projection
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={yearly}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#2d3748" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="year"
                    tickFormatter={(v) => `Y${v}`}
                    tick={{
                      fontSize: 10,
                      fill: isDark ? "#9ca3af" : "#6b7280",
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  />
                  <Tooltip
                    {...tt(isDark)}
                    formatter={(v: any) =>
                      `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="totalCostUSD"
                    fill="#ef444420"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Total Cost"
                  />
                  <Bar
                    dataKey="costSavingsUSD"
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                    name="Savings"
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeSavings"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={false}
                    name="Cumul. Savings"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* All-technique comparison */}
          {allTech.length > 1 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                All Techniques — Multi-Metric Comparison
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={allTech} barGap={2}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#2d3748" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 10,
                      fill: isDark ? "#9ca3af" : "#6b7280",
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" }}
                  />
                  <Tooltip {...tt(isDark)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="PUE" fill="#5ce1e5" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="COP" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  <Bar
                    dataKey="Carbon"
                    fill="#ef4444"
                    radius={[3, 3, 0, 0]}
                    name="Carbon (tCO₂)"
                  />
                  <Bar
                    dataKey="Cost"
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                    name="Cost (k$)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ML comparison table */}
          {compTable.length > 0 && (
            <div className={card(isDark)}>
              <div className={sectionTitle(isDark)}>
                ML Technique Comparison
              </div>
              <div className="overflow-x-auto">
                <table
                  className={`w-full text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  <thead>
                    <tr className={isDark ? "bg-[#0a0e27]" : "bg-gray-50"}>
                      {[
                        "Technique",
                        "Feasible",
                        "Score",
                        "Annual Cost",
                        "CO₂ (kg)",
                        "Water (L)",
                        "Violations",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDark ? "text-gray-300" : "text-gray-700"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compTable.map((row: any, i: number) => {
                      const isBest = row.tech === m?.mlRec;
                      return (
                        <tr
                          key={i}
                          className={`border-t ${isDark ? "border-[#3f4a68]" : "border-gray-100"} ${isBest ? (isDark ? "bg-green-500/15" : "bg-green-50") : i % 2 === 0 ? (isDark ? "bg-[#0a0e27]" : "bg-white") : ""}`}
                        >
                          <td
                            className={`px-3 py-2 font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                          >
                            {row.tech}
                            {isBest && (
                              <span
                                className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"}`}
                              >
                                ★ BEST
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {row.feasible ? (
                              <span className="text-green-500 font-bold">
                                ✓
                              </span>
                            ) : (
                              <span className="text-red-500 font-bold">✗</span>
                            )}
                          </td>
                          <td
                            className={`px-3 py-2 font-mono ${isDark ? "text-cyan-400" : "text-cyan-700"}`}
                          >
                            {typeof row.score === "number"
                              ? row.score.toFixed(4)
                              : "—"}
                          </td>
                          <td
                            className={`px-3 py-2 font-mono ${isDark ? "text-green-400" : "text-green-700"}`}
                          >
                            $
                            {(row.annual_cost ?? 0).toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </td>
                          <td
                            className={`px-3 py-2 font-mono ${isDark ? "text-yellow-400" : "text-yellow-700"}`}
                          >
                            {(row.annual_emissions_kg ?? 0).toLocaleString(
                              undefined,
                              { maximumFractionDigits: 0 },
                            )}
                          </td>
                          <td
                            className={`px-3 py-2 font-mono ${isDark ? "text-blue-400" : "text-blue-700"}`}
                          >
                            {(row.annual_water_liters ?? 0).toLocaleString(
                              undefined,
                              { maximumFractionDigits: 0 },
                            )}
                          </td>
                          <td
                            className={`px-3 py-2 text-center ${row.violations > 0 ? "text-red-500 font-bold" : isDark ? "text-gray-400" : "text-gray-500"}`}
                          >
                            {row.violations}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All simulations table */}
          <div>
            <div
              className={`text-sm font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              All Simulations
            </div>
            <SimResultsTable
              simulations={completed}
              isDark={isDark}
              onNavigate={(id: number) => navigate(`/simulation/${id}`)}
            />
          </div>

          {/* Export */}
          {sel?.result && (
            <div className="flex justify-end">
              <button
                onClick={() =>
                  generateSimulationPDF({ simulation: sel, result: sel.result })
                }
                className={`px-5 py-2 rounded-xl text-sm font-semibold ${isDark ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-100 text-purple-700 hover:bg-purple-200"}`}
              >
                Export PDF
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Named export ─────────────────────────────────────────────────────────────
export const ReportTemplateContent: React.FC<{
  selectedTemplate: string;
  simulations: any[];
  isDark: boolean;
}> = ({ selectedTemplate, simulations, isDark }) => {
  // When called from ReportPage, simulations has exactly 1 item (the selected sim).
  // When called from elsewhere, it has all simulations and the internal selector is used.
  switch (selectedTemplate) {
    case "executive":
      return <ExecutiveSummary simulations={simulations} isDark={isDark} />;
    case "technical":
      return <TechnicalDeepDive simulations={simulations} isDark={isDark} />;
    case "sustainability":
      return <SustainabilityReport simulations={simulations} isDark={isDark} />;
    case "comprehensive":
      return (
        <ComprehensiveAnalysis simulations={simulations} isDark={isDark} />
      );
    default:
      return <ExecutiveSummary simulations={simulations} isDark={isDark} />;
  }
};
