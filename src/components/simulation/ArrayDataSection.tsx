import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Database, Download, Info } from "lucide-react";

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
