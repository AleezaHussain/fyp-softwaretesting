/**
 * WeatherLocationPicker.tsx
 * Country → City dropdowns backed by the NREL EnergyPlus weather library.
 * Shows a detailed multi-step progress UI while the EPW is downloading,
 * being parsed, and uploaded into the simulation payload.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Globe,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Thermometer,
  Droplets,
  MapPin,
  Wind,
  Download,
  FileText,
  Upload,
  Clock,
} from "lucide-react";
import {
  weatherService,
  WeatherCountry,
  WeatherCity,
  HourlyWeather,
  ChilledWaterWeatherResult,
  EvaporativeWeatherResult,
} from "../../services/weatherService";

type WeatherMode = "air-side" | "chilled-water" | "evaporative";

interface Props {
  onWeatherLoaded: (result: any) => void;
  isDark?: boolean;
  mode?: WeatherMode;
}

type Status = "idle" | "loading" | "success" | "error";

// ── step definitions ──────────────────────────────────────────────────────────
type StepState = "waiting" | "active" | "done" | "error";

interface Step {
  id: string;
  icon: React.ElementType;
  label: string;
  detail: string;
  state: StepState;
}

const INITIAL_STEPS: Step[] = [
  {
    id: "download",
    icon: Download,
    label: "Downloading EPW file",
    detail: "Fetching from EnergyPlus S3 bucket",
    state: "waiting",
  },
  {
    id: "parse",
    icon: FileText,
    label: "Parsing weather columns",
    detail: "Extracting dry_bulb, humidity, pressure…",
    state: "waiting",
  },
  {
    id: "upload",
    icon: Upload,
    label: "Loading into simulation",
    detail: "Preparing 8,760 hourly records",
    state: "waiting",
  },
];

// ── small reusable select ─────────────────────────────────────────────────────
const Select: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
  isDark?: boolean;
}> = ({ label, value, onChange, options, disabled, placeholder, isDark }) => (
  <div className="flex flex-col gap-1.5">
    <label
      className={`text-xs font-semibold uppercase tracking-wide ${
        isDark ? "text-gray-400" : "text-gray-500"
      }`}
    >
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full appearance-none rounded-xl border px-3 py-2.5 pr-9 text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed
          ${
            isDark
              ? "bg-gray-800 border-gray-600 text-white"
              : "bg-white border-gray-300 text-gray-900"
          }`}
      >
        <option value="">{placeholder ?? `Select ${label}`}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4
          ${isDark ? "text-gray-400" : "text-gray-500"}`}
      />
    </div>
  </div>
);

// ── stat card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
  isDark?: boolean;
}> = ({ icon: Icon, label, value, iconColor, isDark }) => (
  <div
    className={`p-3 rounded-xl border ${
      isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
    }`}
  >
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </span>
    </div>
    <p className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
      {value}
    </p>
  </div>
);

// ── step row ──────────────────────────────────────────────────────────────────
const StepRow: React.FC<{ step: Step; isDark?: boolean }> = ({ step, isDark }) => {
  const Icon = step.icon;
  const isActive = step.state === "active";
  const isDone   = step.state === "done";
  const isError  = step.state === "error";
  const isWaiting = step.state === "waiting";

  const iconBg = isDone
    ? "bg-green-100"
    : isActive
    ? "bg-blue-100"
    : isError
    ? "bg-red-100"
    : isDark
    ? "bg-gray-700"
    : "bg-gray-100";

  const iconColor = isDone
    ? "text-green-600"
    : isActive
    ? "text-blue-600"
    : isError
    ? "text-red-500"
    : isDark
    ? "text-gray-500"
    : "text-gray-400";

  const labelColor = isDone
    ? isDark ? "text-green-400" : "text-green-700"
    : isActive
    ? isDark ? "text-blue-300" : "text-blue-700"
    : isError
    ? "text-red-600"
    : isDark
    ? "text-gray-500"
    : "text-gray-400";

  return (
    <div className={`flex items-center gap-3 transition-opacity duration-300 ${isWaiting ? "opacity-40" : "opacity-100"}`}>
      {/* icon circle */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        {isActive ? (
          <Loader2 className={`w-4 h-4 animate-spin ${iconColor}`} />
        ) : isDone ? (
          <CheckCircle2 className={`w-4 h-4 ${iconColor}`} />
        ) : isError ? (
          <AlertCircle className={`w-4 h-4 ${iconColor}`} />
        ) : (
          <Icon className={`w-4 h-4 ${iconColor}`} />
        )}
      </div>

      {/* text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${labelColor}`}>{step.label}</p>
        <p className={`text-xs truncate ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          {step.detail}
        </p>
      </div>

      {/* right badge */}
      {isDone && (
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
          Done
        </span>
      )}
      {isActive && (
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
          In progress
        </span>
      )}
    </div>
  );
};

