import { Suspense, useRef, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Grid,
  Html,
  useGLTF,
  PerspectiveCamera,
  Stars,
} from "@react-three/drei";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import DigitalTwinRack from "./DigitalTwinRack";
import DigitalTwinFan from "./DigitalTwinFan";
import DigitalTwinChiller from "./DigitalTwinChiller";

// ─── PDU model ────────────────────────────────────────────────────────────────
function PDUModel({ position, id, onClick }: any) {
  const { scene } = useGLTF("/models/pdu.glb");
  const cloned = scene.clone(true);
  const [hovered, setHovered] = useState(false);
  return (
    <group
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => onClick?.({ type: "pdu", id })}
    >
      <primitive object={cloned} scale={[0.9, 0.9, 0.9]} />
      {hovered && (
        <Html position={[0, 2, 0]} center distanceFactor={12}>
          <div style={{ background: "rgba(10,14,39,0.95)", border: "1px solid #fbbf24", color: "#fff", padding: "6px 10px", borderRadius: 8, fontSize: 12, pointerEvents: "none" }}>
            <b style={{ color: "#fbbf24" }}>{id}</b><br />Power Distribution Unit
          </div>
        </Html>
      )}
    </group>
  );
}
useGLTF.preload("/models/pdu.glb");

// ─── Router model ─────────────────────────────────────────────────────────────
function RouterModel({ position, id, onClick }: any) {
  const { scene } = useGLTF("/models/router.glb");
  const cloned = scene.clone(true);
  const [hovered, setHovered] = useState(false);
  return (
    <group
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => onClick?.({ type: "router", id })}
    >
      <primitive object={cloned} scale={[0.8, 0.8, 0.8]} />
      {hovered && (
        <Html position={[0, 1.5, 0]} center distanceFactor={12}>
          <div style={{ background: "rgba(10,14,39,0.95)", border: "1px solid #5ce1e5", color: "#fff", padding: "6px 10px", borderRadius: 8, fontSize: 12, pointerEvents: "none" }}>
            <b style={{ color: "#5ce1e5" }}>{id}</b><br />Network Router
          </div>
        </Html>
      )}
    </group>
  );
}
useGLTF.preload("/models/router.glb");

