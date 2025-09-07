# System Patterns - Architecture & Design Decisions

## Core Architecture Pattern: Entity-Component-System (ECS)

### Why ECS?
- **Performance**: Cache-friendly data layout for 10,000+ particles
- **Flexibility**: Mix and match behaviors without inheritance hell
- **Parallelization**: Systems can run independently on GPU/CPU
- **Maintainability**: Clear separation of data and logic

### ECS Implementation
```javascript
// Entity: Just an ID
Entity = { id: UUID }

// Components: Pure data containers
PositionComponent = { x, y, z }
VelocityComponent = { vx, vy, vz }
MassComponent = { mass, charge }
LiquidTypeComponent = { type: PLASMA|CRYSTAL|... }
VisualComponent = { color, size, glow, trail }

// Systems: Logic processors
GravitySystem: processes(Position, Velocity, Mass)
ElectromagneticSystem: processes(Position, Velocity, Mass.charge)
RenderSystem: processes(Position, Visual)
```

## Physics Architecture Patterns

### Barnes-Hut Octree Pattern
```javascript
class OctreeNode {
  // Spatial subdivision for O(n log n) gravity
  bounds: BoundingBox
  centerOfMass: Vector3
  totalMass: number
  children: OctreeNode[8] | null
  particle: Particle | null
  
  shouldSubdivide(particle) {
    return this.particle && !this.children
  }
  
  calculateForce(particle, theta = 0.5) {
    const distance = particle.position.distanceTo(this.centerOfMass)
    const size = this.bounds.size
    
    if (size / distance < theta) {
      // Treat as single mass
      return this.calculateDirectForce(particle)
    } else {
      // Recurse into children
      return this.children.reduce((force, child) => 
        force.add(child.calculateForce(particle, theta)), 
        new Vector3()
      )
    }
  }
}
```

### Force Generator Pattern
```javascript
// Strategy pattern for different force types
interface ForceGenerator {
  calculateForce(particle: Particle, neighbors: Particle[]): Vector3
}

class GravityForce implements ForceGenerator {
  calculateForce(particle, neighbors) {
    // Newton's law: F = GMm/r²
  }
}

class LorentzForce implements ForceGenerator {
  calculateForce(particle, neighbors) {
    // F = q(E + v × B)
  }
}

class QuantumForce implements ForceGenerator {
  calculateForce(particle, neighbors) {
    // Heisenberg uncertainty + tunneling probability
  }
}
```

### Integration Pattern
```javascript
// Configurable integration methods
class IntegratorChain {
  integrators = {
    verlet: new VerletIntegrator(),    // Stable, energy-conserving
    rk4: new RungeKutta4(),             // High accuracy
    euler: new EulerIntegrator()        // Fast, less accurate
  }
  
  integrate(particles, dt, method = 'verlet') {
    return this.integrators[method].integrate(particles, dt)
  }
}

// Verlet integration (position-based, stable)
class VerletIntegrator {
  integrate(particles, dt) {
    particles.forEach(p => {
      const acceleration = p.force.divideScalar(p.mass)
      const newPos = p.position
        .add(p.velocity.multiplyScalar(dt))
        .add(acceleration.multiplyScalar(0.5 * dt * dt))
      
      p.previousPosition = p.position.clone()
      p.position = newPos
      p.velocity = newPos.sub(p.previousPosition).divideScalar(dt)
    })
  }
}
```

## Rendering Patterns

### GPU Instancing Pattern
```javascript
class InstancedParticleRenderer {
  // Single draw call for all particles
  geometry: THREE.InstancedBufferGeometry
  material: THREE.ShaderMaterial
  
  constructor(maxParticles = 10000) {
    // Pre-allocate buffers
    this.positions = new Float32Array(maxParticles * 3)
    this.velocities = new Float32Array(maxParticles * 3)
    this.colors = new Float32Array(maxParticles * 4)
    this.sizes = new Float32Array(maxParticles)
    
    // Instance attributes
    this.geometry.setAttribute('instancePosition', 
      new THREE.InstancedBufferAttribute(this.positions, 3))
    this.geometry.setAttribute('instanceVelocity',
      new THREE.InstancedBufferAttribute(this.velocities, 3))
  }
  
  update(particles) {
    // Update GPU buffers
    particles.forEach((p, i) => {
      this.positions[i * 3] = p.position.x
      this.positions[i * 3 + 1] = p.position.y
      this.positions[i * 3 + 2] = p.position.z
    })
    
    this.geometry.attributes.instancePosition.needsUpdate = true
  }
}
```

