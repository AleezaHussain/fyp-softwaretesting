import requests
import json
import time

# Test the air-side economizer API
url = "http://localhost:8080/api/simulation/run"

# Load test data
with open("test_air_simulation_24h.json", "r") as f:
    data = json.load(f)

print("Testing Air-Side Economizer API with 24-hour simulation...")
print(f"Servers: {data['numberOfRacks']} racks × {data['serversPerRack']} servers = {data['numberOfRacks'] * data['serversPerRack']} total")
print(f"Duration: {data['simulationDuration']} hours")
print(f"Workload Mode: {data['aiWorkloadMode']}")
print()

start_time = time.time()

try:
    response = requests.post(url, json=data, timeout=300)
    
    end_time = time.time()
    execution_time = end_time - start_time
    
    print(f"✅ API Response received in {execution_time:.2f} seconds")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        if "error" in result:
            print(f"❌ Error: {result['error']}")
        else:
            print("✅ Simulation completed successfully!")
            print(f"Response keys: {list(result.keys())}")
            
            # Check if we have hourly results
            if "hourlyProfile" in result:
                print(f"Hourly results: {len(result['hourlyProfile'])} hours")
                if result['hourlyProfile']:
                    first_hour = result['hourlyProfile'][0]
                    print(f"First hour sample: {list(first_hour.keys())}")
    else:
        print(f"❌ HTTP Error: {response.status_code}")
        print(response.text)
        
except requests.exceptions.Timeout:
    print("❌ Request timed out after 5 minutes")
except Exception as e:
    print(f"❌ Error: {e}")