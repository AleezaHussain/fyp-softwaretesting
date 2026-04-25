"""
Shows the exact result_data structure for every completed simulation.
Run: py debug_all_simulations.py
"""
import json, os, sys
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

from supabase import create_client
client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Get all simulations
sims = client.table("simulations").select("id, name, simulation_type, status").execute().data
print(f"\nFound {len(sims)} simulations\n")

for s in sims:
    sid = s["id"]
    print(f"{'='*60}")
    print(f"ID={sid} | {s['simulation_type']} | status={s['status']} | name={s['name']}")

    res = client.table("simulation_results").select("*").eq("simulation_id", sid).execute().data
    if not res:
        print("  >> NO simulation_results row\n")
        continue

    row = res[0]
    top_keys = list(row.keys())
    print(f"  >> simulation_results top keys: {top_keys}")

    rd = row.get("result_data")
    if rd is None:
        print("  >> result_data = None")
        # print other keys values briefly
        for k in top_keys:
            if k not in ("id","simulation_id","created_at","updated_at"):
                v = row[k]
                if isinstance(v, dict):
                    print(f"     {k} (dict) keys: {list(v.keys())}")
                elif isinstance(v, list):
                    print(f"     {k} (list) len={len(v)}")
                else:
                    print(f"     {k} = {str(v)[:80]}")
    elif isinstance(rd, dict):
        print(f"  >> result_data keys: {list(rd.keys())}")
        for k, v in rd.items():
            if isinstance(v, dict):
                print(f"     result_data.{k} (dict) keys: {list(v.keys())}")
                # go one level deeper for summary
                for k2, v2 in v.items():
                    if isinstance(v2, dict):
                        print(f"       result_data.{k}.{k2} (dict) keys: {list(v2.keys())}")
                    elif isinstance(v2, list):
                        print(f"       result_data.{k}.{k2} (list) len={len(v2)}")
            elif isinstance(v, list):
                print(f"     result_data.{k} (list) len={len(v)}")
            else:
                print(f"     result_data.{k} = {str(v)[:80]}")
    else:
        print(f"  >> result_data type={type(rd)}, value={str(rd)[:200]}")
    print()
