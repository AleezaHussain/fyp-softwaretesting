import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as authService from "../services/authService";
import {
  createSimulation,
  updateSimulationStatus,
  saveSimulationResults,
  updateSimulationMetadata,
} from "../services/simulationService";
import {
  generateSimulationDescription,
  getMLRecommendation,
} from "../services/simulationIntelligenceService";

export interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  organization?: string;
  role?: string;
  authUserId?: string;
  simulationsRan?: number;
  preferences: {
    theme: "light" | "dark";
    units: "metric" | "imperial";
    notifications: boolean;
  };
}

export interface Simulation {
  id: string;
  name: string;
  location: string;
  itLoad: number;
  coolingTechnique: "air" | "water" | "evaporative" | "hybrid";
  createdAt: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  energySaved?: number;
  numberOfRacks?: number;
}

export interface SimulationInput {
  dataCenterName: string;
  location: string;
  itLoad: number;
  numberOfRacks: number;
  coolingTechnique: "air" | "water" | "evaporative" | "hybrid";
  supplyAirTemp: number;
  chilledWaterTemp: number;
  efficiencyFactor: number;
  electricityTariff: number;
  co2EmissionFactor: number;
  weatherData?: any;

  // Optional/Flat fields
  serverMaxPowerW?: number;
  serverIdlePowerW?: number;
  averageUtilization?: number;
  peakUtilization?: number;
  bestQuantity?: number;
  bestEfficiency?: number;
  averageQuantity?: number;
  averageEfficiency?: number;
  legacyQuantity?: number;
  legacyEfficiency?: number;
  economizerMaxOutdoorTemp?: number;
  economizerMaxHumidity?: number;
  minOutdoorAirFraction?: number;
  computeIntensityFactor?: number;
  forecastYears?: number;
  climateChangeOffsetC?: number;
  reviewed: boolean;
  airflowCFM?: number;
  returnAirTemp?: number;
  deltaT?: number;

  // Additional fields from forms
  carbonIntensity?: number;
  co2_grid_factor?: number;
  locationData?: any[];
  country?: string;
  aiWorkloadMode?: string;
  coresPerServer?: number;
  mipsPerCore?: number;
  serversPerRack?: number;
  energyEscalationRate?: number;
  carbonTaxProjected?: number;

  // Evaporative cooling specific
  evaporativeConfig?: {
    weatherData: any[];
    coolingArchitecture?: string;
    maxAirflowCapacity?: number;
    fanEfficiency?: number;
    saturationEffectiveness?: number;
    faceVelocity?: number;
    wettingEfficiency?: number;
    mediaType?: string;
    enableMechanicalBackup?: boolean;
    dxCOP?: number;
    waterSource?: string;
    cyclesOfConcentration?: number;
    tankVolume?: number;
    refillRate?: number;
    lowWaterCutoff?: number;
    electricityRate?: number;
    waterRate?: number;
    gridEmissionsFactor?: number;
    serversPerRack?: number;

    // Advanced fields
    annualElectricityInflation?: number;
    annualWaterInflation?: number;
    carbonPrice?: number;
    carbonPriceGrowth?: number;
    emissionsAccountingMethod?: string;
    renewableEnergyPercentage?: number;
    scenarioType?: string;
    temperatureOffset?: number;
    humidityAdjustment?: number;
    rackHeightU?: number;
    frontToBackAirflow?: boolean;
    airflowQualityPreset?: string;
    airBypassFraction?: number;
    hotAirRecirculation?: number;
    rackThermalMass?: number;
    enclosureThermalMass?: number;
    manualThermalOverride?: boolean;
    enclosureType?: string;
    enclosureThermalMassValue?: number;
    enclosureAirLeakage?: number;
    insulationQuality?: string;
    infiltrationLevel?: string;
    infiltrationACH?: number;
    enableCustomInfiltration?: boolean;
  };

  // Chilled water specific
  chilledWaterConfig?: any;
  fans?: any;
}

export interface SimulationResult {
  id: string;
  simulationId: string;
  pue: number;
  wue: number;
  totalEnergyConsumption: number;
  estimatedCost: number;
  carbonFootprint: number;
  hourlyEnergyUse: number[];
  temperatureTrends: number[];
  copOverTime: number[];
  timestamp: string;
  coolingTechnique?: string;
  _simulationDurationMs?: number;
  runtimeMinutes?: number;
  recommendations?: string[];
  recommendation?: string;
  recommendationSummary?: string;
  mlRecommendation?: any;
  coolingAdequacy?: any;
  evaporativeResults?: any;
  rawEvaporativeData?: any;
  energy?: any;
  water?: any;
  cost?: any;
  emissions?: any;
  performance?: any;
  economics?: any;
  phase4Gates?: any;
  summary?: any;
  rawChilledWaterData?: any;
  results?: any;
  averagePUE?: number;
  averageCUE?: number;
  totalEnergy_kWh?: number;
  totalCarbonEmissions_kg?: number;
  annual_emissions_kg?: number;
  annual_water_liters?: number;
  cost_breakdown?: Array<{ label: string; value: number }>;
  savings_trend?: Array<{ label: string; value: number }>;
  all_metrics?: Array<{ label: string; value: number }>;
  scenario_projections?: Array<{ label: string; value: number }>;
  water_usage?: Array<{ label: string; value: number }>;
  carbon_sources?: Array<{ label: string; value: number }>;
}

export interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}

export interface SimulationStore {
  simulations: Simulation[];
  currentSimulation: Simulation | null;
  currentInput: SimulationInput | null;
  currentResult: SimulationResult | null;
  isSimulationRunning: boolean;
  simulationProgress: number;
  simulationStatus: string;
  addSimulation: (simulation: Simulation) => void;
  setCurrentSimulation: (simulation: Simulation | null) => void;
  setCurrentInput: (input: SimulationInput | null) => void;
  setCurrentResult: (result: SimulationResult | null) => void;
  updateSimulationInput: (input: Partial<SimulationInput>) => void;
  setSimulationRunning: (isRunning: boolean) => void;
  setSimulationProgress: (progress: number) => void;
  setSimulationStatus: (status: string) => void;
  simulationFailureReason: string | null;
  setSimulationFailureReason: (reason: string | null) => void;
  runSimulation: (input: SimulationInput) => Promise<SimulationResult>;
  cancelSimulation: (simulationId: number) => Promise<void>;
  deleteSimulation: (simulationId: number) => Promise<void>;

  // ── Simulation list cache — fetched once per login session ──
  cachedSimulations: any[] | null;          // null = not yet loaded
  cachedSimulationsUserId: string | null;   // which user the cache belongs to
  setCachedSimulations: (sims: any[], userId: string) => void;
  invalidateSimulationsCache: () => void;
  removeCachedSimulation: (id: number) => void;

  // ── Simulation detail cache — keyed by simulation ID ──
  cachedSimulationDetails: Record<number, any>;
  setCachedSimulationDetail: (id: number, data: any) => void;
  invalidateSimulationDetail: (id: number) => void;
  clearAllSimulationDetailCache: () => void;

  // ── Weather location cache — countries + cities per country code ──
  cachedWeatherCountries: any[] | null;
  cachedWeatherCities: Record<string, any[]>;
  setCachedWeatherCountries: (countries: any[]) => void;
  setCachedWeatherCities: (countryCode: string, cities: any[]) => void;
  clearWeatherCache: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.signIn(email, password);

          if (!response.success) {
            set({ isLoading: false, error: response.error || "Login failed" });
            return { success: false, error: response.error };
          }

          // Always fetch the full user profile from the users table
          const profile = await authService.getCurrentUserProfile();
          if (!profile) {
            await authService.signOut();
            const missingProfileError =
              "Account profile not found. This account may have been deleted. Please sign up again.";
            set({ isLoading: false, error: missingProfileError });
            return { success: false, error: missingProfileError };
          }

          const user: User = {
            id: profile.id.toString() || "",
            name: profile.name || "User",
            email: profile.email || "",
            authUserId: profile.auth_user_id,
            role: profile.role,
            simulationsRan: profile.simulations_ran || 0,
            preferences: {
              theme: "light",
              units: "metric",
              notifications: true,
            },
          };

          set({ user, isAuthenticated: true, isLoading: false, error: null });

          // Log login activity using the auth UUID
          try {
            const { logActivity } = await import('../services/activityService');
            await logActivity(profile.auth_user_id, 'login', { metadata: { email: profile.email } });
          } catch { /* ignore */ }

