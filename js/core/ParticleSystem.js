/**
 * ParticleSystem - Manages particle lifecycle and physics integration
 * Implements object pooling and efficient particle management with SPH fluid dynamics
 */

import * as THREE from 'three';
import { FluidDynamics } from './FluidDynamics.js';

export class ParticleSystem {
    constructor(physicsEngine) {
        this.physicsEngine = physicsEngine;
        
        // SPH fluid dynamics engine
        this.fluidDynamics = new FluidDynamics();
        
        // Particle management
        this.particles = [];
        this.activeParticles = new Set();
        this.particlePool = [];
        this.maxParticles = 10000;
        
        // Streaming state
        this.isStreaming = false;
        this.streamConfig = null;
        this.streamTimer = 0;
        
        // Performance optimization
        this.geometryNeedsUpdate = false;
        this.particleGeometry = null;
        this.particleMesh = null;
        
        // Typed arrays for efficient GPU communication
        this.positions = new Float32Array(this.maxParticles * 3);
        this.velocities = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        this.sizes = new Float32Array(this.maxParticles);
        this.ages = new Float32Array(this.maxParticles);
        
        this.initialize();
    }
    
    initialize() {
        // Pre-allocate particle pool
        for (let i = 0; i < this.maxParticles; i++) {
            this.particlePool.push(new Particle(i));
        }
        
        // Create Three.js geometry for instanced rendering
        this.createParticleGeometry();
        
        console.log(`ParticleSystem initialized with ${this.maxParticles} particles`);
    }
    
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

      // Set initial vertex count
      this.particleGeometry.setDrawRange(0, 0);
    }
    
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
    
    updateStream(config) {
        if (!this.isStreaming) return;
        
        this.streamConfig.position.copy(config.position);
        this.streamConfig.velocity.copy(config.velocity);
    }
    
    stopStream() {
        this.isStreaming = false;
        this.streamConfig = null;
        
        console.log('Stopped particle stream');
    }
    
    update(deltaTime) {
        this.streamTimer += deltaTime;
        
        // Generate new particles if streaming
        if (this.isStreaming && this.streamConfig) {
            this.generateStreamParticles(deltaTime);
        }
        
        // Convert active particles to array for SPH processing
        const activeParticlesArray = Array.from(this.activeParticles);
        
        // Update SPH fluid dynamics
        if (activeParticlesArray.length > 0) {
            this.fluidDynamics.updateFluidDynamics(activeParticlesArray, deltaTime);
        }
        
        // Update all active particles with combined forces
        this.updateParticles(deltaTime);
        
        // Update GPU buffers
        this.updateGeometryAttributes();
        
        // Clean up dead particles
        this.cleanupParticles();
    }
    
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
    
    updateParticleVisuals(particle, deltaTime) {
        // Particles maintain full visibility since they don't fade with age
        // Visual effects are based on physics state instead of lifetime
        
        // Base alpha from velocity (faster = brighter)
        const speed = particle.velocity.length();
        const speedAlpha = Math.min(1.0, 0.5 + speed * 0.01);
        
        // Density-based brightness (denser areas are brighter)
        const densityAlpha = particle.density ? 
            Math.min(1.0, 0.3 + particle.density / this.fluidDynamics.restDensity) : 1.0;
        
        // Combined alpha
        const alpha = speedAlpha * densityAlpha;
        
        // Update color intensity based on alpha
        const baseColor = this.getLiquidColor(particle.liquidType);
        particle.color.r = baseColor.r * alpha;
        particle.color.g = baseColor.g * alpha;
        particle.color.b = baseColor.b * alpha;
        
        // Size variation based on liquid type and physics state
        let sizeMultiplier = 1;
        
        switch (particle.liquidType) {
            case 'plasma':
                // Pulsing effect based on velocity
                sizeMultiplier = 0.8 + 0.2 * Math.sin(particle.age * 10 + speed);
                break;
            case 'crystal':
                // Size based on density (crystallization)
                if (particle.density) {
                    sizeMultiplier = 0.8 + 0.4 * (particle.density / this.fluidDynamics.restDensity);
                }
                break;
            case 'quantum':
                // Random size fluctuation
                sizeMultiplier = 0.7 + 0.3 * Math.random();
                break;
            case 'temporal':
                // Size oscillates with time
                sizeMultiplier = 1.0 + 0.3 * Math.sin(particle.age * 3);
                break;
            case 'darkmatter':
                // Larger when slow (accumulation)
                sizeMultiplier = 1.5 - Math.min(0.5, speed * 0.01);
                break;
            case 'photonic':
                // Smaller but brighter when fast
                sizeMultiplier = 0.5 + Math.min(0.5, speed * 0.02);
                break;
            default:
                sizeMultiplier = 1.0;
        }
        
        particle.size = particle.baseSize * sizeMultiplier;
    }
    
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

          index++;
        }

        // Update geometry attributes and draw range
        if (this.particleGeometry) {
          this.particleGeometry.setDrawRange(0, index);
          this.particleGeometry.attributes.position.needsUpdate = true;
          this.particleGeometry.attributes.color.needsUpdate = true;
        }
    }
    
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
    
    acquireParticle() {
        if (this.particlePool.length === 0) return null;
        
        const particle = this.particlePool.pop();
        particle.reset();
        return particle;
    }
    
    releaseParticle(particle) {
        particle.active = false;
        this.particlePool.push(particle);
    }
    
    // Liquid type configurations
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
    
    // Public interface
    getActiveParticleCount() {
        return this.activeParticles.size;
    }
    
    getMaxParticles() {
        return this.maxParticles;
    }
    
    clearAllParticles() {
        for (const particle of this.activeParticles) {
            this.releaseParticle(particle);
        }
        this.activeParticles.clear();
    }
    
    dispose() {
        this.clearAllParticles();
        
        if (this.particleGeometry) {
            this.particleGeometry.dispose();
        }
    }
}

// Particle class for individual particle data
class Particle {
    constructor(id) {
        this.id = id;
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.color = new THREE.Color();
        
        this.mass = 1.0;
        this.charge = 0.0;
        this.radius = 1.0;
        this.size = 2.0;
        this.baseSize = 2.0;
        
        this.age = 0;
        this.lifetime = 10.0;
        this.active = false;
        
        this.liquidType = 'plasma';
        
        // Physics state for integration
        this.previousPosition = new THREE.Vector3();
    }
    
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
