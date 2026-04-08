/**
 * Format API response data for display
 */

export interface FormattedMetric {
  key: string;
  displayName: string;
  value: any;
  unit: string;
  category: string;
}

export const formatAPIResponse = (resultData: any): FormattedMetric[] => {
  const metrics: FormattedMetric[] = [];

  const friendlyMetricMap: Array<{ pattern: RegExp; label: string }> = [
    {
      pattern: /(^|\.)pue(_average)?$/i,
      label: "Power Usage Effectiveness (PUE)",
    },
    {
      pattern: /(^|\.)wue(_average)?$/i,
      label: "Water Usage Effectiveness (WUE)",
    },
    {
      pattern: /(^|\.)cue(_average)?$/i,
      label: "Carbon Usage Effectiveness (CUE)",
    },
    {
      pattern: /(^|\.)averagecop|(^|\.)cop$/i,
      label: "Cooling Efficiency (COP)",
    },
    { pattern: /electricity_kwh_total/i, label: "Total Electricity Use" },
    { pattern: /it_kwh/i, label: "IT Equipment Energy Use" },
    {
      pattern: /cooling(load)?_kwh|fan_kwh|dx_kwh/i,
      label: "Cooling System Energy Use",
    },
    {
      pattern: /totalenergy_kwh|energyconsumption_kwh/i,
      label: "Total Energy Use",
    },
    {
      pattern: /water_liters_total|waterusage(_l|_liters)?$/i,
      label: "Total Water Use",
    },
    { pattern: /evaporation_liters/i, label: "Water Lost to Evaporation" },
    { pattern: /blowdown_liters/i, label: "Blowdown Water" },
    {
      pattern: /total_energy_cost_usd|cost_usd$/i,
      label: "Total Operating Cost",
    },
    {
      pattern: /electricity_usd|electricitycostusd/i,
      label: "Electricity Cost",
    },
    { pattern: /water_usd/i, label: "Water Cost" },
    {
      pattern: /annualopexusd|opex(_annual|_total)?_usd/i,
      label: "Annual Operating Cost (OPEX)",
    },
    { pattern: /totalcapexusd|capex_usd/i, label: "Capital Cost (CAPEX)" },
    { pattern: /npv_usd/i, label: "Net Present Value (NPV)" },
    {
      pattern: /payback(period)?(_years|_years)?|paybackperiodyears/i,
      label: "Investment Payback Period",
    },
    {
      pattern: /co2_kg_total|totalcarbonemissions_kg|carbonemissions_kg/i,
      label: "Total Carbon Emissions",
    },
    { pattern: /carbonsavings_kg/i, label: "Carbon Emissions Reduced" },
    { pattern: /carbontax(cost)?usd/i, label: "Carbon Tax Cost" },
    { pattern: /runtime_minutes/i, label: "Simulation Runtime" },
    { pattern: /availability_percent/i, label: "Cooling Availability" },
    { pattern: /max_inlet_temp_c/i, label: "Peak Server Inlet Temperature" },
    { pattern: /cooling_capacity_avg_kw/i, label: "Average Cooling Capacity" },
    { pattern: /annualsavingsusd|savings/i, label: "Estimated Cost Savings" },
  ];

  const importantMetricPriority: Array<{ pattern: RegExp; rank: number }> = [
    { pattern: /pue|wue|cue|cop/i, rank: 1 },
    {
      pattern:
        /totalenergy|electricity_kwh_total|energyconsumption_kwh|it_kwh/i,
      rank: 2,
    },
    {
      pattern:
        /total_energy_cost_usd|cost_usd|electricity_usd|water_usd|opex|capex|npv|payback/i,
      rank: 3,
    },
    { pattern: /co2|carbon/i, rank: 4 },
    { pattern: /water|evaporation|blowdown/i, rank: 5 },
    { pattern: /runtime|availability|temp|cooling_capacity/i, rank: 6 },
  ];

  const stringifyCompact = (value: unknown): string => {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const categorizeKey = (key: string): string => {
    const lower = key.toLowerCase();
    if (
      lower.includes("pue") ||
      lower.includes("wue") ||
      lower.includes("cue") ||
      lower.includes("cop")
    )
      return "Efficiency Overview";
    if (
      lower.includes("energy") ||
      lower.includes("kwh") ||
      lower.includes("consumption")
    )
      return "Power and Energy";
    if (
      lower.includes("cost") ||
      lower.includes("saving") ||
      lower.includes("opex") ||
      lower.includes("capex")
    )
      return "Cost and Financial Impact";
    if (
      lower.includes("water") ||
      lower.includes("gpm") ||
      lower.includes("consumption")
    )
      return "Water Use";
    if (
      lower.includes("carbon") ||
      lower.includes("emission") ||
      lower.includes("co2")
    )
      return "Carbon Impact";
    if (
      lower.includes("temp") ||
      lower.includes("temperature") ||
      lower.includes("cooling")
    )
      return "Thermal Performance";
    if (
      lower.includes("flow") ||
      lower.includes("cfm") ||
      lower.includes("air")
    )
      return "Airflow and Flow Rates";
    return "Other";
  };

  const getFriendlyDisplayName = (fullKey: string): string => {
    for (const mapping of friendlyMetricMap) {
      if (mapping.pattern.test(fullKey)) {
        return mapping.label;
      }
    }

    return fullKey
      .replace(/\./g, " > ")
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\busd\b/gi, "USD")
      .replace(/\bco2\b/gi, "CO2")
      .replace(/\bkw\b/gi, "kW")
      .replace(/\bkwh\b/gi, "kWh")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  const getMetricPriority = (key: string): number => {
    for (const priority of importantMetricPriority) {
      if (priority.pattern.test(key)) {
        return priority.rank;
      }
    }
    return 99;
  };

  const getUnit = (key: string): string => {
    const lower = key.toLowerCase();
    if (lower.includes("kwh")) return "kWh";
    if (
      lower.includes("percent") ||
      lower.includes("efficiency") ||
      lower.includes("savings") ||
      lower.includes("cop")
    )
      return "%";
    if (lower.includes("temp")) return "°C";
    if (lower.includes("cfm")) return "CFM";
    if (lower.includes("gpm")) return "GPM";
    if (lower.includes("usd")) return "$";
    if (lower.includes("cost") || lower.includes("price")) return "$";
    if (lower.includes("minutes") || lower.includes("runtime")) return "min";
    if (lower.includes("hours")) return "h";
    if (lower.includes("gallons") || lower.includes("liters")) return "L";
    return "";
  };

  const formatValue = (key: string, value: any): string | number => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") return stringifyCompact(value);
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value !== "number") return value;

    const lower = key.toLowerCase();
    if (lower.includes("kwh") || lower.includes("consumption"))
      return value.toFixed(2);
    if (
      lower.includes("usd") ||
      lower.includes("cost") ||
      lower.includes("price")
    )
      return value.toFixed(2);
    if (lower.includes("percent") || lower.includes("savings"))
      return value.toFixed(1);
    if (
      lower.includes("efficiency") ||
      lower.includes("pue") ||
      lower.includes("cop")
    )
      return value.toFixed(3);
    if (lower.includes("temp")) return value.toFixed(1);
    if (lower.includes("cost")) return value.toFixed(2);
    return value.toFixed(2);
  };

  const shouldExpandArray = (fullKey: string): boolean => {
    const key = fullKey.toLowerCase();
    return (
      key.includes("engineering_notes") ||
      key.includes("recommendations") ||
      key.includes("critical_hours") ||
      key.includes("hourly_failures")
    );
  };

  const addExpandedArrayMetrics = (fullKey: string, values: any[]) => {
    const category = categorizeKey(fullKey);
    const baseLabel = getFriendlyDisplayName(fullKey);

    if (values.length === 0) {
      metrics.push({
        key: fullKey,
        displayName: baseLabel,
        value: "No items",
        unit: "",
        category,
      });
      return;
    }

    values.forEach((item, index) => {
      const itemLabel = `${baseLabel} ${index + 1}`;

      if (item === null || item === undefined) {
        metrics.push({
          key: `${fullKey}[${index}]`,
          displayName: itemLabel,
          value: "N/A",
          unit: "",
          category,
        });
        return;
      }

      if (typeof item === "object" && !Array.isArray(item)) {
        const flattenedItem = flattenObject(item);
        const entries = Object.entries(flattenedItem);

        if (entries.length === 0) {
          metrics.push({
            key: `${fullKey}[${index}]`,
            displayName: itemLabel,
            value: stringifyCompact(item),
            unit: "",
            category,
          });
          return;
        }

        entries.forEach(([childKey, childValue]) => {
          const childLabel = `${itemLabel} - ${getFriendlyDisplayName(childKey)}`;
          metrics.push({
            key: `${fullKey}[${index}].${childKey}`,
            displayName: childLabel,
            value: formatValue(childKey, childValue),
            unit: getUnit(childKey),
            category,
          });
        });
        return;
      }

      metrics.push({
        key: `${fullKey}[${index}]`,
        displayName: itemLabel,
        value: formatValue(fullKey, item),
        unit: getUnit(fullKey),
        category,
      });
    });
  };

  const flattenObject = (obj: any, prefix = "") => {
    for (const [key, value] of Object.entries(obj)) {
      // Skip internal/noisy fields
      if (key.startsWith("_") || key === "id" || key === "timestamp") continue;
      if (key.toLowerCase().includes("timestamp")) continue;

      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        continue;
      }

      // Flatten all nested plain objects so React never receives raw objects as children.
      if (typeof value === "object" && !Array.isArray(value)) {
        flattenObject(value, fullKey);
      } else if (Array.isArray(value)) {
        if (shouldExpandArray(fullKey)) {
          addExpandedArrayMetrics(fullKey, value);
          continue;
        }

        // Show array with summary
        metrics.push({
          key: fullKey,
          displayName: getFriendlyDisplayName(fullKey),
          value: `Array (${value.length} items)`,
          unit: "",
          category: "Data",
        });
      } else {
        const displayName = getFriendlyDisplayName(fullKey);

        const unit = getUnit(fullKey);
        const formattedValue = formatValue(fullKey, value);
        const category = categorizeKey(fullKey);

        metrics.push({
          key: fullKey,
          displayName,
          value: formattedValue,
          unit,
          category,
        });
      }
    }
  };

  flattenObject(resultData);

  // Sort by importance first, then category and name.
  return metrics.sort((a, b) => {
    const priorityDiff = getMetricPriority(a.key) - getMetricPriority(b.key);
    if (priorityDiff !== 0) return priorityDiff;

    if (a.category !== b.category) {
      // Define category order
      const categoryOrder = [
        "Efficiency Overview",
        "Power and Energy",
        "Cost and Financial Impact",
        "Carbon Impact",
        "Water Use",
        "Thermal Performance",
        "Airflow and Flow Rates",
        "Other",
      ];
      return (
        (categoryOrder.indexOf(a.category) || 999) -
        (categoryOrder.indexOf(b.category) || 999)
      );
    }
    return a.displayName.localeCompare(b.displayName);
  });
};

