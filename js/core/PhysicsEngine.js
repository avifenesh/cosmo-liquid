/**
 * PhysicsEngine - Advanced physics simulation system
 * Handles gravity, electromagnetic forces, and quantum effects
 */

import * as THREE from 'three';

export class PhysicsEngine {
    constructor() {
        // Physics constants
        this.G = 6.67430e-11; // Gravitational constant (scaled for game)
        this.c = 299792458; // Speed of light (scaled)
        this.k = 8.9875517923e9; // Coulomb's constant (scaled)
        
        // Simulation parameters
        this.timeScale = 1.0;
    // Legacy scalar multiplier for gravity (will be combined with normalized scaling)
    this.gravityStrength = 1000.0; // (legacy) overall strength; can tune at runtime
    this.gravityScale = 1.0; // New secondary global scaling for fine tuning
        this.dampingFactor = 0.995;
        
        // Gravity wells
        this.gravityWells = [];
        
        // Spatial optimization (simplified octree)
        this.spatialGrid = new Map();
        this.gridSize = 100;
        
        // Force accumulators
        this.forces = new Map();
        
        this.isInitialized = true;
    }
    
    update(deltaTime) {
        if (!this.isInitialized) return;
        
        // Cap delta time for stability
        const dt = Math.min(deltaTime * this.timeScale, 1/30);
        
        // Clear force accumulators
        this.forces.clear();
        
        // Update spatial grid (for future optimization)
        this.updateSpatialGrid();
    }
    
    updateSpatialGrid() {
        // TODO: Implement spatial grid for particle optimization
        // For now, we'll use direct particle access from ParticleSystem
    }
    
    addGravityWell(config) {
        const well = {
            id: this.generateId(),
            position: config.position.clone(),
            mass: config.mass || 1000,
            type: config.type || 'star',
            radius: config.radius || 20,
            active: true,
            createdAt: performance.now()
        };
        
        this.gravityWells.push(well);
        return well;
    }
    
    removeGravityWell(id) {
        this.gravityWells = this.gravityWells.filter(well => well.id !== id);
    }
    
    // Force calculation methods
    calculateGravitationalForce(particle, gravityWell) {
        const displacement = new THREE.Vector3().subVectors(
          gravityWell.position,
          particle.position
        );
        let distance = displacement.length();

        // Treat very small or negative mass liquids safely (negative mass breaks F=Gm1m2/r^2 symmetry)
        const particleMass = Math.max(0.0001, Math.abs(particle.mass));
        const wellMass = Math.max(0.0001, gravityWell.mass);

        // Soft minimum distance to avoid huge spikes & particle tunneling
        const minDistance = gravityWell.radius * 1.1; // allow some gravitational pull just outside surface
        if (distance < minDistance) distance = minDistance;

        // Optional outer influence falloff (beyond a cutoff scale gravity tapers) to keep particles bound visually
        const influenceRadius = gravityWell.radius * 40; // heuristic radial influence region
        let falloff = 1.0;
        if (distance > influenceRadius) {
          // Smooth falloff using inverse quartic beyond influence region
          const excess = distance - influenceRadius;
          falloff = 1.0 / (1.0 + Math.pow(excess / influenceRadius, 2.0));
        }

        // Combined gravitational formula with tunable scaling
        // Base: F = (gravityStrength * gravityScale * m1 * m2) / r^2
        const baseMagnitude =
          (this.gravityStrength * this.gravityScale * wellMass * particleMass) /
          (distance * distance);

        const forceDirection = displacement.normalize();
        const force = forceDirection.multiplyScalar(baseMagnitude * falloff);

        // Anti-gravity or enhanced gravity handled externally (ParticleSystem) but ensure positive mass used here
        return force;
    }
    
    calculateLorentzForce(particle, electricField, magneticField) {
        // F = q(E + v × B)
        const electricForce = electricField.clone().multiplyScalar(particle.charge || 0);
        
        const magneticForce = new THREE.Vector3()
            .crossVectors(particle.velocity, magneticField)
            .multiplyScalar(particle.charge || 0);
        
        return electricForce.add(magneticForce);
    }
    
    calculateQuantumUncertainty(particle) {
        // Heisenberg uncertainty principle effects
        // Δx * Δp ≥ ℏ/2
        
        const uncertainty = this.getQuantumUncertaintyRadius(particle);
        
        // Random displacement based on uncertainty
        const randomDisplacement = new THREE.Vector3(
            (Math.random() - 0.5) * uncertainty,
            (Math.random() - 0.5) * uncertainty,
            (Math.random() - 0.5) * uncertainty
        );
        
        return randomDisplacement;
    }
    
