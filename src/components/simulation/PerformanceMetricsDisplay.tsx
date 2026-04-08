import React from "react";
import {
  Zap,
  Droplets,
  DollarSign,
  Leaf,
  Thermometer,
  Activity,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Gauge,
} from "lucide-react";

interface PerformanceMetricsDisplayProps {
  resultData: any;
  simulationType: string;
  isDark: boolean;
}

/**
 * Universal Performance Metrics Display Component
 * Displays realistic performance metrics from all cooling technique APIs
 */
export const PerformanceMetricsDisplay: React.FC<
  PerformanceMetricsDisplayProps
> = ({ resultData, simulationType, isDark }) => {
  // Use actual simulation response first. _api_payload is request config backup only.
  const apiPayload = resultData || resultData?._api_payload;

  // Normalize metrics based on simulation type
  const metrics = extractMetrics(apiPayload, simulationType);

  if (!metrics) {
    return (
      <div
        className={`p-4 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
      >
        <p className={isDark ? "text-gray-400" : "text-gray-600"}>
          No performance metrics available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.pue !== undefined && (
          <MetricCard
            icon={<Gauge className="w-5 h-5" />}
            label="PUE"
            value={metrics.pue.toFixed(3)}
            unit=""
            description="Power Usage Effectiveness"
            color="cyan"
            isDark={isDark}
          />
        )}
        {metrics.wue !== undefined && (
          <MetricCard
            icon={<Droplets className="w-5 h-5" />}
            label="WUE"
            value={metrics.wue.toFixed(3)}
            unit="L/kWh"
            description="Water Usage Effectiveness"
            color="blue"
            isDark={isDark}
          />
        )}
        {metrics.cue !== undefined && (
          <MetricCard
            icon={<Leaf className="w-5 h-5" />}
            label="CUE"
            value={metrics.cue.toFixed(3)}
            unit="kgCO₂/kWh"
            description="Carbon Usage Effectiveness"
            color="green"
            isDark={isDark}
          />
        )}
        {metrics.cop !== undefined && (
          <MetricCard
            icon={<Activity className="w-5 h-5" />}
            label="COP"
            value={metrics.cop.toFixed(2)}
            unit=""
            description="Coefficient of Performance"
            color="purple"
            isDark={isDark}
          />
        )}
      </div>

      {/* Energy Breakdown */}
      {metrics.energy && (
        <div
          className={`p-4 rounded-xl ${isDark ? "bg-[#1a1f3a]" : "bg-white"} border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
        >
          <h3
            className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            <Zap
              className={`w-5 h-5 ${isDark ? "text-yellow-400" : "text-yellow-600"}`}
            />
            Energy Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.energy.totalEnergy !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Total Energy
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {formatEnergy(metrics.energy.totalEnergy)}
                </p>
              </div>
            )}
            {metrics.energy.itEnergy !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  IT Energy
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {formatEnergy(metrics.energy.itEnergy)}
                </p>
              </div>
            )}
            {metrics.energy.coolingEnergy !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Cooling Energy
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {formatEnergy(metrics.energy.coolingEnergy)}
                </p>
              </div>
            )}
            {metrics.energy.fanEnergy !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Fan Energy
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {formatEnergy(metrics.energy.fanEnergy)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Water Usage */}
      {metrics.water && (
        <div
          className={`p-4 rounded-xl ${isDark ? "bg-[#1a1f3a]" : "bg-white"} border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
        >
          <h3
            className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            <Droplets
              className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`}
            />
            Water Usage
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.water.totalWater !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Total Water
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {formatWater(metrics.water.totalWater)}
                </p>
              </div>
            )}
            {metrics.water.evaporation !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Evaporation
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {formatWater(metrics.water.evaporation)}
                </p>
              </div>
            )}
            {metrics.water.blowdown !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Blowdown
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {formatWater(metrics.water.blowdown)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cost & Economics */}
      {metrics.economics && (
        <div
          className={`p-4 rounded-xl ${isDark ? "bg-[#1a1f3a]" : "bg-white"} border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
        >
          <h3
            className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            <DollarSign
              className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`}
            />
            Cost & Economics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.economics.totalCost !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Total Cost
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  ${formatNumber(metrics.economics.totalCost)}
                </p>
              </div>
            )}
            {metrics.economics.electricityCost !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Electricity Cost
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  ${formatNumber(metrics.economics.electricityCost)}
                </p>
              </div>
            )}
            {metrics.economics.opexAnnual !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Annual OPEX
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  ${formatNumber(metrics.economics.opexAnnual)}
                </p>
              </div>
            )}
            {metrics.economics.capex !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  CAPEX
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  ${formatNumber(metrics.economics.capex)}
                </p>
              </div>
            )}
            {metrics.economics.npv !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  NPV
                </p>
                <p
                  className={`text-xl font-bold ${metrics.economics.npv >= 0 ? "text-green-500" : "text-red-500"}`}
                >
                  ${formatNumber(metrics.economics.npv)}
                </p>
              </div>
            )}
            {metrics.economics.paybackYears !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Payback Period
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {metrics.economics.paybackYears >= 999
                    ? "N/A"
                    : `${metrics.economics.paybackYears.toFixed(1)} years`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Carbon Emissions */}
      {metrics.emissions && (
        <div
          className={`p-4 rounded-xl ${isDark ? "bg-[#1a1f3a]" : "bg-white"} border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
        >
          <h3
            className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            <Leaf
              className={`w-5 h-5 ${isDark ? "text-green-400" : "text-green-600"}`}
            />
            Carbon Emissions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metrics.emissions.totalCO2 !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Total CO₂
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {formatNumber(metrics.emissions.totalCO2)} kg
                </p>
              </div>
            )}
            {metrics.emissions.carbonTax !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Carbon Tax
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  ${formatNumber(metrics.emissions.carbonTax)}
                </p>
              </div>
            )}
            {metrics.emissions.carbonSavings !== undefined && (
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Carbon Savings
                </p>
                <p className={`text-xl font-bold text-green-500`}>
                  {formatNumber(metrics.emissions.carbonSavings)} kg
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cooling Assessment (Evaporative specific) */}
      {metrics.coolingAssessment && (
        <div
          className={`p-4 rounded-xl ${isDark ? "bg-[#1a1f3a]" : "bg-white"} border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
        >
          <h3
            className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            <Thermometer
              className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
            />
            Cooling Assessment
          </h3>
          <div className="flex items-center gap-3 mb-4">
            {metrics.coolingAssessment.status === "COOLING_SUFFICIENT" ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-500" />
            )}
            <span
              className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
            >
              {metrics.coolingAssessment.status?.replace(/_/g, " ")}
            </span>
            <span
              className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              ({(metrics.coolingAssessment.confidence * 100).toFixed(0)}%
              confidence)
            </span>
          </div>
          {metrics.coolingAssessment.keyMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Max Inlet Temp
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {metrics.coolingAssessment.keyMetrics.maxInletTemp?.toFixed(
                    1,
                  )}
                  °C
                </p>
              </div>
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Cooling Capacity
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {metrics.coolingAssessment.keyMetrics.coolingCapacityAvg?.toFixed(
                    1,
                  )}{" "}
                  kW
                </p>
              </div>
              <div
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <p
                  className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  Availability
                </p>
                <p
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {metrics.coolingAssessment.availability?.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase 4 Gates (Chilled Water specific) */}
      {metrics.phase4Gates && (
        <div
          className={`p-4 rounded-xl ${isDark ? "bg-[#1a1f3a]" : "bg-white"} border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
        >
          <h3
            className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            <BarChart3
              className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`}
            />
            Phase 4 Compliance Gates
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(metrics.phase4Gates).map(([gate, status]) => (
              <div
                key={gate}
                className={`p-3 rounded-lg ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}
              >
                <div className="flex items-center gap-2">
                  {status === "PASS" ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span
                    className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {gate.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </div>
                <p
                  className={`text-lg font-bold ${status === "PASS" ? "text-green-500" : "text-red-500"}`}
                >
                  {String(status)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  description: string;
  color: "cyan" | "blue" | "green" | "purple" | "yellow" | "orange";
  isDark: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  unit,
  description,
  color,
  isDark,
}) => {
  const colorClasses = {
    cyan: isDark ? "text-cyan-400" : "text-cyan-600",
    blue: isDark ? "text-blue-400" : "text-blue-600",
    green: isDark ? "text-green-400" : "text-green-600",
    purple: isDark ? "text-purple-400" : "text-purple-600",
    yellow: isDark ? "text-yellow-400" : "text-yellow-600",
    orange: isDark ? "text-orange-400" : "text-orange-600",
  };

  return (
    <div
      className={`p-4 rounded-xl ${isDark ? "bg-[#1a1f3a]" : "bg-white"} border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
    >
      <div className={`flex items-center gap-2 mb-2 ${colorClasses[color]}`}>
        {icon}
        <span
          className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          {label}
        </span>
      </div>
      <p
        className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
      >
        {value}
        {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </p>
      <p
        className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}
      >
        {description}
      </p>
    </div>
  );
};

// Utility Functions
function formatEnergy(kwh: number): string {
  if (kwh >= 1000000) return `${(kwh / 1000000).toFixed(2)} GWh`;
  if (kwh >= 1000) return `${(kwh / 1000).toFixed(2)} MWh`;
  return `${kwh.toFixed(2)} kWh`;
}

function formatWater(liters: number): string {
  if (liters >= 1000000) return `${(liters / 1000000).toFixed(2)} ML`;
  if (liters >= 1000) return `${(liters / 1000).toFixed(2)} kL`;
  return `${liters.toFixed(0)} L`;
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
}

// Extract and normalize metrics from different API response formats
function extractMetrics(apiPayload: any, simulationType: string): any {
  if (!apiPayload) return null;

  const type = simulationType?.toUpperCase();

  // Air Economizer format
  if (type === "AIR ECONOMIZER" || apiPayload.summary) {
    const summary = apiPayload.summary || apiPayload;
    return {
      pue: summary.averagePUE,
      cue: summary.averageCUE,
      energy: {
        totalEnergy: summary.totalEnergy_kWh,
        itEnergy: summary.totalItEnergy_kWh,
        coolingEnergy: summary.totalCoolingEnergy_kWh,
      },
      water:
        summary.waterUsage_liters > 0
          ? {
              totalWater: summary.waterUsage_liters,
            }
          : undefined,
      economics: {
        totalCost: summary.estimatedOpExUSD,
        electricityCost: summary.electricityCostUSD,
        opexAnnual: summary.annualOpExUSD,
        capex: summary.totalCapexUSD,
        paybackYears: summary.paybackPeriodYears,
      },
      emissions: {
        totalCO2: summary.totalCarbonEmissions_kg,
        carbonTax: summary.carbonTaxCostUSD,
        carbonSavings: summary.carbonSavings_kg,
      },
    };
  }

  // Chilled Water format
  if (type === "CHILLED WATER" || apiPayload.results?.metrics) {
    const results = apiPayload.results || apiPayload;
    const metrics = results.metrics || {};
    const annual = results.annual || {};
    const economics = results.economics || {};
    const phase4Gates = results.phase4Gates;

    return {
      pue: metrics.pue,
      wue: metrics.wue,
      cop: metrics.averageCOP,
      energy: {
        totalEnergy: annual.energyConsumption_kWh,
        coolingEnergy: annual.coolingLoad_kWh,
      },
      water: {
        totalWater: annual.waterUsage_L,
      },
      economics: {
        totalCost: annual.cost_USD,
        opexAnnual: economics.opex_annual_USD,
        capex: economics.capex_USD,
        npv: economics.npv_USD,
        paybackYears: economics.paybackPeriod_years,
      },
      emissions: {
        totalCO2: annual.carbonEmissions_kg,
      },
      phase4Gates,
    };
  }

  // Evaporative format
  if (type === "EVAPORATIVE" || apiPayload.results?.energy) {
    const results = apiPayload.results || apiPayload;
    const energy = results.energy || {};
    const water = results.water || {};
    const cost = results.cost || {};
    const opex = results.opex || {};
    const emissions = results.emissions || {};
    const performance = results.performance || {};
    const coolingAssessment = apiPayload.cooling_assessment || {};

    return {
      pue: performance.pue_average,
      wue: performance.wue_average,
      cue: performance.cue_average,
      energy: {
        totalEnergy: energy.electricity_kwh_total,
        itEnergy: energy.it_kwh,
        coolingEnergy: energy.fan_kwh + (energy.dx_kwh || 0),
        fanEnergy: energy.fan_kwh,
      },
      water: {
        totalWater: water.water_liters_total,
        evaporation: water.evaporation_liters,
        blowdown: water.blowdown_liters,
      },
      economics: {
        totalCost: cost.total_energy_cost_usd,
        electricityCost: cost.electricity_usd,
        opexAnnual: opex.opex_total_usd,
      },
      emissions: {
        totalCO2: emissions.co2_kg_total,
      },
      coolingAssessment: coolingAssessment
        ? {
            status: coolingAssessment.status,
            confidence: coolingAssessment.confidence,
            keyMetrics: coolingAssessment.key_metrics
              ? {
                  maxInletTemp: coolingAssessment.key_metrics.max_inlet_temp_c,
                  coolingCapacityAvg:
                    coolingAssessment.key_metrics.cooling_capacity_avg_kw,
                }
              : undefined,
            availability: performance.availability_percent,
          }
        : undefined,
    };
  }

  // Generic fallback - try to extract common fields
  return {
    pue: apiPayload.pue || apiPayload.averagePUE,
    wue: apiPayload.wue,
    cop: apiPayload.cop || apiPayload.averageCOP,
  };
}

export default PerformanceMetricsDisplay;
