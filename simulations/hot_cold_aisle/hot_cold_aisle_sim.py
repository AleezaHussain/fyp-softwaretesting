import json
import math
import os
from dataclasses import dataclass, asdict
from typing import List, Dict, Any

try:
    import pandas as pd
except ImportError:
    pd = None

# Constants
CP_AIR_KJ_PER_KG_C = 1.005  # kJ/kg-C
RHO_AIR_KG_PER_M3 = 1.2     # kg/m3
CFM_TO_M3S = 0.00047194745  # 1 CFM = 0.00047194745 m3/s

@dataclass
class Scenario:
    id: str
    hosts: int
    vms: int
    workload_type: str  # "IT", "Mixed", "NonIT"
    ambient_temp_C: float
    airflow_cfm: float
    containment: str    # "Cold" or "Hot"
    duration_s: int = 600
    dt_s: int = 5
    # IT/Non-IT power assumptions
    p_it_per_host_W: float = 300.0
    p_lighting_W: float = 200.0
    p_UPS_loss_W: float = 150.0
    p_fans_W: float = 250.0
    # Cooling performance
    COP: float = 4.0
    # Containment effectiveness and leakage params
    containment_eta_guess: float = 0.85
    bypass_air_frac: float = 0.05  # BAF (beta)
    recirc_air_frac: float = 0.05  # RAF (alpha)
    # Rack geometry for 6-rack layout analysis (optional aggregation)
    racks: int = 6
    # Fan/VFD parameters
    fan_k_cubic: float = 500.0      # W per (m3/s)^3 (tunable)
    vfd_enabled: bool = False
    vfd_min_frac: float = 0.6
    vfd_max_frac: float = 1.3
    # RCI thresholds (ASHRAE recommended range, C)
    rci_lo_C: float = 18.0
    rci_hi_C: float = 27.0
    # Pressure/geometry (Darcy)
    f_friction: float = 0.25
    duct_L_m: float = 10.0
    duct_D_h_m: float = 0.6
    flow_area_m2: float = 2.0
    eta_fan0: float = 0.6  # base fan efficiency
    # PID control for supply temperature
    supply_pid_enabled: bool = False
    Tin_target_C: float = 24.0
    Kp_sup: float = 0.3
    Ki_sup: float = 0.0
    Kd_sup: float = 0.0
    Tsupply_min_C: float = 18.0
    Tsupply_max_C: float = 30.0
    # Dynamic IT load profile
    dynamic_load: bool = False
    load_swing_frac: float = 0.3  # +/- swing around baseline
    burst_every_s: int = 300
    burst_amp_frac: float = 0.2
    # Environment
    outdoor_T_C: float = 30.0
    outdoor_RH_percent: float = 40.0
    heat_exchanger_eff: float = 0.5  # 0..1, impact on supply cooling from outdoors
    # Carbon
    kgCO2_per_kWh: float = 0.45

@dataclass
class TimestepMetrics:
    t_s: float
    T_cold_supply_C: float
    T_hot_return_C: float
    deltaT_C: float
    eta_containment: float
    Q_IT_J: float
    Q_nonIT_J: float
    airflow_cfm: float
    P_cooling_W: float
    PUE: float
    savings_vs_open_Wh: float
    BAF: float
    RAF: float
    RTI: float
    RCI_percent: float
    DCiE: float
    CEI: float
    P_fan_W: float
    rack_inlet_C: str
    rack_outlet_C: str
    deltaT_rack_C: str
    Tsupply_C: float


