import { supabase } from "../lib/supabase";
import { traceFieldMapping } from "../utils/fieldMappingTrace";

// Helper: Get current Supabase Auth user
export const getCurrentAuthUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
};

// Helper: Get user UUID from users table by auth_user_id
export const getUserUUID = async (authUserId: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();
  if (error || !data) return null;
  return data.id;
};

// Helper: Get user by their UUID (the primary key)
export const getUserById = async (userId: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data;
};

/**
 * Calculate cost savings percentage from ML comparison table
 * Compares the recommended technique's cost against the most expensive one
 */
const calculateSavingsFromComparison = (
  comparisonTable: Array<{
    tech: string;
    annual_cost?: number;
    cost?: number;
  }>,
): number => {
  if (!comparisonTable || comparisonTable.length < 2) return 0;

  const costs = comparisonTable
    .map((row) => row.annual_cost || row.cost || 0)
    .filter((c) => c > 0);

  if (costs.length < 2) return 0;

  const maxCost = Math.max(...costs);
  const minCost = Math.min(...costs);

  if (maxCost <= 0) return 0;

  // Calculate how much the best option saves compared to worst
  const savingsPercent = ((maxCost - minCost) / maxCost) * 100;
  return Math.round(savingsPercent * 10) / 10; // Round to 1 decimal
};

export interface SimulationWithResults {
  id: number;
  user_id: string; // Changed to string (UUID)
  name: string;
  description: string;
  simulation_type: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  updated_at: string;
  // UI-compatible mapped fields
  coolingTechnique?: string;
  createdAt?: string;
  itLoad?: number;
  numberOfRacks?: number;
  location?: string;
  energySaved?: number;
  result?: any;
}

/**
 * Fetch all simulations for a user using their UUID (users.id)
 */
export const getUserSimulations = async (
  userId: string, // This should be the users.id (UUID)
): Promise<{
  success: boolean;
  data?: { simulations: SimulationWithResults[] };
  error?: string;
}> => {
  try {
    // Prevent invalid userId
    if (!userId || userId === "NaN" || userId === "undefined") {
      return { success: false, error: "Invalid userId for simulation query" };
    }

    // Fetch all simulations for the user using the UUID
    const { data: simulations, error } = await supabase
      .from("simulations")
      .select("*")
      .eq("user_id", userId) // This now matches UUID format
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Fetch all results for these simulations
    const simulationIds = (simulations || []).map((sim: any) => sim.id);
    let resultsMap: Record<number, any> = {};
    if (simulationIds.length > 0) {
      const { data: results } = await supabase
        .from("simulation_results")
        .select("*")
        .in("simulation_id", simulationIds);
      if (results) {
        resultsMap = Object.fromEntries(
          results.map((r: any) => [r.simulation_id, r]),
        );
      }
    }

    // Map results into simulations
    const mapped: SimulationWithResults[] = (simulations || []).map(
      (sim: any) => {
        const result = resultsMap[sim.id];
        // Extract API payload for UI fields
        const apiPayload = result?.result_data?._api_payload || {};
        const rd = result?.result_data ?? {};

        // ── IT Load: prefer CloudSim hourly average, fall back to form config ──
        // CloudSim hourly results are in rd.hourlyResults[] (EconomizerController)
        // or rd.hourlyProfile[] (SimulationController)
        const hourly: any[] = rd?.hourlyResults ?? rd?.hourlyProfile ?? [];
        let itLoad = 0;
        let numberOfRacks = 0;
        let location = "Unknown Location";

        if (hourly.length > 0) {
          // Average CloudSim-generated IT load across all hours
          const avgIT =
            hourly.reduce(
              (sum: number, h: any) => sum + (h.itLoad_kW ?? h.itLoadKW ?? 0),
              0,
            ) / hourly.length;
          itLoad = Math.round(avgIT * 10) / 10;
        } else if (apiPayload.totalITLoadKW) {
          itLoad = apiPayload.totalITLoadKW;
        } else if (
          apiPayload.serversPerRack &&
          apiPayload.numberOfRacks &&
          apiPayload.serverMaxPowerW
        ) {
          const totalServers =
            apiPayload.serversPerRack * apiPayload.numberOfRacks;
          const avgUtilization = apiPayload.averageUtilization || 60;
          const avgPower =
            apiPayload.serverIdlePowerW +
            ((apiPayload.serverMaxPowerW - apiPayload.serverIdlePowerW) *
              avgUtilization) /
              100;
          itLoad = (totalServers * avgPower) / 1000;
        } else if (apiPayload.peakITLoadKW) {
          itLoad = apiPayload.peakITLoadKW;
        }

        if (apiPayload.numberOfRacks) numberOfRacks = apiPayload.numberOfRacks;

        if (apiPayload.location) location = apiPayload.location;
        else if (apiPayload.weatherFile)
          location = apiPayload.weatherFile
            .replace(".csv", "")
            .replace("_", " ");

        return {
          ...sim,
          coolingTechnique: sim.simulation_type,
          createdAt: sim.created_at,
          itLoad: Math.round(itLoad * 10) / 10,
          numberOfRacks,
          location,
          energySaved: result
            ? Math.round(result.cost_saving_percent * 10) / 10
            : 0,
          result: result || undefined,
        };
      },
    );

    // ── Field mapping trace for every loaded simulation ──────────────────────
    if (mapped.length > 0) {
      console.group(
        "🗺️  getUserSimulations — FIELD MAPPING TRACE (all simulations)",
      );
      mapped.forEach((sim) => {
        if (sim.result?.result_data) {
          traceFieldMapping(
            sim.simulation_type?.toUpperCase() ?? "UNKNOWN",
            sim.result.result_data,
            sim.result,
          );
        }
      });
      console.groupEnd();
    }

    return { success: true, data: { simulations: mapped } };
  } catch (error) {
    console.error("Get user simulations error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch user simulations",
    };
  }
};

