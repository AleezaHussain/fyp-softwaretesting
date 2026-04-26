import React, { useState } from "react";
import { Sidebar } from "../components/shared/Sidebar";
import { useThemeStore } from "../hooks/useTheme";
import {
  Wind,
  Droplets,
  Thermometer,
  Zap,
  DollarSign,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle,
  XCircle,
  BookOpen,
  Settings,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

// ── tiny helpers ──────────────────────────────────────────────────────────────

const Badge: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <span
    className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}
  >
    {text}
  </span>
);

const FieldRow: React.FC<{
  name: string;
  unit?: string;
  default_?: string;
  range?: string;
  description: string;
  isDark: boolean;
}> = ({ name, unit, default_, range, description, isDark }) => (
  <tr className={`border-b ${isDark ? "border-gray-700" : "border-gray-100"}`}>
    <td
      className={`py-2.5 pr-4 font-mono text-xs font-semibold whitespace-nowrap ${isDark ? "text-blue-300" : "text-blue-700"}`}
    >
      {name}
    </td>
    <td
      className={`py-2.5 pr-4 text-xs whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}
    >
      {unit ?? "—"}
    </td>
    <td
      className={`py-2.5 pr-4 text-xs whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}
    >
      {default_ ?? "—"}
    </td>
    <td
      className={`py-2.5 pr-4 text-xs whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}
    >
      {range ?? "—"}
    </td>
    <td
      className={`py-2.5 text-xs leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}
    >
      {description}
    </td>
  </tr>
);

