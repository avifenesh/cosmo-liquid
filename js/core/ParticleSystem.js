/**
 * ParticleSystem - Manages particle lifecycle and physics integration
 * Implements object pooling and efficient particle management
 */

import * as THREE from 'three';

export class ParticleSystem {
    constructor(physicsEngine) {
        this.physicsEngine = physicsEngine;
        
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
        
        // Create a single point geometry that will be instanced
        const vertices = new Float32Array([0, 0, 0]);
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        
        // Create buffer attributes for particle data
        this.particleGeometry.setAttribute('instancePosition', 
            new THREE.InstancedBufferAttribute(this.positions, 3));
        this.particleGeometry.setAttribute('instanceVelocity',
            new THREE.InstancedBufferAttribute(this.velocities, 3));
        this.particleGeometry.setAttribute('instanceColor',
            new THREE.InstancedBufferAttribute(this.colors, 3));
        this.particleGeometry.setAttribute('instanceSize',
            new THREE.InstancedBufferAttribute(this.sizes, 1));
        this.particleGeometry.setAttribute('instanceAge',
            new THREE.InstancedBufferAttribute(this.ages, 1));
        
        // Set initial instance count
        this.particleGeometry.instanceCount = 0;
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
        
        // Update all active particles
        this.updateParticles(deltaTime);
        
        // Update GPU buffers
        this.updateGeometryAttributes();
        
        // Clean up dead particles
        this.cleanupParticles();
    }
    
    generateStreamParticles(deltaTime) {
        const particlesToGenerate = Math.floor(this.streamConfig.streamRate * deltaTime);
        
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
            
            // Age the particle
            particle.age += deltaTime;
            
            // Check if particle should die
            if (particle.age > particle.lifetime) {
                particle.active = false;
                continue;
            }
            
            // Calculate forces acting on particle
            const totalForce = new THREE.Vector3(0, 0, 0);
            
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
        // World boundaries (prevent particles from going too far)
        const maxDistance = 2000;
        const distanceFromOrigin = particle.position.length();
        
        if (distanceFromOrigin > maxDistance) {
            // Reflect particle back towards origin
            const direction = particle.position.clone().normalize();
            particle.position.copy(direction.multiplyScalar(maxDistance));
            
            // Reverse velocity component pointing away from origin
            const velocityDirection = particle.velocity.clone().normalize();
            const dot = velocityDirection.dot(direction);
            if (dot > 0) {
                particle.velocity.reflect(direction);
                particle.velocity.multiplyScalar(0.8); // Energy loss
            }
        }
    }
    
    updateParticleVisuals(particle, deltaTime) {
        // Fade out near end of lifetime
        const lifeRatio = particle.age / particle.lifetime;
        const alpha = Math.max(0, 1 - Math.pow(lifeRatio, 2));
        
        // Update color alpha
        particle.color.setScalar(alpha);
        
        // Size variation based on age and liquid type
        let sizeMultiplier = 1;
        
        switch (particle.liquidType) {
            case 'plasma':
                // Pulsing effect
                sizeMultiplier = 0.8 + 0.2 * Math.sin(particle.age * 10);
                break;
            case 'crystal':
                // Growing over time
                sizeMultiplier = Math.min(2, 1 + lifeRatio);
                break;
            case 'quantum':
                // Random size fluctuation
                sizeMultiplier = 0.5 + 0.5 * Math.random();
                break;
        }
        
        particle.size = particle.baseSize * sizeMultiplier * alpha;
    }
    
    updateGeometryAttributes() {
        let index = 0;
        
        for (const particle of this.activeParticles) {
            if (!particle.active) continue;
            
            // Update position
            this.positions[index * 3] = particle.position.x;
            this.positions[index * 3 + 1] = particle.position.y;
            this.positions[index * 3 + 2] = particle.position.z;
            
            // Update velocity (for shader effects)
            this.velocities[index * 3] = particle.velocity.x;
            this.velocities[index * 3 + 1] = particle.velocity.y;
            this.velocities[index * 3 + 2] = particle.velocity.z;
            
            // Update color
            this.colors[index * 3] = particle.color.r;
            this.colors[index * 3 + 1] = particle.color.g;
            this.colors[index * 3 + 2] = particle.color.b;
            
            // Update size and age
            this.sizes[index] = particle.size;
            this.ages[index] = particle.age;
            
            index++;
        }
        
        // Update geometry attributes
        if (this.particleGeometry) {
            this.particleGeometry.instanceCount = index;
            this.particleGeometry.attributes.instancePosition.needsUpdate = true;
            this.particleGeometry.attributes.instanceVelocity.needsUpdate = true;
            this.particleGeometry.attributes.instanceColor.needsUpdate = true;
            this.particleGeometry.attributes.instanceSize.needsUpdate = true;
            this.particleGeometry.attributes.instanceAge.needsUpdate = true;
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
        const lifetimes = {
            plasma: 10.0,
            crystal: 20.0,
            temporal: 15.0,
            antimatter: 8.0,
            quantum: 5.0,
            darkmatter: 30.0,
            exotic: 12.0,
            photonic: 3.0
        };
        
        return lifetimes[liquidType] || 10.0;
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