// ─── Airflow particle stream ──────────────────────────────────────────────────
function AirflowParticles({ from, to, color = "#5ce1e5", count = 12 }: any) {
  const ref = useRef<THREE.Points>(null);
  const positions = useRef(
    new Float32Array(count * 3).map((_, i) => {
      const t = i / count;
      return from[i % 3] + (to[i % 3] - from[i % 3]) * t + (Math.random() - 0.5) * 0.5;
    })
  );
  const speeds = useRef(new Float32Array(count).map(() => 0.01 + Math.random() * 0.02));
  const progress = useRef(new Float32Array(count).map(() => Math.random()));

  useFrame(() => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      progress.current[i] += speeds.current[i];
      if (progress.current[i] > 1) progress.current[i] = 0;
      const t = progress.current[i];
      pos[i * 3]     = from[0] + (to[0] - from[0]) * t + Math.sin(t * Math.PI * 4 + i) * 0.15;
      pos[i * 3 + 1] = from[1] + (to[1] - from[1]) * t + Math.cos(t * Math.PI * 3 + i) * 0.1;
      pos[i * 3 + 2] = from[2] + (to[2] - from[2]) * t;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={color} size={0.08} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// ─── Scene content ────────────────────────────────────────────────────────────
function DataCenterScene({ components, onSelect }: { components: any[]; onSelect: (info: any) => void }) {
  const racks    = components.filter(c => c.type === "server_rack");
  const fans     = components.filter(c => c.type === "fan");
  const chillers = components.filter(c => c.type === "chiller");
  const pdus     = components.filter(c => c.type === "pdu");
  const routers  = components.filter(c => c.type === "router");

  // Layout constants
  const RACK_SPACING = 3.2;
  const ROW_DEPTH = 5;
  const totalRackWidth = Math.max(racks.length * RACK_SPACING, 8);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[15, 25, 10]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-10, 15, -10]} intensity={0.4} color="#5ce1e5" />
      <pointLight position={[0, 8, 0]} intensity={0.6} color="#ffffff" />

      {/* Environment */}
      <Environment preset="warehouse" />
      <Stars radius={80} depth={40} count={800} factor={3} fade speed={0.5} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[totalRackWidth + 20, 30]} />
        <meshStandardMaterial color="#0d1230" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Floor grid */}
      <Grid
        position={[0, 0, 0]}
        args={[totalRackWidth + 20, 30]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#1a2040"
        sectionSize={4}
        sectionThickness={0.8}
        sectionColor="#3f4a68"
        fadeDistance={40}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Ceiling lights strip */}
      {Array.from({ length: Math.ceil(totalRackWidth / 4) + 1 }).map((_, i) => (
        <group key={i} position={[i * 4 - totalRackWidth / 2, 6, 0]}>
          <mesh>
            <boxGeometry args={[0.1, 0.1, 3]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>
          <pointLight position={[0, -0.5, 0]} intensity={0.3} color="#e0f0ff" distance={8} />
        </group>
      ))}

      {/* Server Racks — two rows (hot aisle / cold aisle) */}
      {racks.map((rack, i) => {
        const row = i < Math.ceil(racks.length / 2) ? 0 : 1;
        const col = row === 0 ? i : i - Math.ceil(racks.length / 2);
        const x = col * RACK_SPACING - (Math.ceil(racks.length / 2) - 1) * RACK_SPACING / 2;
        const z = row === 0 ? -ROW_DEPTH / 2 : ROW_DEPTH / 2;
        return (
          <DigitalTwinRack
            key={rack.id}
            position={[x, 0, z]}
            id={rack.id}
            temp={rack.temp}
            power={rack.power}
            utilization={rack.utilization}
            onClick={onSelect}
          />
        );
      })}

      {/* Fans — between the two rack rows (hot aisle) */}
      {fans.map((fan, i) => {
        const x = i * 2.5 - (fans.length - 1) * 1.25;
        return (
          <DigitalTwinFan
            key={fan.id}
            position={[x, 0, 0]}
            id={fan.id}
            speed={fan.speed}
            onClick={onSelect}
          />
        );
      })}

      {/* Chillers — back wall */}
      {chillers.map((chiller, i) => {
        const x = i * 5 - (chillers.length - 1) * 2.5;
        return (
          <DigitalTwinChiller
            key={chiller.id}
            position={[x, 0, -ROW_DEPTH - 3]}
            id={chiller.id}
            temp={chiller.temp}
            coolingKW={chiller.coolingKW}
            onClick={onSelect}
          />
        );
      })}

      {/* PDUs — side wall */}
      {pdus.map((pdu, i) => (
        <PDUModel
          key={pdu.id}
          position={[totalRackWidth / 2 + 1.5, 0, i * 3 - (pdus.length - 1) * 1.5]}
          id={pdu.id}
          onClick={onSelect}
        />
      ))}

      {/* Routers — side wall */}
      {routers.map((router, i) => (
        <RouterModel
          key={router.id}
          position={[-totalRackWidth / 2 - 1.5, 0, i * 3 - (routers.length - 1) * 1.5]}
          id={router.id}
          onClick={onSelect}
        />
      ))}

      {/* Airflow particles from fans to racks */}
      {fans.length > 0 && racks.length > 0 && (
        <AirflowParticles
          from={[0, 1, 0]}
          to={[0, 1, -ROW_DEPTH / 2]}
          color="#5ce1e5"
          count={20}
        />
      )}

      {/* Chiller coolant flow */}
      {chillers.length > 0 && (
        <AirflowParticles
          from={[0, 0.5, -ROW_DEPTH - 3]}
          to={[0, 0.5, -ROW_DEPTH / 2]}
          color="#3b82f6"
          count={16}
        />
      )}

      {/* Room label */}
      <Html position={[0, 7, 0]} center>
        <div style={{
          color: "rgba(92,225,229,0.7)",
          fontSize: 11,
          fontFamily: "monospace",
          letterSpacing: 3,
          textTransform: "uppercase",
          pointerEvents: "none",
        }}>
          Data Center — Digital Twin
        </div>
      </Html>
    </>
  );
}

