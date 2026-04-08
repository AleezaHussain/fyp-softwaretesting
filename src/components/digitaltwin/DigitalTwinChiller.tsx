import { useRef, useState } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  position: [number, number, number];
  id: string;
  temp?: number;
  coolingKW?: number;
  onClick?: (info: any) => void;
}

export default function DigitalTwinChiller({ position, id, temp, coolingKW, onClick }: Props) {
  const { scene } = useGLTF("/models/chiller.glb");
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const cloned = scene.clone(true);

  const color = temp != null && temp < 10 ? "#5ce1e5" : temp != null && temp < 15 ? "#3b82f6" : "#8b5cf6";

  cloned.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const mat = child.material.clone();
      mat.emissive = new THREE.Color(color);
      mat.emissiveIntensity = hovered ? 0.35 : 0.1;
      child.material = mat;
    }
  });

  useFrame(() => {
    if (groupRef.current) {
      const target = hovered ? 1.05 : 1.0;
      groupRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => onClick?.({ type: "chiller", id, temp, coolingKW, color })}
    >
      <primitive object={cloned} scale={[1.2, 1.2, 1.2]} />

      {/* Cooling pipe glow */}
      <mesh position={[0, 0.8, 0.6]}>
        <cylinderGeometry args={[0.06, 0.06, 1.6, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} transparent opacity={0.7} />
      </mesh>

      {/* Status light */}
      <mesh position={[0, 3.0, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>

      {hovered && (
        <Html position={[0, 3.8, 0]} center distanceFactor={12}>
          <div style={{
            background: "rgba(10,14,39,0.95)",
            border: `1px solid ${color}`,
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            minWidth: 140,
            pointerEvents: "none",
            boxShadow: `0 0 12px ${color}60`,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color }}>{id}</div>
            {temp != null && <div>❄️ Supply: {temp.toFixed(1)}°C</div>}
            {coolingKW != null && <div>⚡ {coolingKW.toFixed(1)} kW cooling</div>}
          </div>
        </Html>
      )}
    </group>
  );
}

useGLTF.preload("/models/chiller.glb");