    getQuantumUncertaintyRadius(particle) {
        // Simplified quantum uncertainty calculation
        const hbar = 1.054571817e-34; // Reduced Planck constant (scaled)
        const momentum = particle.velocity.length() * particle.mass;
        
        // Avoid division by zero
        if (momentum < 1e-10) return 0.1;
        
        return hbar / (2 * momentum) * 1000; // Scaled for visibility
    }
    
    calculateRelativisticEffects(particle) {
        const velocity = particle.velocity.length();
        const beta = velocity / this.c;
        
        // Only apply relativistic effects for high velocities
        if (beta < 0.1) return { timeDilation: 1, lengthContraction: 1 };
        
        const gamma = 1 / Math.sqrt(1 - beta * beta);
        
        return {
            timeDilation: gamma,
            lengthContraction: 1 / gamma,
            gamma: gamma
        };
    }
    
    // Integration methods
    verletIntegration(particle, force, deltaTime) {
        const acceleration = force.clone().divideScalar(particle.mass);
        
        // Verlet integration: x(t+dt) = x(t) + v(t)*dt + 0.5*a(t)*dt²
        const displacement = particle.velocity.clone()
            .multiplyScalar(deltaTime)
            .add(acceleration.clone().multiplyScalar(0.5 * deltaTime * deltaTime));
        
        // Update position
        particle.position.add(displacement);
        
        // Update velocity: v(t+dt) = v(t) + a(t)*dt
        particle.velocity.add(acceleration.multiplyScalar(deltaTime));
        
        // Apply damping for stability
        particle.velocity.multiplyScalar(this.dampingFactor);
    }
    
    rungeKutta4Integration(particle, forceFunction, deltaTime) {
        // Fourth-order Runge-Kutta integration (high accuracy)
        const dt = deltaTime;
        const mass = particle.mass;
        
        const pos0 = particle.position.clone();
        const vel0 = particle.velocity.clone();
        
        // k1
        const k1v = forceFunction(pos0, vel0).divideScalar(mass);
        const k1x = vel0.clone();
        
        // k2
        const pos1 = pos0.clone().add(k1x.clone().multiplyScalar(dt/2));
        const vel1 = vel0.clone().add(k1v.clone().multiplyScalar(dt/2));
        const k2v = forceFunction(pos1, vel1).divideScalar(mass);
        const k2x = vel1.clone();
        
        // k3
        const pos2 = pos0.clone().add(k2x.clone().multiplyScalar(dt/2));
        const vel2 = vel0.clone().add(k2v.clone().multiplyScalar(dt/2));
        const k3v = forceFunction(pos2, vel2).divideScalar(mass);
        const k3x = vel2.clone();
        
        // k4
        const pos3 = pos0.clone().add(k3x.clone().multiplyScalar(dt));
        const vel3 = vel0.clone().add(k3v.clone().multiplyScalar(dt));
        const k4v = forceFunction(pos3, vel3).divideScalar(mass);
        const k4x = vel3.clone();
        
        // Final update
        const deltaPos = k1x.add(k2x.multiplyScalar(2))
            .add(k3x.multiplyScalar(2))
            .add(k4x)
            .multiplyScalar(dt/6);
            
        const deltaVel = k1v.add(k2v.multiplyScalar(2))
            .add(k3v.multiplyScalar(2))
            .add(k4v)
            .multiplyScalar(dt/6);
        
        particle.position.add(deltaPos);
        particle.velocity.add(deltaVel);
    }
    
    // Collision detection (basic sphere-sphere)
    checkCollision(particle1, particle2) {
        const distance = particle1.position.distanceTo(particle2.position);
        const minDistance = particle1.radius + particle2.radius;
        
        return distance < minDistance;
    }
    
