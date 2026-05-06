import React, { useState, useEffect, useMemo } from "react";

import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  GitCompare,
  Play,
  Cloud,
  Wind,
  Cpu,
  Server,
  Activity,
  Shield,
  Calendar,
  Thermometer,
  MapPin,
  Eye,
  Download,
  ChevronRight,
  Droplets,
  Clock,
  FileText,
  User,
  LogIn,
} from "lucide-react";
import {
  getRecentActivity,
  activityLabel,
  ActivityEntry,
} from "../services/activityService";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
} from "recharts";

// Custom hooks and services
import { useThemeStore } from "../hooks/useTheme";
import { useAuthStore } from "../store/store";
import { getCurrentUserProfile } from "../services/authService";
import { useSimulationStore } from "../store/store";
import { getTariffCarbonLocations } from "../services/tariffLocationService";
import {
  getUserSimulations,
  SimulationWithResults,
} from "../services/simulationService";

// Components
import { Sidebar } from "../components/shared/Sidebar";
import CarbonTariffChart from "../components/CarbonTariffChart";
import LocationMap from "../components/LocationMap";

// Types
type Tariff = {
  id: number;
  country_name: string;
  co2_grid_factor: number;
  electricity_tariff: number;
  created_at: string;
};

type Location = {
  id: number;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number;
  wmo_station: string;
  source: string;
};

type ChartDatum = {
  name: string;
  energy: number;
  cost: number;
  pue: number;
  annualCost: number;
  annualCarbon: number;
  color: string;
};

type RuntimeDatum = {
  name: string;
  runtime: number;
  technique: string;
  simulationCount: number;
  color: string;
};

// Constants
const TECH_COLORS = ["#5ce1e5", "#0ea5e9", "#fd5757", "#8b5cf6", "#10b981"];

// Helper functions
const groupByTechnique = (simulations: SimulationWithResults[]) => {
  const grouped: Record<string, SimulationWithResults[]> = {};
  simulations.forEach((sim) => {
    const tech = sim.coolingTechnique || "unknown";
    if (!grouped[tech]) grouped[tech] = [];
    grouped[tech].push(sim);
  });
  return grouped;
};

const normalizeTechniqueKey = (technique: string) => {
  const t = (technique || "").toLowerCase();
  if (t.includes("air")) return "air";
  if (t.includes("evap")) return "evap";
  if (t.includes("chilled") || t.includes("water")) return "chilled";
  return "other";
};

const techniqueLabelFromKey = (key: string) => {
  if (key === "air") return "Air-Side";
  if (key === "evap") return "Evaporative";
  if (key === "chilled") return "Chilled Water";
  return "Other";
};

