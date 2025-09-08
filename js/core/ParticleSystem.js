/**
 * ParticleSystem - Manages particle lifecycle and physics integration
 * Implements object pooling and efficient particle management with SPH fluid dynamics
 * @class
 */

import * as THREE from 'three';

/**
 * @typedef {Object} StreamConfig
 * @property {THREE.Vector3} position - The starting position of the stream
 * @property {THREE.Vector3} velocity - The initial velocity of the particles
 * @property {string} liquidType - The type of liquid to emit
 * @property {number} [streamRate=10] - The number of particles to generate per second
 * @property {number} [spread=0.1] - The spread of the particle stream
 */

/**
 * @typedef {Object} StreamUpdateConfig
 * @property {THREE.Vector3} position - The new position of the stream
 * @property {THREE.Vector3} velocity - The new velocity of the particles
 */

/**
 * @typedef {Object} LiquidPhysicsProperties
 * @property {number} mass - Mass multiplier for the liquid
 * @property {number} charge - Electric charge of the liquid
 * @property {boolean} electromagnetic - Whether affected by electromagnetic forces
 * @property {boolean} quantum - Whether quantum effects apply
 * @property {boolean} timeDilation - Whether time dilation effects apply
 * @property {number} uncertainty - Quantum uncertainty multiplier
 * @property {number} solidification - Crystallization force strength
 * @property {boolean} lightSpeed - Whether the liquid can approach light speed
 * @property {number} maxVelocity - Maximum velocity for the liquid
 */

