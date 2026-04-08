import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { DataCenterComponent } from '../../types/simulation'

interface ThreeJSVisualizationProps {
  components: DataCenterComponent[]
  showThermal?: boolean
  thermalData?: Array<{ componentId: string; temperature: number; heatLoad: number }>
  width?: string
  height?: string
}

interface ComponentMesh {
  mesh: THREE.Mesh
  label: THREE.Sprite
  hoverLabel: HTMLDivElement | null
  temperature?: number
}

export const ThreeJSVisualization: React.FC<ThreeJSVisualizationProps> = ({
  components,
  showThermal = false,
  thermalData = [],
  width = '100%',
  height = '500px',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const componentMeshesRef = useRef<Map<string, ComponentMesh>>(new Map())
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf5f7fa)
    scene.fog = new THREE.Fog(0xf5f7fa, 50, 200)
    sceneRef.current = scene

    // Camera setup
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(20, 18, 20)
    camera.lookAt(0, 5, 0)
    cameraRef.current = camera

    // Renderer setup with better performance
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9)
    directionalLight.position.set(15, 25, 15)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.far = 100
    directionalLight.shadow.camera.left = -50
    directionalLight.shadow.camera.right = 50
    directionalLight.shadow.camera.top = 50
    directionalLight.shadow.camera.bottom = -50
    scene.add(directionalLight)

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(80, 80)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      metalness: 0.1,
      roughness: 0.8,
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // Grid helper
    const gridHelper = new THREE.GridHelper(80, 8, 0xc0c0c0, 0xd0d0d0)
    gridHelper.position.y = 0.01
    scene.add(gridHelper)

    // Component meshes with animation
    const componentMeshes = new Map<string, ComponentMesh>()
    const addedComponentIds = new Set<string>()

    components.forEach((comp, index) => {
      if (!addedComponentIds.has(comp.id)) {
        addedComponentIds.add(comp.id)

        const color = getComponentColor(comp.type)
        const geometry = getComponentGeometry(comp.type)
        const material = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.3,
          roughness: 0.6,
        })
        const mesh = new THREE.Mesh(geometry, material)

        // Position
        const spacing = 5
        const row = Math.floor(index / 5)
        const col = index % 5
        mesh.position.x = col * spacing - 10
        mesh.position.z = row * spacing - 10
        mesh.position.y = -2 // Start below ground for animation

        mesh.castShadow = true
        mesh.receiveShadow = true

        // Animate in
        const targetY = 2
        const duration = 300
        const startTime = Date.now()

        const animateIn = () => {
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          const easeOut = 1 - Math.pow(1 - progress, 3)
          mesh.position.y = -2 + (targetY + 2) * easeOut
          mesh.rotation.x = Math.random() * 0.1
          mesh.rotation.z = Math.random() * 0.1

          if (progress < 1) {
            setTimeout(animateIn, 16)
          } else {
            mesh.rotation.x = 0
            mesh.rotation.z = 0
            mesh.position.y = targetY
          }
        }
        animateIn()

        scene.add(mesh)

        // Label
        const label = createLabel(comp.type)
        label.position.copy(mesh.position)
        label.position.y += 4
        scene.add(label)

        componentMeshes.set(comp.id, {
          mesh,
          label,
          hoverLabel: null,
          temperature: thermalData.find((t) => t.componentId === comp.id)?.temperature,
        })
      }
    })

    // Remove components that are no longer in the list
    componentMeshesRef.current.forEach((component, id) => {
      if (!components.find((c) => c.id === id)) {
        scene.remove(component.mesh)
        scene.remove(component.label)
        if (component.hoverLabel) {
          document.body.removeChild(component.hoverLabel)
        }
        componentMeshesRef.current.delete(id)
      }
    })

    componentMeshesRef.current = componentMeshes

    // Update thermal colors if applicable
    if (showThermal) {
      thermalData.forEach((thermal) => {
        const componentMesh = componentMeshes.get(thermal.componentId)
        if (componentMesh) {
          const color = getTemperatureColor(thermal.temperature)
          ;(componentMesh.mesh.material as THREE.MeshStandardMaterial).color.set(color)
        }
      })
    }

    // Mouse interaction
    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }
    let cameraDistance = camera.position.length()

    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / height) * 2 + 1

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x
        const deltaY = e.clientY - previousMousePosition.y

        const direction = camera.position.clone().normalize()
        const theta = Math.atan2(direction.z, direction.x)
        const phi = Math.acos(direction.y)

        const newTheta = theta + deltaX * 0.005
        const newPhi = Math.max(0.1, Math.min(Math.PI - 0.1, phi + deltaY * 0.005))

        camera.position.x = cameraDistance * Math.sin(newPhi) * Math.cos(newTheta)
        camera.position.y = cameraDistance * Math.cos(newPhi)
        camera.position.z = cameraDistance * Math.sin(newPhi) * Math.sin(newTheta)
        camera.lookAt(0, 5, 0)
      } else {
        // Hover detection
        raycasterRef.current.setFromCamera(mouseRef.current, camera)
        const intersects = raycasterRef.current.intersectObjects(
          Array.from(componentMeshes.values()).map((c) => c.mesh)
        )

        const hoveredUuid = intersects.length > 0 ? intersects[0].object.uuid : null

        // Update hover labels
        componentMeshes.forEach((componentMesh, id) => {
          if (hoveredUuid === componentMesh.mesh.uuid) {
            if (!componentMesh.hoverLabel) {
              const label = document.createElement('div')
              label.style.position = 'fixed'
              label.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
              label.style.color = 'white'
              label.style.padding = '8px 12px'
              label.style.borderRadius = '6px'
              label.style.fontSize = '12px'
              label.style.pointerEvents = 'none'
              label.style.zIndex = '100'
              label.innerHTML = `
                <div style="font-weight: bold">${getComponentLabel(
                  components.find((c) => c.id === id)?.type || ''
                )}</div>
                <div>ID: ${id.substring(0, 8)}...</div>
                ${componentMesh.temperature ? `<div>Temp: ${componentMesh.temperature.toFixed(1)}°C</div>` : ''}
              `
              document.body.appendChild(label)
              componentMesh.hoverLabel = label
            }

            // Update label position
            const vector = componentMesh.mesh.position.clone()
            vector.project(camera)
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight
            componentMesh.hoverLabel.style.left = x + 10 + 'px'
            componentMesh.hoverLabel.style.top = y - 20 + 'px'
          } else if (componentMesh.hoverLabel) {
            document.body.removeChild(componentMesh.hoverLabel)
            componentMesh.hoverLabel = null
          }
        })
      }

      previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      isDragging = false
    }

    const onMouseWheel = (e: WheelEvent) => {
      e.preventDefault()
      const direction = camera.position.clone().normalize()
      const currentDistance = camera.position.length()

      const zoomSpeed = 1.2
      const newDistance = e.deltaY > 0 
        ? Math.min(currentDistance * zoomSpeed, 80)
        : Math.max(currentDistance / zoomSpeed, 5)

      camera.position.copy(direction.multiplyScalar(newDistance))
      cameraDistance = newDistance
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false })

    // Animation loop
    let rotationSpeed = 0.0005
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)

      // Gentle auto-rotation when not dragging
      if (!isDragging) {
        const direction = camera.position.clone().normalize()
        const theta = Math.atan2(direction.z, direction.x) + rotationSpeed
        const phi = Math.acos(direction.y)

        camera.position.x = cameraDistance * Math.sin(phi) * Math.cos(theta)
        camera.position.y = cameraDistance * Math.cos(phi)
        camera.position.z = cameraDistance * Math.sin(phi) * Math.sin(theta)
        camera.lookAt(0, 5, 0)
      }

      renderer.render(scene, camera)
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return
      const newWidth = containerRef.current.clientWidth
      const newHeight = containerRef.current.clientHeight

      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)
      renderer.domElement.removeEventListener('wheel', onMouseWheel)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Cleanup hover labels
      componentMeshes.forEach((component) => {
        if (component.hoverLabel && document.body.contains(component.hoverLabel)) {
          document.body.removeChild(component.hoverLabel)
        }
      })

      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [components, showThermal, thermalData])

  return (
    <div ref={containerRef} style={{ width, height }} className="rounded-lg overflow-hidden relative">
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-3 py-2 rounded z-10">
        <div>🖱️ Drag to rotate | 🔄 Scroll to zoom</div>
      </div>
    </div>
  )
}

