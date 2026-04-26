import React, { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, Database, Download, Info, Loader2 } from "lucide-react";

const RAWDATA_API = import.meta.env.VITE_RAWDATA_EXPLANATION_API_URL ?? "http://localhost:8006/api";

interface ArrayDataSectionProps {
  resultData: any;
  isDark: boolean;
}

// ─── Technique detection ──────────────────────────────────────────────────────
function detectTechnique(rd: any): "air" | "chilled" | "evap" {
  const ct = (rd?.coolingTechnique ?? "").toLowerCase().replace(/[_\s-]/g, "");
  if (ct === "aireconomizer" || ct === "air") return "air";
  if (ct === "chilledwater" || ct === "chilled") return "chilled";
  if (ct === "evaporative" || ct === "evap") return "evap";
  if (rd?.summary?.totalItEnergy_kWh !== undefined || rd?.airflowViolations) return "air";
  if (rd?.results?.phase4Gates) return "chilled";
  const cop = rd?.results?.metrics?.averageCOP;
  if (typeof cop === "number") return "chilled";
  return "air";
}

// ─── Get the complete JSON to download for each technique ─────────────────────
// Air   → rawAirEconomizerData  (full EconomizerController response)
// Chilled → rawChilledWaterData (full ChilledWaterController response)
// Evap  → rawEvaporativeData or rawChilledWaterData
function getDownloadPayload(rd: any, technique: "air" | "chilled" | "evap"): any {
  if (technique === "air")     return rd?.rawAirEconomizerData ?? rd;
  if (technique === "chilled") return rd?.rawChilledWaterData  ?? rd;
  return rd?.rawEvaporativeData ?? rd?.rawChilledWaterData ?? rd;
}

type ArrayEntry = {
  key: string;
  label: string;
  source: string;
  color: string;
  data: any[];
  isSampled: boolean;
  group: string;
};



