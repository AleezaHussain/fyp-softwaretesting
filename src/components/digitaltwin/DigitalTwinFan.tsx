import { useRef, useState } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  position: [number, number, number];
  id: string;
  speed?: number; // RPM
  onClick?: (info: any) => void;
}

export default function DigitalTwinFan({ position, id, speed = 900, onClick }: Props) {
  const { scene } = useGLTF("/models/fan.glb");
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const cloned = scene.clone(true);

  // Spin speed: RPM → radians per frame (60fps assumed)
  const radsPerFrame = (speed / 60) * (2 * Math.PI) / 60;

  const statusColor = speed > 1000 ? "#10b981" : speed > 700 ? "#fbbf24" : "#f97316";

  useFrame(() => {
    if (spinRef.current) {
      spinRef.current.rotation.z += radsPerFrame;
    }
    if (groupRef.current) {
      const target = hovered ? 1.08 : 1.0;
      groupRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => onClick?.({ type: "fan", id, speed, color: statusColor })}
    >
      {/* Static body */}
      <primitive object={cloned} scale={[0.8, 0.8, 0.8]} />

      {/* Spinning indicator ring */}
      <group ref={spinRef} position={[0, 0.5, 0.3]}>
        <mesh>
          <torusGeometry args={[0.3, 0.04, 8, 24]} />
          <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Status light */}
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2} />
      </mesh>

      {hovered && (
        <Html position={[0, 2.2, 0]} center distanceFactor={12}>
          <div style={{
            background: "rgba(10,14,39,0.95)",
            border: `1px solid ${statusColor}`,
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            minWidth: 120,
            pointerEvents: "none",
            boxShadow: `0 0 12px ${statusColor}60`,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: statusColor }}>{id}</div>
            <div>🌀 {speed} RPM</div>
            <div style={{ color: statusColor, fontSize: 11, marginTop: 2 }}>
              {speed > 1000 ? "High Speed" : speed > 700 ? "Normal" : "Low Speed"}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

useGLTF.preload("/models/fan.glb");
