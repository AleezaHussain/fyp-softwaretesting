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
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  FileText,
  Leaf,
  Thermometer,
  ExternalLink,
  TrendingUp,
  Zap,
  Droplets,
  Activity,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────
// Extracts metrics from all three technique response shapes:
//
// Air Economizer (EconomizerController):
//   summary.totalEnergy_kWh, averagePUE, averageCUE, totalCarbonEmissions_kg,
//   electricityCostUSD, carbonTaxCostUSD, annualOpExUSD, totalCapexUSD,
//   annualSavingsUSD, paybackPeriodYears, energySavingsPercent, carbonSavings_kg
//
// Chilled Water / Evaporative (Spring Boot):
//   results.annual.energyConsumption_kWh, results.metrics.pue/wue/averageCOP,
//   results.annual.carbonEmissions_kg, results.annual.waterUsage_L,
//   results.annual.cost_USD, results.economics.npv_USD/paybackPeriod_years
function extractMetrics(rd: any) {
  const metrics = rd?.results?.metrics ?? {};
  const annual = rd?.results?.annual ?? {};
  const econ = rd?.results?.economics ?? {};
  const s = rd?.summary ?? {};

  return {
    // Efficiency — air: summary.averagePUE, chilled/evap: results.metrics.pue
    pue: metrics.pue ?? s.averagePUE,
    // COP — only chilled water / evaporative have this
    cop: metrics.averageCOP ?? s.averageCOP ?? null,
    // WUE — only chilled water / evaporative
    wue: metrics.wue ?? null,
    // CUE — air: summary.averageCUE, chilled/evap: results.metrics.cue
    cue: metrics.cue ?? s.averageCUE,
    // Energy — air: summary.totalEnergy_kWh, chilled/evap: results.annual.energyConsumption_kWh
    energy: annual.energyConsumption_kWh ?? s.totalEnergy_kWh,
    // IT energy — air only
    itEnergy: s.totalItEnergy_kWh ?? null,
    // Cooling energy — air: summary.totalCoolingEnergy_kWh, chilled/evap: results.annual.coolingLoad_kWh
    coolingEnergy: annual.coolingLoad_kWh ?? s.totalCoolingEnergy_kWh,
    // Carbon — air: summary.totalCarbonEmissions_kg, chilled/evap: results.annual.carbonEmissions_kg
    carbon: annual.carbonEmissions_kg ?? s.totalCarbonEmissions_kg,
    // Carbon savings — air only
    carbonSavings: s.carbonSavings_kg ?? null,
    // Water — air: 0 (waterUsage_liters), chilled/evap: results.annual.waterUsage_L
    water: annual.waterUsage_L ?? s.waterUsage_liters,
    // Cost — air: summary.annualOpExUSD, chilled/evap: results.annual.cost_USD
    cost: annual.cost_USD ?? econ.opex_annual_USD ?? s.annualOpExUSD,
    // Electricity cost — air only
    elecCost: s.electricityCostUSD ?? null,
    // Carbon tax — air only
    carbonTax: s.carbonTaxCostUSD ?? null,
    // CAPEX
    capex: econ.capex_USD ?? s.totalCapexUSD,
    // NPV — chilled/evap: results.economics.npv_USD
    npv: econ.npv_USD ?? null,
    // Payback — air: summary.paybackPeriodYears, chilled/evap: results.economics.paybackPeriod_years
    payback: econ.paybackPeriod_years ?? s.paybackPeriodYears,
    // Annual savings — air only
    annualSavings: s.annualSavingsUSD ?? null,
    // Energy savings % — air: summary.energySavingsPercent
    energySavPct: s.energySavingsPercent ?? null,
    // Phase 4 gates — chilled/evap only
    gates: rd?.results?.phase4Gates ?? null,
    // Airflow violations — air only
    violationHours: rd?.airflowViolations?.totalViolationHours ?? null,
    violationPct: rd?.airflowViolations?.percentageHours ?? null,
  };
}

function fmtNum(v: any, dec = 2): string {
  if (v == null) return "—";
  if (typeof v === "number") {
    if (v > 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v > 1_000)
      return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return v.toFixed(dec);
  }
  return String(v);
}