/**
 * Fetch single simulation with results
 */
export const getSimulation = async (
  simulationId: number,
): Promise<{
  success: boolean;
  data?: SimulationWithResults;
  error?: string;
}> => {
  try {
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select("*")
      .eq("id", simulationId)
      .single();

    if (simError) {
      return { success: false, error: simError.message };
    }

    const { data: result } = await supabase
      .from("simulation_results")
      .select("*")
      .eq("simulation_id", simulationId)
      .maybeSingle(); // maybeSingle() returns null (not 406) when no row exists

    // Extract data from API payload
    const apiPayload = result?.result_data?._api_payload || {};
    const rd = result?.result_data ?? {};

    // ── IT Load: prefer CloudSim hourly average ──────────────────────────
    const hourly: any[] = rd?.hourlyResults ?? rd?.hourlyProfile ?? [];
    let itLoad = 0;
    let numberOfRacks = 0;
    let location = "Unknown Location";

    if (hourly.length > 0) {
      const avgIT =
        hourly.reduce(
          (sum: number, h: any) => sum + (h.itLoad_kW ?? h.itLoadKW ?? 0),
          0,
        ) / hourly.length;
      itLoad = Math.round(avgIT * 10) / 10;
    } else if (apiPayload.totalITLoadKW) {
      itLoad = apiPayload.totalITLoadKW;
    } else if (
      apiPayload.serversPerRack &&
      apiPayload.numberOfRacks &&
      apiPayload.serverMaxPowerW
    ) {
      const totalServers = apiPayload.serversPerRack * apiPayload.numberOfRacks;
      const avgUtilization = apiPayload.averageUtilization || 60;
      const avgPower =
        apiPayload.serverIdlePowerW +
        ((apiPayload.serverMaxPowerW - apiPayload.serverIdlePowerW) *
          avgUtilization) /
          100;
      itLoad = (totalServers * avgPower) / 1000;
    } else if (apiPayload.peakITLoadKW) {
      itLoad = apiPayload.peakITLoadKW;
    }

    if (apiPayload.location) {
      location = apiPayload.location;
    } else if (apiPayload.weatherFile) {
      location = apiPayload.weatherFile.replace(".csv", "").replace("_", " ");
    }

    return {
      success: true,
      data: {
        ...simulation,
        // Map simulation_type to coolingTechnique for component compatibility
        coolingTechnique: simulation.simulation_type,
        createdAt: simulation.created_at,
        itLoad: Math.round(itLoad * 10) / 10,
        numberOfRacks: numberOfRacks,
        location: location,
        energySaved: result
          ? Math.round(result.cost_saving_percent * 10) / 10
          : 0,
        result: result || undefined,
      },
    };
  } catch (error) {
    console.error("Get simulation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch simulation",
    };
  }
};