def compute_heat_loads(scn: Scenario) -> Dict[str, float]:
    # IT power based on workload
    if scn.workload_type.lower() == "it":
        P_IT_W = scn.hosts * scn.p_it_per_host_W * 0.5  # light ~50%
        P_nonIT_W = scn.p_lighting_W + scn.p_UPS_loss_W + scn.p_fans_W
    elif scn.workload_type.lower() == "mixed":
        P_IT_W = scn.hosts * scn.p_it_per_host_W * 0.7  # medium ~70%
        P_nonIT_W = 1.2 * (scn.p_lighting_W + scn.p_UPS_loss_W + scn.p_fans_W)
    elif scn.workload_type.lower() == "nonit":
        P_IT_W = scn.hosts * scn.p_it_per_host_W * 0.1  # minimal IT
        P_nonIT_W = 1.5 * (scn.p_lighting_W + scn.p_UPS_loss_W + scn.p_fans_W)
    else:
        P_IT_W = scn.hosts * scn.p_it_per_host_W * 0.5
        P_nonIT_W = scn.p_lighting_W + scn.p_UPS_loss_W + scn.p_fans_W

    return {"P_IT_W": P_IT_W, "P_nonIT_W": P_nonIT_W}


def step(scn: Scenario, t_s: float, P_IT_W: float, P_nonIT_W: float) -> TimestepMetrics:
    # Variable airflow via VFD based on IT load fraction
    Vdot_base_m3s = scn.airflow_cfm * CFM_TO_M3S
    load_frac = min(1.0, max(0.05, P_IT_W / max(1.0, scn.hosts * scn.p_it_per_host_W)))
    vfd_frac = 1.0
    if scn.vfd_enabled:
        vfd_frac = max(scn.vfd_min_frac, min(scn.vfd_max_frac, 0.6 + 0.8 * load_frac))
    Vdot_m3s = Vdot_base_m3s * vfd_frac
    m_air_kg_s = RHO_AIR_KG_PER_M3 * Vdot_m3s
    Cp_kJ = CP_AIR_KJ_PER_KG_C

    # Dynamic IT load modulation (diurnal + bursts)
    if scn.dynamic_load:
        diurnal = 1.0 + scn.load_swing_frac * math.sin(2*math.pi*(t_s/86400.0))
        burst = 1.0 + (scn.burst_amp_frac if (int(t_s) % max(1, scn.burst_every_s) < scn.dt_s) else 0.0)
        P_IT_W = P_IT_W * diurnal * burst

    Q_total_W = P_IT_W + P_nonIT_W  # W

    # Ideal deltaT without mixing/leakage (in Celsius)
    deltaT_ideal_C = Q_total_W / (max(1e-9, m_air_kg_s) * (Cp_kJ * 1000.0))

    # Apply bypass and recirculation effects
    beta = scn.bypass_air_frac
    alpha = scn.recirc_air_frac
    effective_deltaT_C = deltaT_ideal_C * (1 - beta) * (1 - alpha)

    # Base supply from ambient, with optional heat exchanger tied to outdoors
    T_cold_supply_C = scn.ambient_temp_C
    if scn.heat_exchanger_eff > 0:
        T_cold_supply_C = scn.ambient_temp_C - scn.heat_exchanger_eff * (scn.ambient_temp_C - scn.outdoor_T_C)

    # PID control on supply to meet inlet target band
    if scn.supply_pid_enabled:
        error = (scn.Tin_target_C - T_cold_supply_C)
        T_cold_supply_C = max(scn.Tsupply_min_C, min(scn.Tsupply_max_C, T_cold_supply_C + scn.Kp_sup * error))

    # Per-rack temperature profile (simple linearized model with leakage/bypass influence)
    # Per-rack airflow distribution using simple resistance weights (equal here, extensible)
    rack_inlet = []
    rack_outlet = []
    delta_rack = []
    racks_n = max(1, scn.racks)
    # split IT load per rack equally; could be scenario-configurable
    P_IT_r_W = [P_IT_W / racks_n for _ in range(racks_n)]
    # flow split equal for now; future: use resistances per rack
    Vdot_r = [Vdot_m3s / racks_n for _ in range(racks_n)]
    for i in range(racks_n):
        inlet_i = T_cold_supply_C + alpha * (i / max(1, racks_n - 1)) * effective_deltaT_C
        m_air_r = RHO_AIR_KG_PER_M3 * Vdot_r[i]
        dT_i = (P_IT_r_W[i]) / max(1e-9, (m_air_r * (Cp_kJ*1000.0)))
        dT_i *= (1 - beta)
        outlet_i = inlet_i + dT_i
        rack_inlet.append(inlet_i)
        rack_outlet.append(outlet_i)
        delta_rack.append(dT_i)

    # Rack exhaust temperature (hot rack exhaust, before return path)
    T_hot_rack_exhaust_C = rack_outlet[-1]

    # Containment efficiency guess is provided; simulate return temp based on containment and aisle type
    if scn.containment.lower().startswith("cold"):
        # Cold aisle containment: better isolation, return is near rack exhaust, some mixing with ambient
        mixing_factor = 0.1 + scn.bypass_air_frac  # small mixing
    else:
        # Hot aisle containment: also good isolation, but assume slightly higher mixing
        mixing_factor = 0.15 + scn.recirc_air_frac

    T_hot_return_C = (1 - mixing_factor) * T_hot_rack_exhaust_C + mixing_factor * T_cold_supply_C

    # Containment efficiency using provided formula
    eta_containment = 0.0
    denom = max(1e-9, (T_hot_rack_exhaust_C - T_cold_supply_C))
    eta_containment = (T_hot_return_C - T_cold_supply_C) / denom

    # Cooling power draw based on COP
    # Assume cooling must remove Q_total (W). In reality, some stored in air mass, but dt small.
    P_cooling_W = Q_total_W / max(0.1, scn.COP)

    # Fan power via cubic law with Darcy pressure and efficiency correction
    v_mean = 0.0
    if scn.flow_area_m2 > 1e-9:
        v_mean = Vdot_m3s / scn.flow_area_m2
    dP_Pa = scn.f_friction * (scn.duct_L_m / max(1e-9, scn.duct_D_h_m)) * (RHO_AIR_KG_PER_M3 * v_mean * v_mean / 2.0)
    flow_frac = Vdot_m3s / max(1e-9, Vdot_base_m3s)
    eta_fan = max(0.2, min(0.85, scn.eta_fan0 * (0.8 + 0.2*flow_frac)))
    P_fan_W = (Vdot_m3s * dP_Pa) / max(1e-6, eta_fan)

    # PUE = (P_IT + P_nonIT + P_cooling) / P_IT
    P_total_W = P_IT_W + P_nonIT_W + P_cooling_W + P_fan_W
    PUE = P_total_W / max(1e-9, P_IT_W)
    DCiE = 1.0 / max(1e-9, PUE)

    # Savings vs open layout: compare eta_containment vs a baseline eta_open=0.5
    eta_open = 0.5
    # Approx. cooling power scales with (1/eta), so savings ~ proportional to (eta_cont - eta_open)
    # For a short dt, translate percent improvement into Wh over this dt
    improvement = max(0.0, eta_containment - eta_open) / max(1e-9, (1 - eta_open))
    savings_Wh = improvement * (P_cooling_W * (scn.dt_s / 3600.0))

    # RTI and RCI
    RTI = (T_hot_return_C - T_cold_supply_C) / max(1e-9, deltaT_ideal_C)
    racks_in_range = sum(1 for t_in in rack_inlet if scn.rci_lo_C <= t_in <= scn.rci_hi_C)
    RCI_percent = 100.0 * racks_in_range / max(1, scn.racks)
    # CEI will be computed at summary using cumulative energy; placeholder 0 here
    CEI = 0.0

    return TimestepMetrics(
        t_s=t_s,
        T_cold_supply_C=T_cold_supply_C,
        T_hot_return_C=T_hot_return_C,
        deltaT_C=effective_deltaT_C,
        eta_containment=eta_containment,
        Q_IT_J=P_IT_W * scn.dt_s,
        Q_nonIT_J=P_nonIT_W * scn.dt_s,
        airflow_cfm=scn.airflow_cfm,
        P_cooling_W=P_cooling_W,
        PUE=PUE,
        savings_vs_open_Wh=savings_Wh,
        BAF=scn.bypass_air_frac,
        RAF=scn.recirc_air_frac,
        RTI=RTI,
        RCI_percent=RCI_percent,
        DCiE=DCiE,
        CEI=CEI,
        P_fan_W=P_fan_W,
        rack_inlet_C=";".join(f"{x:.2f}" for x in rack_inlet),
        rack_outlet_C=";".join(f"{x:.2f}" for x in rack_outlet),
        deltaT_rack_C=";".join(f"{x:.2f}" for x in delta_rack),
        Tsupply_C=T_cold_supply_C,
    )


