import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader, RefreshCw, Sparkles } from "lucide-react";

interface ChartDataPoint {
  label: string;
  value: number;
}

export interface InsightSection {
  key: string;
  title: string;
  chartTitle: string;
  chartType: string;
  xAxis: string;
  yAxis: string;
  data: ChartDataPoint[];
}

export interface GraphExplanation {
  explanation: string;
  keyInsight?: string;
  model_used?: string;
}

interface SimulationChartsInsightPanelProps {
  simulationName: string;
  simulationType: string;
  simulationDescription?: string;
  resultData: any;
  isDark: boolean;
}

const GRAPH_EXPLANATION_API_URL =
  import.meta.env.VITE_GRAPH_EXPLANATION_API_URL || "http://localhost:8003/api";
const INSIGHT_CACHE_PREFIX = "graph-explanation-cache:v1:";

const insightCache = new Map<string, Record<string, GraphExplanation>>();
const insightRequestCache = new Map<
  string,
  Promise<Record<string, GraphExplanation>>
>();

export const buildInsightCacheKey = (
  simulationName: string,
  simulationType: string,
  sections: InsightSection[],
  simulationContext: any,
) => {
  const payload = {
    simulationName,
    simulationType,
    simulationContext,
    sections: sections.map((section) => ({
      key: section.key,
      title: section.title,
      chartTitle: section.chartTitle,
      chartType: section.chartType,
      xAxis: section.xAxis,
      yAxis: section.yAxis,
      data: section.data.map((point) => [point.label, point.value]),
    })),
  };

  return `${INSIGHT_CACHE_PREFIX}${JSON.stringify(payload)}`;
};

export const toNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
};

const pickMetric = (values: Array<unknown>): number => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
};

const getPath = (source: any, path: string): any => {
  if (!source || !path) return undefined;
  return path
    .split(".")
    .reduce((value, key) => (value == null ? undefined : value[key]), source);
};

