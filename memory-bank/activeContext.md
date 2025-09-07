# Active Context - Current Focus & Decisions

## Current Development Phase
**Phase: Design & Architecture Documentation**
- Status: Creating comprehensive design papers
- Focus: Physics formulas, system architecture, performance strategies
- Next: Implementation of core particle system

## Key Design Decisions Made

### 1. Performance Over Accuracy Trade-offs
- **Decision**: Use Barnes-Hut approximation with θ = 0.5
- **Rationale**: O(n log n) vs O(n²) for 10,000+ particles
- **Impact**: 5% accuracy loss for 100x performance gain

### 2. GPU-First Architecture
- **Decision**: Move physics calculations to GPU shaders
- **Rationale**: Parallel processing of particle forces
- **Impact**: Requires WebGL 2.0, limits browser compatibility

### 3. Entity-Component-System Pattern
- **Decision**: ECS over traditional OOP
- **Rationale**: Cache efficiency, data-oriented design
- **Impact**: More complex initial setup, better performance

### 4. No Build Tools Initially
- **Decision**: Pure ES6 modules, no webpack/rollup
- **Rationale**: Faster iteration, easier debugging
- **Impact**: Larger file sizes, no tree-shaking

## Active Technical Considerations

### Physics Implementation Strategy
```javascript
// Hierarchical physics approach
Level 1: Core Forces (always active)
  - Gravity (Newton's law)
  - Basic collision

Level 2: Advanced Forces (per liquid type)
  - Electromagnetic (plasma, photonic)
  - Quantum effects (quantum foam)
  - Relativistic (temporal flux)

Level 3: Visual Effects (GPU only)
  - Particle trails
  - Glow and bloom
  - Distortion fields
```

### Memory Budget Allocation
```
Total Target: 500MB

Particles:        200MB (10,000 × ~20KB)
Octree:           50MB  (spatial data structure)
Render Buffers:   150MB (G-buffer, effects)
Textures:         50MB  (particle sprites, UI)
Audio:            10MB  (procedural buffers)
Game State:       40MB  (achievements, settings)
```

### Shader Pipeline Design
```glsl
// Unified particle shader approach
Vertex Shader:
  1. Read instance data (position, velocity, type)
  2. Apply view/projection matrices
  3. Calculate size based on distance (LOD)
  4. Pass to fragment

Fragment Shader:
  1. Sample texture atlas for particle type
  2. Apply liquid-specific effects
  3. Calculate glow/emission
  4. Output to G-buffer
```

## Current Implementation Priorities

### Phase 1: Core Systems (Current)
1. ✅ Memory bank documentation
2. ⏳ Physics formulas research
3. ⏳ System architecture design
4. ⏳ Performance strategy

### Phase 2: Foundation (Next)
1. [ ] Basic Three.js scene setup
2. [ ] Particle pool implementation
3. [ ] Simple gravity system
4. [ ] Basic mouse controls

### Phase 3: GPU Physics
1. [ ] Shader-based force calculation
2. [ ] Octree on GPU (texture-based)
3. [ ] Instanced rendering
4. [ ] LOD system

### Phase 4: Liquid Types
1. [ ] Implement base liquid class
2. [ ] Add 8 exotic types
3. [ ] Type-specific physics
4. [ ] Visual differentiation

## Important Patterns & Preferences

### Code Style
- **Naming**: camelCase for variables, PascalCase for classes
- **Structure**: Feature-based folders (not type-based)
- **Comments**: JSDoc for public APIs, inline for complex logic
- **Error Handling**: Graceful degradation over hard failures

### Performance Patterns
```javascript
// Prefer typed arrays over objects
❌ particles = [{ x: 0, y: 0, z: 0 }, ...]
✅ positions = new Float32Array([0, 0, 0, ...])

// Avoid allocations in hot loops
❌ for (let i = 0; i < n; i++) {
    const force = new Vector3() // Allocation!
  }
✅ const force = new Vector3() // Reuse
  for (let i = 0; i < n; i++) {
    force.set(0, 0, 0)
  }

// Use object pools
❌ particles.push(new Particle())
✅ particles.push(particlePool.acquire())
```

### Visual Design Language
- **Colors**: Neon cyan (#00ffff), purple (#ff00ff), gold (#ffd700)
- **Effects**: Bloom, chromatic aberration, film grain
- **UI**: Holographic panels, floating elements, particle effects
- **Feedback**: Every action has visual + audio response

## Learnings & Insights

### From Research
1. **Barnes-Hut is Essential**: Direct n-body is impossible at scale
2. **Lorentz Force Creates Beauty**: Electromagnetic spirals are mesmerizing
3. **Quantum Uncertainty is Artistic**: Random variations create organic patterns
4. **Time Dilation is Subtle**: Visual effect more important than accuracy

### From Similar Projects
1. **Universe Sandbox**: Too complex UI, we need simpler
2. **Particle Flow**: Great visuals, physics too simplified
3. **WebGL Fluid**: Proves browser can handle complex simulations
4. **Three.js Examples**: Good starting points for effects

## Open Questions & Decisions Needed

### Technical Questions
1. **Web Workers for Physics?**
   - Pro: Doesn't block render thread
   - Con: Data transfer overhead
   - Decision: Start single-threaded, profile first

2. **WebAssembly for Octree?**
   - Pro: Faster tree operations
   - Con: Complexity, compilation time
   - Decision: Pure JS first, WASM if needed

3. **Texture-Based Physics?**
   - Pro: GPU parallel processing
   - Con: Limited by texture size
   - Decision: Hybrid approach (forces on GPU, integration on CPU)

### Design Questions
1. **Particle Lifetime?**
   - Option A: Infinite (until cleared)
   - Option B: Gradual fade based on energy
   - Leaning: Infinite with optional fade mode

2. **Gravity Well Interactions?**
   - Option A: Wells affect each other
   - Option B: Wells are static
   - Leaning: Static initially, dynamic in v2

3. **Achievement Progression?**
   - Option A: Linear unlocks
   - Option B: Exploration-based
   - Leaning: Exploration to encourage experimentation

## Next Immediate Steps

### After Documentation Complete
1. Create `index.html` with basic structure
2. Set up Three.js scene with OrbitControls
3. Implement particle pool with 1000 static particles
4. Add simple gravitational force (no optimization)
5. Test performance baseline

### Success Criteria for Phase 1
- [ ] 60 FPS with 1000 particles
- [ ] Smooth camera controls
- [ ] Particles respond to single gravity well
- [ ] Click to launch particles
- [ ] Visual: Basic glow effect

## Context for Future Sessions

### Remember These Decisions
1. **GPU-first**: Always prefer shader solutions
2. **Performance > Accuracy**: 60 FPS is non-negotiable
3. **Visual Spectacle**: Every particle should be beautiful
4. **No Premature Optimization**: Profile before optimizing
5. **User Delight**: Fun trumps realism when they conflict

### Avoid These Pitfalls
1. **Object Allocation**: Use pools and typed arrays
2. **Deep Hierarchies**: Keep scene graph flat
3. **Synchronous Loading**: Use async for all resources
4. **Pixel-Perfect**: Embrace the chaos of physics
5. **Feature Creep**: Core experience first

### Technical Debt Accepted
1. **No Build System**: Will need later for production
2. **Single-Threaded**: Web Workers deferred
3. **Simple Collisions**: Particle-particle deferred
4. **No Mobile**: Desktop-first development
5. **English Only**: i18n deferred to v2
