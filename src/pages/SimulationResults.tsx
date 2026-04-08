import React, { useState } from "react";
import { Sidebar } from "../components/shared/Sidebar";
import { useSimulationStore } from "../store/store";
import { Download, RefreshCw, TrendingDown } from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

export const SimulationResults: React.FC = () => {
  const result = useSimulationStore((state) => state.currentResult);
  const [timeRange, setTimeRange] = useState<"24h" | "8760h">("24h");
  const [selectedChart, setSelectedChart] = useState<
    "energy" | "temperature" | "cop"
  >("energy");

  if (!result) {
    return (
      <div className="min-h-screen bg-bg-light flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              No simulation results available
            </p>
            <a href="/input-management" className="btn-primary">
              Run Simulation
            </a>
          </div>
        </main>
      </div>
    );
  }

  const metrics = [
    {
      label: "PUE",
      value: result.pue.toFixed(2),
      unit: "",
      color: "text-secondary",
    },
    {
      label: "WUE",
      value: result.wue.toFixed(2),
      unit: "L/kWh",
      color: "text-secondary",
    },
    {
      label: "Total Energy",
      value: (result.totalEnergyConsumption / 1000).toFixed(1),
      unit: "MWh/year",
      color: "text-primary",
    },
    {
      label: "Estimated Cost",
      value: `$${(result.estimatedCost / 1000).toFixed(1)}k`,
      unit: "/year",
      color: "text-primary",
    },
    {
      label: "Carbon Footprint",
      value: (result.carbonFootprint / 1000).toFixed(1),
      unit: "tons/year",
      color: "text-primary",
    },
  ];

  const hourlyChartData = {
    labels: Array.from(
      { length: result.hourlyEnergyUse.length },
      (_, i) => `${i}:00`,
    ),
    datasets: [
      {
        label: "Energy Consumption (kW)",
        data: result.hourlyEnergyUse,
        borderColor: "#5ce1e5",
        backgroundColor: "rgba(92, 225, 229, 0.1)",
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  const temperatureChartData = {
    labels: Array.from(
      { length: result.temperatureTrends.length },
      (_, i) => `${i}:00`,
    ),
    datasets: [
      {
        label: "Temperature (°C)",
        data: result.temperatureTrends,
        borderColor: "#fd5757",
        backgroundColor: "rgba(253, 87, 87, 0.1)",
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  const copChartData = {
    labels: Array.from(
      { length: result.copOverTime.length },
      (_, i) => `${i}:00`,
    ),
    datasets: [
      {
        label: "Coefficient of Performance",
        data: result.copOverTime,
        borderColor: "#5ce1e5",
        backgroundColor: "rgba(92, 225, 229, 0.1)",
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: "#1a1a2e",
          font: { size: 12 },
        },
      },
    },
    scales: {
      y: {
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: { color: "#1a1a2e" },
      },
      x: {
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: { color: "#1a1a2e" },
      },
    },
  };

  // --- ML Recommendation Section ---
  const ml = result.mlRecommendation;

  // Helper to render comparison table
  const renderComparisonTable = (table: any[] | undefined) => {
    if (!table || !Array.isArray(table) || table.length === 0) return null;
    return (
      <div className="overflow-x-auto mt-8">
        <h3 className="font-bold text-lg mb-2">Technique Comparison Table</h3>
        <table className="min-w-full border text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1">Technique</th>
              <th className="border px-2 py-1">Feasible</th>
              <th className="border px-2 py-1">Score</th>
              <th className="border px-2 py-1">Cost</th>
              <th className="border px-2 py-1">Emissions</th>
              <th className="border px-2 py-1">Water</th>
              <th className="border px-2 py-1">Violations</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={i}>
                <td className="border px-2 py-1">{row.tech}</td>
                <td className="border px-2 py-1">
                  {row.feasible ? "Yes" : "No"}
                </td>
                <td className="border px-2 py-1">{row.score?.toFixed(2)}</td>
                <td className="border px-2 py-1">
                  $
                  {row.annual_cost?.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td className="border px-2 py-1">
                  {row.annual_emissions_kg?.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  kg
                </td>
                <td className="border px-2 py-1">
                  {row.annual_water_liters?.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  L
                </td>
                <td className="border px-2 py-1">{row.violations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // --- END ML Recommendation Section ---

  return (
    <div className="min-h-screen bg-bg-light flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold font-poppins text-dark-gray mb-2">
              Simulation Results
            </h1>
            <p className="text-text-light">
              {new Date(result.timestamp).toLocaleDateString()} at{" "}
              {new Date(result.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary flex items-center gap-2">
              <Download size={20} />
              Export
            </button>
            <button className="btn-outline flex items-center gap-2">
              <RefreshCw size={20} />
              Re-run
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {metrics.map(({ label, value, unit, color }) => (
            <div key={label} className="card">
              <p className="text-sm text-gray-600 mb-2">{label}</p>
              <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
              {unit && <p className="text-xs text-gray-500">{unit}</p>}
            </div>
          ))}
        </div>

        {/* Time Range Toggle */}
        <div className="flex gap-2 mb-6">
          {(["24h", "8760h"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                timeRange === range ? "btn-primary" : "btn-outline"
              }`}
            >
              {range === "24h" ? "24 Hours" : "Annual"}
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => setSelectedChart("energy")}
            className={`card h-80 cursor-pointer transition-all ${
              selectedChart === "energy"
                ? "ring-2 ring-secondary shadow-xl"
                : "hover:shadow-lg"
            }`}
          >
            {selectedChart === "energy" && (
              <Line data={hourlyChartData} options={chartOptions} />
            )}
            {selectedChart !== "energy" && (
              <p className="text-center text-gray-500">Hourly Energy Use</p>
            )}
          </button>

          <button
            onClick={() => setSelectedChart("temperature")}
            className={`card h-80 cursor-pointer transition-all ${
              selectedChart === "temperature"
                ? "ring-2 ring-secondary shadow-xl"
                : "hover:shadow-lg"
            }`}
          >
            {selectedChart === "temperature" && (
              <Line data={temperatureChartData} options={chartOptions} />
            )}
            {selectedChart !== "temperature" && (
              <p className="text-center text-gray-500">Temperature Trends</p>
            )}
          </button>

          <button
            onClick={() => setSelectedChart("cop")}
            className={`card h-80 cursor-pointer transition-all ${
              selectedChart === "cop"
                ? "ring-2 ring-secondary shadow-xl"
                : "hover:shadow-lg"
            }`}
          >
            {selectedChart === "cop" && (
              <Line data={copChartData} options={chartOptions} />
            )}
            {selectedChart !== "cop" && (
              <p className="text-center text-gray-500">COP Over Time</p>
            )}
          </button>
        </div>

        {/* Detailed Visualization */}
        <div className="card mb-8">
          <h3 className="text-xl font-bold font-poppins text-dark-gray mb-6">
            Detailed Analysis
          </h3>

          {selectedChart === "energy" && (
            <div>
              <h4 className="font-semibold font-poppins text-dark-gray mb-4">
                Hourly Energy Consumption
              </h4>
              <Line
                data={hourlyChartData}
                options={chartOptions}
                height={300}
              />
            </div>
          )}

          {selectedChart === "temperature" && (
            <div>
              <h4 className="font-semibold font-poppins text-dark-gray mb-4">
                Temperature Trends
              </h4>
              <Line
                data={temperatureChartData}
                options={chartOptions}
                height={300}
              />
            </div>
          )}

          {selectedChart === "cop" && (
            <div>
              <h4 className="font-semibold font-poppins text-dark-gray mb-4">
                Coefficient of Performance
              </h4>
              <Line data={copChartData} options={chartOptions} height={300} />
            </div>
          )}
        </div>

        {/* Optimization Tips */}
        <div className="card bg-gradient-to-r from-secondary to-primary text-white">
          <div className="flex items-start gap-4">
            <TrendingDown size={32} className="flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold font-poppins mb-2">
                Optimization Recommendation
              </h3>
              <p className="opacity-90">
                Based on your simulation, consider implementing water cooling
                with higher efficiency factors to reduce PUE by up to 20% and
                carbon footprint by 25%.
              </p>
              <a
                href="/advisory"
                className="mt-4 inline-block underline font-semibold hover:opacity-80"
              >
                View Detailed Advisory →
              </a>
            </div>
          </div>
        </div>

        {/* ML Recommendation Section */}
        <div className="card mb-8">
          <h3 className="text-xl font-bold font-poppins text-dark-gray mb-6">
            ML Recommendation
          </h3>
          {ml ? (
            <div>
              <div className="mb-4">
                <span className="font-semibold">Recommended Technique: </span>
                <span className="text-primary font-bold text-lg">
                  {ml.model_recommendation}
                </span>
              </div>
              {ml.why_this_is_recommended && (
                <div className="mb-4">
                  <span className="font-semibold">
                    Why this is recommended:
                  </span>
                  <ul className="list-disc ml-6 mt-1">
                    {ml.why_this_is_recommended.map(
                      (reason: string, i: number) => (
                        <li key={i}>{reason}</li>
                      ),
                    )}
                  </ul>
                </div>
              )}
              {ml.future_impact_paragraph && (
                <div className="mb-4">
                  <span className="font-semibold">Future Impact:</span>
                  <p className="mt-1">{ml.future_impact_paragraph}</p>
                </div>
              )}
              {ml.comparison_table &&
                renderComparisonTable(ml.comparison_table)}
            </div>
          ) : (
            <p className="text-gray-600">No ML recommendation available.</p>
          )}
        </div>
      </main>
    </div>
  );
};
