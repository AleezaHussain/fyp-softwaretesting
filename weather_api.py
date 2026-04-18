"""
weather_api.py  –  EnergyPlus Weather Fetcher API  (v3 – 8760-row guaranteed)
Port: 8085

Data source: NREL master.geojson → EnergyPlus S3 EPW files (3,034 locations).

EPW parsing pipeline (guaranteed 8760 rows):
  1. epw_to_dataframe()   – pandas reads EPW, assigns all 35 official column
                            names, builds timestamp, drops non-data rows.
  2. _enforce_8760()      – trims to exactly 8760 rows or raises a clear error.
  3. extract_*_columns()  – keeps only the columns each technique needs.
  4. _to_*_records()      – converts to the exact JSON shape each backend expects,
                            with NaN → safe defaults and range clamping.
"""

import io
import re
import json
import math
import urllib.request
from functools import lru_cache
from typing import List, Dict, Any

import numpy as np
import pandas as pd
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="EnergyPlus Weather API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

GEOJSON_URL = (
    "https://raw.githubusercontent.com/NREL/EnergyPlus/develop/weather/master.geojson"
)

_COUNTRY_NAMES: Dict[str, str] = {
    "AFG": "Afghanistan", "ALB": "Albania", "DZA": "Algeria",
    "AGO": "Angola", "ARG": "Argentina", "ARM": "Armenia",
    "AUS": "Australia", "AUT": "Austria", "AZE": "Azerbaijan",
    "BHR": "Bahrain", "BGD": "Bangladesh", "BLR": "Belarus",
    "BEL": "Belgium", "BLZ": "Belize", "BEN": "Benin",
    "BOL": "Bolivia", "BIH": "Bosnia and Herzegovina", "BWA": "Botswana",
    "BRA": "Brazil", "BRN": "Brunei", "BGR": "Bulgaria",
    "BFA": "Burkina Faso", "KHM": "Cambodia", "CMR": "Cameroon",
    "CAN": "Canada", "CHL": "Chile", "CHN": "China",
    "COL": "Colombia", "COD": "Congo (DRC)", "CRI": "Costa Rica",
    "HRV": "Croatia", "CUB": "Cuba", "CYP": "Cyprus",
    "CZE": "Czech Republic", "DNK": "Denmark", "DOM": "Dominican Republic",
    "ECU": "Ecuador", "EGY": "Egypt", "SLV": "El Salvador",
    "EST": "Estonia", "ETH": "Ethiopia", "FIN": "Finland",
    "FRA": "France", "GAB": "Gabon", "GEO": "Georgia",
    "DEU": "Germany", "GHA": "Ghana", "GRC": "Greece",
    "GTM": "Guatemala", "GIN": "Guinea", "HND": "Honduras",
    "HUN": "Hungary", "ISL": "Iceland", "IND": "India",
    "IDN": "Indonesia", "IRN": "Iran", "IRQ": "Iraq",
    "IRL": "Ireland", "ISR": "Israel", "ITA": "Italy",
    "JAM": "Jamaica", "JPN": "Japan", "JOR": "Jordan",
    "KAZ": "Kazakhstan", "KEN": "Kenya", "PRK": "North Korea",
    "KOR": "South Korea", "KWT": "Kuwait", "KGZ": "Kyrgyzstan",
    "LAO": "Laos", "LVA": "Latvia", "LBN": "Lebanon",
    "LBY": "Libya", "LTU": "Lithuania", "LUX": "Luxembourg",
    "MKD": "North Macedonia", "MDG": "Madagascar", "MWI": "Malawi",
    "MYS": "Malaysia", "MLI": "Mali", "MLT": "Malta",
    "MRT": "Mauritania", "MEX": "Mexico", "MDA": "Moldova",
    "MNG": "Mongolia", "MAR": "Morocco", "MOZ": "Mozambique",
    "MMR": "Myanmar", "NAM": "Namibia", "NPL": "Nepal",
    "NLD": "Netherlands", "NZL": "New Zealand", "NIC": "Nicaragua",
    "NER": "Niger", "NGA": "Nigeria", "NOR": "Norway",
    "OMN": "Oman", "PAK": "Pakistan", "PAN": "Panama",
    "PRY": "Paraguay", "PER": "Peru", "PHL": "Philippines",
    "POL": "Poland", "PRT": "Portugal", "PRI": "Puerto Rico",
    "QAT": "Qatar", "ROU": "Romania", "RUS": "Russia",
    "RWA": "Rwanda", "SAU": "Saudi Arabia", "SEN": "Senegal",
    "SRB": "Serbia", "SLE": "Sierra Leone", "SGP": "Singapore",
    "SVK": "Slovakia", "SVN": "Slovenia", "SOM": "Somalia",
    "ZAF": "South Africa", "SSD": "South Sudan", "ESP": "Spain",
    "LKA": "Sri Lanka", "SDN": "Sudan", "SWE": "Sweden",
    "CHE": "Switzerland", "SYR": "Syria", "TWN": "Taiwan",
    "TJK": "Tajikistan", "TZA": "Tanzania", "THA": "Thailand",
    "TGO": "Togo", "TTO": "Trinidad and Tobago", "TUN": "Tunisia",
    "TUR": "Turkey", "TKM": "Turkmenistan", "UGA": "Uganda",
    "UKR": "Ukraine", "ARE": "United Arab Emirates",
    "GBR": "United Kingdom", "USA": "United States",
    "URY": "Uruguay", "UZB": "Uzbekistan", "VEN": "Venezuela",
    "VNM": "Vietnam", "YEM": "Yemen", "ZMB": "Zambia", "ZWE": "Zimbabwe",
}