export class ParticleSystem {
  /**
   * Creates a new ParticleSystem instance
   * @constructor
   * @param {import('./PhysicsEngine.js').PhysicsEngine} physicsEngine - The physics engine instance
   */
  constructor(physicsEngine) {
    /** @type {import('./PhysicsEngine.js').PhysicsEngine} The physics engine for particle simulation */
    this.physicsEngine = physicsEngine;

    // Physics worker
    /** @type {Worker} Web worker for physics calculations */
    this.physicsWorker = new Worker("./js/workers/physics.worker.js");
    // Diagnostics state for physics worker
    this.lastPhysicsError = null; // {message, stack, time, phase?}
    this.lastPhysicsMeta = null; // {dt,count,ms,fluid,octree}
    this.workerMessageCounter = 0;

    this.physicsWorker.onmessage = (e) => {
      const data = e.data || {};
      // Capture meta telemetry
      if (data.meta) {
        this.lastPhysicsMeta = { ...data.meta, time: performance.now() };
        // Light debug log occasionally
        if (this.workerMessageCounter++ % 240 === 0) {
          console.log("[PhysicsMeta]", this.lastPhysicsMeta);
        }
      }
      // Capture structured error
      if (data.error) {
        this.lastPhysicsError = { ...data.error, time: performance.now() };
        console.error("[PhysicsWorkerError]", this.lastPhysicsError);
        return; // Don't try to process particles when an error payload
      }
      if (data && Array.isArray(data.particles)) {
        const updatedParticles = data.particles;
        const particleMap = new Map();
        for (const particle of this.activeParticles) {
          particleMap.set(particle.id, particle);
        }
        for (const updatedData of updatedParticles) {
          const existingParticle = particleMap.get(updatedData.id);
          if (existingParticle) {
            existingParticle.position.set(
              updatedData.position.x,
              updatedData.position.y,
              updatedData.position.z
            );
            existingParticle.velocity.set(
              updatedData.velocity.x,
              updatedData.velocity.y,
              updatedData.velocity.z
            );
            existingParticle.active = updatedData.active;
            existingParticle.age = updatedData.age;
            existingParticle.density = updatedData.density || 0;
            existingParticle.pressure = updatedData.pressure || 0;
          }
        }
        const activeIds = new Set(updatedParticles.map((p) => p.id));
        for (const particle of this.activeParticles) {
          if (!activeIds.has(particle.id)) particle.active = false;
        }
      } else if (data && Object.keys(data).length) {
        console.warn("Invalid worker message format", data);
      }
    };

    this.physicsWorker.addEventListener("error", (ev) => {
      const info = {
        message: ev.message,
        filename: ev.filename,
        lineno: ev.lineno,
        colno: ev.colno,
        time: performance.now(),
        phase: "worker-error-event",
      };
      this.lastPhysicsError = info;
      console.error("[PhysicsWorkerEventError]", info);
    });
    this.physicsWorker.addEventListener("messageerror", (ev) => {
      const info = {
        message: "Message deserialization error",
        data: ev.data,
        time: performance.now(),
        phase: "worker-messageerror",
      };
      this.lastPhysicsError = info;
      console.error("[PhysicsWorkerMessageError]", info);
    });

    // Particle management
    /** @type {Particle[]} Array of all particles */
    this.particles = [];
    /** @type {Set<Particle>} Set of currently active particles */
    this.activeParticles = new Set();
    /** @type {Particle[]} Pool of available particles for reuse */
    this.particlePool = [];
    /** @type {number} Maximum number of particles allowed */
    this.maxParticles = 10000;

    // Streaming state
    /** @type {boolean} Whether particles are currently being streamed */
    this.isStreaming = false;
    /** @type {StreamConfig|null} Current stream configuration */
    this.streamConfig = null;
    /** @type {number} Timer for stream generation timing */
    this.streamTimer = 0;

    // Performance optimization
    /** @type {boolean} Whether particle geometry needs updating */
    this.geometryNeedsUpdate = false;
    /** @type {THREE.BufferGeometry|null} Geometry for particle rendering */
    this.particleGeometry = null;
    /** @type {THREE.Points|null} Mesh for particle rendering */
    this.particleMesh = null;

    // Multiple geometries for different liquid types
    /** @type {Map<string, THREE.Points>} Particle meshes for each liquid type */
    this.particleMeshes = null;
    /** @type {Map<string, Float32Array>} Positions arrays for each liquid type */
    this.liquidPositions = new Map();
    /** @type {Map<string, Float32Array>} Colors arrays for each liquid type */
    this.liquidColors = new Map();
    /** @type {Map<string, Float32Array>} CustomColors arrays for each liquid type */
    this.liquidCustomColors = new Map();
    /** @type {Map<string, Float32Array>} Sizes arrays for each liquid type */
    this.liquidSizes = new Map();

    // Legacy single geometry (kept for compatibility)
    /** @type {Float32Array} Array of particle positions */
    this.positions = new Float32Array(this.maxParticles * 3);
    /** @type {Float32Array} Array of particle velocities */
    this.velocities = new Float32Array(this.maxParticles * 3);
    /** @type {Float32Array} Array of particle colors */
    this.colors = new Float32Array(this.maxParticles * 3);
    /** @type {Float32Array} Array of custom particle colors for shaders */
    this.customColors = new Float32Array(this.maxParticles * 3);
    /** @type {Float32Array} Array of particle point sizes */
    this.pointSizes = new Float32Array(this.maxParticles);
    /** @type {Float32Array} Array of particle sizes */
    this.sizes = new Float32Array(this.maxParticles);
    /** @type {Float32Array} Array of particle ages */
    this.ages = new Float32Array(this.maxParticles);

    this.initialize();

    // Debug controls
    /** @type {boolean} Whether to enable gravity debug logging */
    this.enableGravityDebug = false;
    /** @type {number} Timer for gravity debug logging */
    this._gravityDebugTimer = 0;
    /** @type {boolean} When true, send ALL active particles to physics worker (ensures global gravity consistency) */
    this.simulateAllParticles = true;
    /** @type {number} Optional cap on particles sent to worker when simulateAllParticles=true (0 = no cap) */
    this.maxPhysicsBatch = 0;
  }

  /**
   * Initializes the particle system by pre-allocating particle pool and creating geometry
   * @private
   */
  initialize() {
    // Pre-allocate particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particlePool.push(new Particle(i));
    }

    // Create Three.js geometry for instanced rendering
    this.createParticleGeometry();

    // Initialize liquid type arrays
    this.initializeLiquidTypeArrays();

