import React, { useEffect, useRef, useState, Suspense } from "react";
import {
  Save,
  Trash2,
  Upload,
  Download,
  MapPin,
  Plus,
  Settings,
  Eye,
  Thermometer,
  Zap,
  Wind,
  Cpu,
  Database,
  Power,
  ChevronRight,
  Sparkles,
  Maximize2,
  Minimize2,
  Grid3x3,
  Layers,
  Target,
  Bell,
  Activity,
  Server,
  Cloud,
} from "lucide-react";
import { DataCenterComponent, DataCenterConfig } from "../types/simulation";
import { useThemeStore } from "../hooks/useTheme";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import Draggable from "react-draggable";
import { Sidebar } from "../components/shared/Sidebar";

// Default heat loads for different component types
const DEFAULT_HEAT_LOADS: Record<string, number> = {
  server_rack: 15,
  router: 2,
  cooling_pump: 3,
  pdu: 1,
  storage_array: 10,
  backup_generator: 5,
};

// Generate unique ID for components
const uid = (prefix = "c") => {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
};

// Theme Toggle Component
const ThemeToggle: React.FC = () => {
  const { mode: themeMode, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
        themeMode === "dark" ? "bg-[#27304a]" : "bg-gray-300"
      }`}
    >
      <div
        className={`absolute top-1 w-5 h-5 rounded-full transition-all duration-300 ${
          themeMode === "dark" ? "left-7 bg-[#5ce1e5]" : "left-1 bg-[#0ea5e9]"
        }`}
      >
        {themeMode === "dark" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#0a0e27]" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-yellow-300" />
          </div>
        )}
      </div>
    </button>
  );
};

// 3D Component Model
interface Component3DProps {
  type: string;
  position: [number, number, number];
  quantity: number;
  isSelected: boolean;
  onClick: () => void;
  heatLoad: number;
}

const Component3D: React.FC<Component3DProps> = ({
  type,
  position,
  quantity,
  isSelected,
  onClick,
  heatLoad,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const isDark = useThemeStore((state) => state.isDark);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      meshRef.current.scale.y =
        1 + Math.sin(state.clock.elapsedTime) * 0.1 * (heatLoad / 50);
    }
  });

  const getComponentConfig = () => {
    const configs: Record<
      string,
      { color: string; geometry: React.ReactNode; scale: number }
    > = {
      server_rack: {
        color: isDark ? "#fd5757" : "#ef4444",
        geometry: <boxGeometry args={[2, 3, 1]} />,
        scale: 1,
      },
      router: {
        color: isDark ? "#5ce1e5" : "#0ea5e9",
        geometry: <boxGeometry args={[1, 0.5, 1]} />,
        scale: 0.8,
      },
      cooling_pump: {
        color: isDark ? "#10b981" : "#10b981",
        geometry: <cylinderGeometry args={[0.6, 0.8, 1.2, 8]} />,
        scale: 0.9,
      },
      pdu: {
        color: isDark ? "#f59e0b" : "#f59e0b",
        geometry: <boxGeometry args={[1.5, 0.8, 0.8]} />,
        scale: 0.7,
      },
      storage_array: {
        color: isDark ? "#8b5cf6" : "#8b5cf6",
        geometry: <boxGeometry args={[2.5, 2, 1.5]} />,
        scale: 1.1,
      },
      backup_generator: {
        color: isDark ? "#f97316" : "#f97316",
        geometry: <cylinderGeometry args={[1, 1.2, 2, 12]} />,
        scale: 1.2,
      },
    };
    return configs[type] || configs.server_rack;
  };

  const config = getComponentConfig();

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={config.scale}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        castShadow
        receiveShadow
      >
        {config.geometry}
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={isSelected ? 0.3 : 0.1}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Heat effect */}
      <mesh
        position={[0, 2, 0]}
        scale={[1 + heatLoad / 50, 1 + heatLoad / 50, 1]}
      >
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial
          color={isDark ? "#ff6b6b" : "#dc2626"}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Label */}
      <Html position={[0, 2.5, 0]}>
        <div
          className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
            isDark ? "bg-black/80 text-white" : "bg-white/90 text-gray-900"
          }`}
        >
          {type.replace("_", " ")} ×{quantity}
        </div>
      </Html>
    </group>
  );
};

