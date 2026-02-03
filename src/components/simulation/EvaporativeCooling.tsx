import React, { useEffect, useMemo, useState } from "react";
import { Cloud, Cpu, Server, Wind } from "lucide-react";

export interface EvaporativeCoolingFormProps {
  isDark: boolean;
  isTransitioning: boolean;
  currentConfig: any;
  currentInput: any;
  onConfigChange: (config: any) => void;
}

const EvaporativeCoolingForm: React.FC<EvaporativeCoolingFormProps> = ({
  isDark,
  isTransitioning,
  currentConfig,
  currentInput,
  onConfigChange,
}) => {
  const [numberOfRacks, setNumberOfRacks] = useState<number>(
    currentConfig?.numberOfRacks || currentInput?.numberOfRacks || 5,
  );
  const [serversPerRack, setServersPerRack] = useState<number>(
    currentConfig?.serversPerRack || 10,
  );
  const [averageUtilization, setAverageUtilization] = useState<number>(
    currentConfig?.averageUtilization || 45,
  );
  const [peakUtilization, setPeakUtilization] = useState<number>(
    currentConfig?.peakUtilization || 85,
  );
  const [region, setRegion] = useState<string>(
    currentConfig?.region || "us_northeast",
  );

  const totalServers = useMemo(
    () => numberOfRacks * serversPerRack,
    [numberOfRacks, serversPerRack],
  );

  useEffect(() => {
    onConfigChange({
      numberOfRacks,
      serversPerRack,
      averageUtilization,
      peakUtilization,
      region,
      totalServers,
    });
  }, [
    numberOfRacks,
    serversPerRack,
    averageUtilization,
    peakUtilization,
    region,
    totalServers,
    onConfigChange,
  ]);

  return (
    <div
      className={`max-w-6xl mx-auto transition-all duration-500 ${
        isTransitioning
          ? "opacity-0 translate-x-8"
          : "opacity-100 translate-x-0"
      }`}
    >
      <div className="text-center space-y-4 mb-12">
        <h2
          className={`text-4xl font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Configure Evaporative Cooling
        </h2>
        <p
          className={`text-lg max-w-2xl mx-auto ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Set basic server parameters for evaporative cooling analysis.
        </p>
      </div>

      <div
        className={`mb-8 p-6 rounded-2xl ${
          isDark
            ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
            : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
        }`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Server, label: "Total Racks", value: numberOfRacks },
            { icon: Cpu, label: "Servers", value: totalServers },
            {
              icon: Wind,
              label: "Utilization",
              value: `${averageUtilization}%`,
            },
            { icon: Cloud, label: "Region", value: region },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div
                className={`text-2xl font-bold mb-1 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {stat.value}
              </div>
              <div
                className={`text-sm ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`p-8 rounded-2xl ${
          isDark
            ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
            : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-semibold">Number of Racks</label>
            <input
              type="number"
              min={1}
              value={numberOfRacks}
              onChange={(e) => setNumberOfRacks(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Servers per Rack</label>
            <input
              type="number"
              min={1}
              value={serversPerRack}
              onChange={(e) => setServersPerRack(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">
              Average Utilization (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={averageUtilization}
              onChange={(e) => setAverageUtilization(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">
              Peak Utilization (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={peakUtilization}
              onChange={(e) => setPeakUtilization(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-2 font-semibold">Region</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="us_northeast"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaporativeCoolingForm;