          return { success: true };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Login failed";
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      signup: async (name: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.signUp(name, email, password);

          if (!response.success) {
            set({ isLoading: false, error: response.error || "Signup failed" });
            return { success: false, error: response.error };
          }

          // Supabase requires email confirmation — no session exists yet.
          // Return behavior flag from auth service so UI only shows confirmation modal when required.
          set({ isLoading: false, error: null });
          return {
            success: true,
            requiresEmailConfirmation:
              response.requiresEmailConfirmation === true,
          } as any;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Signup failed";
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        await authService.signOut();
        // Clear all simulation caches on logout
        useSimulationStore.getState().invalidateSimulationsCache();
        useSimulationStore.getState().clearAllSimulationDetailCache();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      initializeAuth: async () => {
        set({ isLoading: false });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

let canceledSimulationId: number | null = null;
let activeSimulationAbortController: AbortController | null = null;

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  simulations: [],
  currentSimulation: null,
  currentInput: null,
  currentResult: null,
  isSimulationRunning: false,
  simulationProgress: 0,
  simulationStatus: "",

  // ── Simulation list cache ──────────────────────────────────────────────────
  cachedSimulations: null,
  cachedSimulationsUserId: null,
  setCachedSimulations: (sims, userId) =>
    set({ cachedSimulations: sims, cachedSimulationsUserId: userId }),
  invalidateSimulationsCache: () =>
    set({ cachedSimulations: null, cachedSimulationsUserId: null }),
  removeCachedSimulation: (id) =>
    set((state) => ({
      cachedSimulations: state.cachedSimulations
        ? state.cachedSimulations.filter((s) => Number(s.id) !== id)
        : null,
    })),

  // ── Simulation detail cache ────────────────────────────────────────────────
  cachedSimulationDetails: {},
  setCachedSimulationDetail: (id, data) =>
    set((state) => ({
      cachedSimulationDetails: {
        ...state.cachedSimulationDetails,
        [id]: data,
      },
    })),
  invalidateSimulationDetail: (id) =>
    set((state) => {
      const next = { ...state.cachedSimulationDetails };
      delete next[id];
      return { cachedSimulationDetails: next };
    }),
  clearAllSimulationDetailCache: () =>
    set({ cachedSimulationDetails: {} }),

  // ── Weather location cache ─────────────────────────────────────────────────
  cachedWeatherCountries: null,
  cachedWeatherCities: {},
  setCachedWeatherCountries: (countries) =>
    set({ cachedWeatherCountries: countries }),
  setCachedWeatherCities: (countryCode, cities) =>
    set((state) => ({
      cachedWeatherCities: { ...state.cachedWeatherCities, [countryCode]: cities },
    })),
  clearWeatherCache: () =>
    set({ cachedWeatherCountries: null, cachedWeatherCities: {} }),
  // ──────────────────────────────────────────────────────────────────────────

  addSimulation: (simulation) =>
    set((state) => ({
      simulations: [...state.simulations, simulation],
    })),

  setCurrentSimulation: (simulation) => set({ currentSimulation: simulation }),
  setCurrentInput: (input) => set({ currentInput: input }),
  setCurrentResult: (result) => set({ currentResult: result }),
  setSimulationRunning: (isRunning) => set({ isSimulationRunning: isRunning }),
  setSimulationProgress: (progress) => set({ simulationProgress: progress }),
  setSimulationStatus: (status) => set({ simulationStatus: status }),
  simulationFailureReason: null,
  setSimulationFailureReason: (reason) =>
    set({ simulationFailureReason: reason }),

  updateSimulationInput: (input) =>
    set((state) => ({
      currentInput: state.currentInput
        ? { ...state.currentInput, ...input }
        : null,
    })),

  // Cancel simulation: update status in DB and state
  cancelSimulation: async (simulationId: number) => {
    canceledSimulationId = simulationId;
    // Abort any in-flight HTTP request immediately
    if (activeSimulationAbortController) {
      activeSimulationAbortController.abort();
      activeSimulationAbortController = null;
    }
    set({
      simulationStatus: "canceled",
      isSimulationRunning: false,
      currentSimulation: null,
    });
    await updateSimulationStatus(simulationId, "canceled");
  },

  // Delete simulation: remove from DB and update frontend state
  deleteSimulation: async (simulationId: number) => {
    const { deleteSimulation } = await import("../services/simulationService");
    const result = await deleteSimulation(simulationId);
    if (result.success) {
      set((state) => {
        const nextDetails = { ...state.cachedSimulationDetails };
        delete nextDetails[simulationId];
        return {
          simulations: state.simulations.filter(
            (sim) => Number(sim.id) !== Number(simulationId),
          ),
          cachedSimulations: state.cachedSimulations
            ? state.cachedSimulations.filter((s) => Number(s.id) !== simulationId)
            : null,
          cachedSimulationDetails: nextDetails,
        };
      });
    } else {
      throw new Error(result.error || "Failed to delete simulation");
    }
  },

  runSimulation: async (input: SimulationInput) => {
    // Helper returns the input value or null
    const val = (v: any) => (v !== undefined && v !== null ? v : null);

    // Reset cancel flag and create a fresh AbortController for this run
    canceledSimulationId = null;
    activeSimulationAbortController = new AbortController();
    const abortSignal = activeSimulationAbortController.signal;

    // Set simulation running state
    set({
      isSimulationRunning: true,
      simulationProgress: 0,
      simulationStatus: "Initializing simulation...",
    });

    // Get current Supabase Auth user and user UUID
    const { getCurrentAuthUser, getUserUUID } =
      await import("../services/simulationService");
    const authUser = await getCurrentAuthUser();
    if (!authUser) {
      set({ isSimulationRunning: false });
      throw new Error(
        "User not authenticated. Please log in to run simulations.",
      );
    }
    const userUUID = await getUserUUID(authUser.id);
    if (!userUUID) {
      set({ isSimulationRunning: false });
      throw new Error("Could not find user UUID in users table.");
    }

    // Check cooling technique to determine which API to call
    const coolingTechnique =
      (input as any).coolingTechnique || "Air Side Economization";

    // Create simulation record in database
    const simName = input.dataCenterName || `${coolingTechnique} Simulation`;
    const simDescription = `Simulation initialized for ${coolingTechnique}. Detailed summary will be generated after execution.`;

    set({
      simulationProgress: 10,
      simulationStatus: "Creating simulation record...",
    });
    console.log("💾 [DATABASE] Creating simulation record...");
    const createResult = await createSimulation(
      userUUID,
      simName,
      simDescription,
      coolingTechnique,
      input,
    );

    if (!createResult.success || !createResult.data) {
      set({ isSimulationRunning: false, simulationProgress: 0 });
      throw new Error(
        `Failed to create simulation record: ${createResult.error}`,
      );
    }

    const simulationId = createResult.data.id;
    console.log(`✅ [DATABASE] Simulation created with ID: ${simulationId}`);

    // Store current simulation so cancel button can reference it
    set({
      currentSimulation: {
        id: String(simulationId),
        name: simName,
        location: "",
        itLoad: 0,
        coolingTechnique: coolingTechnique as any,
        createdAt: new Date().toISOString(),
        status: "running",
      },
    });

    // Update status to running
    set({ simulationProgress: 20, simulationStatus: "Starting simulation..." });
    await updateSimulationStatus(simulationId, "running");
    console.log("🏃 [DATABASE] Simulation status updated to 'running'");

    // Helper function to save results after API call
    const saveResults = async (
      simulationId: number,
      apiResult: any,
      technique: string,
      apiPayload: any,
    ) => {
      try {
        console.log(`💾 [DATABASE] Saving ${technique} results...`);

        const mlRecommendation = await getMLRecommendation(
          input,
          technique,
          apiPayload,
          apiResult,
        );

        // Merge mlRecommendation into result
        const resultToSave = { ...apiResult, mlRecommendation };

        // Log full ML recommendation for debugging
        console.log(
          "🤖 [ML RECOMMENDATION] Full Response:",
          JSON.stringify(mlRecommendation, null, 2),
        );
        console.log(
          "🤖 [ML RECOMMENDATION] Model Recommendation:",
          mlRecommendation?.model_recommendation,
        );
        console.log(
          "🤖 [ML RECOMMENDATION] Reasons:",
          mlRecommendation?.why_this_is_recommended,
        );
        console.log(
          "🤖 [ML RECOMMENDATION] Future Impact:",
          mlRecommendation?.future_impact_paragraph,
        );
        console.log(
          "🤖 [ML RECOMMENDATION] Comparison Table:",
          mlRecommendation?.comparison_table,
        );

        // Save results to DB and update state (only once)
        await saveSimulationResults(simulationId, resultToSave, apiPayload);
        set({
          currentResult: resultToSave,
          simulationProgress: 100,
          simulationStatus: "Completed",
        });

        // Generate and save simulation description
        let generatedDescription = "";
        try {
          generatedDescription = await generateSimulationDescription(
            apiResult?.simulationName || technique,
            technique,
            apiResult,
            mlRecommendation,
          );
        } catch (descErr) {
          generatedDescription = `${technique} simulation completed.`;
        }
        await updateSimulationMetadata(simulationId, {
          description: generatedDescription,
        });

        set({ simulationProgress: 90, simulationStatus: "Saving results..." });
        await updateSimulationStatus(simulationId, "completed");
        set({ simulationProgress: 100, simulationStatus: "Completed!" });
        // Dispatch completion event so minimized modal can show notification
        window.dispatchEvent(
          new CustomEvent("simulation-completed", {
            detail: { simulationId, name: simName },
          }),
        );
        console.log(
          `✅ [DATABASE] ${technique} results saved and status updated to 'completed'`,
        );
      } catch (error) {
        console.error(
          `❌ [DATABASE] Failed to save ${technique} results:`,
          error,
        );
        await updateSimulationStatus(simulationId, "failed");
        const reason =
          error instanceof Error
            ? error.message
            : "Unknown error saving results";
        set({
          isSimulationRunning: false,
          simulationProgress: 0,
          simulationStatus: "Failed",
          simulationFailureReason: reason,
        });
        window.dispatchEvent(
          new CustomEvent("simulation-failed", {
            detail: { simulationId, name: simName, reason },
          }),
        );
      }
    };

    // 🔍 DEBUG: Log the raw input
    console.log(
      "🔍 [DEBUG] Raw input received by runSimulation:",
      JSON.stringify(input, null, 2),
    );
    console.log("🔍 [DEBUG] Input keys:", Object.keys(input));
    console.log(
      "🔍 [DEBUG] Has evaporativeConfig?",
      !!(input as any).evaporativeConfig,
    );
    console.log(
      "🔍 [DEBUG] Has chilledWaterConfig?",
      !!(input as any).chilledWaterConfig,
    );

    console.log(
      "🔥 [SIMULATION] Cooling technique selected:",
      coolingTechnique,
    );

    // ========================================================================
    // CHILLED WATER COOLING
    // ========================================================================
    if (coolingTechnique === "Chilled Water Cooling") {
      console.log("🌊 [CHILLED WATER] Using Chilled Water Cooling API");

      const chilledWaterConfig = (input as any).chilledWaterConfig;

      if (!chilledWaterConfig) {
        const missingMsg = "Chilled water configuration is missing";
        await updateSimulationStatus(simulationId, "failed", missingMsg);
        set({
          isSimulationRunning: false,
          simulationProgress: 0,
          simulationStatus: "Chilled water configuration missing",
          simulationFailureReason: missingMsg,
        });
        throw new Error(missingMsg);
      }

      console.log(
        "🌊 [CHILLED WATER] Configuration found:",
        chilledWaterConfig,
      );

      try {
        // Import and call the chilled water API service
        const { simulateChilledWater } =
          await import("../services/chilledWaterApi");

        // Track start time for runtime calculation
        const startTime = Date.now();

        set({
          simulationProgress: 30,
          simulationStatus: "Initializing Chilled Water simulation...",
        });

        // Progress updates during API call
        const progressMessages = [
          { progress: 35, status: "Connecting to Chilled Water API..." },
          { progress: 40, status: "Processing weather data..." },
          { progress: 50, status: "Running hourly simulation (8760 hours)..." },
          { progress: 60, status: "Calculating chiller performance..." },
          { progress: 70, status: "Computing economic analysis..." },
          { progress: 80, status: "Finalizing results..." },
        ];
        let progressIndex = 0;

        const progressInterval = setInterval(() => {
          if (progressIndex < progressMessages.length) {
            const { progress, status } = progressMessages[progressIndex];
            set({ simulationProgress: progress, simulationStatus: status });
            progressIndex++;
          }
        }, 2000);

        let result;
        try {
          // ════════════════════════════════════════════════════════════════
          // 🌊 CHILLED WATER — FULL API TRACE
          // ════════════════════════════════════════════════════════════════
          console.group("🌊 CHILLED WATER — API TRACE");
          console.log("━━━ 1. RAW FRONTEND CONFIG (from form) ━━━");
          console.log(JSON.parse(JSON.stringify(chilledWaterConfig)));
          console.log(
            "━━━ 2. SENDING TO API ━━━",
            "http://localhost:8081/api/v1/chilled-water/simulate",
          );
          result = await simulateChilledWater(chilledWaterConfig, abortSignal);
          console.log("━━━ 3. RAW API RESPONSE (from CoolSim backend) ━━━");
          console.log(JSON.parse(JSON.stringify(result)));
          console.groupEnd();
        } catch (apiError: any) {
          clearInterval(progressInterval);
          // If aborted by user cancel, don't mark as failed
          if (
            apiError?.name === "AbortError" ||
            canceledSimulationId === simulationId
          ) {
            return { success: false, canceled: true } as any;
          }
          await updateSimulationStatus(simulationId, "failed", "Chilled Water API error: " + apiError?.message);
          set({
            isSimulationRunning: false,
            simulationProgress: 0,
            simulationStatus: "Chilled Water API error: " + apiError?.message,
            simulationFailureReason: "Chilled Water API error: " + apiError?.message,
          });
          throw new Error("Chilled Water API error: " + apiError?.message);
        }

        clearInterval(progressInterval);

        // Calculate actual execution time
        const endTime = Date.now();
        const executionTimeMs = endTime - startTime;

        console.log("🌊 [CHILLED WATER] API Response received:", result);
        console.log(
          `🌊 [CHILLED WATER] Execution time: ${(executionTimeMs / 1000).toFixed(2)} seconds`,
        );

        const transformedResult = {
          ...transformChilledWaterResults(result),
          _simulationDurationMs: executionTimeMs,
          runtimeMinutes: Math.round((executionTimeMs / 60000) * 100) / 100,
        };

        // ════════════════════════════════════════════════════════════════
        // 🌊 CHILLED WATER — TRANSFORM + SUPABASE TRACE
        // ════════════════════════════════════════════════════════════════
        console.group("🌊 CHILLED WATER — TRANSFORM + SUPABASE TRACE");
        console.log("━━━ 4. TRANSFORMED RESULT (frontend model) ━━━");
        console.log(JSON.parse(JSON.stringify(transformedResult)));
        console.log("━━━ 5. SUPABASE PAYLOAD (what gets stored) ━━━");
        console.log({
          simulation_id: simulationId,
          technique: "CHILLED WATER",
          result_data_keys: Object.keys(transformedResult),
        });
        console.groupEnd();

        await saveResults(
          simulationId,
          transformedResult,
          "CHILLED WATER",
          chilledWaterConfig,
        );
        set({
          currentResult: transformedResult as any,
          isSimulationRunning: false,
        });
        return transformedResult;
      } catch (error: any) {
        console.error("🌊 [CHILLED WATER] Error:", error);
        await updateSimulationStatus(simulationId, "failed", error?.message);
        set({
          isSimulationRunning: false,
          simulationProgress: 0,
          simulationStatus: "Failed: " + error?.message,
          simulationFailureReason: error?.message || "Unknown chilled water error",
        });
        throw error;
      }
    }

    // ========================================================================
    // EVAPORATIVE COOLING
    // ========================================================================
    if (coolingTechnique === "Evaporative Cooling") {
      console.log("💧 [EVAPORATIVE] Using Evaporative Cooling API");

      const evapConfig = (input as any).evaporativeConfig;

      if (!evapConfig || !evapConfig.weatherData) {
        const missingMsg = "Evaporative configuration or weather data is missing";
        await updateSimulationStatus(simulationId, "failed", missingMsg);
        set({ isSimulationRunning: false, simulationProgress: 0, simulationFailureReason: missingMsg });
        throw new Error(missingMsg);
      }

      console.log("💧 [EVAPORATIVE] Configuration found:", evapConfig);

      try {
        // Set simulation running state
        set({
          isSimulationRunning: true,
          simulationProgress: 20,
          simulationStatus: "Starting Evaporative Cooling simulation...",
        });

        // Create evaporative payload
        const evaporativePayload = {
          simulation: {
            time_horizon_hours: evapConfig.simulationDuration || 8760,  // Use frontend-selected duration
            time_step_seconds: 3600,
            use_des_mode: true,
          },
          it_load: {
            total_it_power_kw: input.itLoad || 100.0,
            servers: input.numberOfRacks * (evapConfig.serversPerRack || 20),
            racks: input.numberOfRacks || 10,
            workload_type: evapConfig.workloadType || "AI_TRAINING",
            power_utilization_model: "cloudsim_ml",
            cloudsim_config: {
              enable_ml_workload: true,
              compute_intensity_factor: input.computeIntensityFactor || 1.2,
            },
          },
          cooling_system: {
            type:
              evapConfig.coolingArchitecture === "dec"
                ? "direct_evaporative"
                : evapConfig.coolingArchitecture === "iec"
                  ? "indirect_evaporative"
                  : "hybrid",
            max_airflow_cfm: evapConfig.maxAirflowCapacity || 10000.0,
            fan_efficiency: (evapConfig.fanEfficiency || 65) / 100,
            saturation_effectiveness:
              evapConfig.saturationEffectiveness || 85.0,
            face_velocity_ms: evapConfig.faceVelocity || 2.0,
            wetting_efficiency: evapConfig.wettingEfficiency || 95.0,
            media_type: evapConfig.mediaType || "cellulose",
            has_dx_backup: evapConfig.enableMechanicalBackup || false,
            dx_cop: evapConfig.dxCOP || 3.5,
            water_source: evapConfig.waterSource || "municipal",
            cycles_of_concentration: evapConfig.cyclesOfConcentration || 5.0,
            tank_volume_l: evapConfig.tankVolume || 5000.0,
            refill_rate_l_per_day: evapConfig.refillRate || 0.0,
            low_water_cutoff_percent: evapConfig.lowWaterCutoff || 10.0,
          },
          rates: {
            electricity_usd_per_kwh:
              evapConfig.electricityRate || input.electricityTariff || 0.12,
            water_usd_per_liter: evapConfig.waterRate || 0.001,
          },
          emissions: {
            grid_kgco2_per_kwh:
              evapConfig.gridEmissionsFactor || input.carbonIntensity || 0.45,
          },
          constraints: {
            max_inlet_temp_c: 27.0,
            max_relative_humidity: 80.0,
            max_pue: 1.5,
          },
          // Advanced Fields
          financial_escalation: {
            annual_electricity_inflation:
              evapConfig.annualElectricityInflation || 4.0,
            annual_water_inflation: evapConfig.annualWaterInflation || 3.0,
            carbon_price: evapConfig.carbonPrice || 50.0,
            carbon_price_growth: evapConfig.carbonPriceGrowth || 5.0,
          },
          carbon_accounting: {
            emissions_accounting_method:
              evapConfig.emissionsAccountingMethod || "location_based",
            renewable_energy_percentage:
              evapConfig.renewableEnergyPercentage || 0.0,
          },
          scenario: {
            scenario_type: evapConfig.scenarioType || "baseline_2025",
            temperature_offset: evapConfig.temperatureOffset || 1.0,
            humidity_adjustment: evapConfig.humidityAdjustment || 0.0,
          },
          rack_geometry: {
            rack_height_u: evapConfig.rackHeightU || 42,
            front_to_back_airflow:
              evapConfig.frontToBackAirflow !== undefined
                ? evapConfig.frontToBackAirflow
                : true,
          },
          airflow_distribution: {
            airflow_quality_preset:
              evapConfig.airflowQualityPreset || "typical",
            air_bypass_fraction: evapConfig.airBypassFraction || 10.0,
            hot_air_recirculation: evapConfig.hotAirRecirculation || 5.0,
          },
          thermal_mass: {
            rack_thermal_mass: evapConfig.rackThermalMass || 15.0,
            enclosure_thermal_mass: evapConfig.enclosureThermalMass || 30.0,
            manual_thermal_override: evapConfig.manualThermalOverride || false,
          },
          enclosure: {
            enclosure_type: evapConfig.enclosureType || "outdoor_container",
            enclosure_thermal_mass_value:
              evapConfig.enclosureThermalMassValue || 30.0,
            enclosure_air_leakage: evapConfig.enclosureAirLeakage || 0.5,
            insulation_quality: evapConfig.insulationQuality || "Low-Medium",
          },
          infiltration: {
            infiltration_level: evapConfig.infiltrationLevel || "standard",
            infiltration_ach: evapConfig.infiltrationACH || 0.25,
            enable_custom_infiltration:
              evapConfig.enableCustomInfiltration || false,
          },
        };

        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("  📤 SENDING TO BACKEND API - COMPLETE PAYLOAD");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("💧 [EVAPORATIVE] Basic Configuration:");
        console.log(
          "  ✓ IT Load:",
          evaporativePayload.it_load.total_it_power_kw,
          "kW",
        );
        console.log("  ✓ Servers:", evaporativePayload.it_load.servers);
        console.log("  ✓ Racks:", evaporativePayload.it_load.racks);
        console.log(
          "  ✓ Workload Type:",
          evaporativePayload.it_load.workload_type,
          "🚀 (CloudSim AI Mode)",
        );
        console.log(
          "  ✓ Cooling Type:",
          evaporativePayload.cooling_system.type,
        );
        console.log("  ✓ Weather Data Points:", evapConfig.weatherData.length);
        console.log(
          "═══════════════════════════════════════════════════════════",
        );

        // Create weather CSV from weather data
        const createWeatherCsv = (weatherData: any[]): string => {
          const header =
            "Hour,DryBulbTemp_C,RelativeHumidity_%,Pressure_kPa,WindSpeed_m/s";
          const rows = weatherData.map((data, index) => {
            const hour = index + 1;
            const temp = data.temperature || 25.0;
            const humidity = data.humidity || 50.0;
            const pressure = 101.3;
            const windSpeed = 2.0;

            return `${hour},${temp},${humidity},${pressure},${windSpeed}`;
          });

          return [header, ...rows].join("\n");
        };

        const weatherCsv = createWeatherCsv(evapConfig.weatherData);

        console.log(
          "💧 [EVAPORATIVE] Weather CSV created, length:",
          weatherCsv.length,
        );

        // Create FormData for multipart request
        const formData = new FormData();
        const weatherBlob = new Blob([weatherCsv], { type: "text/csv" });
        formData.append("weatherFile", weatherBlob, "weather_data.csv");
        formData.append("config", JSON.stringify(evaporativePayload));

        // ════════════════════════════════════════════════════════════════
        // 💧 EVAPORATIVE — FULL API TRACE
        // ════════════════════════════════════════════════════════════════
        console.group("💧 EVAPORATIVE — API TRACE");
        console.log("━━━ 1. RAW FRONTEND CONFIG (from form) ━━━");
        console.log(JSON.parse(JSON.stringify(evapConfig)));
        console.log("━━━ 2. API PAYLOAD SENT TO COOLSIM ━━━");
        console.log(JSON.parse(JSON.stringify(evaporativePayload)));

        // ── WORKLOAD VERIFICATION LOG ─────────────────────────────────────
        // Confirms workload_type and compute_intensity_factor are dynamic,
        // not hardcoded. Backend derives intensity from workload type:
        //   ai_training  → 1.8×  |  ai_inference → 1.4×
        //   mixed_ai     → 1.3×  |  traditional  → 1.0×
        const _wt = evaporativePayload.it_load.workload_type;
        const _ci = evaporativePayload.it_load.cloudsim_config.compute_intensity_factor;
        const _expectedIntensity: Record<string, number> = {
          ai_training: 1.8, ai_inference: 1.4, mixed_ai: 1.3, traditional: 1.0,
        };
        const _expected = _expectedIntensity[_wt?.toLowerCase()] ?? "backend-derived";
        console.group("🔬 [EVAP WORKLOAD VERIFICATION]");
        console.log(`  workload_type sent to backend : "${_wt}"`);
        console.log(`  compute_intensity_factor sent : ${_ci} (frontend value — backend overrides with ${_expected})`);
        console.log(`  Expected backend intensity    : ${_expected}×`);
        console.log(_wt === "AI_TRAINING" || _wt === "ai_training"
          ? "  ⚠️  NOTE: This was previously hardcoded. Now dynamic from form selection."
          : "  ✅  Dynamic workload mode confirmed — not hardcoded.");
        console.groupEnd();
        // ─────────────────────────────────────────────────────────────────
        console.log(
          "━━━ 2b. WEATHER DATA ━━━",
          `${evapConfig.weatherData?.length ?? 0} points, first row:`,
          evapConfig.weatherData?.[0],
        );
        console.log(
          "━━━ SENDING TO ━━━",
          "http://localhost:8082/api/simulations/evaporative-cooling",
        );

        // Track start time for runtime calculation
        const evapStartTime = Date.now();

        set({
          simulationProgress: 30,
          simulationStatus: "Initializing Evaporative Cooling simulation...",
        });

        // Progress updates during API call
        const evapProgressMessages = [
          { progress: 35, status: "Connecting to Evaporative Cooling API..." },
          { progress: 45, status: "Processing weather data..." },
          { progress: 55, status: "Running hourly simulation..." },
          {
            progress: 65,
            status: "Calculating evaporative cooling efficiency...",
          },
          { progress: 75, status: "Computing water usage & costs..." },
        ];
        let evapProgressIndex = 0;

        const evapProgressInterval = setInterval(() => {
          if (evapProgressIndex < evapProgressMessages.length) {
            const { progress, status } =
              evapProgressMessages[evapProgressIndex];
            set({ simulationProgress: progress, simulationStatus: status });
            evapProgressIndex++;
          }
        }, 1500);

        // Call evaporative cooling API
        let response: Response;
        try {
          response = await fetch(
            "http://localhost:8082/api/simulations/evaporative-cooling",
            {
              method: "POST",
              body: formData,
              signal: abortSignal,
            },
          );
        } catch (fetchErr: any) {
          clearInterval(evapProgressInterval);
          if (
            fetchErr?.name === "AbortError" ||
            canceledSimulationId === simulationId
          ) {
            return { success: false, canceled: true } as any;
          }
          await updateSimulationStatus(simulationId, "failed");
          set({
            isSimulationRunning: false,
            simulationProgress: 0,
            simulationStatus: "Failed",
          });
          throw fetchErr;
        }

        clearInterval(evapProgressInterval);

        if (abortSignal?.aborted || canceledSimulationId === simulationId) {
          return { success: false, canceled: true } as any;
        }

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Unknown error" }));
          const evapErrMsg = `Evaporative cooling simulation failed: ${errorData.message || response.statusText}`;
          await updateSimulationStatus(simulationId, "failed", evapErrMsg);
          throw new Error(evapErrMsg);
        }

        const data = await response.json();

        // Calculate actual execution time
        const evapEndTime = Date.now();
        const evapExecutionTimeMs = evapEndTime - evapStartTime;

        console.log("💧 [EVAPORATIVE] API Response received:", data);
        console.log(
          `💧 [EVAPORATIVE] Execution time: ${(evapExecutionTimeMs / 1000).toFixed(2)} seconds`,
        );
        console.log("📥 RAW API RESPONSE:", JSON.stringify(data, null, 2));
        console.groupEnd();

        // Transform evaporative cooling results
        const transformEvaporativeResults = (evapData: any): any => {
          const results = evapData.results || {};
          const assessment = evapData.cooling_assessment || {};
          const hourlyData: any[] = evapData.hourly_data || [];

          // ── Derived hourly arrays from hourly_data[] ──────────────────────
          const evapHourlyIT = hourlyData.map((h: any) => h.itLoadKW ?? 0);
          const evapHourlyFan = hourlyData.map((h: any) => h.fanPowerKW ?? 0);
          const evapHourlyTotal = hourlyData.map(
            (h: any) => h.totalElectricalKW ?? 0,
          );
          const evapHourlyPUE = hourlyData.map((h: any) => h.pue ?? 0);
          const evapHourlyInlet = hourlyData.map((h: any) => h.inletTempC ?? 0);
          const evapHourlySupply = hourlyData.map(
            (h: any) => h.supplyTempC ?? 0,
          );
          const evapHourlyAmbient = hourlyData.map(
            (h: any) => h.ambientTempC ?? 0,
          );
          const evapHourlyHumid = hourlyData.map(
            (h: any) => h.ambientHumidity ?? 0,
          );
          const evapHourlyCooling = hourlyData.map(
            (h: any) => h.coolingCapacityKW ?? 0,
          );
          const evapHourlyWater = hourlyData.map(
            (h: any) => h.waterEvaporationLph ?? 0,
          );
          const evapHourlyDX = hourlyData.map((h: any) => h.dxPowerKW ?? 0);

          return {
            simulationId: `evap_${Date.now()}`,
            timestamp: new Date().toISOString(),
            coolingTechnique: "evaporative",

            // ── Top-level summary fields ──────────────────────────────────
            totalEnergyConsumption: results.energy?.electricity_kwh_total || 0,
            estimatedCost: results.cost?.total_energy_cost_usd || 0,
            carbonFootprint: results.emissions?.co2_kg_total || 0,
            waterConsumption: results.water?.water_liters_total || 0,
            pue: results.performance?.pue_average || 1.0,
            wue: results.performance?.wue_average || 0,
            cue: results.performance?.cue_average || 0,
            availability_percent:
              results.performance?.availability_percent || 0,
            cooling_failure_hours:
              results.performance?.cooling_failure_hours || 0,
            pue_max: results.performance?.pue_max || 0,

            // ── Energy breakdown ──────────────────────────────────────────
            it_kwh: results.energy?.it_kwh || 0,
            fan_kwh: results.energy?.fan_kwh || 0,
            dx_kwh: results.energy?.dx_kwh || 0,
            pump_kwh: results.energy?.pump_kwh || 0,
            auxiliary_kwh: results.energy?.auxiliary_kwh || 0,

            // ── Cost / OpEx ───────────────────────────────────────────────
            electricity_usd: results.cost?.electricity_usd || 0,
            water_usd: results.cost?.water_usd || 0,
            opex_total_usd: results.opex?.opex_total_usd || 0,
            opex_per_kwh_it: results.opex?.opex_per_kwh_it || 0,
            opex_per_server_annual: results.opex?.opex_per_server_annual || 0,

            // ── Emissions ─────────────────────────────────────────────────
            co2_kg_per_kwh_it: results.emissions?.co2_kg_per_kwh_it || 0,
            co2_kg_per_server_annual:
              results.emissions?.co2_kg_per_server_annual || 0,

            // ── Water ─────────────────────────────────────────────────────
            evaporation_liters: results.water?.evaporation_liters || 0,
            blowdown_liters: results.water?.blowdown_liters || 0,
            makeup_liters: results.water?.makeup_liters || 0,

            // ── Hourly arrays (from hourly_data[]) ────────────────────────
            hourlyData, // full raw hourly_data array
            hourlyEnergyUse: evapHourlyTotal,
            hourlyITLoad: evapHourlyIT,
            hourlyFanPower: evapHourlyFan,
            hourlyDXPower: evapHourlyDX,
            hourlyPUE: evapHourlyPUE,
            hourlyInletTemp: evapHourlyInlet,
            hourlySupplyTemp: evapHourlySupply,
            temperatureTrends: evapHourlyAmbient,
            hourlyHumidity: evapHourlyHumid,
            hourlyCoolingCap: evapHourlyCooling,
            hourlyWaterEvap: evapHourlyWater,
            copOverTime: [], // evaporative has no COP field

            // ── Cooling assessment ────────────────────────────────────────
            coolingAdequacy: {
              status: assessment.status || "UNKNOWN",
              confidence: assessment.confidence || 0.5,
              checks: assessment.checks || {},
              keyMetrics: assessment.key_metrics || {},
              engineeringNotes: assessment.engineering_notes || [],
              recommendations: assessment.recommendations || [],
              hourlyFailures: assessment.hourly_failures || {},
            },

            // ── Derived summary ───────────────────────────────────────────
            evaporativeResults: {
              fanEnergy: results.energy?.fan_kwh || 0,
              pumpEnergy: results.energy?.pump_kwh || 0,
              dxBackupEnergy: results.energy?.dx_kwh || 0,
              itEnergy: results.energy?.it_kwh || 0,
              waterEvaporation: results.water?.evaporation_liters || 0,
              waterBlowdown: results.water?.blowdown_liters || 0,
              maxInletTemp: assessment.key_metrics?.max_inlet_temp_c || 0,
              coolingCapacityAvg:
                assessment.key_metrics?.cooling_capacity_avg_kw || 0,
              heatLoadAvg: assessment.key_metrics?.heat_load_avg_kw || 0,
              coolingFailureHours:
                results.performance?.cooling_failure_hours || 0,
            },

            // ── Raw API response (full) ───────────────────────────────────
            rawEvaporativeData: evapData,
          };
        };

        const transformedData = {
          ...transformEvaporativeResults(data),
          _simulationDurationMs: evapExecutionTimeMs,
          runtimeMinutes: Math.round((evapExecutionTimeMs / 60000) * 100) / 100,
        };

        // ════════════════════════════════════════════════════════════════
        // 💧 EVAPORATIVE — TRANSFORM + SUPABASE TRACE
        // ════════════════════════════════════════════════════════════════
        console.group("💧 EVAPORATIVE — TRANSFORM + SUPABASE TRACE");
        console.log("━━━ 3. RAW API RESPONSE (from CoolSim backend) ━━━");
        console.log(JSON.parse(JSON.stringify(data)));
        console.log("━━━ 4. TRANSFORMED RESULT (frontend model) ━━━");
        console.log(JSON.parse(JSON.stringify(transformedData)));
        console.log("━━━ 5. SUPABASE PAYLOAD (what gets stored) ━━━");
        console.log({
          simulation_id: simulationId,
          technique: "EVAPORATIVE",
          result_data_keys: Object.keys(transformedData),
        });
        console.groupEnd();

        await saveResults(
          simulationId,
          transformedData,
          "EVAPORATIVE",
          evaporativePayload,
        );
        set({ currentResult: transformedData, isSimulationRunning: false });
        return transformedData;
      } catch (error: any) {
        console.error("💧 [EVAPORATIVE] Error:", error);
        await updateSimulationStatus(simulationId, "failed", error?.message);
        set({
          isSimulationRunning: false,
          simulationProgress: 0,
          simulationStatus: "Failed",
          simulationFailureReason: error?.message || "Unknown evaporative error",
        });
        throw error;
      }
    }

    // ========================================================================
    // AIR ECONOMIZER (Default)
    // ========================================================================
    console.log("💨 [AIR ECONOMIZER] Using Air Economizer API");

    const weatherData = Array.isArray((input as any).locationData)
      ? (input as any).locationData.map((d: any) => ({
          timestamp: d.timestamp,
          temperature: d.temperature,
          humidity: d.humidity,
        }))
      : [];

    const payload = {
      enableCloudSim: true,
      aiWorkloadMode: val((input as any).aiWorkloadMode) ?? "AI_TRAINING",
      computeIntensityFactor: val(input.computeIntensityFactor) ?? 1.0,
      coresPerServer: val((input as any).coresPerServer) ?? 4,
      mipsPerCore: val((input as any).mipsPerCore) ?? 1000,
      numberOfRacks: val(input.numberOfRacks),
      serversPerRack: val((input as any).serversPerRack),
      serverMaxPowerW: input.serverMaxPowerW,
      serverIdlePowerW: input.serverIdlePowerW,
      averageUtilization: input.averageUtilization ?? input.efficiencyFactor,
      peakUtilization: input.peakUtilization,
      bestQuantity: val(input.bestQuantity),
      bestEfficiency: val(input.bestEfficiency),
      averageQuantity: val(input.averageQuantity),
      averageEfficiency: val(input.averageEfficiency),
      legacyQuantity: val(input.legacyQuantity),
      legacyEfficiency: val(input.legacyEfficiency),
      country: val((input as any).country),
      electricityTariff: val(input.electricityTariff),
      carbonIntensity: val(
        input.co2EmissionFactor ??
          (input as any).carbon_intensity ??
          (input as any).carbonIntensity ??
          (input as any).co2_grid_factor,
      ),
      weatherData,
      airflowCFM: val(input.airflowCFM),
      supplyAirTemp: val(input.supplyAirTemp),
      returnAirTemp: val(input.returnAirTemp),
      deltaT: val(input.deltaT),
      economizerMaxOutdoorTemp: val(input.economizerMaxOutdoorTemp),
      economizerMaxHumidity: val(input.economizerMaxHumidity),
      minOutdoorAirFraction: val(input.minOutdoorAirFraction),
      forecastYears: val(input.forecastYears),
      energyEscalationRate: val((input as any).energyEscalationRate),
      carbonTaxProjected: val((input as any).carbonTaxProjected),
      climateChangeOffsetC: val(input.climateChangeOffsetC),
      simulationDuration: val((input as any).simulationDuration) ?? 8760,
      ...(input as any).fans,
    };

    // ════════════════════════════════════════════════════════════════
    // 💨 AIR ECONOMIZER — FULL API TRACE
    // ════════════════════════════════════════════════════════════════
    console.group("💨 AIR ECONOMIZER — API TRACE");
    console.log("━━━ 1. RAW FRONTEND INPUT (from form) ━━━");
    console.log(JSON.parse(JSON.stringify(input)));
    console.log("━━━ 2. API PAYLOAD SENT TO COOLSIM ━━━");
    console.log(JSON.parse(JSON.stringify(payload)));
    console.log(
      "━━━ SENDING TO ━━━",
      "http://localhost:8080/api/simulation/run (SimulationController — with duration support)",
    );

    try {
      // Track start time for runtime calculation
      const airStartTime = Date.now();

      set({
        isSimulationRunning: true,
        simulationProgress: 30,
        simulationStatus: "Initializing Air Economizer simulation...",
      });

      // Progress updates during API call
      const airProgressMessages = [
        { progress: 40, status: "Connecting to Air Economizer API..." },
        { progress: 50, status: "Processing weather data..." },
        { progress: 60, status: "Running thermal simulation..." },
        { progress: 70, status: "Calculating energy consumption..." },
        { progress: 80, status: "Computing projections..." },
      ];
      let airProgressIndex = 0;

      const airProgressInterval = setInterval(() => {
        if (airProgressIndex < airProgressMessages.length) {
          const { progress, status } = airProgressMessages[airProgressIndex];
          set({ simulationProgress: progress, simulationStatus: status });
          airProgressIndex++;
        }
      }, 800);

      let response: Response;
      try {
        response = await fetch("http://localhost:8080/api/simulation/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abortSignal,
        });
      } catch (fetchErr: any) {
        clearInterval(airProgressInterval);
        if (
          fetchErr?.name === "AbortError" ||
          canceledSimulationId === simulationId
        ) {
          return { success: false, canceled: true } as any;
        }
        await updateSimulationStatus(simulationId, "failed", fetchErr?.message);
        set({
          isSimulationRunning: false,
          simulationProgress: 0,
          simulationStatus: "Failed",
          simulationFailureReason: fetchErr?.message || "Network error connecting to Air Economizer API",
        });
        throw fetchErr;
      }

      clearInterval(airProgressInterval);

      if (abortSignal?.aborted || canceledSimulationId === simulationId) {
        return { success: false, canceled: true } as any;
      }

      if (!response.ok) {
        const airErrMsg = `Air Economizer API responded with status ${response.status}`;
        await updateSimulationStatus(simulationId, "failed", airErrMsg);
        set({
          isSimulationRunning: false,
          simulationProgress: 0,
          simulationStatus: "Failed",
          simulationFailureReason: airErrMsg,
        });
        throw new Error(airErrMsg);
      }

      const data = await response.json();

      // Calculate actual execution time
      const airEndTime = Date.now();
      const airExecutionTimeMs = airEndTime - airStartTime;

      console.log("💨 [AIR ECONOMIZER] API Response received:", data);
      console.log(
        `💨 [AIR ECONOMIZER] Execution time: ${(airExecutionTimeMs / 1000).toFixed(2)} seconds`,
      );
      console.log("📥 RAW API RESPONSE:", JSON.stringify(data, null, 2));
      console.groupEnd();

      // ════════════════════════════════════════════════════════════════
      // 💨 AIR ECONOMIZER — NORMALIZE + SUPABASE TRACE
      // ════════════════════════════════════════════════════════════════
      console.group("💨 AIR ECONOMIZER — TRANSFORM + SUPABASE TRACE");
      console.log("━━━ 3. RAW API RESPONSE (from CoolSim backend) ━━━");
      console.log(JSON.parse(JSON.stringify(data)));

      // ── IT Load directly from CoolSim ─────────────────────────────────
      const _h0 = data?.hourlyResults?.[0] ?? data?.hourlyProfile?.[0];
      console.group("⚡ IT LOAD FROM CLOUDSIM (EconomizerController fields)");
      console.log(
        "Hour 0 itLoad_kW (EconomizerController):",
        _h0?.itLoad_kW ?? "NOT FOUND — check if using /api/simulate",
      );
      console.log(
        "Hour 0 itLoadKW  (SimulationController):",
        _h0?.itLoadKW ?? "NOT FOUND",
      );
      console.log(
        "Hour 0 coolingLoad_kW:",
        _h0?.coolingLoad_kW ?? _h0?.coolingLoadKW ?? "NOT FOUND",
      );
      console.log(
        "Hour 0 fanPower_kW:",
        _h0?.fanPower_kW ?? _h0?.fanPowerKW ?? "NOT FOUND",
      );
      console.log(
        "Hour 0 mechPower_kW:",
        _h0?.mechPower_kW ?? _h0?.mechPowerKW ?? "NOT FOUND",
      );
      console.log(
        "Hour 0 totalPower_kW:",
        _h0?.totalPower_kW ?? _h0?.totalPowerKW ?? "NOT FOUND",
      );
      console.log(
        "Hour 0 requiredAirflow_CFM:",
        _h0?.requiredAirflow_CFM ?? "NOT FOUND (EconomizerController only)",
      );
      console.log(
        "Hour 0 airflowViolation:",
        _h0?.airflowViolation ?? "NOT FOUND (EconomizerController only)",
      );
      console.log(
        "Hour 0 q_free_kW:",
        _h0?.q_free_kW ?? "NOT FOUND (EconomizerController only)",
      );
      console.log(
        "Hour 0 mech_load_kW:",
        _h0?.mech_load_kW ?? "NOT FOUND (EconomizerController only)",
      );
      console.log("Hour 0 violationMsg:", _h0?.violationMsg ?? "none");
      console.log("Hour 0 mode:", _h0?.mode ?? "NOT FOUND");
      console.log("Hour 0 pue:", _h0?.pue ?? "NOT FOUND");
      console.log("Hour 0 cue:", _h0?.cue ?? "NOT FOUND");
      console.log(
        "Total hourly rows:",
        (data?.hourlyResults ?? data?.hourlyProfile ?? []).length,
      );
      console.log("─── Summary cost fields (EconomizerController only) ───");
      console.log(
        "electricityCostUSD:",
        data?.summary?.electricityCostUSD ?? "NOT FOUND",
      );
      console.log(
        "carbonTaxCostUSD:",
        data?.summary?.carbonTaxCostUSD ?? "NOT FOUND",
      );
      console.log(
        "annualOpExUSD:",
        data?.summary?.annualOpExUSD ?? "NOT FOUND",
      );
      console.log(
        "totalCapexUSD:",
        data?.summary?.totalCapexUSD ?? "NOT FOUND",
      );
      console.log(
        "annualSavingsUSD:",
        data?.summary?.annualSavingsUSD ?? "NOT FOUND",
      );
      console.log(
        "paybackPeriodYears:",
        data?.summary?.paybackPeriodYears ?? "NOT FOUND",
      );
      console.log(
        "energySavingsPercent:",
        data?.summary?.energySavingsPercent ?? "NOT FOUND",
      );
      console.log(
        "carbonSavings_kg:",
        data?.summary?.carbonSavings_kg ?? "NOT FOUND",
      );
      console.groupEnd();

      // Normalize the raw CoolSim response into a consistent shape
      const enrichedData = transformAirEconomizerResults(
        data,
        airExecutionTimeMs,
      );

      console.log("━━━ 4. NORMALIZED RESULT (frontend model) ━━━");
      console.log(JSON.parse(JSON.stringify(enrichedData)));
      console.log("━━━ 5. SUPABASE PAYLOAD (what gets stored) ━━━");
      console.log({
        simulation_id: simulationId,
        technique: "AIR ECONOMIZER",
        result_data_keys: Object.keys(enrichedData),
      });
      console.groupEnd();

      await saveResults(simulationId, enrichedData, "AIR ECONOMIZER", payload);
      set({ currentResult: enrichedData, isSimulationRunning: false });
      return enrichedData;
    } catch (error: any) {
      console.error("💨 [AIR ECONOMIZER] Error:", error);
      await updateSimulationStatus(simulationId, "failed", error?.message);
      set({
        isSimulationRunning: false,
        simulationProgress: 0,
        simulationStatus: "Failed",
        simulationFailureReason: error?.message || "Unknown air economizer error",
      });
      throw error;
    }
  },
}));

