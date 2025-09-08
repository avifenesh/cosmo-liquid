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
      this.physicsWorker = new Worker('./js/workers/physics.worker.js');
      this.physicsWorker.onmessage = (e) => {
        this.activeParticles = new Set(e.data.particles);
      };

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

      // Typed arrays for efficient GPU communication
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
        
        console.log(`ParticleSystem initialized with ${this.maxParticles} particles`);
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
      // Provide size attribute if future shaders want per-particle sizing
      this.particleGeometry.setAttribute(
        "size",
        new THREE.BufferAttribute(this.pointSizes, 1)
      );

      // Set initial vertex count
      this.particleGeometry.setDrawRange(0, 0);
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
            spread: config.spread || 0.1
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
        
        console.log('Stopped particle stream');
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

        const activeParticlesArray = Array.from(this.activeParticles);

        this.physicsWorker.postMessage({
            particles: activeParticlesArray,
            deltaTime: deltaTime,
            gravityWells: this.physicsEngine.getGravityWells(),
        });

        // Update GPU buffers
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
        particle.position.add(new THREE.Vector3(
            (Math.random() - 0.5) * config.spread,
            (Math.random() - 0.5) * config.spread,
            (Math.random() - 0.5) * config.spread
        ));
        
        // Velocity with random variation
        particle.velocity.copy(config.velocity);
        particle.velocity.add(new THREE.Vector3(
            (Math.random() - 0.5) * config.spread * 10,
            (Math.random() - 0.5) * config.spread * 10,
            (Math.random() - 0.5) * config.spread * 10
        ));
        
        // Set liquid type properties
        const properties = this.physicsEngine.getLiquidPhysicsProperties(config.liquidType);
        particle.mass = properties.mass;
        particle.charge = properties.charge;
        particle.liquidType = config.liquidType;
        
        // Set visual properties
        particle.color.copy(this.getLiquidColor(config.liquidType));
        particle.size = this.getLiquidSize(config.liquidType);
        
        // Reset particle state
        particle.age = 0;
        particle.lifetime = this.getLiquidLifetime(config.liquidType);
        particle.active = true;
    }
    
    /**
     * Updates all active particles with physics simulation
     * @param {number} deltaTime - The time elapsed since the last frame
     * @private
     */
    updateParticles(deltaTime) {
        const gravityWells = this.physicsEngine.getGravityWells();
        
        for (const particle of this.activeParticles) {
            if (!particle.active) continue;
            
            // Age the particle (for visual effects, not for removal)
            particle.age += deltaTime;
            
            // Particles no longer die from age - they persist and follow gravity
            // Only remove if they go extremely far from the simulation
            const distanceFromOrigin = particle.position.length();
            if (distanceFromOrigin > 5000) {
                particle.active = false;
                continue;
            }
            
            // Calculate forces acting on particle
            const totalForce = new THREE.Vector3(0, 0, 0);
            
            // Add SPH fluid forces (pressure, viscosity, cohesion, surface tension)
            const sphForces = this.fluidDynamics.getSPHForces(particle);
            totalForce.add(sphForces);
            
            // Gravitational forces
            for (const well of gravityWells) {
                const gravityForce = this.physicsEngine.calculateGravitationalForce(particle, well);
                
                // Apply liquid-specific gravity modifications
                if (particle.liquidType === 'antimatter' || particle.liquidType === 'exotic') {
                    gravityForce.multiplyScalar(-1); // Anti-gravity
                }
                if (particle.liquidType === 'darkmatter') {
                    gravityForce.multiplyScalar(2); // Enhanced gravity
                }
                
                totalForce.add(gravityForce);
            }
            
            // Liquid-specific physics effects
            this.applyLiquidSpecificForces(particle, totalForce, deltaTime);
            
            // Integrate physics using Verlet integration
            this.physicsEngine.verletIntegration(particle, totalForce, deltaTime);
            
            // Apply constraints and boundaries
            this.applyConstraints(particle);
            
            // Update visual properties based on physics
            this.updateParticleVisuals(particle, deltaTime);
        }
    }
    
    /**
     * Applies liquid-specific physics effects to particles
     * @param {Particle} particle - The particle to apply forces to
     * @param {THREE.Vector3} totalForce - The total force vector to modify
     * @param {number} deltaTime - The time elapsed since the last frame
     * @private
     */
    applyLiquidSpecificForces(particle, totalForce, deltaTime) {
        const properties = this.physicsEngine.getLiquidPhysicsProperties(particle.liquidType);
        
        switch (particle.liquidType) {
            case 'plasma':
                // Electromagnetic effects
                if (properties.electromagnetic) {
                    const electricField = new THREE.Vector3(0, 0, 0); // Simplified
                    const magneticField = new THREE.Vector3(0, 1, 0); // Simplified
                    const lorentzForce = this.physicsEngine.calculateLorentzForce(
                        particle, electricField, magneticField
                    );
                    totalForce.add(lorentzForce);
                }
                break;
                
            case 'quantum':
                // Quantum uncertainty
                if (properties.quantum) {
                    const uncertaintyForce = this.physicsEngine.calculateQuantumUncertainty(particle);
                    totalForce.add(uncertaintyForce.multiplyScalar(properties.uncertainty));
                }
                break;
                
            case 'temporal':
                // Relativistic effects
                if (properties.timeDilation) {
                    const relativisticEffects = this.physicsEngine.calculateRelativisticEffects(particle);
                    if (relativisticEffects.gamma > 1.1) {
                        // Apply time dilation to forces
                        totalForce.multiplyScalar(1 / relativisticEffects.gamma);
                    }
                }
                break;
                
            case 'crystal':
                // Crystallization forces (attraction to nearby particles)
                this.applyCrystallizationForces(particle, totalForce, properties);
                break;
                
            case 'photonic':
                // Light-speed constraints
                if (properties.lightSpeed && particle.velocity.length() > properties.maxVelocity) {
                    particle.velocity.normalize().multiplyScalar(properties.maxVelocity);
                }
                break;
        }
    }
    
    /**
     * Applies crystallization forces that attract crystal particles to each other
     * @param {Particle} particle - The particle to apply crystallization forces to
     * @param {THREE.Vector3} totalForce - The total force vector to modify
     * @param {LiquidPhysicsProperties} properties - The liquid physics properties
     * @private
     */
    applyCrystallizationForces(particle, totalForce, properties) {
        // Find nearby particles of the same type
        const crystallizationRadius = 10;
        let nearbyCount = 0;
        const attractionForce = new THREE.Vector3(0, 0, 0);
        
        for (const other of this.activeParticles) {
            if (other === particle || other.liquidType !== 'crystal') continue;
            
            const distance = particle.position.distanceTo(other.position);
            if (distance < crystallizationRadius) {
                const direction = new THREE.Vector3()
                    .subVectors(other.position, particle.position)
                    .normalize();
                
                attractionForce.add(direction.multiplyScalar(properties.solidification));
                nearbyCount++;
            }
        }
        
        if (nearbyCount > 0) {
            totalForce.add(attractionForce.divideScalar(nearbyCount));
        }
    }
    
    /**
     * Applies constraints and boundaries to keep particles within simulation limits
     * @param {Particle} particle - The particle to apply constraints to
     * @private
     */
    applyConstraints(particle) {
        // Soft boundaries - particles are gently pulled back if they go too far
        const softBoundary = 1500;
        const hardBoundary = 2000;
        const distanceFromOrigin = particle.position.length();
        
        if (distanceFromOrigin > softBoundary) {
            // Apply inward force that gets stronger as particle goes further
            const pullStrength = Math.min((distanceFromOrigin - softBoundary) / 500, 1.0) * 50.0;
            const pullDirection = particle.position.clone().normalize().multiplyScalar(-pullStrength);
            particle.velocity.add(pullDirection.multiplyScalar(0.01));
            
            // Hard boundary - reflect if too far
            if (distanceFromOrigin > hardBoundary) {
                const direction = particle.position.clone().normalize();
                particle.position.copy(direction.multiplyScalar(hardBoundary));
                
                // Reflect velocity if moving away
                const velocityDirection = particle.velocity.clone().normalize();
                const dot = velocityDirection.dot(direction);
                if (dot > 0) {
                    particle.velocity.reflect(direction);
                    particle.velocity.multiplyScalar(0.9); // Small energy loss
                }
            }
        }
        
        // Prevent particles from getting stuck at exactly zero velocity
        if (particle.velocity.length() < 0.01) {
            // Add tiny random velocity to prevent complete stillness
            particle.velocity.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            ));
        }
    }
    
    /**
     * Updates visual properties of particles based on physics state and liquid type
     * @param {Particle} particle - The particle to update visuals for
     * @param {number} deltaTime - The time elapsed since the last frame
     * @private
     */
    updateParticleVisuals(particle, deltaTime) {
      // Particles maintain full visibility since they don't fade with age
      // Visual effects are based on physics state instead of lifetime

      // Base alpha from velocity (faster = brighter)
      const speed = particle.velocity.length();
      const speedAlpha = Math.min(1.0, 0.5 + speed * 0.01);

      // Density-based brightness (denser areas are brighter)
      const densityAlpha = particle.density
        ? Math.min(1.0, 0.3 + particle.density / this.fluidDynamics.restDensity)
        : 1.0;

      // Combined alpha
      const alpha = speedAlpha * densityAlpha;

      // Update color intensity based on alpha
      const baseColor = this.getLiquidColor(particle.liquidType);
      // Smooth color transitions for fluid feel (lerp toward target)
      const smoothFactor = 1.0 - Math.pow(0.0005, deltaTime * 60.0); // frame-rate independent
      particle.color.r +=
        (baseColor.r * alpha - particle.color.r) * smoothFactor;
      particle.color.g +=
        (baseColor.g * alpha - particle.color.g) * smoothFactor;
      particle.color.b +=
        (baseColor.b * alpha - particle.color.b) * smoothFactor;

      // Size variation based on liquid type and physics state
      let sizeMultiplier = 1;

      switch (particle.liquidType) {
        case "plasma":
          // Pulsing effect based on velocity
          sizeMultiplier = 0.8 + 0.2 * Math.sin(particle.age * 10 + speed);
          break;
        case "crystal":
          // Size based on density (crystallization)
          if (particle.density) {
            sizeMultiplier =
              0.8 + 0.4 * (particle.density / this.fluidDynamics.restDensity);
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

      const targetSize = particle.baseSize * sizeMultiplier;
      // Smooth size interpolation
      particle.size += (targetSize - particle.size) * smoothFactor;
    }
    
    /**
     * Updates Three.js buffer geometry attributes with current particle data
     * @private
     */
    updateGeometryAttributes() {
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
                    if (this.particleGeometry.attributes.size) {
                      this.particleGeometry.attributes.size.needsUpdate = true;
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
            plasma: new THREE.Color(0x00ffff),      // Cyan
            crystal: new THREE.Color(0xffffff),     // White/Clear
            temporal: new THREE.Color(0xff00ff),    // Magenta
            antimatter: new THREE.Color(0xff4444),  // Red
            quantum: new THREE.Color(0x44ff44),     // Green
            darkmatter: new THREE.Color(0x444444),  // Dark Gray
            exotic: new THREE.Color(0xffaa00),      // Orange
            photonic: new THREE.Color(0xffff00)     // Yellow
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
            plasma: 2.0,
            crystal: 3.0,
            temporal: 2.5,
            antimatter: 2.0,
            quantum: 1.5,
            darkmatter: 4.0,
            exotic: 2.0,
            photonic: 1.0
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
            photonic: Infinity
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
