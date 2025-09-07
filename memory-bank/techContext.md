# Technical Context - Technology Stack & Architecture

## Core Technology Stack

### Rendering Engine: Three.js + WebGL 2.0
- **Three.js r128**: Industry-standard 3D library
- **WebGL 2.0**: Direct GPU access for maximum performance
- **Custom GLSL Shaders**: Specialized particle rendering
- **Instanced Rendering**: Single draw call for thousands of particles

### Language & Architecture
- **ES6 Modules**: Clean, maintainable code structure
- **No Build Tools (v1)**: Direct browser execution
- **Pure JavaScript**: No TypeScript initially for simplicity
- **Object-Oriented Design**: Classes for physics entities

### Audio System
- **Web Audio API**: Procedural sound synthesis
- **No Audio Files**: All sounds generated programmatically
- **Spatial Audio**: 3D positional sound for immersion

### Data Persistence
- **LocalStorage**: Achievements and settings
- **IndexedDB**: Saved artworks and replays
- **No Server Backend**: Full client-side operation

## Performance Architecture

### GPU Acceleration Strategy
```
┌─────────────────────────────────────┐
│         CPU (JavaScript)            │
│  - User Input                       │
│  - Physics Manager                  │
│  - Game Logic                       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      GPU (GLSL Shaders)            │
│  - Particle Positions               │
│  - Velocity Integration             │
│  - Force Calculations               │
│  - Visual Effects                   │
└─────────────────────────────────────┘
```

### Memory Management
- **Object Pooling**: Pre-allocate particles, reuse dead ones
- **Typed Arrays**: Float32Array for position/velocity data
- **Buffer Geometry**: Efficient Three.js geometry handling
- **Texture Atlases**: Single texture for all particle types

### Optimization Techniques

#### Barnes-Hut Algorithm Implementation
```
Octree Space Partitioning:
- Root node: Entire simulation space
- Subdivide into 8 octants recursively
- Leaf nodes: 0 or 1 particle
- Internal nodes: Center of mass approximation
- Theta parameter: 0.5 (balance accuracy/speed)
```

#### Level of Detail (LOD) System
```
Distance Ranges:
- Near (0-100 units): Full physics, full visuals
- Medium (100-500 units): Simplified physics, reduced visuals
- Far (500+ units): Statistical approximation, billboard rendering
```

#### Culling Strategies
- **Frustum Culling**: Don't render off-screen particles
- **Occlusion Culling**: Hide particles behind opaque objects
- **Distance Culling**: Remove far particles from simulation

## Shader Architecture

### Vertex Shader Pipeline
```glsl
// Pseudo-code structure
1. Load particle instance data (position, velocity, type)
2. Apply physics transformations
3. Calculate screen position (MVP matrix)
4. Pass interpolated data to fragment shader
```

### Fragment Shader Effects
```glsl
// Visual effects per liquid type
- Plasma: Electric glow, energy tendrils
- Crystal: Refraction, subsurface scattering
- Temporal: Chromatic aberration, time distortion
- Quantum: Probability clouds, uncertainty blur
```

### Multi-Pass Rendering
1. **Geometry Pass**: Render particles to G-buffer
2. **Lighting Pass**: Calculate illumination
3. **Effects Pass**: Bloom, blur, distortion
4. **Composite Pass**: Final image assembly

## Physics Engine Design

### Modular Physics System
```javascript
PhysicsEngine {
  ├── ForceGenerators {
  │   ├── Gravity (N-body, Barnes-Hut)
  │   ├── Electromagnetic (Lorentz force)
  │   ├── Quantum (uncertainty, tunneling)
  │   └── Relativistic (time dilation)
  ├── Integrators {
  │   ├── Verlet (position-based)
  │   ├── RK4 (high accuracy)
  │   └── Euler (fast approximation)
  └── Collision {
      ├── Spatial Hashing
      └── Particle-Particle
  }
}
```

### Physics Update Loop
```
Fixed Timestep (60 Hz):
1. Clear force accumulators
2. Calculate forces (gravity, EM, etc.)
3. Integrate positions/velocities
4. Handle collisions
5. Apply constraints
6. Update spatial data structures
```

## Browser Compatibility Strategy

### Required Features
- **WebGL 2.0**: Core requirement
- **ES6 Modules**: Native import/export
- **Web Audio API**: Sound synthesis
- **Performance API**: Profiling and optimization
- **Pointer Lock API**: Advanced mouse control

### Fallback Strategies
```javascript
if (!WebGL2) {
  - Try WebGL 1.0 with extensions
  - Reduce particle count to 1000
  - Disable advanced shaders
  - Show "upgrade browser" message
}
```

## Development Workflow

### Code Organization
```
cosmo-liquid/
├── index.html
├── css/
│   ├── main.css
│   └── ui/
├── js/
│   ├── main.js (entry point)
│   ├── core/
│   ├── physics/
│   ├── graphics/
│   ├── audio/
│   └── ui/
├── shaders/
│   ├── particle.vert
│   ├── particle.frag
│   └── effects/
└── assets/
    └── textures/
```

### Performance Budgets
- **Initial Load**: < 3 seconds on 4G
- **Time to Interactive**: < 5 seconds
- **Frame Rate**: 60 FPS with 10,000 particles
- **Memory Usage**: < 500MB active
- **GPU Memory**: < 1GB VRAM

### Testing Strategy
- **Unit Tests**: Physics calculations
- **Integration Tests**: System interactions
- **Performance Tests**: FPS benchmarks
- **Visual Regression**: Screenshot comparisons
- **Cross-Browser**: Chrome, Firefox, Safari, Edge

## Security Considerations

### Client-Side Security
- **Input Validation**: Sanitize all user inputs
- **Resource Limits**: Cap particle counts
- **Memory Guards**: Prevent allocation attacks
- **WebGL Context Loss**: Graceful recovery

### Privacy
- **No Tracking**: No analytics in v1
- **Local Storage Only**: No cloud sync
- **No User Accounts**: Anonymous usage
- **GDPR Compliant**: No personal data collection

## Scalability Roadmap

### Version 2.0 Enhancements
- **WebGPU**: Next-gen GPU API when available
- **WASM Physics**: C++ physics engine via WebAssembly
- **Compute Shaders**: GPU-based physics
- **Mesh Shaders**: Advanced geometry generation

### Mobile Optimization (Future)
- **Touch Controls**: Gesture-based interaction
- **Reduced Particle Count**: 1000 max on mobile
- **Simplified Shaders**: Mobile GPU friendly
- **Progressive Web App**: Installable app

### Multiplayer Considerations (Future)
- **WebRTC**: Peer-to-peer connections
- **Deterministic Physics**: Synchronized simulations
- **State Interpolation**: Smooth network play
- **Authoritative Server**: Anti-cheat measures