function fmtUSD(v: any): string {
  if (v == null) return "—";
  const n = Number(v);
  if (n > 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n > 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

const COLORS = [
  "#5ce1e5",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
];

// ─── Simulation Results Table ─────────────────────────────────────────────────
const SimResultsTable: React.FC<{
  simulations: SimulationWithResults[];
  isDark: boolean;
}> = ({ simulations, isDark }) => {
  const navigate = useNavigate();
  const completed = simulations.filter((s) => s.status === "completed");
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
  const mono = (c: string) => `${td} font-mono font-semibold ${c}`;
  const na = (
    <span className={isDark ? "text-gray-700" : "text-gray-300"}>—</span>
  );
  const gate = (v?: string) =>
    !v ? (
      na
    ) : (
      <span
        className={`px-1.5 py-0.5 rounded text-xs font-bold ${v === "PASS" ? (isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700") : isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"}`}
      >
        {v}
      </span>
    );
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
              <th className={th()}>PUE</th>
              <th className={th()}>CUE</th>
              <th className={th()}>Total Energy (kWh)</th>
              <th className={th()}>Carbon (kg)</th>
              <th className={th()}>Annual Cost</th>
              <th className={th()}>Payback (yrs)</th>
              <th
                className={th("border-l border-cyan-500/30")}
                title="Air Economizer — summary.totalItEnergy_kWh"
              >
                IT Energy
              </th>
              <th className={th()} title="summary.electricityCostUSD">
                Elec Cost
              </th>
              <th className={th()} title="summary.carbonTaxCostUSD">
                Carbon Tax
              </th>
              <th className={th()} title="summary.annualSavingsUSD">
                Ann. Savings
              </th>
              <th className={th()} title="summary.energySavingsPercent">
                Enrg Sav%
              </th>
              <th className={th()} title="summary.carbonSavings_kg">
                CO₂ Sav (kg)
              </th>
              <th
                className={th()}
                title="airflowViolations.totalViolationHours"
              >
                Viol. Hrs
              </th>
              <th
                className={th("border-l border-purple-500/30")}
                title="Chilled/Evap — results.metrics.averageCOP"
              >
                COP
              </th>
              <th className={th()} title="results.metrics.wue">
                WUE
              </th>
              <th className={th()} title="results.annual.waterUsage_L">
                Water (L)
              </th>
              <th className={th()} title="results.economics.npv_USD">
                NPV
              </th>
              <th className={th()} title="phase4Gates.thermalCompliance">
                Thermal
              </th>
              <th className={th()} title="phase4Gates.waterConstraint">
                Water Gate
              </th>
              <th className={th()} title="phase4Gates.carbonLiability">
                Carbon Gate
              </th>
              <th className={th()} title="phase4Gates.economicViability">
                Econ Gate
              </th>
              <th className={th("border-l border-gray-500/30")}>DB Sav%</th>
              <th className={th()}>Completed</th>
              <th className={th()}></th>
            </tr>
          </thead>
          <tbody>
            {completed.map((sim, i) => {
              const m = extractMetrics(sim.result?.result_data ?? {});
              const isAir = sim.simulation_type === "air";
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
                    <div
                      className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}
                    >
                      {new Date(sim.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className={td}>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge}`}
                    >
                      {sim.simulation_type?.toUpperCase()}
                    </span>
                  </td>
                  <td
                    className={mono(isDark ? "text-cyan-400" : "text-cyan-700")}
                  >
                    {fmtNum(m.pue, 3)}
                  </td>
                  <td
                    className={mono(
                      isDark ? "text-purple-400" : "text-purple-700",
                    )}
                  >
                    {fmtNum(m.cue, 4)}
                  </td>
                  <td
                    className={mono(
                      isDark ? "text-yellow-400" : "text-yellow-700",
                    )}
                  >
                    {fmtNum(m.energy)}
                  </td>
                  <td
                    className={mono(isDark ? "text-red-400" : "text-red-600")}
                  >
                    {fmtNum(m.carbon)}
                  </td>
                  <td
                    className={mono(
                      isDark ? "text-green-400" : "text-green-700",
                    )}
                  >
                    {fmtUSD(m.cost)}
                  </td>
                  <td
                    className={mono(
                      isDark ? "text-orange-400" : "text-orange-600",
                    )}
                  >
                    {fmtNum(m.payback, 2)}
                  </td>
                  {/* Air only */}
                  <td
                    className={`${td} border-l ${isDark ? "border-cyan-500/20" : "border-cyan-200"}`}
                  >
                    {isAir ? (
                      <span
                        className={`font-mono ${isDark ? "text-cyan-300" : "text-cyan-600"}`}
                      >
                        {fmtNum(m.itEnergy)}
                      </span>
                    ) : (
                      na
                    )}
                  </td>
                  <td className={td}>
                    {isAir ? (
                      <span
                        className={`font-mono ${isDark ? "text-green-300" : "text-green-600"}`}
                      >
                        {fmtUSD(m.elecCost)}
                      </span>
                    ) : (
                      na
                    )}
                  </td>
                  <td className={td}>
                    {isAir ? (
                      <span
                        className={`font-mono ${isDark ? "text-yellow-300" : "text-yellow-600"}`}
                      >
                        {fmtUSD(m.carbonTax)}
                      </span>
                    ) : (
                      na
                    )}
                  </td>
                  <td className={td}>
                    {isAir ? (
                      <span className="font-mono text-green-500">
                        {fmtUSD(m.annualSavings)}
                      </span>
                    ) : (
                      na
                    )}
                  </td>
                  <td className={td}>
                    {isAir && m.energySavPct != null ? (
                      <span className="font-mono text-green-500">
                        {fmtNum(m.energySavPct, 1)}%
                      </span>
                    ) : (
                      na
                    )}
                  </td>
                  <td className={td}>
                    {isAir ? (
                      <span
                        className={`font-mono ${isDark ? "text-emerald-400" : "text-emerald-600"}`}
                      >
                        {fmtNum(m.carbonSavings)}
                      </span>
                    ) : (
                      na
                    )}
                  </td>
                  <td className={td}>
                    {isAir && m.violationHours != null ? (
                      <span
                        className={`font-mono font-bold ${m.violationHours > 0 ? "text-red-500" : "text-green-500"}`}
                      >
                        {m.violationHours} ({m.violationPct}%)
                      </span>
                    ) : (
                      na
                    )}
                  </td>
                  {/* Chilled/Evap only */}
                  <td
                    className={`${td} border-l ${isDark ? "border-purple-500/20" : "border-purple-200"}`}
                  >
                    {!isAir ? (
                      <span
                        className={`font-mono ${isDark ? "text-purple-300" : "text-purple-600"}`}
                      >
                        {fmtNum(m.cop, 2)}
                      </span>
                    ) : (
                      na
                    )}
                  </td>
                  <td className={td}>
                    {!isAir ? (
                      <span
                        className={`font-mono ${isDark ? "text-blue-300" : "text-blue-600"}`}
                      >
                        {fmtNum(m.wue, 3)}
                      </span>
                    ) : (
                      na
                    )}
                  </td>
                  <td className={td}>
                    {!isAir ? (
                      <span
                        className={`font-mono ${isDark ? "text-blue-400" : "text-blue-700"}`}
                      >
                        {fmtNum(m.water)}
                      </span>
                    ) : (
                      na
                    )}
                  </td>
                  <td className={td}>
                    {!isAir ? (
                      <span
                        className={`font-mono ${m.npv != null && m.npv >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {fmtUSD(m.npv)}
                      </span>
                    ) : (
                      na
                    )}
                  </td>
                  <td className={td}>
                    {!isAir ? gate(m.gates?.thermalCompliance) : na}
                  </td>
                  <td className={td}>
                    {!isAir ? gate(m.gates?.waterConstraint) : na}
                  </td>
                  <td className={td}>
                    {!isAir ? gate(m.gates?.carbonLiability) : na}
                  </td>
                  <td className={td}>
                    {!isAir ? gate(m.gates?.economicViability) : na}
                  </td>
                  <td
                    className={`${td} border-l ${isDark ? "border-gray-600/30" : "border-gray-200"} font-semibold text-green-500`}
                  >
                    {sim.result?.cost_saving_percent != null
                      ? `${Number(sim.result.cost_saving_percent).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td
                    className={`${td} ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {sim.result?.completed_at
                      ? new Date(sim.result.completed_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className={td}>
                    <button
                      onClick={() => navigate(`/simulation/${sim.id}`)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        className={`px-4 py-2 border-t text-xs flex flex-wrap gap-4 ${isDark ? "border-[#3f4a68] text-gray-600" : "border-gray-100 text-gray-400"}`}
      >
        <span>
          <span className={isDark ? "text-cyan-400" : "text-cyan-600"}>
            Cyan
          </span>{" "}
          = Air Economizer only
        </span>
        <span>
          <span className={isDark ? "text-purple-400" : "text-purple-600"}>
            Purple
          </span>{" "}
          = Chilled Water / Evaporative only
        </span>
        <span>
          <span className="text-red-500">Red</span> violation hrs = airflow
          exceeded limit
        </span>
      </div>
    </div>
  );
};

// ─── Visualization Gallery ────────────────────────────────────────────────────
const VizGallery: React.FC<{
  simulations: SimulationWithResults[];
  isDark: boolean;
}> = ({ simulations, isDark }) => {
  const completed = simulations.filter(
    (s) => s.status === "completed" && s.result?.result_data,
  );
  if (completed.length === 0) return null;

  // Aggregate per-technique
  const techMap: Record<string, any> = {};
  completed.forEach((s) => {
    const rd = s.result?.result_data ?? {};
    const m = extractMetrics(rd);
    const type = s.simulation_type?.toUpperCase() ?? "UNKNOWN";
    if (!techMap[type]) {
      techMap[type] = {
        name: type,
        PUE: m.pue ?? 0,
        COP: m.cop ?? 0,
        Carbon: (m.carbon ?? 0) / 1000,
        Water: (m.water ?? 0) / 1000,
        Cost: m.cost ?? 0,
      };
    }
  });
  const techData = Object.values(techMap);

  // Best sim for hourly
  const best = completed[0];
  const rd = best?.result?.result_data ?? {};
  const hourly: any[] = rd?.results?.hourlyResults ?? rd?.hourlyResults ?? [];
  const yearly: any[] =
    rd?.projection?.yearlyData ?? rd?.results?.projection?.yearlyData ?? [];
  const step = Math.max(1, Math.ceil(hourly.length / 100));
  const sampled = hourly
    .filter((_: any, i: number) => i % step === 0)
    .map((h: any, idx: number) => ({
      h: h.hour ?? h.timestampHour ?? idx * step,
      cop: +(h.cop ?? 0).toFixed(3),
      it: +(h.itLoad_kW ?? h.it_kW ?? 0).toFixed(2),
      cool: +(h.coolingLoad_kW ?? h.chillerPower_kW ?? 0).toFixed(2),
      temp: +(h.ambientTemp_C ?? h.outdoorTempC ?? 0).toFixed(1),
      water: +(h.waterUsage_L ?? 0).toFixed(1),
    }));

  const tt = {
    contentStyle: {
      background: isDark ? "#1a1f3a" : "#fff",
      border: `1px solid ${isDark ? "#3f4a68" : "#e5e7eb"}`,
      borderRadius: 8,
      color: isDark ? "#e2e8f0" : "#1f2937",
      fontSize: 11,
    },
  };
  const ax = { fontSize: 9, fill: isDark ? "#9ca3af" : "#6b7280" };
  const grid = (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke={isDark ? "#2d3748" : "#e5e7eb"}
    />
  );
  const card = `p-4 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`;
  const title = `text-sm font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {techData.length > 0 && (
        <div className={card}>
          <div className={title}>PUE & COP by Technique</div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={techData} barGap={4}>
              {grid}
              <XAxis dataKey="name" tick={ax} />
              <YAxis tick={ax} />
              <Tooltip {...tt} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="PUE" fill="#5ce1e5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="COP" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {techData.length > 0 && (
        <div className={card}>
          <div className={title}>Carbon (tCO₂) & Water (kL) by Technique</div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={techData} layout="vertical">
              {grid}
              <XAxis type="number" tick={ax} />
              <YAxis dataKey="name" type="category" tick={ax} width={70} />
              <Tooltip {...tt} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="Carbon"
                fill="#ef4444"
                radius={[0, 3, 3, 0]}
                name="Carbon tCO₂"
              />
              <Bar
                dataKey="Water"
                fill="#3b82f6"
                radius={[0, 3, 3, 0]}
                name="Water kL"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {sampled.length > 0 && sampled.some((h: any) => h.cop > 0) && (
        <div className={card}>
          <div className={title}>COP Over Time — {best.name}</div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={sampled}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5ce1e5" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#5ce1e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              {grid}
              <XAxis dataKey="h" tick={ax} />
              <YAxis tick={ax} />
              <Tooltip {...tt} />
              <Area
                type="monotone"
                dataKey="cop"
                stroke="#5ce1e5"
                fill="url(#cg)"
                strokeWidth={1.5}
                name="COP"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {sampled.length > 0 && (
        <div className={card}>
          <div className={title}>IT Load vs Cooling Load (kW)</div>
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={sampled}>
              {grid}
              <XAxis dataKey="h" tick={ax} />
              <YAxis tick={ax} />
              <Tooltip {...tt} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="it"
                fill="#f59e0b20"
                stroke="#f59e0b"
                strokeWidth={1.5}
                name="IT Load kW"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="cool"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                name="Cooling kW"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      {yearly.length > 0 && (
        <div className={card}>
          <div className={title}>5-Year Cost & Savings</div>
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={yearly}>
              {grid}
              <XAxis
                dataKey="year"
                tickFormatter={(v: any) => `Y${v}`}
                tick={ax}
              />
              <YAxis tick={ax} />
              <Tooltip
                {...tt}
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
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      {sampled.length > 0 && sampled.some((h: any) => h.temp > 0) && (
        <div className={card}>
          <div className={title}>Ambient Temperature Profile (°C)</div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={sampled}>
              <defs>
                <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              {grid}
              <XAxis dataKey="h" tick={ax} />
              <YAxis tick={ax} />
              <Tooltip {...tt} />
              <Area
                type="monotone"
                dataKey="temp"
                stroke="#f59e0b"
                fill="url(#tg)"
                strokeWidth={1.5}
                name="Ambient °C"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {techData.length > 0 && techData.some((d: any) => d.Cost > 0) && (
        <div className={card}>
          <div className={title}>Annual Cost Distribution</div>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie
                data={techData.filter((d: any) => d.Cost > 0)}
                dataKey="Cost"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }: any) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {techData.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                {...tt}
                formatter={(v: any) =>
                  `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                }
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {sampled.length > 0 && sampled.some((h: any) => h.water > 0) && (
        <div className={card}>
          <div className={title}>Hourly Water Usage (L)</div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={sampled}>
              <defs>
                <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              {grid}
              <XAxis dataKey="h" tick={ax} />
              <YAxis tick={ax} />
              <Tooltip {...tt} />
              <Area
                type="monotone"
                dataKey="water"
                stroke="#3b82f6"
                fill="url(#wg)"
                strokeWidth={1.5}
                name="Water L"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// ─── Template cards ───────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "executive",
    label: "Executive Summary",
    icon: BarChart3,
    color: "#5ce1e5",
    desc: "High-level KPIs, financial overview, and ML recommendations for decision makers.",
  },
  {
    id: "technical",
    label: "Technical Deep Dive",
    icon: Thermometer,
    color: "#ef4444",
    desc: "Hourly performance, compliance gates, efficiency radar, and system analysis.",
  },
  {
    id: "sustainability",
    label: "Sustainability Report",
    icon: Leaf,
    color: "#10b981",
    desc: "Carbon footprint, water usage, CUE/WUE metrics, and green impact trends.",
  },
  {
    id: "comprehensive",
    label: "Comprehensive Analysis",
    icon: FileText,
    color: "#8b5cf6",
    desc: "Full report — all metrics, charts, ML comparison table, and 5-year projection.",
  },
];

// ─── Main Reporting page ──────────────────────────────────────────────────────
export const Reporting: React.FC = () => {
  const navigate = useNavigate();
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
      <main className="lg:ml-64 p-6">
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

        {/* Report Templates */}
        <div className={section}>
          <div className="mb-5">
            <h2 className={h2}>Report Templates</h2>
            <p className={`${sub} mt-0.5`}>
              Open a full-page report for any of your simulations.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEMPLATES.map(({ id, label, icon: Icon, color, desc }) => (
              <button
                key={id}
                onClick={() => navigate(`/reports/${id}`)}
                className={`group text-left p-5 rounded-xl border-2 transition-all hover:scale-[1.02] ${isDark ? "bg-[#0a0e27] border-[#3f4a68] hover:border-[#5ce1e5]/50" : "bg-gray-50 border-gray-200 hover:border-[#0ea5e9]/50"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: `${color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <ExternalLink
                    className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  />
                </div>
                <div
                  className={`font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {label}
                </div>
                <div
                  className={`text-xs leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  {desc}
                </div>
                <div className="mt-3 text-xs font-semibold" style={{ color }}>
                  Open Report →
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Visualization Gallery */}
        <div className={section}>
          <div className="mb-5">
            <h2 className={h2}>Visualization Gallery</h2>
            <p className={`${sub} mt-0.5`}>
              Live charts from your simulation data.
            </p>
          </div>
          {completed.length === 0 ? (
            <div
              className={`text-center py-10 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Run simulations to populate the gallery.
            </div>
          ) : (
            <VizGallery simulations={dbSimulations} isDark={isDark} />
          )}
        </div>
      </main>
    </div>
  );
};