### Multi-Pass Rendering Pipeline
```javascript
class RenderPipeline {
  passes = [
    new GeometryPass(),      // Render particles to G-buffer
    new LightingPass(),      // Calculate illumination
    new BloomPass(),         // HDR bloom effect
    new ChromaticPass(),     // Chromatic aberration
    new CompositePass()      // Final composition
  ]
  
  render(scene, camera) {
    let result = null
    
    this.passes.forEach(pass => {
      result = pass.render(scene, camera, result)
    })
    
    return result
  }
}
```

### Level of Detail (LOD) Pattern
```javascript
class LODManager {
  levels = [
    { distance: 0,    quality: 'ultra',  particleScale: 1.0 },
    { distance: 100,  quality: 'high',   particleScale: 0.8 },
    { distance: 500,  quality: 'medium', particleScale: 0.5 },
    { distance: 1000, quality: 'low',    particleScale: 0.3 }
  ]
  
  getQuality(particle, camera) {
    const distance = particle.position.distanceTo(camera.position)
    
    for (const level of this.levels) {
      if (distance <= level.distance) {
        return level
      }
    }
    
    return this.levels[this.levels.length - 1]
  }
}
```

## Memory Management Patterns

### Object Pool Pattern
```javascript
class ParticlePool {
  available: Particle[] = []
  active: Particle[] = []
  
  constructor(size = 10000) {
    // Pre-allocate all particles
    for (let i = 0; i < size; i++) {
      this.available.push(new Particle())
    }
  }
  
  acquire() {
    if (this.available.length > 0) {
      const particle = this.available.pop()
      this.active.push(particle)
      return particle.reset()
    }
    return null // Pool exhausted
  }
  
  release(particle) {
    const index = this.active.indexOf(particle)
    if (index !== -1) {
      this.active.splice(index, 1)
      this.available.push(particle)
    }
  }
}
```

### Typed Array Pattern
```javascript
class ParticleData {
  // Structure of Arrays (SoA) for cache efficiency
  positions: Float32Array     // [x0,y0,z0, x1,y1,z1, ...]
  velocities: Float32Array    // [vx0,vy0,vz0, vx1,vy1,vz1, ...]
  masses: Float32Array        // [m0, m1, m2, ...]
  charges: Float32Array       // [q0, q1, q2, ...]
  
  constructor(maxParticles) {
    this.positions = new Float32Array(maxParticles * 3)
    this.velocities = new Float32Array(maxParticles * 3)
    this.masses = new Float32Array(maxParticles)
    this.charges = new Float32Array(maxParticles)
  }
  
  // Direct memory access, no object overhead
  getPosition(index) {
    const i = index * 3
    return [
      this.positions[i],
      this.positions[i + 1],
      this.positions[i + 2]
    ]
  }
}
```

## Event System Pattern

### Observer Pattern for Achievements
```javascript
class EventBus {
  listeners = new Map()
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data))
    }
  }
}

// Achievement tracking
eventBus.on('particle.created', (data) => {
  if (data.count >= 1000) {
    unlockAchievement('thousand_particles')
  }
})

eventBus.on('blackhole.created', (data) => {
  unlockAchievement('event_horizon')
})
```

## State Management Pattern

