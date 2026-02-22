// Temporary fallback with hardcoded server data until Supabase is configured
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Wind, Server as ServerIcon, Brain, AlertCircle } from "lucide-react";

// Hardcoded server data as fallback
const FALLBACK_SERVERS = [
  {
    id: "1",
    name: "Dell PowerEdge R740",
    manufacturer: "Dell",
    model: "R740",
    max_power_w: 750,
    idle_power_w: 150,
    typical_power_w: 450,
    form_factor: "2U",
    cooling_type: "Air-cooled",
    typical_utilization: 45,
    cpu_type: "Intel Xeon Gold",
    memory_gb: 256,
    storage_tb: 4,
    release_year: 2020,
    efficiency_rating: "80 Plus Platinum",
    avg_utilization_percent: 45,
    peak_utilization_percent: 85,
  },
  {
    id: "2",
    name: "HP ProLiant DL380 Gen10",
    manufacturer: "HP",
    model: "DL380 Gen10",
    max_power_w: 800,
    idle_power_w: 160,
    typical_power_w: 480,
    form_factor: "2U",
    cooling_type: "Air-cooled",
    typical_utilization: 50,
    cpu_type: "Intel Xeon Scalable",
    memory_gb: 384,
    storage_tb: 8,
    release_year: 2021,
    efficiency_rating: "80 Plus Titanium",
    avg_utilization_percent: 50,
    peak_utilization_percent: 90,
  },
];

const FALLBACK_COUNTRIES = [
  { id: "1", country_name: "United States", electricity_tariff: 0.15, co2_grid_factor: 0.055 },
  { id: "2", country_name: "Germany", electricity_tariff: 0.35, co2_grid_factor: 0.045 },
  { id: "3", country_name: "China", electricity_tariff: 0.08, co2_grid_factor: 0.065 },
];

const AirSideEconomizerFallback: React.FC = () => {
  const navigate = useNavigate();
  
  // CloudSim state
  const [enableCloudSim, setEnableCloudSim] = useState(true);
  const [aiWorkloadMode, setAiWorkloadMode] = useState("AI_TRAINING");
  const [computeIntensityFactor, setComputeIntensityFactor] = useState(1.2);
  
  // Configuration state
  const [selectedServerId, setSelectedServerId] = useState("1");
  const [numberOfRacks, setNumberOfRacks] = useState(5);
  const [serversPerRack, setServersPerRack] = useState(50);
  const [selectedCountryId, setSelectedCountryId] = useState("1");
  
  const selectedServer = FALLBACK_SERVERS.find(s => s.id === selectedServerId);
  const selectedCountry = FALLBACK_COUNTRIES.find(c => c.id === selectedCountryId);

  const handleRunSimulation = async () => {
    const payload = {
      enableCloudSim,
      aiWorkloadMode,
      computeIntensityFactor,
      numberOfRacks,
      serversPerRack,
      serverMaxPowerW: selectedServer?.max_power_w,
      serverIdlePowerW: selectedServer?.idle_power_w,
      electricityTariff: selectedCountry?.electricity_tariff,
      carbonIntensity: selectedCountry?.co2_grid_factor,
    };

    try {
      console.log("Sending payload:", payload);
      const response = await fetch("http://localhost:8080/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error("API error");
      const results = await response.json();
      navigate("/raw-results", { state: results });
    } catch (err: any) {
      alert("Failed to run simulation: " + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-gray-900">Air-Side Economization</h2>
        <p className="text-lg text-gray-600 mt-2">CloudSim-Integrated Cooling Simulation</p>
      </div>

      {/* CloudSim Configuration */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
          <Brain className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold">CloudSim Workload Engine</h3>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
            <div>
              <label className="text-sm font-semibold">Enable CloudSim</label>
              <p className="text-xs text-gray-500">AI-aware dynamic workload generation</p>
            </div>
            <button
              onClick={() => setEnableCloudSim(!enableCloudSim)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                enableCloudSim ? "bg-purple-600" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                enableCloudSim ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>

          {enableCloudSim && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2">AI Workload Mode</label>
                <select
                  value={aiWorkloadMode}
                  onChange={(e) => setAiWorkloadMode(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3"
                >
                  <option value="AI_TRAINING">AI Training (85-95% sustained)</option>
                  <option value="AI_INFERENCE">AI Inference (20%→95% spikes)</option>
                  <option value="MIXED">Mixed (70% enterprise + 30% AI)</option>
                  <option value="ENTERPRISE">Enterprise (30-70% traditional)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold">Compute Intensity Factor</label>
                  <span className="text-xl font-bold text-purple-600">{computeIntensityFactor.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={1.5}
                  step={0.05}
                  value={computeIntensityFactor}
                  onChange={(e) => setComputeIntensityFactor(Number(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-purple-200 to-purple-600 rounded-lg"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1.0x (Standard)</span>
                  <span>1.5x (AI/HPC)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Server Configuration */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
          <ServerIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold">Server Configuration</h3>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2">Server Type</label>
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3"
            >
              {FALLBACK_SERVERS.map(server => (
                <option key={server.id} value={server.id}>
                  {server.manufacturer} - {server.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Number of Racks</label>
              <input
                type="number"
                value={numberOfRacks}
                onChange={(e) => setNumberOfRacks(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Servers per Rack</label>
              <input
                type="number"
                value={serversPerRack}
                onChange={(e) => setServersPerRack(Number(e.target.value))}
                min={1}
                max={50}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Country</label>
            <select
              value={selectedCountryId}
              onChange={(e) => setSelectedCountryId(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3"
            >
              {FALLBACK_COUNTRIES.map(country => (
                <option key={country.id} value={country.id}>
                  {country.country_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Using Fallback Data</p>
            <p className="text-xs text-yellow-700 mt-1">
              Supabase database connection failed. Using hardcoded server configurations.
            </p>
          </div>
        </div>
      </div>

      {/* Run Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRunSimulation}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Run Simulation
        </button>
      </div>
    </div>
  );
};

export default AirSideEconomizerFallback;