    console.log(
      `ParticleSystem initialized with ${this.maxParticles} particles`
    );
  }

  /**
   * Creates the Three.js buffer geometry for efficient particle rendering
   * @private
   */
  createParticleGeometry() {
    this.particleGeometry = new THREE.BufferGeometry();

    // Create buffer attributes for particle data (for Points rendering)
    this.particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colors, 3)
    );

    // Provide customColor attribute expected by some shaders
    this.particleGeometry.setAttribute(
      "customColor",
      new THREE.BufferAttribute(this.customColors, 3)
    );
    // Provide per-particle size attribute (renamed to aSize to avoid conflicts with shader uniforms)
    this.particleGeometry.setAttribute(
      "aSize",
      new THREE.BufferAttribute(this.pointSizes, 1)
    );

    // Set initial vertex count
    this.particleGeometry.setDrawRange(0, 0);
  }

  /**
   * Initializes typed arrays for each liquid type
   * @private
   */
  initializeLiquidTypeArrays() {
    const liquidTypes = [
      "plasma",
      "crystal",
      "temporal",
      "antimatter",
      "quantum",
      "darkmatter",
      "exotic",
      "photonic",
    ];

    for (const liquidType of liquidTypes) {
      // Create typed arrays for each liquid type
      this.liquidPositions.set(
        liquidType,
        new Float32Array(this.maxParticles * 3)
      );
      this.liquidColors.set(
        liquidType,
        new Float32Array(this.maxParticles * 3)
      );
      this.liquidCustomColors.set(
        liquidType,
        new Float32Array(this.maxParticles * 3)
      );
      this.liquidSizes.set(liquidType, new Float32Array(this.maxParticles));
    }
  }

  /**
   * Sets up multiple geometries for different liquid types (placeholder)
   * @param {Map<string, THREE.Points>} particleMeshes - Map of liquid type to mesh
   */
  setupMultipleGeometries(particleMeshes) {
    // Store reference but use single geometry for better compatibility
    this.particleMeshes = particleMeshes;
    console.log(
      "ParticleSystem using single geometry with per-particle colors for liquid types"
    );
  }

  /**
   * Starts a new particle stream with the given configuration
   * @param {StreamConfig} config - The configuration for the particle stream
   */
  startStream(config) {
    this.isStreaming = true;
    this.streamConfig = {
      position: config.position.clone(),
      velocity: config.velocity.clone(),
      liquidType: config.liquidType,
      streamRate: config.streamRate || 10,
      spread: config.spread || 0.1,
    };
    this.streamTimer = 0;

    console.log(`Started particle stream: ${config.liquidType}`);
  }

  /**
   * Updates the position and velocity of the current particle stream
   * @param {StreamUpdateConfig} config - The updated configuration for the particle stream
   */
  updateStream(config) {
    if (!this.isStreaming) return;

    this.streamConfig.position.copy(config.position);
    this.streamConfig.velocity.copy(config.velocity);
  }

  /**
   * Stops the current particle stream
   */
  stopStream() {
    this.isStreaming = false;
    this.streamConfig = null;

    console.log("Stopped particle stream");
  }

  /**
   * Updates the entire particle system for one frame
   * @param {number} deltaTime - The time elapsed since the last frame
   */
  update(deltaTime) {
    this.streamTimer += deltaTime;
    if (this.enableGravityDebug) {
      this._gravityDebugTimer += deltaTime;
    }

    // Generate new particles if streaming
    if (this.isStreaming && this.streamConfig) {
      this.generateStreamParticles(deltaTime);
    }

    // Build arrays for physics update
    const activeParticlesArray = Array.from(this.activeParticles);
    let physicsParticles;
    if (this.simulateAllParticles) {
      physicsParticles = activeParticlesArray;
      // Optional batch cap for performance safety
      if (this.maxPhysicsBatch > 0 && physicsParticles.length > this.maxPhysicsBatch) {
        physicsParticles = physicsParticles.slice(0, this.maxPhysicsBatch);
      }
    } else {
      // Legacy behavior: only simulate visible subset
      const { visibleParticles, invisibleParticles } = this.performFrustumCulling(activeParticlesArray);
      physicsParticles = visibleParticles;
      // Update invisible particles with simplified physics (legacy path)
      this.updateInvisibleParticles(invisibleParticles, deltaTime);
    }

    if (physicsParticles.length > 0) {
      this.physicsWorker.postMessage({
        particles: physicsParticles,
        deltaTime: deltaTime,
        gravityWells: this.physicsEngine.getGravityWells(),
      });
    }

    // Update visual properties only (no physics on main thread)
    this.updateParticleVisuals(deltaTime);

    // Update GPU buffers with current particle state
    this.updateGeometryAttributes();

    // Clean up dead particles
    this.cleanupParticles();
  }

  /**
   * Generates new particles for the active stream based on stream rate
   * @param {number} deltaTime - The time elapsed since last generation
   * @private
   */
  generateStreamParticles(deltaTime) {
    // Generate particles more aggressively for visibility
    const particlesToGenerate = Math.max(
      1,
      Math.floor(this.streamConfig.streamRate * 60 * deltaTime)
    );

    for (let i = 0; i < particlesToGenerate; i++) {
      if (this.activeParticles.size >= this.maxParticles) break;

      const particle = this.acquireParticle();
      if (!particle) break;

      this.initializeStreamParticle(particle, this.streamConfig);
      this.activeParticles.add(particle);
    }
  }

  /**
   * Initializes a newly created particle with stream configuration
   * @param {Particle} particle - The particle to initialize
   * @param {StreamConfig} config - The stream configuration
   * @private
   */
  initializeStreamParticle(particle, config) {
    // Position with small random spread
    particle.position.copy(config.position);
    particle.position.add(
      new THREE.Vector3(
        (Math.random() - 0.5) * config.spread,
        (Math.random() - 0.5) * config.spread,
        (Math.random() - 0.5) * config.spread
      )
    );

    // Velocity with random variation
    particle.velocity.copy(config.velocity);
    particle.velocity.add(
      new THREE.Vector3(
        (Math.random() - 0.5) * config.spread * 10,
        (Math.random() - 0.5) * config.spread * 10,
        (Math.random() - 0.5) * config.spread * 10
      )
    );

    // Set liquid type properties
    const properties = this.physicsEngine.getLiquidPhysicsProperties(
      config.liquidType
    );
    particle.mass = properties.mass;
    particle.charge = properties.charge;
    particle.liquidType = config.liquidType;

    // Set visual properties
    particle.color.copy(this.getLiquidColor(config.liquidType));
    particle.size = this.getLiquidSize(config.liquidType);
    // IMPORTANT: update baseSize so later visual modulation uses correct liquid-specific base instead of default 2.0
    particle.baseSize = particle.size;

    // Reset particle state
    particle.age = 0;
    particle.lifetime = this.getLiquidLifetime(config.liquidType);
    particle.active = true;
  }

  /**
   * Performs frustum culling to separate visible and invisible particles
   * @param {Particle[]} particles - Array of particles to cull
   * @returns {{visibleParticles: Particle[], invisibleParticles: Particle[]}}
   * @private
   */
  performFrustumCulling(particles) {
    // Get camera from render engine (we'll need to pass this in)
    const camera = this.camera;
    if (!camera) {
      // If no camera available, treat all particles as visible
      return { visibleParticles: particles, invisibleParticles: [] };
    }

    const visibleParticles = [];
    const invisibleParticles = [];

    // Create frustum from camera
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);

    // Distance-based culling parameters
    const maxVisibleDistance = 1000; // Don't update particles beyond this distance
    const cameraPosition = camera.position;

    for (const particle of particles) {
      if (!particle.active) {
        continue;
      }

      // Distance culling (cheap check first)
      const distance = particle.position.distanceTo(cameraPosition);
      if (distance > maxVisibleDistance) {
        invisibleParticles.push(particle);
        continue;
      }

      // Frustum culling (more expensive)
      if (frustum.containsPoint(particle.position)) {
        visibleParticles.push(particle);
      } else {
        // Check if particle is close to frustum edge (buffer zone)
        const bufferDistance = 50; // Update particles slightly outside view
        const expandedFrustum = new THREE.Frustum();
        const expandedMatrix = camera.projectionMatrix.clone();
        expandedMatrix.elements[0] *= 0.9; // Expand horizontally
        expandedMatrix.elements[5] *= 0.9; // Expand vertically
        const finalMatrix = new THREE.Matrix4().multiplyMatrices(
          expandedMatrix,
          camera.matrixWorldInverse
        );
        expandedFrustum.setFromProjectionMatrix(finalMatrix);

        if (expandedFrustum.containsPoint(particle.position)) {
          visibleParticles.push(particle);
        } else {
          invisibleParticles.push(particle);
        }
      }
    }

    return { visibleParticles, invisibleParticles };
  }

  /**
   * Updates invisible particles with simplified physics
   * @param {Particle[]} invisibleParticles - Array of invisible particles
   * @param {number} deltaTime - The time elapsed since the last frame
   * @private
   */
  updateInvisibleParticles(invisibleParticles, deltaTime) {
    // Apply simplified physics to invisible particles
    // Only update essential properties to prevent particles from "disappearing"
    for (const particle of invisibleParticles) {
      if (!particle.active) continue;

      particle.age += deltaTime;

      // Simple velocity damping (no complex forces)
      particle.velocity.multiplyScalar(0.995);

      // Basic position update
      particle.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      );

      // Boundary constraints (prevent particles from flying away)
      const distanceFromOrigin = particle.position.length();
      if (distanceFromOrigin > 5000) {
        particle.active = false;
      } else if (distanceFromOrigin > 2000) {
        // Pull back toward center
        const pullDirection = particle.position
          .clone()
          .normalize()
          .multiplyScalar(-0.1);
        particle.velocity.add(pullDirection);
      }
    }
  }

  /**
   * Sets the camera reference for frustum culling
   * @param {THREE.Camera} camera - The camera to use for culling
   */
  setCamera(camera) {
    this.camera = camera;
  }

  /**
   * Updates visual properties of particles (physics handled by worker)
   * @param {number} deltaTime - The time elapsed since the last frame
   * @private
   */
  updateParticleVisuals(deltaTime) {
    // Update visual properties for all active particles
    // Physics calculations are handled entirely by the worker
    for (const particle of this.activeParticles) {
      if (!particle.active) continue;

      // Update visual properties based on physics state and liquid type
      this.updateSingleParticleVisuals(particle, deltaTime);
    }
  }

  // REMOVED: All physics calculations moved to worker
  // Main thread now handles only visual updates

  /**
   * Updates visual properties of a single particle based on physics state and liquid type
   * @param {Particle} particle - The particle to update visuals for
   * @param {number} deltaTime - The time elapsed since the last frame
   * @private
   */
  updateSingleParticleVisuals(particle, deltaTime) {
    // Particles maintain full visibility since they don't fade with age
    // Visual effects are based on physics state instead of lifetime

    // Base alpha from velocity (faster = brighter)
    const speed = particle.velocity.length();
    const speedAlpha = Math.min(1.0, 0.5 + speed * 0.01);

    // Density-based brightness (denser areas are brighter)
    // Note: Density calculations are handled by physics worker
    const densityAlpha = particle.density
      ? Math.min(1.0, 0.3 + particle.density / 1000.0) // Use constant rest density
      : 1.0;

    // Combined alpha
    const alpha = speedAlpha * densityAlpha;

    // Update color intensity with per-type visibility floor & boost
    const baseColor = this.getLiquidColor(particle.liquidType);
    const smoothFactor = 1.0 - Math.pow(0.0005, deltaTime * 60.0); // frame-rate independent

    // Per-type visibility multipliers (photonic already bright)
    const visibilityBoostMap = {
      plasma: 1.4,
      crystal: 1.35,
      temporal: 1.4,
      antimatter: 1.5,
      quantum: 1.45,
      darkmatter: 1.8,
      exotic: 1.4,
      photonic: 1.1,
    };
    const boost = visibilityBoostMap[particle.liquidType] || 1.3;

    // Floor alpha so extremely low densities still show (except photonic which is fine)
    const flooredAlpha = Math.max(alpha, 0.35);

    // Target color with boost
    const targetR = baseColor.r * flooredAlpha * boost;
    const targetG = baseColor.g * flooredAlpha * boost;
    const targetB = baseColor.b * flooredAlpha * boost;

    particle.color.r += (targetR - particle.color.r) * smoothFactor;
    particle.color.g += (targetG - particle.color.g) * smoothFactor;
    particle.color.b += (targetB - particle.color.b) * smoothFactor;

    // Size variation based on liquid type and physics state
    let sizeMultiplier = 1;

    // Global density influence (makes clustered particles visually merge)
    if (particle.density) {
      // Normalize against nominal rest density (~1000 from worker) with clamp
      const densityNorm = Math.min(
        2.5,
        Math.max(0.2, particle.density / 1000.0)
      );
      // Apply a gentle curve so moderate clusters already look thicker
      sizeMultiplier *= 0.75 + Math.pow(densityNorm, 0.6) * 0.9; // yields ~0.75..~2.0 range
    }

    // Light pressure expansion (prevents over-compression artifacts)
    if (particle.pressure) {
      const p = Math.max(-2000, Math.min(4000, particle.pressure));
      sizeMultiplier *= 1.0 + (p / 4000.0) * 0.15; // ±15% influence
    }

    switch (particle.liquidType) {
      case "plasma":
        // Pulsing effect based on velocity
        sizeMultiplier = 0.8 + 0.2 * Math.sin(particle.age * 10 + speed);
        break;
      case "crystal":
        // Size based on density (crystallization)
        if (particle.density) {
          sizeMultiplier = 0.8 + 0.4 * (particle.density / 1000.0); // Use constant rest density
        }
        break;
      case "quantum":
        // Random size fluctuation
        sizeMultiplier = 0.7 + 0.3 * Math.random();
        break;
      case "temporal":
        // Size oscillates with time
        sizeMultiplier = 1.0 + 0.3 * Math.sin(particle.age * 3);
        break;
      case "darkmatter":
        // Larger when slow (accumulation)
        sizeMultiplier = 1.5 - Math.min(0.5, speed * 0.01);
        break;
      case "photonic":
        // Smaller but brighter when fast
        sizeMultiplier = 0.5 + Math.min(0.5, speed * 0.02);
        break;
      default:
        sizeMultiplier = 1.0;
    }

    // Enforce minimum visual size to keep distant fluid cohesive
    const targetSize = Math.max(1.5, particle.baseSize * sizeMultiplier);
    // Smooth size interpolation
    particle.size += (targetSize - particle.size) * smoothFactor;
  }

  /**
   * Updates Three.js buffer geometry attributes with current particle data
   * Uses single geometry with per-particle colors for different liquid types
   * @private
   */
  updateGeometryAttributes() {
    // Always use single geometry approach for better performance and compatibility
    this.updateSingleGeometry();
  }

  /**
   * Updates geometry for a specific liquid type
   * @param {string} liquidType - The liquid type to update
   * @param {Particle[]} particles - Array of particles of this liquid type
   * @private
   */
  updateLiquidTypeGeometry(liquidType, particles) {
    const mesh = this.particleMeshes.get(liquidType);
    if (!mesh) return;

    const geometry = mesh.geometry;
    const positions = this.liquidPositions.get(liquidType);
    const colors = this.liquidColors.get(liquidType);
    const customColors = this.liquidCustomColors.get(liquidType);
    const sizes = this.liquidSizes.get(liquidType);

    if (!positions || !colors || !customColors || !sizes) return;

    // Update arrays with particle data
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];

      // Update position
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      // Update color
      colors[i * 3] = particle.color.r;
      colors[i * 3 + 1] = particle.color.g;
      colors[i * 3 + 2] = particle.color.b;

      // Update customColor
      customColors[i * 3] = particle.color.r;
      customColors[i * 3 + 1] = particle.color.g;
      customColors[i * 3 + 2] = particle.color.b;

      // Update size
      sizes[i] = particle.size;
    }

    // Update geometry attributes
    geometry.setDrawRange(0, particles.length);
    if (geometry.attributes.position) {
      geometry.attributes.position.needsUpdate = true;
    }
    if (geometry.attributes.color) {
      geometry.attributes.color.needsUpdate = true;
    }
    if (geometry.attributes.customColor) {
      geometry.attributes.customColor.needsUpdate = true;
    }
    if (geometry.attributes.aSize) {
      geometry.attributes.aSize.needsUpdate = true;
    }
  }

  /**
   * Fallback method for single geometry updates (legacy support)
   * @private
   */
  updateSingleGeometry() {
    let index = 0;

    for (const particle of this.activeParticles) {
      if (!particle.active) continue;

      // Update position
      this.positions[index * 3] = particle.position.x;
      this.positions[index * 3 + 1] = particle.position.y;
      this.positions[index * 3 + 2] = particle.position.z;

      // Update color
      this.colors[index * 3] = particle.color.r;
      this.colors[index * 3 + 1] = particle.color.g;
      this.colors[index * 3 + 2] = particle.color.b;

      // Update customColor (raw base color before brightness modulation)
      this.customColors[index * 3] = particle.color.r;
      this.customColors[index * 3 + 1] = particle.color.g;
      this.customColors[index * 3 + 2] = particle.color.b;

      // Update per-particle size (used by potential size-aware shaders)
      this.pointSizes[index] = particle.size;

      index++;
    }

    // Update geometry attributes and draw range
    if (this.particleGeometry) {
      this.particleGeometry.setDrawRange(0, index);
      this.particleGeometry.attributes.position.needsUpdate = true;
      this.particleGeometry.attributes.color.needsUpdate = true;
      if (this.particleGeometry.attributes.customColor) {
        this.particleGeometry.attributes.customColor.needsUpdate = true;
      }
      if (this.particleGeometry.attributes.aSize) {
        this.particleGeometry.attributes.aSize.needsUpdate = true;
      }
    }
  }

  /**
   * Removes inactive particles from the active set and returns them to the pool
   * @private
   */
  cleanupParticles() {
    // Remove dead particles from active set and return to pool
    const deadParticles = [];

    for (const particle of this.activeParticles) {
      if (!particle.active) {
        deadParticles.push(particle);
      }
    }

    for (const particle of deadParticles) {
      this.activeParticles.delete(particle);
      this.releaseParticle(particle);
    }
  }

  /**
   * Acquires a particle from the pool for use
   * @returns {Particle|null} A reset particle ready for use, or null if pool is empty
   * @private
   */
  acquireParticle() {
    if (this.particlePool.length === 0) return null;

    const particle = this.particlePool.pop();
    particle.reset();
    return particle;
  }

  /**
   * Releases a particle back to the pool for reuse
   * @param {Particle} particle - The particle to release
   * @private
   */
  releaseParticle(particle) {
    particle.active = false;
    this.particlePool.push(particle);
  }

  /**
   * Gets the color configuration for a specific liquid type
   * @param {string} liquidType - The type of liquid to get color for
   * @returns {THREE.Color} The color for the liquid type, or cyan as fallback
   * @private
   */
  getLiquidColor(liquidType) {
    const colors = {
      plasma: new THREE.Color(0x00ffff), // Cyan
      crystal: new THREE.Color(0xffffff), // White/Clear
      temporal: new THREE.Color(0xff00ff), // Magenta
      antimatter: new THREE.Color(0xff4444), // Red
      quantum: new THREE.Color(0x44ff44), // Green
      darkmatter: new THREE.Color(0x444444), // Dark Gray
      exotic: new THREE.Color(0xffaa00), // Orange
      photonic: new THREE.Color(0xffff00), // Yellow
    };

    return colors[liquidType] || colors.plasma;
  }

  /**
   * Gets the size configuration for a specific liquid type
   * @param {string} liquidType - The type of liquid to get size for
   * @returns {number} The size for the liquid type, or 2.0 as fallback
   * @private
   */
  getLiquidSize(liquidType) {
    const sizes = {
      plasma: 2.6,
      crystal: 3.2,
      temporal: 2.8,
      antimatter: 2.4,
      quantum: 2.2,
      darkmatter: 4.5,
      exotic: 2.6,
      photonic: 1.8,
    };

    return sizes[liquidType] || 2.0;
  }

  /**
   * Gets the lifetime configuration for a specific liquid type
   * @param {string} liquidType - The type of liquid to get lifetime for
   * @returns {number} The lifetime for the liquid type (all are infinite)
   * @private
   */
  getLiquidLifetime(liquidType) {
    // Particles now have infinite lifetime - they only disappear when explicitly cleared
    // or when they go too far from the origin
    const lifetimes = {
      plasma: Infinity,
      crystal: Infinity,
      temporal: Infinity,
      antimatter: Infinity,
      quantum: Infinity,
      darkmatter: Infinity,
      exotic: Infinity,
      photonic: Infinity,
    };

    return lifetimes[liquidType] || Infinity;
  }

  /**
   * Gets the number of currently active particles
   * @returns {number} The number of active particles
   */
  getActiveParticleCount() {
    return this.activeParticles.size;
  }

  /**
   * Returns diagnostic information about physics worker and simulation flags.
   * @returns {{activeCount:number,maxParticles:number,simulateAll:boolean,lastMeta:object|null,lastError:object|null}}
   */
  getPhysicsStatus() {
    return {
      activeCount: this.getActiveParticleCount(),
      maxParticles: this.maxParticles,
      simulateAll: this.simulateAllParticles,
      lastMeta: this.lastPhysicsMeta,
      lastError: this.lastPhysicsError
    };
  }

  /**
   * Toggle whether all particles (not only visible) are fully simulated in the physics worker.
   * @param {boolean} value
   */
  setSimulateAllParticles(value) {
    this.simulateAllParticles = !!value;
    console.log('[ParticleSystem] simulateAllParticles =', this.simulateAllParticles);
  }

  /**
   * Debug: sample gravitational acceleration from each gravity well for a given particle index.
   * @param {number} [particleIndex=0] Index within activeParticles iteration order.
   * @returns {Object|null}
   */
  debugGravityForParticle(particleIndex = 0) {
    const arr = Array.from(this.activeParticles).filter(p => p.active);
    if (!arr.length) {
      console.warn('[GravityDebug] No active particles');
      return null;
    }
    if (particleIndex < 0 || particleIndex >= arr.length) particleIndex = 0;
    const particle = arr[particleIndex];
    const wells = this.physicsEngine.getGravityWells();
    const samples = [];
    for (const w of wells) {
      const F = this.physicsEngine.calculateGravitationalForce(particle, w);
      const accel = F.clone().divideScalar(Math.max(0.0001, Math.abs(particle.mass)));
      samples.push({ wellId: w.id, distance: particle.position.distanceTo(w.position), accel: accel.length(), force: F.length() });
    }
    const result = { particleIndex, position: particle.position.clone(), mass: particle.mass, samples };
    console.log('[GravityDebug]', result);
    return result;
  }

  /**
   * Logs diagnostic information about particle visibility (sizes & color ranges)
   */
  debugVisibilityStats() {
    let minSize = Infinity,
      maxSize = 0,
      totalSize = 0;
    let count = 0;
    for (const p of this.activeParticles) {
      if (!p.active) continue;
      const s = p.size;
      minSize = Math.min(minSize, s);
      maxSize = Math.max(maxSize, s);
      totalSize += s;
      count++;
    }
    const avgSize = count ? totalSize / count : 0;
    console.log("[Particle Visibility]", {
      active: count,
      minSize,
      maxSize,
      avgSize,
    });
  }

  /**
   * Gets the maximum number of particles allowed
   * @returns {number} The maximum particle count
   */
  getMaxParticles() {
    return this.maxParticles;
  }

  /**
   * Clears all active particles from the system
   */
  clearAllParticles() {
    for (const particle of this.activeParticles) {
      this.releaseParticle(particle);
    }
    this.activeParticles.clear();
  }

  /**
   * Disposes of the particle system and cleans up all resources
   */
  dispose() {
    this.clearAllParticles();

    if (this.particleGeometry) {
      this.particleGeometry.dispose();
    }
  }
}

