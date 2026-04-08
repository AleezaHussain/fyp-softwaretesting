import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  DataCenterComponent,
  ComponentType,
  ServerRackSize,
} from "../../types/simulation";
import { DataCenterVisualizer } from "./DataCenterVisualizer";

interface DataCenterConfigProps {
  components: DataCenterComponent[];
  onAddComponent: (component: DataCenterComponent) => void;
  onRemoveComponent: (id: string) => void;
  totalHeatLoad: number;
  onProceed: () => void;
}

const COMPONENT_TYPES = {
  server_rack: { label: "Server Racks", icon: "🖥️", heatLoad: 15 },
  router: { label: "Routers/Switches", icon: "🔌", heatLoad: 2 },
  cooling_pump: { label: "Cooling Pumps", icon: "💧", heatLoad: 3 },
  pdu: { label: "PDUs", icon: "⚡", heatLoad: 1 },
  storage_array: { label: "Storage Arrays", icon: "💾", heatLoad: 20 },
  backup_generator: { label: "Backup Generators", icon: "🔋", heatLoad: 50 },
  fan: { label: "Fans", icon: "🌀", heatLoad: 1 },
  chiller: { label: "Chillers", icon: "❄️", heatLoad: 20 },
};

export const DataCenterConfig: React.FC<DataCenterConfigProps> = ({
  components,
  onAddComponent,
  onRemoveComponent,
  totalHeatLoad,
  onProceed,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [selectedType, setSelectedType] =
    useState<ComponentType>("server_rack");
  const [quantity, setQuantity] = useState(1);
  const [rackSize, setRackSize] = useState<ServerRackSize>("2U");

  const handleAddComponent = () => {
    const newComponent: DataCenterComponent = {
      id: `${selectedType}-${Date.now()}`,
      type: selectedType,
      quantity,
      rackSize: selectedType === "server_rack" ? rackSize : undefined,
    };
    onAddComponent(newComponent);
    setShowModal(false);
    setQuantity(1);
  };

  const totalComponents = components.reduce(
    (sum, comp) => sum + comp.quantity,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Data Center Configuration</h2>
        <p className="text-gray-300">
          Add components to configure your data center
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Components</div>
            <div className="text-4xl font-bold text-[#fd5757]">
              {totalComponents}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Estimated Heat Load</div>
            <div className="text-4xl font-bold text-[#5ce1e5]">
              {totalHeatLoad.toFixed(1)} kW
            </div>
          </div>

          {/* Components List */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-[#1a1a2e]">Added Components</h3>
            </div>
            {components.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                No components added yet
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {components.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {COMPONENT_TYPES[comp.type as ComponentType]?.icon ||
                          "📦"}
                      </span>
                      <div>
                        <div className="font-medium text-[#1a1a2e] text-sm">
                          {COMPONENT_TYPES[comp.type as ComponentType]?.label ||
                            comp.type}
                        </div>
                        <div className="text-xs text-gray-600">
                          Qty: {comp.quantity}
                          {comp.rackSize && ` (${comp.rackSize})`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveComponent(comp.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Component Button */}
          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-[#fd5757] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition"
          >
            <Plus size={20} />
            Add Component
          </button>
        </div>

        {/* Right Panel - Visualization */}
        <div className="lg:col-span-2">
          <DataCenterVisualizer
            components={components}
            totalHeatLoad={totalHeatLoad}
          />
        </div>
      </div>

      {/* Visualize Configuration Button */}
      <button
        onClick={() => setShowVisualization(true)}
        disabled={components.length === 0}
        className="w-full bg-[#5ce1e5] text-[#1a1a2e] py-3 rounded-lg font-semibold hover:bg-cyan-400 disabled:bg-gray-300 disabled:cursor-not-allowed transition mb-4"
      >
        Visualize Configuration
      </button>

      {/* Proceed Button */}
      <button
        onClick={onProceed}
        disabled={components.length === 0}
        className="w-full bg-[#fd5757] text-white py-3 rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
      >
        Proceed to Cooling Selection
      </button>

      {/* Visualization Modal */}
      {showVisualization && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full mx-4 relative">
            <button
              onClick={() => setShowVisualization(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 text-xl font-bold"
            >
              ×
            </button>
            <h3 className="text-xl font-bold text-[#1a1a2e] mb-6">
              3D Data Center Visualization
            </h3>
            <DataCenterVisualizer
              components={components}
              totalHeatLoad={totalHeatLoad}
            />
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-[#1a1a2e] mb-6">
              Add Component
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Component Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) =>
                    setSelectedType(e.target.value as ComponentType)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
                >
                  {Object.entries(COMPONENT_TYPES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedType === "server_rack" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rack Size
                  </label>
                  <select
                    value={rackSize}
                    onChange={(e) =>
                      setRackSize(e.target.value as ServerRackSize)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
                  >
                    <option value="1U">1U</option>
                    <option value="2U">2U</option>
                    <option value="4U">4U</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddComponent}
                  className="flex-1 bg-[#fd5757] text-white py-2 rounded-lg font-medium hover:bg-red-600 transition"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
