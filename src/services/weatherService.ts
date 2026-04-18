/**
 * weatherService.ts
 * Talks to weather_api.py (port 8085).
 * Data source: NREL master.geojson → EnergyPlus S3 EPW files.
 * No scraping – all 3,034 locations come from the official NREL index.
 */

const WEATHER_API = "http://localhost:8085";

export interface WeatherCountry {
  code: string;
  name: string;
  city_count: number;
}

export interface WeatherCity {
  id: string;
  name: string;
  epw_url: string;
  lat: number | null;
  lon: number | null;
  dataset: string;
}

export interface HourlyWeather {
  timestamp: string;
  temperature: number;
  humidity: number;
}

export interface WeatherResult {
  city: string;
  hours: number;
  data: HourlyWeather[];
}

// ── Chilled Water ─────────────────────────────────────────────────────────────
export interface ChilledWaterWeatherPoint {
  hour: number;
  dry_bulb_c: number;
  wet_bulb_c: number;
  relative_humidity: number;
  atmospheric_pressure_pa: number;
}

export interface ChilledWaterWeatherResult {
  city: string;
  location: string;
  elevation: number;
  hours: number;
  data: ChilledWaterWeatherPoint[];
}

// ── Evaporative ───────────────────────────────────────────────────────────────
export interface EvaporativeWeatherPoint {
  timestamp: string;
  hour: number;
  dry_bulb_c: number;
  relative_humidity: number;
  pressure_pa: number;
  wind_speed_ms: number;
}

export interface EvaporativeWeatherResult {
  city: string;
  hours: number;
  data: EvaporativeWeatherPoint[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${WEATHER_API}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const weatherService = {
  /** All countries that have EnergyPlus weather data */
  getCountries: () => get<WeatherCountry[]>("/countries"),

  /** All weather stations for a country (by ISO-3 code, e.g. "PAK") */
  getCities: (countryCode: string) =>
    get<WeatherCity[]>(`/cities?country_code=${encodeURIComponent(countryCode)}`),

  /** Air-side economizer: dry_bulb, humidity, dew_point, pressure */
  getWeather: (epwUrl: string) =>
    get<WeatherResult>(`/weather?epw_url=${encodeURIComponent(epwUrl)}`),

  /** Chilled water: hour, dry_bulb_c, wet_bulb_c, relative_humidity, atmospheric_pressure_pa */
  getWeatherChilledWater: (epwUrl: string) =>
    get<ChilledWaterWeatherResult>(
      `/weather/chilled-water?epw_url=${encodeURIComponent(epwUrl)}`
    ),

  /** Evaporative: hour, dry_bulb_c, relative_humidity, pressure_pa, wind_speed_ms */
  getWeatherEvaporative: (epwUrl: string) =>
    get<EvaporativeWeatherResult>(
      `/weather/evaporative?epw_url=${encodeURIComponent(epwUrl)}`
    ),
};