const techniqueColorFromKey = (key: string) => {
  if (key === "air") return "#5ce1e5";
  if (key === "evap") return "#10b981";
  if (key === "chilled") return "#fd5757";
  return "#8b5cf6";
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: string;
  color: string;
  delay: number;
}> = ({ icon: Icon, label, value, change, color, delay }) => {
  const isDark = useThemeStore().isDark;
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className={`relative rounded-2xl p-6 transition-all duration-500 transform hover:scale-105 animate-in fade-in ${
        isDark
          ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
          : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
      }`}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div
            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
          >
            {label}
          </div>
          <div className="flex items-baseline gap-2">
            <div
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {value}
            </div>
            {change && (
              <span
                className={`text-xs font-medium ${
                  change.startsWith("+")
                    ? "text-green-500"
                    : change.startsWith("-")
                      ? "text-red-500"
                      : "text-gray-500"
                }`}
              >
                {change}
              </span>
            )}
          </div>
        </div>
        <div
          className={`p-3 rounded-xl transition-all duration-300 ${
            isHovering ? "scale-110" : ""
          }`}
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
      {/* Glow effect on hover */}
      {isHovering && (
        <div
          className="absolute inset-0 rounded-2xl opacity-20"
          style={{
            background: `radial-gradient(circle at top right, ${color}, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
};

// Quick Action Card Component
const QuickActionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  gradient: string;
  delay: number;
}> = ({ title, description, icon: Icon, action, gradient, delay }) => {
  const isDark = useThemeStore().isDark;
  const [isHovering, setIsHovering] = useState(false);

  return (
    <button
      onClick={action}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`relative group rounded-2xl p-8 overflow-hidden transition-all duration-500 transform hover:scale-105 animate-in fade-in ${
        isDark ? "text-white" : "text-white"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Animated Gradient Background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-all duration-500 ${
          isHovering ? "opacity-100" : "opacity-90"
        }`}
      />

      {/* Particle Effect on Hover */}
      {isHovering && (
        <div className="absolute inset-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${1 + Math.random()}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
                opacity: 0.3,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div
            className={`p-3 rounded-xl ${
              isDark ? "bg-black/20" : "bg-white/20"
            } backdrop-blur-sm`}
          >
            <Icon className="w-6 h-6" />
          </div>

          {/* Animated Arrow */}
          <ChevronRight
            className={`w-5 h-5 transform transition-transform duration-300 ${
              isHovering ? "translate-x-2" : ""
            }`}
          />
        </div>

        <h3 className="text-xl font-bold mb-3 text-left">{title}</h3>
        <p className="text-sm opacity-90 text-left">{description}</p>
      </div>

      {/* Shine Effect */}
      <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 transition-all duration-700 group-hover:left-full" />
    </button>
  );
};

// Simulation Row with Status Indicators
const SimulationRow: React.FC<{
  simulation: any;
  index: number;
}> = ({ simulation, index }) => {
  const navigate = useNavigate();
  const isDark = useThemeStore().isDark;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return isDark
          ? "bg-green-500/20 text-green-400"
          : "bg-green-500/20 text-green-600";
      case "running":
        return isDark
          ? "bg-blue-500/20 text-blue-400"
          : "bg-blue-500/20 text-blue-600";
      case "pending":
        return isDark
          ? "bg-yellow-500/20 text-yellow-400"
          : "bg-yellow-500/20 text-yellow-600";
      default:
        return isDark
          ? "bg-gray-500/20 text-gray-400"
          : "bg-gray-200 text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        );
      case "running":
        return (
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        );
      case "pending":
        return (
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        );
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-500" />;
    }
  };

  return (
    <tr
      className={`transition-all duration-300 animate-in fade-in ${
        isDark
          ? "hover:bg-[#27304a]/50 border-b border-[#3f4a68]/30"
          : "hover:bg-gray-50/50 border-b border-gray-200"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <td className="py-4 pl-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isDark ? "bg-[#1a1f3a]" : "bg-gray-100"
            }`}
          >
            <Thermometer
              className={`w-4 h-4 ${
                isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"
              }`}
            />
          </div>
          <div>
            <div
              className={`font-semibold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {simulation.name}
            </div>
            <div
              className={`text-xs mt-1 ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Created {new Date(simulation.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </td>

      <td className="py-4">
        <div
          className={`flex items-center gap-2 ${
            isDark ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <MapPin className="w-4 h-4" />
          {simulation.location}
        </div>
      </td>

      <td className="py-4">
        <div
          className={`px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-2 ${
            isDark ? "bg-[#1a1f3a] text-gray-300" : "bg-gray-100 text-gray-700"
          }`}
        >
          {simulation.coolingTechnique === "airside" ? (
            <Wind className="w-3 h-3" />
          ) : (
            <Droplets className="w-3 h-3" />
          )}
          {simulation.coolingTechnique.charAt(0).toUpperCase() +
            simulation.coolingTechnique.slice(1)}
        </div>
      </td>

      <td className="py-4">
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-2 ${getStatusColor(simulation.status)}`}
          >
            {getStatusIcon(simulation.status)}
            {simulation.status.charAt(0).toUpperCase() +
              simulation.status.slice(1)}
          </div>
        </div>
      </td>

      <td className="py-4 pr-6">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => navigate(`/simulation/${simulation.id}`)}
            className={`p-2 rounded-lg transition-all ${
              isDark
                ? "hover:bg-[#27304a] text-gray-400 hover:text-white"
                : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => console.log("Download", simulation.id)}
            className={`p-2 rounded-lg transition-all ${
              isDark
                ? "hover:bg-[#27304a] text-gray-400 hover:text-white"
                : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            }`}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Recent Activity Component
const RecentActivity: React.FC<{ userId: string; isDark: boolean }> = ({
  userId,
  isDark,
}) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    // fetch enough for several pages
    getRecentActivity(userId, 50)
      .then(setActivities)
      .finally(() => setLoading(false));
  }, [userId]);

  const totalPages = Math.ceil(activities.length / PAGE_SIZE);
  const paged = activities.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );

  const iconFor = (action: string) => {
    if (action.startsWith("simulation"))
      return <Activity className="w-4 h-4" />;
    if (action.startsWith("report")) return <FileText className="w-4 h-4" />;
    if (action === "login" || action === "logout")
      return <LogIn className="w-4 h-4" />;
    if (action === "profile_updated") return <User className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const colorFor = (action: string) => {
    if (action.includes("completed"))
      return isDark
        ? "text-green-400 bg-green-500/15"
        : "text-green-700 bg-green-100";
    if (action.includes("created"))
      return isDark
        ? "text-cyan-400 bg-cyan-500/15"
        : "text-cyan-700 bg-cyan-100";
    if (action.includes("deleted"))
      return isDark ? "text-red-400 bg-red-500/15" : "text-red-700 bg-red-100";
    if (action.includes("export") || action.includes("email"))
      return isDark
        ? "text-purple-400 bg-purple-500/15"
        : "text-purple-700 bg-purple-100";
    if (action.includes("viewed"))
      return isDark
        ? "text-blue-400 bg-blue-500/15"
        : "text-blue-700 bg-blue-100";
    return isDark
      ? "text-gray-400 bg-gray-500/15"
      : "text-gray-600 bg-gray-100";
  };

  // Resolve where clicking an activity row should navigate
  const navTarget = (a: ActivityEntry): string | null => {
    const id = a.entity_id;
    if (!id) return null;
    if (a.entity_type === "simulation" || a.action.startsWith("simulation")) {
      return `/simulation/${id}`;
    }
    if (a.entity_type === "report" || a.action.startsWith("report")) {
      return `/reports/${id}`;
    }
    return null;
  };

  const timeAgo = (ts: string) => {
    if (!ts) return "unknown";
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "unknown";
    const diff = Date.now() - date.getTime();
    if (diff < 0) return "just now";
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div
      className={`rounded-2xl p-5 border ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Clock
            className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}
          />
          <h2
            className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Recent Activity
          </h2>
          {activities.length > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? "bg-[#27304a] text-gray-400" : "bg-gray-100 text-gray-500"}`}
            >
              {activities.length} total
            </span>
          )}
        </div>
        {loading && (
          <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Empty state */}
      {!loading && activities.length === 0 && (
        <div
          className={`text-center py-8 text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}
        >
          No activity recorded yet. Activity is logged as you use the platform.
        </div>
      )}

      {/* Activity rows */}
      {paged.length > 0 && (
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {paged.map((a) => {
            const target = navTarget(a);
            const isClickable = !!target;
            const Row = isClickable ? "button" : "div";
            return (
              <Row
                key={a.id}
                onClick={isClickable ? () => navigate(target!) : undefined}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors
                  ${isDark ? "hover:bg-[#27304a]" : "hover:bg-gray-50"}
                  ${isClickable ? "cursor-pointer group" : "cursor-default"}`}
              >
                {/* Icon */}
                <div
                  className={`p-2 rounded-lg shrink-0 ${colorFor(a.action)}`}
                >
                  {iconFor(a.action)}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium flex items-center gap-1.5 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {activityLabel(a.action as any)}
                    {a.metadata?.name && (
                      <span
                        className={`font-normal truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        — {a.metadata.name}
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-xs flex items-center gap-1 mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    {a.entity_type && (
                      <span className="capitalize">{a.entity_type}</span>
                    )}
                    {a.entity_id && <span>#{a.entity_id}</span>}
                  </div>
                </div>

                {/* Time + arrow */}
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span
                    className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    {timeAgo(a.created_at)}
                  </span>
                  <span
                    className={`text-xs ${isDark ? "text-gray-600" : "text-gray-300"}`}
                  >
                    {a.created_at ? new Date(a.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }) : "—"}
                  </span>
                  {isClickable && (
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${isDark ? "text-gray-600 group-hover:text-gray-300" : "text-gray-300 group-hover:text-gray-600"} group-hover:translate-x-0.5`}
                    />
                  )}
                </div>
              </Row>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-opacity-20 border-gray-500">
          <span
            className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}
          >
            {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, activities.length)} of{" "}
            {activities.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40
                ${isDark ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
                  ${
                    page === i
                      ? isDark
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-blue-100 text-blue-700"
                      : isDark
                        ? "bg-[#27304a] text-gray-400 hover:bg-[#3f4a68]"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40
                ${isDark ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  // On mount, fetch the latest user profile from the users table
  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile();
      if (profile) {
        updateUser({
          name: profile.name,
          email: profile.email,
        });
      }
    })();
  }, [updateUser]);
  const simulations = useSimulationStore((state) => state.simulations);
  const isDark = useThemeStore().isDark;

  // Locations and tariff/carbon data
  const [tariffLocations, setTariffLocations] = useState<{
    tariffs: Tariff[];
    locations: Location[];
    error: string | null;
  }>({ tariffs: [], locations: [], error: null });
  const [loadingTariff, setLoadingTariff] = useState<boolean>(true);

  // Simulation data for charts
  const [dbSimulations, setDbSimulations] = useState<SimulationWithResults[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchTariffLocations() {
      setLoadingTariff(true);
      const result = await getTariffCarbonLocations();
      setTariffLocations(result);
      setLoadingTariff(false);
    }
    fetchTariffLocations();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        if (user?.id) {
          const resp = await getUserSimulations(user.id);
          if (resp.success && resp.data) {
            setDbSimulations(resp.data.simulations || []);
          } else {
            setError(resp.error || "Failed to fetch simulations");
          }
        }
      } catch (e) {
        setError("Failed to fetch simulations");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id]);

  // Prepare chart data
  const techniqueData: ChartDatum[] = useMemo(() => {
    const grouped = groupByTechnique(dbSimulations);
    return Object.entries(grouped).map(([tech, sims], i) => {
      const completed = sims.filter((s) => s.status === "completed");
      const totalEnergy = completed.reduce(
        (sum, s) => sum + (s.result?.energy_consumed_kwh || 0),
        0,
      );

      // PUE: extract from result_data per technique
      const pueValues = completed
        .map((s) => {
          const rd = s.result?.result_data ?? {};
          return (
            rd?.results?.metrics?.pue ??
            rd?.summary?.averagePUE ??
            rd?.rawEvaporativeData?.results?.performance?.pue_average ??
            0
          );
        })
        .filter((v) => v > 0);
      const avgPUE = pueValues.length
        ? pueValues.reduce((a, b) => a + b, 0) / pueValues.length
        : 0;

      // Annual cost: extract from result_data
      const costValues = completed
        .map((s) => {
          const rd = s.result?.result_data ?? {};
          return (
            rd?.results?.annual?.cost_USD ??
            rd?.summary?.annualOpExUSD ??
            rd?.rawEvaporativeData?.results?.cost?.total_energy_cost_usd ??
            0
          );
        })
        .filter((v) => v > 0);
      const avgAnnualCost = costValues.length
        ? costValues.reduce((a, b) => a + b, 0) / costValues.length
        : 0;

      const carbonValues = completed
        .map((s) => {
          const rd = s.result?.result_data ?? {};
          return (
            rd?.results?.annual?.carbonEmissions_kg ??
            rd?.summary?.totalCarbonEmissions_kg ??
            rd?.rawEvaporativeData?.results?.emissions?.co2_kg_total ??
            0
          );
        })
        .filter((v) => v > 0);
      const avgAnnualCarbon = carbonValues.length
        ? carbonValues.reduce((a, b) => a + b, 0) / carbonValues.length
        : 0;

      return {
        name: tech
          .replace("Air Side Economization", "Air-Side")
          .replace("Chilled Water Cooling", "Chilled Water")
          .replace("Evaporative Cooling", "Evaporative"),
        energy: Math.round(totalEnergy * 100) / 100,
        cost:
          Math.round(
            (completed.reduce(
              (sum, s) => sum + (s.result?.cost_saving_percent || 0),
              0,
            ) /
              (completed.length || 1)) *
              100,
          ) / 100,
        pue: Math.round(avgPUE * 1000) / 1000,
        annualCost: Math.round(avgAnnualCost),
        annualCarbon: Math.round(avgAnnualCarbon),
        color: TECH_COLORS[i % TECH_COLORS.length],
      };
    });
  }, [dbSimulations]);

  const simulationComparisonData = useMemo(() => {
    return dbSimulations
      .filter((s) => s.status === "completed")
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      .map((s, i) => {
        const rd = s.result?.result_data ?? {};
        const annualCost = Number(
          rd?.results?.annual?.cost_USD ??
            rd?.summary?.annualOpExUSD ??
            rd?.rawEvaporativeData?.results?.cost?.total_energy_cost_usd ??
            0,
        );
        const annualCarbon = Number(
          rd?.results?.annual?.carbonEmissions_kg ??
            rd?.summary?.totalCarbonEmissions_kg ??
            rd?.rawEvaporativeData?.results?.emissions?.co2_kg_total ??
            0,
        );

        const techKey = normalizeTechniqueKey(
          s.coolingTechnique || s.simulation_type || "",
        );
        return {
          sim: `S${i + 1}`,
          date: new Date(s.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          airCost: techKey === "air" ? annualCost : null,
          evapCost: techKey === "evap" ? annualCost : null,
          chilledCost: techKey === "chilled" ? annualCost : null,
          airCarbon: techKey === "air" ? annualCarbon : null,
          evapCarbon: techKey === "evap" ? annualCarbon : null,
          chilledCarbon: techKey === "chilled" ? annualCarbon : null,
        };
      });
  }, [dbSimulations]);

  // Runtime data — aggregated total runtime per technique
  const runtimeData: RuntimeDatum[] = useMemo(() => {
    const grouped: Record<
      string,
      { totalRuntime: number; simulationCount: number }
    > = {};

    dbSimulations
      .filter((s) => s.status === "completed" && s.result?.runtime_minutes)
      .forEach((s) => {
        const techKey = normalizeTechniqueKey(
          s.coolingTechnique || s.simulation_type || "",
        );
        if (!grouped[techKey]) {
          grouped[techKey] = { totalRuntime: 0, simulationCount: 0 };
        }
        grouped[techKey].totalRuntime += s.result?.runtime_minutes || 0;
        grouped[techKey].simulationCount += 1;
      });

    const order = ["air", "evap", "chilled", "other"];
    return order
      .filter((key) => grouped[key])
      .map((key) => ({
        name: techniqueLabelFromKey(key),
        runtime: Math.round(grouped[key].totalRuntime * 100) / 100,
        technique: techniqueLabelFromKey(key),
        simulationCount: grouped[key].simulationCount,
        color: techniqueColorFromKey(key),
      }));
  }, [dbSimulations]);

  // Radar data — technique comparison across key metrics (normalised 0-10)
  const radarData = useMemo(() => {
    if (techniqueData.length === 0) return [];
    const maxEnergy = Math.max(...techniqueData.map((t) => t.energy), 1);
    const maxCost = Math.max(...techniqueData.map((t) => t.annualCost), 1);
    const maxPUE = Math.max(...techniqueData.map((t) => t.pue), 1);
    return [
      {
        metric: "Low Energy",
        ...Object.fromEntries(
          techniqueData.map((t) => [
            t.name,
            Math.round((1 - t.energy / maxEnergy) * 10),
          ]),
        ),
      },
      {
        metric: "Low PUE",
        ...Object.fromEntries(
          techniqueData.map((t) => [
            t.name,
            t.pue > 0
              ? Math.round((1 - (t.pue - 1) / Math.max(maxPUE - 1, 0.01)) * 10)
              : 0,
          ]),
        ),
      },
      {
        metric: "Low Cost",
        ...Object.fromEntries(
          techniqueData.map((t) => [
            t.name,
            Math.round((1 - t.annualCost / maxCost) * 10),
          ]),
        ),
      },
      {
        metric: "Efficiency",
        ...Object.fromEntries(
          techniqueData.map((t) => [
            t.name,
            Math.min(10, Math.round(t.cost / 10)),
          ]),
        ),
      },
    ];
  }, [techniqueData]);

  // Quick Actions
  const quickActions = [
    {
      title: "New Simulation",
      description: "Design and run a new cooling optimization simulation",
      icon: Play,
      action: () => {
        navigate("/input-management");
      },
      gradient: "from-[#5ce1e5] to-[#0ea5e9]",
    },
    {
      title: "View Reports",
      description: "Access detailed analytics and performance reports",
      icon: BarChart3,
      action: () => {
        navigate("/reports");
      },
      gradient: "from-[#fd5757] to-[#ff8888]",
    },
    {
      title: "Compare Methods",
      description: "Compare different cooling techniques side-by-side",
      icon: GitCompare,
      action: () => {
        navigate("/advisory");
      },
      gradient: "from-[#8b5cf6] to-[#a78bfa]",
    },
  ];

  const recentSimulations = simulations.slice(-5);

  // Real-time quick stats from backend
  const [status, setStatus] = useState<any>(null);
  const [statusError, setStatusError] = useState<string>("");
  const [statusLoading, setStatusLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchStatus() {
      setStatusLoading(true);
      setStatusError("");
      try {
        const { fetchDashboardStatus } = await import("../services/statusApi");
        const data = await fetchDashboardStatus();
        if (isMounted) setStatus(data);
      } catch (e) {
        if (isMounted) setStatusError("Failed to fetch real-time stats");
      } finally {
        if (isMounted) setStatusLoading(false);
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const quickStats = status
    ? [
        {
          icon: Cloud,
          label: "Active Servers",
          value: status.activeServers,
          color: "#5ce1e5",
        },
        {
          icon: Wind,
          label: "Fans Running",
          value: `${status.fansRunning}%`,
          color: "#0ea5e9",
        },
        {
          icon: Cpu,
          label: "CPU Utilization",
          value: `${status.cpuUtilization.toFixed(1)}%`,
          color: "#8b5cf6",
        },
        {
          icon: Server,
          label: "Racks Monitored",
          value: status.racksMonitored,
          color: "#10b981",
        },
        {
          icon: Activity,
          label: "Last Active",
          value: status.lastActive,
          color: "#fd5757",
        },
        {
          icon: Shield,
          label: "System Alerts",
          value: status.systemAlerts,
          color: "#ff8888",
        },
      ]
    : [];

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isDark
          ? "bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]"
          : "bg-gradient-to-b from-slate-50 via-white to-slate-50"
      }`}
    >
      <Sidebar />
      <main className="lg:ml-56 p-4 lg:p-8">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div
            className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${
              isDark ? "bg-[#5ce1e5]/5" : "bg-[#0ea5e9]/5"
            }`}
            style={{ animation: "float 8s ease-in-out infinite" }}
          />
          <div
            className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl ${
              isDark ? "bg-[#fd5757]/5" : "bg-[#ff8888]/5"
            }`}
            style={{ animation: "float 12s ease-in-out infinite reverse" }}
          />
        </div>
        {/* Welcome Header */}
        <div className="relative mb-4 lg:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-4">
            <div>
              <h1
                className={`text-3xl lg:text-4xl font-bold mb-2 animate-in slide-in-from-left-8 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Welcome back,{" "}
                <span className={isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}>
                  {user?.name || user?.email?.split("@")[0] || "User"}
                </span>
                !
              </h1>
              <p
                className={`text-lg ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Here's what's happening with your data center today
              </p>
            </div>

            {/* Date and Status */}
            <div
              className={`flex items-center gap-4 px-4 py-3 rounded-xl ${
                isDark
                  ? "bg-[#1a1f3a] border border-[#3f4a68]"
                  : "bg-white border border-gray-200"
              }`}
            >
              <Calendar
                className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}
              />
              <span
                className={`font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}
              >
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
            {quickStats.map((stat, index) => (
              <StatCard
                key={index}
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
                color={stat.color}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
        {/* Locations & Tariff/Carbon Visualization Section */}
        <div className="relative mb-8">
          <h2
            className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Locations & Carbon Tariff Visualization
          </h2>
          {loadingTariff ? (
            <div
              className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              <div className="animate-pulse">Loading locations...</div>
            </div>
          ) : tariffLocations.error ? (
            <div className="text-red-500 p-4 rounded-lg bg-red-500/10">
              {tariffLocations.error}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Map Visualization */}
              <div
                className={`rounded-2xl p-6 ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}
              >
                <h3
                  className={`font-semibold mb-4 text-lg ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Locations Catered by Cooling
                </h3>
                <LocationMap
                  locations={tariffLocations.locations.map((loc) => ({
                    city: loc.city,
                    country: loc.country,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                  }))}
                />
                <div className="mt-2 text-xs text-gray-500">
                  Hover markers for lat/lng info
                </div>
              </div>
              {/* Carbon Tariff Chart Visualization */}
              <div
                className={`rounded-2xl p-6 ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}
              >
                <h3
                  className={`font-semibold mb-4 text-lg ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  CO₂ Factor & Tariff by Country
                </h3>
                <CarbonTariffChart
                  data={tariffLocations.tariffs.map((tariff) => ({
                    country: tariff.country_name,
                    co2: tariff.co2_grid_factor,
                    tariff: tariff.electricity_tariff,
                  }))}
                />
              </div>
            </div>
          )}
        </div>
        {/* Charts Section */}
        {!loading && !error && dbSimulations.length > 0 && (
          <>
            {/* Row 1: Energy by Technique + PUE by Technique */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div
                className={`rounded-2xl p-6 ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}
              >
                <h3
                  className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Energy Consumed by Technique
                </h3>
                <p
                  className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  Total kWh across all completed simulations per technique
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={techniqueData}
                      dataKey="energy"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                    >
                      {techniqueData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1a1f3a" : "#fff",
                        border: `1px solid ${isDark ? "#3f4a68" : "#e5e7eb"}`,
                        borderRadius: "0.5rem",
                        color: isDark ? "#fff" : "#111",
                      }}
                      formatter={(v: any) => [
                        `${Number(v).toLocaleString()} kWh`,
                        "Energy",
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div
                className={`rounded-2xl p-6 ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}
              >
                <h3
                  className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Average PUE by Technique
                </h3>
                <p
                  className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  Power Usage Effectiveness — lower is better (ideal = 1.0)
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={techniqueData.filter((t) => t.pue > 0)}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "#2d3a5a" : "#e5e7eb"}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: isDark ? "#9ca3af" : "#4b5563",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      domain={[1, "auto"]}
                      tick={{
                        fill: isDark ? "#9ca3af" : "#4b5563",
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1a1f3a" : "#fff",
                        border: `1px solid ${isDark ? "#3f4a68" : "#e5e7eb"}`,
                        borderRadius: "0.5rem",
                        color: isDark ? "#fff" : "#111",
                      }}
                      formatter={(v: any) => [Number(v).toFixed(4), "PUE"]}
                    />
                    <Legend
                      payload={techniqueData
                        .filter((t) => t.pue > 0)
                        .map((t) => ({
                          value: t.name,
                          type: "square" as const,
                          id: t.name,
                          color: t.color,
                        }))}
                    />
                    <Bar dataKey="pue" name="Avg PUE" radius={[4, 4, 0, 0]}>
                      {techniqueData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 2: Annual Cost + Carbon Comparison (Non-bar) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div
                className={`rounded-2xl p-6 ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}
              >
                <h3
                  className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Annual OpEx Comparison by Simulation
                </h3>
                <p
                  className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  Non-bar trend comparison of Air-Side, Evaporative, and Chilled
                  Water annual cost values
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={simulationComparisonData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "#2d3a5a" : "#e5e7eb"}
                    />
                    <XAxis
                      dataKey="sim"
                      tick={{
                        fill: isDark ? "#9ca3af" : "#4b5563",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      tick={{
                        fill: isDark ? "#9ca3af" : "#4b5563",
                        fontSize: 11,
                      }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1a1f3a" : "#fff",
                        border: `1px solid ${isDark ? "#3f4a68" : "#e5e7eb"}`,
                        borderRadius: "0.5rem",
                        color: isDark ? "#fff" : "#111",
                      }}
                      formatter={(v: any) =>
                        v == null
                          ? ["—", "Value"]
                          : [`$${Number(v).toLocaleString()}`, "Annual OpEx"]
                      }
                      labelFormatter={(label: any, payload: any) => {
                        const d = payload?.[0]?.payload?.date;
                        return d ? `${label} (${d})` : String(label);
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="airCost"
                      name="Air-Side"
                      stroke="#5ce1e5"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="evapCost"
                      name="Evaporative"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="chilledCost"
                      name="Chilled Water"
                      stroke="#fd5757"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div
                className={`rounded-2xl p-6 ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}
              >
                <h3
                  className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Carbon Emissions Comparison by Simulation
                </h3>
                <p
                  className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  Non-bar trend comparison of annual carbon emissions for all
                  three techniques
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={simulationComparisonData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "#2d3a5a" : "#e5e7eb"}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: isDark ? "#9ca3af" : "#4b5563",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      tick={{
                        fill: isDark ? "#9ca3af" : "#4b5563",
                        fontSize: 11,
                      }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1a1f3a" : "#fff",
                        border: `1px solid ${isDark ? "#3f4a68" : "#e5e7eb"}`,
                        borderRadius: "0.5rem",
                        color: isDark ? "#fff" : "#111",
                      }}
                      formatter={(v: any) =>
                        v == null
                          ? ["—", "Value"]
                          : [
                              `${Number(v).toLocaleString()} kg`,
                              "Annual Carbon",
                            ]
                      }
                      labelFormatter={(label: any, payload: any) => {
                        const d = payload?.[0]?.payload?.date;
                        return d ? `${label} (${d})` : String(label);
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="airCarbon"
                      name="Air-Side"
                      stroke="#5ce1e5"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="evapCarbon"
                      name="Evaporative"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="chilledCarbon"
                      name="Chilled Water"
                      stroke="#fd5757"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 3: Simulation Runtime Timeline + Technique Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div
                className={`rounded-2xl p-6 ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}
              >
                <h3
                  className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Simulation Runtime History
                </h3>
                <p
                  className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  Total runtime (minutes) aggregated by technique across
                  completed simulations
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={runtimeData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "#2d3a5a" : "#e5e7eb"}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: isDark ? "#9ca3af" : "#4b5563",
                        fontSize: 10,
                      }}
                      interval={0}
                    />
                    <YAxis
                      tick={{
                        fill: isDark ? "#9ca3af" : "#4b5563",
                        fontSize: 11,
                      }}
                      label={{
                        value: "min",
                        angle: -90,
                        position: "insideLeft",
                        fill: isDark ? "#9ca3af" : "#6b7280",
                        fontSize: 10,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1a1f3a" : "#fff",
                        border: `1px solid ${isDark ? "#3f4a68" : "#e5e7eb"}`,
                        borderRadius: "0.5rem",
                        color: isDark ? "#fff" : "#111",
                      }}
                      formatter={(v: any, _: any, props: any) => {
                        const sims = props.payload?.simulationCount || 0;
                        return [
                          `${Number(v).toFixed(2)} min (${sims} runs)`,
                          "Runtime",
                        ];
                      }}
                    />
                    <Bar dataKey="runtime" radius={[4, 4, 0, 0]}>
                      {runtimeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div
                className={`rounded-2xl p-6 ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}
              >
                <h3
                  className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Technique Performance Radar
                </h3>
                <p
                  className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  Normalised scores (0–10) across energy, PUE, cost, and
                  efficiency
                </p>
                {radarData.length > 0 && techniqueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={isDark ? "#2d3a5a" : "#e5e7eb"} />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{
                          fill: isDark ? "#9ca3af" : "#4b5563",
                          fontSize: 11,
                        }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 10]}
                        tick={{
                          fill: isDark ? "#9ca3af" : "#6b7280",
                          fontSize: 9,
                        }}
                      />
                      {techniqueData.map((t) => (
                        <Radar
                          key={t.name}
                          name={t.name}
                          dataKey={t.name}
                          stroke={t.color}
                          fill={t.color}
                          fillOpacity={0.25}
                        />
                      ))}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#1a1f3a" : "#fff",
                          border: `1px solid ${isDark ? "#3f4a68" : "#e5e7eb"}`,
                          borderRadius: "0.5rem",
                          color: isDark ? "#fff" : "#111",
                        }}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    className={`flex items-center justify-center h-64 text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    Run simulations with multiple techniques to see comparison
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Quick Actions */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2
                className={`text-2xl font-bold mb-6 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quickActions.map((action, index) => (
                  <QuickActionCard
                    key={index}
                    {...action}
                    delay={index * 100}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="min-w-0 overflow-hidden">
            <RecentActivity userId={user?.authUserId ?? user?.id ?? ""} isDark={isDark} />
          </div>
        </div>
      </main>

      {/* Custom Animations */}
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
        
        .fade-in {
          animation-name: fadeIn;
        }
        
        .slide-in-from-left-8 {
          animation-name: slideInFromLeft;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInFromLeft {
          from { transform: translateX(-2rem); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