/**
 * Create a new simulation
 */
export const createSimulation = async (
  userId: string, // This should be the users.id (UUID)
  name: string,
  description: string,
  simulationType: string,
): Promise<{
  success: boolean;
  data?: SimulationWithResults;
  error?: string;
}> => {
  try {
    // Validate userId (should be UUID)
    if (!userId || userId === "NaN" || userId === "undefined") {
      return {
        success: false,
        error: "Missing or invalid userId for simulation creation",
      };
    }

    const { data: simulation, error } = await supabase
      .from("simulations")
      .insert([
        {
          user_id: userId, // This should be UUID
          name,
          description,
          simulation_type: simulationType,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        ...simulation,
        coolingTechnique: simulation.simulation_type,
      },
    };
  } catch (error) {
    console.error("Create simulation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create simulation",
    };
  }
};

/**
 * Update simulation status
 */
export const updateSimulationStatus = async (
  simulationId: number,
  status: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("simulations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", simulationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Update simulation status error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update simulation",
    };
  }
};

/**
 * Update simulation metadata fields like description/name.
 */
export const updateSimulationMetadata = async (
  simulationId: number,
  metadata: { description?: string; name?: string },
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("simulations")
      .update({ ...metadata, updated_at: new Date().toISOString() })
      .eq("id", simulationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Update simulation metadata error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update simulation metadata",
    };
  }
};

/**
 * Save simulation results
 */