# ─── GeoJSON index ────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_geojson() -> List[Dict[str, Any]]:
    req = urllib.request.Request(
        GEOJSON_URL, headers={"User-Agent": "EnergyPlus-Weather-API/3.0"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["features"]


def _extract_epw_url(html: str) -> str:
    m = re.search(r"href=([^\s>\"']+)", html)
    if not m:
        raise ValueError(f"No href found in: {html!r}")
    return m.group(1)


def _parse_title(title: str):
    parts = title.split("_")
    country_code = parts[0]
    if len(parts) >= 3:
        raw_city = "_".join(parts[1:-1])
    else:
        raw_city = parts[1] if len(parts) > 1 else title
    raw_city = re.sub(r"\.\d{6}$", "", raw_city)
    raw_city = re.sub(r"\.\d{6}_", "_", raw_city)
    return country_code, raw_city.replace(".", " ").strip()


# ─── EPW column spec ──────────────────────────────────────────────────────────

_EPW_COLUMNS = [
    "year", "month", "day", "hour", "minute", "source",
    "dry_bulb", "dew_point", "relative_humidity", "pressure",
    "ext_horiz_rad", "ext_direct_rad", "horiz_ir",
    "global_solar", "direct_solar", "diffuse_solar",
    "global_illum", "direct_illum", "diffuse_illum", "zenith_lum",
    "wind_direction", "wind_speed",
    "total_cloud", "opaque_cloud", "visibility", "ceiling",
    "weather", "precipitable_water", "aerosol", "snow_depth",
    "days_snow", "albedo", "precipitation", "precip_rate",
    "liquid_precip_depth",
]

# ─── Core EPW parser ──────────────────────────────────────────────────────────

def epw_to_dataframe(epw_bytes: bytes) -> pd.DataFrame:
    """
    Parse EPW bytes → clean DataFrame with exactly the data rows.

    Key fixes vs previous version:
    - Drops rows where year/month/day/hour are not numeric (catches blank
      trailing lines and any stray comment rows pandas may pick up).
    - Does NOT subtract 1 from hour here; that is done per-pipeline so
      the raw EPW hour (1-24) is available for validation.
    - Renames total_cloud → cloud_cover.
    """
    for enc in ("utf-8", "cp1252", "latin-1"):
        try:
            df = pd.read_csv(
                io.BytesIO(epw_bytes),
                skiprows=8,
                header=None,
                encoding=enc,
                dtype=str,          # read everything as string first
                on_bad_lines="skip",
            )
            break
        except Exception:
            continue
    else:
        raise ValueError("Could not decode EPW file with utf-8, cp1252, or latin-1")

    # Assign column names (only as many as exist)
    df.columns = _EPW_COLUMNS[: len(df.columns)]

    # Keep only rows where the first four fields are numeric integers
    # (year, month, day, hour) — this drops blank lines and comment rows
    for col in ("year", "month", "day", "hour"):
        if col in df.columns:
            df = df[pd.to_numeric(df[col], errors="coerce").notna()]

    # Convert numeric columns to float/int
    numeric_cols = [
        "year", "month", "day", "hour", "minute",
        "dry_bulb", "dew_point", "relative_humidity", "pressure",
        "wind_direction", "wind_speed", "total_cloud",
        "global_solar", "direct_solar", "diffuse_solar",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Reset index after filtering
    df = df.reset_index(drop=True)

    # Rename total_cloud → cloud_cover
    if "total_cloud" in df.columns:
        df.rename(columns={"total_cloud": "cloud_cover"}, inplace=True)

    return df


def _enforce_8760(df: pd.DataFrame, label: str) -> pd.DataFrame:
    """
    Guarantee exactly 8760 rows.
    - If more than 8760: trim to first 8760 (some EPW files have a 8784-row
      leap-year variant or a duplicate first row).
    - If fewer than 8760: raise a clear error so the user knows the file
      is incomplete rather than silently sending bad data.
    """
    n = len(df)
    if n > 8760:
        df = df.iloc[:8760].copy()
    elif n < 8760:
        raise ValueError(
            f"{label}: EPW file has only {n} data rows (need 8760). "
            "The file may be partial or corrupt."
        )
    return df.reset_index(drop=True)


def _safe_float(val, default: float = 0.0) -> float:
    """Convert a value to float, returning default for NaN/None/non-numeric."""
    try:
        f = float(val)
        return default if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return default


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


# ─── Wet-bulb helper ─────────────────────────────────────────────────────────

def _wet_bulb(t_db: float, rh: float) -> float:
    """Stull (2011) approximation — same formula used in ChilledWaterCooling.tsx."""
    rh = _clamp(rh, 5.0, 99.0)   # formula valid 5–99 %
    return (
        t_db * math.atan(0.151977 * math.sqrt(rh + 8.313659))
        + math.atan(t_db + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * (rh ** 1.5) * math.atan(0.023101 * rh)
        - 4.686035
    )


# ─── Pipeline A: Air-Side Economizer ─────────────────────────────────────────
# Java EconomizerController accepts:
#   temperature / dry_bulb  (°C)
#   humidity / relative_humidity  (%)
#   dew_point  (°C, optional)
#   pressure   (Pa, optional)

def _epw_bytes_to_air_side_records(epw_bytes: bytes) -> List[dict]:
    df = epw_to_dataframe(epw_bytes)
    df = _enforce_8760(df, "Air-Side")

    records = []
    for _, row in df.iterrows():
        # EPW hour 1-24 → 0-23 for timestamp display only
        hour_0 = int(_safe_float(row.get("hour", 1), 1)) - 1
        t_db = _safe_float(row.get("dry_bulb"), 20.0)
        rh   = _clamp(_safe_float(row.get("relative_humidity"), 50.0), 0.0, 100.0)
        records.append({
            # Both naming conventions so Java accepts either
            "temperature":        t_db,
            "dry_bulb":           t_db,
            "humidity":           rh,
            "relative_humidity":  rh,
            "dew_point":          _safe_float(row.get("dew_point"), t_db - 5),
            "pressure":           _safe_float(row.get("pressure"), 101325.0),
            # Lightweight timestamp string (no pandas Timestamp object)
            "timestamp": (
                f"{int(_safe_float(row.get('year'), 2000)):04d}-"
                f"{int(_safe_float(row.get('month'), 1)):02d}-"
                f"{int(_safe_float(row.get('day'), 1)):02d} "
                f"{hour_0:02d}:00"
            ),
        })
    return records


# ─── Pipeline B: Chilled Water ────────────────────────────────────────────────
# Java WeatherDataPointDTO requires (exactly 8760):
#   hour (0-8759), dry_bulb_c, wet_bulb_c, relative_humidity,
#   atmospheric_pressure_pa

def _epw_bytes_to_chilled_water_records(epw_bytes: bytes) -> List[dict]:
    df = epw_to_dataframe(epw_bytes)
    df = _enforce_8760(df, "Chilled-Water")

    records = []
    for i, (_, row) in enumerate(df.iterrows()):
        t_db = _safe_float(row.get("dry_bulb"), 20.0)
        rh   = _clamp(_safe_float(row.get("relative_humidity"), 50.0), 0.0, 100.0)
        records.append({
            "hour":                    i,                          # 0-8759
            "dry_bulb_c":              t_db,
            "wet_bulb_c":              round(_wet_bulb(t_db, rh), 3),
            "relative_humidity":       rh,
            "atmospheric_pressure_pa": _safe_float(row.get("pressure"), 101325.0),
        })
    return records


# ─── Pipeline C: Evaporative Cooling ─────────────────────────────────────────
# Frontend EvaporativeCooling state expects:
#   hour (0-8759), dry_bulb_c, relative_humidity,
#   pressure_pa, wind_speed_ms
# (timestamp included for display)

def _epw_bytes_to_evaporative_records(epw_bytes: bytes) -> List[dict]:
    df = epw_to_dataframe(epw_bytes)
    df = _enforce_8760(df, "Evaporative")

    records = []
    for i, (_, row) in enumerate(df.iterrows()):
        hour_0 = i  # sequential 0-8759
        rh = _clamp(_safe_float(row.get("relative_humidity"), 50.0), 0.0, 100.0)
        records.append({
            "timestamp": (
                f"{int(_safe_float(row.get('year'), 2000)):04d}-"
                f"{int(_safe_float(row.get('month'), 1)):02d}-"
                f"{int(_safe_float(row.get('day'), 1)):02d} "
                f"{(int(_safe_float(row.get('hour'), 1)) - 1):02d}:00"
            ),
            "hour":              hour_0,
            "dry_bulb_c":        _safe_float(row.get("dry_bulb"), 20.0),
            "relative_humidity": rh,
            "pressure_pa":       _safe_float(row.get("pressure"), 101325.0),
            "wind_speed_ms":     _safe_float(row.get("wind_speed"), 0.0),
        })
    return records


# ─── EPW header parser (location + elevation) ────────────────────────────────

def _parse_epw_header(raw: bytes) -> tuple:
    """Returns (location_str, elevation_m) from EPW header line 1."""
    try:
        first_line = raw.decode("latin-1").splitlines()[0]
        parts = first_line.split(",")
        city    = parts[1].strip() if len(parts) > 1 else "Unknown"
        state   = parts[2].strip() if len(parts) > 2 else ""
        country = parts[3].strip() if len(parts) > 3 else ""
        elev    = float(parts[9]) if len(parts) > 9 else 0.0
        location = ", ".join(p for p in [city, state, country] if p)
        return location, elev
    except Exception:
        return "Unknown", 0.0


# ─── Shared EPW downloader ────────────────────────────────────────────────────

def _download_epw(epw_url: str) -> bytes:
    if not epw_url.startswith("https://"):
        raise HTTPException(400, "epw_url must be an https:// URL")
    try:
        resp = requests.get(
            epw_url,
            headers={"User-Agent": "EnergyPlus-Weather-API/3.0"},
            timeout=90,
        )
        resp.raise_for_status()
        return resp.content
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Could not download EPW file: {e}")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "energyplus-weather-api", "version": "3.0.0"}


@app.get("/countries")
def list_countries():
    try:
        features = _load_geojson()
    except Exception as e:
        raise HTTPException(502, f"Could not load EnergyPlus weather index: {e}")

    counts: Dict[str, int] = {}
    for feat in features:
        code, _ = _parse_title(feat["properties"]["title"])
        counts[code] = counts.get(code, 0) + 1

    result = []
    for code, cnt in sorted(counts.items(), key=lambda x: _COUNTRY_NAMES.get(x[0], x[0])):
        result.append({
            "code":       code,
            "name":       _COUNTRY_NAMES.get(code, code),
            "city_count": cnt,
        })
    return result


@app.get("/cities")
def list_cities(country_code: str):
    try:
        features = _load_geojson()
    except Exception as e:
        raise HTTPException(502, f"Could not load EnergyPlus weather index: {e}")

    cities = []
    for feat in features:
        title = feat["properties"]["title"]
        code, city_name = _parse_title(title)
        if code.upper() != country_code.upper():
            continue
        try:
            epw_url = _extract_epw_url(feat["properties"]["epw"])
        except ValueError:
            continue
        coords  = feat.get("geometry", {}).get("coordinates", [None, None])
        dataset = title.split("_")[-1] if "_" in title else ""
        cities.append({
            "id":      title,
            "name":    city_name,
            "epw_url": epw_url,
            "lat":     coords[1],
            "lon":     coords[0],
            "dataset": dataset,
        })

    cities.sort(key=lambda c: c["name"])
    return cities


# ── Air-Side Economizer ───────────────────────────────────────────────────────

@app.get("/weather")
def get_weather(epw_url: str):
    """
    Air-Side Economizer weather endpoint.
    Returns exactly 8760 records:
      { timestamp, temperature, dry_bulb, humidity, relative_humidity,
        dew_point, pressure }
    """
    raw = _download_epw(epw_url)
    try:
        data = _epw_bytes_to_air_side_records(raw)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(422, f"EPW parsing failed: {e}")

    city_name = epw_url.rsplit("/", 1)[-1].replace(".epw", "")
    return {"city": city_name, "hours": len(data), "data": data}


# ── Chilled Water ─────────────────────────────────────────────────────────────

@app.get("/weather/chilled-water")
def get_weather_chilled_water(epw_url: str):
    """
    Chilled Water weather endpoint.
    Returns exactly 8760 WeatherDataPointDTO records:
      { hour(0-8759), dry_bulb_c, wet_bulb_c, relative_humidity,
        atmospheric_pressure_pa }
    Also returns location and elevation from the EPW header.
    """
    raw = _download_epw(epw_url)
    try:
        data = _epw_bytes_to_chilled_water_records(raw)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(422, f"EPW parsing failed: {e}")

    location, elevation = _parse_epw_header(raw)
    city_name = epw_url.rsplit("/", 1)[-1].replace(".epw", "")
    return {
        "city":      city_name,
        "location":  location,
        "elevation": elevation,
        "hours":     len(data),
        "data":      data,
    }


# ── Evaporative Cooling ───────────────────────────────────────────────────────

@app.get("/weather/evaporative")
def get_weather_evaporative(epw_url: str):
    """
    Evaporative Cooling weather endpoint.
    Returns exactly 8760 records:
      { timestamp, hour(0-8759), dry_bulb_c, relative_humidity,
        pressure_pa, wind_speed_ms }
    """
    raw = _download_epw(epw_url)
    try:
        data = _epw_bytes_to_evaporative_records(raw)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(422, f"EPW parsing failed: {e}")

    city_name = epw_url.rsplit("/", 1)[-1].replace(".epw", "")
    return {"city": city_name, "hours": len(data), "data": data}


# ═══════════════════════════════════════════════════════════════════════════════
# DEBUG CSV ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

from fastapi.responses import Response

def _csv_response(df: pd.DataFrame, filename: str) -> Response:
    """Return a DataFrame as a downloadable CSV with proper CORS headers."""
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/debug/epw-full-csv")
def debug_epw_full_csv(epw_url: str):
    """
    DEBUG — Stage 1 CSV (all 35 EPW columns).
    Downloads the EPW, runs epw_to_dataframe() and returns the full
    35-column CSV so you can see every raw field before filtering.
    Filename: <city>_full_epw.csv
    """
    raw = _download_epw(epw_url)
    try:
        df = epw_to_dataframe(raw)
        df = _enforce_8760(df, "debug-full")
    except Exception as e:
        raise HTTPException(422, str(e))

    # Add a human-readable timestamp column for readability
    df.insert(0, "timestamp", (
        df["year"].astype(int).astype(str).str.zfill(4) + "-" +
        df["month"].astype(int).astype(str).str.zfill(2) + "-" +
        df["day"].astype(int).astype(str).str.zfill(2) + " " +
        (df["hour"].astype(int) - 1).astype(str).str.zfill(2) + ":00"
    ))

    city_name = epw_url.rsplit("/", 1)[-1].replace(".epw", "")
    return _csv_response(df, f"{city_name}_full_epw.csv")


@app.get("/debug/air-side-csv")
def debug_air_side_csv(epw_url: str):
    """
    DEBUG — Stage 2 CSV for Air-Side Economizer.
    Columns: timestamp, dry_bulb (temperature), relative_humidity (humidity),
             dew_point, pressure
    Filename: <city>_air_side.csv
    """
    raw = _download_epw(epw_url)
    try:
        records = _epw_bytes_to_air_side_records(raw)
    except Exception as e:
        raise HTTPException(422, str(e))

    df = pd.DataFrame(records, columns=[
        "timestamp", "temperature", "dry_bulb",
        "humidity", "relative_humidity", "dew_point", "pressure",
    ])
    city_name = epw_url.rsplit("/", 1)[-1].replace(".epw", "")
    return _csv_response(df, f"{city_name}_air_side.csv")


@app.get("/debug/chilled-water-csv")
def debug_chilled_water_csv(epw_url: str):
    """
    DEBUG — Stage 2 CSV for Chilled Water.
    Columns: hour, dry_bulb_c, wet_bulb_c, relative_humidity,
             atmospheric_pressure_pa
    Filename: <city>_chilled_water.csv
    """
    raw = _download_epw(epw_url)
    try:
        records = _epw_bytes_to_chilled_water_records(raw)
    except Exception as e:
        raise HTTPException(422, str(e))

    df = pd.DataFrame(records, columns=[
        "hour", "dry_bulb_c", "wet_bulb_c",
        "relative_humidity", "atmospheric_pressure_pa",
    ])
    city_name = epw_url.rsplit("/", 1)[-1].replace(".epw", "")
    return _csv_response(df, f"{city_name}_chilled_water.csv")


@app.get("/debug/evaporative-csv")
def debug_evaporative_csv(epw_url: str):
    """
    DEBUG — Stage 2 CSV for Evaporative Cooling.
    Columns: timestamp, hour, dry_bulb_c, relative_humidity,
             pressure_pa, wind_speed_ms
    Filename: <city>_evaporative.csv
    """
    raw = _download_epw(epw_url)
    try:
        records = _epw_bytes_to_evaporative_records(raw)
    except Exception as e:
        raise HTTPException(422, str(e))

    df = pd.DataFrame(records, columns=[
        "timestamp", "hour", "dry_bulb_c",
        "relative_humidity", "pressure_pa", "wind_speed_ms",
    ])
    city_name = epw_url.rsplit("/", 1)[-1].replace(".epw", "")
    return _csv_response(df, f"{city_name}_evaporative.csv")