// ─── Build all arrays for AIR ECONOMIZER ─────────────────────────────────────
function buildAirArrays(rd: any): ArrayEntry[] {
  const raw = rd?.rawAirEconomizerData ?? {};
  const hourly: any[] = raw.hourlyResults ?? raw.hourlyProfile ?? rd?.hourlyResults ?? [];
  const yearly: any[] = rd?.projection?.yearlyData ?? raw.tcoForecast ?? [];
  const out: ArrayEntry[] = [];

  // ── Raw hourly (all EconomizerController fields) ──────────────────────────
  if (hourly.length > 0) {
    out.push({
      key: "air_hourly_raw",
      label: "Hourly Results (Raw API)",
      source: "rawAirEconomizerData.hourlyResults[] — hour · itLoad_kW · fanPower_kW · mechPower_kW · totalPower_kW · pue · cue · mode · airflowViolation · q_free_kW · mech_load_kW · coolingLoad_kW · requiredAirflow_CFM · outdoorTempC · outdoorRH",
      color: "#5ce1e5",
      data: hourly,
      isSampled: hourly.length <= 120,
      group: "Raw API",
    });
  }

  // ── Derived: IT Load per hour ─────────────────────────────────────────────
  if (hourly.length > 0 && hourly[0]?.itLoad_kW != null) {
    out.push({
      key: "air_it_load",
      label: "IT Load per Hour (kW)",
      source: "Derived: hourlyResults[i].{ hour, itLoad_kW }",
      color: "#5ce1e5",
      data: hourly.map((h: any, i: number) => ({ hour: h.hour ?? i, itLoad_kW: +(h.itLoad_kW ?? 0).toFixed(3) })),
      isSampled: hourly.length <= 120,
      group: "Derived",
    });
  }

  // ── Derived: Fan + Mech + Total power per hour ────────────────────────────
  if (hourly.length > 0 && (hourly[0]?.fanPower_kW != null || hourly[0]?.fanPowerKW != null)) {
    out.push({
      key: "air_power_breakdown",
      label: "Power Breakdown per Hour (kW)",
      source: "Derived: hourlyResults[i].{ hour, fanPower_kW, mechPower_kW, totalPower_kW, coolingLoad_kW }",
      color: "#f59e0b",
      data: hourly.map((h: any, i: number) => ({
        hour: h.hour ?? i,
        fanPower_kW:   +(h.fanPower_kW  ?? h.fanPowerKW  ?? 0).toFixed(3),
        mechPower_kW:  +(h.mechPower_kW ?? h.mechPowerKW ?? 0).toFixed(3),
        totalPower_kW: +(h.totalPower_kW ?? h.totalPowerKW ?? 0).toFixed(3),
        coolingLoad_kW: +(h.coolingLoad_kW ?? h.coolingLoadKW ?? 0).toFixed(3),
      })),
      isSampled: hourly.length <= 120,
      group: "Derived",
    });
  }

  // ── Derived: PUE & CUE per hour ───────────────────────────────────────────
  if (hourly.length > 0 && hourly[0]?.pue != null) {
    out.push({
      key: "air_pue_cue",
      label: "PUE & CUE per Hour",
      source: "Derived: hourlyResults[i].{ hour, pue, cue }",
      color: "#8b5cf6",
      data: hourly.map((h: any, i: number) => ({
        hour: h.hour ?? i,
        pue: +(h.pue ?? 0).toFixed(4),
        cue: +(h.cue ?? 0).toFixed(5),
      })),
      isSampled: hourly.length <= 120,
      group: "Derived",
    });
  }

  // ── Derived: Free cooling vs mechanical per hour ──────────────────────────
  if (hourly.length > 0 && hourly[0]?.q_free_kW != null) {
    out.push({
      key: "air_free_vs_mech",
      label: "Free Cooling vs Mechanical per Hour (kW)",
      source: "Derived: hourlyResults[i].{ hour, q_free_kW, mech_load_kW, mode }",
      color: "#10b981",
      data: hourly.map((h: any, i: number) => ({
        hour: h.hour ?? i,
        q_free_kW:    +(h.q_free_kW   ?? 0).toFixed(3),
        mech_load_kW: +(h.mech_load_kW ?? 0).toFixed(3),
        mode: h.mode ?? "—",
      })),
      isSampled: hourly.length <= 120,
      group: "Derived",
    });
  }

  // ── Derived: Airflow & violations per hour ────────────────────────────────
  if (hourly.length > 0 && hourly[0]?.requiredAirflow_CFM != null) {
    out.push({
      key: "air_airflow",
      label: "Airflow & Violations per Hour",
      source: "Derived: hourlyResults[i].{ hour, requiredAirflow_CFM, airflowViolation, violationMsg }",
      color: "#ef4444",
      data: hourly.map((h: any, i: number) => ({
        hour: h.hour ?? i,
        requiredAirflow_CFM: +(h.requiredAirflow_CFM ?? 0).toFixed(0),
        airflowViolation: h.airflowViolation ? "YES" : "no",
        violationMsg: h.violationMsg ?? "—",
      })),
      isSampled: hourly.length <= 120,
      group: "Derived",
    });
  }

  // ── Derived: Outdoor weather per hour ────────────────────────────────────
  if (hourly.length > 0 && (hourly[0]?.outdoorTempC != null || hourly[0]?.tempC != null)) {
    out.push({
      key: "air_weather",
      label: "Outdoor Weather per Hour",
      source: "Derived: hourlyResults[i].{ hour, outdoorTempC, outdoorRH }",
      color: "#f59e0b",
      data: hourly.map((h: any, i: number) => ({
        hour: h.hour ?? i,
        outdoorTempC: +(h.outdoorTempC ?? h.tempC ?? 0).toFixed(1),
        outdoorRH:    +(h.outdoorRH    ?? h.rh   ?? 0).toFixed(1),
      })),
      isSampled: hourly.length <= 120,
      group: "Derived",
    });
  }

  // ── Yearly projection ─────────────────────────────────────────────────────
  if (yearly.length > 0) {
    out.push({
      key: "air_yearly",
      label: "Yearly Projection / TCO Forecast",
      source: "projection.yearlyData[] or rawAirEconomizerData.tcoForecast[] — year · energyCostUSD · carbonTaxUSD · totalCostUSD · costSavingsUSD · cumulativeSavings",
      color: "#f59e0b",
      data: yearly,
      isSampled: false,
      group: "Projection",
    });
  }

  // ── ML comparison table ───────────────────────────────────────────────────
  const mlComp = rd?.mlRecommendation?.comparison_table;
  if (Array.isArray(mlComp) && mlComp.length > 0) {
    out.push({
      key: "air_ml_comparison",
      label: "ML Technique Comparison",
      source: "mlRecommendation.comparison_table[] — tech · annual_cost · annual_emissions_kg · annual_water_liters · score",
      color: "#a855f7",
      data: mlComp,
      isSampled: false,
      group: "ML",
    });
  }

  // ── Airflow violation mode breakdown ─────────────────────────────────────
  const modeBreakdown = rd?.airflowViolations?.modeBreakdown;
  if (modeBreakdown && typeof modeBreakdown === "object") {
    const modeArr = Object.entries(modeBreakdown).map(([mode, hours]) => ({ mode, hours }));
    if (modeArr.length > 0) {
      out.push({
        key: "air_mode_breakdown",
        label: "Cooling Mode Breakdown",
        source: "airflowViolations.modeBreakdown — mode · hours",
        color: "#10b981",
        data: modeArr,
        isSampled: false,
        group: "Summary",
      });
    }
  }

  // ── Per-rack hotspot violations ───────────────────────────────────────────
  const rackWarnings: string[] = rd?.rackAnalysis?.warnings ?? [];
  const rackAirflow: string[] = rd?.rackAnalysis?.airflowViolations ?? [];
  if (rackWarnings.length > 0 || rackAirflow.length > 0) {
    // Parse hotspot warnings: "Rack 0: HOTSPOT DETECTED - Peak 37.9 kW exceeds threshold 26.8 kW (41% over)"
    const hotspotMap = new Map<number, { peakLoadKW: number; thresholdKW: number; overPercent: number }>();
    for (const w of rackWarnings) {
      const m = w.match(/Rack\s+(\d+).*Peak\s+([\d.]+)\s*kW\s+exceeds\s+threshold\s+([\d.]+)\s*kW\s+\((\d+)%/i);
      if (m) hotspotMap.set(Number(m[1]), { peakLoadKW: parseFloat(m[2]), thresholdKW: parseFloat(m[3]), overPercent: parseInt(m[4], 10) });
    }
    // Parse airflow violations: "Rack 0 AIRFLOW VIOLATION: Requires 5541 CFM, exceeds limit 91 CFM. Peak load: 37.9 kW. RECOMMENDATION: ..."
    const airflowMap = new Map<number, { requiredCFM: number; limitCFM: number; recommendation: string }>();
    for (const v of rackAirflow) {
      const m = v.match(/Rack\s+(\d+)\s+AIRFLOW VIOLATION:\s+Requires\s+([\d,]+)\s*CFM,\s+exceeds\s+limit\s+([\d,]+)\s*CFM.*RECOMMENDATION:\s*(.+)/i);
      if (m) airflowMap.set(Number(m[1]), { requiredCFM: parseInt(m[2].replace(/,/g, ""), 10), limitCFM: parseInt(m[3].replace(/,/g, ""), 10), recommendation: m[4].trim().replace(/\.$/, "") });
    }
    const allIds = Array.from(new Set([...hotspotMap.keys(), ...airflowMap.keys()])).sort((a, b) => a - b);
    const rackRows = allIds.map(id => {
      const h = hotspotMap.get(id);
      const a = airflowMap.get(id);
      const peakFromAirflow = a ? parseFloat((rackAirflow.find(v => v.startsWith(`Rack ${id} `)) ?? "").match(/Peak load:\s*([\d.]+)/i)?.[1] ?? "0") : 0;
      return {
        rack: `Rack ${id}`,
        peakLoad_kW: h?.peakLoadKW ?? peakFromAirflow,
        threshold_kW: h?.thresholdKW ?? 0,
        over_percent: h?.overPercent != null ? `+${h.overPercent}%` : "—",
        severity: (h?.overPercent ?? 0) >= 45 ? "Critical" : (h?.overPercent ?? 0) >= 30 ? "High" : "Moderate",
        requiredCFM: a?.requiredCFM ?? null,
        limitCFM: a?.limitCFM ?? null,
        recommendation: a?.recommendation ?? "—",
      };
    });
    if (rackRows.length > 0) {
      out.push({
        key: "air_rack_hotspots",
        label: "Per-Rack Hotspot & Airflow Violations",
        source: `rackAnalysis.warnings[] + rackAnalysis.airflowViolations[] — rack · peakLoad_kW · threshold_kW · over_percent · severity · requiredCFM · limitCFM · recommendation | ${rd?.rackAnalysis?.hotspotRacks ?? 0}/${rd?.rackAnalysis?.totalRacks ?? 0} racks are hotspots · avg load ${(rd?.rackAnalysis?.averageRackLoadKW ?? 0).toFixed(1)} kW · max ${(rd?.rackAnalysis?.maxRackLoadKW ?? 0).toFixed(1)} kW · imbalance factor ${(rd?.rackAnalysis?.loadImbalanceFactor ?? 0).toFixed(4)}`,
        color: "#ef4444",
        data: rackRows,
        isSampled: false,
        group: "Rack Analysis",
      });
    }
  }

  return out;
}

// ─── Build all arrays for CHILLED WATER / EVAPORATIVE ────────────────────────
function buildChilledArrays(rd: any, technique: "chilled" | "evap"): ArrayEntry[] {
  const color = technique === "chilled" ? "#3b82f6" : "#10b981";
  const out: ArrayEntry[] = [];

  if (technique === "evap") {
    // ── Evaporative: raw response has hourly_data[] with camelCase fields ────
    const raw = rd?.rawEvaporativeData ?? {};
    const results   = raw?.results ?? {};
    const assess    = raw?.cooling_assessment ?? {};
    const keyM      = assess?.key_metrics ?? {};
    // hourlyData is extracted by transformEvaporativeResults into rd.hourlyData
    const hourlyData: any[] = rd?.hourlyData ?? raw?.hourly_data ?? [];

    // Raw hourly_data
    if (hourlyData.length > 0) {
      out.push({ key: "evap_hourly_raw", label: "Hourly Data (Raw API)", source: "rawEvaporativeData.hourly_data[] — hour · ambientTempC · ambientHumidity · itLoadKW · totalElectricalKW · fanPowerKW · dxPowerKW · pumpPowerKW · coolingCapacityKW · waterEvaporationLph · pue · inletTempC · coolingMode · supplyTempC · supplyHumidity", color: "#10b981", data: hourlyData, isSampled: hourlyData.length <= 120, group: "Raw API" });
    }

    // Derived: Power per hour
    if (hourlyData.length > 0) {
      out.push({ key: "evap_power", label: "Power Breakdown per Hour (kW)", source: "Derived: hourly_data[i].{ hour, itLoadKW, fanPowerKW, dxPowerKW, totalElectricalKW, coolingCapacityKW }", color: "#5ce1e5", data: hourlyData.map((h: any, i: number) => ({ hour: h.hour ?? i, itLoadKW: +(h.itLoadKW ?? 0).toFixed(2), fanPowerKW: +(h.fanPowerKW ?? 0).toFixed(3), dxPowerKW: +(h.dxPowerKW ?? 0).toFixed(3), totalElectricalKW: +(h.totalElectricalKW ?? 0).toFixed(2), coolingCapacityKW: +(h.coolingCapacityKW ?? 0).toFixed(2) })), isSampled: hourlyData.length <= 120, group: "Derived" });
    }

    // Derived: Temperature per hour
    if (hourlyData.length > 0) {
      out.push({ key: "evap_temp", label: "Temperature per Hour (°C)", source: "Derived: hourly_data[i].{ hour, ambientTempC, inletTempC, supplyTempC, ambientHumidity, supplyHumidity }", color: "#f59e0b", data: hourlyData.map((h: any, i: number) => ({ hour: h.hour ?? i, ambientTempC: +(h.ambientTempC ?? 0).toFixed(1), inletTempC: +(h.inletTempC ?? 0).toFixed(1), supplyTempC: +(h.supplyTempC ?? 0).toFixed(1), ambientHumidity: +(h.ambientHumidity ?? 0).toFixed(0), supplyHumidity: +(h.supplyHumidity ?? 0).toFixed(0) })), isSampled: hourlyData.length <= 120, group: "Derived" });
    }

    // Derived: PUE per hour
    if (hourlyData.length > 0) {
      out.push({ key: "evap_pue", label: "PUE per Hour", source: "Derived: hourly_data[i].{ hour, pue }", color: "#8b5cf6", data: hourlyData.map((h: any, i: number) => ({ hour: h.hour ?? i, pue: +(h.pue ?? 0).toFixed(4) })), isSampled: hourlyData.length <= 120, group: "Derived" });
    }

    // Derived: Cooling mode per hour
    if (hourlyData.length > 0 && hourlyData[0]?.coolingMode != null) {
      out.push({ key: "evap_mode", label: "Cooling Mode per Hour", source: "Derived: hourly_data[i].{ hour, coolingMode } — IEC / DEC / HYBRID / DX_BACKUP", color: "#10b981", data: hourlyData.map((h: any, i: number) => ({ hour: h.hour ?? i, coolingMode: h.coolingMode ?? "—" })), isSampled: hourlyData.length <= 120, group: "Derived" });
    }

    // Energy breakdown
    const energyArr = [
      { metric: "Total Electricity (kWh)", value: results.energy?.electricity_kwh_total ?? rd?.totalEnergyConsumption ?? 0 },
      { metric: "IT Energy (kWh)",          value: results.energy?.it_kwh         ?? rd?.it_kwh         ?? 0 },
      { metric: "Fan Energy (kWh)",         value: results.energy?.fan_kwh        ?? rd?.fan_kwh        ?? 0 },
      { metric: "DX Backup Energy (kWh)",   value: results.energy?.dx_kwh         ?? rd?.dx_kwh         ?? 0 },
      { metric: "Pump Energy (kWh)",        value: results.energy?.pump_kwh       ?? rd?.pump_kwh       ?? 0 },
      { metric: "Auxiliary Energy (kWh)",   value: results.energy?.auxiliary_kwh  ?? rd?.auxiliary_kwh  ?? 0 },
    ].filter(r => r.value > 0);
    if (energyArr.length > 0) {
      out.push({ key: "evap_energy", label: "Annual Energy Breakdown", source: "rawEvaporativeData.results.energy — electricity_kwh_total · it_kwh · fan_kwh · dx_kwh · pump_kwh · auxiliary_kwh", color: "#10b981", data: energyArr, isSampled: false, group: "Summary" });
    }

    // Cost & OpEx
    const costArr = [
      { metric: "Total Cost (USD)",          value: results.cost?.total_energy_cost_usd    ?? rd?.estimatedCost ?? 0 },
      { metric: "Electricity Cost (USD)",    value: results.cost?.electricity_usd          ?? rd?.electricity_usd ?? 0 },
      { metric: "OpEx Total (USD)",          value: results.opex?.opex_total_usd           ?? rd?.opex_total_usd ?? 0 },
      { metric: "OpEx per kWh IT (USD)",     value: results.opex?.opex_per_kwh_it          ?? rd?.opex_per_kwh_it ?? 0 },
      { metric: "OpEx per Server/yr (USD)",  value: results.opex?.opex_per_server_annual   ?? rd?.opex_per_server_annual ?? 0 },
    ].filter(r => r.value !== 0);
    if (costArr.length > 0) {
      out.push({ key: "evap_cost", label: "Cost & OpEx", source: "rawEvaporativeData.results.cost + opex", color: "#f59e0b", data: costArr, isSampled: false, group: "Summary" });
    }

    // Emissions
    const emissArr = [
      { metric: "CO₂ Total (kg)",            value: results.emissions?.co2_kg_total             ?? rd?.carbonFootprint ?? 0 },
      { metric: "CO₂ per kWh IT (kg)",       value: results.emissions?.co2_kg_per_kwh_it        ?? rd?.co2_kg_per_kwh_it ?? 0 },
      { metric: "CO₂ per Server/yr (kg)",    value: results.emissions?.co2_kg_per_server_annual ?? rd?.co2_kg_per_server_annual ?? 0 },
    ].filter(r => r.value !== 0);
    if (emissArr.length > 0) {
      out.push({ key: "evap_emissions", label: "Emissions", source: "rawEvaporativeData.results.emissions", color: "#ef4444", data: emissArr, isSampled: false, group: "Summary" });
    }

    // Performance
    const perfArr = [
      { metric: "PUE Average",               value: results.performance?.pue_average          ?? rd?.pue ?? 0 },
      { metric: "PUE Max",                   value: results.performance?.pue_max              ?? rd?.pue_max ?? 0 },
      { metric: "WUE Average",               value: results.performance?.wue_average          ?? rd?.wue ?? 0 },
      { metric: "CUE Average",               value: results.performance?.cue_average          ?? rd?.cue ?? 0 },
      { metric: "Availability %",            value: results.performance?.availability_percent ?? rd?.availability_percent ?? 0 },
      { metric: "Cooling Failure Hours",     value: results.performance?.cooling_failure_hours ?? rd?.cooling_failure_hours ?? 0 },
      { metric: "Total Simulation Hours",    value: results.performance?.total_simulation_hours ?? 8760 },
    ].filter(r => r.value !== 0);
    if (perfArr.length > 0) {
      out.push({ key: "evap_perf", label: "Performance Metrics", source: "rawEvaporativeData.results.performance", color: "#8b5cf6", data: perfArr, isSampled: false, group: "Summary" });
    }

    // Assessment key metrics
    const kmArr = Object.entries(keyM).map(([k, v]) => ({ metric: k, value: v })).filter(r => r.value != null && r.value !== 1.7976931348623157e+308);
    if (kmArr.length > 0) {
      out.push({ key: "evap_key_metrics", label: "Assessment Key Metrics", source: "rawEvaporativeData.cooling_assessment.key_metrics — max_inlet_temp_c · cooling_capacity_avg_kw · heat_load_avg_kw · pue_avg", color: "#5ce1e5", data: kmArr, isSampled: false, group: "Assessment" });
    }

    // Assessment checks
    const checks = assess?.checks ?? {};
    const checksArr = Object.entries(checks).map(([k, v]) => ({ check: k, result: String(v) }));
    if (checksArr.length > 0) {
      out.push({ key: "evap_checks", label: "Assessment Checks", source: "rawEvaporativeData.cooling_assessment.checks — heat_balance · inlet_temperature_ok · humidity_ok · energy_efficiency_ok", color: "#10b981", data: checksArr, isSampled: false, group: "Assessment" });
    }

    // Hourly failures
    const hf = assess?.hourly_failures ?? {};
    if (Object.keys(hf).length > 0) {
      const hfArr = Object.entries(hf).filter(([, v]) => !Array.isArray(v)).map(([k, v]) => ({ metric: k, value: v }));
      if (hfArr.length > 0) {
        out.push({ key: "evap_hourly_failures", label: "Hourly Failure Counts", source: "rawEvaporativeData.cooling_assessment.hourly_failures — temperature_violations · humidity_violations · capacity_violations", color: "#ef4444", data: hfArr, isSampled: false, group: "Assessment" });
      }
    }

    // Engineering notes
    const notes: any[] = assess?.engineering_notes ?? [];
    if (notes.length > 0) {
      out.push({ key: "evap_notes", label: "Engineering Notes", source: "rawEvaporativeData.cooling_assessment.engineering_notes[]", color: "#f59e0b", data: notes.map((n, i) => ({ index: i, note: String(n) })), isSampled: false, group: "Assessment" });
    }

    // Recommendations
    const recs: any[] = assess?.recommendations ?? [];
    if (recs.length > 0) {
      out.push({ key: "evap_recs", label: "Recommendations", source: "rawEvaporativeData.cooling_assessment.recommendations[]", color: "#a855f7", data: recs.map((r, i) => ({ index: i, recommendation: String(r) })), isSampled: false, group: "Assessment" });
    }

    // ML comparison
    const mlComp = rd?.mlRecommendation?.comparison_table;
    if (Array.isArray(mlComp) && mlComp.length > 0) {
      out.push({ key: "evap_ml", label: "ML Technique Comparison", source: "mlRecommendation.comparison_table[]", color: "#a855f7", data: mlComp, isSampled: false, group: "ML" });
    }

    return out;
  }

  // ── Chilled Water ─────────────────────────────────────────────────────────
  const raw = rd?.rawChilledWaterData ?? {};
  const hourly: any[] = raw?.results?.hourlyResults ?? rd?.results?.hourlyResults ?? [];

  // Raw hourly
  if (hourly.length > 0) {
    out.push({ key: "cw_hourly_raw", label: "Hourly Results (Raw API)", source: "rawChilledWaterData.results.hourlyResults[] — hour · ambientTemp_C · itLoad_kW · coolingLoad_kW · chillerPower_kW · cop · waterUsage_L · cost_USD · carbonEmissions_kg", color, data: hourly, isSampled: hourly.length <= 120, group: "Raw API" });
  }

  // Derived: COP per hour
  if (hourly.length > 0 && hourly[0]?.cop != null) {
    out.push({ key: "cw_cop", label: "COP per Hour", source: "Derived: hourlyResults[i].{ hour, cop }", color: "#5ce1e5", data: hourly.map((h: any, i: number) => ({ hour: h.hour ?? i, cop: +(h.cop ?? 0).toFixed(4) })), isSampled: hourly.length <= 120, group: "Derived" });
  }

  // Derived: IT Load vs Chiller Power
  if (hourly.length > 0 && hourly[0]?.itLoad_kW != null) {
    out.push({ key: "cw_it_vs_chiller", label: "IT Load vs Chiller Power per Hour (kW)", source: "Derived: hourlyResults[i].{ hour, itLoad_kW, chillerPower_kW, coolingLoad_kW }", color, data: hourly.map((h: any, i: number) => ({ hour: h.hour ?? i, itLoad_kW: +(h.itLoad_kW ?? 0).toFixed(3), chillerPower_kW: +(h.chillerPower_kW ?? 0).toFixed(3), coolingLoad_kW: +(h.coolingLoad_kW ?? 0).toFixed(3) })), isSampled: hourly.length <= 120, group: "Derived" });
  }

  // Derived: Water usage per hour
  if (hourly.length > 0 && hourly[0]?.waterUsage_L != null) {
    out.push({ key: "cw_water", label: "Water Usage per Hour (L)", source: "Derived: hourlyResults[i].{ hour, waterUsage_L }", color: "#3b82f6", data: hourly.map((h: any, i: number) => ({ hour: h.hour ?? i, waterUsage_L: +(h.waterUsage_L ?? 0).toFixed(3) })), isSampled: hourly.length <= 120, group: "Derived" });
  }

  // Derived: Carbon per hour
  if (hourly.length > 0 && hourly[0]?.carbonEmissions_kg != null) {
    out.push({ key: "cw_carbon", label: "Carbon Emissions per Hour (kg)", source: "Derived: hourlyResults[i].{ hour, carbonEmissions_kg }", color: "#ef4444", data: hourly.map((h: any, i: number) => ({ hour: h.hour ?? i, carbonEmissions_kg: +(h.carbonEmissions_kg ?? 0).toFixed(4) })), isSampled: hourly.length <= 120, group: "Derived" });
  }

  // Derived: Cost per hour
  if (hourly.length > 0 && hourly[0]?.cost_USD != null) {
    out.push({ key: "cw_cost", label: "Operating Cost per Hour (USD)", source: "Derived: hourlyResults[i].{ hour, cost_USD }", color: "#10b981", data: hourly.map((h: any, i: number) => ({ hour: h.hour ?? i, cost_USD: +(h.cost_USD ?? 0).toFixed(4) })), isSampled: hourly.length <= 120, group: "Derived" });
  }

  // Derived: Ambient temp per hour
  if (hourly.length > 0 && hourly[0]?.ambientTemp_C != null) {
    out.push({ key: "cw_ambient", label: "Ambient Temperature per Hour (°C)", source: "Derived: hourlyResults[i].{ hour, ambientTemp_C }", color: "#f59e0b", data: hourly.map((h: any, i: number) => ({ hour: h.hour ?? i, ambientTemp_C: +(h.ambientTemp_C ?? 0).toFixed(2) })), isSampled: hourly.length <= 120, group: "Derived" });
  }

  // Phase 4 gates
  const gates = rd?.results?.phase4Gates ?? raw?.results?.phase4Gates;
  if (gates && typeof gates === "object") {
    const gatesArr = Object.entries(gates).map(([gate, status]) => ({ gate, status }));
    if (gatesArr.length > 0) {
      out.push({ key: "cw_gates", label: "Phase 4 Compliance Gates", source: "results.phase4Gates — thermalCompliance · waterConstraint · carbonLiability · economicViability", color: "#8b5cf6", data: gatesArr, isSampled: false, group: "Summary" });
    }
  }

  // Cost breakdown
  const costBreakdown = rd?.cost_breakdown;
  if (Array.isArray(costBreakdown) && costBreakdown.length > 0) {
    out.push({ key: "cw_cost_breakdown", label: "Cost Breakdown", source: "cost_breakdown[] — label · value (OpEx / CAPEX / LCCP / NPV)", color: "#10b981", data: costBreakdown, isSampled: false, group: "Summary" });
  }

  // All metrics
  const allMetrics = rd?.all_metrics;
  if (Array.isArray(allMetrics) && allMetrics.length > 0) {
    out.push({ key: "cw_all_metrics", label: "All Metrics Summary", source: "all_metrics[] — label · value (PUE / WUE / COP / Energy / Carbon / Water)", color, data: allMetrics, isSampled: false, group: "Summary" });
  }

  // ML comparison
  const mlComp = rd?.mlRecommendation?.comparison_table;
  if (Array.isArray(mlComp) && mlComp.length > 0) {
    out.push({ key: "cw_ml_comparison", label: "ML Technique Comparison", source: "mlRecommendation.comparison_table[]", color: "#a855f7", data: mlComp, isSampled: false, group: "ML" });
  }

  return out;
}

// ─── Paginated table ──────────────────────────────────────────────────────────
const ArrayTable: React.FC<{ entry: ArrayEntry; isDark: boolean }> = ({ entry, isDark }) => {
  const { label, source, color, data, isSampled } = entry;
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  if (!data || data.length === 0) return null;

  const isPrimitive = typeof data[0] !== "object" || data[0] === null;
  const columns: string[] = isPrimitive
    ? ["#", "value"]
    : Array.from(new Set(data.flatMap((row) => Object.keys(row ?? {}))));

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const slice = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const fmt = (v: any): string => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(4);
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const downloadCSV = () => {
    const header = isPrimitive ? ["index", "value"] : columns;
    const rows = data.map((row, i) =>
      isPrimitive ? [i, row] : columns.map((c) => {
        const v = row?.[c];
        if (v === null || v === undefined) return "";
        if (typeof v === "object") return JSON.stringify(v);
        return v;
      })
    );
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label.replace(/\s+/g, "_").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`mb-3 rounded-xl border overflow-hidden ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
      <div className={`flex items-center justify-between px-4 py-3 ${isDark ? "bg-[#1a1f3a]" : "bg-gray-50"}`}>
        <button onClick={() => setOpen(!open)} className="flex-1 flex items-center gap-2 text-left">
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${color}22`, color }}>
            {data.length} rows
          </span>
          <span className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{label}</span>
          {isSampled && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`}>
              sampled
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 shrink-0 ml-auto opacity-50" /> : <ChevronDown className="w-4 h-4 shrink-0 ml-auto opacity-50" />}
        </button>
        <button onClick={downloadCSV} title="Download as CSV"
          className={`ml-3 p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-[#27304a] text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"}`}>
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className={`px-4 py-1.5 flex items-center gap-1.5 text-xs border-t ${isDark ? "border-[#0a0e27] bg-[#0d1230] text-gray-500" : "border-gray-100 bg-gray-50/80 text-gray-400"}`}>
        <Info className="w-3 h-3 shrink-0" />
        <span className="font-mono truncate">{source}</span>
      </div>
      {open && (
        <div className={isDark ? "bg-[#0a0e27]" : "bg-white"}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={isDark ? "bg-[#1a1f3a]" : "bg-gray-50"}>
                  {columns.map((col) => (
                    <th key={col} className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDark ? "text-gray-300" : "text-gray-700"}`}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((row, i) => (
                  <tr key={i} className={`border-t ${isDark ? "border-[#1a1f3a]" : "border-gray-100"} ${i % 2 === 0 ? (isDark ? "bg-[#0a0e27]" : "bg-white") : (isDark ? "bg-[#0d1230]" : "bg-gray-50/50")}`}>
                    {isPrimitive ? (
                      <>
                        <td className={`px-3 py-1.5 font-mono ${isDark ? "text-gray-500" : "text-gray-400"}`}>{page * PAGE_SIZE + i}</td>
                        <td className="px-3 py-1.5 font-mono" style={{ color }}>{fmt(row)}</td>
                      </>
                    ) : (
                      columns.map((col) => (
                        <td key={col} className={`px-3 py-1.5 font-mono whitespace-nowrap ${isDark ? "text-gray-300" : "text-gray-700"}`}>{fmt(row?.[col])}</td>
                      ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className={`flex items-center justify-between px-4 py-2 border-t text-xs ${isDark ? "border-[#1a1f3a] bg-[#1a1f3a] text-gray-400" : "border-gray-100 bg-gray-50 text-gray-600"}`}>
              <span>Page {page + 1} / {totalPages} · {data.length} total rows</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(page - 1)}
                  className={`px-3 py-1 rounded ${page === 0 ? "opacity-40 cursor-not-allowed" : ""} ${isDark ? "bg-[#27304a] text-white hover:bg-[#3f4a68]" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"}`}>Prev</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
                  className={`px-3 py-1 rounded ${page >= totalPages - 1 ? "opacity-40 cursor-not-allowed" : ""} ${isDark ? "bg-[#27304a] text-white hover:bg-[#3f4a68]" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"}`}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Group header ─────────────────────────────────────────────────────────────
const GroupHeader: React.FC<{ label: string; color: string; isDark: boolean }> = ({ label, color, isDark }) => (
  <div className={`flex items-center gap-2 mt-5 mb-2 pb-1 border-b ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
    <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const ArrayDataSection: React.FC<ArrayDataSectionProps> = ({ resultData, isDark }) => {
  const technique = detectTechnique(resultData);

  const techniqueLabel = technique === "air" ? "Air Economizer" : technique === "chilled" ? "Chilled Water" : "Evaporative";
  const techniqueColor = technique === "air" ? "#5ce1e5" : technique === "chilled" ? "#3b82f6" : "#10b981";

  const arrays: ArrayEntry[] = useMemo(() => {
    if (technique === "air") return buildAirArrays(resultData);
    return buildChilledArrays(resultData, technique);
  }, [resultData, technique]);

  // ── AI raw data explanation — cached per simulation ──────────
  const [aiFieldExp, setAiFieldExp] = useState<Record<string, string>>({});
  const [aiPattern, setAiPattern] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Sanitize: strip any JSON blobs that leaked into the pattern summary
  // Split into readable paragraphs if the LLM returned a single block
  const sanitizePattern = (text: string | null): string | null => {
    if (!text) return null;
    // Remove JSON code fences
    let clean = text.replace(/```(?:json)?\s*[\s\S]*?```/gi, "").trim();
    // Remove raw JSON objects that contain known keys
    clean = clean.replace(/\{[\s\S]*?"(?:field_explanations|pattern_summary)"[\s\S]*?\}/g, "").trim();
    // Strip leading comma + JSON key prefix (e.g. , "pattern_summary": ")
    clean = clean.replace(/^,?\s*["']?(?:pattern_summary|key_insight)["']?\s*:\s*["']?/i, "").trim();
    // Remove surrounding quotes
    clean = clean.replace(/^["']|["']$/g, "").trim();
    // Remove trailing comma + JSON key that sometimes leaks
    clean = clean.replace(/,\s*"key_insight"[\s\S]*$/i, "").trim();
    // Replace literal \n\n strings (LLM wrote escape sequence as text)
    clean = clean.replace(/\\n\\n/g, "\n\n").replace(/\\n/g, "\n");
    // Remove trailing quote that sometimes remains
    clean = clean.replace(/"$/, "").trim();
    if (clean.length < 10) return null;

    // If already has double newline paragraph breaks, use them directly
    if (clean.includes("\n\n")) {
      return clean.split(/\n\n+/).map(p => p.trim()).filter(Boolean).join("\n\n");
    }

    // If has single newlines, group pairs into paragraphs
    if (clean.includes("\n")) {
      const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);
      const paragraphs: string[] = [];
      for (let i = 0; i < lines.length; i += 2) {
        paragraphs.push(lines.slice(i, i + 2).join(" "));
      }
      return paragraphs.join("\n\n");
    }

    // Single block — split on sentence-ending punctuation followed by a capital letter
    const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z])/g;
    const sentences = clean.split(sentenceRegex).map(s => s.trim()).filter(Boolean);
    if (sentences.length <= 2) return clean;

    const paragraphs: string[] = [];
    const perPara = Math.ceil(sentences.length / Math.ceil(sentences.length / 3));
    for (let i = 0; i < sentences.length; i += perPara) {
      paragraphs.push(sentences.slice(i, i + perPara).join(" "));
    }
    return paragraphs.join("\n\n");
  };

  useEffect(() => {
    if (!resultData || arrays.length === 0) return;
    const primary = arrays[0];
    if (!primary || primary.data.length === 0) return;
    const sampleRows = primary.data.slice(0, 24);
    const fields = Object.keys(sampleRows[0] ?? {});
    if (fields.length === 0) return;

    // Build stable cache key — v4 includes improved prompt version
    const cacheKey = `rawdata_explanation_v4_${techniqueLabel}_${fields.slice(0, 5).join(",")}`;

    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only use cache if it has actual content
        if (parsed.fieldExplanations && Object.keys(parsed.fieldExplanations).length > 0) {
          setAiFieldExp(parsed.fieldExplanations ?? {});
          setAiPattern(sanitizePattern(parsed.patternSummary ?? null));
          setAiInsight(parsed.keyInsight ?? null);
          return;
        }
      }
    } catch {
      // ignore storage errors
    }

    // Build extra context: yearly projection + ML comparison summaries
    const yearlyEntry = arrays.find(a => a.key.includes("yearly") || a.key.includes("projection"));
    const mlEntry = arrays.find(a => a.key.includes("ml"));
    const extraContext: Record<string, any> = {};
    if (yearlyEntry && yearlyEntry.data.length > 0) {
      extraContext.yearlyProjection = yearlyEntry.data;
    }
    if (mlEntry && mlEntry.data.length > 0) {
      extraContext.mlComparison = mlEntry.data;
    }

    console.log(`[ArrayDataSection] Calling ${RAWDATA_API}/explain-raw-data for ${techniqueLabel} (${fields.length} fields, ${sampleRows.length} rows)`);
    setAiLoading(true);

    fetch(`${RAWDATA_API}/explain-raw-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        technique: techniqueLabel,
        fields,
        sampleRows,
        totalRows: primary.data.length,
        simulationContext: { technique: techniqueLabel },
        extraArrays: extraContext,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} from ${RAWDATA_API}`);
        return r.json();
      })
      .then((data) => {
        console.log("[ArrayDataSection] Got response:", Object.keys(data));
        const fieldExp = data.fieldExplanations ?? {};
        const pattern = sanitizePattern(data.patternSummary ?? null);
        const insight = data.keyInsight ?? null;
        setAiFieldExp(fieldExp);
        setAiPattern(pattern);
        setAiInsight(insight);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ fieldExplanations: fieldExp, patternSummary: pattern, keyInsight: insight }));
        } catch {
          // ignore storage errors
        }
      })
      .catch((err) => {
        console.error("[ArrayDataSection] Raw data explanation failed:", err.message);
        // Show a fallback message so the card is still visible
        setAiPattern(`Analysis unavailable: ${err.message}. Make sure the Raw Data Explanation API is running on port 8006.`);
      })
      .finally(() => setAiLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrays.length, techniqueLabel]);

  // Single download: the complete raw API response for this technique
  const downloadJSON = () => {
    const payload = getDownloadPayload(resultData, technique);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${technique}_simulation_result.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (arrays.length === 0) return null;

  const hasSampled = arrays.some((a) => a.isSampled);

  // Group arrays
  const groups = Array.from(new Set(arrays.map((a) => a.group)));

  return (
    <div className={`p-6 rounded-xl mb-6 ${isDark ? "bg-[#1a1f3a]" : "bg-white"} border ${isDark ? "border-[#3f4a68]" : "border-gray-200"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          <Database className="w-5 h-5" style={{ color: techniqueColor }} />
          Array Data
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${techniqueColor}22`, color: techniqueColor }}>
            {techniqueLabel}
          </span>
          <span className={`text-sm font-normal ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {arrays.length} arrays
          </span>
        </h2>
        <button
          onClick={downloadJSON}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${isDark ? "bg-[#27304a] text-white hover:bg-[#3f4a68]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          <Download className="w-3.5 h-3.5" />
          Download {techniqueLabel} JSON
        </button>
      </div>

      {hasSampled && (
        <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg mb-4 ${isDark ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Arrays marked <strong>sampled</strong> were reduced to ~120 points before Supabase storage (from 8760 hourly rows). Re-run the simulation to get all rows in memory.</span>
        </div>
      )}

      {/* AI Raw Data Analysis — plain text, no blue card, matches Detailed Metrics style */}
      {(aiLoading || aiPattern || Object.keys(aiFieldExp).length > 0) && (
        <div className="mb-6 space-y-3">
          {aiLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Analysing raw data fields...</span>
            </div>
          ) : (
            <>
              {/* Pattern summary — plain paragraphs, same style as detailed metrics */}
              {aiPattern && aiPattern.split(/\n\n+/).filter(Boolean).map((para, i) => (
                <p key={i} className={`text-sm leading-relaxed text-justify ${isDark ? "text-gray-100" : "text-gray-900"}`}>{para.trim()}</p>
              ))}

              {/* Key insight — italic, same as detailed metrics */}
              {aiInsight && (
                <p className={`text-sm leading-relaxed text-justify italic ${isDark ? "text-gray-300" : "text-gray-700"}`}>{aiInsight}</p>
              )}

              {/* Column Reference grid */}
              {Object.keys(aiFieldExp).length > 0 && (
                <div className="mt-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Column Reference ({Object.keys(aiFieldExp).length} fields)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {Object.entries(aiFieldExp).map(([field, desc]) => (
                      <div key={field} className={`flex gap-2 text-xs p-2 rounded-lg ${isDark ? "bg-[#1a1f3a]" : "bg-gray-50 border border-gray-100"}`}>
                        <code className={`font-mono font-bold shrink-0 ${isDark ? "text-[#5ce1e5]" : "text-blue-700"}`}>{field}</code>
                        <span className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>— {desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Yearly projection analysis */}
              {(() => {
                const yearlyEntry = arrays.find(a => a.key.includes("yearly") || a.key.includes("projection"));
                if (!yearlyEntry || yearlyEntry.data.length === 0) return null;
                const d = yearlyEntry.data;
                const firstYear = d[0];
                const lastYear = d[d.length - 1];
                const totalCost = d.reduce((s: number, r: any) => s + (r.totalCostUSD ?? r.totalTCO ?? 0), 0);
                const totalSavings = d.reduce((s: number, r: any) => s + (r.costSavingsUSD ?? 0), 0);
                return (
                  <div className={`mt-3 p-3 rounded-lg ${isDark ? "bg-[#1a1f3a] border border-[#3f4a68]" : "bg-white border border-gray-200"}`}>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>5-Year Projection Analysis</p>
                    <p className={`text-sm leading-relaxed ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                      The {d.length}-year projection shows total operating costs rising from{" "}
                      <strong>${(firstYear?.totalCostUSD ?? firstYear?.totalTCO ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> in Year {firstYear?.year ?? 1} to{" "}
                      <strong>${(lastYear?.totalCostUSD ?? lastYear?.totalTCO ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> in Year {lastYear?.year ?? d.length},
                      driven by carbon tax escalation and energy cost inflation.
                      {totalSavings > 0 && <> Cumulative savings over the period total <strong>${totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>.</>}
                      {" "}Total projected cost over {d.length} years: <strong>${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>.
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {d.map((row: any) => (
                        <div key={row.year} className={`text-xs p-2 rounded ${isDark ? "bg-[#0a0e27]" : "bg-gray-50"}`}>
                          <div className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Year {row.year}</div>
                          <div className={isDark ? "text-gray-400" : "text-gray-500"}>Cost: ${(row.totalCostUSD ?? row.totalTCO ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          {row.costSavingsUSD != null && <div className="text-green-500">Saved: ${row.costSavingsUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                          {row.emissionsTonsCO2 != null && <div className={isDark ? "text-gray-400" : "text-gray-500"}>{row.emissionsTonsCO2.toFixed(1)} tCO₂</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ML comparison is shown in the Recommendations tab — not duplicated here */}
            </>
          )}
        </div>
      )}

      {/* Grouped arrays */}
      <div>
        {groups.map((group) => {
          const groupArrays = arrays.filter((a) => a.group === group);
          const groupColor = groupArrays[0]?.color ?? techniqueColor;
          return (
            <div key={group}>
              <GroupHeader label={group} color={groupColor} isDark={isDark} />
              {groupArrays.map((entry) => (
                <ArrayTable key={entry.key} entry={entry} isDark={isDark} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