// Helper function to transform chilled water cooling results
const transformChilledWaterResults = (chilledWaterData: any): any => {
  const results = chilledWaterData.results || {};
  const annual = results.annual || {};
  const metrics = results.metrics || {};
  const economics = results.economics || {};
  const hourlyResults = results.hourlyResults || [];

  // Extract hourly arrays for charts (keep full arrays — stripped before Supabase save)
  const hourlyCOP = hourlyResults.map((h: any) => h.cop ?? 0);
  const hourlyChiller = hourlyResults.map((h: any) => h.chillerPower_kW ?? 0);
  const hourlyIT = hourlyResults.map((h: any) => h.itLoad_kW ?? 0);
  const hourlyWater = hourlyResults.map((h: any) => h.waterUsage_L ?? 0);
  const hourlyCarbon = hourlyResults.map((h: any) => h.carbonEmissions_kg ?? 0);
  const hourlyAmb = hourlyResults.map((h: any) => h.ambientTemp_C ?? 25);
  const hourlyCost = hourlyResults.map((h: any) => h.cost_USD ?? 0);

  return {
    // ── Identity ──────────────────────────────────────────────────────────
    id: chilledWaterData.simulationId || `chilled_${Date.now()}`,
    simulationId: chilledWaterData.simulationId || `chilled_${Date.now()}`,
    timestamp: new Date().toISOString(),
    coolingTechnique: "chilled_water",

    // ── Direct CoolSim API fields (preserved exactly as returned) ─────────
    // results.annual.*
    totalEnergyConsumption: annual.energyConsumption_kWh || 0,
    totalEnergy_kWh: annual.energyConsumption_kWh || 0,
    coolingLoad_kWh: annual.coolingLoad_kWh || 0,
    waterUsage_L: annual.waterUsage_L || 0,
    estimatedCost: annual.cost_USD || 0,
    carbonFootprint: annual.carbonEmissions_kg || 0,
    totalCarbonEmissions_kg: annual.carbonEmissions_kg || 0,
    annual_emissions_kg: annual.carbonEmissions_kg || 0,
    annual_water_liters: annual.waterUsage_L || 0,

    // results.metrics.*
    pue: metrics.pue || 1.5,
    wue: metrics.wue || 0,
    averagePUE: metrics.pue || 1.5,
    averageCUE: metrics.cue || 0,
    averageCOP: metrics.averageCOP || 0,
    peakCoolingLoad_kW: metrics.peakCoolingLoad_kW || 0,

    // results.economics.*
    capex_USD: economics.capex_USD || 0,
    opex_annual_USD: economics.opex_annual_USD || 0,
    lccp_USD: economics.lccp_USD || 0,
    npv_USD: economics.npv_USD || 0,
    paybackPeriod_years: economics.paybackPeriod_years || 0,
    // annualSavings = opex * 0.1 (backend formula: ChilledWaterSimulationService.java)
    annualSavingsUSD: (economics.opex_annual_USD || 0) * 0.1,

    // results.phase4Gates.*
    phase4Gates: results.phase4Gates || {},

    // ── Hourly arrays for charts ──────────────────────────────────────────
    copOverTime: hourlyCOP,
    hourlyEnergyUse: hourlyChiller,
    temperatureTrends: hourlyAmb,
    hourlyITLoad: hourlyIT,
    hourlyWaterUse: hourlyWater,
    hourlyCarbon: hourlyCarbon,
    hourlyCost: hourlyCost,

    // ── Cost breakdown for charts ─────────────────────────────────────────
    cost_breakdown: [
      { label: "Annual OpEx", value: economics.opex_annual_USD || 0 },
      { label: "CAPEX", value: economics.capex_USD || 0 },
      { label: "LCCP", value: economics.lccp_USD || 0 },
      { label: "NPV", value: Math.abs(economics.npv_USD || 0) },
    ],
    all_metrics: [
      { label: "PUE", value: metrics.pue || 1.5 },
      { label: "WUE", value: metrics.wue || 0 },
      { label: "COP", value: metrics.averageCOP || 0 },
      { label: "Energy", value: annual.energyConsumption_kWh || 0 },
      { label: "Carbon", value: annual.carbonEmissions_kg || 0 },
      { label: "Water", value: annual.waterUsage_L || 0 },
    ],
    water_usage: [{ label: "Total Water", value: annual.waterUsage_L || 0 }],
    carbon_sources: [
      { label: "Total Emissions", value: annual.carbonEmissions_kg || 0 },
    ],
    savings_trend: [],
    scenario_projections: [],

    // ── Nested aliases for SimulationDetailedView / extractMetrics ─────────
    energy: {
      electricity_kwh_total: annual.energyConsumption_kWh || 0,
      cooling_load_kwh: annual.coolingLoad_kWh || 0,
      it_kwh:
        (annual.energyConsumption_kWh || 0) - (annual.coolingLoad_kWh || 0),
    },
    water: { consumption_liters_total: annual.waterUsage_L || 0 },
    cost: {
      total_energy_cost_usd: annual.cost_USD || 0,
      capex_usd: economics.capex_USD || 0,
      opex_annual_usd: economics.opex_annual_USD || 0,
      lccp_usd: economics.lccp_USD || 0,
      npv_usd: economics.npv_USD || 0,
    },
    emissions: { total_kg_co2: annual.carbonEmissions_kg || 0 },
    performance: {
      pue_average: metrics.pue || 1.5,
      wue_average: metrics.wue || 0,
      average_cop: metrics.averageCOP || 0,
      peak_cooling_load_kw: metrics.peakCoolingLoad_kW || 0,
    },
    economics: {
      capex_USD: economics.capex_USD || 0,
      opex_annual_USD: economics.opex_annual_USD || 0,
      lccp_USD: economics.lccp_USD || 0,
      npv_USD: economics.npv_USD || 0,
      paybackPeriod_years: economics.paybackPeriod_years || 0,
      annualSavingsUSD: (economics.opex_annual_USD || 0) * 0.1,
    },
    summary: {
      totalEnergy_kWh: annual.energyConsumption_kWh || 0,
      averagePUE: metrics.pue || 1.5,
      estimatedOpExUSD: annual.cost_USD || 0,
      totalCarbon_kgCO2: annual.carbonEmissions_kg || 0,
      waterUsage_L: annual.waterUsage_L || 0,
    },

    // ── Full results object (for SimulationDetailedView) ──────────────────
    results: results,

    // ── Raw API response preserved ────────────────────────────────────────
    rawChilledWaterData: chilledWaterData,
  };
};

