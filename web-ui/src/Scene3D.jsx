import { Canvas } from '@react-three/fiber'
import { OrbitControls, Box, Cylinder, Plane } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

function Server({ position, heat }) {
  const color = new THREE.Color()
  color.setHSL(0.6 - heat * 0.6, 1, 0.5)
  return (
    <group position={position}>
      <Box args={[0.4, 0.05, 0.6]}>
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </Box>
      <Box args={[0.35, 0.02, 0.55]} position={[0, 0.03, 0]}>
        <meshStandardMaterial color="#333" metalness={0.9} roughness={0.1} />
      </Box>
    </group>
  )
}

function Rack({ position, heat }) {
  const servers = []
  for (let i = 0; i < 10; i++) {
    servers.push(<Server key={i} position={[0, -0.45 + i * 0.1, 0]} heat={heat} />)
  }
  return (
    <group position={position}>
      <Box args={[0.6, 2, 0.8]}>
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </Box>
      {servers}
    </group>
  )
}

function CRACUnit({ position }) {
  return (
    <group position={position}>
      <Box args={[3, 2, 2]}>
        <meshStandardMaterial color="#4a90e2" metalness={0.6} roughness={0.4} />
      </Box>
      <Cylinder args={[0.3, 0.3, 0.1]} position={[0, 1.1, 0]}>
        <meshStandardMaterial color="#87ceeb" metalness={0.8} roughness={0.2} />
      </Cylinder>
    </group>
  )
}

function CRAHUnit({ position }) {
  return (
    <group position={position}>
      <Box args={[2.5, 1.8, 1.5]}>
        <meshStandardMaterial color="#50c878" metalness={0.6} roughness={0.4} />
      </Box>
    </group>
  )
}

function RaisedFloor() {
  return (
    <Plane args={[50, 50]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <meshStandardMaterial color="#e0e0e0" metalness={0.3} roughness={0.8} />
    </Plane>
  )
}

function AirParticle({ from, to }) {
  const points = useMemo(() => [new THREE.Vector3(...from), new THREE.Vector3(...to)], [from, to])
  return (
    <line>
      <bufferGeometry attach="geometry" {...new THREE.BufferGeometry().setFromPoints(points)} />
      <lineBasicMaterial color="#87ceeb" opacity={0.3} transparent />
    </line>
  )
}

function DataCenterScene({ result, selectedHour, form }) {
  const racks = []
  const rackCount = form ? form.racks : 5
  const cols = Math.ceil(Math.sqrt(rackCount))
  const rows = Math.ceil(rackCount / cols)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      if (idx >= rackCount) break
      const x = (c - cols / 2) * 3
      const z = (r - rows / 2) * 4
      const heat = result && result.hours[selectedHour] ? (result.hours[selectedHour].it_kW / 500) : 0.2
      racks.push({ position: [x, 0, z], heat })
    }
  }

  const coolingUnits = [
    { position: [0, 0.75, -rows * 3], type: 'CRAC' },
    { position: [-cols * 2, 0.75, 0], type: 'CRAH' },
    { position: [cols * 2, 0.75, 0], type: 'CRAH' },
  ]

  const airflowLines = coolingUnits.flatMap(unit =>
    racks.slice(0, 3).map(rack => ({ from: unit.position, to: rack.position }))
  )

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-10, 8, -10]} intensity={0.5} />
      <pointLight position={[10, 8, 10]} intensity={0.5} />
      
      <RaisedFloor />
      {racks.map((rack, i) => <Rack key={i} {...rack} />)}
      {coolingUnits.map((unit, i) => 
        unit.type === 'CRAC' ? <CRACUnit key={i} position={unit.position} /> : <CRAHUnit key={i} position={unit.position} />
      )}
      {airflowLines.map((line, i) => <AirParticle key={i} {...line} />)}
    </>
  )
}

export default function Scene3D({ result, selectedHour, form }) {
  return (
    <div style={{ width: '100%', maxWidth: 800, height: 400, border: '1px solid #ccc', margin: '20px auto' }}>
      <Canvas camera={{ position: [0, 8, 12], fov: 50 }} shadows>
        <DataCenterScene result={result} selectedHour={selectedHour} form={form} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  )
}