function getComponentColor(type: string): number {
  const colors: Record<string, number> = {
    server_rack: 0x8b5cf6, // Purple
    router: 0x3b82f6, // Blue
    cooling_pump: 0x5ce1e5, // Cyan
    pdu: 0xfbbf24, // Yellow
    storage_array: 0xf97316, // Orange
    backup_generator: 0xef4444, // Red
    fan: 0x10b981, // Green
    chiller: 0x6366f1, // Indigo
  }
  return colors[type] || 0x6b7280
}

function getTemperatureColor(temperature: number): number {
  if (temperature < 15) return 0x3b82f6 // Blue - cool
  if (temperature < 20) return 0x10b981 // Green - optimal
  if (temperature < 27) return 0xfbbf24 // Yellow - good
  if (temperature < 32) return 0xf97316 // Orange - warm
  return 0xef4444 // Red - hot
}

function getComponentGeometry(type: string): THREE.BufferGeometry {
  switch (type) {
    case 'server_rack':
      return new THREE.BoxGeometry(2, 4, 1)
    case 'router':
      return new THREE.BoxGeometry(2, 1, 2)
    case 'cooling_pump':
      return new THREE.CylinderGeometry(0.6, 0.6, 2, 32)
    case 'pdu':
      return new THREE.BoxGeometry(1.5, 0.5, 1)
    case 'storage_array':
      return new THREE.BoxGeometry(3, 2, 1.5)
    case 'backup_generator':
      return new THREE.BoxGeometry(3, 2.5, 2)
    case 'fan':
      return new THREE.TorusGeometry(1, 0.3, 16, 100)
    case 'chiller':
      return new THREE.BoxGeometry(4, 2, 2)
    default:
      return new THREE.BoxGeometry(1, 1, 1)
  }
}


function getComponentLabel(type: string): string {
  const labels: Record<string, string> = {
    server_rack: 'Server Rack',
    router: 'Router',
    cooling_pump: 'Cooling Pump',
    pdu: 'PDU',
    storage_array: 'Storage Array',
    backup_generator: 'Generator',
    fan: 'Fan',
    chiller: 'Chiller',
  }
  return labels[type] || type
}

function createLabel(type: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const context = canvas.getContext('2d')!

  context.fillStyle = 'rgba(0, 0, 0, 0.7)'
  context.fillRect(0, 0, 256, 64)
  context.strokeStyle = 'rgba(92, 225, 229, 0.8)'
  context.lineWidth = 2
  context.strokeRect(0, 0, 256, 64)

  context.fillStyle = '#5ce1e5'
  context.font = 'bold 28px Arial'
  context.textAlign = 'center'
  context.fillText(getComponentLabel(type), 128, 45)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(5, 1.25, 1)

  return sprite
}