// ─── Info panel ───────────────────────────────────────────────────────────────
function InfoPanel({ selected, onClose, isDark }: { selected: any; onClose: () => void; isDark: boolean }) {
  if (!selected) return null;

  const typeLabels: Record<string, string> = {
    rack: "Server Rack",
    fan: "Cooling Fan",
    chiller: "Chiller Unit",
    pdu: "Power Distribution Unit",
    router: "Network Router",
  };

  const typeIcons: Record<string, string> = {
    rack: "🖥️",
    fan: "🌀",
    chiller: "❄️",
    pdu: "⚡",
    router: "🌐",
  };

  return (
    <div style={{
      position: "absolute",
      top: 16,
      right: 16,
      width: 260,
      background: isDark ? "rgba(10,14,39,0.97)" : "rgba(255,255,255,0.97)",
      border: `1px solid ${selected.color ?? "#5ce1e5"}`,
      borderRadius: 12,
      padding: 16,
      color: isDark ? "#fff" : "#1a1f3a",
      boxShadow: `0 0 24px ${selected.color ?? "#5ce1e5"}40`,
      zIndex: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{typeIcons[selected.type] ?? "📦"}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: selected.color ?? "#5ce1e5" }}>{selected.id}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{typeLabels[selected.type] ?? selected.type}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: isDark ? "#9ca3af" : "#6b7280", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {selected.temp != null && (
          <Row label="Temperature" value={`${Number(selected.temp).toFixed(1)}°C`} color={selected.color} isDark={isDark} />
        )}
        {selected.power != null && (
          <Row label="IT Power" value={`${Number(selected.power).toFixed(1)} kW`} color="#fbbf24" isDark={isDark} />
        )}
        {selected.utilization != null && (
          <Row label="Utilization" value={`${Number(selected.utilization).toFixed(0)}%`} color="#10b981" isDark={isDark} />
        )}
        {selected.speed != null && (
          <Row label="Fan Speed" value={`${selected.speed} RPM`} color="#10b981" isDark={isDark} />
        )}
        {selected.coolingKW != null && (
          <Row label="Cooling Power" value={`${Number(selected.coolingKW).toFixed(1)} kW`} color="#3b82f6" isDark={isDark} />
        )}
      </div>

      {/* Status indicator */}
      <div style={{
        marginTop: 12,
        padding: "6px 10px",
        borderRadius: 6,
        background: `${selected.color ?? "#5ce1e5"}15`,
        border: `1px solid ${selected.color ?? "#5ce1e5"}30`,
        fontSize: 11,
        color: selected.color ?? "#5ce1e5",
        textAlign: "center",
      }}>
        ● Operational
      </div>
    </div>
  );
}