def run_scenario(scn: Scenario) -> Dict[str, Any]:
    loads = compute_heat_loads(scn)
    P_IT_W, P_nonIT_W = loads["P_IT_W"], loads["P_nonIT_W"]

    rows = []
    cum = {"Q_IT_J": 0.0, "Q_nonIT_J": 0.0, "cooling_Wh": 0.0, "savings_Wh": 0.0, "fan_Wh": 0.0, "co2_savings_kg": 0.0}

    for t in range(0, scn.duration_s + 1, scn.dt_s):
        ts = step(scn, t, P_IT_W, P_nonIT_W)
        cum["Q_IT_J"] += ts.Q_IT_J
        cum["Q_nonIT_J"] += ts.Q_nonIT_J
        cum["cooling_Wh"] += ts.P_cooling_W * (scn.dt_s / 3600.0)
        cum["savings_Wh"] += ts.savings_vs_open_Wh
        cum["fan_Wh"] += ts.P_fan_W * (scn.dt_s / 3600.0)
        rows.append(asdict(ts))

    result = {
        "scenario": asdict(scn),
        "timeseries": rows,
        "summary": {
            "Q_IT_MJ": cum["Q_IT_J"] / 1e6,
            "Q_nonIT_MJ": cum["Q_nonIT_J"] / 1e6,
            "cooling_Wh": cum["cooling_Wh"],
            "fan_Wh": cum["fan_Wh"],
            "savings_vs_open_Wh": cum["savings_Wh"],
            "avg_PUE": sum(r["PUE"] for r in rows) / max(1, len(rows)),
            "avg_DCiE": sum(r["DCiE"] for r in rows) / max(1, len(rows)),
            "avg_RTI": sum(r["RTI"] for r in rows) / max(1, len(rows)),
            "avg_RCI_percent": sum(r["RCI_percent"] for r in rows) / max(1, len(rows)),
            "avg_eta_containment": sum(r["eta_containment"] for r in rows) / max(1, len(rows)),
            "T_cold_supply_C": rows[-1]["T_cold_supply_C"],
            "T_hot_return_C": rows[-1]["T_hot_return_C"],
            "deltaT_C": rows[-1]["deltaT_C"],
            "CEI": (cum["cooling_Wh"] / 1000.0) / max(1e-9, (cum["Q_IT_J"] / 3.6e6)),
            "CO2_savings_kg": ((cum["savings_Wh"]/1000.0) * (scn.kgCO2_per_kWh)),
        }
    }
    return result