// ── progress bar ──────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ pct: number; isDark?: boolean }> = ({ pct, isDark }) => (
  <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
    <div
      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out"
      style={{ width: `${pct}%` }}
    />
  </div>
);

// ── main component ────────────────────────────────────────────────────────────
const WeatherLocationPicker: React.FC<Props> = ({ onWeatherLoaded, isDark = false, mode = "air-side" }) => {
  const [countries, setCountries]       = useState<WeatherCountry[]>([]);
  const [cities, setCities]             = useState<WeatherCity[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCityId, setSelectedCityId]   = useState("");

  const [countryStatus, setCountryStatus] = useState<Status>("idle");
  const [cityStatus, setCityStatus]       = useState<Status>("idle");
  const [fetchStatus, setFetchStatus]     = useState<Status>("idle");

  const [steps, setSteps]         = useState<Step[]>(INITIAL_STEPS);
  const [progress, setProgress]   = useState(0);
  const [elapsed, setElapsed]     = useState(0);
  const [loadedData, setLoadedData] = useState<any[] | null>(null);
  const [loadedCity, setLoadedCity] = useState("");
  const [loadedEpwUrl, setLoadedEpwUrl] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  // Fetch a URL and save it as a local file download
  const downloadFile = async (apiPath: string, filename: string) => {
    setDownloading(filename);
    try {
      const res = await fetch(`http://localhost:8085${apiPath}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Download failed: ${e.message}`);
    } finally {
      setDownloading(null);
    }
  };
  const [errorMsg, setErrorMsg]   = useState("");

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // ── helpers ────────────────────────────────────────────────────────────
  const setStep = (id: string, state: StepState, detail?: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, state, ...(detail ? { detail } : {}) } : s
      )
    );
  };

  const resetSteps = () => {
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, state: "waiting" })));
    setProgress(0);
    setElapsed(0);
  };

  const startElapsedTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const stopElapsedTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Fake progress that crawls to 90% while waiting for the real response
  const startFakeProgress = () => {
    let pct = 0;
    progressRef.current = setInterval(() => {
      pct += pct < 30 ? 3 : pct < 60 ? 1.5 : pct < 85 ? 0.5 : 0.1;
      if (pct >= 90) {
        clearInterval(progressRef.current!);
        pct = 90;
      }
      setProgress(Math.min(pct, 90));
    }, 300);
  };

  const stopFakeProgress = () => {
    if (progressRef.current) clearInterval(progressRef.current);
  };

  // ── load countries on mount ────────────────────────────────────────────
  const loadCountries = useCallback(async () => {
    setCountryStatus("loading");
    setErrorMsg("");
    try {
      const data = await weatherService.getCountries();
      setCountries(data);
      setCountryStatus("success");
    } catch (e: any) {
      setCountryStatus("error");
      setErrorMsg(`Could not load countries: ${e.message}`);
    }
  }, []);

  useEffect(() => { loadCountries(); }, [loadCountries]);

  // ── load cities when country changes ──────────────────────────────────
  useEffect(() => {
    if (!selectedCountry) { setCities([]); setSelectedCityId(""); return; }
    setCityStatus("loading");
    setSelectedCityId("");
    setLoadedData(null);
    setFetchStatus("idle");
    resetSteps();
    weatherService.getCities(selectedCountry)
      .then((data) => { setCities(data); setCityStatus("success"); })
      .catch((e) => { setCityStatus("error"); setErrorMsg(`Could not load cities: ${e.message}`); });
  }, [selectedCountry]);

  // ── fetch EPW when city is selected ───────────────────────────────────
  useEffect(() => {
    if (!selectedCityId) return;
    const city = cities.find((c) => c.id === selectedCityId);
    if (!city) return;

    setFetchStatus("loading");
    setLoadedData(null);
    setErrorMsg("");
    resetSteps();
    startElapsedTimer();

    // Step 1 — downloading
    setStep("download", "active", `Fetching ${city.name}.epw from S3…`);
    startFakeProgress();

    // Pick the right endpoint based on mode
    const fetchFn =
      mode === "chilled-water"
        ? weatherService.getWeatherChilledWater(city.epw_url)
        : mode === "evaporative"
        ? weatherService.getWeatherEvaporative(city.epw_url)
        : weatherService.getWeather(city.epw_url);

    const parseDetail =
      mode === "chilled-water"
        ? "Extracting dry_bulb_c, wet_bulb_c, relative_humidity, pressure…"
        : mode === "evaporative"
        ? "Extracting dry_bulb_c, relative_humidity, pressure_pa, wind_speed…"
        : "Extracting dry_bulb, humidity, dew_point, pressure…";

    fetchFn
      .then((result) => {
        stopFakeProgress();
        setStep("download", "done", `Downloaded ${(result.hours * 0.15).toFixed(0)} KB`);
        setProgress(40);
        setStep("parse", "active", parseDetail);
        return new Promise<typeof result>((resolve) =>
          setTimeout(() => resolve(result), 600)
        );
      })
      .then((result) => {
        setStep("parse", "done", parseDetail.replace("Extracting", "Extracted"));
        setProgress(75);
        setStep("upload", "active", `Loading ${result.hours.toLocaleString()} records into simulation…`);
        return new Promise<typeof result>((resolve) =>
          setTimeout(() => resolve(result), 400)
        );
      })
      .then((result) => {
        setStep("upload", "done", `${result.hours.toLocaleString()} hourly records ready`);
        setProgress(100);
        stopElapsedTimer();
        setLoadedData(result.data as any);
        setLoadedCity(city.name);
        setLoadedEpwUrl(city.epw_url);
        setFetchStatus("success");
        onWeatherLoaded(result);
      })
      .catch((e) => {
        stopFakeProgress();
        stopElapsedTimer();
        // Mark whichever step was active as error
        setSteps((prev) =>
          prev.map((s) => (s.state === "active" ? { ...s, state: "error" } : s))
        );
        setFetchStatus("error");
        setErrorMsg(`Could not fetch weather data: ${e.message}`);
      });

    return () => { stopFakeProgress(); stopElapsedTimer(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCityId]);

  // ── derived stats ──────────────────────────────────────────────────────
  // Normalise field names: each mode uses different keys
  //   air-side:      temperature, humidity
  //   chilled-water: dry_bulb_c, relative_humidity
  //   evaporative:   dry_bulb_c, relative_humidity
  const stats = loadedData
    ? (() => {
        const temps = (loadedData as any[]).map(
          (d) => d.temperature ?? d.dry_bulb_c ?? d.dry_bulb ?? 0
        );
        const hums = (loadedData as any[]).map(
          (d) => d.humidity ?? d.relative_humidity ?? 0
        );
        const avg = (arr: number[]) =>
          arr.reduce((a, b) => a + b, 0) / arr.length;
        const econHours = temps.filter(
          (t, i) => t <= 24 && hums[i] <= 60
        ).length;
        return {
          avgTemp:  avg(temps).toFixed(1),
          minTemp:  Math.min(...temps).toFixed(1),
          maxTemp:  Math.max(...temps).toFixed(1),
          avgHum:   avg(hums).toFixed(1),
          econHours,
          econPct:  ((econHours / loadedData.length) * 100).toFixed(0),
          hours:    loadedData.length,
        };
      })()
    : null;

  const selectedCityObj = cities.find((c) => c.id === selectedCityId);
  const isFetching = fetchStatus === "loading";
  const card  = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const muted = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`rounded-2xl p-6 border shadow-sm space-y-5 ${card}`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
              Location Weather Data
            </h4>
            <p className={`text-sm ${muted}`}>
              {mode === "chilled-water"
                ? "Fetches dry_bulb_c, wet_bulb_c, relative_humidity, pressure"
                : mode === "evaporative"
                ? "Fetches dry_bulb_c, relative_humidity, pressure_pa, wind_speed"
                : "Fetches dry_bulb, humidity, dew_point, pressure"}{" "}
              — 3,034 locations from energyplus.net
            </p>
          </div>
        </div>

        {(countryStatus === "error" || fetchStatus === "error") && (
          <button
            onClick={loadCountries}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        )}
      </div>

      {/* ── Dropdowns ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative">
          <Select
            label="Country"
            value={selectedCountry}
            onChange={setSelectedCountry}
            options={countries.map((c) => ({ value: c.code, label: `${c.name} (${c.city_count})` }))}
            disabled={countryStatus === "loading" || isFetching}
            placeholder="Select country…"
            isDark={isDark}
          />
          {countryStatus === "loading" && (
            <Loader2 className="absolute right-9 top-9 w-4 h-4 animate-spin text-blue-500" />
          )}
        </div>

        <div className="relative">
          <Select
            label="City / Weather Station"
            value={selectedCityId}
            onChange={setSelectedCityId}
            options={cities.map((c) => ({
              value: c.id,
              label: `${c.name}${c.dataset ? ` [${c.dataset}]` : ""}`,
            }))}
            disabled={!selectedCountry || cityStatus === "loading" || isFetching}
            placeholder={
              !selectedCountry ? "Select country first"
              : cityStatus === "loading" ? "Loading cities…"
              : "Select city…"
            }
            isDark={isDark}
          />
          {cityStatus === "loading" && (
            <Loader2 className="absolute right-9 top-9 w-4 h-4 animate-spin text-blue-500" />
          )}
        </div>
      </div>

      {/* ── Coordinates badge ── */}
      {selectedCityObj?.lat != null && !isFetching && fetchStatus !== "success" && (
        <div className={`flex items-center gap-2 text-xs ${muted}`}>
          <MapPin className="w-3.5 h-3.5" />
          <span>
            {selectedCityObj.lat.toFixed(2)}°, {selectedCityObj.lon?.toFixed(2)}° — {selectedCityObj.dataset}
          </span>
        </div>
      )}

      {/* ── Loading progress panel ── */}
      {isFetching && (
        <div className={`rounded-2xl border p-5 space-y-4 ${
          isDark ? "bg-gray-900 border-gray-700" : "bg-blue-50 border-blue-200"
        }`}>
          {/* title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className={`text-sm font-semibold ${isDark ? "text-blue-300" : "text-blue-800"}`}>
                Loading weather data for {selectedCityObj?.name}…
              </span>
            </div>
            <div className={`flex items-center gap-1 text-xs ${muted}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{elapsed}s</span>
            </div>
          </div>

          {/* progress bar */}
          <ProgressBar pct={progress} isDark={isDark} />
          <p className={`text-xs text-right ${muted}`}>{Math.round(progress)}%</p>

          {/* step list */}
          <div className="space-y-3 pt-1">
            {steps.map((step, i) => (
              <React.Fragment key={step.id}>
                <StepRow step={step} isDark={isDark} />
                {i < steps.length - 1 && (
                  <div className={`ml-4 w-px h-3 ${isDark ? "bg-gray-700" : "bg-gray-300"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* hint */}
          <p className={`text-xs text-center pt-1 ${muted}`}>
            EPW files are ~1 MB — this usually takes 5–15 seconds
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {fetchStatus === "error" && errorMsg && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Weather fetch failed</p>
            <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
            <p className="text-xs text-red-500 mt-1">
              Make sure the Weather API is running:{" "}
              <code className="font-mono bg-red-100 px-1 rounded">
                uvicorn weather_api:app --port 8085
              </code>
            </p>
          </div>
        </div>
      )}

      {/* ── Country/city load error ── */}
      {errorMsg && fetchStatus !== "error" && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">{errorMsg}</p>
        </div>
      )}

      {/* ── Success stats ── */}
      {fetchStatus === "success" && stats && (
        <div className="space-y-3">
          {/* success banner */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            isDark ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200"
          }`}>
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isDark ? "text-green-300" : "text-green-800"}`}>
                {loadedCity}
              </p>
              <p className={`text-xs ${isDark ? "text-green-500" : "text-green-600"}`}>
                {stats.hours.toLocaleString()} hourly records loaded · ready for simulation
              </p>
            </div>
            {selectedCityObj?.lat != null && (
              <div className={`text-xs text-right shrink-0 ${muted}`}>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {selectedCityObj.lat.toFixed(2)}°, {selectedCityObj.lon?.toFixed(2)}°
                </div>
                <div>{selectedCityObj.dataset}</div>
              </div>
            )}
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Thermometer} label="Avg Temp"    value={`${stats.avgTemp}°C`}                          iconColor="text-orange-500" isDark={isDark} />
            <StatCard icon={Thermometer} label="Temp Range"  value={`${stats.minTemp}–${stats.maxTemp}°C`}         iconColor="text-orange-400" isDark={isDark} />
            <StatCard icon={Droplets}    label="Avg Humidity" value={`${stats.avgHum}%`}                           iconColor="text-blue-500"   isDark={isDark} />
            <StatCard icon={Wind}        label="Free-Cool Hrs" value={`${stats.econHours.toLocaleString()} (${stats.econPct}%)`} iconColor="text-green-500" isDark={isDark} />
          </div>

          {/* ── Debug CSV downloads ── */}
          {loadedEpwUrl && (
            <div className={`pt-2 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <p className={`text-xs font-semibold mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                🧪 Debug downloads:
              </p>
              <div className="flex flex-wrap gap-2">
                {/* Full EPW → CSV (all 35 columns) */}
                <button
                  onClick={() => {
                    const city = loadedEpwUrl.rsplit?.("/")?.pop()?.replace(".epw","") ?? loadedCity;
                    downloadFile(
                      `/debug/epw-full-csv?epw_url=${encodeURIComponent(loadedEpwUrl)}`,
                      `${loadedCity}_full_epw.csv`
                    );
                  }}
                  disabled={downloading !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {downloading === `${loadedCity}_full_epw.csv` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : "⬇"}
                  Full EPW CSV (35 cols)
                </button>

                {/* Technique-filtered CSV (final columns only) */}
                <button
                  onClick={() => {
                    const endpoint =
                      mode === "chilled-water" ? "chilled-water" :
                      mode === "evaporative"   ? "evaporative"   : "air-side";
                    const label =
                      mode === "chilled-water" ? "chilled_water" :
                      mode === "evaporative"   ? "evaporative"   : "air_side";
                    downloadFile(
                      `/debug/${endpoint}-csv?epw_url=${encodeURIComponent(loadedEpwUrl)}`,
                      `${loadedCity}_${label}.csv`
                    );
                  }}
                  disabled={downloading !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {downloading?.includes("air_side") || downloading?.includes("chilled") || downloading?.includes("evap") ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : "⬇"}
                  {mode === "chilled-water" ? "Chilled Water" :
                   mode === "evaporative"   ? "Evaporative"  : "Air-Side"} CSV (final cols)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherLocationPicker;
