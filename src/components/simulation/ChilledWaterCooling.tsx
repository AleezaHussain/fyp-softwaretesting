import React, { useState, useEffect } from "react";
import { Droplet, Server, Thermometer } from "lucide-react";

interface ChilledWaterCoolingProps {
  onConfigChange?: (config: any) => void;
  isDark?: boolean;
  isTransitioning?: boolean;
}

const ChilledWaterCooling: React.FC<ChilledWaterCoolingProps> = ({
  onConfigChange,
  isDark = false,
  isTransitioning = false,
}) => {
  const [numberOfRacks, setNumberOfRacks] = useState(5);
  const [serversPerRack, setServersPerRack] = useState(10);

  const totalServers = numberOfRacks * serversPerRack;

  useEffect(() => {
    if (onConfigChange) {
      onConfigChange({
        technique: "chilled-water",
        numberOfRacks,
        serversPerRack,
        totalServers,
        rackPowerCapacity: 10,
        chilledWaterTemp: 7,
        supplyWaterTemp: 12,
        returnWaterTemp: 18,
        waterFlowRate: 50,
        chillerEfficiency: 0.6,
        pumpEfficiency: 0.8,
        coolingTowerEfficiency: 0.7,
      });
    }
  }, [numberOfRacks, serversPerRack, totalServers, onConfigChange]);

  return (
    <div
      className={`max-w-4xl mx-auto transition-all duration-500 ${
        isTransitioning
          ? "opacity-0 translate-x-8"
          : "opacity-100 translate-x-0"
      }`}
    >
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <h2
          className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
        >
          Configure Chilled-Water Cooling
        </h2>
        <p
          className={`text-lg max-w-2xl mx-auto ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          Set up your water-based cooling infrastructure
        </p>
      </div>

      {/* Stats Summary */}
      <div
        className={`mb-8 p-6 rounded-2xl ${
          isDark
            ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
            : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
        }`}
      >
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: Server, label: "Total Racks", value: numberOfRacks },
            { icon: Thermometer, label: "Servers", value: totalServers },
            { icon: Droplet, label: "Cooling Type", value: "Water-Based" },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <stat.icon
                className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-blue-400" : "text-blue-600"}`}
              />
              <div
                className={`text-2xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {stat.value}
              </div>
              <div
                className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      <div
        className={`p-8 rounded-2xl shadow-lg ${
          isDark
            ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
            : "bg-white border border-gray-200"
        }`}
      >
        <div className="space-y-6">
          {/* Number of Racks */}
          <div>
            <label
              className={`block text-sm font-semibold mb-3 ${
                isDark ? "text-gray-200" : "text-gray-900"
              }`}
            >
              Number of Racks <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                value={numberOfRacks}
                onChange={(e) => setNumberOfRacks(Number(e.target.value))}
                min={1}
                max={100}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="w-20">
                <input
                  type="number"
                  value={numberOfRacks}
                  onChange={(e) => setNumberOfRacks(Number(e.target.value))}
                  min={1}
                  max={100}
                  className={`w-full border rounded-lg px-3 py-2 text-center ${
                    isDark
                      ? "bg-[#27304a] border-[#3f4a68] text-white"
                      : "border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </div>
            <p
              className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}
            >
              Range: 1-100 racks
            </p>
          </div>

          {/* Servers per Rack */}
          <div>
            <label
              className={`block text-sm font-semibold mb-3 ${
                isDark ? "text-gray-200" : "text-gray-900"
              }`}
            >
              Servers per Rack <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                value={serversPerRack}
                onChange={(e) => setServersPerRack(Number(e.target.value))}
                min={1}
                max={50}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="w-20">
                <input
                  type="number"
                  value={serversPerRack}
                  onChange={(e) => setServersPerRack(Number(e.target.value))}
                  min={1}
                  max={50}
                  className={`w-full border rounded-lg px-3 py-2 text-center ${
                    isDark
                      ? "bg-[#27304a] border-[#3f4a68] text-white"
                      : "border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </div>
            <p
              className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}
            >
              Range: 1-50 servers per rack
            </p>
          </div>

          {/* Summary Info */}
          <div
            className={`p-4 rounded-xl mt-6 ${
              isDark
                ? "bg-[#0a0e27] border border-[#3f4a68]"
                : "bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500"
            }`}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div
                  className={`text-xs font-medium uppercase tracking-wide mb-2 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Total Servers
                </div>
                <div
                  className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {totalServers.toLocaleString()}
                </div>
              </div>
              <div>
                <div
                  className={`text-xs font-medium uppercase tracking-wide mb-2 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Estimated Load
                </div>
                <div
                  className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {(numberOfRacks * 10 * 0.85).toFixed(1)} kW
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChilledWaterCooling;