### Command Pattern for Undo/Redo
```javascript
class Command {
  execute() { throw new Error('Must implement') }
  undo() { throw new Error('Must implement') }
}

class CreateParticlesCommand extends Command {
  constructor(particles) {
    this.particles = particles
  }
  
  execute(scene) {
    this.particles.forEach(p => scene.add(p))
  }
  
  undo(scene) {
    this.particles.forEach(p => scene.remove(p))
  }
}

class CommandHistory {
  history: Command[] = []
  currentIndex = -1
  
  execute(command) {
    // Remove any commands after current
    this.history = this.history.slice(0, this.currentIndex + 1)
    
    command.execute()
    this.history.push(command)
    this.currentIndex++
  }
  
  undo() {
    if (this.currentIndex >= 0) {
      this.history[this.currentIndex].undo()
      this.currentIndex--
    }
  }
}
```

## UI Pattern: Holographic Interface

### Component-Based UI Architecture
```javascript
class HolographicPanel {
  // Animated, glowing UI panels in 3D space
  mesh: THREE.Mesh
  animations: Animation[]
  
  constructor(options) {
    // Glass-like material with glow
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.8 },
        glowColor: { value: new THREE.Color(0x00ffff) }
      },
      vertexShader: hologramVertexShader,
      fragmentShader: hologramFragmentShader,
      transparent: true
    })
  }
  
  pulse() {
    // Quantum fluctuation effect
    gsap.to(this.material.uniforms.opacity, {
      value: 1.0,
      duration: 0.5,
      ease: "power2.inOut",
      yoyo: true,
      repeat: 1
    })
  }
}
```

## Audio Pattern: Procedural Synthesis

### Web Audio API Pattern
```javascript
class ProceduralAudioEngine {
  context: AudioContext
  nodes = {
    master: null,
    effects: [],
    sources: []
  }
  
  createLaunchSound(liquidType) {
    const oscillator = this.context.createOscillator()
    const gainNode = this.context.createGain()
    const filter = this.context.createBiquadFilter()
    
    // Configure based on liquid type
    const config = this.liquidSoundConfigs[liquidType]
    oscillator.frequency.value = config.baseFrequency
    oscillator.type = config.waveform
    
    // ADSR envelope
    const now = this.context.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(1, now + 0.01) // Attack
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.1) // Decay/Sustain
    gainNode.gain.linearRampToValueAtTime(0, now + 0.5) // Release
    
    // Connect nodes
    oscillator.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.nodes.master)
    
    oscillator.start(now)
    oscillator.stop(now + 0.5)
  }
}
```

## Error Handling Pattern

### Graceful Degradation
```javascript
class FeatureDetector {
  features = {
    webgl2: false,
    webAudio: false,
    es6Modules: false,
    pointerLock: false
  }
  
  detect() {
    this.features.webgl2 = this.detectWebGL2()
    this.features.webAudio = 'AudioContext' in window
    // ... other detections
    
    return this.features
  }
  
  getFallbackConfig() {
    const config = { ...defaultConfig }
    
    if (!this.features.webgl2) {
      config.maxParticles = 1000
      config.renderer = 'webgl1'
      config.shaders = 'basic'
    }
    
    if (!this.features.webAudio) {
      config.audio = false
    }
    
    return config
  }
}
```

## Performance Monitoring Pattern

### Real-time Performance Metrics
```javascript
class PerformanceMonitor {
  metrics = {
    fps: 60,
    particleCount: 0,
    drawCalls: 0,
    memoryUsage: 0
  }
  
  frameTimestamps = []
  
  update() {
    const now = performance.now()
    this.frameTimestamps.push(now)
    
    // Keep last 60 frames
    if (this.frameTimestamps.length > 60) {
      this.frameTimestamps.shift()
    }
    
    // Calculate FPS
    if (this.frameTimestamps.length > 1) {
      const elapsed = now - this.frameTimestamps[0]
      this.metrics.fps = Math.round(1000 * this.frameTimestamps.length / elapsed)
    }
    
    // Auto-adjust quality if FPS drops
    if (this.metrics.fps < 30) {
      this.degradeQuality()
    }
  }
  
  degradeQuality() {
    // Reduce particle count, disable effects, etc.
    eventBus.emit('performance.degrade', this.metrics)
  }
}
