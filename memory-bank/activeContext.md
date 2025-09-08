# Active Context - Current Focus & Decisions

## Current Development Phase
**Phase: Critical Performance Optimization**
- Status: Major performance bottlenecks identified and solutions planned
- Focus: Web Worker physics, Barnes-Hut octree, GPU optimizations
- Next: Implement 10x performance improvements to achieve smooth 60 FPS

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

### URGENT: Critical Performance Bottlenecks Discovered
1. **Physics Worker Not Working**: Worker sends messages but main thread still does physics - REDUNDANT O(n²) calculations
2. **No Barnes-Hut Implementation**: Despite memory bank mentioning it, still using O(n²) gravity - MASSIVE bottleneck
3. **No Spatial Optimization**: Linear particle iteration every frame - No frustum culling
4. **Inefficient Updates**: All particles updated regardless of visibility
5. **Heavy Post-Processing**: Full bloom pass always running

### New Performance-First Physics Architecture
```javascript
// Performance-Optimized Hierarchical Approach
Level 0: Performance Budgeting (NEW)
  - Frame time monitoring (16ms budget)
  - Dynamic quality adjustment
  - Spatial culling (frustum + distance)

Level 1: Core Physics (Web Worker ONLY)
  - Barnes-Hut octree gravity O(n log n)
  - SPH fluid dynamics with spatial hashing
  - Verlet integration

Level 2: GPU Acceleration (NEW)
  - Compute shaders for parallel force calculation
  - Transform feedback for position updates
  - Texture-based physics state

Level 3: Adaptive Quality (NEW)
  - Distance-based LOD
  - Temporal upsampling for distant particles
  - Dynamic post-processing quality
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

## Current Implementation Priorities - PERFORMANCE EMERGENCY

### Phase 1: Immediate Performance Fixes (URGENT)
1. ✅ Memory bank documentation
2. ✅ Performance bottleneck analysis  
3. [ ] **Fix Web Worker Physics** - Move ALL physics to worker thread
4. [ ] **Implement Barnes-Hut Octree** - O(n log n) gravity calculations
5. [ ] **Add Frustum Culling** - Don't update invisible particles
6. [ ] **Performance Budgeting** - 16ms frame time limits

### Phase 2: Core Optimizations (High Priority)
1. [ ] **Spatial Hashing for SPH** - Fast neighbor searches
2. [ ] **GPU Compute Shaders** - Parallel force calculations
3. [ ] **Dynamic Quality System** - Adaptive particle count/quality
4. [ ] **Memory Pool Optimization** - Cache-friendly data layout

### Phase 3: Advanced Performance (Medium Priority)
1. [ ] **Temporal Reprojection** - Reuse previous frame data
2. [ ] **Variable Time Steps** - Adaptive physics accuracy
3. [ ] **Predictive Culling** - Anticipate particle movement
4. [ ] **GPU Octree** - Texture-based spatial optimization

### Phase 4: Polish & Liquid Types (After Performance)
1. [ ] Enhanced liquid type implementations
2. [ ] Advanced visual effects
3. [ ] Audio system completion
4. [ ] UI polish and achievements

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

## Critical Performance Decisions Made

### Technical Decisions - PERFORMANCE FOCUSED
1. **Web Workers for Physics** ✅ DECIDED
   - **Decision**: ALL physics calculations MUST move to worker
   - **Rationale**: Current hybrid approach creates redundant O(n²) calculations
   - **Implementation**: Use SharedArrayBuffer or optimized message passing

2. **Barnes-Hut Octree** ✅ DECIDED  
   - **Decision**: Implement immediately with θ = 0.5
   - **Rationale**: 10,000 particles = 100M operations → 100K operations (1000x improvement)
   - **Priority**: HIGHEST - This single change provides 10x performance gain

3. **GPU Compute Pipeline** ✅ DECIDED
   - **Decision**: Implement compute shaders for parallel physics
   - **Rationale**: GPU has 1000+ cores vs CPU 8-16 cores  
   - **Timeline**: After Barnes-Hut proves stable

### Performance Requirements - NON-NEGOTIABLE
- **60 FPS with 10,000 particles** (currently struggling with 1,000)
- **16ms frame budget** with automatic quality degradation
- **Spatial culling** - particles outside view not updated
- **Memory efficiency** - no garbage collection spikes

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

## Next Immediate Steps - PERFORMANCE PRIORITY

### Critical Performance Fixes (Starting NOW)
1. **Fix Web Worker Implementation** - Remove redundant main thread physics
2. **Implement Barnes-Hut Octree** - Replace O(n²) with O(n log n) gravity
3. **Add Spatial Culling** - Don't update particles outside view frustum
4. **Performance Monitoring** - Real-time FPS tracking with auto-degradation
5. **Memory Pool Optimization** - Reduce garbage collection pressure

### Success Criteria for Performance Phase
- [ ] **60 FPS with 5,000 particles** (10x current capacity)
- [ ] **30 FPS with 10,000 particles** (target goal)
- [ ] **No frame drops** during particle generation
- [ ] **Smooth camera controls** under load
- [ ] **Memory stable** - no garbage collection spikes
- [ ] **Auto-quality** system working (degrades gracefully)

### Performance Benchmarks to Track
- Gravity calculations per second (target: 10M+)
- Physics worker message overhead (target: <1ms)
- Render thread utilization (target: <80%)
- Memory usage growth (target: stable after 30s)

## Context for Future Sessions

### Remember These Decisions
1. **GPU-first**: Always prefer shader solutions
2. **Performance > Accuracy**: 60 FPS is non-negotiable
3. **Visual Spectacle**: Every particle should be beautiful
4. **No Premature Optimization**: Profile before optimizing
5. **User Delight**: Fun trumps realism when they conflict

### CRITICAL Performance Pitfalls to Avoid
1. **Physics on Main Thread**: ALL physics MUST be in worker
2. **O(n²) Algorithms**: Use spatial data structures (octree, spatial hash)
3. **No Culling**: Always cull invisible/distant particles
4. **Fixed Quality**: Implement adaptive quality based on FPS
5. **Memory Allocation**: Use object pools, typed arrays, avoid GC
6. **Redundant Calculations**: Cache results, reuse computations
7. **Blocking Operations**: Keep render thread free for 16ms budget

### Performance Debt - MUST FIX IMMEDIATELY
1. **❌ Broken Web Worker**: Physics worker exists but main thread still calculates
2. **❌ Missing Barnes-Hut**: O(n²) gravity killing performance
3. **❌ No Spatial Optimization**: Linear search every frame
4. **❌ No Culling**: All particles updated regardless of visibility
5. **❌ Heavy Post-Processing**: Full bloom pass regardless of performance

### Technical Debt Accepted (After Performance Fixed)
1. **No Build System**: Will need later for production
2. **Simple UI**: Focus on core performance first  
3. **Basic Audio**: Optimize physics before audio polish
4. **No Mobile**: Desktop-first development
5. **English Only**: i18n deferred to v2