def to_dataframe(records: List[Dict[str, Any]]):
    if pd is None:
        return None
    flat_rows = []
    for rec in records:
        scn = rec["scenario"].copy()
        for ts in rec["timeseries"]:
            row = {}
            row.update({f"scn_{k}": v for k, v in scn.items()})
            row.update(ts)
            flat_rows.append(row)
    return pd.DataFrame(flat_rows)


def main():
    base_dir = os.path.dirname(__file__)
    scenarios_path = os.path.join(base_dir, "scenarios.json")
    results_dir = os.path.join(base_dir, "results")
    os.makedirs(results_dir, exist_ok=True)

    if os.path.exists(scenarios_path):
        with open(scenarios_path, "r") as f:
            scn_list = json.load(f)
    else:
        # Default scenarios from the request
        scn_list = [
            {
                "id": "H1V1_IT_Light_25C_Aisle", "hosts": 1, "vms": 1, "workload_type": "IT",
                "ambient_temp_C": 25, "airflow_cfm": 600, "containment": "Cold",
            },
            {
                "id": "H2V4_Mixed_Medium_28C_Aisle", "hosts": 2, "vms": 4, "workload_type": "Mixed",
                "ambient_temp_C": 28, "airflow_cfm": 900, "containment": "Hot",
            },
            {
                "id": "H4V8_IT_Heavy_30C_Aisle", "hosts": 4, "vms": 8, "workload_type": "IT",
                "ambient_temp_C": 30, "airflow_cfm": 1200, "containment": "Cold",
            },
            {
                "id": "H4V8_NonIT_Heavy_30C_Aisle", "hosts": 4, "vms": 8, "workload_type": "NonIT",
                "ambient_temp_C": 30, "airflow_cfm": 1200, "containment": "Hot",
            },
        ]

    scenarios = [Scenario(**s) for s in scn_list]

    all_results = []
    for scn in scenarios:
        res = run_scenario(scn)
        all_results.append(res)
        # Write per-scenario CSV if pandas is available
        if pd is not None:
            df = to_dataframe([res])
            if df is not None:
                csv_path = os.path.join(results_dir, f"{scn.id}.csv")
                df.to_csv(csv_path, index=False)
                print(f"Wrote: {csv_path}")
        # Print concise summary
        summary = res["summary"]
        print(
            f"SCENARIO: {scn.id}\n"
            f"T_cold_supply: {summary['T_cold_supply_C']:.1f} C\n"
            f"T_hot_return: {summary['T_hot_return_C']:.1f} C\n"
            f"DeltaT: {summary['deltaT_C']:.1f} C\n"
            f"eta_containment: {summary['avg_eta_containment']:.2f}\n"
            f"avg_PUE: {summary['avg_PUE']:.2f} | avg_DCiE: {summary['avg_DCiE']:.3f} | avg_RTI: {summary['avg_RTI']:.2f} | avg_RCI: {summary['avg_RCI_percent']:.1f}%\n"
            f"Cooling_Wh: {summary['cooling_Wh']:.1f} | Fan_Wh: {summary['fan_Wh']:.1f} | CEI: {summary['CEI']:.3f}\n"
            f"Savings_vs_open_Wh: {summary['savings_vs_open_Wh']:.1f}\n"
            "-"*50
        )
        # Standardized single-line summary for cross-technique comparison parsers
        print(
            "PUE_avg="
            f"{summary['avg_PUE']:.3f} | "
            f"Cooling_Wh={summary['cooling_Wh']:.1f} | "
            f"T_return={summary['T_hot_return_C']:.2f} C | "
            f"DeltaT={summary['deltaT_C']:.2f} C"
        )

    # Combined CSV and scenario summary CSV
    if pd is not None and all_results:
        df_all = to_dataframe(all_results)
        if df_all is not None:
            csv_all = os.path.join(results_dir, "all_scenarios_timeseries.csv")
            df_all.to_csv(csv_all, index=False)
            print(f"Wrote: {csv_all}")
    # Scenario summaries
    summaries_path = os.path.join(results_dir, "aisle_summaries.csv")
    headers = [
        "scenario","avg_PUE","avg_DCiE","cooling_Wh","fan_Wh","CEI","avg_RTI","avg_RCI_percent","avg_eta","T_supply_C","T_return_C","deltaT_C","CO2_savings_kg"
    ]
    if all_results:
        write_header = not os.path.exists(summaries_path)
        with open(summaries_path, "a", encoding="utf-8") as f:
            if write_header:
                f.write(",".join(headers)+"\n")
            for rec in all_results:
                s = rec["summary"]
                row = [
                    rec["scenario"]["id"],
                    f"{s['avg_PUE']:.3f}", f"{s['avg_DCiE']:.3f}", f"{s['cooling_Wh']:.1f}", f"{s['fan_Wh']:.1f}", f"{s['CEI']:.3f}",
                    f"{s['avg_RTI']:.2f}", f"{s['avg_RCI_percent']:.1f}", f"{s['avg_eta_containment']:.2f}",
                    f"{s['T_cold_supply_C']:.2f}", f"{s['T_hot_return_C']:.2f}", f"{s['deltaT_C']:.2f}", f"{s['CO2_savings_kg']:.2f}"
                ]
                f.write(",".join(row)+"\n")


if __name__ == "__main__":
    main()