/**
 * Get summary metrics from API response
 */
export const extractSummaryMetrics = (resultData: any) => {
  const summary = {
    pue: null as number | null,
    energyKwh: null as number | null,
    costSavings: null as number | null,
    waterUsage: null as number | null,
  };

  const flatData = flattenObject(resultData);

  // Find PUE
  for (const [key, value] of Object.entries(flatData)) {
    const lower = key.toLowerCase();
    if (
      (lower.includes("pue") || lower.includes("efficiency")) &&
      typeof value === "number"
    ) {
      summary.pue = value;
      break;
    }
  }

  // Find Energy
  for (const [key, value] of Object.entries(flatData)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("energy") &&
      lower.includes("kwh") &&
      typeof value === "number"
    ) {
      summary.energyKwh = value;
      break;
    }
  }

  // Find Cost Savings
  for (const [key, value] of Object.entries(flatData)) {
    const lower = key.toLowerCase();
    if (
      (lower.includes("cost") || lower.includes("savings")) &&
      lower.includes("percent") &&
      typeof value === "number"
    ) {
      summary.costSavings = value;
      break;
    }
  }

  // Find Water
  for (const [key, value] of Object.entries(flatData)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("water") &&
      lower.includes("consumption") &&
      typeof value === "number"
    ) {
      summary.waterUsage = value;
      break;
    }
  }

  return summary;
};

function flattenObject(obj: any, prefix = ""): Record<string, any> {
  const result: Record<string, any> = {};

  const flatten = (o: any, p = "") => {
    for (const [key, value] of Object.entries(o)) {
      if (key.startsWith("_")) continue;
      const fullKey = p ? `${p}.${key}` : key;

      if (value === null || value === undefined) continue;

      if (typeof value === "object" && !Array.isArray(value)) {
        flatten(value, fullKey);
      } else if (!Array.isArray(value)) {
        result[fullKey] = value;
      }
    }
  };

  flatten(obj, prefix);
  return result;
}