/**
 * Individual particle data class
 * @class
 */
class Particle {
    /**
     * Creates a new Particle instance
     * @constructor
     * @param {number} id - Unique identifier for the particle
     */
    constructor(id) {
        /** @type {number} Unique identifier for the particle */
        this.id = id;
        /** @type {THREE.Vector3} Current position of the particle */
        this.position = new THREE.Vector3();
        /** @type {THREE.Vector3} Current velocity of the particle */
        this.velocity = new THREE.Vector3();
        /** @type {THREE.Vector3} Current acceleration of the particle */
        this.acceleration = new THREE.Vector3();
        /** @type {THREE.Color} Current color of the particle */
        this.color = new THREE.Color();
        
        /** @type {number} Mass of the particle */
        this.mass = 1.0;
        /** @type {number} Electric charge of the particle */
        this.charge = 0.0;
        /** @type {number} Radius of the particle for collision detection */
        this.radius = 1.0;
        /** @type {number} Current visual size of the particle */
        this.size = 2.0;
        /** @type {number} Base size before effects are applied */
        this.baseSize = 2.0;
        
        /** @type {number} Age of the particle in seconds */
        this.age = 0;
        /** @type {number} Lifetime of the particle in seconds */
        this.lifetime = 10.0;
        /** @type {boolean} Whether the particle is active */
        this.active = false;
        
        /** @type {string} The type of liquid this particle represents */
        this.liquidType = 'plasma';
        
        /** @type {THREE.Vector3} Previous position for physics integration */
        this.previousPosition = new THREE.Vector3();
    }
    
    /**
     * Resets the particle to its initial state for reuse
     */
    reset() {
        this.position.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        this.color.set(1, 1, 1);
        
        this.mass = 1.0;
        this.charge = 0.0;
        this.radius = 1.0;
        this.size = 2.0;
        this.baseSize = 2.0;
        
        this.age = 0;
        this.lifetime = 10.0;
        this.active = true;
        
        this.liquidType = 'plasma';
        
        this.previousPosition.copy(this.position);
    }
}
