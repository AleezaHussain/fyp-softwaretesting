type ChartContextRow = Record<string, any>;

type ChartContextEntry = {
  name: string;
  source: string;
  sourceFields: string[];
  data: ChartContextRow[] | Record<string, any>;
};

type ChartContextGroup = {
  group: "chilled" | "air" | "evap" | "shared";
  charts: ChartContextEntry[];
};

export type SimulationChartContext = {
  source: "frontend";
  simulationType: string;
  detectedModes: {
    chilled: boolean;
    air: boolean;
    evaporative: boolean;
  };
  chartGroups: ChartContextGroup[];
  chartNames: string[];
};

function sample<T>(arr: T[], max = 200): T[] {
  if (arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  return arr.filter((_, index) => index % step === 0);
}

function round(value: any, digits = 2) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? +num.toFixed(digits) : 0;
}

function toHourlySeries<T extends Record<string, any>, R>(
  data: T[],
  mapper: (row: T, index: number) => R,
) {
  return sample(data, 200).map(mapper);
}

function buildSharedProjectionContext(
  resultData: any,
): ChartContextEntry | null {
  const yearlyData: any[] =
    resultData?.projection?.yearlyData ??
    resultData?.results?.projection?.yearlyData ??
    [];
  if (!Array.isArray(yearlyData) || yearlyData.length === 0) return null;

  const chartData = yearlyData.map((row) => ({
    year: `Y${row.year}`,
    energyCost: round(row.energyCostUSD, 0),
    carbonTax: round(row.carbonTaxUSD, 0),
    totalCost: round(row.totalCostUSD, 0),
    savings: round(row.costSavingsUSD, 0),
    cumSavings: round(row.cumulativeSavings, 0),
    energyKWh: round(row.energyKWh, 0),
    energySavKWh: round(row.energySavingsKWh, 0),
    emissionsTons: round(row.emissionsTonsCO2, 1),
    emissionsSav: round(row.emissionsSavingsTonsCO2, 1),
  }));

  return {
    name: "5-Year Financial & Environmental Projection",
    source: "frontend:ProjectionDetailChart",
    sourceFields: [
      "projection.yearlyData[].energyCostUSD",
      "projection.yearlyData[].carbonTaxUSD",
      "projection.yearlyData[].costSavingsUSD",
      "projection.yearlyData[].emissionsTonsCO2",
    ],
    data: chartData,
  };
}

function buildSharedRadarContext(resultData: any): ChartContextEntry | null {
  const metrics = resultData?.results?.metrics ?? {};
  const summary = resultData?.summary ?? {};
  const data = [
    {
      metric: "PUE Eff",
      value: Math.max(
        0,
        10 - ((metrics.pue ?? summary.averagePUE ?? 1.5) - 1) * 5,
      ),
    },
    {
      metric: "CUE Eff",
      value: Math.max(0, 10 - (metrics.cue ?? summary.averageCUE ?? 0.5) * 10),
    },
    {
      metric: "Energy Sav",
      value: Math.min(10, (summary.energySavingsPercent ?? 0) / 5),
    },
    {
      metric: "Cost Sav",
      value: Math.min(10, (summary.annualSavingsUSD ?? 0) / 20000),
    },
    {
      metric: "Carbon Sav",
      value: Math.min(10, (summary.carbonSavings_kg ?? 0) / 10000),
    },
  ].filter((item) => item.value > 0);

  if (data.length < 3) return null;

  return {
    name: "Performance Radar",
    source: "frontend:KpiRadar",
    sourceFields: [
      "results.metrics.pue",
      "results.metrics.cue",
      "summary.energySavingsPercent",
      "summary.annualSavingsUSD",
      "summary.carbonSavings_kg",
    ],
    data,
  };
}

