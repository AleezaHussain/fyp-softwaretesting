"""
Shows exactly what parameters the ML used for a simulation.
Run: py debug_ml_params.py <simulation_id>
"""
import sys, os, json
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
c = create_client(os.getenv('VITE_SUPABASE_URL'), os.getenv('VITE_SUPABASE_ANON_KEY'))

sim_id = sys.argv[1] if len(sys.argv) > 1 else "15"

r = c.table('simulation_results').select('result_data').eq('simulation_id', int(sim_id)).execute()
if not r.data:
    print(f"No results for simulation ID={sim_id}")
    sys.exit(0)

rd = r.data[0]['result_data']
ml = rd.get('mlRecommendation', {})
api = rd.get('_api_payload', {})

print(f"\n{'='*60}")
print(f"ML PARAMETERS FOR SIMULATION ID={sim_id}")
print(f"{'='*60}")

# What the ML model received
print("\n--- SCENARIO INPUT (fed to Random Forest model) ---")
print(f"  tempC           : {api.get('temperatureOffset') or api.get('tempC') or 'check hourly avg'}")
print(f"  electricityPrice: {api.get('electricityTariff') or api.get('baseElectricityRate') or api.get('electricityPrice')}")
print(f"  waterPrice      : {api.get('waterPrice')}")
print(f"  carbonFactor    : {api.get('carbonIntensity') or api.get('carbonFactor')}")

# Hourly averages used
hourly = rd.get('hourlyData') or rd.get('hourlyResults') or []
if hourly:
    temps = [h.get('ambientTempC') or h.get('outdoorTempC') or h.get('tempC') for h in hourly if h.get('ambientTempC') or h.get('outdoorTempC')]
    its   = [h.get('itLoadKW') or h.get('itLoad_kW') for h in hourly if h.get('itLoadKW') or h.get('itLoad_kW')]
    rhs   = [h.get('ambientHumidity') or h.get('outdoorRH') for h in hourly if h.get('ambientHumidity') or h.get('outdoorRH')]
    if temps: print(f"  avg tempC (hourly): {sum(temps)/len(temps):.2f} °C")
    if its:   print(f"  avg itLoadKW      : {sum(its)/len(its):.2f} kW")
    if rhs:   print(f"  avg rh            : {sum(rhs)/len(rhs):.2f} %")

print("\n--- ML OUTPUT ---")
print(f"  model_recommendation : {ml.get('model_recommendation')}")
print(f"  current_technique    : {ml.get('current_technique')}")
print(f"  decision_source      : {ml.get('decision_source')}")

print("\n--- COMPARISON TABLE ---")
for row in ml.get('comparison_table', []):
    print(f"  {row['tech']:20} score={row.get('score',0):.4f}  cost=${row.get('annual_cost',0):,.0f}  emissions={row.get('annual_emissions_kg',0):,.0f}kg  water={row.get('annual_water_liters',0):,.0f}L  feasible={row.get('feasible')}")

print("\n--- JUSTIFICATION ---")
for j in ml.get('why_this_is_recommended', []):
    print(f"  - {j}")

print("\n--- FUTURE IMPACT ---")
print(f"  {ml.get('future_impact_paragraph', 'N/A')}")