export const saveSimulationResults = async (
  simulationId: number,
  resultData: any,
  apiPayload?: any,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current auth user
    const authUser = await getCurrentAuthUser();
    if (!authUser) {
      return {
        success: false,
        error:
          "User is not authenticated. Please log in to save simulation results.",
      };
    }

    // Get user UUID from users table using auth_user_id
    const userUUID = await getUserUUID(authUser.id);
    if (!userUUID) {
      return {
        success: false,
        error: "Could not find user UUID in users table.",
      };
    }

    // ════════════════════════════════════════════════════════════════════════
    // AIR ECONOMIZER — Response from SimulationController (/api/simulation/run)
    //
    // What SimulationController DOES return:
    //   summary.totalEnergyKWh          → total energy (IT + cooling)
    //   summary.totalItEnergyKWh        → IT energy only
    //   summary.totalCoolingEnergyKWh   → cooling energy only
    //   summary.averagePUE              → PUE
    //   summary.averageCUE              → CUE
    //   summary.estimatedOpExUSD        → electricity cost (energy × tariff)
    //   summary.totalCarbonKg           → total CO2 kg
    //   hourlyProfile[].itLoadKW        → hourly IT load
    //   hourlyProfile[].fanPowerKW      → hourly fan power
    //   hourlyProfile[].mechPowerKW     → hourly mechanical power
    //   hourlyProfile[].totalPowerKW    → hourly total power
    //   hourlyProfile[].tempC           → ambient temperature
    //   hourlyProfile[].rh              → relative humidity
    //   hourlyProfile[].mode            → FULL_ECON / PARTIAL_TRIM / MECH_ONLY
    //   hourlyProfile[].pue             → hourly PUE
    //   hourlyProfile[].cue             → hourly CUE
    //   tcoForecast[].year              → forecast year
    //   tcoForecast[].gridCost          → electricity cost that year
    //   tcoForecast[].carbonCost        → carbon tax cost that year
    //   tcoForecast[].totalTCO          → total cost that year
    //   tcoForecast[].energyKWh         → energy that year
    //   tcoForecast[].carbonTaxRate     → carbon tax rate that year
    //   aiConfig.computeIntensityFactor → AI workload multiplier
    //   aiConfig.forecastYears          → forecast horizon
    //   aiConfig.upliftMessage          → AI scaling message
    //
    // What SimulationController does NOT return (only EconomizerController has these):
    //   electricityCostUSD, carbonTaxCostUSD, annualOpExUSD, totalCapexUSD,
    //   annualSavingsUSD, paybackPeriodYears, energySavingsPercent, carbonSavings_kg
    //   → These are COMPUTED below from tcoForecast and simulation parameters
    // ════════════════════════════════════════════════════════════════════════
    console.group("🔍 FIELD EXTRACTION TRACE — saveSimulationResults");
    console.log("━━━ Raw resultData keys:", Object.keys(resultData));
    console.log("━━━ summary keys:", Object.keys(resultData?.summary ?? {}));
    console.log(
      "━━━ hourlyResults length:",
      resultData?.hourlyResults?.length ?? "N/A",
    );
    console.log(
      "━━━ hourlyProfile length:",
      resultData?.hourlyProfile?.length ?? "N/A",
    );
    console.log(
      "━━━ projection:",
      resultData?.projection ? "present" : "absent",
    );
    console.log(
      "━━━ tcoForecast:",
      resultData?.tcoForecast
        ? `present (${resultData.tcoForecast.length} years)`
        : "absent",
    );
    console.log(
      "━━━ results (chilled water):",
      resultData?.results ? "present" : "absent",
    );

    const energyConsumed =
      resultData.totalEnergyConsumption ||
      resultData.energy?.electricity_kwh_total ||
      resultData.summary?.totalEnergy_kWh || // EconomizerController (snake_case)
      resultData.summary?.totalEnergyKWh || // SimulationController (camelCase) ← YOUR case
      0;

    console.log(
      "━━━ energy_consumed_kwh resolved:",
      energyConsumed,
      "from:",
      resultData.totalEnergyConsumption
        ? "totalEnergyConsumption"
        : resultData.energy?.electricity_kwh_total
          ? "energy.electricity_kwh_total"
          : resultData.summary?.totalEnergy_kWh
            ? "summary.totalEnergy_kWh"
            : resultData.summary?.totalEnergyKWh
              ? "summary.totalEnergyKWh (SimulationController)"
              : "DEFAULT 0",
    );

    // Try to get PUE/cooling efficiency from ML, summary, or performance
    let coolingEfficiency =
      resultData.mlRecommendation?.pue ||
      resultData.summary?.averagePUE || // Both controllers use averagePUE
      resultData.performance?.pue_average ||
      resultData.cooling_efficiency ||
      resultData.results?.metrics?.pue || // Chilled water
      1.0;

    console.log(
      "━━━ cooling_efficiency resolved:",
      coolingEfficiency,
      "from:",
      resultData.mlRecommendation?.pue
        ? "mlRecommendation.pue"
        : resultData.summary?.averagePUE
          ? "summary.averagePUE"
          : resultData.performance?.pue_average
            ? "performance.pue_average"
            : resultData.cooling_efficiency
              ? "cooling_efficiency"
              : resultData.results?.metrics?.pue
                ? "results.metrics.pue (chilled water)"
                : "DEFAULT 1.0",
    );

    // Cost saving percent — prefer real CoolSim fields, never use ML comparison table
    // SimulationController: compute from tcoForecast (year1 savings vs baseline)
    // EconomizerController: summary.energySavingsPercent
    // Chilled water / Evaporative: compute from PUE vs baseline (PUE 1.8)
    const tcoForecast: any[] = resultData?.tcoForecast ?? [];
    const computedSavingsFromTCO = (() => {
      if (tcoForecast.length === 0) return null;
      const actualPUE = resultData?.summary?.averagePUE ?? 1.4;
      const baselinePUE = 1.8;
      if (actualPUE > 0 && baselinePUE > actualPUE) {
        return ((baselinePUE - actualPUE) / baselinePUE) * 100;
      }
      return null;
    })();

    // For chilled water / evaporative: backend hardcodes annualSavings = opex * 0.1 (10%)
    // Source: ChilledWaterSimulationService.java line 220: "double annualSavings = opex * 0.1"
    // Compute the actual dollar savings and store as percentage of baseline
    const computedSavingsFromPUE = (() => {
      const opex = resultData?.results?.economics?.opex_annual_USD ?? resultData?.results?.annual?.cost_USD;
      if (opex && opex > 0 && resultData?.results?.metrics?.pue !== undefined) {
        // annualSavings = opex * 0.1 (from backend formula)
        // Store as % of opex for cost_saving_percent column
        return 10.0; // 10% of opex = annualSavings
      }
      return null;
    })();

    let costSavingPercent =
      resultData.summary?.energySavingsPercent || // EconomizerController — real field
      computedSavingsFromTCO ||                    // SimulationController — computed from tcoForecast
      computedSavingsFromPUE ||                    // Chilled water / Evaporative — computed from PUE
      resultData.costSavings ||
      resultData.cost?.savings_percent ||
      resultData.results?.economics?.savingsPercent ||
      resultData.opex?.comparison?.savingsPercent ||
      0; // Never fall back to ML comparison table

    console.log(
      "━━━ cost_saving_percent resolved:",
      costSavingPercent,
      "from:",
      resultData.summary?.energySavingsPercent
        ? "summary.energySavingsPercent (EconomizerController)"
        : computedSavingsFromTCO
          ? `computed from tcoForecast PUE comparison (${computedSavingsFromTCO?.toFixed(1)}%)`
          : resultData.costSavings
            ? "costSavings"
            : resultData.cost?.savings_percent
              ? "cost.savings_percent"
              : resultData.results?.economics?.savingsPercent
                ? "results.economics.savingsPercent (chilled water)"
                : "DEFAULT 0",
    );

    // temperature_stability — NOT a CoolSim field for air/chilled water.
    // For air economizer: use % of hours WITHOUT airflow violations (from hourlyProfile)
    // For evaporative: use availability_percent from backend
    // For chilled water: use thermalCompliance gate
    const hourlyProfile: any[] =
      resultData?.hourlyProfile ?? resultData?.hourlyResults ?? [];
    const computedThermalStability = (() => {
      // Air economizer: % violation-free hours
      if (hourlyProfile.length > 0 && hourlyProfile[0]?.mode !== undefined) {
        const violations = hourlyProfile.filter(
          (h: any) => h.airflowViolation === true || h.violationMsg,
        ).length;
        return (
          Math.round(
            ((hourlyProfile.length - violations) / hourlyProfile.length) *
              100 *
              10,
          ) / 10
        );
      }
      // Chilled water: phase4Gates.thermalCompliance
      if (resultData?.results?.phase4Gates?.thermalCompliance === "PASS")
        return 100;
      if (resultData?.results?.phase4Gates?.thermalCompliance === "FAIL")
        return 0;
      return null;
    })();

    const temperatureStability =
      resultData.availability ||
      resultData.performance?.availability_percent ||
      computedThermalStability ||
      100;

    console.log(
      "━━━ temperature_stability resolved:",
      temperatureStability,
      "from:",
      resultData.availability
        ? "resultData.availability (evaporative)"
        : resultData.performance?.availability_percent
          ? "performance.availability_percent (evaporative)"
          : computedThermalStability !== null
            ? `computed: ${computedThermalStability}% violation-free hours from hourlyProfile`
            : "DEFAULT 100 (no violation data)",
    );

    const runtimeMinutes =
      resultData.runtimeMinutes ||
      (resultData.executionTime
        ? Math.round((resultData.executionTime / 60000) * 100) / 100
        : 0) ||
      (resultData.executionTimeMs
        ? Math.round((resultData.executionTimeMs / 60000) * 100) / 100
        : 0) ||
      resultData.simulation?.time_horizon_hours * 60 ||
      (resultData._simulationDurationMs
        ? Math.round((resultData._simulationDurationMs / 60000) * 100) / 100
        : 0) ||
      0.1;

    console.log("━━━ runtime_minutes resolved:", runtimeMinutes);
    console.groupEnd();
    console.groupEnd();

    // Save to simulation_results table
    // ── Supabase storage optimization ────────────────────────────────────────
    // Instead of stripping hourly arrays entirely, keep a sampled version
    // (every 73rd point ≈ 120 points) for charts. Full data in cop_simulation_data.
    const sampleArray = (arr: any[], maxPoints = 120): any[] => {
      if (!Array.isArray(arr) || arr.length <= maxPoints) return arr;
      const step = Math.ceil(arr.length / maxPoints);
      return arr.filter((_, i) => i % step === 0);
    };

    const stripHourlyForStorage = (data: any): any => {
      if (!data || typeof data !== "object") return data;
      const stripped = { ...data };

      // Sample large hourly arrays instead of deleting them
      const hourlyKeys = ["hourlyResults", "hourlyProfile", "hourlyEnergyUse",
        "temperatureTrends", "copOverTime", "hourlyITLoad",
        "hourlyWaterUse", "hourlyCarbon", "hourlyCost"];
      hourlyKeys.forEach(k => {
        if (Array.isArray(stripped[k]) && stripped[k].length > 200) {
          stripped[k] = sampleArray(stripped[k]);
        }
      });

      // Sample nested results.hourlyResults
      if (stripped.results?.hourlyResults?.length > 200) {
        stripped.results = { ...stripped.results };
        stripped.results.hourlyResults = sampleArray(stripped.results.hourlyResults);
      }
      // Sample rawChilledWaterData.results.hourlyResults
      if (stripped.rawChilledWaterData?.results?.hourlyResults?.length > 200) {
        stripped.rawChilledWaterData = { ...stripped.rawChilledWaterData };
        stripped.rawChilledWaterData.results = { ...stripped.rawChilledWaterData.results };
        stripped.rawChilledWaterData.results.hourlyResults = sampleArray(stripped.rawChilledWaterData.results.hourlyResults);
      }
      // Sample rawAirEconomizerData.hourlyResults
      if (stripped.rawAirEconomizerData?.hourlyResults?.length > 200) {
        stripped.rawAirEconomizerData = { ...stripped.rawAirEconomizerData };
        stripped.rawAirEconomizerData.hourlyResults = sampleArray(stripped.rawAirEconomizerData.hourlyResults);
      }
      return stripped;
    };

    const enhancedResultData = {
      ...stripHourlyForStorage(resultData),
      _api_payload: apiPayload || null,
    };

    const supabasePayload = {
      simulation_id: simulationId,
      user_id: userUUID, // This is the users.id (UUID)
      runtime_minutes:
        runtimeMinutes !== undefined && runtimeMinutes !== null
          ? Number(runtimeMinutes)
          : null,
      energy_consumed_kwh:
        energyConsumed !== undefined && energyConsumed !== null
          ? Number(energyConsumed)
          : null,
      cooling_efficiency:
        coolingEfficiency !== undefined && coolingEfficiency !== null
          ? Number(coolingEfficiency)
          : null,
      temperature_stability:
        temperatureStability !== undefined && temperatureStability !== null
          ? Number(temperatureStability)
          : null,
      cost_saving_percent:
        costSavingPercent !== undefined && costSavingPercent !== null
          ? Number(costSavingPercent)
          : null,
      recommendation:
        resultData.recommendation ||
        (resultData.mlRecommendation?.model_recommendation
          ? `Recommended technique: ${resultData.mlRecommendation.model_recommendation}`
          : "Simulation completed successfully"),
      result_data:
        typeof enhancedResultData === "object" ? enhancedResultData : {},
      completed_at: new Date().toISOString(),
    };

    console.log(
      "[SUPABASE PAYLOAD] simulation_results:",
      JSON.stringify(supabasePayload, null, 2),
    );

    // ════════════════════════════════════════════════════════════════
    // 💾 SUPABASE — FINAL INSERT PAYLOAD TRACE
    // ════════════════════════════════════════════════════════════════
    console.group("💾 SUPABASE — FINAL INSERT PAYLOAD");
    console.log("━━━ TABLE: simulation_results ━━━");
    console.log("simulation_id:", supabasePayload.simulation_id);
    console.log("user_id:", supabasePayload.user_id);
    console.log("energy_consumed_kwh:", supabasePayload.energy_consumed_kwh);
    console.log("cooling_efficiency:", supabasePayload.cooling_efficiency);
    console.log("cost_saving_percent:", supabasePayload.cost_saving_percent);
    console.log("runtime_minutes:", supabasePayload.runtime_minutes);
    console.log(
      "result_data keys:",
      Object.keys(supabasePayload.result_data ?? {}),
    );
    console.groupEnd();

    const { error } = await supabase
      .from("simulation_results")
      .insert([supabasePayload]);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log activity
    try {
      const { logActivity } = await import("../services/activityService");
      await logActivity(userUUID, "simulation_created", {
        entity_type: "simulation",
        entity_id: String(simulationId),
      });
    } catch {
      /* ignore */
    }

    // ── Auto-insert COP hourly summary as ONE row (averages of all 8760 rows) ──
    // Stores averages/totals — NOT individual rows — to keep Supabase storage lean.
    // Schema: cop_simulation_data stores one row per simulation with aggregate stats.
    const copHourlyArray: any[] | null = (() => {
      const chilled = resultData?.results?.hourlyResults;
      if (Array.isArray(chilled) && chilled.length > 0 && "cop" in chilled[0]) return chilled;
      const flat = resultData?.hourlyResults;
      if (Array.isArray(flat) && flat.length > 0 && "cop" in flat[0]) return flat;
      return null;
    })();

    if (copHourlyArray && copHourlyArray.length > 0) {
      const n = copHourlyArray.length;
      const technique = resultData?.results?.metrics?.averageCOP !== undefined
        ? "CHILLED_WATER"
        : resultData?.hourlyResults?.[0]?.requiredAirflow_CFM !== undefined
          ? "AIR_ECONOMIZER"
          : "EVAPORATIVE";

      // Compute averages and totals across all hourly rows
      const avg = (key: string, fallback = 0) =>
        copHourlyArray.reduce((s: number, h: any) => s + (h[key] ?? fallback), 0) / n;
      const sum = (key: string) =>
        copHourlyArray.reduce((s: number, h: any) => s + (h[key] ?? 0), 0);
      const max = (key: string) =>
        Math.max(...copHourlyArray.map((h: any) => h[key] ?? 0));
      const min = (key: string) =>
        Math.min(...copHourlyArray.map((h: any) => h[key] ?? Infinity));

      const copRow = {
        scenario_id:         simulationId,
        technique,
        hourly_rows_count:   n,
        // Averages
        avg_ambient_temp_c:  avg("ambientTemp_C") || avg("outdoorTempC") || avg("tempC"),
        avg_it_load_kw:      avg("itLoad_kW") || avg("itLoadKW"),
        avg_cooling_load_kw: avg("coolingLoad_kW") || avg("coolingLoadKW"),
        avg_chiller_power_kw: avg("chillerPower_kW") || avg("fanPower_kW"),
        avg_cop:             avg("cop"),
        avg_water_usage_l:   avg("waterUsage_L"),
        avg_cost_usd:        avg("cost_USD"),
        avg_carbon_kg:       avg("carbonEmissions_kg"),
        avg_pue:             avg("pue"),
        avg_cue:             avg("cue"),
        // Totals
        total_energy_kwh:    sum("itLoad_kW") + sum("chillerPower_kW") || sum("itLoadKW") + sum("fanPowerKW"),
        total_water_l:       sum("waterUsage_L"),
        total_cost_usd:      sum("cost_USD"),
        total_carbon_kg:     sum("carbonEmissions_kg"),
        // Extremes
        max_cop:             max("cop"),
        min_cop:             min("cop") === Infinity ? 0 : min("cop"),
        max_it_load_kw:      max("itLoad_kW") || max("itLoadKW"),
      };

      const { error: copErr } = await supabase.from("cop_simulation_data").insert([copRow]);
      if (copErr) {
        console.warn("[cop_simulation_data] Insert warning:", copErr.message);
      } else {
        console.log(`✅ [cop_simulation_data] Inserted averages for simulation ${simulationId} (${n} hourly rows averaged)`);
      }
    }

    // ── Auto-insert recommendations as ONE row ───────────────────────────────
    const mlRec = resultData?.mlRecommendation;
    if (mlRec) {
      const recRow = {
        simulation_id: simulationId,
        recommendation_type: "ml_recommendation",
        recommendation_text: mlRec.model_recommendation ?? null,
        // Store each sub-array in its dedicated jsonb column
        projection_json:
          Array.isArray(mlRec.scenario_projections) &&
          mlRec.scenario_projections.length > 0
            ? mlRec.scenario_projections
            : null,
        comparative_json:
          Array.isArray(mlRec.comparison_table) &&
          mlRec.comparison_table.length > 0
            ? mlRec.comparison_table
            : null,
        // Full mlRecommendation blob (includes why_this_is_recommended, future_impact_paragraph, etc.)
        all_json: mlRec,
      };

      const { error: recErr } = await supabase
        .from("recommendations")
        .insert([recRow]);

      if (recErr) {
        console.warn("[recommendations] Insert warning:", recErr.message);
      } else {
        console.log(
          `✅ [recommendations] Inserted 1 row for simulation ${simulationId}`,
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Save simulation results error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save simulation results",
    };
  }
};

/**
 * Delete simulation
 */
export const deleteSimulation = async (
  simulationId: number,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First, delete all related simulation_results
    const { error: resultError } = await supabase
      .from("simulation_results")
      .delete()
      .eq("simulation_id", simulationId);
    if (resultError) {
      return { success: false, error: resultError.message };
    }

    // Then, delete the simulation itself
    const { error } = await supabase
      .from("simulations")
      .delete()
      .eq("id", simulationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete simulation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete simulation",
    };
  }
};