const Section: React.FC<{
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  isDark: boolean;
}> = ({ title, icon: Icon, iconColor, children, isDark }) => {
  const [open, setOpen] = useState(true);
  return (
    <div
      className={`rounded-2xl border mb-4 overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left ${isDark ? "hover:bg-gray-750" : "hover:bg-gray-50"} transition-colors`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span
          className={`font-semibold text-base flex-1 ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
};

const FieldTable: React.FC<{
  rows: {
    name: string;
    unit?: string;
    default_?: string;
    range?: string;
    description: string;
  }[];
  isDark: boolean;
}> = ({ rows, isDark }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr
          className={`text-xs uppercase tracking-wide ${isDark ? "text-gray-500" : "text-gray-400"}`}
        >
          <th className="pb-2 pr-4 text-left font-semibold">Field</th>
          <th className="pb-2 pr-4 text-left font-semibold">Unit</th>
          <th className="pb-2 pr-4 text-left font-semibold">Default</th>
          <th className="pb-2 pr-4 text-left font-semibold">Range</th>
          <th className="pb-2 text-left font-semibold">What it does</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <FieldRow key={r.name} {...r} isDark={isDark} />
        ))}
      </tbody>
    </table>
  </div>
);

const OutputCard: React.FC<{
  metric: string;
  unit: string;
  good: string;
  bad: string;
  tip: string;
  isDark: boolean;
}> = ({ metric, unit, good, bad, tip, isDark }) => (
  <div
    className={`rounded-xl border p-4 ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}
  >
    <div className="flex items-start justify-between gap-2 mb-2">
      <span
        className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}
      >
        {metric}
      </span>
      <Badge
        text={unit}
        color={
          isDark ? "bg-gray-600 text-gray-300" : "bg-gray-200 text-gray-600"
        }
      />
    </div>
    <p className={`text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
      {tip}
    </p>
    <div className="flex gap-2 flex-wrap">
      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
        ✓ Good: {good}
      </span>
      <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        ✗ Concern: {bad}
      </span>
    </div>
  </div>
);

const TechHeader: React.FC<{
  color: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  tags: string[];
  isDark: boolean;
}> = ({ color, icon: Icon, title, subtitle, tags, isDark }) => (
  <div className={`rounded-2xl p-6 mb-6 ${color}`}>
    <div className="flex items-center gap-4 mb-3">
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-white/80 text-sm">{subtitle}</p>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <span
          key={t}
          className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium"
        >
          {t}
        </span>
      ))}
    </div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  "Overview",
  "Air-Side Economizer",
  "Chilled Water",
  "Evaporative Cooling",
  "Reading Results",
];

const TechnicalGuide: React.FC = () => {
  const { isDark } = useThemeStore();
  const [activeTab, setActiveTab] = useState(0);

  const bg = isDark ? "bg-[#0d1117]" : "bg-gray-50";
  const card = isDark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";
  const text = isDark ? "text-white" : "text-gray-900";
  const muted = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`flex h-screen ${bg}`}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto ml-56">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Page header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl lg:text-4xl font-bold mb-1 ${text}`}>
                <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                  Technical
                </span>{" "}
                Guide
              </h1>
              <p className={`text-base ${muted}`}>
                Complete reference for all input fields, physics, and output
                metrics across all three cooling techniques
              </p>
            </div>
          </div>

          {/* Tab bar */}
          <div
            className={`flex gap-1 p-1 rounded-xl mb-8 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
          >
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === i
                    ? isDark
                      ? "bg-blue-600 text-white"
                      : "bg-white text-blue-700 shadow"
                    : isDark
                      ? "text-gray-400 hover:text-white"
                      : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── TAB 0: Overview ── */}
          {activeTab === 0 && (
            <OverviewTab
              isDark={isDark}
              card={card}
              text={text}
              muted={muted}
            />
          )}
          {/* ── TAB 1: Air-Side ── */}
          {activeTab === 1 && <AirSideTab isDark={isDark} />}
          {/* ── TAB 2: Chilled Water ── */}
          {activeTab === 2 && <ChilledWaterTab isDark={isDark} />}
          {/* ── TAB 3: Evaporative ── */}
          {activeTab === 3 && <EvaporativeTab isDark={isDark} />}
          {/* ── TAB 4: Reading Results ── */}
          {activeTab === 4 && (
            <ResultsTab isDark={isDark} card={card} text={text} muted={muted} />
          )}
        </div>
      </main>
    </div>
  );
};

export default TechnicalGuide;

// ── Tab: Overview ─────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{
  isDark: boolean;
  card: string;
  text: string;
  muted: string;
}> = ({ isDark, card, text, muted }) => (
  <div className="space-y-6">
    <div className={`rounded-2xl border p-6 ${card}`}>
      <h3 className={`font-bold text-lg mb-3 ${text}`}>What is this system?</h3>
      <p className={`text-sm leading-relaxed mb-4 ${muted}`}>
        This platform simulates three data center cooling strategies over a full
        year (8,760 hours) using real weather data from EnergyPlus and a
        CloudSim Plus workload engine. It calculates energy consumption, carbon
        emissions, water usage, and operating costs — then recommends the best
        technique for your specific location and workload.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: Wind,
            color: "bg-blue-500",
            title: "Air-Side Economizer",
            desc: "Uses outdoor air to cool servers. Best in cool, dry climates. Zero water use.",
          },
          {
            icon: Thermometer,
            color: "bg-red-500",
            title: "Chilled Water",
            desc: "Mechanical refrigeration with water loops. Most reliable for hot climates and AI workloads.",
          },
          {
            icon: Droplets,
            color: "bg-green-500",
            title: "Evaporative Cooling",
            desc: "Evaporates water to cool air. Extremely energy-efficient but limited by humidity.",
          },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div
            key={title}
            className={`rounded-xl border p-4 ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}
          >
            <div
              className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-3`}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className={`font-semibold text-sm mb-1 ${text}`}>{title}</p>
            <p className={`text-xs leading-relaxed ${muted}`}>{desc}</p>
          </div>
        ))}
      </div>
    </div>

    <div className={`rounded-2xl border p-6 ${card}`}>
      <h3 className={`font-bold text-lg mb-4 ${text}`}>
        How to use this system — step by step
      </h3>
      <ol className="space-y-3">
        {[
          [
            "Select a technique",
            "Go to Simulations → New Simulation. Pick Air-Side, Chilled Water, or Evaporative.",
          ],
          [
            "Pick your location",
            "Use the Location Weather Data picker to select your country and city. The system auto-downloads 8,760 hours of real weather data.",
          ],
          [
            "Configure your data center",
            "Fill in server count, rack density, workload type, and economic parameters. Hover over any field for a tooltip.",
          ],
          [
            "Run the simulation",
            "Click Run Simulation. The CloudSim engine generates an AI-aware workload profile and the physics engine calculates cooling performance hour by hour.",
          ],
          [
            "Analyse results",
            "View PUE, energy, cost, carbon, and water metrics. The ML recommender compares all three techniques and explains which is best for your setup.",
          ],
        ].map(([title, desc], i) => (
          <li key={i} className="flex gap-3">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${isDark ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}`}
            >
              {i + 1}
            </span>
            <div>
              <p className={`font-semibold text-sm ${text}`}>{title}</p>
              <p className={`text-xs ${muted}`}>{desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>

    <div className={`rounded-2xl border p-6 ${card}`}>
      <h3 className={`font-bold text-lg mb-4 ${text}`}>
        Key metrics explained simply
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          [
            "PUE",
            "Power Usage Effectiveness",
            "Total facility power ÷ IT power. 1.0 = perfect. 1.5 = 50% overhead. Lower is better.",
          ],
          [
            "CUE",
            "Carbon Usage Effectiveness",
            "kg of CO₂ emitted per kWh of IT work. Lower = greener.",
          ],
          [
            "WUE",
            "Water Usage Effectiveness",
            "Litres of water used per kWh of IT work. 0 = no water. Lower is better.",
          ],
          [
            "COP",
            "Coefficient of Performance",
            "Cooling energy delivered ÷ electrical energy consumed. Higher = more efficient chiller.",
          ],
          [
            "CAPEX",
            "Capital Expenditure",
            "Upfront cost to install the cooling system.",
          ],
          [
            "OpEx",
            "Operating Expenditure",
            "Annual running cost (electricity + water + carbon tax).",
          ],
          [
            "NPV",
            "Net Present Value",
            "Total financial value over 15 years. Positive = profitable investment.",
          ],
          [
            "LCCP",
            "Life Cycle Cost of Plant",
            "Total cost over the plant's lifetime including CAPEX + OpEx.",
          ],
        ].map(([abbr, full, desc]) => (
          <div
            key={abbr}
            className={`rounded-xl p-3 border ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`font-bold text-sm ${isDark ? "text-blue-300" : "text-blue-700"}`}
              >
                {abbr}
              </span>
              <span className={`text-xs ${muted}`}>— {full}</span>
            </div>
            <p className={`text-xs ${muted}`}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Tab: Air-Side Economizer ──────────────────────────────────────────────────

const AirSideTab: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div>
    <TechHeader
      color="bg-gradient-to-r from-blue-600 to-blue-400"
      icon={Wind}
      title="Air-Side Economizer"
      subtitle="Uses outdoor air to offset mechanical cooling. Best for cool, dry climates."
      tags={[
        "Zero water use",
        "Low CAPEX",
        "Climate-dependent",
        "CloudSim enabled",
      ]}
      isDark={isDark}
    />

    <div
      className={`rounded-xl border p-4 mb-6 ${isDark ? "bg-blue-900/20 border-blue-700" : "bg-blue-50 border-blue-200"}`}
    >
      <p
        className={`text-sm leading-relaxed ${isDark ? "text-blue-200" : "text-blue-800"}`}
      >
        <strong>How it works:</strong> When outdoor air is cool and dry enough,
        it is drawn directly into the data center to absorb server heat — no
        compressor needed. A decision algorithm switches between three modes:
        <strong> FULL_ECON</strong> (outdoor air only),{" "}
        <strong>PARTIAL_TRIM</strong> (mixed), and
        <strong> MECHANICAL_ONLY</strong> (compressor backup). The simulation
        runs this decision every hour for 8,760 hours.
      </p>
    </div>

    <Section
      title="Server Configuration"
      icon={Settings}
      iconColor="bg-blue-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Server Type",
            unit: "dropdown",
            default_: "From DB",
            description:
              "Select your server model from the database. This auto-fills idle power, max power, and utilization percentages. Choosing a high-density AI server will increase cooling demand significantly.",
          },
          {
            name: "Number of Racks",
            unit: "racks",
            default_: "5",
            range: "1–100",
            description:
              "Total number of server racks in your data center. More racks = more heat = more cooling needed. Each rack contains 'Servers per Rack' servers.",
          },
          {
            name: "Servers per Rack",
            unit: "servers",
            default_: "10",
            range: "1–50",
            description:
              "How many servers fit in each rack. Combined with Number of Racks, this gives total server count. Higher density increases heat per rack.",
          },
          {
            name: "Avg Utilization",
            unit: "%",
            default_: "From server DB",
            description:
              "Average CPU load across all servers. Auto-filled from the selected server's typical utilization. Higher utilization = more heat generated.",
          },
          {
            name: "Peak Utilization",
            unit: "%",
            default_: "From server DB",
            description:
              "Maximum CPU load during peak periods (e.g., 2 PM). Used to size the cooling system for worst-case conditions.",
          },
        ]}
      />
    </Section>

    <Section
      title="Fan Configuration"
      icon={Wind}
      iconColor="bg-sky-500"
      isDark={isDark}
    >
      <p
        className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}
      >
        Fan efficiency is measured in W/CFM — watts consumed per cubic foot per
        minute of airflow. Lower = more efficient. You can mix fan types to
        reflect your real hardware.
      </p>
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Best-in-Class Fans",
            unit: "W/CFM + count",
            default_: "0.35 W/CFM, 2 fans",
            range: "0.3–0.4 W/CFM",
            description:
              "EC (electronically commutated) motors. Most efficient. Use these if you have modern variable-speed fans.",
          },
          {
            name: "Average Fans",
            unit: "W/CFM + count",
            default_: "0.60 W/CFM, 4 fans",
            range: "0.5–0.7 W/CFM",
            description:
              "Standard AC motor fans. Typical in most data centers built in the last 10 years.",
          },
          {
            name: "Legacy Fans",
            unit: "W/CFM + count",
            default_: "1.0 W/CFM, 0 fans",
            range: "0.8–1.2 W/CFM",
            description:
              "Old AC motor fans. Least efficient. If you have these, replacing them with EC fans is the single biggest energy saving you can make.",
          },
        ]}
      />
    </Section>

    <Section
      title="Physical Air Parameters"
      icon={Thermometer}
      iconColor="bg-orange-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Supply Air Temp",
            unit: "°C",
            default_: "18",
            range: "5–30",
            description:
              "Temperature of air entering server racks. ASHRAE recommends 18–27°C. Lower = better cooling but more energy. 18°C is the standard safe setpoint.",
          },
          {
            name: "Return Air Temp",
            unit: "°C",
            default_: "30",
            range: "10–50",
            description:
              "Temperature of hot air leaving server racks. Typically 10–15°C above supply. Higher return temp means servers are extracting more heat per unit of airflow.",
          },
          {
            name: "Airflow (CFM)",
            unit: "CFM",
            default_: "2000",
            range: "100–100,000",
            description:
              "Total airflow capacity of your cooling system in Cubic Feet per Minute. The simulation checks if this is enough for your IT load. If not, it flags an AIRFLOW VIOLATION and recommends liquid cooling.",
          },
          {
            name: "ΔT (Delta-T)",
            unit: "°C",
            default_: "12",
            range: "1–40",
            description:
              "Temperature difference between return and supply air (Return − Supply). 12°C is standard. A larger ΔT means each cubic foot of air removes more heat, so you need less airflow.",
          },
        ]}
      />
    </Section>

    <Section
      title="Economizer Control Settings"
      icon={Settings}
      iconColor="bg-green-500"
      isDark={isDark}
    >
      <p
        className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}
      >
        These thresholds control when the system switches between free cooling
        and mechanical cooling. A 2°C hysteresis buffer prevents rapid switching
        (chattering).
      </p>
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Economizer Enable Temp",
            unit: "°C",
            default_: "24",
            range: "10–30",
            description:
              "Maximum outdoor temperature at which free cooling is allowed. If outdoor temp ≤ this value AND humidity is OK → FULL_ECON mode. 24°C is the ASHRAE recommended threshold.",
          },
          {
            name: "Max Outdoor Humidity",
            unit: "%",
            default_: "60",
            range: "40–80",
            description:
              "Maximum relative humidity for full economizer operation. Above this, moisture ingress risks condensation on servers. If humidity > this → PARTIAL_TRIM mode (20% outdoor air only).",
          },
          {
            name: "Min Outdoor Air Fraction",
            unit: "fraction",
            default_: "0.2",
            range: "0.1–0.5",
            description:
              "In PARTIAL_TRIM mode, this fraction of air comes from outside. 0.2 = 20% outdoor air. Provides ventilation while limiting humidity ingress.",
          },
        ]}
      />
    </Section>

    <Section
      title="Financial Projection (5-Year)"
      icon={DollarSign}
      iconColor="bg-emerald-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Country / Tariff",
            unit: "dropdown",
            default_: "—",
            description:
              "Selects your electricity tariff ($/kWh) and grid CO₂ factor (kg/kWh) from regional data. This directly affects annual cost and carbon tax calculations.",
          },
          {
            name: "Annual Electricity Inflation",
            unit: "%/yr",
            default_: "3.5",
            range: "0–15",
            description:
              "How much electricity prices rise each year. The 5-year projection compounds this rate. 3.5% is the global average; some regions see 5–8%.",
          },
          {
            name: "Carbon Price",
            unit: "$/ton CO₂",
            default_: "126",
            range: "0–200",
            description:
              "Current carbon tax rate. Applied to your annual CO₂ emissions. The IPCC 2030 pathway target is $254/ton.",
          },
          {
            name: "Carbon Price Growth",
            unit: "%/yr",
            default_: "15",
            range: "0–20",
            description:
              "Annual escalation of carbon tax. 15% matches EU ETS historical trend. This makes carbon-heavy techniques increasingly expensive over time.",
          },
          {
            name: "Climate Temp Offset",
            unit: "°C",
            default_: "0",
            description:
              "Simulates climate change impact. Each +1°C reduces free-cooling hours by ~3%. Set to 1.5°C for RCP 4.5 or 3°C for RCP 8.5 scenarios.",
          },
        ]}
      />
    </Section>

    <Section
      title="CloudSim Workload Engine"
      icon={Zap}
      iconColor="bg-purple-500"
      isDark={isDark}
    >
      <p
        className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}
      >
        CloudSim Plus generates a realistic hourly IT load profile instead of
        using a flat utilization curve. It simulates VM scheduling, task
        arrivals, and diurnal patterns (peak at 2 PM, trough at 4 AM).
      </p>
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "AI Workload Mode",
            unit: "dropdown",
            default_: "AI_TRAINING",
            description:
              "AI_TRAINING: sustained 85–95% load (GPU batch jobs). AI_INFERENCE: bursty 25% baseline with 85–95% spikes. MIXED: 60% enterprise + 40% AI training. ENTERPRISE: steady 50–65% load.",
          },
          {
            name: "Compute Intensity Factor",
            unit: "multiplier",
            default_: "1.2",
            description:
              "Scales the base IT load. 1.0 = standard servers. 1.8 = AI training (sustained high load). 1.4 = AI inference. Applied on top of the CloudSim-generated profile.",
          },
        ]}
      />
    </Section>
  </div>
);

// ── Tab: Chilled Water ────────────────────────────────────────────────────────

const ChilledWaterTab: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div>
    <TechHeader
      color="bg-gradient-to-r from-red-600 to-orange-500"
      icon={Thermometer}
      title="Chilled Water System"
      subtitle="Mechanical refrigeration with water loops. The only technique that guarantees ASHRAE thermal compliance."
      tags={[
        "ASHRAE compliant",
        "High CAPEX",
        "Water intensive",
        "Best for AI workloads",
      ]}
      isDark={isDark}
    />

    <div
      className={`rounded-xl border p-4 mb-6 ${isDark ? "bg-red-900/20 border-red-700" : "bg-red-50 border-red-200"}`}
    >
      <p
        className={`text-sm leading-relaxed ${isDark ? "text-red-200" : "text-red-800"}`}
      >
        <strong>How it works:</strong> A chiller uses vapour-compression
        refrigeration to cool water to 7°C. This chilled water circulates
        through CRAH (Computer Room Air Handler) units that cool server racks.
        Efficiency (COP) depends on chilled water supply temperature and
        condenser water temperature. Variable-speed pumps and cooling tower fans
        follow affinity laws (power ∝ speed³).
      </p>
    </div>

    <Section
      title="Weather Data"
      icon={Wind}
      iconColor="bg-blue-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Location Picker",
            unit: "Country → City",
            default_: "—",
            description:
              "Select your data center location. The system downloads 8,760 hours of real EPW weather data from EnergyPlus. The chilled water system uses dry_bulb_c, wet_bulb_c, relative_humidity, and atmospheric_pressure_pa.",
          },
          {
            name: "Warming Delta (ΔT)",
            unit: "°C",
            default_: "0.0",
            range: "0–5",
            description:
              "Climate change offset added to every hourly temperature. 0 = current climate. 1.5°C = RCP 4.5 (moderate warming). 3°C = RCP 8.5 (high emissions scenario). Increases cooling load and water consumption.",
          },
        ]}
      />
    </Section>

    <Section
      title="Site Parameters"
      icon={Settings}
      iconColor="bg-gray-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Altitude",
            unit: "m or ft",
            default_: "0",
            description:
              "Elevation of your data center site. Higher altitude = lower air density = fans must work harder. Denver (1,609m) requires ~15% more fan power than Miami (sea level). Toggle between meters and feet.",
          },
        ]}
      />
    </Section>

    <Section
      title="IT Infrastructure & Workload"
      icon={Zap}
      iconColor="bg-purple-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Number of Racks",
            unit: "racks",
            default_: "5",
            description:
              "Total server racks. Multiplied by Servers per Rack to get total server count.",
          },
          {
            name: "Servers per Rack",
            unit: "servers",
            default_: "10",
            description:
              "Servers in each rack. Combined with rack count determines total IT load.",
          },
          {
            name: "Server Idle Power",
            unit: "W",
            default_: "150",
            description:
              "Power consumed by each server at 0% CPU utilization. Represents the baseline electrical load even when idle.",
          },
          {
            name: "Server Max Power",
            unit: "W",
            default_: "500",
            description:
              "Power consumed at 100% CPU utilization. The simulation interpolates between idle and max based on workload.",
          },
          {
            name: "Workload Type",
            unit: "dropdown",
            default_: "enterprise",
            description:
              "AI Training: 96% avg utilization, 3-year hardware refresh, 15% throttling penalty. AI Inference: bursty load. Enterprise: 60% avg utilization, 5-year refresh. Affects total IT load and hardware degradation.",
          },
          {
            name: "Avg CPU Utilization",
            unit: "%",
            default_: "60",
            range: "0–100",
            description:
              "Average CPU load across all servers. Directly scales IT power between idle and max. 60% is typical enterprise; AI training runs at 85–96%.",
          },
        ]}
      />
    </Section>

    <Section
      title="Water Stress Level"
      icon={Droplets}
      iconColor="bg-blue-500"
      isDark={isDark}
    >
      <p
        className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}
      >
        Controls the WUE (Water Usage Effectiveness) compliance threshold. In
        water-scarce regions, a penalty is applied.
      </p>
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Water Stress Level",
            unit: "dropdown",
            default_: "low",
            description:
              "Low: WUE threshold 2.0 L/kWh (e.g., Seattle). Low-Medium: 1.8. Medium-High: 1.5. High: 1.2 (e.g., Denver). Very High: 0.8 (e.g., Phoenix). Exceeding the threshold triggers a FAIL on the Water Constraint gate.",
          },
        ]}
      />
    </Section>

    <Section
      title="Mechanical Specs (Chiller)"
      icon={Settings}
      iconColor="bg-red-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Chiller Type",
            unit: "dropdown",
            default_: "air_cooled_scroll",
            description:
              "Air-Cooled Scroll: COP 2.8–3.2, no cooling tower, simpler. Air-Cooled Screw: COP 3.0–3.8, better part-load efficiency. Water-Cooled Screw: COP 4.5–6.5, highest efficiency but needs cooling tower and more water.",
          },
          {
            name: "Supply Water Temp",
            unit: "°C",
            default_: "7.0",
            range: "5–15",
            description:
              "Chilled water leaving the chiller. Lower = better server cooling but chiller works harder (lower COP). 7°C is standard. Raising to 10–12°C (ASHRAE A2 class) can improve COP by 15–20%.",
          },
          {
            name: "Fouling Factor",
            unit: "multiplier",
            default_: "1.0",
            range: "1.0–1.3",
            description:
              "Heat exchanger degradation due to scale/biofilm buildup. 1.0 = new/clean. 1.1 = 1 year old. 1.3 = heavily fouled. Increases chiller energy consumption proportionally.",
          },
        ]}
      />
    </Section>

    <Section
      title="Economic & Environmental"
      icon={DollarSign}
      iconColor="bg-emerald-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Base Electricity Rate",
            unit: "$/kWh",
            default_: "0.12",
            description:
              "Your electricity tariff. US average is $0.12. Europe: $0.20–0.35. This is the single biggest driver of annual OpEx.",
          },
          {
            name: "Time-of-Use (TOU)",
            unit: "toggle",
            default_: "off",
            description:
              "Enable peak/off-peak pricing. Peak hours (12:00–18:00) are charged at Peak Multiplier × base rate. Off-peak (22:00–06:00) at Off-Peak Multiplier × base rate. Incentivises shifting load to nights.",
          },
          {
            name: "Peak Multiplier",
            unit: "×",
            default_: "1.5",
            description:
              "Rate multiplier during peak hours (noon–6 PM). 1.5 = 50% more expensive. Only active when TOU is enabled.",
          },
          {
            name: "Off-Peak Multiplier",
            unit: "×",
            default_: "0.7",
            description:
              "Rate multiplier during off-peak hours (10 PM–6 AM). 0.7 = 30% cheaper. Only active when TOU is enabled.",
          },
          {
            name: "Carbon Intensity",
            unit: "kg CO₂/kWh",
            default_: "0.5",
            description:
              "Your grid's carbon emissions per kWh. Coal-heavy grids: 0.8–1.0. Gas: 0.4–0.5. Renewables: 0.05–0.1. Multiplied by total energy to get annual CO₂ emissions.",
          },
          {
            name: "Refrigerant Type",
            unit: "dropdown",
            default_: "R-134a",
            description:
              "R-134a: GWP 1,430 (being phased out). R-1234yf: GWP 4 (low-GWP replacement). R-410A: GWP 2,088 (common but high impact). Affects refrigerant leakage carbon liability.",
          },
          {
            name: "Carbon Tax 2030",
            unit: "$/ton CO₂",
            default_: "254",
            description:
              "Target carbon price for 2030. $254/ton is the IPCC 1.5°C pathway. Applied to annual CO₂ emissions to calculate carbon tax cost. Enable IPCC Pathway to auto-set this.",
          },
        ]}
      />
    </Section>
  </div>
);

// ── Tab: Evaporative Cooling ──────────────────────────────────────────────────

const EvaporativeTab: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div>
    <TechHeader
      color="bg-gradient-to-r from-green-600 to-teal-500"
      icon={Droplets}
      title="Evaporative Cooling"
      subtitle="Leverages latent heat of vaporisation. Near-ideal PUE but limited by ambient humidity."
      tags={["PUE ~1.002", "Low OpEx", "Humidity-limited", "IEC/DEC modes"]}
      isDark={isDark}
    />

    <div
      className={`rounded-xl border p-4 mb-6 ${isDark ? "bg-green-900/20 border-green-700" : "bg-green-50 border-green-200"}`}
    >
      <p
        className={`text-sm leading-relaxed ${isDark ? "text-green-200" : "text-green-800"}`}
      >
        <strong>How it works:</strong> Water evaporates through a cellulose
        media pad, absorbing heat from the air (latent heat of vaporisation =
        2,260 kJ/kg). Supply temperature is: T_supply = T_dry_bulb − η ×
        (T_dry_bulb − T_wet_bulb), where η is saturation effectiveness (60–95%).
        A lumped capacitance model (C_total = 45 kJ/K) prevents instant
        temperature spikes. A DX mechanical backup activates when evaporative
        capacity is insufficient.
      </p>
    </div>

    <Section
      title="Server & Workload"
      icon={Settings}
      iconColor="bg-green-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Total Servers",
            unit: "servers",
            default_: "50",
            description:
              "Total number of servers across all racks. Combined with server type to calculate total IT heat load.",
          },
          {
            name: "Servers per Rack",
            unit: "servers",
            default_: "10",
            description:
              "Rack density. Used to calculate per-rack airflow requirements and detect hotspots.",
          },
          {
            name: "Server Type",
            unit: "dropdown",
            default_: "From DB",
            description:
              "Selects server power specs from the database. Max power and idle power determine the IT load range.",
          },
          {
            name: "Power Utilization Model",
            unit: "dropdown",
            default_: "linear",
            description:
              "How server power scales with CPU load. Linear: P = P_idle + (P_max − P_idle) × utilization. This is the standard model for most servers.",
          },
        ]}
      />
    </Section>

    <Section
      title="Rack Geometry & Airflow"
      icon={Wind}
      iconColor="bg-teal-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Rack Height",
            unit: "U",
            default_: "42",
            description:
              "Standard rack unit height. 42U is the industry standard full-height rack. Affects thermal mass calculation.",
          },
          {
            name: "Front-to-Back Airflow",
            unit: "toggle",
            default_: "on",
            description:
              "Standard data center airflow direction. Front = cold aisle intake, back = hot aisle exhaust. Disable only for non-standard rack orientations.",
          },
          {
            name: "Airflow Quality Preset",
            unit: "dropdown",
            default_: "typical",
            description:
              "Excellent: 2% bypass (contained aisle design). Typical: 10% bypass (standard DC). Poor: 20%+ bypass (open floor). Custom: set bypass and recirculation manually.",
          },
          {
            name: "Air Bypass Fraction",
            unit: "%",
            default_: "10",
            range: "0–40",
            description:
              "Percentage of supply air that bypasses servers without cooling them. Higher bypass = less effective cooling = higher inlet temperatures.",
          },
          {
            name: "Hot Air Recirculation",
            unit: "%",
            default_: "5",
            range: "0–40",
            description:
              "Percentage of hot exhaust air that mixes back into the supply. Raises effective inlet temperature. Minimised by hot/cold aisle containment.",
          },
        ]}
      />
    </Section>

    <Section
      title="Thermal Mass"
      icon={Thermometer}
      iconColor="bg-orange-500"
      isDark={isDark}
    >
      <p
        className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}
      >
        Thermal mass determines how quickly the room heats up or cools down.
        Higher mass = slower temperature changes = more stable environment.
      </p>
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Rack Thermal Mass",
            unit: "kJ/K",
            default_: "15",
            description:
              "Heat capacity of server racks and equipment. 15 kJ/K is the design default. Higher values mean the room takes longer to heat up during a cooling failure.",
          },
          {
            name: "Enclosure Thermal Mass",
            unit: "kJ/K",
            default_: "30",
            description:
              "Heat capacity of the building/container structure. 30 kJ/K for standard containers. Prefab micro-DCs: 45 kJ/K. Total thermal mass = rack + enclosure.",
          },
        ]}
      />
    </Section>

    <Section
      title="Evaporative Physics"
      icon={Droplets}
      iconColor="bg-blue-500"
      isDark={isDark}
    >
      <p
        className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}
      >
        These parameters control the core evaporative cooling calculation:
        T_supply = T_db − η × (T_db − T_wb)
      </p>
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Cooling Architecture",
            unit: "dropdown",
            default_: "IEC",
            description:
              "IEC (Indirect Evaporative Cooling): water-side heat exchanger, no humidity added to supply air. DEC (Direct): water evaporates directly into supply air, adds humidity. IEC is safer for servers.",
          },
          {
            name: "Media Type",
            unit: "dropdown",
            default_: "cellulose",
            description:
              "Cellulose pads: standard, 85–90% effectiveness, low cost. Plastic: 70–80%, longer life. Rigid: 90–95%, highest performance. Affects saturation effectiveness.",
          },
          {
            name: "Saturation Effectiveness",
            unit: "%",
            default_: "85",
            range: "60–95",
            description:
              "How efficiently the media cools the air toward wet-bulb temperature. 85% means the supply air reaches 85% of the way from dry-bulb to wet-bulb temperature. Higher = better cooling.",
          },
          {
            name: "Face Velocity",
            unit: "m/s",
            default_: "2.0",
            description:
              "Air speed through the evaporative media. 1.5–2.5 m/s is optimal. Too fast = reduced effectiveness. Too slow = insufficient airflow for IT load.",
          },
          {
            name: "Wetting Efficiency",
            unit: "%",
            default_: "95",
            range: "0–100",
            description:
              "How evenly water is distributed across the media surface. 95% = nearly uniform wetting. Lower values create dry spots that reduce cooling effectiveness.",
          },
        ]}
      />
    </Section>

    <Section
      title="Water System"
      icon={Droplets}
      iconColor="bg-cyan-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Water Source",
            unit: "dropdown",
            default_: "municipal",
            description:
              "Municipal: treated tap water, standard quality. Affects water cost and treatment requirements.",
          },
          {
            name: "Cycles of Concentration",
            unit: "cycles",
            default_: "5",
            description:
              "How many times water is reused before blowdown. Higher = less water waste but more mineral buildup. 5 cycles is standard. Affects total water consumption calculation.",
          },
          {
            name: "Tank Volume",
            unit: "L",
            default_: "5000",
            description:
              "Water storage tank capacity. Larger tanks provide longer runtime during supply interruptions. 5,000L is typical for a small-medium DC.",
          },
          {
            name: "Low Water Cutoff",
            unit: "%",
            default_: "10",
            description:
              "Tank level at which the system shuts down evaporative cooling and switches to DX backup. 10% = system stops when tank is 10% full.",
          },
        ]}
      />
    </Section>

    <Section
      title="Cost & Environmental"
      icon={DollarSign}
      iconColor="bg-emerald-500"
      isDark={isDark}
    >
      <FieldTable
        isDark={isDark}
        rows={[
          {
            name: "Electricity Rate",
            unit: "$/kWh",
            default_: "0.12",
            description:
              "Your electricity tariff. Evaporative cooling uses very little electricity (fans only, no compressor), so this has less impact than for chilled water.",
          },
          {
            name: "Water Rate",
            unit: "$/L",
            default_: "0.001",
            description:
              "Cost per litre of water. $0.001/L = $1/m³, typical municipal rate. In water-scarce regions (Phoenix), this can be 5–10× higher.",
          },
          {
            name: "Grid Emissions Factor",
            unit: "kg CO₂/kWh",
            default_: "0.45",
            description:
              "Carbon intensity of your electricity grid. Evaporative cooling's near-zero electricity use means very low carbon emissions even on a dirty grid.",
          },
          {
            name: "Annual Electricity Inflation",
            unit: "%/yr",
            default_: "4",
            description:
              "Projected annual increase in electricity prices. Compounds over the 5-year projection period.",
          },
          {
            name: "Annual Water Inflation",
            unit: "%/yr",
            default_: "3",
            description:
              "Projected annual increase in water prices. Water scarcity is increasing globally, making this an important long-term cost driver.",
          },
          {
            name: "Carbon Price",
            unit: "$/ton CO₂",
            default_: "50",
            description:
              "Current carbon tax. Applied to annual CO₂ emissions. Evaporative cooling's low electricity use means minimal carbon tax exposure.",
          },
          {
            name: "Renewable Energy %",
            unit: "%",
            default_: "0",
            range: "0–100",
            description:
              "Percentage of your electricity from renewable sources. Reduces effective carbon emissions for market-based accounting. 100% = zero carbon from electricity.",
          },
        ]}
      />
    </Section>
  </div>
);

// ── Tab: Reading Results ──────────────────────────────────────────────────────

const ResultsTab: React.FC<{
  isDark: boolean;
  card: string;
  text: string;
  muted: string;
}> = ({ isDark, card, text, muted }) => (
  <div className="space-y-6">
    <div className={`rounded-2xl border p-6 ${card}`}>
      <h3 className={`font-bold text-lg mb-2 ${text}`}>
        How to read your simulation results
      </h3>
      <p className={`text-sm ${muted}`}>
        After a simulation completes, you see a results page with KPI cards,
        charts, and compliance gates. Here is what every metric means and what
        values indicate good vs. poor performance.
      </p>
    </div>

    {/* Common metrics */}
    <div>
      <h3 className={`font-semibold text-base mb-3 ${text}`}>
        Metrics common to all techniques
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OutputCard
          isDark={isDark}
          metric="PUE"
          unit="ratio"
          good="1.0–1.2 (excellent)"
          bad=">1.8 (poor, old systems)"
          tip="Power Usage Effectiveness = Total facility power ÷ IT power. Every watt above 1.0 is cooling/infrastructure overhead. Google's best DCs run at 1.06."
        />
        <OutputCard
          isDark={isDark}
          metric="Total Energy"
          unit="kWh/yr"
          good="Lower than baseline"
          bad="Higher than air-side baseline"
          tip="Total annual electricity consumed by IT + cooling. Compare across techniques to see energy savings."
        />
        <OutputCard
          isDark={isDark}
          metric="Carbon Emissions"
          unit="kg CO₂/yr"
          good="<50,000 kg for small DC"
          bad=">200,000 kg"
          tip="Annual CO₂ from electricity consumption. Multiply by your carbon tax rate to get financial liability."
        />
        <OutputCard
          isDark={isDark}
          metric="CUE"
          unit="kgCO₂/kWhIT"
          good="<0.1 (renewable grid)"
          bad=">0.6 (coal grid)"
          tip="Carbon Usage Effectiveness. Normalises emissions by IT work done. Useful for comparing across different-sized DCs."
        />
      </div>
    </div>

    {/* Air-side specific */}
    <div>
      <h3
        className={`font-semibold text-base mb-3 flex items-center gap-2 ${text}`}
      >
        <Wind className="w-4 h-4 text-blue-500" /> Air-Side Economizer results
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OutputCard
          isDark={isDark}
          metric="Cooling Mode Distribution"
          unit="hours"
          good="FULL_ECON >50% of year"
          bad="MECHANICAL_ONLY >70% of year"
          tip="Shows how many hours the system ran in each mode. More free-cooling hours = lower energy cost. Depends heavily on climate."
        />
        <OutputCard
          isDark={isDark}
          metric="Airflow Violations"
          unit="count"
          good="0 violations"
          bad="Any violation"
          tip="Hours where required airflow exceeded system capacity. Each violation means servers may overheat. Recommendation: upgrade to liquid cooling."
        />
        <OutputCard
          isDark={isDark}
          metric="Energy Savings %"
          unit="%"
          good=">25% vs baseline"
          bad="<10%"
          tip="Energy saved compared to a mechanical-only baseline. Driven by free-cooling hours. Seattle/London: 40–60%. Dubai/Phoenix: 5–15%."
        />
        <OutputCard
          isDark={isDark}
          metric="Payback Period"
          unit="years"
          good="<3 years"
          bad=">10 years"
          tip="Time to recover CAPEX from energy savings. Short payback in cool climates. Very long in hot climates where free cooling is rarely available."
        />
      </div>
    </div>

    {/* Chilled water specific */}
    <div>
      <h3
        className={`font-semibold text-base mb-3 flex items-center gap-2 ${text}`}
      >
        <Thermometer className="w-4 h-4 text-red-500" /> Chilled Water results
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OutputCard
          isDark={isDark}
          metric="Average COP"
          unit="ratio"
          good=">4.0 (efficient)"
          bad="<2.5 (inefficient)"
          tip="Coefficient of Performance = cooling delivered ÷ electricity consumed. Higher = more efficient chiller. Drops in hot weather when condenser works harder."
        />
        <OutputCard
          isDark={isDark}
          metric="WUE"
          unit="L/kWhIT"
          good="<1.5 (water-efficient)"
          bad=">2.5 (water-intensive)"
          tip="Water Usage Effectiveness. Chilled water systems consume 1–3 L per kWh of IT work. Compare against your site's water stress threshold."
        />
        <OutputCard
          isDark={isDark}
          metric="NPV"
          unit="USD"
          good="Positive (profitable)"
          bad="Negative (loss)"
          tip="Net Present Value over 15 years. Negative NPV is common for small-scale chilled water due to high CAPEX. Becomes positive at MW-scale deployments."
        />
        <OutputCard
          isDark={isDark}
          metric="Phase 4 Gates"
          unit="PASS/FAIL"
          good="All 4 PASS"
          bad="Any FAIL"
          tip="Thermal Compliance: inlet temp ≤27°C. Water Constraint: WUE within site limit. Carbon Liability: emissions within target. Economic Viability: positive NPV."
        />
      </div>
    </div>

    {/* Evaporative specific */}
    <div>
      <h3
        className={`font-semibold text-base mb-3 flex items-center gap-2 ${text}`}
      >
        <Droplets className="w-4 h-4 text-green-500" /> Evaporative Cooling
        results
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OutputCard
          isDark={isDark}
          metric="Max Inlet Temp"
          unit="°C"
          good="≤27°C (ASHRAE A1)"
          bad=">27°C (throttling risk)"
          tip="Highest server inlet temperature recorded during the year. ASHRAE Class A1 limit is 27°C. Exceeding this triggers CPU throttling and performance loss."
        />
        <OutputCard
          isDark={isDark}
          metric="Cooling Failure Hours"
          unit="hours"
          good="0 hours"
          bad=">100 hours"
          tip="Hours where evaporative capacity was insufficient for IT load. During these hours, the DX backup activates. High failure hours indicate the climate is too hot/humid for standalone evaporative cooling."
        />
        <OutputCard
          isDark={isDark}
          metric="PUE"
          unit="ratio"
          good="1.00–1.05 (near-ideal)"
          bad=">1.15"
          tip="Evaporative cooling achieves the lowest PUE of all three techniques (typically 1.002–1.02) because it uses only fan power — no compressor."
        />
        <OutputCard
          isDark={isDark}
          metric="Cooling Assessment"
          unit="status"
          good="SUFFICIENT_COOLING"
          bad="INSUFFICIENT_COOLING"
          tip="Overall verdict on whether evaporative cooling can handle your IT load in your climate. INSUFFICIENT means you need a hybrid approach with mechanical backup."
        />
      </div>
    </div>

    {/* ML Recommendation */}
    <div className={`rounded-2xl border p-6 ${card}`}>
      <h3 className={`font-bold text-lg mb-3 flex items-center gap-2 ${text}`}>
        <BarChart3 className="w-5 h-5 text-purple-500" /> ML Recommendation
        Engine
      </h3>
      <p className={`text-sm mb-4 ${muted}`}>
        After your simulation finishes, open the Recommendations tab to see a
        clear suggested cooling option and an easy summary of why it is a good
        fit for your site.
      </p>
      <div className="space-y-3">
        {[
          [
            "Where to find it",
            "Go to Simulation Details, then open the Recommendations tab. The top section highlights the suggested technique for your current case.",
          ],
          [
            "What appears first",
            "You will see the recommended technique name and a short explanation in plain language so you can quickly understand the choice.",
          ],
          [
            "How to compare options",
            "A comparison table shows all three techniques side by side (cost, emissions, water use, and safety status) so you can compare trade-offs at a glance.",
          ],
          [
            "What else you get",
            "The tab also includes a future impact summary to help with planning, plus key findings and warnings you should review before finalizing your decision.",
          ],
          [
            "How to use it",
            "Start with the recommended option, then check the comparison table and warnings. If your priority is cost, sustainability, or reliability, choose the option that best matches that priority.",
          ],
        ].map(([title, desc]) => (
          <div
            key={title as string}
            className={`flex gap-3 p-3 rounded-xl ${isDark ? "bg-gray-700" : "bg-gray-50"}`}
          >
            <CheckCircle className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <p className={`font-semibold text-sm ${text}`}>{title}</p>
              <p className={`text-xs ${muted}`}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Common mistakes */}
    <div className={`rounded-2xl border p-6 ${card}`}>
      <h3 className={`font-bold text-lg mb-3 flex items-center gap-2 ${text}`}>
        <AlertTriangle className="w-5 h-5 text-amber-500" /> Common mistakes to
        avoid
      </h3>
      <div className="space-y-2">
        {[
          [
            "Wrong climate for technique",
            "Evaporative cooling in Dubai or Phoenix will fail — wet-bulb temperatures are too high. Always check the Max Inlet Temp in results.",
          ],
          [
            "Ignoring airflow violations",
            "Air-side economizer airflow violations mean your servers will overheat. Don't ignore these — they indicate the technique is undersized for your AI workload density.",
          ],
          [
            "Misreading negative NPV",
            "A negative NPV for chilled water at small scale is normal. It becomes positive at 500+ kW IT load. The system is still the right choice if thermal compliance is required.",
          ],
          [
            "Setting carbon intensity to 0",
            "If you set grid emissions to 0 (100% renewables), carbon tax will be $0 but the simulation still runs correctly. Make sure this reflects your actual grid.",
          ],
          [
            "Forgetting climate offset",
            "For 2030 projections, set Warming Delta to 1.5°C (RCP 4.5) or 3°C (RCP 8.5) to see how climate change affects your cooling costs.",
          ],
        ].map(([title, desc]) => (
          <div
            key={title as string}
            className={`flex gap-3 p-3 rounded-xl border ${isDark ? "bg-amber-900/10 border-amber-700/30" : "bg-amber-50 border-amber-200"}`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p
                className={`font-semibold text-sm ${isDark ? "text-amber-300" : "text-amber-800"}`}
              >
                {title}
              </p>
              <p
                className={`text-xs ${isDark ? "text-amber-400/80" : "text-amber-700"}`}
              >
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