const pickPath = (source: any, paths: string[]): any => {
  for (const path of paths) {
    const value = getPath(source, path);
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
};

const countBy = (rows: any[], key: string): Record<string, number> => {
  return rows.reduce((acc: Record<string, number>, row) => {
    const rawValue = row?.[key];
    const name =
      rawValue == null || rawValue === "" ? "UNKNOWN" : String(rawValue);
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
};

export const buildSections = (
  resultData: any,
  simulationType: string,
): InsightSection[] => {
  const summary = resultData?.summary ?? resultData?.results?.summary ?? {};
  const metrics = resultData?.results?.metrics ?? resultData?.metrics ?? {};
  const annual = resultData?.results?.annual ?? resultData?.annual ?? {};
  const economics =
    resultData?.results?.economics ?? resultData?.economics ?? {};
  const hourly = Array.isArray(resultData?.results?.hourlyResults)
    ? resultData.results.hourlyResults
    : Array.isArray(resultData?.hourlyResults)
      ? resultData.hourlyResults
      : Array.isArray(resultData?.rawAirEconomizerData?.hourlyResults)
        ? resultData.rawAirEconomizerData.hourlyResults
        : Array.isArray(resultData?.rawAirEconomizerData?.hourlyProfile)
          ? resultData.rawAirEconomizerData.hourlyProfile
          : [];
  const copArray: number[] = Array.isArray(resultData?.copOverTime)
    ? resultData.copOverTime
    : [];
  const yearlyData = Array.isArray(resultData?.projection?.yearlyData)
    ? resultData.projection.yearlyData
    : Array.isArray(resultData?.results?.projection?.yearlyData)
      ? resultData.results.projection.yearlyData
      : [];
  const modeBreakdown: Record<string, number> =
    resultData?.airflowViolations?.modeBreakdown ?? {};
  const rackAnalysis = resultData?.rackAnalysis ?? null;
  const gates =
    resultData?.phase4Gates ?? resultData?.results?.phase4Gates ?? {};
  const evapRoot = resultData?.rawEvaporativeData ?? resultData;
  const evapResults = evapRoot?.results ?? {};
  const evapHourly: any[] = Array.isArray(evapRoot?.hourly_data)
    ? evapRoot.hourly_data
    : Array.isArray(resultData?.hourly_data)
      ? resultData.hourly_data
      : Array.isArray(resultData?.hourlyData)
        ? resultData.hourlyData
        : [];
  const evapPerf = evapResults?.performance ?? {};
  const evapWater = evapResults?.water ?? {};
  const evapCost = evapResults?.cost ?? {};
  const evapEmissions = evapResults?.emissions ?? {};
  const evapAssess =
    resultData?.coolingAdequacy ?? evapRoot?.cooling_assessment ?? {};
  const km = evapAssess?.keyMetrics ?? evapAssess?.key_metrics ?? {};

  const numbersFrom = (rows: any[], keys: string[]): number[] =>
    rows
      .map((row) => {
        for (const key of keys) {
          const value = row?.[key];
          if (typeof value === "number" && Number.isFinite(value)) return value;
        }
        return null;
      })
      .filter((value): value is number => value !== null);

  const avg = (values: number[]) =>
    values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
  const min = (values: number[]) => (values.length ? Math.min(...values) : 0);
  const max = (values: number[]) => (values.length ? Math.max(...values) : 0);
  const count = (values: number[]) => values.length;
  const add = (sections: InsightSection[], section: InsightSection) => {
    if (section.data.some((point) => Number.isFinite(point.value))) {
      sections.push(section);
    }
  };

  const sections: InsightSection[] = [];
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

  if (isChilled) {
    const coolingLoadValues = numbersFrom(hourly, ["coolingLoad_kW"]);
    const chillerPowerValues = numbersFrom(hourly, ["chillerPower_kW"]);
    const itLoadValues = numbersFrom(hourly, ["itLoad_kW"]);
    const waterValues = numbersFrom(hourly, ["waterUsage_L"]);
    const carbonValues = numbersFrom(hourly, ["carbonEmissions_kg"]);

    add(sections, {
      key: "chilled-annual-overview",
      title: "Annual Consumption Overview",
      chartTitle: "Annual Consumption Overview",
      chartType: "bar",
      xAxis: "Metric",
      yAxis: "Value",
      data: [
        {
          label: "Energy (kWh)",
          value: pickMetric([annual.energyConsumption_kWh]),
        },
        {
          label: "Cooling Load (kWh)",
          value: pickMetric([annual.coolingLoad_kWh]),
        },
        { label: "Water (L)", value: pickMetric([annual.waterUsage_L]) },
        {
          label: "Carbon (kg)",
          value: pickMetric([annual.carbonEmissions_kg]),
        },
        { label: "Cost (USD)", value: pickMetric([annual.cost_USD]) },
        { label: "Avg COP", value: pickMetric([metrics.averageCOP]) },
        { label: "PUE", value: pickMetric([metrics.pue]) },
      ],
    });

    add(sections, {
      key: "chilled-cop-over-time",
      title: "COP Over Time",
      chartTitle: "COP Over Time",
      chartType: "line",
      xAxis: "Time",
      yAxis: "COP",
      data:
        copArray.length > 0
          ? [
              { label: "Average COP", value: avg(copArray) },
              { label: "Minimum COP", value: min(copArray) },
              { label: "Maximum COP", value: max(copArray) },
              { label: "Samples", value: count(copArray) },
            ]
          : [],
    });

    add(sections, {
      key: "chilled-load-power",
      title: "Hourly Cooling Load vs Chiller Power",
      chartTitle: "Hourly Cooling Load vs Chiller Power",
      chartType: "area",
      xAxis: "Hour",
      yAxis: "kW",
      data: [
        { label: "Avg Cooling Load", value: avg(coolingLoadValues) },
        { label: "Peak Cooling Load", value: max(coolingLoadValues) },
        { label: "Avg Chiller Power", value: avg(chillerPowerValues) },
        { label: "Peak Chiller Power", value: max(chillerPowerValues) },
      ],
    });

    add(sections, {
      key: "chilled-it-chiller",
      title: "Hourly IT Load vs Chiller Power",
      chartTitle: "Hourly IT Load vs Chiller Power",
      chartType: "area",
      xAxis: "Hour",
      yAxis: "kW",
      data: [
        { label: "Avg IT Load", value: avg(itLoadValues) },
        { label: "Peak IT Load", value: max(itLoadValues) },
        { label: "Avg Chiller Power", value: avg(chillerPowerValues) },
        { label: "Peak Chiller Power", value: max(chillerPowerValues) },
      ],
    });

    add(sections, {
      key: "chilled-water-carbon",
      title: "Hourly Water Usage & Carbon Emissions",
      chartTitle: "Hourly Water Usage & Carbon Emissions",
      chartType: "line",
      xAxis: "Hour",
      yAxis: "Usage",
      data: [
        { label: "Avg Water Usage", value: avg(waterValues) },
        { label: "Peak Water Usage", value: max(waterValues) },
        { label: "Avg Carbon Emissions", value: avg(carbonValues) },
        { label: "Peak Carbon Emissions", value: max(carbonValues) },
      ],
    });

    add(sections, {
      key: "chilled-cost-structure",
      title: "Full Cost Structure",
      chartTitle: "Full Cost Structure",
      chartType: "bar",
      xAxis: "Cost Component",
      yAxis: "USD",
      data: [
        {
          label: "Annual OpEx",
          value: pickMetric([economics.opex_annual_USD, annual.cost_USD]),
        },
        { label: "CAPEX", value: pickMetric([economics.capex_USD]) },
        { label: "LCCP", value: pickMetric([economics.lccp_USD]) },
        { label: "NPV", value: pickMetric([economics.npv_USD]) },
        {
          label: "Payback (yrs)",
          value: pickMetric([economics.paybackPeriod_years]),
        },
      ],
    });

    const passCount = Object.values(gates).filter(
      (value) => String(value).toUpperCase() === "PASS",
    ).length;
    const failCount = Object.values(gates).filter(
      (value) => String(value).toUpperCase() === "FAIL",
    ).length;
    add(sections, {
      key: "chilled-gates",
      title: "Phase 4 Compliance Gates",
      chartTitle: "Phase 4 Compliance Gates",
      chartType: "bar",
      xAxis: "Status",
      yAxis: "Count",
      data: [
        { label: "PASS", value: passCount },
        { label: "FAIL", value: failCount },
        { label: "Total", value: passCount + failCount },
      ],
    });
  }

  if (isAir) {
    const powerIt = numbersFrom(hourly, ["itLoad_kW"]);
    const powerFan = numbersFrom(hourly, ["fanPower_kW"]);
    const powerMech = numbersFrom(hourly, ["mechPower_kW"]);
    const powerTotal = numbersFrom(hourly, ["totalPower_kW"]);
    const airflowRequired = numbersFrom(hourly, ["requiredAirflow_CFM"]);
    const freeCooling = numbersFrom(hourly, ["q_free_kW"]);
    const mechLoad = numbersFrom(hourly, ["mech_load_kW"]);
    const violations = hourly.filter(
      (row: { airflowViolation?: unknown }) => row?.airflowViolation,
    ).length;
    const pueValues = numbersFrom(hourly, ["pue"]);
    const cueValues = numbersFrom(hourly, ["cue"]);
    const tempValues = numbersFrom(hourly, [
      "outdoorTempC",
      "ambientTemp_C",
      "tempC",
    ]);
    const humidityValues = numbersFrom(hourly, ["outdoorRH", "rh"]);

    add(sections, {
      key: "air-power-breakdown",
      title: "Hourly Power Breakdown",
      chartTitle: "Hourly Power Breakdown",
      chartType: "area",
      xAxis: "Hour",
      yAxis: "kW",
      data: [
        { label: "IT Load Avg", value: avg(powerIt) },
        { label: "Fan Power Avg", value: avg(powerFan) },
        { label: "Mechanical Avg", value: avg(powerMech) },
        { label: "Total Power Avg", value: avg(powerTotal) },
        { label: "Peak Total Power", value: max(powerTotal) },
      ],
    });

    add(sections, {
      key: "air-airflow",
      title: "Airflow & Free Cooling vs Mechanical",
      chartTitle: "Airflow & Free Cooling vs Mechanical",
      chartType: "mixed",
      xAxis: "Hour",
      yAxis: "kW / CFM",
      data: [
        { label: "Required Airflow Max", value: max(airflowRequired) },
        { label: "Free Cooling Avg", value: avg(freeCooling) },
        { label: "Mechanical Load Avg", value: avg(mechLoad) },
        { label: "Violation Hours", value: violations },
      ],
    });

    add(sections, {
      key: "air-modes",
      title: "Cooling Mode Distribution",
      chartTitle: "Cooling Mode Distribution",
      chartType: "pie",
      xAxis: "Mode",
      yAxis: "Hours",
      data: Object.entries(modeBreakdown).map(([mode, hours]) => ({
        label: mode.replace(/_/g, " "),
        value: hours,
      })),
    });

    add(sections, {
      key: "air-cost-structure",
      title: "Full Cost Structure",
      chartTitle: "Full Cost Structure",
      chartType: "bar",
      xAxis: "Cost Component",
      yAxis: "USD",
      data: [
        {
          label: "Electricity Cost",
          value: pickMetric([summary.electricityCostUSD]),
        },
        { label: "Carbon Tax", value: pickMetric([summary.carbonTaxCostUSD]) },
        { label: "Annual OpEx", value: pickMetric([summary.annualOpExUSD]) },
        { label: "CAPEX", value: pickMetric([summary.totalCapexUSD]) },
        {
          label: "Annual Savings",
          value: pickMetric([summary.annualSavingsUSD]),
        },
      ],
    });

    if (rackAnalysis) {
      add(sections, {
        key: "air-rack",
        title: "Rack Analysis (CloudSim)",
        chartTitle: "Rack Analysis (CloudSim)",
        chartType: "bar",
        xAxis: "Metric",
        yAxis: "Value",
        data: [
          {
            label: "Average Rack Load",
            value: pickMetric([rackAnalysis.averageRackLoadKW]),
          },
          {
            label: "Max Rack Load",
            value: pickMetric([rackAnalysis.maxRackLoadKW]),
          },
          {
            label: "Hotspot Racks",
            value: pickMetric([rackAnalysis.hotspotRacks]),
          },
          {
            label: "Total Racks",
            value: pickMetric([rackAnalysis.totalRacks]),
          },
        ],
      });
    }

    add(sections, {
      key: "air-pue-cue",
      title: "Hourly PUE & CUE",
      chartTitle: "Hourly PUE & CUE",
      chartType: "line",
      xAxis: "Hour",
      yAxis: "Effectiveness",
      data: [
        { label: "Avg PUE", value: avg(pueValues) },
        { label: "Min PUE", value: min(pueValues) },
        { label: "Max PUE", value: max(pueValues) },
        { label: "Avg CUE", value: avg(cueValues) },
      ],
    });

    add(sections, {
      key: "air-weather",
      title: "Ambient Temperature & Humidity",
      chartTitle: "Ambient Temperature & Humidity",
      chartType: "line",
      xAxis: "Hour",
      yAxis: "Weather",
      data: [
        { label: "Avg Temp (C)", value: avg(tempValues) },
        { label: "Max Temp (C)", value: max(tempValues) },
        { label: "Avg RH (%)", value: avg(humidityValues) },
        { label: "Peak RH (%)", value: max(humidityValues) },
      ],
    });
  }

  if (isEvap) {
    const evapPower = numbersFrom(evapHourly, ["itLoadKW", "itLoad_kW"]);
    const evapCooling = numbersFrom(evapHourly, [
      "coolingCapacityKW",
      "coolingCapacity_kW",
    ]);
    const evapWaterValues = numbersFrom(evapHourly, [
      "waterEvaporationLph",
      "waterEvaporation_Lph",
    ]);
    const evapPue = numbersFrom(evapHourly, ["pue"]);
    const evapTemp = numbersFrom(evapHourly, [
      "ambientTempC",
      "tempC",
      "outdoorTempC",
    ]);
    const evapHumidity = numbersFrom(evapHourly, [
      "supplyHumidity",
      "humidity",
      "outdoorRH",
    ]);
    const evapModeCounts = countBy(evapHourly, "coolingMode");
    const evapPueAvg = pickMetric([evapPerf.pue_average, metrics.pue]);
    const evapPueMax = pickMetric([evapPerf.pue_max, metrics.pue]);

    add(sections, {
      key: "evap-annual-overview",
      title: "Annual Evaporative Cooling Summary",
      chartTitle: "Annual Evaporative Cooling Summary",
      chartType: "bar",
      xAxis: "Metric",
      yAxis: "Value",
      data: [
        {
          label: "Energy (kWh)",
          value: pickMetric([
            pickPath(evapResults, ["energy.electricity_kwh_total"]),
            annual.energyConsumption_kWh,
          ]),
        },
        {
          label: "IT Energy (kWh)",
          value: pickMetric([pickPath(evapResults, ["energy.it_kwh"])]),
        },
        {
          label: "Fan Energy (kWh)",
          value: pickMetric([pickPath(evapResults, ["energy.fan_kwh"])]),
        },
        {
          label: "Water (L)",
          value: pickMetric([
            pickPath(evapResults, [
              "water.water_liters_total",
              "water.water_liters_total",
            ]),
            evapWater.water_liters_total,
            annual.waterUsage_L,
          ]),
        },
        {
          label: "Carbon (kg)",
          value: pickMetric([
            pickPath(evapResults, ["emissions.co2_kg_total"]),
            evapEmissions.co2_kg_total,
            annual.carbonEmissions_kg,
          ]),
        },
        {
          label: "Cost (USD)",
          value: pickMetric([
            pickPath(evapResults, ["cost.total_energy_cost_usd"]),
            evapCost.total_energy_cost_usd,
            annual.cost_USD,
          ]),
        },
        {
          label: "Avg PUE",
          value: pickMetric([
            pickPath(evapResults, ["performance.pue_average"]),
            evapPerf.pue_average,
            metrics.pue,
          ]),
        },
        {
          label: "Avg WUE",
          value: pickMetric([
            pickPath(evapResults, ["performance.wue_average"]),
            evapPerf.wue_average,
            metrics.wue,
          ]),
        },
      ],
    });

    add(sections, {
      key: "evap-hourly-power",
      title: "Hourly Power Breakdown",
      chartTitle: "Hourly Power Breakdown",
      chartType: "area",
      xAxis: "Hour",
      yAxis: "kW",
      data: [
        { label: "Avg IT Load", value: avg(evapPower) },
        { label: "Peak IT Load", value: max(evapPower) },
        {
          label: "Avg Fan Power",
          value: avg(numbersFrom(evapHourly, ["fanPowerKW", "fanPower_kW"])),
        },
        {
          label: "Avg DX Backup",
          value: avg(numbersFrom(evapHourly, ["dxPowerKW", "dxPower_kW"])),
        },
        {
          label: "Avg Total Electrical",
          value: avg(
            numbersFrom(evapHourly, [
              "totalElectricalKW",
              "totalElectrical_kW",
            ]),
          ),
        },
      ],
    });

    add(sections, {
      key: "evap-capacity",
      title: "Cooling Capacity vs IT Load per Hour",
      chartTitle: "Cooling Capacity vs IT Load per Hour",
      chartType: "area",
      xAxis: "Hour",
      yAxis: "kW",
      data: [
        { label: "Avg IT Load", value: avg(evapPower) },
        { label: "Peak IT Load", value: max(evapPower) },
        { label: "Avg Cooling Capacity", value: avg(evapCooling) },
        {
          label: "Peak Deficit",
          value: max(
            evapPower.map((value, index) => value - (evapCooling[index] ?? 0)),
          ),
        },
        { label: "Avg Water Evaporation", value: avg(evapWaterValues) },
      ],
    });

    add(sections, {
      key: "evap-pue-compare",
      title: "Hourly PUE vs Annual Average & Max",
      chartTitle: "Hourly PUE vs Annual Average & Max",
      chartType: "line",
      xAxis: "Hour",
      yAxis: "PUE",
      data: [
        { label: "Hourly PUE Avg", value: avg(evapPue) },
        { label: "Annual Average PUE", value: evapPueAvg },
        { label: "Annual Max PUE", value: evapPueMax },
        { label: "Hourly PUE Max", value: max(evapPue) },
      ],
    });

    add(sections, {
      key: "evap-temp",
      title: "Temperature & Humidity per Hour",
      chartTitle: "Temperature & Humidity per Hour",
      chartType: "line",
      xAxis: "Hour",
      yAxis: "Weather",
      data: [
        { label: "Ambient Temp Avg", value: avg(evapTemp) },
        {
          label: "Inlet Temp Avg",
          value: avg(numbersFrom(evapHourly, ["inletTempC"])),
        },
        {
          label: "Supply Temp Avg",
          value: avg(numbersFrom(evapHourly, ["supplyTempC"])),
        },
        { label: "Ambient Humidity Avg", value: avg(evapHumidity) },
      ],
    });

    add(sections, {
      key: "evap-supply",
      title: "Supply Air Conditions per Hour",
      chartTitle: "Supply Air Conditions per Hour",
      chartType: "line",
      xAxis: "Hour",
      yAxis: "% / °C",
      data: [
        {
          label: "Supply Temp Avg",
          value: avg(numbersFrom(evapHourly, ["supplyTempC"])),
        },
        {
          label: "Supply Humidity Avg",
          value: avg(numbersFrom(evapHourly, ["supplyHumidity"])),
        },
        {
          label: "Ambient Humidity Avg",
          value: avg(numbersFrom(evapHourly, ["ambientHumidity"])),
        },
        {
          label: "Inlet Temp Avg",
          value: avg(numbersFrom(evapHourly, ["inletTempC"])),
        },
      ],
    });

    add(sections, {
      key: "evap-modes",
      title: "Cooling Mode Distribution",
      chartTitle: "Cooling Mode Distribution",
      chartType: "pie",
      xAxis: "Mode",
      yAxis: "Hours",
      data: Object.entries(evapModeCounts)
        .filter(([, hours]) => hours > 0)
        .map(([mode, hours]) => ({
          label: mode.replace(/_/g, " "),
          value: hours,
        })),
    });

    add(sections, {
      key: "evap-pue",
      title: "PUE per Hour",
      chartTitle: "PUE per Hour",
      chartType: "line",
      xAxis: "Hour",
      yAxis: "PUE",
      data: [
        { label: "Average PUE", value: avg(evapPue) },
        { label: "Minimum PUE", value: min(evapPue) },
        { label: "Maximum PUE", value: max(evapPue) },
      ],
    });

    add(sections, {
      key: "evap-assessment",
      title: "Cooling Assessment",
      chartTitle: "Cooling Assessment",
      chartType: "summary",
      xAxis: "Metric",
      yAxis: "Value",
      data: [
        {
          label: "Cooling Capacity Avg",
          value: pickMetric([km.cooling_capacity_avg_kw]),
        },
        {
          label: "Humidity Deviation",
          value: pickMetric([km.humidity_deviation]),
        },
        { label: "Average Temp", value: pickMetric([km.avg_temp_c]) },
        { label: "Average RH", value: pickMetric([km.avg_rh_percent]) },
      ],
    });
  }

  add(sections, {
    key: "shared-radar",
    title: "Performance Radar",
    chartTitle: "Performance Radar",
    chartType: "radar",
    xAxis: "Metric",
    yAxis: "Score",
    data: [
      {
        label: "PUE Eff",
        value: Math.max(
          0,
          10 - ((metrics.pue ?? summary.averagePUE ?? 1.5) - 1) * 5,
        ),
      },
      {
        label: "CUE Eff",
        value: Math.max(
          0,
          10 - (metrics.cue ?? summary.averageCUE ?? 0.5) * 10,
        ),
      },
      {
        label: "Energy Sav",
        value: Math.min(10, (summary.energySavingsPercent ?? 0) / 5),
      },
      {
        label: "Cost Sav",
        value: Math.min(10, (summary.annualSavingsUSD ?? 0) / 20000),
      },
      {
        label: "Carbon Sav",
        value: Math.min(10, (summary.carbonSavings_kg ?? 0) / 10000),
      },
    ],
  });

  if (yearlyData.length > 0) {
    const yearlyEnergyCost = numbersFrom(yearlyData, ["energyCostUSD"]);
    const yearlyCarbonTax = numbersFrom(yearlyData, ["carbonTaxUSD"]);
    const yearlySavings = numbersFrom(yearlyData, ["costSavingsUSD"]);
    const yearlyEmissions = numbersFrom(yearlyData, ["emissionsTonsCO2"]);

    add(sections, {
      key: "shared-projection",
      title: "5-Year Financial & Environmental Projection",
      chartTitle: "5-Year Financial & Environmental Projection",
      chartType: "line",
      xAxis: "Year",
      yAxis: "Value",
      data: [
        {
          label: "NPV Savings",
          value: pickMetric([
            resultData?.projection?.npvSavings,
            resultData?.results?.projection?.npvSavings,
          ]),
        },
        {
          label: "Total Savings",
          value: pickMetric([
            resultData?.projection?.totalSavings,
            resultData?.results?.projection?.totalSavings,
          ]),
        },
        {
          label: "Total Cost",
          value: pickMetric([
            resultData?.projection?.totalCost,
            resultData?.results?.projection?.totalCost,
          ]),
        },
        {
          label: "Total Emissions",
          value: pickMetric([
            resultData?.projection?.totalEmissions,
            resultData?.results?.projection?.totalEmissions,
          ]),
        },
        {
          label: "Avg Yearly Cost",
          value: avg(yearlyEnergyCost) + avg(yearlyCarbonTax),
        },
        { label: "Avg Yearly Savings", value: avg(yearlySavings) },
        { label: "Avg Yearly Emissions", value: avg(yearlyEmissions) },
      ],
    });
  }

  return sections.filter(
    (section) =>
      section.data.length > 0 &&
      section.data.some((point) => point.value !== 0),
  );
};

export const SimulationChartsInsightPanel: React.FC<
  SimulationChartsInsightPanelProps
> = ({
  simulationName,
  simulationType,
  simulationDescription,
  resultData,
  isDark,
}) => {
  const sections = useMemo(
    () => buildSections(resultData, simulationType),
    [resultData, simulationType],
  );
  const [insights, setInsights] = useState<Record<string, GraphExplanation>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoFetchKeyRef = useRef<string>("");

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
    return buildInsightCacheKey(
      simulationName,
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
        setError(null);
        setLoading(false);
        return;
      }
    } catch {
      // ignore storage errors and fall through to fetching
    }

    const cachedInsights = insightCache.get(panelFetchKey);
    if (cachedInsights) {
      setInsights(cachedInsights);
      setError(null);
      setLoading(false);
      return;
    }

    const cachedRequest = insightRequestCache.get(panelFetchKey);
    if (cachedRequest) {
      setLoading(true);
      setError(null);

      try {
        const awaitedInsights = await cachedRequest;
        setInsights(awaitedInsights);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate chart explanations",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

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
        setError(
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
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate chart explanations",
      );
    } finally {
      insightRequestCache.delete(panelFetchKey);
      setLoading(false);
    }
  };

  useEffect(() => {
    const autoFetchKey = panelFetchKey;

    if (sections.length === 0 || autoFetchKeyRef.current === autoFetchKey) {
      return;
    }

    autoFetchKeyRef.current = autoFetchKey;
    setInsights({});
    void fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelFetchKey, sections.length, simulationName, simulationType]);

  if (sections.length === 0) {
    return (
      <div
        className={`rounded-xl border p-5 ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}
      >
        <p className={isDark ? "text-gray-300" : "text-gray-600"}>
          No chart metrics were found for this simulation.
        </p>
      </div>
    );
  }

  return (
    <aside
      className={`rounded-xl border p-5 space-y-4 ${isDark ? "bg-[#1a1f3a] border-[#3f4a68]" : "bg-white border-gray-200"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles
              className={`w-5 h-5 ${isDark ? "text-[#5ce1e5]" : "text-blue-600"}`}
            />
            <h3
              className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              AI Chart Explanations
            </h3>
          </div>
          <p
            className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Groq explains the chart groups shown in this simulation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchInsights(true)}
          disabled={loading}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${isDark ? "bg-[#27304a] text-white hover:bg-[#3f4a68] disabled:bg-[#1c2438]" : "bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:bg-gray-50"}`}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${isDark ? "border-red-900/50 bg-red-950/30 text-red-200" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isDark ? "border-[#3f4a68] bg-[#0f1530] text-gray-300" : "border-gray-200 bg-gray-50 text-gray-600"}`}
        >
          <Loader className="h-4 w-4 animate-spin" />
          Generating chart explanations...
        </div>
      )}

      <div className="space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
        {sections.map((section) => {
          const insight = insights[section.key];

          return (
            <div
              key={section.key}
              className={`rounded-lg border p-4 ${isDark ? "border-[#3f4a68] bg-[#0f1530]" : "border-gray-200 bg-gray-50"}`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4
                    className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {section.title}
                  </h4>
                  <p
                    className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {section.chartTitle}
                  </p>
                </div>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                {section.data.map((point) => (
                  <div
                    key={point.label}
                    className={`rounded-md px-2 py-2 ${isDark ? "bg-[#1a1f3a]" : "bg-white"}`}
                  >
                    <p
                      className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {point.label}
                    </p>
                    <p
                      className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {Number.isFinite(point.value)
                        ? point.value.toLocaleString()
                        : "0"}
                    </p>
                  </div>
                ))}
              </div>

              {insight ? (
                <div className="space-y-2">
                  <p
                    className={`text-sm leading-relaxed ${isDark ? "text-gray-200" : "text-gray-700"}`}
                  >
                    {insight.explanation}
                  </p>
                  {insight.keyInsight && (
                    <div
                      className={`rounded-md border-l-4 px-3 py-2 ${isDark ? "border-[#5ce1e5] bg-[#1a1f3a]" : "border-blue-500 bg-white"}`}
                    >
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-[#5ce1e5]" : "text-blue-700"}`}
                      >
                        Quick Takeaway
                      </p>
                      <p
                        className={`text-xs ${isDark ? "text-gray-200" : "text-gray-700"}`}
                      >
                        {insight.keyInsight}
                      </p>
                    </div>
                  )}
                  <p
                    className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    Model: {insight.model_used}
                  </p>
                </div>
              ) : loading ? (
                <p
                  className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  Waiting for AI explanation...
                </p>
              ) : (
                <p
                  className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  Explanation will appear here.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