    resolveCollision(particle1, particle2) {
        // Elastic collision resolution
        const displacement = new THREE.Vector3()
            .subVectors(particle2.position, particle1.position);
        
        const distance = displacement.length();
        const minDistance = particle1.radius + particle2.radius;
        
        if (distance < minDistance) {
            // Separate particles
            const separation = displacement.normalize().multiplyScalar(minDistance - distance);
            particle1.position.sub(separation.clone().multiplyScalar(0.5));
            particle2.position.add(separation.clone().multiplyScalar(0.5));
            
            // Calculate collision response
            const v1 = particle1.velocity.clone();
            const v2 = particle2.velocity.clone();
            const m1 = particle1.mass;
            const m2 = particle2.mass;
            
            // Conservation of momentum and energy
            const totalMass = m1 + m2;
            const relativeVelocity = v1.clone().sub(v2);
            const normalDirection = displacement.normalize();
            
            const impulse = relativeVelocity.dot(normalDirection) * 2 / totalMass;
            
            particle1.velocity.sub(normalDirection.clone().multiplyScalar(impulse * m2));
            particle2.velocity.add(normalDirection.clone().multiplyScalar(impulse * m1));
        }
    }
    
    // Utility methods
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    getGravityWells() {
        return this.gravityWells.filter(well => well.active);
    }
    
    setTimeScale(scale) {
        this.timeScale = Math.max(0.1, Math.min(scale, 10.0));
    }
    
    setGravityStrength(strength) {
        this.gravityStrength = Math.max(0, strength);
    }

    setGravityScale(scale) {
        this.gravityScale = Math.max(0, scale);
    }

    // Debug utility to sample gravitational acceleration for a particle
    debugGravitySample(particle) {
        if (!this.gravityWells.length) return null;
        const samples = [];
        for (const well of this.gravityWells) {
            const F = this.calculateGravitationalForce(particle, well);
            const accel = F.clone().divideScalar(Math.max(0.0001, Math.abs(particle.mass)));
            samples.push({ wellId: well.id, accel: accel.length(), distance: particle.position.distanceTo(well.position) });
        }
        return samples;
    }
    
    // Liquid-specific physics modifiers
    getLiquidPhysicsProperties(liquidType) {
        const properties = {
            plasma: {
                charge: 1.0,
                mass: 1.0,
                electromagnetic: true,
                quantum: false,
                relativistic: false
            },
            crystal: {
                charge: 0.0,
                mass: 2.0,
                crystallization: true,
                solidification: 0.1
            },
            temporal: {
                charge: 0.0,
                mass: 1.0,
                timeDilation: true,
                relativisticThreshold: 0.3
            },
            antimatter: {
                charge: -1.0,
                mass: 1.0,
                antiGravity: true,
                annihilation: true
            },
            quantum: {
                charge: 0.0,
                mass: 0.5,
                quantum: true,
                uncertainty: 2.0,
                tunneling: 0.1
            },
            darkmatter: {
                charge: 0.0,
                mass: 5.0,
                gravity: 2.0,
                invisible: true
            },
            exotic: {
                charge: 0.0,
                mass: -1.0, // Negative mass
                antiGravity: true,
                repulsive: true
            },
            photonic: {
                charge: 0.0,
                mass: 0.001, // Nearly massless
                lightSpeed: true,
                maxVelocity: this.c * 0.9
            }
        };
        
        return properties[liquidType] || properties.plasma;
    }
    
    // Advanced physics calculations
    calculateTidalForces(particle, gravityWell) {
        // Tidal forces near massive objects
        const displacement = new THREE.Vector3()
            .subVectors(gravityWell.position, particle.position);
        
        const distance = displacement.length();
        
        if (distance > gravityWell.radius * 10) return new THREE.Vector3(0, 0, 0);
        
        // Simplified tidal force calculation
        const tidalStrength = (2 * this.gravityStrength * gravityWell.mass * particle.radius) 
            / Math.pow(distance, 3);
        
        return displacement.normalize().multiplyScalar(tidalStrength);
    }
    
    calculateFrameDragging(particle, gravityWell) {
        // Simplified frame-dragging effect (General Relativity)
        if (!gravityWell.rotating) return new THREE.Vector3(0, 0, 0);
        
        const displacement = new THREE.Vector3()
            .subVectors(particle.position, gravityWell.position);
        
        const distance = displacement.length();
        
        if (distance > gravityWell.radius * 5) return new THREE.Vector3(0, 0, 0);
        
        // Lense-Thirring effect
        const angularVelocity = gravityWell.angularVelocity || new THREE.Vector3(0, 1, 0);
        const frameDragForce = new THREE.Vector3()
            .crossVectors(angularVelocity, displacement)
            .multiplyScalar(this.gravityStrength * gravityWell.mass / (distance * distance * distance));
        
        return frameDragForce;
    }
    
    dispose() {
        this.gravityWells = [];
        this.forces.clear();
        this.spatialGrid.clear();
    }
}
