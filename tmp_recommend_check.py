import traceback
import recommend_api as r

print('artifact_loaded:', r.artifact is not None)
print('load_error:', r.load_error)

payload = r.RecommendRequest(
    scenario=r.ScenarioInput(
        tempC=32,
        rh=55,
        itLoadKW=1200,
        electricityPrice=0.14,
        waterPrice=1.2,
        carbonFactor=0.45,
    ),
    current_technique='AirEconomizer',
    technique_results=[
        r.TechniqueResult(tech='AirEconomizer', feasible=True, energy_kwh=1300, water_liters=50, cost=190, emissions_kg=580, violations=0),
        r.TechniqueResult(tech='Evaporative', feasible=True, energy_kwh=1150, water_liters=220, cost=170, emissions_kg=520, violations=0),
        r.TechniqueResult(tech='ChilledWater', feasible=True, energy_kwh=1400, water_liters=160, cost=205, emissions_kg=640, violations=0),
    ],
)

try:
    out = r.recommend(payload)
    print('recommend_ok:', True)
    print(out)
except Exception:
    print('recommend_ok:', False)
    traceback.print_exc()
