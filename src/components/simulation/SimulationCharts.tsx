import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import html2canvas from "html2canvas";
import {
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  buildInsightCacheKey,
  buildSections,
  GraphExplanation,
  toNumber,
} from "./SimulationChartsInsightPanel";

interface SimulationChartsProps {
  resultData: any;
  simulationType: string;
  isDark: boolean;
  simulationName?: string;
  simulationDescription?: string;
}

export interface SimulationChartsHandle {
  captureAllCharts: () => Promise<Record<string, string>>;
}

const GRAPH_EXPLANATION_API_URL =
  import.meta.env.VITE_GRAPH_EXPLANATION_API_URL || "http://localhost:8003/api";
const insightCache = new Map<string, Record<string, GraphExplanation>>();
const insightRequestCache = new Map<
  string,
  Promise<Record<string, GraphExplanation>>
>();

const COLORS = [
  "#5ce1e5",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
];

const cc = (isDark: boolean) =>
  `p-4 rounded-xl border ${isDark ? "bg-[#0f1428] border-[#2d3a5a] shadow-lg shadow-black/30" : "bg-white border-gray-200"}`;

const tc = (isDark: boolean) =>
  `text-sm font-bold mb-1 ${isDark ? "text-white" : "text-gray-800"}`;

const sc = (isDark: boolean) =>
  `text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-400"}`;

const tt = (isDark: boolean) => ({
  contentStyle: {
    background: isDark ? "#0d1225" : "#fff",
    border: `1px solid ${isDark ? "#3f4a68" : "#e5e7eb"}`,
    borderRadius: 10,
    color: isDark ? "#f1f5f9" : "#1f2937",
    fontSize: 12,
    fontWeight: 500,
    boxShadow: isDark
      ? "0 4px 24px rgba(0,0,0,0.6)"
      : "0 2px 8px rgba(0,0,0,0.1)",
    padding: "8px 12px",
  },
  labelStyle: {
    color: isDark ? "#5ce1e5" : "#0ea5e9",
    fontWeight: 700,
    fontSize: 11,
  },
  itemStyle: {
    color: isDark ? "#e2e8f0" : "#374151",
  },
  cursor: { fill: isDark ? "rgba(92,225,229,0.08)" : "rgba(14,165,233,0.06)" },
});

const ax = (isDark: boolean) => ({
  fontSize: 9,
  fill: isDark ? "#94a3b8" : "#6b7280",
});
const grid = (isDark: boolean) => (
  <CartesianGrid
    strokeDasharray="3 3"
    stroke={isDark ? "#1e2d4a" : "#e5e7eb"}
    opacity={isDark ? 0.8 : 1}
  />
);