// ─── Air Economizer result normalizer ────────────────────────────────────────
// Handles BOTH CoolSim controller responses:
// SimulationController (/api/simulation/run port 8080) — what frontend calls:
//   summary: totalEnergyKWh, totalItEnergyKWh, totalCoolingEnergyKWh (camelCase)
//            averagePUE, averageCUE, estimatedOpExUSD, totalCarbonKg
//   hourlyProfile[]: itLoadKW, fanPowerKW, mechPowerKW, totalPowerKW, tempC, rh, mode, pue, cue
//   tcoForecast[]: year, gridCost, carbonCost, totalTCO, energyKWh, carbonTaxRate
//   aiConfig: computeIntensityFactor, forecastYears, upliftMessage
//   NOTE: electricityCostUSD, annualSavingsUSD, paybackPeriodYears, energySavingsPercent,
//         carbonSavings_kg, totalCapexUSD are NOT in this response — set to 0 unless present
const transformAirEconomizerResults = (
  data: any,
  executionTimeMs: number,
): any => {
  const s = data?.summary ?? {};
  const totalEnergy = s.totalEnergy_kWh ?? s.totalEnergyKWh ?? 0;
  const totalItEnergy = s.totalItEnergy_kWh ?? s.totalItEnergyKWh ?? 0;
  const totalCooling = s.totalCoolingEnergy_kWh ?? s.totalCoolingEnergyKWh ?? 0;
  const totalCarbon = s.totalCarbonEmissions_kg ?? s.totalCarbonKg ?? 0;
  const avgPUE = s.averagePUE ?? 0;
  const avgCUE = s.averageCUE ?? 0;
  const elecCostUSD = s.electricityCostUSD ?? s.estimatedOpExUSD ?? 0;
  const carbonTaxUSD = s.carbonTaxCostUSD ?? 0;
  const opExUSD = s.annualOpExUSD ?? s.estimatedOpExUSD ?? 0;
  const capexUSD = s.totalCapexUSD ?? 0;
  const annualSavings = s.annualSavingsUSD ?? 0;
  
  // Calculate payback period on frontend: CAPEX / Annual Savings
  let payback = 999; // Default to 999 if no savings
  if (annualSavings > 0 && capexUSD > 0) {
    payback = capexUSD / annualSavings;
  } else if (capexUSD === 0) {
    payback = 0; // No upfront cost
  }
  
  const energySavPct = s.energySavingsPercent ?? 0;
  const carbonSavings = s.carbonSavings_kg ?? 0;
  const waterLiters = s.waterUsage_liters ?? 0;

  const rawHourly: any[] = data?.hourlyResults ?? data?.hourlyProfile ?? [];
  const normaliseHourly = (h: any) => ({
    hour: h.hour ?? h.timestampHour ?? 0,
    timestamp: h.timestamp ?? h.timestampHour ?? h.hour ?? 0,
    outdoorTempC: h.outdoorTempC ?? h.tempC ?? 0,
    outdoorRH: h.outdoorRH ?? h.rh ?? 0,
    itLoad_kW: h.itLoad_kW ?? h.itLoadKW ?? 0,
    coolingLoad_kW: h.coolingLoad_kW ?? h.coolingLoadKW ?? 0,
    fanPower_kW: h.fanPower_kW ?? h.fanPowerKW ?? 0,
    mechPower_kW: h.mechPower_kW ?? h.mechPowerKW ?? 0,
    totalPower_kW: h.totalPower_kW ?? h.totalPowerKW ?? 0,
    requiredAirflow_CFM: h.requiredAirflow_CFM ?? null,
    airflowViolation: h.airflowViolation ?? false,
    mode: h.mode ?? "UNKNOWN",
    pue: h.pue ?? 0,
    cue: h.cue ?? 0,
    q_free_kW: h.q_free_kW ?? null,
    mech_load_kW: h.mech_load_kW ?? null,
    violationMsg: h.violationMsg ?? null,
    electricityPrice: h.electricityPrice ?? null,
    waterPrice: h.waterPrice ?? null,
    carbonFactor: h.carbonFactor ?? null,
  });
  const normalisedHourly = rawHourly.map(normaliseHourly);

  const proj = data?.projection ?? {};
  const rawYearly: any[] = proj?.yearlyData ?? data?.tcoForecast ?? [];
  const normaliseYearly = (y: any) => ({
    year: y.year,
    energyKWh: y.energyKWh ?? 0,
    energyCostUSD: y.energyCostUSD ?? y.gridCost ?? 0,
    carbonTaxUSD: y.carbonTaxUSD ?? y.carbonCost ?? 0,
    totalCostUSD: y.totalCostUSD ?? y.totalTCO ?? 0,
    costSavingsUSD: y.costSavingsUSD ?? 0,
    cumulativeSavings: y.cumulativeSavings ?? 0,
    cumulativeCost: y.cumulativeCost ?? 0,
    carbonTaxRate: y.carbonTaxRate ?? null,
    energySavingsKWh: y.energySavingsKWh ?? 0,
    emissionsTonsCO2: y.emissionsTonsCO2 ?? 0,
    emissionsSavingsTonsCO2: y.emissionsSavingsTonsCO2 ?? 0,
    temperatureOffsetC: y.temperatureOffsetC ?? 0,
    coolingLoadIncrease: y.coolingLoadIncrease ?? 0,
  });
  const normalisedYearly = rawYearly.map(normaliseYearly);

  const violations = normalisedHourly.filter(
    (h) => h.airflowViolation === true,
  );
  const violationHours = violations.length;
  const violationMessages = violations
    .filter((h) => h.violationMsg)
    .map((h) => h.violationMsg as string)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 3);
  const modeCount: Record<string, number> = {};
  normalisedHourly.forEach((h) => {
    modeCount[h.mode] = (modeCount[h.mode] ?? 0) + 1;
  });

  return {
    coolingTechnique: "air_economizer",
    _simulationDurationMs: executionTimeMs,
    runtimeMinutes: Math.round((executionTimeMs / 60000) * 100) / 100,
    summary: {
      totalItEnergy_kWh: totalItEnergy,
      totalCoolingEnergy_kWh: totalCooling,
      totalEnergy_kWh: totalEnergy,
      averagePUE: avgPUE,
      averageCUE: avgCUE,
      estimatedOpExUSD: elecCostUSD,
      electricityCostUSD: elecCostUSD,
      carbonTaxCostUSD: carbonTaxUSD,
      annualOpExUSD: opExUSD,
      totalCapexUSD: capexUSD,
      annualSavingsUSD: annualSavings,
      paybackPeriodYears: payback,
      energySavingsPercent: energySavPct,
      carbonSavings_kg: carbonSavings,
      totalCarbonEmissions_kg: totalCarbon,
      waterUsage_liters: waterLiters,
    },
    hourlyResults: normalisedHourly,
    projection: {
      forecastYears: proj.forecastYears ?? normalisedYearly.length,
      totalEnergy: proj.totalEnergy ?? 0,
      totalEmissions: proj.totalEmissions ?? 0,
      totalCost:
        proj.totalCost ??
        normalisedYearly.reduce((a, y) => a + y.totalCostUSD, 0),
      totalCarbonTax: proj.totalCarbonTax ?? 0,
      totalSavings: proj.totalSavings ?? 0,
      npvSavings: proj.npvSavings ?? 0,
      adjustedPaybackYears: proj.adjustedPaybackYears ?? payback,
      yearlyData: normalisedYearly,
    },
    cloudSimEnabled: data?.cloudSimEnabled ?? false,
    workloadMode: data?.workloadMode ?? data?.aiConfig?.upliftMessage ?? null,
    averageUtilization: data?.averageUtilization ?? null,
    rackAnalysis: data?.rackAnalysis ?? null,
    climateScenarios: data?.climateScenarios ?? null,
    aiConfig: data?.aiConfig ?? null,
    airflowViolations: {
      totalViolationHours: violationHours,
      percentageHours:
        normalisedHourly.length > 0
          ? ((violationHours / normalisedHourly.length) * 100).toFixed(1)
          : "0",
      uniqueMessages: violationMessages,
      modeBreakdown: modeCount,
    },
    results: {
      metrics: { pue: avgPUE, cue: avgCUE, averageCOP: null, wue: null },
      annual: {
        energyConsumption_kWh: totalEnergy,
        coolingLoad_kWh: totalCooling,
        waterUsage_L: waterLiters,
        cost_USD: opExUSD,
        carbonEmissions_kg: totalCarbon,
      },
      economics: {
        capex_USD: capexUSD,
        opex_annual_USD: opExUSD,
        npv_USD: proj.npvSavings ?? null,
        paybackPeriod_years: payback,
        annualSavings_USD: annualSavings,
      },
      hourlyResults: normalisedHourly,
      projection: { yearlyData: normalisedYearly },
    },
    rawAirEconomizerData: data,
  };
};
// that all frontend components (SimulationDetailedView, charts, reports) can read.
//
// CoolSim response fields (EconomizerController /api/simulate):
//   summary.totalItEnergy_kWh        → total IT energy
//   summary.totalCoolingEnergy_kWh   → total cooling energy
//   summary.totalEnergy_kWh          → total energy (IT + cooling)
//   summary.averagePUE               → Power Usage Effectiveness
//   summary.averageCUE               → Carbon Usage Effectiveness
//   summary.estimatedOpExUSD         → electricity cost only
//   summary.electricityCostUSD       → electricity cost
//   summary.carbonTaxCostUSD         → carbon tax cost
//   summary.annualOpExUSD            → total annual OpEx (elec + carbon tax)
//   summary.totalCapexUSD            → capital expenditure
//   summary.annualSavingsUSD         → annual savings vs baseline
//   summary.paybackPeriodYears       → simple payback period
//   summary.energySavingsPercent     → % energy saved vs mechanical baseline
//   summary.carbonSavings_kg         → kg CO2 saved vs baseline
//   summary.totalCarbonEmissions_kg  → total CO2 emitted
//   summary.waterUsage_liters        → water usage (0 for air-side)
//   hourlyResults[i].timestampHour   → hour index
//   hourlyResults[i].outdoorTempC    → ambient dry-bulb temperature
//   hourlyResults[i].outdoorRH       → outdoor relative humidity
//   hourlyResults[i].itLoad_kW       → IT load at that hour
//   hourlyResults[i].requiredAirflow_CFM → airflow needed
//   hourlyResults[i].airflowViolation → true if airflow exceeds limit
//   hourlyResults[i].mode            → FULL_ECON / PARTIAL_TRIM / MECH_ONLY
//   hourlyResults[i].coolingLoad_kW  → total cooling load
//   hourlyResults[i].q_free_kW       → free cooling from economizer
//   hourlyResults[i].mech_load_kW    → mechanical cooling needed
//   hourlyResults[i].fanPower_kW     → fan power
//   hourlyResults[i].mechPower_kW    → mechanical cooling power
//   hourlyResults[i].totalPower_kW   → total power (IT + fan + mech)
//   hourlyResults[i].pue             → hourly PUE
//   hourlyResults[i].cue             → hourly CUE
//   hourlyResults[i].violationMsg    → airflow violation message
//   projection.yearlyData[i].year
//   projection.yearlyData[i].energyKWh
//   projection.yearlyData[i].energyCostUSD
//   projection.yearlyData[i].carbonTaxUSD
//   projection.yearlyData[i].totalCostUSD
//   projection.yearlyData[i].costSavingsUSD
//   projection.yearlyData[i].cumulativeSavings