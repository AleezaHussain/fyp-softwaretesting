"""
Run this to see exactly what Supabase returns for a simulation.
Usage: python debug_supabase.py <simulation_id>
"""
import sys
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_KEY not found in .env")
    sys.exit(1)

from supabase import create_client
client = create_client(SUPABASE_URL, SUPABASE_KEY)

sim_id = sys.argv[1] if len(sys.argv) > 1 else None

if not sim_id:
    print("\n=== ALL simulations ===")
    all_resp = client.table("simulations").select("id, name, simulation_type, status").execute()
    for s in all_resp.data:
        print(f"  ID={s['id']}  status={s['status']}  name={s['name']}")
    sys.exit(0)

print(f"\n=== simulations table (id={sim_id}) ===")
sim_resp = client.table("simulations").select("*").eq("id", int(sim_id)).execute()
print(json.dumps(sim_resp.data, indent=2, default=str))

print(f"\n=== simulation_results table (simulation_id={sim_id}) ===")
res_resp = client.table("simulation_results").select("*").eq("simulation_id", int(sim_id)).execute()
print(json.dumps(res_resp.data, indent=2, default=str))

if res_resp.data:
    row = res_resp.data[0]
    print(f"\n=== Top-level keys in results row ===")
    print(list(row.keys()))
    if "result_data" in row:
        print(f"\n=== Keys inside result_data ===")
        rd = row["result_data"]
        if isinstance(rd, dict):
            print(list(rd.keys()))
            if "summary" in rd:
                print(f"\n=== summary keys ===")
                print(list(rd["summary"].keys()))
            else:
                print("\nWARNING: No 'summary' key inside result_data — this is why LLM gets no real numbers!")
    else:
        print("\nWARNING: No 'result_data' key in results row!")