function Row({ label, value, color, isDark }: any) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "5px 8px",
      borderRadius: 6,
      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
    }}>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend({ isDark }: { isDark: boolean }) {
  return (
    <div style={{
      position: "absolute",
      bottom: 16,
      left: 16,
      background: isDark ? "rgba(10,14,39,0.92)" : "rgba(255,255,255,0.92)",
      border: "1px solid rgba(92,225,229,0.3)",
      borderRadius: 10,
      padding: "10px 14px",
      color: isDark ? "#e2e8f0" : "#1a1f3a",
      fontSize: 11,
      zIndex: 10,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#5ce1e5" }}>Temperature Legend</div>
      {[
        { color: "#10b981", label: "Cool  < 20°C" },
        { color: "#fbbf24", label: "Normal  20–27°C" },
        { color: "#f97316", label: "Warm  27–32°C" },
        { color: "#ef4444", label: "Hot  > 32°C" },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 4px ${color}` }} />
          <span>{label}</span>
        </div>
      ))}
      <div style={{ marginTop: 8, opacity: 0.5, fontSize: 10 }}>Click any component for details</div>
    </div>
  );
}

// ─── Controls hint ────────────────────────────────────────────────────────────
function ControlsHint({ isDark }: { isDark: boolean }) {
  return (
    <div style={{
      position: "absolute",
      bottom: 16,
      right: 16,
      background: isDark ? "rgba(10,14,39,0.85)" : "rgba(255,255,255,0.85)",
      border: "1px solid rgba(63,74,104,0.5)",
      borderRadius: 8,
      padding: "8px 12px",
      color: isDark ? "#9ca3af" : "#6b7280",
      fontSize: 10,
      zIndex: 10,
      lineHeight: 1.8,
    }}>
      🖱 Drag to orbit &nbsp;|&nbsp; Scroll to zoom &nbsp;|&nbsp; Right-drag to pan
    </div>
  );
}

// ─── Component counter bar ────────────────────────────────────────────────────
function ComponentBar({ components, isDark }: { components: any[]; isDark: boolean }) {
  const counts = {
    racks:    components.filter(c => c.type === "server_rack").length,
    fans:     components.filter(c => c.type === "fan").length,
    chillers: components.filter(c => c.type === "chiller").length,
    pdus:     components.filter(c => c.type === "pdu").length,
    routers:  components.filter(c => c.type === "router").length,
  };

  return (
    <div style={{
      position: "absolute",
      top: 16,
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: 8,
      background: isDark ? "rgba(10,14,39,0.92)" : "rgba(255,255,255,0.92)",
      border: "1px solid rgba(92,225,229,0.25)",
      borderRadius: 10,
      padding: "8px 14px",
      zIndex: 10,
    }}>
      {[
        { icon: "🖥️", label: "Racks",    count: counts.racks,    color: "#8b5cf6" },
        { icon: "🌀", label: "Fans",     count: counts.fans,     color: "#10b981" },
        { icon: "❄️", label: "Chillers", count: counts.chillers, color: "#3b82f6" },
        { icon: "⚡", label: "PDUs",     count: counts.pdus,     color: "#fbbf24" },
        { icon: "🌐", label: "Routers",  count: counts.routers,  color: "#5ce1e5" },
      ].map(({ icon, label, count, color }) => (
        <div key={label} style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "4px 10px",
          borderRadius: 6,
          background: count > 0 ? `${color}15` : "transparent",
          opacity: count > 0 ? 1 : 0.35,
          minWidth: 52,
        }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color, lineHeight: 1 }}>{count}</span>
          <span style={{ fontSize: 9, color: isDark ? "#9ca3af" : "#6b7280" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function DigitalTwin3D({ config, isDark = true }: { config: any; isDark?: boolean }) {
  const [selected, setSelected] = useState<any>(null);

  // Build components array from config
  const components: any[] = (() => {
    if (Array.isArray(config?.components)) return config.components;

    const list: any[] = [];
    const numRacks = config?.numberOfRacks ?? 0;
    const avgUtil  = config?.averageUtilization ?? 60;
    const itKW     = config?.totalITLoadKW ?? config?.itPowerKW ?? 0;

    for (let i = 0; i < numRacks; i++) {
      list.push({
        id: `Rack-${String(i + 1).padStart(2, "0")}`,
        type: "server_rack",
        temp: 20 + (avgUtil / 100) * 15 + (Math.random() - 0.5) * 4,
        power: itKW > 0 ? itKW / numRacks : undefined,
        utilization: avgUtil + (Math.random() - 0.5) * 10,
      });
    }

    const fans = config?.fans ?? {};
    const fanDefs = [
      { qty: fans.bestQuantity ?? fans.bestFans ?? 0,    speed: 1200, prefix: "Fan-Hi" },
      { qty: fans.averageQuantity ?? fans.averageFans ?? 0, speed: 900, prefix: "Fan-Md" },
      { qty: fans.legacyQuantity ?? fans.oldFans ?? 0,   speed: 600, prefix: "Fan-Lo" },
    ];
    fanDefs.forEach(({ qty, speed, prefix }) => {
      for (let i = 0; i < qty; i++) {
        list.push({ id: `${prefix}-${i + 1}`, type: "fan", speed });
      }
    });

    if (config?.totalCoolingPowerKW || config?.chilledWaterConfig) {
      list.push({
        id: "Chiller-01",
        type: "chiller",
        temp: config?.chilledWaterConfig?.supplyWaterTempC ?? 7,
        coolingKW: config?.totalCoolingPowerKW,
      });
    }

    if (numRacks > 0) {
      list.push({ id: "PDU-01", type: "pdu" });
      list.push({ id: "Router-01", type: "router" });
    }

    return list;
  })();

  const handleSelect = useCallback((info: any) => {
    setSelected(prev => prev?.id === info.id ? null : info);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: isDark ? "#050810" : "#1a1f3a" }}
      >
        <PerspectiveCamera makeDefault position={[18, 14, 18]} fov={50} />
        <Suspense fallback={
          <Html center>
            <div style={{ color: "#5ce1e5", fontSize: 14, fontFamily: "monospace" }}>
              Loading 3D models…
            </div>
          </Html>
        }>
          <DataCenterScene components={components} onSelect={handleSelect} />
        </Suspense>
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={4}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 1, 0]}
        />
      </Canvas>

      {/* Overlay UI */}
      <ComponentBar components={components} isDark={isDark} />
      <InfoPanel selected={selected} onClose={() => setSelected(null)} isDark={isDark} />
      <Legend isDark={isDark} />
      <ControlsHint isDark={isDark} />
    </div>
  );
}
