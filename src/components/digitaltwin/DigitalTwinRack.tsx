import { useRef, useState } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  position: [number, number, number];
  id: string;
  temp?: number;
  power?: number;
  utilization?: number;
  onClick?: (info: any) => void;
}

export default function DigitalTwinRack({ position, id, temp, power, utilization, onClick }: Props) {
  const { scene } = useGLTF("/models/server_rack.glb");
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const cloned = scene.clone(true);

  // Temperature-based emissive tint
  const getColor = (t?: number) => {
    if (t == null) return "#8b5cf6";
    if (t < 20) return "#10b981";
    if (t < 27) return "#fbbf24";
    if (t < 32) return "#f97316";
    return "#ef4444";
  };
  const color = getColor(temp);

  // Apply emissive color to all meshes
  cloned.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const mat = child.material.clone();
      mat.emissive = new THREE.Color(color);
      mat.emissiveIntensity = hovered ? 0.4 : 0.12;
      child.material = mat;
    }
  });

  useFrame(() => {
    if (groupRef.current) {
      const target = hovered ? 1.06 : 1.0;
      groupRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => onClick?.({ type: "rack", id, temp, power, utilization, color })}
      style={{ cursor: "pointer" }}
    >
      <primitive object={cloned} scale={[1, 1, 1]} />

      {/* Status light on top */}
      <mesh position={[0, 2.6, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>

      {hovered && (
        <Html position={[0, 3.2, 0]} center distanceFactor={12}>
          <div style={{
            background: "rgba(10,14,39,0.95)",
            border: `1px solid ${color}`,
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            minWidth: 130,
            pointerEvents: "none",
            boxShadow: `0 0 12px ${color}60`,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color }}>{id}</div>
            {temp != null && <div>🌡 {temp.toFixed(1)}°C</div>}
            {power != null && <div>⚡ {Number(power).toFixed(1)} kW</div>}
            {utilization != null && <div>📊 {utilization.toFixed(0)}% util</div>}
          </div>
        </Html>
      )}
    </group>
  );
}

useGLTF.preload("/models/server_rack.glb");