// Enhanced 3D Scene
interface DataCenterSceneProps {
  components: DataCenterComponent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const DataCenterScene: React.FC<DataCenterSceneProps> = ({
  components,
  selectedId,
  onSelect,
}) => {
  const isDark = useThemeStore((state) => state.isDark);

  return (
    <Canvas shadows camera={{ position: [10, 10, 10], fov: 50 }}>
      <color attach="background" args={[isDark ? "#0a0e27" : "#f8fafc"]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      <spotLight
        position={[0, 10, 0]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        castShadow
      />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={isDark ? "#1a1f3a" : "#e5e7eb"} />
      </mesh>

      {/* Grid */}
      <gridHelper
        args={[
          20,
          20,
          isDark ? "#3f4a68" : "#cbd5e1",
          isDark ? "#27304a" : "#e2e8f0",
        ]}
      />

      {/* Components */}
      {components.map((comp, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const x = -6 + col * 4;
        const z = -6 + row * 4;

        return (
          <Component3D
            key={comp.id}
            type={comp.type}
            position={[x, 0, z]}
            quantity={comp.quantity}
            isSelected={selectedId === comp.id}
            onClick={() => onSelect(comp.id)}
            heatLoad={DEFAULT_HEAT_LOADS[comp.type] || 0}
          />
        );
      })}

      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  );
};

// Enhanced Draggable Component
interface DraggableComponentProps {
  component: DataCenterComponent;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<DataCenterComponent>) => void;
}

const DraggableComponent: React.FC<DraggableComponentProps> = ({
  component,
  isSelected,
  onSelect,
  onRemove,
  onUpdate,
}) => {
  const isDark = useThemeStore((state) => state.isDark);

  const getComponentColor = () => {
    const colors: Record<string, string> = {
      server_rack: isDark ? "#fd5757" : "#ef4444",
      router: isDark ? "#5ce1e5" : "#0ea5e9",
      cooling_pump: isDark ? "#10b981" : "#10b981",
      pdu: isDark ? "#f59e0b" : "#f59e0b",
      storage_array: isDark ? "#8b5cf6" : "#8b5cf6",
      backup_generator: isDark ? "#f97316" : "#f97316",
    };
    return colors[component.type] || colors.server_rack;
  };

  return (
    <Draggable
      bounds="parent"
      defaultPosition={{
        x: component.position?.x || 0,
        y: component.position?.y || 0,
      }}
      onStop={(_, data) => {
        onUpdate(component.id, {
          position: {
            x: Math.max(0, data.x),
            y: Math.max(0, data.y),
            z: component.position?.z || 0,
          },
        });
      }}
    >
      <div
        onDoubleClick={() => onSelect(component.id)}
        className={`absolute cursor-grab p-4 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
          isSelected
            ? isDark
              ? "ring-2 ring-[#5ce1e5] bg-[#1a1f3a]/80"
              : "ring-2 ring-[#0ea5e9] bg-white/90"
            : isDark
              ? "bg-[#1a1f3a]/60"
              : "bg-white/80"
        }`}
        style={{
          userSelect: "none",
          minWidth: "160px",
          borderLeft: `4px solid ${getComponentColor()}`,
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-sm font-bold capitalize">
              {component.type.replace("_", " ")}
            </div>
            <div className="text-xs opacity-75">ID: {component.id}</div>
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-bold ${
              isDark ? "bg-black/30 text-white" : "bg-gray-100 text-gray-900"
            }`}
          >
            ×{component.quantity}
          </div>
        </div>

        <div
          className={`text-xs mb-3 p-2 rounded-lg ${
            isDark ? "bg-black/30" : "bg-gray-100/50"
          }`}
        >
          <div className="flex justify-between">
            <span>Heat Load:</span>
            <span className="font-bold">
              {DEFAULT_HEAT_LOADS[component.type] || 0} kW
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(component.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
              isDark
                ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => onRemove(component.id)}
            className={`p-2 rounded-lg transition-all duration-300 hover:scale-105 ${
              isDark
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-red-100 text-red-600 hover:bg-red-200"
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Draggable>
  );
};

interface ComponentPaletteItemProps {
  type: string;
  name: string;
  heatLoad: number;
  icon: React.ReactNode;
  color: string;
  onAdd: () => void;
}

const ComponentPaletteItem: React.FC<ComponentPaletteItemProps> = ({
  type,
  name,
  heatLoad,
  icon,
  color,
  onAdd,
}) => {
  const isDark = useThemeStore((state) => state.isDark);

  return (
    <div
      className={`group p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
        isDark
          ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68] hover:border-[#5ce1e5]/30"
          : "bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-[#0ea5e9]/30"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-2 rounded-lg ${isDark ? "bg-black/30" : "bg-gray-100"}`}
        >
          {icon}
        </div>
        <div
          className={`px-2 py-1 rounded-full text-xs font-bold ${
            isDark ? "bg-black/30 text-white" : "bg-gray-100 text-gray-900"
          }`}
        >
          {heatLoad} kW
        </div>
      </div>

      <h4
        className={`font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
      >
        {name}
      </h4>
      <p
        className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}
      >
        Add to your data center layout
      </p>

      <button
        onClick={onAdd}
        className={`w-full py-2.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
          isDark
            ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          Add Component
        </div>
      </button>
    </div>
  );
};

export const DataCenterBuilder: React.FC = () => {
  const [components, setComponents] = useState<DataCenterComponent[]>([
    {
      id: uid("rack"),
      type: "server_rack",
      quantity: 1,
      position: { x: 50, y: 50, z: 0 },
    },
    {
      id: uid("router"),
      type: "router",
      quantity: 1,
      position: { x: 200, y: 50, z: 0 },
    },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null); // DataCenterBuilder page removed for new workflow
  const [configName, setConfigName] = useState("My Data Center Design");
  const [savedConfigs, setSavedConfigs] = useState<DataCenterConfig[]>([]);
  const [mapCoord, setMapCoord] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = useThemeStore((state) => state.isDark);

  useEffect(() => {
    const raw = localStorage.getItem("dc_configs");
    if (raw) {
      try {
        setSavedConfigs(JSON.parse(raw));
      } catch {
        setSavedConfigs([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dc_configs", JSON.stringify(savedConfigs));
  }, [savedConfigs]);

  const addComponent = (type: DataCenterComponent["type"]) => {
    const newComp: DataCenterComponent = {
      id: uid(type),
      type,
      quantity: 1,
      position: {
        x: 100 + Math.random() * 300,
        y: 100 + Math.random() * 200,
        z: 0,
      },
    };
    setComponents((s) => [...s, newComp]);
    setSelectedId(newComp.id);
  };

  const removeComponent = (id: string) => {
    setComponents((s) => s.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateComponent = (
    id: string,
    updates: Partial<DataCenterComponent>,
  ) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const totalHeatLoad = components.reduce(
    (acc, c) => acc + (DEFAULT_HEAT_LOADS[c.type] || 0) * (c.quantity || 1),
    0,
  );
  const estimatedPowerKW = totalHeatLoad * 0.293;
  const estimatedCostPerYear = estimatedPowerKW * 24 * 365 * 0.12;

  // Mock thermal data for charts
  const thermalData = [
    { time: "00:00", temp: 22 },
    { time: "04:00", temp: 21 },
    { time: "08:00", temp: 24 },
    { time: "12:00", temp: 28 },
    { time: "16:00", temp: 26 },
    { time: "20:00", temp: 23 },
    { time: "24:00", temp: 22 },
  ];

  const heatDistributionData = components.map((comp) => ({
    name: comp.type.replace("_", " "),
    heat: DEFAULT_HEAT_LOADS[comp.type] * comp.quantity,
  }));

  const saveConfiguration = () => {
    const cfg: DataCenterConfig = {
      dataCenterName: configName,
      components,
      totalHeatLoad,
    };
    setSavedConfigs((s) => [cfg, ...s]);
  };

  const loadConfiguration = (cfg: DataCenterConfig) => {
    setComponents(cfg.components);
    setConfigName(cfg.dataCenterName);
  };

  const deleteConfiguration = (index: number) => {
    setSavedConfigs((s) => s.filter((_, i) => i !== index));
  };

  const exportJSON = () => {
    const data = { dataCenterName: configName, components };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${configName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.components) {
          setComponents(data.components);
          setConfigName(data.dataCenterName || "Imported");
        } else {
          alert("Invalid file");
        }
      } catch (err) {
        alert("Failed to parse file");
      }
    };
    reader.readAsText(file);
  };

  const onMapClick = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lng = -180 + (x / rect.width) * 360;
    const lat = 90 - (y / rect.height) * 180;
    setMapCoord({
      lat: Math.round(lat * 100) / 100,
      lng: Math.round(lng * 100) / 100,
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const componentTypes = [
    {
      type: "server_rack",
      name: "Server Rack",
      heat: 15,
      icon: <Cpu className="w-5 h-5" />,
      color: isDark ? "#fd5757" : "#ef4444",
    },
    {
      type: "router",
      name: "Router/Switch",
      heat: 2,
      icon: <Zap className="w-5 h-5" />,
      color: isDark ? "#5ce1e5" : "#0ea5e9",
    },
    {
      type: "cooling_pump",
      name: "Cooling System",
      heat: 3,
      icon: <Wind className="w-5 h-5" />,
      color: isDark ? "#10b981" : "#10b981",
    },
    {
      type: "pdu",
      name: "Power Distribution",
      heat: 1,
      icon: <Power className="w-5 h-5" />,
      color: isDark ? "#f59e0b" : "#f59e0b",
    },
    {
      type: "storage_array",
      name: "Storage Array",
      heat: 20,
      icon: <Database className="w-5 h-5" />,
      color: isDark ? "#8b5cf6" : "#8b5cf6",
    },
    {
      type: "backup_generator",
      name: "Backup Generator",
      heat: 50,
      icon: <Sparkles className="w-5 h-5" />,
      color: isDark ? "#f97316" : "#f97316",
    },
  ];

  return (
    <div
      ref={containerRef}
      className={`min-h-screen transition-colors duration-500 ${
        isDark
          ? "bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]"
          : "bg-gradient-to-b from-slate-50 via-white to-slate-50"
      }`}
    >
      {/* Use shared Sidebar component */}
      <Sidebar />

      <div className="lg:ml-64">
        {/* Top Navigation Bar */}
        <div
          className={`sticky top-0 z-30 p-4 border-b backdrop-blur-sm ${
            isDark
              ? "bg-[#0a0e27]/80 border-[#3f4a68]"
              : "bg-white/80 border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Data Center Builder
                </h1>
                <p
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Design and visualize your infrastructure
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />

              <button
                className={`p-2 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                <Bell className="w-5 h-5" />
              </button>

              <button
                className={`p-2 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                <Activity className="w-5 h-5" />
              </button>

              <div
                className={`px-4 py-2 rounded-xl ${
                  isDark ? "bg-[#27304a]" : "bg-gray-100"
                }`}
              >
                <div className="text-xs font-medium">Auto-save: On</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Animated Background Elements */}
          <div className="fixed inset-0 pointer-events-none z-0">
            <div
              className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${
                isDark ? "bg-[#5ce1e5]/5" : "bg-[#0ea5e9]/5"
              }`}
              style={{ animation: "float 8s ease-in-out infinite" }}
            />
          </div>

          {/* Header */}
          <div className="relative mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
              <div>
                <h1
                  className={`text-3xl lg:text-4xl font-bold mb-2 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  <span
                    className={isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}
                  >
                    Data Center
                  </span>{" "}
                  Builder
                </h1>
                <p
                  className={`text-lg ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Design, visualize, and optimize your data center
                  infrastructure
                </p>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 p-1 rounded-xl ${
                    isDark ? "bg-[#1a1f3a]" : "bg-gray-100"
                  }`}
                >
                  <button
                    onClick={() => setViewMode("2d")}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      viewMode === "2d"
                        ? isDark
                          ? "bg-[#5ce1e5] text-white"
                          : "bg-[#0ea5e9] text-white"
                        : isDark
                          ? "text-gray-400 hover:text-white"
                          : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Grid3x3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("3d")}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      viewMode === "3d"
                        ? isDark
                          ? "bg-[#5ce1e5] text-white"
                          : "bg-[#0ea5e9] text-white"
                        : isDark
                          ? "text-gray-400 hover:text-white"
                          : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={toggleFullscreen}
                  className={`p-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                    isDark
                      ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>

                <button
                  onClick={saveConfiguration}
                  className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                    isDark
                      ? "bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white"
                      : "bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    Save Design
                  </div>
                </button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div
                className={`p-6 rounded-2xl transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                    : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      isDark ? "bg-black/30" : "bg-gray-100"
                    }`}
                  >
                    <Thermometer
                      className={`w-6 h-6 ${isDark ? "text-[#fd5757]" : "text-[#ef4444]"}`}
                    />
                  </div>
                  <div>
                    <div
                      className={`text-2xl font-bold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {totalHeatLoad} kW
                    </div>
                    <div
                      className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Total Heat Load
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`p-6 rounded-2xl transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                    : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      isDark ? "bg-black/30" : "bg-gray-100"
                    }`}
                  >
                    <Zap
                      className={`w-6 h-6 ${isDark ? "text-[#5ce1e5]" : "text-[#0ea5e9]"}`}
                    />
                  </div>
                  <div>
                    <div
                      className={`text-2xl font-bold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {estimatedPowerKW.toFixed(1)} kW
                    </div>
                    <div
                      className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Power Consumption
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`p-6 rounded-2xl transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                    : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      isDark ? "bg-black/30" : "bg-gray-100"
                    }`}
                  >
                    <Download
                      className={`w-6 h-6 ${isDark ? "text-[#10b981]" : "text-[#10b981]"}`}
                    />
                  </div>
                  <div>
                    <div
                      className={`text-2xl font-bold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {components.length}
                    </div>
                    <div
                      className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Total Components
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`p-6 rounded-2xl transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? "bg-gradient-to-br from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                    : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      isDark ? "bg-black/30" : "bg-gray-100"
                    }`}
                  >
                    <Sparkles
                      className={`w-6 h-6 ${isDark ? "text-[#8b5cf6]" : "text-[#8b5cf6]"}`}
                    />
                  </div>
                  <div>
                    <div
                      className={`text-2xl font-bold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      ${Math.round(estimatedCostPerYear)}
                    </div>
                    <div
                      className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Annual Cost
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Panel - Components */}
            <div className="space-y-8">
              {/* Component Palette */}
              <div
                className={`rounded-2xl p-6 ${
                  isDark
                    ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                    : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
                }`}
              >
                <h3
                  className={`text-xl font-bold mb-6 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Component Library
                </h3>

                <div className="space-y-4">
                  {componentTypes.map((item) => (
                    <ComponentPaletteItem
                      key={item.type}
                      type={item.type}
                      name={item.name}
                      heatLoad={item.heat}
                      icon={item.icon}
                      color={item.color}
                      onAdd={() =>
                        addComponent(item.type as DataCenterComponent["type"])
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Saved Designs */}
              <div
                className={`rounded-2xl p-6 ${
                  isDark
                    ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                    : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
                }`}
              >
                <h3
                  className={`text-xl font-bold mb-6 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Saved Designs
                </h3>

                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {savedConfigs.map((config, index) => (
                    <div
                      key={index}
                      className={`group p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                        isDark
                          ? "bg-[#27304a] hover:bg-[#3f4a68]"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-bold">{config.dataCenterName}</div>
                        <div
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            isDark
                              ? "bg-black/30 text-white"
                              : "bg-white text-gray-900"
                          }`}
                        >
                          {config.components.length} comps
                        </div>
                      </div>

                      <div
                        className={`text-xs mb-4 ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {config.totalHeatLoad} kW total heat load
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadConfiguration(config)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
                            isDark
                              ? "bg-[#5ce1e5] text-white hover:bg-[#0ea5e9]"
                              : "bg-[#0ea5e9] text-white hover:bg-[#5ce1e5]"
                          }`}
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteConfiguration(index)}
                          className={`p-2 rounded-lg transition-all duration-300 hover:scale-105 ${
                            isDark
                              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              : "bg-red-100 text-red-600 hover:bg-red-200"
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {savedConfigs.length === 0 && (
                    <div
                      className={`text-center py-8 ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      <div className="mb-2">No saved designs yet</div>
                      <div className="text-sm">
                        Save your first design to see it here
                      </div>
                    </div>
                  )}
                </div>

                {/* Import/Export */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={exportJSON}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                      isDark
                        ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </div>
                  </button>
                  <label
                    className={`flex-1 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 cursor-pointer ${
                      isDark
                        ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" />
                      Import
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => importJSON(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Center Panel - Visualization */}
            <div className="lg:col-span-2 space-y-8">
              {/* Canvas Area */}
              <div
                className={`rounded-2xl overflow-hidden ${
                  isDark
                    ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                    : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
                }`}
              >
                <div
                  className={`p-6 border-b ${
                    isDark ? "border-[#3f4a68]" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3
                        className={`text-xl font-bold ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {viewMode === "2d" ? "2D Layout" : "3D Visualization"}
                      </h3>
                      <p
                        className={`text-sm ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {viewMode === "2d"
                          ? "Drag and arrange components in 2D space"
                          : "Interactive 3D view with real-time visualization"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                          isDark
                            ? "bg-[#27304a] text-gray-300"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <Target className="w-3 h-3" />
                        <span className="text-xs">
                          {components.length} Components
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative" style={{ height: "500px" }}>
                  {viewMode === "2d" ? (
                    <div
                      className="absolute inset-0 cursor-crosshair bg-gradient-to-br from-transparent to-transparent"
                      style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, ${
                          isDark ? "#3f4a68" : "#e5e7eb"
                        } 1px, transparent 1px)`,
                        backgroundSize: "40px 40px",
                      }}
                      onClick={onMapClick}
                    >
                      {components.map((comp) => (
                        <DraggableComponent
                          key={comp.id}
                          component={comp}
                          isSelected={selectedId === comp.id}
                          onSelect={setSelectedId}
                          onRemove={removeComponent}
                          onUpdate={updateComponent}
                        />
                      ))}

                      {mapCoord && (
                        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div
                            className={`px-4 py-2 rounded-lg shadow-lg ${
                              isDark
                                ? "bg-black/80 text-white"
                                : "bg-white/90 text-gray-900"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {mapCoord.lat}°, {mapCoord.lng}°
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Suspense
                      fallback={
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div
                              className={`inline-block p-4 rounded-2xl ${
                                isDark ? "bg-[#27304a]" : "bg-gray-100"
                              }`}
                            >
                              <div className="text-lg font-semibold mb-2">
                                Loading 3D Visualization...
                              </div>
                              <div
                                className={`text-sm ${
                                  isDark ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                Interactive 3D rendering in progress
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                    >
                      <DataCenterScene
                        components={components}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                      />
                    </Suspense>
                  )}

                  {/* View Controls */}
                  <div
                    className={`absolute bottom-4 right-4 flex gap-2 ${
                      isDark ? "bg-black/60" : "bg-white/60"
                    } backdrop-blur-sm rounded-xl p-2`}
                  >
                    <button
                      onClick={() => setViewMode("2d")}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === "2d"
                          ? isDark
                            ? "bg-[#5ce1e5] text-white"
                            : "bg-[#0ea5e9] text-white"
                          : isDark
                            ? "text-gray-400 hover:text-white"
                            : "text-gray-600 hover:text-gray-900"
                      }`}
                      title="2D View"
                    >
                      <Grid3x3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("3d")}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === "3d"
                          ? isDark
                            ? "bg-[#5ce1e5] text-white"
                            : "bg-[#0ea5e9] text-white"
                          : isDark
                            ? "text-gray-400 hover:text-white"
                            : "text-gray-600 hover:text-gray-900"
                      }`}
                      title="3D View"
                    >
                      <Layers className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Thermal Analysis */}
                <div
                  className={`rounded-2xl p-6 ${
                    isDark
                      ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                      : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
                  }`}
                >
                  <h4
                    className={`font-bold text-lg mb-4 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Temperature Trends
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={thermalData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? "#3f4a68" : "#e5e7eb"}
                        />
                        <XAxis
                          dataKey="time"
                          stroke={isDark ? "#a1a1aa" : "#6b7280"}
                          fontSize={12}
                        />
                        <YAxis
                          stroke={isDark ? "#a1a1aa" : "#6b7280"}
                          fontSize={12}
                          label={{
                            value: "°C",
                            angle: -90,
                            position: "insideLeft",
                            style: { fill: isDark ? "#a1a1aa" : "#6b7280" },
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#1a1f3a" : "#ffffff",
                            borderColor: isDark ? "#3f4a68" : "#e5e7eb",
                            color: isDark ? "#ffffff" : "#000000",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="temp"
                          stroke={isDark ? "#5ce1e5" : "#0ea5e9"}
                          strokeWidth={2}
                          dot={{ fill: isDark ? "#5ce1e5" : "#0ea5e9" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Heat Distribution */}
                <div
                  className={`rounded-2xl p-6 ${
                    isDark
                      ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                      : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
                  }`}
                >
                  <h4
                    className={`font-bold text-lg mb-4 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Heat Distribution
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={heatDistributionData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? "#3f4a68" : "#e5e7eb"}
                        />
                        <XAxis
                          dataKey="name"
                          stroke={isDark ? "#a1a1aa" : "#6b7280"}
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          stroke={isDark ? "#a1a1aa" : "#6b7280"}
                          fontSize={12}
                          label={{
                            value: "kW",
                            angle: -90,
                            position: "insideLeft",
                            style: { fill: isDark ? "#a1a1aa" : "#6b7280" },
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#1a1f3a" : "#ffffff",
                            borderColor: isDark ? "#3f4a68" : "#e5e7eb",
                            color: isDark ? "#ffffff" : "#000000",
                          }}
                        />
                        <Bar
                          dataKey="heat"
                          fill={isDark ? "#fd5757" : "#ef4444"}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Properties & Settings */}
            <div className="space-y-8">
              {/* Selected Component Properties */}
              <div
                className={`rounded-2xl p-6 ${
                  isDark
                    ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                    : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
                }`}
              >
                <h3
                  className={`text-xl font-bold mb-6 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Component Properties
                </h3>

                {selectedId ? (
                  (() => {
                    const component = components.find(
                      (c) => c.id === selectedId,
                    );
                    if (!component) return null;

                    return (
                      <div className="space-y-6">
                        <div
                          className={`p-4 rounded-xl ${
                            isDark ? "bg-black/20" : "bg-gray-100/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className={`p-2 rounded-lg ${
                                isDark ? "bg-black/30" : "bg-gray-100"
                              }`}
                            >
                              {componentTypes.find(
                                (t) => t.type === component.type,
                              )?.icon || <Cpu className="w-5 h-5" />}
                            </div>
                            <div>
                              <div
                                className={`font-bold ${
                                  isDark ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {component.type.replace("_", " ")}
                              </div>
                              <div
                                className={`text-xs ${
                                  isDark ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                ID: {component.id}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-sm ${
                                  isDark ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                Quantity
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    updateComponent(component.id, {
                                      quantity: Math.max(
                                        1,
                                        component.quantity - 1,
                                      ),
                                    })
                                  }
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    isDark
                                      ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                                  }`}
                                >
                                  -
                                </button>
                                <span
                                  className={`w-12 text-center font-bold ${
                                    isDark ? "text-white" : "text-gray-900"
                                  }`}
                                >
                                  {component.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateComponent(component.id, {
                                      quantity: component.quantity + 1,
                                    })
                                  }
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    isDark
                                      ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                                  }`}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span
                                className={`text-sm ${
                                  isDark ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                Heat Load
                              </span>
                              <span
                                className={`font-bold ${
                                  isDark ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {DEFAULT_HEAT_LOADS[component.type] *
                                  component.quantity}{" "}
                                kW
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span
                                className={`text-sm ${
                                  isDark ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                Position
                              </span>
                              <span
                                className={`text-sm font-mono ${
                                  isDark ? "text-gray-300" : "text-gray-700"
                                }`}
                              >
                                {component.position?.x || 0},{" "}
                                {component.position?.y || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div
                            className={`text-sm font-medium mb-2 ${
                              isDark ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            Advanced Settings
                          </div>
                          <div
                            className={`text-xs mb-4 ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Manual heat load adjustment
                          </div>
                        </div>

                        <button
                          onClick={() => removeComponent(component.id)}
                          className={`w-full py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                            isDark
                              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              : "bg-red-100 text-red-600 hover:bg-red-200"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            Remove Component
                          </div>
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div
                    className={`text-center py-8 ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    <div className="mb-2">No component selected</div>
                    <div className="text-sm">
                      Click on a component to view and edit its properties
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Panel */}
              <div
                className={`rounded-2xl p-6 ${
                  isDark
                    ? "bg-gradient-to-b from-[#1a1f3a] to-[#27304a] border border-[#3f4a68]"
                    : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
                }`}
              >
                <h3
                  className={`text-xl font-bold mb-6 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Design Settings
                </h3>

                <div className="space-y-6">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Design Name
                    </label>
                    <input
                      type="text"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl transition-all ${
                        isDark
                          ? "bg-[#27304a] text-white border border-[#3f4a68] focus:border-[#5ce1e5]"
                          : "bg-gray-100 text-gray-900 border border-gray-300 focus:border-[#0ea5e9]"
                      }`}
                      placeholder="Enter design name"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Grid Size
                    </label>
                    <select
                      className={`w-full px-4 py-3 rounded-xl transition-all ${
                        isDark
                          ? "bg-[#27304a] text-white border border-[#3f4a68] focus:border-[#5ce1e5]"
                          : "bg-gray-100 text-gray-900 border border-gray-300 focus:border-[#0ea5e9]"
                      }`}
                    >
                      <option value="small">Small (10x10)</option>
                      <option value="medium" selected>
                        Medium (20x20)
                      </option>
                      <option value="large">Large (30x30)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Units
                    </label>
                    <div className="flex gap-2">
                      {["kW", "BTU/hr", "tons"].map((unit) => (
                        <button
                          key={unit}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                            unit === "kW"
                              ? isDark
                                ? "bg-[#5ce1e5] text-white"
                                : "bg-[#0ea5e9] text-white"
                              : isDark
                                ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                          }`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Auto Layout
                    </label>
                    <button
                      onClick={() => {
                        const newComponents = components.map((comp, index) => ({
                          ...comp,
                          position: {
                            x: 50 + (index % 4) * 120,
                            y: 50 + Math.floor(index / 4) * 120,
                            z: 0,
                          },
                        }));
                        setComponents(newComponents);
                      }}
                      className={`w-full py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                        isDark
                          ? "bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Arrange Components Automatically
                      </div>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-gray-700/50">
                    <button
                      onClick={() => {
                        setComponents([]);
                        setSelectedId(null);
                        setConfigName("New Design");
                      }}
                      className={`w-full py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                        isDark
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-red-100 text-red-600 hover:bg-red-200"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Clear All Components
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
};

export default DataCenterBuilder;