export function buildSimulationChartContext(
  resultData: any,
  simulationType: string,
): SimulationChartContext {
  const hourly: any[] = Array.isArray(resultData?.results?.hourlyResults)
    ? resultData.results.hourlyResults
    : Array.isArray(resultData?.hourlyResults)
      ? resultData.hourlyResults
      : [];
  const yearlyData: any[] =
    resultData?.projection?.yearlyData ??
    resultData?.results?.projection?.yearlyData ??
    [];
  const compTable: any[] = resultData?.mlRecommendation?.comparison_table ?? [];
  const modeBreakdown: Record<string, number> =
    resultData?.airflowViolations?.modeBreakdown ?? {};
  const rackAnalysis = resultData?.rackAnalysis ?? null;
  const copArray: number[] = Array.isArray(resultData?.copOverTime)
    ? resultData.copOverTime
    : [];
  const gates =
    resultData?.phase4Gates ?? resultData?.results?.phase4Gates ?? {};
  const evapHourly: any[] = Array.isArray(resultData?.hourlyData)
    ? resultData.hourlyData
    : Array.isArray(resultData?.rawEvaporativeData?.hourly_data)
      ? resultData.rawEvaporativeData.hourly_data
      : [];

  const normalizedType = (simulationType || "").toLowerCase();
  const isChilled =
    normalizedType === "water" ||
    resultData?.coolingTechnique === "chilled_water" ||
    !!(
      resultData?.results?.metrics?.averageCOP !== undefined &&
      !resultData?.airflowViolations
    );
  const isAir =
    resultData?.coolingTechnique === "air_economizer" ||
    !!resultData?.airflowViolations ||
    normalizedType === "air";
  const isEvap =
    resultData?.coolingTechnique === "evaporative" ||
    normalizedType.includes("evap");

  const chartGroups: ChartContextGroup[] = [];

  if (isChilled) {
    const annual = resultData?.results?.annual ?? {};
    const metrics = resultData?.results?.metrics ?? {};
    const raw = resultData?.rawEvaporativeData?.results ?? {};

    const annualSummary = {
      kpis: {
        energy:
          annual.energyConsumption_kWh ??
          resultData?.totalEnergyConsumption ??
          0,
        coolingLoad: annual.coolingLoad_kWh ?? resultData?.coolingLoad_kWh ?? 0,
        water: annual.waterUsage_L ?? resultData?.waterUsage_L ?? 0,
        carbon: annual.carbonEmissions_kg ?? resultData?.carbonFootprint ?? 0,
        cost: annual.cost_USD ?? resultData?.estimatedCost ?? 0,
        avgCOP: metrics.averageCOP ?? 0,
        pue: metrics.pue ?? 0,
        wue: metrics.wue ?? 0,
      },
      energyBreakdown: [
        {
          name: "IT Energy",
          value: round(raw.energy?.it_kwh ?? resultData?.it_kwh ?? 0, 0),
        },
        {
          name: "Fan Energy",
          value: round(raw.energy?.fan_kwh ?? resultData?.fan_kwh ?? 0, 0),
        },
        {
          name: "DX Backup",
          value: round(raw.energy?.dx_kwh ?? resultData?.dx_kwh ?? 0, 0),
        },
        {
          name: "Pump Energy",
          value: round(raw.energy?.pump_kwh ?? resultData?.pump_kwh ?? 0, 0),
        },
      ].filter((item) => item.value > 0),
    };

    const copSeries = toHourlySeries(copArray, (value, index) => ({
      h: index,
      cop: round(value, 4),
    }));
    const coolingLoadSeries = toHourlySeries(hourly, (row, index) => ({
      h: row.hour ?? index,
      cooling: round(row.coolingLoad_kW, 3),
      chiller: round(row.chillerPower_kW, 3),
      cost: round(row.cost_USD, 4),
    }));
    const hourlyPowerSeries = toHourlySeries(hourly, (row, index) => ({
      h: row.hour ?? index,
      it: round(row.itLoad_kW, 2),
      chiller: round(row.chillerPower_kW, 2),
      cooling: round(row.coolingLoad_kW, 2),
      total: round((row.itLoad_kW ?? 0) + (row.chillerPower_kW ?? 0), 2),
    }));
    const waterSeries = toHourlySeries(hourly, (row, index) => ({
      h: row.hour ?? index,
      water: round(row.waterUsage_L, 2),
      carbon: round(row.carbonEmissions_kg, 3),
    }));
    const costSeries = [
      {
        name: "Annual OpEx",
        value: round(
          resultData?.economics?.opex_annual_USD ?? annual.cost_USD ?? 0,
          0,
        ),
      },
      { name: "CAPEX", value: round(resultData?.economics?.capex_USD ?? 0, 0) },
      { name: "LCCP", value: round(resultData?.economics?.lccp_USD ?? 0, 0) },
      {
        name: "NPV (abs)",
        value: round(Math.abs(resultData?.economics?.npv_USD ?? 0), 0),
      },
    ].filter((item) => item.value > 0);
    const gateEntries = Object.entries(gates).map(([key, val]) => ({
      name: key.replace(/([A-Z])/g, " $1").trim(),
      status: String(val),
      value: String(val) === "PASS" ? 1 : 0,
    }));

    chartGroups.push({
      group: "chilled",
      charts: [
        {
          name: "Annual Consumption Overview",
          source: "frontend:ChilledAnnualPie",
          sourceFields: ["results.annual.*", "results.metrics.*"],
          data: annualSummary,
        },
        {
          name: "COP Over Time",
          source: "frontend:ChilledCopChart",
          sourceFields: ["copOverTime[]"],
          data: copSeries,
        },
        {
          name: "Hourly Cooling Load vs Chiller Power",
          source: "frontend:ChilledCoolingLoadChart",
          sourceFields: [
            "hourlyResults[].coolingLoad_kW",
            "hourlyResults[].chillerPower_kW",
            "hourlyResults[].cost_USD",
          ],
          data: coolingLoadSeries,
        },
        {
          name: "Hourly IT Load vs Chiller Power",
          source: "frontend:ChilledHourlyPower",
          sourceFields: [
            "hourlyResults[].itLoad_kW",
            "hourlyResults[].chillerPower_kW",
            "hourlyResults[].coolingLoad_kW",
          ],
          data: hourlyPowerSeries,
        },
        {
          name: "Hourly Water Usage & Carbon Emissions",
          source: "frontend:ChilledWaterUsage",
          sourceFields: [
            "hourlyResults[].waterUsage_L",
            "hourlyResults[].carbonEmissions_kg",
          ],
          data: waterSeries,
        },
        {
          name: "Chilled Water Cost Structure",
          source: "frontend:ChilledCostChart",
          sourceFields: ["results.economics.*", "results.annual.cost_USD"],
          data: costSeries,
        },
      ],
    });

    if (gateEntries.length > 0) {
      chartGroups[0].charts.push({
        name: "Phase 4 Compliance Gates",
        source: "frontend:ChilledGatesChart",
        sourceFields: ["phase4Gates.*"],
        data: gateEntries,
      });
    }
  }

  if (isAir) {
    const hourlyPowerSeries = toHourlySeries(hourly, (row, index) => ({
      h: row.hour ?? index,
      it: round(row.itLoad_kW, 2),
      fan: round(row.fanPower_kW, 2),
      mech: round(row.mechPower_kW, 2),
      total: round(row.totalPower_kW, 2),
    }));
    const airflowSeries = toHourlySeries(hourly, (row, index) => ({
      h: row.hour ?? index,
      required: round(row.requiredAirflow_CFM, 0),
      free: round(row.q_free_kW, 2),
      mech: round(row.mech_load_kW, 2),
      violation: row.airflowViolation ? 1 : 0,
    })).filter((row) => row.required > 0);
    const pueCueSeries = toHourlySeries(hourly, (row, index) => ({
      h: row.hour ?? index,
      pue: round(row.pue, 3),
      cue: round(row.cue, 4),
    }));
    const tempSeries = toHourlySeries(hourly, (row, index) => ({
      h: row.hour ?? index,
      temp: round(row.outdoorTempC ?? row.ambientTemp_C ?? row.tempC ?? 0, 1),
      rh: round(row.outdoorRH ?? row.rh ?? 0, 0),
    }));
    const modeSeries = Object.entries(modeBreakdown).map(([mode, hours]) => ({
      name: mode,
      value: hours,
    }));
    const costSeries = [
      {
        name: "Electricity Cost",
        value: round(
          resultData?.summary?.electricityCostUSD ??
            resultData?.summary?.estimatedOpExUSD ??
            0,
          0,
        ),
      },
      {
        name: "Carbon Tax",
        value: round(resultData?.summary?.carbonTaxCostUSD ?? 0, 0),
      },
      {
        name: "CAPEX",
        value: round(resultData?.summary?.totalCapexUSD ?? 0, 0),
      },
      {
        name: "Annual Savings",
        value: round(resultData?.summary?.annualSavingsUSD ?? 0, 0),
      },
    ].filter((item) => item.value > 0);
    const rackSeries = rackAnalysis
      ? [
          {
            name: "Avg Rack Load",
            value: round(rackAnalysis.averageRackLoadKW, 2),
          },
          {
            name: "Max Rack Load",
            value: round(rackAnalysis.maxRackLoadKW, 2),
          },
          { name: "Hotspot Racks", value: rackAnalysis.hotspotRacks ?? 0 },
          { name: "Total Racks", value: rackAnalysis.totalRacks ?? 0 },
        ]
      : [];

    const airCharts: ChartContextEntry[] = [
      {
        name: "Hourly Power Breakdown (Air)",
        source: "frontend:HourlyPowerBreakdown",
        sourceFields: [
          "hourlyResults[].itLoad_kW",
          "hourlyResults[].fanPower_kW",
          "hourlyResults[].mechPower_kW",
          "hourlyResults[].totalPower_kW",
        ],
        data: hourlyPowerSeries,
      },
      airflowSeries.length > 0
        ? {
            name: "Airflow and Free-Cooling vs Mechanical",
            source: "frontend:AirflowChart",
            sourceFields: [
              "hourlyResults[].requiredAirflow_CFM",
              "hourlyResults[].q_free_kW",
              "hourlyResults[].mech_load_kW",
              "hourlyResults[].airflowViolation",
            ],
            data: airflowSeries,
          }
        : null,
      modeSeries.length > 0
        ? {
            name: "Air Mode Distribution",
            source: "frontend:ModePieChart",
            sourceFields: ["airflowViolations.modeBreakdown"],
            data: modeSeries,
          }
        : null,
      {
        name: "Air Cost Structure",
        source: "frontend:CostBreakdownChart",
        sourceFields: [
          "summary.electricityCostUSD",
          "summary.carbonTaxCostUSD",
          "summary.totalCapexUSD",
          "summary.annualSavingsUSD",
        ],
        data: costSeries,
      },
      rackSeries.length > 0
        ? {
            name: "Rack Analysis (Air)",
            source: "frontend:RackChart",
            sourceFields: [
              "rackAnalysis.averageRackLoadKW",
              "rackAnalysis.maxRackLoadKW",
              "rackAnalysis.hotspotRacks",
              "rackAnalysis.totalRacks",
            ],
            data: rackSeries,
          }
        : null,
      {
        name: "PUE/CUE Time Series (Air)",
        source: "frontend:PueCueChart",
        sourceFields: ["hourlyResults[].pue", "hourlyResults[].cue"],
        data: pueCueSeries,
      },
      {
        name: "Outdoor Temperature and Humidity (Air)",
        source: "frontend:TempChart",
        sourceFields: [
          "hourlyResults[].outdoorTempC",
          "hourlyResults[].ambientTemp_C",
          "hourlyResults[].tempC",
          "hourlyResults[].outdoorRH",
          "hourlyResults[].rh",
        ],
        data: tempSeries,
      },
    ].filter(Boolean) as ChartContextEntry[];

    chartGroups.push({ group: "air", charts: airCharts });
  }

  if (isEvap) {
    const raw = resultData?.rawEvaporativeData?.results ?? {};
    const assess =
      resultData?.coolingAdequacy ??
      resultData?.rawEvaporativeData?.cooling_assessment ??
      {};
    const km = assess?.keyMetrics ?? assess?.key_metrics ?? {};
    const evapSeries = toHourlySeries(evapHourly, (row, index) => ({
      h: row.hour ?? index,
      it: round(row.itLoadKW ?? 0, 2),
      fan: round(row.fanPowerKW ?? 0, 3),
      dx: round(row.dxPowerKW ?? 0, 3),
      total: round(row.totalElectricalKW ?? 0, 2),
      cooling: round(row.coolingCapacityKW ?? 0, 2),
      water: round(row.waterEvaporationLph ?? 0, 3),
    }));
    const evapTempSeries = toHourlySeries(evapHourly, (row, index) => ({
      h: row.hour ?? index,
      ambient: round(row.ambientTempC ?? 0, 1),
      inlet: round(row.inletTempC ?? 0, 1),
      supply: round(row.supplyTempC ?? 0, 1),
      humidity: round(row.ambientHumidity ?? 0, 0),
    }));
    const evapSupplySeries = toHourlySeries(evapHourly, (row, index) => ({
      h: row.hour ?? index,
      supplyTemp: round(row.supplyTempC ?? 0, 1),
      supplyHumid: round(row.supplyHumidity ?? 0, 0),
      ambientHumid: round(row.ambientHumidity ?? 0, 0),
      inletTemp: round(row.inletTempC ?? 0, 1),
    }));
    const evapModeSeries = (() => {
      const counts: Record<string, number> = {};
      evapHourly.forEach((row) => {
        const mode = row.coolingMode ?? "UNKNOWN";
        counts[mode] = (counts[mode] ?? 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    })();
    const evapAnnual = {
      kpis: {
        electricity:
          raw.energy?.electricity_kwh_total ??
          resultData?.totalEnergyConsumption ??
          0,
        it: raw.energy?.it_kwh ?? resultData?.it_kwh ?? 0,
        fan: raw.energy?.fan_kwh ?? resultData?.fan_kwh ?? 0,
        dx: raw.energy?.dx_kwh ?? resultData?.dx_kwh ?? 0,
        cost: raw.cost?.total_energy_cost_usd ?? resultData?.estimatedCost ?? 0,
        co2: raw.emissions?.co2_kg_total ?? resultData?.carbonFootprint ?? 0,
        pueAvg: raw.performance?.pue_average ?? resultData?.pue ?? 0,
        cueAvg: raw.performance?.cue_average ?? resultData?.cue ?? 0,
        maxInlet: km.max_inlet_temp_c ?? 0,
        coolingCapAvg: km.cooling_capacity_avg_kw ?? 0,
        failureHours:
          raw.performance?.cooling_failure_hours ??
          resultData?.cooling_failure_hours ??
          0,
        assessment: assess?.status ?? "—",
      },
      energyPie: [
        {
          name: "IT Energy",
          value: round(raw.energy?.it_kwh ?? resultData?.it_kwh ?? 0, 0),
        },
        {
          name: "Fan Energy",
          value: round(raw.energy?.fan_kwh ?? resultData?.fan_kwh ?? 0, 0),
        },
        {
          name: "DX Backup",
          value: round(raw.energy?.dx_kwh ?? resultData?.dx_kwh ?? 0, 0),
        },
        {
          name: "Pump Energy",
          value: round(raw.energy?.pump_kwh ?? resultData?.pump_kwh ?? 0, 0),
        },
      ].filter((item) => item.value > 0),
    };
    const evapPueCompare = toHourlySeries(evapHourly, (row, index) => ({
      h: row.hour ?? index,
      pue: round(row.pue ?? 0, 4),
    }));

    chartGroups.push({
      group: "evap",
      charts: [
        {
          name: "Annual Evaporative Cooling Summary",
          source: "frontend:EvapAnnualSummary",
          sourceFields: [
            "rawEvaporativeData.results.*",
            "coolingAdequacy.keyMetrics.*",
          ],
          data: evapAnnual,
        },
        {
          name: "Hourly Power Breakdown (Evaporative)",
          source: "frontend:EvapHourlyPower",
          sourceFields: [
            "hourly_data[].itLoadKW",
            "hourly_data[].fanPowerKW",
            "hourly_data[].dxPowerKW",
            "hourly_data[].totalElectricalKW",
            "hourly_data[].coolingCapacityKW",
          ],
          data: evapSeries,
        },
        {
          name: "Cooling Capacity vs IT Load (Evaporative)",
          source: "frontend:EvapCoolingCapChart",
          sourceFields: [
            "hourly_data[].coolingCapacityKW",
            "hourly_data[].itLoadKW",
            "hourly_data[].waterEvaporationLph",
          ],
          data: evapSeries,
        },
        {
          name: "Hourly PUE vs Annual Average & Max",
          source: "frontend:EvapPueCompareChart",
          sourceFields: [
            "hourly_data[].pue",
            "rawEvaporativeData.results.performance.pue_average",
            "rawEvaporativeData.results.performance.pue_max",
          ],
          data: evapPueCompare,
        },
        {
          name: "Temperature and Humidity (Evaporative)",
          source: "frontend:EvapTempChart",
          sourceFields: [
            "hourly_data[].ambientTempC",
            "hourly_data[].inletTempC",
            "hourly_data[].supplyTempC",
            "hourly_data[].ambientHumidity",
          ],
          data: evapTempSeries,
        },
        {
          name: "Supply Air Conditions (Evaporative)",
          source: "frontend:EvapSupplyHumidChart",
          sourceFields: [
            "hourly_data[].supplyTempC",
            "hourly_data[].supplyHumidity",
            "hourly_data[].ambientHumidity",
            "hourly_data[].inletTempC",
          ],
          data: evapSupplySeries,
        },
        {
          name: "Cooling Mode Distribution",
          source: "frontend:EvapModeChart",
          sourceFields: ["hourly_data[].coolingMode"],
          data: evapModeSeries,
        },
        {
          name: "PUE per Hour",
          source: "frontend:EvapPueChart",
          sourceFields: ["hourly_data[].pue"],
          data: evapPueCompare,
        },
        {
          name: "Cooling Assessment",
          source: "frontend:EvapAssessmentChart",
          sourceFields: [
            "coolingAdequacy.checks",
            "coolingAdequacy.engineering_notes",
            "coolingAdequacy.recommendations",
          ],
          data: {
            checks: assess?.checks ?? {},
            notes: assess?.engineeringNotes ?? assess?.engineering_notes ?? [],
            recommendations: assess?.recommendations ?? [],
          },
        },
      ],
    });
  }

  if (compTable.length > 0) {
    chartGroups.push({
      group: "shared",
      charts: [
        {
          name: "Technique Comparison (ML)",
          source: "frontend:ComparisonChart",
          sourceFields: ["mlRecommendation.comparison_table[]"],
          data: compTable.map((row) => ({
            tech: row.tech,
            cost: round(row.annual_cost ?? 0, 0),
            emissions: round(row.annual_emissions_kg ?? 0, 0),
            water: round(row.annual_water_liters ?? 0, 0),
            score: round(row.score ?? 0, 4),
          })),
        },
      ],
    });
  }

  const radar = buildSharedRadarContext(resultData);
  if (radar) {
    const group = chartGroups.find((entry) => entry.group === "shared");
    if (group) group.charts.unshift(radar);
    else chartGroups.push({ group: "shared", charts: [radar] });
  }

  const projection = buildSharedProjectionContext(resultData);
  if (projection) {
    const group = chartGroups.find((entry) => entry.group === "shared");
    if (group) group.charts.push(projection);
    else chartGroups.push({ group: "shared", charts: [projection] });
  }

  const chartNames = chartGroups.flatMap((group) =>
    group.charts.map((chart) => chart.name),
  );

  return {
    source: "frontend",
    simulationType,
    detectedModes: {
      chilled: isChilled,
      air: isAir,
      evaporative: isEvap,
    },
    chartGroups,
    chartNames,
  };
}