function sample<T>(arr: T[], max = 200): T[] {
  if (arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  return arr.filter((_, i) => i % step === 0);
}

function fmtUSD(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function sanitizeExplanationText(text?: string): string {
  const raw = (text ?? "").trim();
  if (!raw) return "";

  const withoutFence = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonMarkers = ['{"explanation"', "{'explanation'", '{ "explanation"'];
  const markerIndex = jsonMarkers
    .map((marker) => withoutFence.indexOf(marker))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b)[0];

  const stripped =
    markerIndex !== undefined && markerIndex > 0
      ? withoutFence.slice(0, markerIndex).trim()
      : withoutFence;

  return stripped.replace(/\s+/g, " ").trim();
}

// ─── 1. IT Load + Fan + Mech Power (air economizer detail) ───────────────────
const HourlyPowerBreakdown: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((d, i) => ({
        h: d.hour ?? i,
        it: +(d.itLoad_kW ?? 0).toFixed(2),
        fan: +(d.fanPower_kW ?? 0).toFixed(2),
        mech: +(d.mechPower_kW ?? 0).toFixed(2),
        total: +(d.totalPower_kW ?? 0).toFixed(2),
      })),
    [data],
  );

  return (
    <div className={cc(isDark)} data-chart="performance-radar">
      <p className={tc(isDark)}>Hourly Power Breakdown (kW)</p>
      <p className={sc(isDark)}>
        IT Load · Fan Power · Mechanical Cooling · Total — from
        EconomizerController hourlyResults[i].itLoad_kW / fanPower_kW /
        mechPower_kW
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <AreaChart data={s}>
          <defs>
            {[
              ["itG", "#5ce1e5"],
              ["fanG", "#10b981"],
              ["mechG", "#f59e0b"],
              ["totG", "#ef4444"],
            ].map(([id, c]) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c} stopOpacity={0.35} />
                <stop offset="95%" stopColor={c} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {grid(isDark)}
          <XAxis
            dataKey="h"
            tick={ax(isDark)}
            label={{
              value: "Hour",
              position: "insideBottom",
              offset: -2,
              fontSize: 9,
            }}
          />
          <YAxis tick={ax(isDark)} />
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any, n: any) => [`${v} kW`, n]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area
            type="monotone"
            dataKey="it"
            stroke="#5ce1e5"
            fill="url(#itG)"
            strokeWidth={1.5}
            name="IT Load kW"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="fan"
            stroke="#10b981"
            fill="url(#fanG)"
            strokeWidth={1}
            name="Fan Power kW"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="mech"
            stroke="#f59e0b"
            fill="url(#mechG)"
            strokeWidth={1}
            name="Mech Cool kW"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#ef4444"
            strokeWidth={1.5}
            name="Total kW"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 2. Airflow & Violations ──────────────────────────────────────────────────
const AirflowChart: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((d, i) => ({
        h: d.hour ?? i,
        required: +(d.requiredAirflow_CFM ?? 0).toFixed(0),
        free: +(d.q_free_kW ?? 0).toFixed(2),
        mech: +(d.mech_load_kW ?? 0).toFixed(2),
        violation: d.airflowViolation ? 1 : 0,
      })),
    [data],
  );

  const hasAirflow = s.some((d) => d.required > 0);
  if (!hasAirflow) return null;

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Airflow & Free Cooling vs Mechanical (kW)</p>
      <p className={sc(isDark)}>
        requiredAirflow_CFM · q_free_kW (free cooling) · mech_load_kW —
        EconomizerController only
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={s}>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis yAxisId="l" tick={ax(isDark)} />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} />
          <Tooltip {...tt(isDark)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar
            yAxisId="r"
            dataKey="violation"
            fill="#ef444440"
            name="Violation"
            radius={[0, 0, 0, 0]}
          />
          <Area
            yAxisId="l"
            type="monotone"
            dataKey="free"
            stroke="#10b981"
            fill="#10b98120"
            strokeWidth={1.5}
            name="Free Cool kW"
            dot={false}
          />
          <Line
            yAxisId="l"
            type="monotone"
            dataKey="mech"
            stroke="#f59e0b"
            strokeWidth={1.5}
            name="Mech Load kW"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 3. PUE & CUE over time ───────────────────────────────────────────────────
const PueCueChart: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((d, i) => ({
        h: d.hour ?? i,
        pue: +(d.pue ?? 0).toFixed(3),
        cue: +(d.cue ?? 0).toFixed(4),
      })),
    [data],
  );

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly PUE & CUE</p>
      <p className={sc(isDark)}>
        Power Usage Effectiveness · Carbon Usage Effectiveness —
        hourlyResults[i].pue / cue
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={s}>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis yAxisId="l" tick={ax(isDark)} domain={[1, "auto"]} />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} />
          <Tooltip {...tt(isDark)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <ReferenceLine
            yAxisId="l"
            y={1.5}
            stroke="#ef4444"
            strokeDasharray="4 2"
            label={{ value: "PUE 1.5 target", fontSize: 9, fill: "#ef4444" }}
          />
          <Line
            yAxisId="l"
            type="monotone"
            dataKey="pue"
            stroke="#5ce1e5"
            strokeWidth={1.5}
            name="PUE"
            dot={false}
          />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="cue"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            name="CUE"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 4. Ambient temperature ───────────────────────────────────────────────────
const TempChart: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((d, i) => ({
        h: d.hour ?? i,
        temp: +(d.outdoorTempC ?? d.ambientTemp_C ?? d.tempC ?? 0).toFixed(1),
        rh: +(d.outdoorRH ?? d.rh ?? 0).toFixed(0),
      })),
    [data],
  );

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Ambient Temperature & Humidity</p>
      <p className={sc(isDark)}>
        hourlyResults[i].outdoorTempC · outdoorRH — weather conditions driving
        economizer decisions
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={s}>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis yAxisId="l" tick={ax(isDark)} unit="°C" />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} unit="%" />
          <Tooltip {...tt(isDark)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area
            yAxisId="l"
            type="monotone"
            dataKey="temp"
            stroke="#f59e0b"
            fill="#f59e0b20"
            strokeWidth={1.5}
            name="Temp °C"
            dot={false}
          />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="rh"
            stroke="#3b82f6"
            strokeWidth={1}
            name="RH %"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 5. Cooling mode breakdown (pie) ─────────────────────────────────────────
const ModePieChart: React.FC<{
  modeBreakdown: Record<string, number>;
  isDark: boolean;
}> = ({ modeBreakdown, isDark }) => {
  const data = Object.entries(modeBreakdown).map(([mode, hours]) => ({
    name: mode,
    value: hours,
  }));
  if (data.length === 0) return null;

  const modeColors: Record<string, string> = {
    FULL_ECON: "#10b981",
    PARTIAL_TRIM: "#f59e0b",
    MECHANICAL_ONLY: "#ef4444",
    MECH_ONLY: "#ef4444",
    UNKNOWN: "#6b7280",
  };

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Cooling Mode Distribution</p>
      <p className={sc(isDark)}>
        Hours in each mode — FULL_ECON (free cooling) · PARTIAL_TRIM ·
        MECHANICAL_ONLY — from hourlyResults[i].mode
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <PieChart margin={{ top: 30, right: 70, bottom: 50, left: 70 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent, value }) =>
              `${name.replace(/_/g, " ")} — ${value.toLocaleString()} hrs (${(percent * 100).toFixed(0)}%)`
            }
            labelLine={{
              stroke: isDark ? "#5ce1e5" : "#0ea5e9",
              strokeWidth: 1,
            }}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={modeColors[d.name] ?? COLORS[i % COLORS.length]}
                stroke={isDark ? "#0f1428" : "#fff"}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any, name: any) => [
              `${Number(v).toLocaleString()} hrs`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{
              fontSize: 11,
              color: isDark ? "#e2e8f0" : "#374151",
              paddingTop: 8,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 6. Advanced cost breakdown (stacked bar) ─────────────────────────────────
const CostBreakdownChart: React.FC<{
  resultData: any;
  isDark: boolean;
  isChilled?: boolean;
}> = ({ resultData, isDark, isChilled = false }) => {
  const s = resultData?.summary ?? {};
  const econ = resultData?.results?.economics ?? {};
  const annual = resultData?.results?.annual ?? {};

  const electricity = isChilled
    ? +(annual.cost_USD ?? econ.opex_annual_USD ?? 0).toFixed(0)
    : +(s.electricityCostUSD ?? s.estimatedOpExUSD ?? 0).toFixed(0);
  const carbonTax = isChilled ? 0 : +(s.carbonTaxCostUSD ?? 0).toFixed(0);
  const capex = +(s.totalCapexUSD ?? econ.capex_USD ?? 0).toFixed(0);
  const lccp = +(econ.lccp_USD ?? 0).toFixed(0);
  const npvAbs = Math.abs(+(econ.npv_USD ?? 0));

  const data = [
    {
      name: "Annual Costs",
      electricity,
      carbonTax,
      capex,
      lccp,
      npvAbs,
    },
  ];

  const hasData =
    data[0].electricity > 0 ||
    data[0].carbonTax > 0 ||
    data[0].capex > 0 ||
    data[0].lccp > 0 ||
    data[0].npvAbs > 0;
  if (!hasData) return null;

  const totalOpEx = data[0].electricity + data[0].carbonTax;
  const savings = +(s.annualSavingsUSD ?? 0).toFixed(0);

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Full Cost Structure</p>
      <p className={sc(isDark)}>
        {isChilled
          ? `OPEX: $${data[0].electricity.toLocaleString()} · CAPEX: $${data[0].capex.toLocaleString()} · LCCP: $${data[0].lccp.toLocaleString()} · NPV: $${(econ.npv_USD ?? 0).toLocaleString()}`
          : `Electricity: $${data[0].electricity.toLocaleString()} · Carbon Tax: $${data[0].carbonTax.toLocaleString()} · CAPEX: $${data[0].capex.toLocaleString()} · Annual Savings: $${savings.toLocaleString()}`}
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {[
          isChilled
            ? { label: "OPEX", value: data[0].electricity, color: "#ef4444" }
            : {
                label: "Electricity Cost",
                value: data[0].electricity,
                color: "#ef4444",
              },
          isChilled
            ? { label: "LCCP", value: data[0].lccp, color: "#10b981" }
            : {
                label: "Carbon Tax",
                value: data[0].carbonTax,
                color: "#f59e0b",
              },
          { label: "Total OpEx", value: totalOpEx, color: "#8b5cf6" },
          { label: "CAPEX", value: data[0].capex, color: "#3b82f6" },
          isChilled
            ? { label: "NPV", value: econ.npv_USD ?? 0, color: "#ec4899" }
            : { label: "Annual Savings", value: savings, color: "#10b981" },
          {
            label: "Payback",
            value:
              (isChilled ? econ.paybackPeriod_years : s.paybackPeriodYears) ??
              999,
            color: "#5ce1e5",
            unit: " yrs",
          },
        ].map(({ label, value, color, unit }) => (
          <div
            key={label}
            className={`p-2 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
          >
            <div className="text-xs mb-0.5" style={{ color }}>
              {label}
            </div>
            <div
              className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {unit
                ? `${typeof value === "number" ? value.toFixed(2) : value}${unit}`
                : `${fmtUSD(Math.abs(Number(value)))}${label === "NPV" && Number(value) < 0 ? " (neg)" : ""}`}
            </div>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} layout="vertical">
          {grid(isDark)}
          <XAxis type="number" tick={ax(isDark)} tickFormatter={fmtUSD} />
          <YAxis dataKey="name" type="category" tick={ax(isDark)} width={80} />
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any) => [fmtUSD(Number(v)), ""]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar
            dataKey="electricity"
            stackId="a"
            fill="#ef4444"
            name="Electricity"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="carbonTax"
            stackId="a"
            fill="#f59e0b"
            name="Carbon Tax"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="capex"
            stackId="a"
            fill="#3b82f6"
            name="CAPEX"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="lccp"
            stackId="a"
            fill="#10b981"
            name="LCCP"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="npvAbs"
            stackId="a"
            fill="#ec4899"
            name="|NPV|"
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 7. 5-Year projection — full detail ──────────────────────────────────────
const ProjectionDetailChart: React.FC<{
  data: any[];
  proj: any;
  isDark: boolean;
}> = ({ data, proj, isDark }) => {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    year: `Y${d.year}`,
    energyCost: +(d.energyCostUSD ?? 0).toFixed(0),
    carbonTax: +(d.carbonTaxUSD ?? 0).toFixed(0),
    totalCost: +(d.totalCostUSD ?? 0).toFixed(0),
    savings: +(d.costSavingsUSD ?? 0).toFixed(0),
    cumSavings: +(d.cumulativeSavings ?? 0).toFixed(0),
    energyKWh: +(d.energyKWh ?? 0).toFixed(0),
    energySavKWh: +(d.energySavingsKWh ?? 0).toFixed(0),
    emissionsTons: +(d.emissionsTonsCO2 ?? 0).toFixed(1),
    emissionsSav: +(d.emissionsSavingsTonsCO2 ?? 0).toFixed(1),
  }));

  return (
    <div className={`${cc(isDark)} lg:col-span-2`}>
      <p className={tc(isDark)}>5-Year Financial & Environmental Projection</p>
      <p className={sc(isDark)}>
        NPV: {fmtUSD(proj?.npvSavings ?? 0)} · Total Savings:{" "}
        {fmtUSD(proj?.totalSavings ?? 0)} · Total Cost:{" "}
        {fmtUSD(proj?.totalCost ?? 0)} · Total Emissions:{" "}
        {(proj?.totalEmissions ?? 0).toFixed(1)} tCO₂
        {
          " — from projection.yearlyData[i].energyCostUSD / carbonTaxUSD / costSavingsUSD / emissionsTonsCO2"
        }
      </p>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          {
            label: "NPV Savings",
            value: fmtUSD(proj?.npvSavings ?? 0),
            color: "#10b981",
          },
          {
            label: "Total Savings",
            value: fmtUSD(proj?.totalSavings ?? 0),
            color: "#5ce1e5",
          },
          {
            label: "Total Cost",
            value: fmtUSD(proj?.totalCost ?? 0),
            color: "#ef4444",
          },
          {
            label: "Total Emissions",
            value: `${(proj?.totalEmissions ?? 0).toFixed(1)} tCO₂`,
            color: "#f59e0b",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className={`p-2 rounded-lg text-center ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
          >
            <div className="text-xs mb-0.5" style={{ color }}>
              {label}
            </div>
            <div
              className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Cost + Savings stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p
            className={`text-xs font-semibold mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Cost Components per Year
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              {grid(isDark)}
              <XAxis dataKey="year" tick={ax(isDark)} />
              <YAxis tick={ax(isDark)} tickFormatter={fmtUSD} />
              <Tooltip
                {...tt(isDark)}
                formatter={(v: any) => [fmtUSD(Number(v)), ""]}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar
                dataKey="energyCost"
                stackId="a"
                fill="#ef4444"
                name="Energy Cost"
              />
              <Bar
                dataKey="carbonTax"
                stackId="a"
                fill="#f59e0b"
                name="Carbon Tax"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p
            className={`text-xs font-semibold mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Savings & Cumulative Savings
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={chartData}>
              {grid(isDark)}
              <XAxis dataKey="year" tick={ax(isDark)} />
              <YAxis tick={ax(isDark)} tickFormatter={fmtUSD} />
              <Tooltip
                {...tt(isDark)}
                formatter={(v: any) => [fmtUSD(Number(v)), ""]}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar
                dataKey="savings"
                fill="#10b981"
                name="Annual Savings"
                radius={[3, 3, 0, 0]}
              />
              <Line
                dataKey="cumSavings"
                stroke="#5ce1e5"
                strokeWidth={2}
                name="Cumul. Savings"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p
            className={`text-xs font-semibold mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Energy (kWh) vs Savings (kWh)
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              {grid(isDark)}
              <XAxis dataKey="year" tick={ax(isDark)} />
              <YAxis tick={ax(isDark)} />
              <Tooltip {...tt(isDark)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar
                dataKey="energyKWh"
                fill="#8b5cf6"
                name="Energy kWh"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="energySavKWh"
                fill="#10b981"
                name="Saved kWh"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p
            className={`text-xs font-semibold mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Emissions (tCO₂) vs Savings
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={chartData}>
              {grid(isDark)}
              <XAxis dataKey="year" tick={ax(isDark)} />
              <YAxis tick={ax(isDark)} />
              <Tooltip {...tt(isDark)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar
                dataKey="emissionsTons"
                fill="#ef4444"
                name="Emissions tCO₂"
                radius={[3, 3, 0, 0]}
              />
              <Line
                dataKey="emissionsSav"
                stroke="#10b981"
                strokeWidth={2}
                name="Saved tCO₂"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ─── 8. KPI Radar ─────────────────────────────────────────────────────────────
const KpiRadar: React.FC<{ resultData: any; isDark: boolean }> = ({
  resultData,
  isDark,
}) => {
  const m = resultData?.results?.metrics ?? {};
  const s = resultData?.summary ?? {};

  const annual = resultData?.results?.annual ?? {};
  const economics = resultData?.results?.economics ?? {};

  const toScore = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(10, safe));
  };

  const pue = Number(m.pue ?? s.averagePUE ?? 1.5);
  const cue = Number(m.cue ?? s.averageCUE ?? 0.5);
  const energySavingsPercent = Number(
    s.energySavingsPercent ?? m.energySavingsPercent ?? 0,
  );
  const annualSavingsUSD = Number(
    s.annualSavingsUSD ??
      m.annualSavingsUSD ??
      economics.annualSavings_USD ??
      economics.savings_USD ??
      0,
  );
  const carbonSavingsKg = Number(
    s.carbonSavings_kg ?? m.carbonSavings_kg ?? annual.carbonSavings_kg ?? 0,
  );

  const data = [
    {
      metric: "PUE Eff",
      value: toScore(10 - (pue - 1) * 5),
    },
    {
      metric: "CUE Eff",
      value: toScore(10 - cue * 10),
    },
    {
      metric: "Energy Sav",
      value: toScore(energySavingsPercent / 5),
    },
    {
      metric: "Cost Sav",
      value: toScore(annualSavingsUSD / 20000),
    },
    {
      metric: "Carbon Sav",
      value: toScore(carbonSavingsKg / 10000),
    },
  ];

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Performance Radar</p>
      <p className={sc(isDark)}>
        Normalised scores (0–10) across efficiency, savings, and carbon metrics
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <RadarChart data={data}>
          <PolarGrid stroke={isDark ? "#2d3748" : "#e5e7eb"} />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fontSize: 10, fill: isDark ? "#9ca3af" : "#6b7280" }}
          />
          <PolarRadiusAxis
            domain={[0, 10]}
            tick={{ fontSize: 8, fill: isDark ? "#9ca3af" : "#6b7280" }}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke="#5ce1e5"
            fill="#5ce1e5"
            fillOpacity={0.35}
          />
          <Tooltip {...tt(isDark)} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 10. Rack analysis ────────────────────────────────────────────────────────
const RackChart: React.FC<{ rackAnalysis: any; isDark: boolean }> = ({
  rackAnalysis,
  isDark,
}) => {
  if (!rackAnalysis) return null;
  const data = [
    {
      name: "Avg Rack Load",
      value: +(rackAnalysis.averageRackLoadKW ?? 0).toFixed(2),
      fill: "#5ce1e5",
    },
    {
      name: "Max Rack Load",
      value: +(rackAnalysis.maxRackLoadKW ?? 0).toFixed(2),
      fill: "#ef4444",
    },
    {
      name: "Hotspot Racks",
      value: rackAnalysis.hotspotRacks ?? 0,
      fill: "#f59e0b",
    },
    {
      name: "Total Racks",
      value: rackAnalysis.totalRacks ?? 0,
      fill: "#8b5cf6",
    },
  ];

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Rack Analysis (CloudSim)</p>
      <p className={sc(isDark)}>
        rackAnalysis.averageRackLoadKW · maxRackLoadKW · hotspotRacks — from
        CloudSim rack aggregation
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={data}>
          {grid(isDark)}
          <XAxis dataKey="name" tick={ax(isDark)} />
          <YAxis tick={ax(isDark)} />
          <Tooltip {...tt(isDark)} />
          {data.map((d, i) => (
            <Bar
              key={i}
              dataKey="value"
              fill={d.fill}
              name={d.name}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Chilled Water: Annual metrics pie (energy/water/cost/carbon) ─────────────
const ChilledAnnualPie: React.FC<{ resultData: any; isDark: boolean }> = ({
  resultData,
  isDark,
}) => {
  const annual = resultData?.results?.annual ?? {};
  const metrics = resultData?.results?.metrics ?? {};

  // Normalise to comparable scale (% of max) for pie
  const raw = [
    {
      name: "Energy (kWh)",
      value: +(annual.energyConsumption_kWh ?? 0).toFixed(0),
      color: "#5ce1e5",
      unit: "kWh",
    },
    {
      name: "Cooling Load (kWh)",
      value: +(annual.coolingLoad_kWh ?? 0).toFixed(0),
      color: "#8b5cf6",
      unit: "kWh",
    },
    {
      name: "Water (L)",
      value: +(annual.waterUsage_L ?? 0).toFixed(0),
      color: "#3b82f6",
      unit: "L",
    },
    {
      name: "Carbon (kg)",
      value: +(annual.carbonEmissions_kg ?? 0).toFixed(0),
      color: "#ef4444",
      unit: "kg",
    },
    {
      name: "Cost (USD)",
      value: +(annual.cost_USD ?? 0).toFixed(0),
      color: "#10b981",
      unit: "USD",
    },
  ].filter((d) => d.value > 0);

  const kpis = [
    {
      label: "Energy",
      value: `${(annual.energyConsumption_kWh / 1000).toFixed(1)}k kWh`,
      color: "#5ce1e5",
    },
    {
      label: "Cooling Load",
      value: `${(annual.coolingLoad_kWh / 1000).toFixed(1)}k kWh`,
      color: "#8b5cf6",
    },
    {
      label: "Water",
      value: `${(annual.waterUsage_L / 1000).toFixed(1)}k L`,
      color: "#3b82f6",
    },
    {
      label: "Carbon",
      value: `${(annual.carbonEmissions_kg / 1000).toFixed(1)}k kg`,
      color: "#ef4444",
    },
    {
      label: "Cost (USD)",
      value: `$${(annual.cost_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      color: "#10b981",
    },
    {
      label: "Avg COP",
      value: (metrics.averageCOP ?? 0).toFixed(3),
      color: "#f59e0b",
    },
    { label: "PUE", value: (metrics.pue ?? 0).toFixed(4), color: "#5ce1e5" },
    {
      label: "WUE",
      value: `${(metrics.wue ?? 0).toFixed(3)} L/kWh`,
      color: "#3b82f6",
    },
  ];

  return (
    <div className={`${cc(isDark)} lg:col-span-2`}>
      <p className={tc(isDark)}>Annual Consumption Overview</p>
      <p className={sc(isDark)}>
        results.annual.* — energyConsumption_kWh · coolingLoad_kWh ·
        waterUsage_L · carbonEmissions_kg · cost_USD
      </p>
      <div className="grid grid-cols-2 gap-4">
        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-2 content-start">
          {kpis.map(({ label, value, color }) => (
            <div
              key={label}
              className={`p-2 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
            >
              <div className="text-xs mb-0.5" style={{ color }}>
                {label}
              </div>
              <div
                className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
        {/* Pie chart — proportional comparison */}
        <div>
          <p
            className={`text-xs mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
          >
            Proportional comparison (values normalised to % of total)
          </p>
          <ResponsiveContainer width="100%" height={380}>
            <PieChart margin={{ top: 20, right: 50, bottom: 40, left: 50 }}>
              <Pie
                data={raw}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={95}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={{ strokeWidth: 1 }}
              >
                {raw.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                {...tt(isDark)}
                formatter={(v: any, name: any, props: any) => [
                  `${Number(v).toLocaleString()} ${props.payload?.unit ?? ""}`,
                  name,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ─── Chilled Water: Hourly cooling load vs peak cooling load ──────────────────
const ChilledCoolingLoadChart: React.FC<{
  data: any[];
  peakCoolingLoad: number;
  isDark: boolean;
}> = ({ data, peakCoolingLoad, isDark }) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((h: any, i: number) => ({
        h: h.hour ?? i,
        cooling: +(h.coolingLoad_kW ?? 0).toFixed(3),
        chiller: +(h.chillerPower_kW ?? 0).toFixed(3),
        cost: +(h.cost_USD ?? 0).toFixed(4),
      })),
    [data],
  );

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly Cooling Load vs Chiller Power (kW)</p>
      <p className={sc(isDark)}>
        hourlyResults[i].coolingLoad_kW · chillerPower_kW — peak:{" "}
        {peakCoolingLoad.toFixed(3)} kW (results.metrics.peakCoolingLoad_kW)
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={s}>
          <defs>
            <linearGradient id="clGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid(isDark)}
          <XAxis
            dataKey="h"
            tick={ax(isDark)}
            label={{
              value: "Hour",
              position: "insideBottom",
              offset: -2,
              fontSize: 9,
            }}
          />
          <YAxis yAxisId="l" tick={ax(isDark)} unit=" kW" />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} unit=" $" />
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any, n: any) => [Number(v).toFixed(3), n]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {peakCoolingLoad > 0 && (
            <ReferenceLine
              yAxisId="l"
              y={peakCoolingLoad}
              stroke="#ef4444"
              strokeDasharray="4 2"
              label={{
                value: `Peak ${peakCoolingLoad.toFixed(2)} kW`,
                fontSize: 9,
                fill: "#ef4444",
              }}
            />
          )}
          <Area
            yAxisId="l"
            type="monotone"
            dataKey="cooling"
            stroke="#8b5cf6"
            fill="url(#clGrad)"
            strokeWidth={1.5}
            name="Cooling Load kW"
            dot={false}
          />
          <Line
            yAxisId="l"
            type="monotone"
            dataKey="chiller"
            stroke="#5ce1e5"
            strokeWidth={1}
            name="Chiller Power kW"
            dot={false}
          />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="cost"
            stroke="#10b981"
            strokeWidth={1}
            name="Cost USD/hr"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const ChilledCopChart: React.FC<{ copArray: number[]; isDark: boolean }> = ({
  copArray,
  isDark,
}) => {
  const s = useMemo(() => {
    const step = Math.max(1, Math.ceil(copArray.length / 200));
    return copArray
      .filter((_, i) => i % step === 0)
      .map((v, i) => ({ h: i * step, cop: +v.toFixed(4) }));
  }, [copArray]);

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>COP Over Time (8760 h sampled)</p>
      <p className={sc(isDark)}>
        results.hourlyResults[i].cop — Coefficient of Performance per hour
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <AreaChart data={s}>
          <defs>
            <linearGradient id="copCW" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5ce1e5" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#5ce1e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis tick={ax(isDark)} domain={["auto", "auto"]} />
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any) => [Number(v).toFixed(4), "COP"]}
          />
          <Area
            type="monotone"
            dataKey="cop"
            stroke="#5ce1e5"
            fill="url(#copCW)"
            strokeWidth={1.5}
            dot={false}
            name="COP"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Chilled Water: IT Load + Chiller Power ───────────────────────────────────
const ChilledHourlyPower: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((h: any, i: number) => ({
        h: h.hour ?? i,
        it: +(h.itLoad_kW ?? 0).toFixed(2),
        chiller: +(h.chillerPower_kW ?? 0).toFixed(2),
        cooling: +(h.coolingLoad_kW ?? 0).toFixed(2),
        total: +((h.itLoad_kW ?? 0) + (h.chillerPower_kW ?? 0)).toFixed(2),
      })),
    [data],
  );

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly IT Load vs Chiller Power (kW)</p>
      <p className={sc(isDark)}>
        hourlyResults[i].itLoad_kW · chillerPower_kW · coolingLoad_kW — direct
        from CoolSim
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={s}>
          <defs>
            <linearGradient id="itCW" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5ce1e5" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#5ce1e5" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="chCW" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis tick={ax(isDark)} />
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any, n: any) => [`${v} kW`, n]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area
            type="monotone"
            dataKey="it"
            stroke="#5ce1e5"
            fill="url(#itCW)"
            strokeWidth={1.5}
            name="IT Load kW"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="chiller"
            stroke="#8b5cf6"
            fill="url(#chCW)"
            strokeWidth={1.5}
            name="Chiller Power kW"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="cooling"
            stroke="#f59e0b"
            strokeWidth={1}
            name="Cooling Load kW"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Chilled Water: Water usage over time ─────────────────────────────────────
const ChilledWaterUsage: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((h: any, i: number) => ({
        h: h.hour ?? i,
        water: +(h.waterUsage_L ?? 0).toFixed(2),
        carbon: +(h.carbonEmissions_kg ?? 0).toFixed(3),
      })),
    [data],
  );
  if (!s.some((h) => h.water > 0)) return null;

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly Water Usage & Carbon Emissions</p>
      <p className={sc(isDark)}>
        hourlyResults[i].waterUsage_L · carbonEmissions_kg — from CoolSim
        chilled water API
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={s}>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis yAxisId="l" tick={ax(isDark)} unit="L" />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} unit="kg" />
          <Tooltip {...tt(isDark)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area
            yAxisId="l"
            type="monotone"
            dataKey="water"
            stroke="#3b82f6"
            fill="#3b82f620"
            strokeWidth={1.5}
            name="Water L"
            dot={false}
          />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="carbon"
            stroke="#ef4444"
            strokeWidth={1}
            name="Carbon kg"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Chilled Water: Full cost structure (OpEx, CAPEX, LCCP, NPV) ──────────────
const ChilledCostChart: React.FC<{ resultData: any; isDark: boolean }> = ({
  resultData,
  isDark,
}) => {
  const econ = resultData?.economics ?? resultData?.results?.economics ?? {};
  const annual = resultData?.results?.annual ?? {};

  const barData = [
    {
      name: "Annual OpEx",
      value: +(econ.opex_annual_USD ?? annual.cost_USD ?? 0).toFixed(0),
      fill: "#ef4444",
    },
    {
      name: "CAPEX",
      value: +(econ.capex_USD ?? 0).toFixed(0),
      fill: "#f59e0b",
    },
    { name: "LCCP", value: +(econ.lccp_USD ?? 0).toFixed(0), fill: "#8b5cf6" },
    {
      name: "NPV (abs)",
      value: +Math.abs(econ.npv_USD ?? 0).toFixed(0),
      fill: "#3b82f6",
    },
  ].filter((d) => d.value > 0);

  const kpis = [
    {
      label: "Annual Cost (USD)",
      value: `$${(annual.cost_USD ?? econ.opex_annual_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      color: "#10b981",
      tip: "results.annual.cost_USD — direct from CoolSim API",
    },
    {
      label: "Annual OpEx",
      value: fmtUSD(econ.opex_annual_USD ?? annual.cost_USD),
      color: "#ef4444",
      tip: "results.economics.opex_annual_USD",
    },
    {
      label: "CAPEX",
      value: fmtUSD(econ.capex_USD),
      color: "#f59e0b",
      tip: "results.economics.capex_USD",
    },
    {
      label: "LCCP",
      value: fmtUSD(econ.lccp_USD),
      color: "#8b5cf6",
      tip: "Life Cycle Cost of Plant — results.economics.lccp_USD",
    },
    {
      label: "NPV",
      value: fmtUSD(econ.npv_USD),
      color: econ.npv_USD >= 0 ? "#10b981" : "#ef4444",
      tip: "Net Present Value — results.economics.npv_USD",
    },
    {
      label: "Payback",
      value: `${(econ.paybackPeriod_years ?? 0).toFixed(1)} yrs`,
      color: "#5ce1e5",
      tip: "results.economics.paybackPeriod_years",
    },
  ];

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Chilled Water Cost Structure</p>
      <p className={sc(isDark)}>
        All values from results.economics.* — direct CoolSim API output
      </p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {kpis.map(({ label, value, color, tip }) => (
          <div
            key={label}
            className={`p-2 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
            title={tip}
          >
            <div className="text-xs mb-0.5" style={{ color }}>
              {label}
            </div>
            <div
              className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={barData} layout="vertical">
          {grid(isDark)}
          <XAxis type="number" tick={ax(isDark)} tickFormatter={fmtUSD} />
          <YAxis dataKey="name" type="category" tick={ax(isDark)} width={80} />
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any) => [fmtUSD(Number(v)), ""]}
          />
          {barData.map((d, i) => (
            <Bar key={i} dataKey="value" fill={d.fill} radius={[0, 3, 3, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Chilled Water: Phase 4 gates visual ─────────────────────────────────────
const ChilledGatesChart: React.FC<{ gates: any; isDark: boolean }> = ({
  gates,
  isDark,
}) => {
  if (!gates || Object.keys(gates).length === 0) return null;
  const gateColors: Record<string, string> = {
    PASS: "#10b981",
    FAIL: "#ef4444",
  };
  const data = Object.entries(gates).map(([key, val]) => ({
    name: key.replace(/([A-Z])/g, " $1").trim(),
    status: String(val),
    value: String(val) === "PASS" ? 1 : 0,
    fill: gateColors[String(val)] ?? "#6b7280",
  }));

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Phase 4 Compliance Gates</p>
      <p className={sc(isDark)}>
        results.phase4Gates.* — PASS/FAIL compliance checks from CoolSim
      </p>
      <div className="grid grid-cols-2 gap-3 mt-2">
        {data.map(({ name, status, fill }) => (
          <div
            key={name}
            className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}
          >
            <div
              className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {name}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold`}
              style={{ background: `${fill}20`, color: fill }}
            >
              {status === "PASS" ? "✓ PASS" : "✗ FAIL"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Evaporative: Cooling capacity vs IT load + water evaporation per hour ────
const EvapCoolingCapChart: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((h: any, i: number) => ({
        h: h.hour ?? i,
        itLoad: +(h.itLoadKW ?? 0).toFixed(2),
        cooling: +(h.coolingCapacityKW ?? 0).toFixed(2),
        water: +(h.waterEvaporationLph ?? 0).toFixed(3),
        deficit: +((h.itLoadKW ?? 0) - (h.coolingCapacityKW ?? 0)).toFixed(2),
      })),
    [data],
  );

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Cooling Capacity vs IT Load per Hour (kW)</p>
      <p className={sc(isDark)}>
        hourly_data[i].coolingCapacityKW · itLoadKW · waterEvaporationLph —
        positive deficit = insufficient cooling
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={s}>
          <defs>
            <linearGradient id="evapCoolG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid(isDark)}
          <XAxis
            dataKey="h"
            tick={ax(isDark)}
            label={{
              value: "Hour",
              position: "insideBottom",
              offset: -2,
              fontSize: 9,
            }}
          />
          <YAxis yAxisId="l" tick={ax(isDark)} unit=" kW" />
          <YAxis
            yAxisId="r"
            orientation="right"
            tick={ax(isDark)}
            unit=" L/h"
          />
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any, n: any) => [Number(v).toFixed(3), n]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <ReferenceLine
            yAxisId="l"
            y={0}
            stroke="#6b7280"
            strokeDasharray="2 2"
          />
          <Area
            yAxisId="l"
            type="monotone"
            dataKey="cooling"
            stroke="#10b981"
            fill="url(#evapCoolG)"
            strokeWidth={1.5}
            name="Cooling Cap kW"
            dot={false}
          />
          <Line
            yAxisId="l"
            type="monotone"
            dataKey="itLoad"
            stroke="#5ce1e5"
            strokeWidth={1.5}
            name="IT Load kW"
            dot={false}
          />
          <Bar
            yAxisId="l"
            dataKey="deficit"
            fill="#ef444440"
            name="Deficit kW"
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="water"
            stroke="#3b82f6"
            strokeWidth={1}
            name="Water Evap L/h"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Supply vs inlet temp + humidity per hour ────────────────────
const EvapSupplyHumidChart: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((h: any, i: number) => ({
        h: h.hour ?? i,
        supplyTemp: +(h.supplyTempC ?? 0).toFixed(1),
        supplyHumid: +(h.supplyHumidity ?? 0).toFixed(0),
        ambientHumid: +(h.ambientHumidity ?? 0).toFixed(0),
        inletTemp: +(h.inletTempC ?? 0).toFixed(1),
      })),
    [data],
  );

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Supply Air Conditions per Hour</p>
      <p className={sc(isDark)}>
        hourly_data[i].supplyTempC · supplyHumidity · ambientHumidity ·
        inletTempC
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={s}>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis yAxisId="l" tick={ax(isDark)} unit="°C" />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} unit="%" />
          <Tooltip {...tt(isDark)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line
            yAxisId="l"
            type="monotone"
            dataKey="supplyTemp"
            stroke="#10b981"
            strokeWidth={1.5}
            name="Supply Temp °C"
            dot={false}
          />
          <Line
            yAxisId="l"
            type="monotone"
            dataKey="inletTemp"
            stroke="#ef4444"
            strokeWidth={1}
            name="Inlet Temp °C"
            dot={false}
          />
          <Area
            yAxisId="r"
            type="monotone"
            dataKey="supplyHumid"
            stroke="#3b82f6"
            fill="#3b82f620"
            strokeWidth={1}
            name="Supply Humidity %"
            dot={false}
          />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="ambientHumid"
            stroke="#8b5cf6"
            strokeWidth={1}
            name="Ambient Humidity %"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Hourly PUE vs avg PUE and max PUE ──────────────────────────
const EvapPueCompareChart: React.FC<{
  data: any[];
  resultData: any;
  isDark: boolean;
}> = ({ data, resultData, isDark }) => {
  const raw = resultData?.rawEvaporativeData?.results?.performance ?? {};
  const pueAvg = +(raw.pue_average ?? resultData?.pue ?? 0).toFixed(4);
  const pueMax = +(raw.pue_max ?? resultData?.pue_max ?? 0).toFixed(4);

  const s = useMemo(
    () =>
      sample(data, 200).map((h: any, i: number) => ({
        h: h.hour ?? i,
        pue: +(h.pue ?? 0).toFixed(4),
      })),
    [data],
  );

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly PUE vs Annual Average & Max</p>
      <p className={sc(isDark)}>
        hourly_data[i].pue vs results.performance.pue_average ({pueAvg}) and
        pue_max ({pueMax})
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={s}>
          <defs>
            <linearGradient id="evapPueCmpG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5ce1e5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#5ce1e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid(isDark)}
          <XAxis
            dataKey="h"
            tick={ax(isDark)}
            label={{
              value: "Hour",
              position: "insideBottom",
              offset: -2,
              fontSize: 9,
            }}
          />
          <YAxis tick={ax(isDark)} domain={[1, "auto"]} />
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any) => [Number(v).toFixed(4), "PUE"]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {pueAvg > 0 && (
            <ReferenceLine
              y={pueAvg}
              stroke="#10b981"
              strokeDasharray="4 2"
              label={{ value: `Avg ${pueAvg}`, fontSize: 9, fill: "#10b981" }}
            />
          )}
          {pueMax > 0 && (
            <ReferenceLine
              y={pueMax}
              stroke="#ef4444"
              strokeDasharray="4 2"
              label={{ value: `Max ${pueMax}`, fontSize: 9, fill: "#ef4444" }}
            />
          )}
          <Area
            type="monotone"
            dataKey="pue"
            stroke="#5ce1e5"
            fill="url(#evapPueCmpG)"
            strokeWidth={1.5}
            name="Hourly PUE"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Power breakdown per hour ───────────────────────────────────
const EvapHourlyPower: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((h: any, i: number) => ({
        h: h.hour ?? i,
        it: +(h.itLoadKW ?? 0).toFixed(2),
        fan: +(h.fanPowerKW ?? 0).toFixed(3),
        dx: +(h.dxPowerKW ?? 0).toFixed(3),
        total: +(h.totalElectricalKW ?? 0).toFixed(2),
        cooling: +(h.coolingCapacityKW ?? 0).toFixed(2),
      })),
    [data],
  );

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly Power Breakdown (kW)</p>
      <p className={sc(isDark)}>
        hourly_data[i].itLoadKW · fanPowerKW · dxPowerKW · totalElectricalKW ·
        coolingCapacityKW
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <AreaChart data={s}>
          <defs>
            {[
              ["itG", "#5ce1e5"],
              ["fanG", "#10b981"],
              ["dxG", "#ef4444"],
              ["totG", "#f59e0b"],
            ].map(([id, c]) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c} stopOpacity={0.35} />
                <stop offset="95%" stopColor={c} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {grid(isDark)}
          <XAxis
            dataKey="h"
            tick={ax(isDark)}
            label={{
              value: "Hour",
              position: "insideBottom",
              offset: -2,
              fontSize: 9,
            }}
          />
          <YAxis tick={ax(isDark)} />
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any, n: any) => [`${v} kW`, n]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area
            type="monotone"
            dataKey="it"
            stroke="#5ce1e5"
            fill="url(#itG)"
            strokeWidth={1.5}
            name="IT Load kW"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="fan"
            stroke="#10b981"
            fill="url(#fanG)"
            strokeWidth={1}
            name="Fan Power kW"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="dx"
            stroke="#ef4444"
            fill="url(#dxG)"
            strokeWidth={1}
            name="DX Backup kW"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#f59e0b"
            strokeWidth={1.5}
            name="Total Elec kW"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="cooling"
            stroke="#8b5cf6"
            strokeWidth={1}
            name="Cooling Cap kW"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: PUE per hour ────────────────────────────────────────────────
const EvapPueChart: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((h: any, i: number) => ({
        h: h.hour ?? i,
        pue: +(h.pue ?? 0).toFixed(4),
      })),
    [data],
  );

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>PUE per Hour</p>
      <p className={sc(isDark)}>
        hourly_data[i].pue — Power Usage Effectiveness per hour
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <AreaChart data={s}>
          <defs>
            <linearGradient id="evapPueG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5ce1e5" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#5ce1e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis tick={ax(isDark)} domain={[1, "auto"]} />
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any) => [Number(v).toFixed(4), "PUE"]}
          />
          <ReferenceLine
            y={1.5}
            stroke="#ef4444"
            strokeDasharray="4 2"
            label={{ value: "PUE 1.5 target", fontSize: 9, fill: "#ef4444" }}
          />
          <Area
            type="monotone"
            dataKey="pue"
            stroke="#5ce1e5"
            fill="url(#evapPueG)"
            strokeWidth={1.5}
            name="PUE"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Temperature per hour (inlet, supply, ambient) ───────────────
const EvapTempChart: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const s = useMemo(
    () =>
      sample(data, 200).map((h: any, i: number) => ({
        h: h.hour ?? i,
        ambient: +(h.ambientTempC ?? 0).toFixed(1),
        inlet: +(h.inletTempC ?? 0).toFixed(1),
        supply: +(h.supplyTempC ?? 0).toFixed(1),
        humidity: +(h.ambientHumidity ?? 0).toFixed(0),
      })),
    [data],
  );

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Temperature & Humidity per Hour</p>
      <p className={sc(isDark)}>
        hourly_data[i].ambientTempC · inletTempC · supplyTempC · ambientHumidity
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={s}>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis yAxisId="l" tick={ax(isDark)} unit="°C" />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} unit="%" />
          <Tooltip {...tt(isDark)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <ReferenceLine
            yAxisId="l"
            y={27}
            stroke="#ef4444"
            strokeDasharray="4 2"
            label={{ value: "ASHRAE 27°C limit", fontSize: 9, fill: "#ef4444" }}
          />
          <Line
            yAxisId="l"
            type="monotone"
            dataKey="ambient"
            stroke="#f59e0b"
            strokeWidth={1}
            name="Ambient °C"
            dot={false}
          />
          <Line
            yAxisId="l"
            type="monotone"
            dataKey="inlet"
            stroke="#ef4444"
            strokeWidth={1.5}
            name="Inlet °C"
            dot={false}
          />
          <Line
            yAxisId="l"
            type="monotone"
            dataKey="supply"
            stroke="#10b981"
            strokeWidth={1}
            name="Supply °C"
            dot={false}
          />
          <Area
            yAxisId="r"
            type="monotone"
            dataKey="humidity"
            stroke="#3b82f6"
            fill="#3b82f620"
            strokeWidth={1}
            name="Humidity %"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Cooling mode distribution ───────────────────────────────────
const EvapModeChart: React.FC<{ data: any[]; isDark: boolean }> = ({
  data,
  isDark,
}) => {
  const modeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((h: any) => {
      const m = h.coolingMode ?? "UNKNOWN";
      counts[m] = (counts[m] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  if (modeCounts.length === 0) return null;
  const modeColors: Record<string, string> = {
    IEC: "#10b981",
    DEC: "#3b82f6",
    HYBRID: "#8b5cf6",
    DX_BACKUP: "#ef4444",
    UNKNOWN: "#6b7280",
  };

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Cooling Mode Distribution</p>
      <p className={sc(isDark)}>
        hourly_data[i].coolingMode — IEC / DEC / HYBRID / DX_BACKUP hours
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <PieChart margin={{ top: 30, right: 70, bottom: 50, left: 70 }}>
          <Pie
            data={modeCounts}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent, value }) =>
              `${name} — ${value.toLocaleString()} hrs (${(percent * 100).toFixed(0)}%)`
            }
            labelLine={{
              stroke: isDark ? "#5ce1e5" : "#0ea5e9",
              strokeWidth: 1,
            }}
          >
            {modeCounts.map((d, i) => (
              <Cell
                key={i}
                fill={modeColors[d.name] ?? COLORS[i % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            {...tt(isDark)}
            formatter={(v: any) => [`${v} hrs`, "Hours"]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Annual metrics summary ─────────────────────────────────────
const EvapAnnualSummary: React.FC<{ resultData: any; isDark: boolean }> = ({
  resultData,
  isDark,
}) => {
  const raw = resultData?.rawEvaporativeData?.results ?? {};
  const assess =
    resultData?.coolingAdequacy ??
    resultData?.rawEvaporativeData?.cooling_assessment ??
    {};
  const km = assess?.keyMetrics ?? assess?.key_metrics ?? {};

  const kpis = [
    {
      label: "Total Electricity",
      value: `${((raw.energy?.electricity_kwh_total ?? resultData?.totalEnergyConsumption ?? 0) / 1000).toFixed(1)}k kWh`,
      color: "#5ce1e5",
    },
    {
      label: "IT Energy",
      value: `${((raw.energy?.it_kwh ?? resultData?.it_kwh ?? 0) / 1000).toFixed(1)}k kWh`,
      color: "#8b5cf6",
    },
    {
      label: "Fan Energy",
      value: `${(raw.energy?.fan_kwh ?? resultData?.fan_kwh ?? 0).toFixed(0)} kWh`,
      color: "#10b981",
    },
    {
      label: "DX Backup",
      value: `${(raw.energy?.dx_kwh ?? resultData?.dx_kwh ?? 0).toFixed(0)} kWh`,
      color: "#ef4444",
    },
    {
      label: "Annual Cost",
      value: `$${(raw.cost?.total_energy_cost_usd ?? resultData?.estimatedCost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      color: "#10b981",
    },
    {
      label: "CO₂ Total",
      value: `${((raw.emissions?.co2_kg_total ?? resultData?.carbonFootprint ?? 0) / 1000).toFixed(1)}k kg`,
      color: "#ef4444",
    },
    {
      label: "PUE Avg",
      value: (raw.performance?.pue_average ?? resultData?.pue ?? 0).toFixed(4),
      color: "#5ce1e5",
    },
    {
      label: "CUE Avg",
      value: (raw.performance?.cue_average ?? resultData?.cue ?? 0).toFixed(4),
      color: "#8b5cf6",
    },
    {
      label: "Max Inlet Temp",
      value: `${(km.max_inlet_temp_c ?? 0).toFixed(1)} °C`,
      color: "#f59e0b",
    },
    {
      label: "Cooling Cap Avg",
      value: `${(km.cooling_capacity_avg_kw ?? 0).toFixed(2)} kW`,
      color: "#10b981",
    },
    {
      label: "Failure Hours",
      value: `${raw.performance?.cooling_failure_hours ?? resultData?.cooling_failure_hours ?? 0} hrs`,
      color: "#ef4444",
    },
    {
      label: "Assessment",
      value: assess?.status ?? "—",
      color: assess?.status === "SUFFICIENT_COOLING" ? "#10b981" : "#ef4444",
    },
  ];

  const energyPie = [
    {
      name: "IT Energy",
      value: +(raw.energy?.it_kwh ?? resultData?.it_kwh ?? 0).toFixed(0),
      color: "#5ce1e5",
    },
    {
      name: "Fan Energy",
      value: +(raw.energy?.fan_kwh ?? resultData?.fan_kwh ?? 0).toFixed(0),
      color: "#10b981",
    },
    {
      name: "DX Backup",
      value: +(raw.energy?.dx_kwh ?? resultData?.dx_kwh ?? 0).toFixed(0),
      color: "#ef4444",
    },
    {
      name: "Pump Energy",
      value: +(raw.energy?.pump_kwh ?? resultData?.pump_kwh ?? 0).toFixed(0),
      color: "#3b82f6",
    },
  ].filter((d) => d.value > 0);

  return (
    <div className={`${cc(isDark)} lg:col-span-2`}>
      <p className={tc(isDark)}>Annual Evaporative Cooling Summary</p>
      <p className={sc(isDark)}>
        results.energy.* · results.cost.* · results.emissions.* ·
        results.performance.* · cooling_assessment.key_metrics.*
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-2 gap-2 content-start">
          {kpis.map(({ label, value, color }) => (
            <div
              key={label}
              className={`p-2 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
            >
              <div className="text-xs mb-0.5" style={{ color }}>
                {label}
              </div>
              <div
                className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
        <div>
          <p
            className={`text-xs mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
          >
            Energy breakdown by component
          </p>
          <ResponsiveContainer width="100%" height={380}>
            <PieChart margin={{ top: 20, right: 50, bottom: 40, left: 50 }}>
              <Pie
                data={energyPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={95}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={{ strokeWidth: 1 }}
              >
                {energyPie.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                {...tt(isDark)}
                formatter={(v: any, name: any) => [
                  `${Number(v).toLocaleString()} kWh`,
                  name,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ─── Evaporative: Assessment checks ──────────────────────────────────────────
const EvapAssessmentChart: React.FC<{ resultData: any; isDark: boolean }> = ({
  resultData,
  isDark,
}) => {
  const assess =
    resultData?.coolingAdequacy ??
    resultData?.rawEvaporativeData?.cooling_assessment ??
    {};
  const checks = assess?.checks ?? {};
  const notes: string[] =
    assess?.engineeringNotes ?? assess?.engineering_notes ?? [];
  const recs: string[] = assess?.recommendations ?? [];

  if (Object.keys(checks).length === 0 && notes.length === 0) return null;

  const checkColors: Record<string, string> = {
    true: "#10b981",
    false: "#ef4444",
  };

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Cooling Assessment</p>
      <p className={sc(isDark)}>
        cooling_assessment.checks · engineering_notes · recommendations
      </p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {Object.entries(checks).map(([k, v]) => (
          <div
            key={k}
            className={`p-2 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
          >
            <div
              className={`text-xs mb-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {k.replace(/_/g, " ")}
            </div>
            <span
              className="text-sm font-bold px-2 py-0.5 rounded-full"
              style={{
                background: `${checkColors[String(v)]}20`,
                color: checkColors[String(v)] ?? "#6b7280",
              }}
            >
              {String(v) === "true" ? "✓ PASS" : "✗ FAIL"}
            </span>
          </div>
        ))}
      </div>
      {notes.length > 0 && (
        <div
          className={`p-2 rounded-lg text-xs mb-2 ${isDark ? "bg-blue-500/10 text-blue-300 border border-blue-500/20" : "bg-blue-50 text-blue-700 border border-blue-200"}`}
        >
          {notes.map((n, i) => (
            <div key={i} className="mb-1 last:mb-0">
              ℹ {n}
            </div>
          ))}
        </div>
      )}
      {recs.length > 0 && (
        <div
          className={`p-2 rounded-lg text-xs ${isDark ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}
        >
          {recs.map((r, i) => (
            <div key={i} className="mb-1 last:mb-0">
              → {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Static parameter key definitions per chart ───────────────────────────────
// All field names verified against actual JSON outputs:
// air_live_8760_output.json → hourlyResults[i]
// evap_live_8760_output_pretty.json → hourly_data[i]
// chilled_live_8760_output.json → results.hourlyResults[i]
const CHART_PARAM_KEYS: Record<string, { param: string; meaning: string }[]> = {
  // ── Air-Side Economizer ──────────────────────────────────────────────────
  "air-power-breakdown": [
    {
      param: "IT Load (itLoad_kW)",
      meaning:
        "IT equipment power consumption in kilowatts at each simulation hour — generated by CloudSim DES",
    },
    {
      param: "Fan Power (fanPower_kW)",
      meaning:
        "Electrical power consumed by supply/return fans to deliver the required airflow",
    },
    {
      param: "Mechanical Cooling Power (mechPower_kW)",
      meaning:
        "Electrical power consumed by the DX compressor when free cooling is insufficient",
    },
    {
      param: "Total Facility Power (totalPower_kW)",
      meaning:
        "Total facility power = IT Load + Fan Power + Mechanical Power at each hour",
    },
  ],
  "air-airflow": [
    {
      param: "Required Airflow (requiredAirflow_CFM)",
      meaning:
        "Volume of air in cubic feet per minute needed to remove IT heat — formula: V = (P_IT × 3160) / (ρ × Cp × ΔT)",
    },
    {
      param: "Free Cooling Heat Removed (q_free_kW)",
      meaning: "Heat removed by the outdoor free-cooling air path in kilowatts",
    },
    {
      param: "Mechanical Cooling Load (mech_load_kW)",
      meaning:
        "Residual heat handled by mechanical cooling = max(Q_IT − Q_free, 0)",
    },
    {
      param: "Airflow Violation Flag (airflowViolation)",
      meaning:
        "True when required CFM exceeds the 10,000 CFM physical limit of the economizer",
    },
  ],
  "air-modes": [
    {
      param: "Full Economizer Mode (mode = FULL_ECON)",
      meaning:
        "100% outdoor air, compressor off — activated when T_out ≤ 24°C AND RH ≤ 60%",
    },
    {
      param: "Partial Trim Mode (mode = PARTIAL_TRIM)",
      meaning:
        "20% outdoor air + partial mechanical assist — activated when T_out ≤ 24°C but RH > 60%",
    },
    {
      param: "Mechanical Only Mode (mode = MECHANICAL_ONLY)",
      meaning:
        "0% outdoor air, full compressor operation — activated when T_out > 24°C",
    },
    {
      param: "Mode Hour Count (modeBreakdown)",
      meaning:
        "Number of hours spent in each operating mode across the full 8,760-hour simulation",
    },
  ],
  "air-cost-structure": [
    {
      param: "Electricity Cost (electricityCostUSD)",
      meaning:
        "Annual electricity cost = total facility energy × tariff rate ($0.12/kWh base rate)",
    },
    {
      param: "Carbon Tax Cost (carbonTaxCostUSD)",
      meaning:
        "Annual carbon tax liability = CO₂ emissions × $254/ton (IPCC 2030 pathway rate)",
    },
    {
      param: "Capital Expenditure (totalCapexUSD)",
      meaning: "Upfront installation cost for the air-side economizer system",
    },
    {
      param: "Annual Savings (annualSavingsUSD)",
      meaning:
        "Annual cost savings compared to a PUE 1.8 baseline mechanical-only system",
    },
    {
      param: "Total Annual OpEx (annualOpExUSD)",
      meaning:
        "Total annual operating expenditure = electricity cost + carbon tax",
    },
  ],
  "air-rack": [
    {
      param: "Average Rack Load (averageRackLoadKW)",
      meaning:
        "Mean power consumption per rack across all CloudSim-simulated racks",
    },
    {
      param: "Peak Rack Load (maxRackLoadKW)",
      meaning:
        "Highest power observed in any single rack — racks above 7.5 kW are classified as hotspots",
    },
    {
      param: "Hotspot Rack Count (hotspotRacks)",
      meaning: "Number of racks whose peak load exceeds the hotspot threshold",
    },
    {
      param: "Total Rack Count (totalRacks)",
      meaning: "Total number of server racks in the simulated data center",
    },
  ],
  "air-pue-cue": [
    {
      param: "Power Usage Effectiveness (pue)",
      meaning:
        "PUE = Total Facility Power / IT Power. Ideal value is 1.0 — lower means more efficient",
    },
    {
      param: "Carbon Usage Effectiveness (cue)",
      meaning:
        "CUE = (Total Power × Grid Carbon Factor) / IT Power. Unit: kgCO₂/kWh_IT — lower is better",
    },
  ],
  "air-weather": [
    {
      param: "Outdoor Temperature (outdoorTempC)",
      meaning:
        "Outdoor dry-bulb temperature in °C — above 24°C triggers MECHANICAL_ONLY mode",
    },
    {
      param: "Outdoor Relative Humidity (outdoorRH)",
      meaning:
        "Outdoor relative humidity in % — above 60% triggers PARTIAL_TRIM mode",
    },
  ],

  // ── Chilled Water System ─────────────────────────────────────────────────
  "chilled-annual-overview": [
    {
      param: "Total Energy Consumption (energyConsumption_kWh)",
      meaning: "Total annual facility electricity consumption in kWh",
    },
    {
      param: "Cooling Load (coolingLoad_kWh)",
      meaning:
        "Annual cooling energy delivered by the chiller plant to the white space",
    },
    {
      param: "Water Usage (waterUsage_L)",
      meaning: "Annual cooling tower water consumption in litres",
    },
    {
      param: "Carbon Emissions (carbonEmissions_kg)",
      meaning: "Total annual CO₂ emissions from facility power use",
    },
    {
      param: "Annual Cost (cost_USD)",
      meaning: "Total annual operating cost in US dollars",
    },
    {
      param: "Power Usage Effectiveness (pue)",
      meaning: "Annual average PUE = total facility energy / IT energy",
    },
    {
      param: "Water Usage Effectiveness (wue)",
      meaning:
        "WUE = Annual Water (L) / Annual IT Energy (kWh) — lower is better",
    },
  ],
  "chilled-cop-over-time": [
    {
      param: "Coefficient of Performance (cop)",
      meaning:
        "COP = Cooling Load / Chiller Power. Higher is better — near 8.0 at 24°C ambient",
    },
    {
      param: "Ambient Temperature (ambientTemp_C)",
      meaning: "Outdoor temperature in °C — higher ambient reduces chiller COP",
    },
    {
      param: "Average COP (averageCOP)",
      meaning: "Annual average COP across all 8,760 simulation hours",
    },
  ],
  "chilled-load-power": [
    {
      param: "Cooling Load (coolingLoad_kW)",
      meaning:
        "Cooling energy that must be supplied to match IT heat load each hour",
    },
    {
      param: "Chiller Power (chillerPower_kW)",
      meaning:
        "Electrical power consumed by the chiller compressor = Cooling Load / COP",
    },
    {
      param: "IT Load (itLoad_kW)",
      meaning: "IT equipment power from CloudSim at each simulation hour",
    },
    {
      param: "Peak Cooling Load (peakCoolingLoad_kW)",
      meaning:
        "Maximum instantaneous cooling load observed — determines chiller sizing requirement",
    },
  ],
  "chilled-it-chiller": [
    {
      param: "IT Load (itLoad_kW)",
      meaning:
        "IT equipment power from CloudSim — primary demand driver for the chiller plant",
    },
    {
      param: "Chiller Power (chillerPower_kW)",
      meaning:
        "Chiller compressor power — approximately 12.5% of IT load at design conditions",
    },
    {
      param: "Cooling Load (coolingLoad_kW)",
      meaning:
        "Cooling load delivered — slightly higher than chiller power due to heat of rejection",
    },
  ],
  "chilled-water-carbon": [
    {
      param: "Water Usage per Hour (waterUsage_L)",
      meaning: "Cooling tower water evaporation per hour in litres",
    },
    {
      param: "Carbon Emissions per Hour (carbonEmissions_kg)",
      meaning:
        "CO₂ emissions per hour = Total Power × grid carbon factor (0.55 kgCO₂/kWh)",
    },
  ],
  "chilled-cost-structure": [
    {
      param: "Capital Expenditure (capex_USD)",
      meaning:
        "Upfront installation cost for the full chilled water plant ($630,000)",
    },
    {
      param: "Annual Operating Cost (opex_annual_USD)",
      meaning:
        "Annual operating expenditure including electricity and maintenance",
    },
    {
      param: "Life-Cycle Cost of Plant (lccp_USD)",
      meaning: "LCCP = CAPEX + NPV of all annual OpEx over 15 years",
    },
    {
      param: "Net Present Value (npv_USD)",
      meaning:
        "NPV = present value of future savings minus CAPEX — positive means profitable",
    },
    {
      param: "Payback Period (paybackPeriod_years)",
      meaning: "Years until CAPEX is recovered from annual savings vs baseline",
    },
  ],
  "chilled-gates": [
    {
      param: "Thermal Compliance (thermalCompliance)",
      meaning:
        "PASS if rack inlet temperature stays ≤ 27°C (ASHRAE Class A1/A2 limit)",
    },
    {
      param: "Water Constraint (waterConstraint)",
      meaning:
        "PASS if annual water consumption is within the site water budget",
    },
    {
      param: "Carbon Liability (carbonLiability)",
      meaning:
        "PASS if annual CO₂ emissions are below the carbon target threshold",
    },
    {
      param: "Economic Viability (economicViability)",
      meaning: "PASS if NPV > 0 or payback period < 10 years",
    },
  ],

  // ── Evaporative Cooling ──────────────────────────────────────────────────
  "evap-annual-overview": [
    {
      param: "Total Electricity (electricity_kwh_total)",
      meaning: "Total annual electricity consumed by the evaporative system",
    },
    {
      param: "Fan Energy (fan_kwh)",
      meaning:
        "Annual fan energy — the only electrical load in pure evaporative mode (366 kWh)",
    },
    {
      param: "IT Energy (it_kwh)",
      meaning: "Annual IT equipment energy from CloudSim",
    },
    {
      param: "Average PUE (pue_average)",
      meaning:
        "Annual average PUE — 1.002 means only 0.2% overhead above IT load",
    },
    {
      param: "Max Rack Inlet Temperature (max_inlet_temp_c)",
      meaning:
        "Peak rack inlet temperature observed — must stay below 27°C (ASHRAE A1)",
    },
    {
      param: "Average Cooling Capacity (cooling_capacity_avg_kw)",
      meaning:
        "Average cooling capacity delivered — compared against average IT heat load (17.73 kW)",
    },
  ],
  "evap-hourly-power": [
    {
      param: "IT Load (itLoadKW)",
      meaning: "IT equipment power from CloudSim at each simulation hour",
    },
    {
      param: "Fan Power (fanPowerKW)",
      meaning:
        "Fan power — scales with airflow demand via affinity law (P ∝ speed³)",
    },
    {
      param: "DX Backup Power (dxPowerKW)",
      meaning: "DX compressor backup power — zero in pure evaporative mode",
    },
    {
      param: "Total Electrical Power (totalElectricalKW)",
      meaning:
        "Total facility power = IT Load + Fan Power + DX Power + Pump Power",
    },
    {
      param: "Cooling Capacity (coolingCapacityKW)",
      meaning:
        "Cooling capacity delivered by the evaporative path at each hour",
    },
  ],
  "evap-capacity": [
    {
      param: "Cooling Capacity (coolingCapacityKW)",
      meaning: "Cooling delivered by evaporative path = V̇ × ρ_air × Cp × ΔT",
    },
    {
      param: "IT Load (itLoadKW)",
      meaning:
        "IT heat load that must be removed — when capacity < load, a thermal deficit occurs",
    },
    {
      param: "Water Evaporation Rate (waterEvaporationLph)",
      meaning:
        "Water evaporated per hour in litres = (Q_cooling × 3600) / L_v where L_v = 2260 kJ/kg",
    },
  ],
  "evap-pue-compare": [
    {
      param: "Hourly PUE (pue)",
      meaning:
        "PUE = Total Electrical Power / IT Load — flat trace near 1.001–1.004 confirms near-zero overhead",
    },
    {
      param: "Annual Average PUE (pue_average)",
      meaning: "Annual average PUE reference line = 1.002",
    },
    {
      param: "Annual Peak PUE (pue_max)",
      meaning: "Annual peak PUE reference line = 1.004",
    },
  ],
  "evap-temp": [
    {
      param: "Ambient Temperature (ambientTempC)",
      meaning:
        "Outdoor dry-bulb temperature in °C — drives wet-bulb depression and evaporative cooling potential",
    },
    {
      param: "Rack Inlet Temperature (inletTempC)",
      meaning:
        "Estimated rack inlet air temperature — must stay below 27°C (ASHRAE Class A1 limit)",
    },
    {
      param: "Supply Air Temperature (supplyTempC)",
      meaning:
        "Temperature of supply air after evaporative cooling = T_db − η × (T_db − T_wb)",
    },
    {
      param: "Ambient Humidity (ambientHumidity)",
      meaning:
        "Outdoor relative humidity % — higher humidity reduces wet-bulb depression and limits cooling",
    },
  ],
  "evap-supply": [
    {
      param: "Supply Air Temperature (supplyTempC)",
      meaning:
        "Temperature of supply air delivered to the white space = T_db − η × (T_db − T_wb)",
    },
    {
      param: "Rack Inlet Temperature (inletTempC)",
      meaning:
        "Estimated rack inlet temperature — must stay below 27°C (ASHRAE A1 limit)",
    },
    {
      param: "Supply Air Humidity (supplyHumidity)",
      meaning:
        "Humidity of supply air in % — direct evaporative cooling adds moisture to supply air",
    },
    {
      param: "Ambient Humidity (ambientHumidity)",
      meaning:
        "Outdoor relative humidity % — reference for psychrometric calculations",
    },
  ],
  "evap-modes": [
    {
      param: "Direct Evaporative Cooling (coolingMode = DEC)",
      meaning:
        "Water evaporates directly into the supply air stream — adds humidity, maximises cooling",
    },
    {
      param: "Indirect Evaporative Cooling (coolingMode = IEC)",
      meaning:
        "Evaporation cools a secondary loop — no humidity added to supply air",
    },
  ],
  "evap-pue": [
    {
      param: "Hourly PUE (pue)",
      meaning:
        "PUE = Total Electrical Power / IT Load over all 8,760 simulation hours — near-flat trace confirms consistent efficiency",
    },
    {
      param: "Annual Average PUE (pue_average)",
      meaning: "Annual average PUE = 1.002 shown as reference line",
    },
  ],
  "evap-assessment": [
    {
      param: "Heat Balance Check (heat_balance)",
      meaning:
        "PASS if Cooling Capacity ≥ IT Load. FAIL = system is undersized — 3.5% deficit observed",
    },
    {
      param: "Inlet Temperature Check (inlet_temperature_ok)",
      meaning:
        "PASS if max rack inlet temp ≤ 27°C. FAIL = thermal compliance violation — 38.5°C observed",
    },
    {
      param: "Humidity Check (humidity_ok)",
      meaning: "PASS if supply air humidity is within ASHRAE acceptable limits",
    },
    {
      param: "Energy Efficiency Check (energy_efficiency_ok)",
      meaning: "PASS if PUE is within acceptable range — PUE 1.002 passes",
    },
    {
      param: "Overall Assessment Status (status)",
      meaning:
        "INSUFFICIENT_COOLING or ADEQUATE_COOLING — with confidence score (95% in this simulation)",
    },
  ],

  // ── Shared ───────────────────────────────────────────────────────────────
  "shared-radar": [
    {
      param: "PUE Efficiency Score (averagePUE / pue)",
      meaning:
        "Normalised score derived from actual PUE — lower PUE gives a higher score on the radar",
    },
    {
      param: "CUE Efficiency Score (averageCUE / cue_average)",
      meaning: "Normalised score derived from Carbon Usage Effectiveness",
    },
    {
      param: "Energy Savings Score (energySavingsPercent)",
      meaning: "% energy saved vs a PUE 1.8 baseline mechanical-only system",
    },
    {
      param: "Cost Savings Score (annualSavingsUSD)",
      meaning: "Annual USD savings vs baseline — normalised for radar display",
    },
    {
      param: "Carbon Savings Score (carbonSavings_kg)",
      meaning: "kg CO₂ avoided vs baseline — normalised for radar display",
    },
  ],
  "shared-projection": [
    {
      param: "Total Annual Cost (totalCostUSD)",
      meaning:
        "Projected total annual cost for each year including electricity and carbon tax with 15% escalation",
    },
    {
      param: "Cumulative Savings (costSavingsUSD)",
      meaning: "Cumulative cost savings vs baseline over the projection period",
    },
    {
      param: "Annual Carbon Emissions (carbonEmissions_kg)",
      meaning:
        "Projected annual CO₂ emissions — rises each year due to carbon tax escalation",
    },
  ],
};

function ParamKey({
  insightKey,
  isDark,
}: {
  insightKey: string;
  isDark: boolean;
}) {
  const params = CHART_PARAM_KEYS[insightKey];
  if (!params || params.length === 0) return null;
  return (
    <div
      className={`mt-2 rounded-lg border px-3 py-2.5 ${isDark ? "border-[#3f4a68] bg-[#0a0e27]" : "border-gray-200 bg-gray-50"}`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}
      >
        Parameter Reference
      </p>
      <div className="flex flex-col gap-1">
        {params.map(({ param, meaning }) => (
          <div key={param} className="flex items-start gap-2">
            <code
              className={`text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded ${isDark ? "bg-[#1a1f3a] text-[#5ce1e5]" : "bg-blue-50 text-blue-700"}`}
            >
              {param}
            </code>
            <span
              className={`text-[11px] leading-tight ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {meaning}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const SimulationCharts = forwardRef<
  SimulationChartsHandle,
  SimulationChartsProps
>(function SimulationCharts(
  { resultData, simulationType, isDark, simulationName, simulationDescription },
  ref,
) {
  const hourly: any[] = useMemo(() => {
    const p1 = resultData?.results?.hourlyResults;
    if (Array.isArray(p1) && p1.length > 0) return p1;
    const p2 = resultData?.hourlyResults;
    if (Array.isArray(p2) && p2.length > 0) return p2;
    return [];
  }, [resultData]);

  const yearlyData: any[] =
    resultData?.projection?.yearlyData ??
    resultData?.results?.projection?.yearlyData ??
    [];
  const proj = resultData?.projection ?? resultData?.results?.projection ?? {};
  const modeBreakdown: Record<string, number> =
    resultData?.airflowViolations?.modeBreakdown ?? {};
  const rackAnalysis = resultData?.rackAnalysis ?? null;

  // Detect technique
  const isChilled =
    (simulationType || "").toLowerCase() === "water" ||
    resultData?.coolingTechnique === "chilled_water" ||
    !!(
      resultData?.results?.metrics?.averageCOP !== undefined &&
      !resultData?.airflowViolations
    );
  const isAir =
    resultData?.coolingTechnique === "air_economizer" ||
    !!resultData?.airflowViolations ||
    (simulationType || "").toLowerCase() === "air";
  const isEvap =
    resultData?.coolingTechnique === "evaporative" ||
    (simulationType || "").toLowerCase().includes("evap");

  // Chilled water specific
  const copArray: number[] = Array.isArray(resultData?.copOverTime)
    ? resultData.copOverTime
    : [];
  const gates =
    resultData?.phase4Gates ?? resultData?.results?.phase4Gates ?? {};

  // Air economizer specific
  const hasAirflowData =
    hourly.length > 0 && hourly[0]?.requiredAirflow_CFM != null;
  const hasModeData = Object.keys(modeBreakdown).length > 0;
  const hasPowerBreakdown =
    hourly.length > 0 &&
    ("fanPower_kW" in (hourly[0] ?? {}) || "mechPower_kW" in (hourly[0] ?? {}));

  // Evaporative specific — hourly_data uses camelCase field names
  const evapHourly: any[] = useMemo(() => {
    const h =
      resultData?.hourlyData ??
      resultData?.rawEvaporativeData?.hourly_data ??
      [];
    return Array.isArray(h) ? h : [];
  }, [resultData]);
  const hasEvapHourly = evapHourly.length > 0;

  const hasAnyChart =
    hourly.length > 0 ||
    yearlyData.length > 0 ||
    copArray.length > 0 ||
    hasEvapHourly;
  if (!hasAnyChart) return null;

  const sections = useMemo(
    () => buildSections(resultData, simulationType),
    [resultData, simulationType],
  );
  const [insights, setInsights] = useState<Record<string, GraphExplanation>>(
    {},
  );
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [selectedChartId, setSelectedChartId] = useState<string>("");
  const autoFetchKeyRef = useRef<string>("");
  const activeChartContainerRef = useRef<HTMLDivElement>(null);
  // Keep a ref to the latest chartList so useImperativeHandle always sees it
  const chartListRef = useRef<
    { id: string; label: string; node: React.ReactNode }[]
  >([]);

  // Expose captureAllCharts to parent via ref
  useImperativeHandle(ref, () => ({
    captureAllCharts: async (): Promise<Record<string, string>> => {
      const captured: Record<string, string> = {};
      const originalId = selectedChartId;
      const list = chartListRef.current;

      for (const chart of list) {
        setSelectedChartId(chart.id);

        // Wait for React state update + two full paint frames
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );

        // Wait until Recharts SVG is actually in the DOM (up to 4s)
        const el = activeChartContainerRef.current;
        if (!el) continue;

        await new Promise<void>((resolve) => {
          const deadline = Date.now() + 4000;
          const check = () => {
            const hasSvg = el.querySelector("svg") !== null;
            const hasCanvas = el.querySelector("canvas") !== null;
            if (hasSvg || hasCanvas || Date.now() > deadline) {
              resolve();
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });

        // Let Recharts animations fully complete — pie charts need longer (1.8s default)
        await new Promise<void>((resolve) => setTimeout(resolve, 1800));

        try {
          const canvas = await html2canvas(el, {
            backgroundColor: isDark ? "#0f1428" : "#ffffff",
            scale: 2,
            useCORS: true,
            logging: false,
            width: el.scrollWidth,
            height: el.scrollHeight,
          });
          captured[chart.id] = canvas.toDataURL("image/png");
        } catch (e) {
          console.warn(`Failed to capture chart ${chart.id}`, e);
        }

        // Brief pause between charts so the browser can breathe
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
      }

      // Restore original selection
      setSelectedChartId(originalId);
      return captured;
    },
  }));

  const simulationContext = useMemo(() => {
    const summary = resultData?.summary ?? resultData?.results?.summary ?? {};
    return {
      location:
        summary.location ??
        resultData?.location ??
        simulationDescription ??
        simulationName,
      outdoorTempC: toNumber(summary.outdoorTempC, resultData?.outdoorTempC),
      humidity: toNumber(summary.humidity, resultData?.humidity),
      servers: toNumber(summary.servers, resultData?.servers),
      workloadPercent: toNumber(
        summary.workloadPercent,
        resultData?.workloadPercent,
      ),
      itLoadKW: toNumber(summary.itLoadKW, resultData?.itLoadKW),
      duration: summary.duration ?? resultData?.duration,
      coolingTechnique: simulationType,
    };
  }, [resultData, simulationDescription, simulationName, simulationType]);

  const panelFetchKey = useMemo(() => {
    const keySeedName = simulationName ?? "simulation";
    return buildInsightCacheKey(
      keySeedName,
      simulationType,
      sections,
      simulationContext,
    );
  }, [sections, simulationName, simulationType, simulationContext]);

  const fetchInsights = async (forceRefresh = false) => {
    if (sections.length === 0) return;

    if (forceRefresh) {
      insightCache.delete(panelFetchKey);
      insightRequestCache.delete(panelFetchKey);
      try {
        localStorage.removeItem(panelFetchKey);
      } catch {
        // ignore storage errors
      }
    }

    try {
      const storedInsights = localStorage.getItem(panelFetchKey);
      if (storedInsights) {
        const parsedInsights = JSON.parse(storedInsights) as Record<
          string,
          GraphExplanation
        >;
        insightCache.set(panelFetchKey, parsedInsights);
        setInsights(parsedInsights);
        setInsightsError(null);
        setInsightsLoading(false);
        return;
      }
    } catch {
      // ignore storage errors and continue
    }

    const cachedInsights = insightCache.get(panelFetchKey);
    if (cachedInsights) {
      setInsights(cachedInsights);
      setInsightsError(null);
      setInsightsLoading(false);
      return;
    }

    const cachedRequest = insightRequestCache.get(panelFetchKey);
    if (cachedRequest) {
      setInsightsLoading(true);
      setInsightsError(null);
      try {
        const awaitedInsights = await cachedRequest;
        setInsights(awaitedInsights);
      } catch (err) {
        setInsightsError(
          err instanceof Error
            ? err.message
            : "Failed to generate chart explanations",
        );
      } finally {
        setInsightsLoading(false);
      }
      return;
    }

    setInsightsLoading(true);
    setInsightsError(null);

    const requestPromise = (async () => {
      const nextInsights: Record<string, GraphExplanation> = {};
      const failedSections: string[] = [];

      for (const section of sections) {
        try {
          const response = await fetch(
            `${GRAPH_EXPLANATION_API_URL}/explain-graph`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                chartTitle: section.title,
                chartType: section.chartType,
                xAxis: section.xAxis,
                yAxis: section.yAxis,
                data: section.data,
                simulationContext,
              }),
            },
          );

          if (!response.ok) {
            failedSections.push(section.title.toLowerCase());
            continue;
          }

          const result = (await response.json()) as GraphExplanation;
          nextInsights[section.key] = result;
        } catch {
          failedSections.push(section.title.toLowerCase());
        }
      }

      if (Object.keys(nextInsights).length === 0) {
        throw new Error("Unable to generate chart explanations right now");
      }

      if (failedSections.length > 0) {
        setInsightsError(
          `Some chart explanations could not be generated: ${failedSections.join(", ")}`,
        );
      }

      insightCache.set(panelFetchKey, nextInsights);
      try {
        localStorage.setItem(panelFetchKey, JSON.stringify(nextInsights));
      } catch {
        // ignore storage errors
      }

      return nextInsights;
    })();

    insightRequestCache.set(panelFetchKey, requestPromise);

    try {
      const nextInsights = await requestPromise;
      setInsights(nextInsights);
    } catch (err) {
      setInsightsError(
        err instanceof Error
          ? err.message
          : "Failed to generate chart explanations",
      );
    } finally {
      insightRequestCache.delete(panelFetchKey);
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (sections.length === 0 || autoFetchKeyRef.current === panelFetchKey) {
      return;
    }

    autoFetchKeyRef.current = panelFetchKey;
    setInsights({});
    void fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelFetchKey, sections.length, simulationName, simulationType]);

  const insightByKey = (key: string) => insights[key] ?? null;

  const chartWithInsight = (chart: React.ReactNode, insightKey: string) => {
    const insight = insightByKey(insightKey);
    const explanationText = sanitizeExplanationText(insight?.explanation);
    const keyInsightText = sanitizeExplanationText(insight?.keyInsight);

    return (
      <div className="space-y-3">
        {chart}
        <ParamKey insightKey={insightKey} isDark={isDark} />
        {insight && explanationText ? (
          <>
            <p
              data-role="chart-explanation-text"
              className={`text-sm leading-relaxed text-justify ${isDark ? "text-gray-100" : "text-gray-900"}`}
            >
              {explanationText}
            </p>
            {keyInsightText && (
              <p
                data-role="chart-key-insight-text"
                className={`text-sm leading-relaxed text-justify italic ${isDark ? "text-gray-300" : "text-gray-700"}`}
              >
                {keyInsightText}
              </p>
            )}
          </>
        ) : insightsLoading ? (
          <p
            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Generating explanation...
          </p>
        ) : null}
      </div>
    );
  };

  // ── Build ordered chart list for dropdown ────────────────────────────────
  type ChartEntry = { id: string; label: string; node: React.ReactNode };
  const chartList: ChartEntry[] = [];

  const addChart = (
    id: string,
    label: string,
    node: React.ReactNode,
    condition = true,
  ) => {
    if (condition) chartList.push({ id, label, node });
  };

  // Chilled Water
  addChart(
    "chilled-annual-overview",
    "Annual Consumption Overview",
    chartWithInsight(
      <ChilledAnnualPie resultData={resultData} isDark={isDark} />,
      "chilled-annual-overview",
    ),
    isChilled,
  );
  addChart(
    "chilled-cop-over-time",
    "COP Over Time",
    chartWithInsight(
      <ChilledCopChart copArray={copArray} isDark={isDark} />,
      "chilled-cop-over-time",
    ),
    isChilled && copArray.length > 0,
  );
  addChart(
    "chilled-load-power",
    "Cooling Load vs Chiller Power",
    chartWithInsight(
      <ChilledCoolingLoadChart
        data={hourly}
        peakCoolingLoad={
          resultData?.results?.metrics?.peakCoolingLoad_kW ??
          resultData?.peakCoolingLoad_kW ??
          0
        }
        isDark={isDark}
      />,
      "chilled-load-power",
    ),
    isChilled && hourly.length > 0,
  );
  addChart(
    "chilled-it-chiller",
    "IT Load vs Chiller Power",
    chartWithInsight(
      <ChilledHourlyPower data={hourly} isDark={isDark} />,
      "chilled-it-chiller",
    ),
    isChilled && hourly.length > 0,
  );
  addChart(
    "chilled-water-carbon",
    "Water Usage & Carbon Emissions",
    chartWithInsight(
      <ChilledWaterUsage data={hourly} isDark={isDark} />,
      "chilled-water-carbon",
    ),
    isChilled && hourly.length > 0,
  );
  addChart(
    "chilled-cost-structure",
    "Cost Structure",
    chartWithInsight(
      <ChilledCostChart resultData={resultData} isDark={isDark} />,
      "chilled-cost-structure",
    ),
    isChilled,
  );
  addChart(
    "chilled-gates",
    "Phase 4 Compliance Gates",
    chartWithInsight(
      <ChilledGatesChart gates={gates} isDark={isDark} />,
      "chilled-gates",
    ),
    false, // moved to Detailed Metrics tab
  );

  // Air Economizer
  addChart(
    "air-power-breakdown",
    "Hourly Power Breakdown",
    chartWithInsight(
      <HourlyPowerBreakdown data={hourly} isDark={isDark} />,
      "air-power-breakdown",
    ),
    isAir && hasPowerBreakdown,
  );
  addChart(
    "air-airflow",
    "Airflow & Free vs Mechanical Cooling",
    chartWithInsight(
      <AirflowChart data={hourly} isDark={isDark} />,
      "air-airflow",
    ),
    isAir && hasAirflowData,
  );
  addChart(
    "air-modes",
    "Cooling Mode Distribution",
    chartWithInsight(
      <ModePieChart modeBreakdown={modeBreakdown} isDark={isDark} />,
      "air-modes",
    ),
    isAir && hasModeData,
  );
  addChart(
    "air-cost-structure",
    "Full Cost Structure",
    chartWithInsight(
      <CostBreakdownChart resultData={resultData} isDark={isDark} />,
      "air-cost-structure",
    ),
    isAir,
  );
  addChart(
    "air-rack",
    "Rack Analysis (CloudSim)",
    chartWithInsight(
      <RackChart rackAnalysis={rackAnalysis} isDark={isDark} />,
      "air-rack",
    ),
    isAir && !!rackAnalysis,
  );
  addChart(
    "air-pue-cue",
    "Hourly PUE & CUE",
    chartWithInsight(
      <PueCueChart data={hourly} isDark={isDark} />,
      "air-pue-cue",
    ),
    isAir && hourly.length > 0 && hourly[0]?.pue != null,
  );
  addChart(
    "air-weather",
    "Ambient Temperature & Humidity",
    chartWithInsight(
      <TempChart data={hourly} isDark={isDark} />,
      "air-weather",
    ),
    isAir &&
      hourly.length > 0 &&
      (hourly[0]?.outdoorTempC != null || hourly[0]?.tempC != null),
  );

  // Evaporative
  addChart(
    "evap-annual-overview",
    "Annual Evaporative Summary",
    chartWithInsight(
      <EvapAnnualSummary resultData={resultData} isDark={isDark} />,
      "evap-annual-overview",
    ),
    isEvap,
  );
  addChart(
    "evap-hourly-power",
    "Hourly Power Breakdown",
    chartWithInsight(
      <EvapHourlyPower data={evapHourly} isDark={isDark} />,
      "evap-hourly-power",
    ),
    isEvap && hasEvapHourly,
  );
  addChart(
    "evap-capacity",
    "Cooling Capacity vs IT Load",
    chartWithInsight(
      <EvapCoolingCapChart data={evapHourly} isDark={isDark} />,
      "evap-capacity",
    ),
    isEvap && hasEvapHourly,
  );
  addChart(
    "evap-pue-compare",
    "PUE vs Annual Averages",
    chartWithInsight(
      <EvapPueCompareChart
        data={evapHourly}
        resultData={resultData}
        isDark={isDark}
      />,
      "evap-pue-compare",
    ),
    isEvap && hasEvapHourly,
  );
  addChart(
    "evap-temp",
    "Temperature & Humidity",
    chartWithInsight(
      <EvapTempChart data={evapHourly} isDark={isDark} />,
      "evap-temp",
    ),
    isEvap && hasEvapHourly,
  );
  addChart(
    "evap-supply",
    "Supply Air Conditions",
    chartWithInsight(
      <EvapSupplyHumidChart data={evapHourly} isDark={isDark} />,
      "evap-supply",
    ),
    isEvap && hasEvapHourly,
  );
  addChart(
    "evap-modes",
    "Cooling Mode Distribution",
    chartWithInsight(
      <EvapModeChart data={evapHourly} isDark={isDark} />,
      "evap-modes",
    ),
    isEvap && hasEvapHourly,
  );
  addChart(
    "evap-pue",
    "PUE per Hour",
    chartWithInsight(
      <EvapPueChart data={evapHourly} isDark={isDark} />,
      "evap-pue",
    ),
    isEvap && hasEvapHourly,
  );
  addChart(
    "evap-assessment",
    "Cooling Assessment",
    chartWithInsight(
      <EvapAssessmentChart resultData={resultData} isDark={isDark} />,
      "evap-assessment",
    ),
    false, // moved to Detailed Metrics tab
  );

  // Shared
  addChart(
    "shared-radar",
    "Performance Radar",
    chartWithInsight(
      <KpiRadar resultData={resultData} isDark={isDark} />,
      "shared-radar",
    ),
  );
  addChart(
    "shared-projection",
    "5-Year Financial Projection",
    chartWithInsight(
      <ProjectionDetailChart data={yearlyData} proj={proj} isDark={isDark} />,
      "shared-projection",
    ),
    yearlyData.length > 0,
  );

  const activeChart =
    chartList.find((c) => c.id === selectedChartId) ?? chartList[0];
  // Keep ref in sync so captureAllCharts always sees the latest list
  chartListRef.current = chartList;

  // Set initial chart when list is first built
  useEffect(() => {
    if (chartList.length > 0 && !selectedChartId) {
      setSelectedChartId(chartList[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartList.length]);

  return (
    <div className="space-y-4">
      {insightsError && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${isDark ? "border-red-900/50 bg-red-950/30 text-red-200" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {insightsError}
        </div>
      )}

      {/* Dropdown chart selector */}
      <div className="flex items-center gap-3">
        <label
          className={`text-xs font-semibold shrink-0 ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          Select Chart:
        </label>
        <select
          value={selectedChartId}
          onChange={(e) => setSelectedChartId(e.target.value)}
          className={`flex-1 text-sm rounded-xl px-3 py-2 border outline-none cursor-pointer transition-colors ${
            isDark
              ? "bg-[#1a1f3a] border-[#3f4a68] text-white focus:border-[#5ce1e5]"
              : "bg-white border-gray-200 text-gray-900 focus:border-[#0ea5e9]"
          }`}
        >
          {chartList.map((c, i) => (
            <option key={c.id} value={c.id}>
              {i + 1}. {c.label}
            </option>
          ))}
        </select>
        <span
          className={`text-xs shrink-0 ${isDark ? "text-gray-500" : "text-gray-400"}`}
        >
          {chartList.findIndex((c) => c.id === selectedChartId) + 1} /{" "}
          {chartList.length}
        </span>
      </div>

      {/* Prev / Next navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const idx = chartList.findIndex((c) => c.id === selectedChartId);
            if (idx > 0) setSelectedChartId(chartList[idx - 1].id);
          }}
          disabled={chartList.findIndex((c) => c.id === selectedChartId) === 0}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 ${isDark ? "bg-[#27304a] text-white hover:bg-[#3f4a68]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          ← Previous
        </button>
        <button
          onClick={() => {
            const idx = chartList.findIndex((c) => c.id === selectedChartId);
            if (idx < chartList.length - 1)
              setSelectedChartId(chartList[idx + 1].id);
          }}
          disabled={
            chartList.findIndex((c) => c.id === selectedChartId) ===
            chartList.length - 1
          }
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 ${isDark ? "bg-[#27304a] text-white hover:bg-[#3f4a68]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Next →
        </button>
      </div>

      {/* Active chart */}
      {activeChart && (
        <div
          key={activeChart.id}
          ref={activeChartContainerRef}
          style={{ minWidth: "100%", minHeight: 520, width: "100%" }}
        >
          {activeChart.node}
        </div>
      )}
    </div>
  );
});
