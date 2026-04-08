import React, { useMemo } from "react";
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

interface SimulationChartsProps {
  resultData: any;
  simulationType: string;
  isDark: boolean;
}

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
  `p-4 rounded-xl border ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`;

const tc = (isDark: boolean) =>
  `text-sm font-bold mb-1 ${isDark ? "text-gray-200" : "text-gray-800"}`;

const sc = (isDark: boolean) =>
  `text-xs mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`;

const tt = (isDark: boolean) => ({
  contentStyle: {
    background: isDark ? "#1a1f3a" : "#fff",
    border: `1px solid ${isDark ? "#3f4a68" : "#e5e7eb"}`,
    borderRadius: 8,
    color: isDark ? "#e2e8f0" : "#1f2937",
    fontSize: 11,
  },
});

const ax = (isDark: boolean) => ({
  fontSize: 9,
  fill: isDark ? "#9ca3af" : "#6b7280",
});
const grid = (isDark: boolean) => (
  <CartesianGrid
    strokeDasharray="3 3"
    stroke={isDark ? "#2d3748" : "#e5e7eb"}
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
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly Power Breakdown (kW)</p>
      <p className={sc(isDark)}>
        IT Load · Fan Power · Mechanical Cooling · Total — from
        EconomizerController hourlyResults[i].itLoad_kW / fanPower_kW /
        mechPower_kW
      </p>
      <ResponsiveContainer width="100%" height={230}>
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
      <ResponsiveContainer width="100%" height={230}>
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
      <ResponsiveContainer width="100%" height={230}>
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
      <ResponsiveContainer width="100%" height={230}>
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
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={85}
            label={({ name, percent }) =>
              `${name.replace("_", " ")} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((d, i) => (
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
  const data = [
    {
      metric: "PUE Eff",
      value: Math.max(0, 10 - ((m.pue ?? s.averagePUE ?? 1.5) - 1) * 5),
    },
    {
      metric: "CUE Eff",
      value: Math.max(0, 10 - (m.cue ?? s.averageCUE ?? 0.5) * 10),
    },
    {
      metric: "Energy Sav",
      value: Math.min(10, (s.energySavingsPercent ?? 0) / 5),
    },
    {
      metric: "Cost Sav",
      value: Math.min(10, (s.annualSavingsUSD ?? 0) / 20000),
    },
    {
      metric: "Carbon Sav",
      value: Math.min(10, (s.carbonSavings_kg ?? 0) / 10000),
    },
  ].filter((d) => d.value > 0);

  if (data.length < 3) return null;

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Performance Radar</p>
      <p className={sc(isDark)}>
        Normalised scores (0–10) across efficiency, savings, and carbon metrics
      </p>
      <ResponsiveContainer width="100%" height={230}>
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

// ─── 9. ML Technique comparison ───────────────────────────────────────────────
const ComparisonChart: React.FC<{ rows: any[]; isDark: boolean }> = ({
  rows,
  isDark,
}) => {
  const data = rows.map((r) => ({
    tech: r.tech,
    cost: +(r.annual_cost ?? 0).toFixed(0),
    emissions: +(r.annual_emissions_kg ?? 0).toFixed(0),
    water: +(r.annual_water_liters ?? 0).toFixed(0),
    score: +(r.score ?? 0).toFixed(4),
  }));

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Technique Comparison (ML)</p>
      <p className={sc(isDark)}>
        Annual cost · CO₂ emissions · Water usage across all cooling techniques
        — mlRecommendation.comparison_table
      </p>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} layout="vertical">
          {grid(isDark)}
          <XAxis type="number" tick={ax(isDark)} />
          <YAxis dataKey="tech" type="category" tick={ax(isDark)} width={100} />
          <Tooltip {...tt(isDark)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar
            dataKey="cost"
            fill="#5ce1e5"
            name="Cost $"
            radius={[0, 3, 3, 0]}
          />
          <Bar
            dataKey="emissions"
            fill="#f59e0b"
            name="CO₂ kg"
            radius={[0, 3, 3, 0]}
          />
          <Bar
            dataKey="water"
            fill="#3b82f6"
            name="Water L"
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
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
      <ResponsiveContainer width="100%" height={230}>
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
const ChilledAnnualPie: React.FC<{ resultData: any; isDark: boolean }> = ({ resultData, isDark }) => {
  const annual = resultData?.results?.annual ?? {};
  const metrics = resultData?.results?.metrics ?? {};

  // Normalise to comparable scale (% of max) for pie
  const raw = [
    { name: "Energy (kWh)", value: +(annual.energyConsumption_kWh ?? 0).toFixed(0), color: "#5ce1e5", unit: "kWh" },
    { name: "Cooling Load (kWh)", value: +(annual.coolingLoad_kWh ?? 0).toFixed(0), color: "#8b5cf6", unit: "kWh" },
    { name: "Water (L)", value: +(annual.waterUsage_L ?? 0).toFixed(0), color: "#3b82f6", unit: "L" },
    { name: "Carbon (kg)", value: +(annual.carbonEmissions_kg ?? 0).toFixed(0), color: "#ef4444", unit: "kg" },
    { name: "Cost (USD)", value: +(annual.cost_USD ?? 0).toFixed(0), color: "#10b981", unit: "USD" },
  ].filter(d => d.value > 0);

  const kpis = [
    { label: "Energy", value: `${(annual.energyConsumption_kWh / 1000).toFixed(1)}k kWh`, color: "#5ce1e5" },
    { label: "Cooling Load", value: `${(annual.coolingLoad_kWh / 1000).toFixed(1)}k kWh`, color: "#8b5cf6" },
    { label: "Water", value: `${(annual.waterUsage_L / 1000).toFixed(1)}k L`, color: "#3b82f6" },
    { label: "Carbon", value: `${(annual.carbonEmissions_kg / 1000).toFixed(1)}k kg`, color: "#ef4444" },
    { label: "Cost (USD)", value: `$${(annual.cost_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "#10b981" },
    { label: "Avg COP", value: (metrics.averageCOP ?? 0).toFixed(3), color: "#f59e0b" },
    { label: "PUE", value: (metrics.pue ?? 0).toFixed(4), color: "#5ce1e5" },
    { label: "WUE", value: `${(metrics.wue ?? 0).toFixed(3)} L/kWh`, color: "#3b82f6" },
  ];

  return (
    <div className={`${cc(isDark)} lg:col-span-2`}>
      <p className={tc(isDark)}>Annual Consumption Overview</p>
      <p className={sc(isDark)}>
        results.annual.* — energyConsumption_kWh · coolingLoad_kWh · waterUsage_L · carbonEmissions_kg · cost_USD
      </p>
      <div className="grid grid-cols-2 gap-4">
        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-2 content-start">
          {kpis.map(({ label, value, color }) => (
            <div key={label} className={`p-2 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}>
              <div className="text-xs mb-0.5" style={{ color }}>{label}</div>
              <div className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{value}</div>
            </div>
          ))}
        </div>
        {/* Pie chart — proportional comparison */}
        <div>
          <p className={`text-xs mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            Proportional comparison (values normalised to % of total)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={raw}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {raw.map((d, i) => <Cell key={i} fill={d.color} />)}
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
const ChilledCoolingLoadChart: React.FC<{ data: any[]; peakCoolingLoad: number; isDark: boolean }> = ({ data, peakCoolingLoad, isDark }) => {
  const s = useMemo(() => sample(data, 200).map((h: any, i: number) => ({
    h: h.hour ?? i,
    cooling: +(h.coolingLoad_kW ?? 0).toFixed(3),
    chiller: +(h.chillerPower_kW ?? 0).toFixed(3),
    cost:    +(h.cost_USD ?? 0).toFixed(4),
  })), [data]);

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly Cooling Load vs Chiller Power (kW)</p>
      <p className={sc(isDark)}>
        hourlyResults[i].coolingLoad_kW · chillerPower_kW — peak: {peakCoolingLoad.toFixed(3)} kW (results.metrics.peakCoolingLoad_kW)
      </p>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={s}>
          <defs>
            <linearGradient id="clGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} label={{ value: "Hour", position: "insideBottom", offset: -2, fontSize: 9 }} />
          <YAxis yAxisId="l" tick={ax(isDark)} unit=" kW" />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} unit=" $" />
          <Tooltip {...tt(isDark)} formatter={(v: any, n: any) => [Number(v).toFixed(3), n]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {peakCoolingLoad > 0 && (
            <ReferenceLine yAxisId="l" y={peakCoolingLoad} stroke="#ef4444" strokeDasharray="4 2"
              label={{ value: `Peak ${peakCoolingLoad.toFixed(2)} kW`, fontSize: 9, fill: "#ef4444" }} />
          )}
          <Area yAxisId="l" type="monotone" dataKey="cooling" stroke="#8b5cf6" fill="url(#clGrad)" strokeWidth={1.5} name="Cooling Load kW" dot={false} />
          <Line yAxisId="l" type="monotone" dataKey="chiller" stroke="#5ce1e5" strokeWidth={1} name="Chiller Power kW" dot={false} />
          <Line yAxisId="r" type="monotone" dataKey="cost"    stroke="#10b981" strokeWidth={1} name="Cost USD/hr" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};


const ChilledCopChart: React.FC<{ copArray: number[]; isDark: boolean }> = ({ copArray, isDark }) => {
  const s = useMemo(() => {
    const step = Math.max(1, Math.ceil(copArray.length / 200));
    return copArray.filter((_, i) => i % step === 0).map((v, i) => ({ h: i * step, cop: +v.toFixed(4) }));
  }, [copArray]);

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>COP Over Time (8760 h sampled)</p>
      <p className={sc(isDark)}>results.hourlyResults[i].cop — Coefficient of Performance per hour</p>
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={s}>
          <defs><linearGradient id="copCW" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5ce1e5" stopOpacity={0.4}/><stop offset="95%" stopColor="#5ce1e5" stopOpacity={0}/></linearGradient></defs>
          {grid(isDark)}<XAxis dataKey="h" tick={ax(isDark)} /><YAxis tick={ax(isDark)} domain={['auto','auto']} />
          <Tooltip {...tt(isDark)} formatter={(v: any) => [Number(v).toFixed(4), "COP"]} />
          <Area type="monotone" dataKey="cop" stroke="#5ce1e5" fill="url(#copCW)" strokeWidth={1.5} dot={false} name="COP" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Chilled Water: IT Load + Chiller Power ───────────────────────────────────
const ChilledHourlyPower: React.FC<{ data: any[]; isDark: boolean }> = ({ data, isDark }) => {
  const s = useMemo(() => sample(data, 200).map((h: any, i: number) => ({
    h: h.hour ?? i,
    it:      +(h.itLoad_kW ?? 0).toFixed(2),
    chiller: +(h.chillerPower_kW ?? 0).toFixed(2),
    cooling: +(h.coolingLoad_kW ?? 0).toFixed(2),
    total:   +((h.itLoad_kW ?? 0) + (h.chillerPower_kW ?? 0)).toFixed(2),
  })), [data]);

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly IT Load vs Chiller Power (kW)</p>
      <p className={sc(isDark)}>hourlyResults[i].itLoad_kW · chillerPower_kW · coolingLoad_kW — direct from CoolSim</p>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={s}>
          <defs>
            <linearGradient id="itCW" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5ce1e5" stopOpacity={0.35}/><stop offset="95%" stopColor="#5ce1e5" stopOpacity={0}/></linearGradient>
            <linearGradient id="chCW" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
          </defs>
          {grid(isDark)}<XAxis dataKey="h" tick={ax(isDark)} /><YAxis tick={ax(isDark)} />
          <Tooltip {...tt(isDark)} formatter={(v: any, n: any) => [`${v} kW`, n]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey="it"      stroke="#5ce1e5" fill="url(#itCW)" strokeWidth={1.5} name="IT Load kW"      dot={false} />
          <Area type="monotone" dataKey="chiller" stroke="#8b5cf6" fill="url(#chCW)" strokeWidth={1.5} name="Chiller Power kW" dot={false} />
          <Line type="monotone" dataKey="cooling" stroke="#f59e0b" strokeWidth={1}   name="Cooling Load kW" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Chilled Water: Water usage over time ─────────────────────────────────────
const ChilledWaterUsage: React.FC<{ data: any[]; isDark: boolean }> = ({ data, isDark }) => {
  const s = useMemo(() => sample(data, 200).map((h: any, i: number) => ({
    h: h.hour ?? i,
    water: +(h.waterUsage_L ?? 0).toFixed(2),
    carbon: +(h.carbonEmissions_kg ?? 0).toFixed(3),
  })), [data]);
  if (!s.some(h => h.water > 0)) return null;

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly Water Usage & Carbon Emissions</p>
      <p className={sc(isDark)}>hourlyResults[i].waterUsage_L · carbonEmissions_kg — from CoolSim chilled water API</p>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={s}>
          {grid(isDark)}<XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis yAxisId="l" tick={ax(isDark)} unit="L" />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} unit="kg" />
          <Tooltip {...tt(isDark)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area yAxisId="l" type="monotone" dataKey="water"  stroke="#3b82f6" fill="#3b82f620" strokeWidth={1.5} name="Water L"   dot={false} />
          <Line yAxisId="r" type="monotone" dataKey="carbon" stroke="#ef4444" strokeWidth={1}   name="Carbon kg" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Chilled Water: Full cost structure (OpEx, CAPEX, LCCP, NPV) ──────────────
const ChilledCostChart: React.FC<{ resultData: any; isDark: boolean }> = ({ resultData, isDark }) => {
  const econ = resultData?.economics ?? resultData?.results?.economics ?? {};
  const annual = resultData?.results?.annual ?? {};

  const barData = [
    { name: "Annual OpEx",  value: +(econ.opex_annual_USD ?? annual.cost_USD ?? 0).toFixed(0), fill: "#ef4444" },
    { name: "CAPEX",        value: +(econ.capex_USD ?? 0).toFixed(0),                          fill: "#f59e0b" },
    { name: "LCCP",         value: +(econ.lccp_USD ?? 0).toFixed(0),                           fill: "#8b5cf6" },
    { name: "NPV (abs)",    value: +Math.abs(econ.npv_USD ?? 0).toFixed(0),                    fill: "#3b82f6" },
  ].filter(d => d.value > 0);

  const kpis = [
    { label: "Annual Cost (USD)", value: `$${(annual.cost_USD ?? econ.opex_annual_USD ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "#10b981", tip: "results.annual.cost_USD — direct from CoolSim API" },
    { label: "Annual OpEx",       value: fmtUSD(econ.opex_annual_USD ?? annual.cost_USD),  color: "#ef4444", tip: "results.economics.opex_annual_USD" },
    { label: "CAPEX",             value: fmtUSD(econ.capex_USD),                           color: "#f59e0b", tip: "results.economics.capex_USD" },
    { label: "LCCP",              value: fmtUSD(econ.lccp_USD),                            color: "#8b5cf6", tip: "Life Cycle Cost of Plant — results.economics.lccp_USD" },
    { label: "NPV",               value: fmtUSD(econ.npv_USD),                             color: econ.npv_USD >= 0 ? "#10b981" : "#ef4444", tip: "Net Present Value — results.economics.npv_USD" },
    { label: "Payback",           value: `${(econ.paybackPeriod_years ?? 0).toFixed(1)} yrs`, color: "#5ce1e5", tip: "results.economics.paybackPeriod_years" },
  ];

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Chilled Water Cost Structure</p>
      <p className={sc(isDark)}>All values from results.economics.* — direct CoolSim API output</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {kpis.map(({ label, value, color, tip }) => (
          <div key={label} className={`p-2 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`} title={tip}>
            <div className="text-xs mb-0.5" style={{ color }}>{label}</div>
            <div className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{value}</div>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={barData} layout="vertical">
          {grid(isDark)}
          <XAxis type="number" tick={ax(isDark)} tickFormatter={fmtUSD} />
          <YAxis dataKey="name" type="category" tick={ax(isDark)} width={80} />
          <Tooltip {...tt(isDark)} formatter={(v: any) => [fmtUSD(Number(v)), ""]} />
          {barData.map((d, i) => <Bar key={i} dataKey="value" fill={d.fill} radius={[0,3,3,0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Chilled Water: Phase 4 gates visual ─────────────────────────────────────
const ChilledGatesChart: React.FC<{ gates: any; isDark: boolean }> = ({ gates, isDark }) => {
  if (!gates || Object.keys(gates).length === 0) return null;
  const gateColors: Record<string, string> = { PASS: "#10b981", FAIL: "#ef4444" };
  const data = Object.entries(gates).map(([key, val]) => ({
    name: key.replace(/([A-Z])/g, " $1").trim(),
    status: String(val),
    value: String(val) === "PASS" ? 1 : 0,
    fill: gateColors[String(val)] ?? "#6b7280",
  }));

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Phase 4 Compliance Gates</p>
      <p className={sc(isDark)}>results.phase4Gates.* — PASS/FAIL compliance checks from CoolSim</p>
      <div className="grid grid-cols-2 gap-3 mt-2">
        {data.map(({ name, status, fill }) => (
          <div key={name} className={`p-3 rounded-xl border ${isDark ? "bg-[#0a0e27] border-[#3f4a68]" : "bg-white border-gray-200"}`}>
            <div className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{name}</div>
            <span className={`px-3 py-1 rounded-full text-sm font-bold`} style={{ background: `${fill}20`, color: fill }}>
              {status === "PASS" ? "✓ PASS" : "✗ FAIL"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Evaporative: Cooling capacity vs IT load + water evaporation per hour ────
const EvapCoolingCapChart: React.FC<{ data: any[]; isDark: boolean }> = ({ data, isDark }) => {
  const s = useMemo(() => sample(data, 200).map((h: any, i: number) => ({
    h:        h.hour ?? i,
    itLoad:   +(h.itLoadKW          ?? 0).toFixed(2),
    cooling:  +(h.coolingCapacityKW ?? 0).toFixed(2),
    water:    +(h.waterEvaporationLph ?? 0).toFixed(3),
    deficit:  +((h.itLoadKW ?? 0) - (h.coolingCapacityKW ?? 0)).toFixed(2),
  })), [data]);

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Cooling Capacity vs IT Load per Hour (kW)</p>
      <p className={sc(isDark)}>
        hourly_data[i].coolingCapacityKW · itLoadKW · waterEvaporationLph — positive deficit = insufficient cooling
      </p>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={s}>
          <defs>
            <linearGradient id="evapCoolG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} label={{ value: "Hour", position: "insideBottom", offset: -2, fontSize: 9 }} />
          <YAxis yAxisId="l" tick={ax(isDark)} unit=" kW" />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} unit=" L/h" />
          <Tooltip {...tt(isDark)} formatter={(v: any, n: any) => [Number(v).toFixed(3), n]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <ReferenceLine yAxisId="l" y={0} stroke="#6b7280" strokeDasharray="2 2" />
          <Area  yAxisId="l" type="monotone" dataKey="cooling" stroke="#10b981" fill="url(#evapCoolG)" strokeWidth={1.5} name="Cooling Cap kW" dot={false} />
          <Line  yAxisId="l" type="monotone" dataKey="itLoad"  stroke="#5ce1e5" strokeWidth={1.5} name="IT Load kW"      dot={false} />
          <Bar   yAxisId="l" dataKey="deficit" fill="#ef444440" name="Deficit kW" radius={[2,2,0,0]} />
          <Line  yAxisId="r" type="monotone" dataKey="water"   stroke="#3b82f6" strokeWidth={1}   name="Water Evap L/h"  dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Supply vs inlet temp + humidity per hour ────────────────────
const EvapSupplyHumidChart: React.FC<{ data: any[]; isDark: boolean }> = ({ data, isDark }) => {
  const s = useMemo(() => sample(data, 200).map((h: any, i: number) => ({
    h:             h.hour ?? i,
    supplyTemp:    +(h.supplyTempC      ?? 0).toFixed(1),
    supplyHumid:   +(h.supplyHumidity   ?? 0).toFixed(0),
    ambientHumid:  +(h.ambientHumidity  ?? 0).toFixed(0),
    inletTemp:     +(h.inletTempC       ?? 0).toFixed(1),
  })), [data]);

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Supply Air Conditions per Hour</p>
      <p className={sc(isDark)}>
        hourly_data[i].supplyTempC · supplyHumidity · ambientHumidity · inletTempC
      </p>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={s}>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis yAxisId="l" tick={ax(isDark)} unit="°C" />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} unit="%" />
          <Tooltip {...tt(isDark)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line yAxisId="l" type="monotone" dataKey="supplyTemp"   stroke="#10b981" strokeWidth={1.5} name="Supply Temp °C"   dot={false} />
          <Line yAxisId="l" type="monotone" dataKey="inletTemp"    stroke="#ef4444" strokeWidth={1}   name="Inlet Temp °C"    dot={false} />
          <Area yAxisId="r" type="monotone" dataKey="supplyHumid"  stroke="#3b82f6" fill="#3b82f620"  strokeWidth={1}   name="Supply Humidity %" dot={false} />
          <Line yAxisId="r" type="monotone" dataKey="ambientHumid" stroke="#8b5cf6" strokeWidth={1}   name="Ambient Humidity %" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Hourly PUE vs avg PUE and max PUE ──────────────────────────
const EvapPueCompareChart: React.FC<{ data: any[]; resultData: any; isDark: boolean }> = ({ data, resultData, isDark }) => {
  const raw = resultData?.rawEvaporativeData?.results?.performance ?? {};
  const pueAvg = +(raw.pue_average ?? resultData?.pue ?? 0).toFixed(4);
  const pueMax = +(raw.pue_max    ?? resultData?.pue_max ?? 0).toFixed(4);

  const s = useMemo(() => sample(data, 200).map((h: any, i: number) => ({
    h:   h.hour ?? i,
    pue: +(h.pue ?? 0).toFixed(4),
  })), [data]);

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly PUE vs Annual Average & Max</p>
      <p className={sc(isDark)}>
        hourly_data[i].pue vs results.performance.pue_average ({pueAvg}) and pue_max ({pueMax})
      </p>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={s}>
          <defs>
            <linearGradient id="evapPueCmpG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5ce1e5" stopOpacity={0.3}/><stop offset="95%" stopColor="#5ce1e5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} label={{ value: "Hour", position: "insideBottom", offset: -2, fontSize: 9 }} />
          <YAxis tick={ax(isDark)} domain={[1, "auto"]} />
          <Tooltip {...tt(isDark)} formatter={(v: any) => [Number(v).toFixed(4), "PUE"]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {pueAvg > 0 && <ReferenceLine y={pueAvg} stroke="#10b981" strokeDasharray="4 2" label={{ value: `Avg ${pueAvg}`, fontSize: 9, fill: "#10b981" }} />}
          {pueMax > 0 && <ReferenceLine y={pueMax} stroke="#ef4444" strokeDasharray="4 2" label={{ value: `Max ${pueMax}`, fontSize: 9, fill: "#ef4444" }} />}
          <Area type="monotone" dataKey="pue" stroke="#5ce1e5" fill="url(#evapPueCmpG)" strokeWidth={1.5} name="Hourly PUE" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Power breakdown per hour ───────────────────────────────────
const EvapHourlyPower: React.FC<{ data: any[]; isDark: boolean }> = ({ data, isDark }) => {
  const s = useMemo(() => sample(data, 200).map((h: any, i: number) => ({
    h: h.hour ?? i,
    it:      +(h.itLoadKW         ?? 0).toFixed(2),
    fan:     +(h.fanPowerKW       ?? 0).toFixed(3),
    dx:      +(h.dxPowerKW        ?? 0).toFixed(3),
    total:   +(h.totalElectricalKW ?? 0).toFixed(2),
    cooling: +(h.coolingCapacityKW ?? 0).toFixed(2),
  })), [data]);

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Hourly Power Breakdown (kW)</p>
      <p className={sc(isDark)}>hourly_data[i].itLoadKW · fanPowerKW · dxPowerKW · totalElectricalKW · coolingCapacityKW</p>
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={s}>
          <defs>
            {[["itG","#5ce1e5"],["fanG","#10b981"],["dxG","#ef4444"],["totG","#f59e0b"]].map(([id,c]) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c} stopOpacity={0.35}/><stop offset="95%" stopColor={c} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} label={{ value: "Hour", position: "insideBottom", offset: -2, fontSize: 9 }} />
          <YAxis tick={ax(isDark)} />
          <Tooltip {...tt(isDark)} formatter={(v: any, n: any) => [`${v} kW`, n]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey="it"      stroke="#5ce1e5" fill="url(#itG)"  strokeWidth={1.5} name="IT Load kW"       dot={false} />
          <Area type="monotone" dataKey="fan"     stroke="#10b981" fill="url(#fanG)" strokeWidth={1}   name="Fan Power kW"     dot={false} />
          <Area type="monotone" dataKey="dx"      stroke="#ef4444" fill="url(#dxG)"  strokeWidth={1}   name="DX Backup kW"     dot={false} />
          <Line type="monotone" dataKey="total"   stroke="#f59e0b" strokeWidth={1.5} name="Total Elec kW"    dot={false} />
          <Line type="monotone" dataKey="cooling" stroke="#8b5cf6" strokeWidth={1}   name="Cooling Cap kW"   dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: PUE per hour ────────────────────────────────────────────────
const EvapPueChart: React.FC<{ data: any[]; isDark: boolean }> = ({ data, isDark }) => {
  const s = useMemo(() => sample(data, 200).map((h: any, i: number) => ({
    h: h.hour ?? i,
    pue: +(h.pue ?? 0).toFixed(4),
  })), [data]);

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>PUE per Hour</p>
      <p className={sc(isDark)}>hourly_data[i].pue — Power Usage Effectiveness per hour</p>
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={s}>
          <defs>
            <linearGradient id="evapPueG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5ce1e5" stopOpacity={0.4}/><stop offset="95%" stopColor="#5ce1e5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis tick={ax(isDark)} domain={[1, "auto"]} />
          <Tooltip {...tt(isDark)} formatter={(v: any) => [Number(v).toFixed(4), "PUE"]} />
          <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "PUE 1.5 target", fontSize: 9, fill: "#ef4444" }} />
          <Area type="monotone" dataKey="pue" stroke="#5ce1e5" fill="url(#evapPueG)" strokeWidth={1.5} name="PUE" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Temperature per hour (inlet, supply, ambient) ───────────────
const EvapTempChart: React.FC<{ data: any[]; isDark: boolean }> = ({ data, isDark }) => {
  const s = useMemo(() => sample(data, 200).map((h: any, i: number) => ({
    h:        h.hour ?? i,
    ambient:  +(h.ambientTempC  ?? 0).toFixed(1),
    inlet:    +(h.inletTempC    ?? 0).toFixed(1),
    supply:   +(h.supplyTempC   ?? 0).toFixed(1),
    humidity: +(h.ambientHumidity ?? 0).toFixed(0),
  })), [data]);

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Temperature & Humidity per Hour</p>
      <p className={sc(isDark)}>hourly_data[i].ambientTempC · inletTempC · supplyTempC · ambientHumidity</p>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={s}>
          {grid(isDark)}
          <XAxis dataKey="h" tick={ax(isDark)} />
          <YAxis yAxisId="l" tick={ax(isDark)} unit="°C" />
          <YAxis yAxisId="r" orientation="right" tick={ax(isDark)} unit="%" />
          <Tooltip {...tt(isDark)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <ReferenceLine yAxisId="l" y={27} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "ASHRAE 27°C limit", fontSize: 9, fill: "#ef4444" }} />
          <Line yAxisId="l" type="monotone" dataKey="ambient" stroke="#f59e0b" strokeWidth={1}   name="Ambient °C"  dot={false} />
          <Line yAxisId="l" type="monotone" dataKey="inlet"   stroke="#ef4444" strokeWidth={1.5} name="Inlet °C"    dot={false} />
          <Line yAxisId="l" type="monotone" dataKey="supply"  stroke="#10b981" strokeWidth={1}   name="Supply °C"   dot={false} />
          <Area yAxisId="r" type="monotone" dataKey="humidity" stroke="#3b82f6" fill="#3b82f620" strokeWidth={1} name="Humidity %" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Cooling mode distribution ───────────────────────────────────
const EvapModeChart: React.FC<{ data: any[]; isDark: boolean }> = ({ data, isDark }) => {
  const modeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((h: any) => {
      const m = h.coolingMode ?? "UNKNOWN";
      counts[m] = (counts[m] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  if (modeCounts.length === 0) return null;
  const modeColors: Record<string, string> = { IEC: "#10b981", DEC: "#3b82f6", HYBRID: "#8b5cf6", DX_BACKUP: "#ef4444", UNKNOWN: "#6b7280" };

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Cooling Mode Distribution</p>
      <p className={sc(isDark)}>hourly_data[i].coolingMode — IEC / DEC / HYBRID / DX_BACKUP hours</p>
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie data={modeCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {modeCounts.map((d, i) => <Cell key={i} fill={modeColors[d.name] ?? COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip {...tt(isDark)} formatter={(v: any) => [`${v} hrs`, "Hours"]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Evaporative: Annual metrics summary ─────────────────────────────────────
const EvapAnnualSummary: React.FC<{ resultData: any; isDark: boolean }> = ({ resultData, isDark }) => {
  const raw = resultData?.rawEvaporativeData?.results ?? {};
  const assess = resultData?.coolingAdequacy ?? resultData?.rawEvaporativeData?.cooling_assessment ?? {};
  const km = assess?.keyMetrics ?? assess?.key_metrics ?? {};

  const kpis = [
    { label: "Total Electricity", value: `${((raw.energy?.electricity_kwh_total ?? resultData?.totalEnergyConsumption ?? 0) / 1000).toFixed(1)}k kWh`, color: "#5ce1e5" },
    { label: "IT Energy",         value: `${((raw.energy?.it_kwh ?? resultData?.it_kwh ?? 0) / 1000).toFixed(1)}k kWh`,                                color: "#8b5cf6" },
    { label: "Fan Energy",        value: `${(raw.energy?.fan_kwh ?? resultData?.fan_kwh ?? 0).toFixed(0)} kWh`,                                        color: "#10b981" },
    { label: "DX Backup",         value: `${(raw.energy?.dx_kwh ?? resultData?.dx_kwh ?? 0).toFixed(0)} kWh`,                                          color: "#ef4444" },
    { label: "Annual Cost",       value: `$${(raw.cost?.total_energy_cost_usd ?? resultData?.estimatedCost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "#10b981" },
    { label: "CO₂ Total",         value: `${((raw.emissions?.co2_kg_total ?? resultData?.carbonFootprint ?? 0) / 1000).toFixed(1)}k kg`,               color: "#ef4444" },
    { label: "PUE Avg",           value: (raw.performance?.pue_average ?? resultData?.pue ?? 0).toFixed(4),                                            color: "#5ce1e5" },
    { label: "CUE Avg",           value: (raw.performance?.cue_average ?? resultData?.cue ?? 0).toFixed(4),                                            color: "#8b5cf6" },
    { label: "Max Inlet Temp",    value: `${(km.max_inlet_temp_c ?? 0).toFixed(1)} °C`,                                                                color: "#f59e0b" },
    { label: "Cooling Cap Avg",   value: `${(km.cooling_capacity_avg_kw ?? 0).toFixed(2)} kW`,                                                         color: "#10b981" },
    { label: "Failure Hours",     value: `${raw.performance?.cooling_failure_hours ?? resultData?.cooling_failure_hours ?? 0} hrs`,                    color: "#ef4444" },
    { label: "Assessment",        value: assess?.status ?? "—",                                                                                         color: assess?.status === "SUFFICIENT_COOLING" ? "#10b981" : "#ef4444" },
  ];

  const energyPie = [
    { name: "IT Energy",   value: +(raw.energy?.it_kwh  ?? resultData?.it_kwh  ?? 0).toFixed(0), color: "#5ce1e5" },
    { name: "Fan Energy",  value: +(raw.energy?.fan_kwh ?? resultData?.fan_kwh ?? 0).toFixed(0), color: "#10b981" },
    { name: "DX Backup",   value: +(raw.energy?.dx_kwh  ?? resultData?.dx_kwh  ?? 0).toFixed(0), color: "#ef4444" },
    { name: "Pump Energy", value: +(raw.energy?.pump_kwh ?? resultData?.pump_kwh ?? 0).toFixed(0), color: "#3b82f6" },
  ].filter(d => d.value > 0);

  return (
    <div className={`${cc(isDark)} lg:col-span-2`}>
      <p className={tc(isDark)}>Annual Evaporative Cooling Summary</p>
      <p className={sc(isDark)}>results.energy.* · results.cost.* · results.emissions.* · results.performance.* · cooling_assessment.key_metrics.*</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-2 gap-2 content-start">
          {kpis.map(({ label, value, color }) => (
            <div key={label} className={`p-2 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}>
              <div className="text-xs mb-0.5" style={{ color }}>{label}</div>
              <div className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{value}</div>
            </div>
          ))}
        </div>
        <div>
          <p className={`text-xs mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Energy breakdown by component</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={energyPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {energyPie.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip {...tt(isDark)} formatter={(v: any, name: any) => [`${Number(v).toLocaleString()} kWh`, name]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ─── Evaporative: Assessment checks ──────────────────────────────────────────
const EvapAssessmentChart: React.FC<{ resultData: any; isDark: boolean }> = ({ resultData, isDark }) => {
  const assess = resultData?.coolingAdequacy ?? resultData?.rawEvaporativeData?.cooling_assessment ?? {};
  const checks = assess?.checks ?? {};
  const notes: string[] = assess?.engineeringNotes ?? assess?.engineering_notes ?? [];
  const recs: string[] = assess?.recommendations ?? [];

  if (Object.keys(checks).length === 0 && notes.length === 0) return null;

  const checkColors: Record<string, string> = { true: "#10b981", false: "#ef4444" };

  return (
    <div className={cc(isDark)}>
      <p className={tc(isDark)}>Cooling Assessment</p>
      <p className={sc(isDark)}>cooling_assessment.checks · engineering_notes · recommendations</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {Object.entries(checks).map(([k, v]) => (
          <div key={k} className={`p-2 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}>
            <div className={`text-xs mb-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{k.replace(/_/g, " ")}</div>
            <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ background: `${checkColors[String(v)]}20`, color: checkColors[String(v)] ?? "#6b7280" }}>
              {String(v) === "true" ? "✓ PASS" : "✗ FAIL"}
            </span>
          </div>
        ))}
      </div>
      {notes.length > 0 && (
        <div className={`p-2 rounded-lg text-xs mb-2 ${isDark ? "bg-blue-500/10 text-blue-300 border border-blue-500/20" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
          {notes.map((n, i) => <div key={i} className="mb-1 last:mb-0">ℹ {n}</div>)}
        </div>
      )}
      {recs.length > 0 && (
        <div className={`p-2 rounded-lg text-xs ${isDark ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
          {recs.map((r, i) => <div key={i} className="mb-1 last:mb-0">→ {r}</div>)}
        </div>
      )}
    </div>
  );
};


export const SimulationCharts: React.FC<SimulationChartsProps> = ({
  resultData,
  simulationType,
  isDark,
}) => {
  const hourly: any[] = useMemo(() => {
    const p1 = resultData?.results?.hourlyResults;
    if (Array.isArray(p1) && p1.length > 0) return p1;
    const p2 = resultData?.hourlyResults;
    if (Array.isArray(p2) && p2.length > 0) return p2;
    return [];
  }, [resultData]);

  const yearlyData: any[] = resultData?.projection?.yearlyData ?? resultData?.results?.projection?.yearlyData ?? [];
  const proj = resultData?.projection ?? resultData?.results?.projection ?? {};
  const compTable: any[] = resultData?.mlRecommendation?.comparison_table ?? [];
  const modeBreakdown: Record<string, number> = resultData?.airflowViolations?.modeBreakdown ?? {};
  const rackAnalysis = resultData?.rackAnalysis ?? null;

  // Detect technique
  const isChilled = (simulationType || "").toLowerCase() === "water"
    || resultData?.coolingTechnique === "chilled_water"
    || !!(resultData?.results?.metrics?.averageCOP !== undefined && !resultData?.airflowViolations);
  const isAir = resultData?.coolingTechnique === "air_economizer"
    || !!(resultData?.airflowViolations)
    || (simulationType || "").toLowerCase() === "air";
  const isEvap = resultData?.coolingTechnique === "evaporative"
    || (simulationType || "").toLowerCase().includes("evap");

  // Chilled water specific
  const copArray: number[] = Array.isArray(resultData?.copOverTime) ? resultData.copOverTime : [];
  const gates = resultData?.phase4Gates ?? resultData?.results?.phase4Gates ?? {};

  // Air economizer specific
  const hasAirflowData  = hourly.length > 0 && hourly[0]?.requiredAirflow_CFM != null;
  const hasModeData     = Object.keys(modeBreakdown).length > 0;
  const hasPowerBreakdown = hourly.length > 0 && ("fanPower_kW" in (hourly[0] ?? {}) || "mechPower_kW" in (hourly[0] ?? {}));

  // Evaporative specific — hourly_data uses camelCase field names
  const evapHourly: any[] = useMemo(() => {
    const h = resultData?.hourlyData ?? resultData?.rawEvaporativeData?.hourly_data ?? [];
    return Array.isArray(h) ? h : [];
  }, [resultData]);
  const hasEvapHourly = evapHourly.length > 0;

  const hasAnyChart = hourly.length > 0 || yearlyData.length > 0 || compTable.length > 0 || copArray.length > 0 || hasEvapHourly;
  if (!hasAnyChart) return null;

  return (
    <div className={`p-6 rounded-xl mb-6 ${isDark ? "bg-[#1a1f3a]" : "bg-white"} border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
      <h2 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>📊 Visualizations</h2>
      <p className={`text-xs mb-6 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        All values sourced directly from CoolSim API response — hover any chart for exact values
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── CHILLED WATER specific ── */}
        {isChilled && <ChilledAnnualPie resultData={resultData} isDark={isDark} />}
        {isChilled && copArray.length > 0 && <ChilledCopChart copArray={copArray} isDark={isDark} />}
        {isChilled && hourly.length > 0 && <ChilledCoolingLoadChart data={hourly} peakCoolingLoad={resultData?.results?.metrics?.peakCoolingLoad_kW ?? resultData?.peakCoolingLoad_kW ?? 0} isDark={isDark} />}
        {isChilled && hourly.length > 0 && <ChilledHourlyPower data={hourly} isDark={isDark} />}
        {isChilled && hourly.length > 0 && <ChilledWaterUsage data={hourly} isDark={isDark} />}
        {isChilled && <ChilledCostChart resultData={resultData} isDark={isDark} />}
        {isChilled && Object.keys(gates).length > 0 && <ChilledGatesChart gates={gates} isDark={isDark} />}

        {/* ── AIR ECONOMIZER specific ── */}
        {isAir && hasPowerBreakdown && <HourlyPowerBreakdown data={hourly} isDark={isDark} />}
        {isAir && hasAirflowData && <AirflowChart data={hourly} isDark={isDark} />}
        {isAir && hasModeData && <ModePieChart modeBreakdown={modeBreakdown} isDark={isDark} />}
        {isAir && <CostBreakdownChart resultData={resultData} isDark={isDark} />}
        {isAir && rackAnalysis && <RackChart rackAnalysis={rackAnalysis} isDark={isDark} />}
        {isAir && hourly.length > 0 && hourly[0]?.pue != null && <PueCueChart data={hourly} isDark={isDark} />}
        {isAir && hourly.length > 0 && (hourly[0]?.outdoorTempC != null || hourly[0]?.tempC != null) && <TempChart data={hourly} isDark={isDark} />}

        {/* ── EVAPORATIVE specific ── */}
        {isEvap && <EvapAnnualSummary resultData={resultData} isDark={isDark} />}
        {isEvap && hasEvapHourly && <EvapHourlyPower data={evapHourly} isDark={isDark} />}
        {isEvap && hasEvapHourly && <EvapCoolingCapChart data={evapHourly} isDark={isDark} />}
        {isEvap && hasEvapHourly && <EvapPueCompareChart data={evapHourly} resultData={resultData} isDark={isDark} />}
        {isEvap && hasEvapHourly && <EvapTempChart data={evapHourly} isDark={isDark} />}
        {isEvap && hasEvapHourly && <EvapSupplyHumidChart data={evapHourly} isDark={isDark} />}
        {isEvap && hasEvapHourly && <EvapModeChart data={evapHourly} isDark={isDark} />}
        {isEvap && hasEvapHourly && <EvapPueChart data={evapHourly} isDark={isDark} />}
        {isEvap && <EvapAssessmentChart resultData={resultData} isDark={isDark} />}

        {/* ── SHARED ── */}
        <KpiRadar resultData={resultData} isDark={isDark} />
        {compTable.length > 0 && <ComparisonChart rows={compTable} isDark={isDark} />}
        {yearlyData.length > 0 && <ProjectionDetailChart data={yearlyData} proj={proj} isDark={isDark} />}
      </div>
    </div>
  );
};
