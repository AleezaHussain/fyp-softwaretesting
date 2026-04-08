import React, { useState } from "react";
import { DataCenterConfig } from "./DataCenterConfig";
import { DataCenterComponent, ComponentType } from "../../types/simulation";

// Utility to map a config object to DataCenterVisualizer props
function mapConfigToVisualizerProps(config: any) {
  const components: DataCenterComponent[] = [];
  let totalHeatLoad = 0;
  if (config) {
    if (config.numberOfRacks) {
      components.push({
        id: "server_rack",
        type: "server_rack" as ComponentType,
        quantity: config.numberOfRacks,
        rackSize: config.rackSize || "2U",
      });
      totalHeatLoad += (config.itLoad || 10) * config.numberOfRacks;
    }
    if (config.numberOfFans) {
      components.push({
        id: "fan",
        type: "fan" as ComponentType,
        quantity: config.numberOfFans,
      });
      totalHeatLoad += (config.fanLoad || 1) * config.numberOfFans;
    }
    if (config.numberOfChillers) {
      components.push({
        id: "chiller",
        type: "chiller" as ComponentType,
        quantity: config.numberOfChillers,
      });
      totalHeatLoad += (config.chillerLoad || 20) * config.numberOfChillers;
    }
    if (config.numberOfRouters) {
      components.push({
        id: "router",
        type: "router" as ComponentType,
        quantity: config.numberOfRouters,
      });
      totalHeatLoad += (config.routerLoad || 2) * config.numberOfRouters;
    }
    if (config.numberOfPDUs) {
      components.push({
        id: "pdu",
        type: "pdu" as ComponentType,
        quantity: config.numberOfPDUs,
      });
      totalHeatLoad += (config.pduLoad || 1) * config.numberOfPDUs;
    }
    // Add more as needed for your config structure
  }
  return { components, totalHeatLoad };
}

interface Visualize3DProps {
  config: any; // The configuration object to visualize
  onClose: () => void;
}

const Visualize3D: React.FC<Visualize3DProps> = ({ config, onClose }) => {
  // Initialize state from config
  const initial = mapConfigToVisualizerProps(config);
  const [components, setComponents] = useState<DataCenterComponent[]>(
    initial.components,
  );
  const [totalHeatLoad, setTotalHeatLoad] = useState<number>(
    initial.totalHeatLoad,
  );

  // Add component handler
  const handleAddComponent = (component: DataCenterComponent) => {
    setComponents((prev) => [...prev, component]);
    setTotalHeatLoad((prev) => prev + estimateHeatLoad(component));
  };

  // Remove component handler
  const handleRemoveComponent = (id: string) => {
    const comp = components.find((c) => c.id === id);
    setComponents((prev) => prev.filter((c) => c.id !== id));
    if (comp) setTotalHeatLoad((prev) => prev - estimateHeatLoad(comp));
  };

  // Proceed handler (could be used to save or close)
  const handleProceed = () => {
    onClose();
  };

  // Estimate heat load for a component
  function estimateHeatLoad(comp: DataCenterComponent) {
    switch (comp.type) {
      case "server_rack":
        return (comp.quantity || 1) * 10;
      case "router":
        return (comp.quantity || 1) * 2;
      case "pdu":
        return (comp.quantity || 1) * 1;
      case "cooling_pump":
        return (comp.quantity || 1) * 3;
      case "storage_array":
        return (comp.quantity || 1) * 20;
      case "backup_generator":
        return (comp.quantity || 1) * 50;
      default:
        return 0;
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-3xl w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 text-xl font-bold"
        >
          ×
        </button>
        <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">
          3D Data Center Visualization
        </h3>

        <React.Suspense fallback={<div>Loading 3D visualization...</div>}>
          <DataCenterConfig
            components={components}
            totalHeatLoad={totalHeatLoad}
            onAddComponent={handleAddComponent}
            onRemoveComponent={handleRemoveComponent}
            onProceed={handleProceed}
          />
        </React.Suspense>
      </div>
    </div>
  );
};

export default Visualize3D;
