/**
 * FluidDynamics - SPH (Smoothed Particle Hydrodynamics) Implementation
 * Creates realistic fluid behavior with cohesion, pressure, and viscosity
 */

import * as THREE from 'three';

export class FluidDynamics {
    constructor() {
        // SPH parameters
        this.smoothingRadius = 15.0;        // Influence radius for neighbor particles
        this.restDensity = 1000.0;          // Target density for incompressibility
        this.gasConstant = 2000.0;          // Pressure calculation constant
        this.viscosity = 250.0;             // Viscosity coefficient
        this.surfaceTension = 0.0728;       // Surface tension coefficient
        this.cohesionStrength = 0.1;        // Particle attraction strength
        this.adhesionStrength = 0.05;       // Boundary adhesion strength
        
        // Performance optimization
        this.spatialGrid = new Map();       // Spatial hash grid for neighbor finding
        this.gridSize = this.smoothingRadius; // Grid cell size
        this.maxNeighbors = 64;             // Maximum neighbors per particle
        
        // Precomputed kernel values
        this.poly6Kernel = this.precomputePoly6();
        this.spikyGradient = this.precomputeSpikyGradient();
        this.viscosityLaplacian = this.precomputeViscosityLaplacian();
        
        // Temporary arrays for performance
        this.neighborBuffer = new Array(this.maxNeighbors);
        this.densityBuffer = new Float32Array(10000);
        this.pressureBuffer = new Float32Array(10000);
        
        console.log('FluidDynamics initialized with SPH');
    }
    
    // Precompute kernel normalization factors
    precomputePoly6() {
        const h = this.smoothingRadius;
        return 315.0 / (65.0 * Math.PI * Math.pow(h, 9));
    }
    
    precomputeSpikyGradient() {
        const h = this.smoothingRadius;
        return -45.0 / (Math.PI * Math.pow(h, 6));
    }
    
    precomputeViscosityLaplacian() {
        const h = this.smoothingRadius;
        return 45.0 / (Math.PI * Math.pow(h, 6));
    }
    
    // Update fluid dynamics for all particles
    updateFluidDynamics(particles, deltaTime) {
        if (particles.length === 0) return;
        
        // Clear spatial grid
        this.spatialGrid.clear();
        
        // Step 1: Build spatial hash grid for efficient neighbor finding
        this.buildSpatialGrid(particles);
        
        // Step 2: Calculate density and pressure for each particle
        this.calculateDensityAndPressure(particles);
        
        // Step 3: Calculate SPH forces
        this.calculateSPHForces(particles);
        
        // Step 4: Apply liquid-specific modifications
        this.applyLiquidSpecificForces(particles, deltaTime);
    }
    
    buildSpatialGrid(particles) {
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle.active) continue;
            
            const gridX = Math.floor(particle.position.x / this.gridSize);
            const gridY = Math.floor(particle.position.y / this.gridSize);
            const gridZ = Math.floor(particle.position.z / this.gridSize);
            
            const key = `${gridX},${gridY},${gridZ}`;
            
            if (!this.spatialGrid.has(key)) {
                this.spatialGrid.set(key, []);
            }
            
            this.spatialGrid.get(key).push(particle);
        }
    }
    
    findNeighbors(particle) {
        const neighbors = [];
        const smoothingRadiusSquared = this.smoothingRadius * this.smoothingRadius;
        
        const gridX = Math.floor(particle.position.x / this.gridSize);
        const gridY = Math.floor(particle.position.y / this.gridSize);
        const gridZ = Math.floor(particle.position.z / this.gridSize);
        
        // Check 27 adjacent grid cells (3x3x3 neighborhood)
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const key = `${gridX + x},${gridY + y},${gridZ + z}`;
                    const cellParticles = this.spatialGrid.get(key);
                    
                    if (!cellParticles) continue;
                    
                    for (const neighbor of cellParticles) {
                        if (neighbor === particle || !neighbor.active) continue;
                        
                        const distanceSquared = particle.position.distanceToSquared(neighbor.position);
                        
                        if (distanceSquared < smoothingRadiusSquared && neighbors.length < this.maxNeighbors) {
                            neighbors.push({
                                particle: neighbor,
                                distance: Math.sqrt(distanceSquared)
                            });
                        }
                    }
                }
            }
        }
        
        return neighbors;
    }
    
    calculateDensityAndPressure(particles) {
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle.active) continue;
            
            const neighbors = this.findNeighbors(particle);
            let density = particle.mass; // Self contribution
            
            // Calculate density using Poly6 kernel
            for (const neighbor of neighbors) {
                const r = neighbor.distance;
                if (r < this.smoothingRadius) {
                    const q = r / this.smoothingRadius;
                    const kernelValue = this.poly6Kernel * Math.pow(1 - q * q, 3);
                    density += neighbor.particle.mass * kernelValue;
                }
            }
            
            particle.density = Math.max(density, this.restDensity * 0.1); // Avoid zero density
            
            // Calculate pressure using ideal gas law
            particle.pressure = this.gasConstant * (particle.density - this.restDensity);
            
            // Store for efficient access
            this.densityBuffer[i] = particle.density;
            this.pressureBuffer[i] = particle.pressure;
        }
    }
    
    calculateSPHForces(particles) {
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle.active) continue;
            
            const neighbors = this.findNeighbors(particle);
            const pressureForce = new THREE.Vector3(0, 0, 0);
            const viscosityForce = new THREE.Vector3(0, 0, 0);
            const cohesionForce = new THREE.Vector3(0, 0, 0);
            
            for (const neighbor of neighbors) {
                const neighborParticle = neighbor.particle;
                const r = neighbor.distance;
                
                if (r < this.smoothingRadius && r > 0) {
                    const direction = new THREE.Vector3()
                        .subVectors(particle.position, neighborParticle.position)
                        .normalize();
                    
                    // Pressure force (Spiky kernel gradient)
                    const pressureTerm = (particle.pressure + neighborParticle.pressure) / 
                        (2 * neighborParticle.density);
                    const spikyValue = this.spikyGradient * Math.pow(this.smoothingRadius - r, 2);
                    
                    pressureForce.add(
                        direction.clone()
                            .multiplyScalar(pressureTerm * spikyValue * neighborParticle.mass)
                    );
                    
                    // Viscosity force (Viscosity kernel Laplacian)
                    const viscosityValue = this.viscosityLaplacian * (this.smoothingRadius - r);
                    const velocityDiff = new THREE.Vector3()
                        .subVectors(neighborParticle.velocity, particle.velocity);
                    
                    viscosityForce.add(
                        velocityDiff.multiplyScalar(
                            this.viscosity * viscosityValue * neighborParticle.mass / neighborParticle.density
                        )
                    );
                    
                    // Cohesion force (keeps liquid together)
                    const cohesionStrength = this.getCohesionStrength(particle.liquidType, neighborParticle.liquidType);
                    const q = r / this.smoothingRadius;
                    let cohesionValue = 0;
                    
                    if (q < 0.5) {
                        cohesionValue = 2 * Math.pow(1 - q, 3) * Math.pow(q, 3);
                    } else {
                        cohesionValue = Math.pow(1 - q, 3);
                    }
                    
                    cohesionForce.add(
                        direction.clone()
                            .multiplyScalar(-cohesionStrength * cohesionValue * neighborParticle.mass)
                    );
                }
            }
            
            // Apply forces
            particle.sphPressureForce = pressureForce;
            particle.sphViscosityForce = viscosityForce;
            particle.sphCohesionForce = cohesionForce;
            
            // Surface tension (simplified)
            particle.sphSurfaceTension = this.calculateSurfaceTension(particle, neighbors);
        }
    }
    
    getCohesionStrength(type1, type2) {
        // Different liquid types have different cohesion
        const cohesionMatrix = {
            plasma: { plasma: 0.8, crystal: 0.2, temporal: 0.6 },
            crystal: { plasma: 0.2, crystal: 1.2, temporal: 0.4 },
            temporal: { plasma: 0.6, crystal: 0.4, temporal: 1.0 },
            antimatter: { antimatter: 0.3 }, // Repulsive to others
            quantum: { quantum: 0.9 }, // Highly cohesive to self
            darkmatter: { darkmatter: 1.5 },
            exotic: { exotic: 0.7 },
            photonic: { photonic: 0.1 } // Low cohesion (light-like)
        };
        
        const matrix = cohesionMatrix[type1];
        return matrix ? (matrix[type2] || 0.1) * this.cohesionStrength : this.cohesionStrength;
    }
    
    calculateSurfaceTension(particle, neighbors) {
        const colorGradient = new THREE.Vector3(0, 0, 0);
        let colorLaplacian = 0;
        
        for (const neighbor of neighbors) {
            const r = neighbor.distance;
            if (r < this.smoothingRadius && r > 0) {
                const direction = new THREE.Vector3()
                    .subVectors(neighbor.particle.position, particle.position);
                
                // Surface detection using color field
                const poly6Value = this.poly6Kernel * Math.pow(this.smoothingRadius * this.smoothingRadius - r * r, 3);
                const spikyValue = this.spikyGradient * Math.pow(this.smoothingRadius - r, 2);
                
                colorGradient.add(
                    direction.normalize().multiplyScalar(
                        neighbor.particle.mass / neighbor.particle.density * spikyValue
                    )
                );
                
                colorLaplacian += neighbor.particle.mass / neighbor.particle.density * 
                    this.viscosityLaplacian * (this.smoothingRadius - r);
            }
        }
        
        const gradientLength = colorGradient.length();
        if (gradientLength > 0.1) { // Surface threshold
            return colorGradient.normalize().multiplyScalar(
                -this.surfaceTension * colorLaplacian / gradientLength
            );
        }
        
        return new THREE.Vector3(0, 0, 0);
    }
    
    applyLiquidSpecificForces(particles, deltaTime) {
        for (const particle of particles) {
            if (!particle.active) continue;
            
            // Apply liquid-specific modifications to SPH forces
            switch (particle.liquidType) {
                case 'plasma':
                    this.applyPlasmaEffects(particle, deltaTime);
                    break;
                case 'crystal':
                    this.applyCrystalEffects(particle, deltaTime);
                    break;
                case 'temporal':
                    this.applyTemporalEffects(particle, deltaTime);
                    break;
                case 'antimatter':
                    this.applyAntimatterEffects(particle, deltaTime);
                    break;
                case 'quantum':
                    this.applyQuantumEffects(particle, deltaTime);
                    break;
                case 'darkmatter':
                    this.applyDarkmatterEffects(particle, deltaTime);
                    break;
                case 'exotic':
                    this.applyExoticEffects(particle, deltaTime);
                    break;
                case 'photonic':
                    this.applyPhotonicEffects(particle, deltaTime);
                    break;
            }
        }
    }
    
    applyPlasmaEffects(particle, deltaTime) {
        // Enhanced electromagnetic behavior
        if (particle.sphCohesionForce) {
            particle.sphCohesionForce.multiplyScalar(0.7); // Less cohesive
        }
        
        // Add electromagnetic repulsion at short range
        if (particle.density > this.restDensity * 1.2) {
            const electrostaticForce = new THREE.Vector3()
                .copy(particle.sphPressureForce)
                .multiplyScalar(2.0); // Enhanced pressure
            
            if (!particle.fluidForces) particle.fluidForces = new THREE.Vector3();
            particle.fluidForces.add(electrostaticForce);
        }
    }
    
    applyCrystalEffects(particle, deltaTime) {
        // Enhanced crystallization
        if (particle.sphCohesionForce) {
            particle.sphCohesionForce.multiplyScalar(1.5); // More cohesive
        }
        
        // Reduce viscosity when forming crystals
        if (particle.density > this.restDensity * 1.5) {
            if (particle.sphViscosityForce) {
                particle.sphViscosityForce.multiplyScalar(0.3);
            }
        }
    }
    
    applyTemporalEffects(particle, deltaTime) {
        // Time dilation effects on forces
        const timeDialation = 1.0 + 0.2 * Math.sin(performance.now() * 0.001);
        
        if (particle.sphViscosityForce) {
            particle.sphViscosityForce.multiplyScalar(timeDialation);
        }
    }
    
    applyAntimatterEffects(particle, deltaTime) {
        // Invert cohesion to create repulsion
        if (particle.sphCohesionForce) {
            particle.sphCohesionForce.multiplyScalar(-0.5);
        }
    }
    
    applyQuantumEffects(particle, deltaTime) {
        // Quantum uncertainty in forces
        const uncertaintyFactor = 0.8 + 0.4 * Math.random();
        
        if (particle.sphPressureForce) {
            particle.sphPressureForce.multiplyScalar(uncertaintyFactor);
        }
    }
    
    applyDarkmatterEffects(particle, deltaTime) {
        // Enhanced gravitational effects
        if (particle.sphCohesionForce) {
            particle.sphCohesionForce.multiplyScalar(2.0);
        }
    }
    
    applyExoticEffects(particle, deltaTime) {
        // Negative mass repulsion
        if (particle.sphPressureForce) {
            particle.sphPressureForce.multiplyScalar(-0.3);
        }
    }
    
    applyPhotonicEffects(particle, deltaTime) {
        // Light-speed behavior (low interaction)
        if (particle.sphCohesionForce) {
            particle.sphCohesionForce.multiplyScalar(0.1);
        }
        if (particle.sphViscosityForce) {
            particle.sphViscosityForce.multiplyScalar(0.1);
        }
    }
    
    // Get combined SPH forces for a particle
    getSPHForces(particle) {
        const totalForce = new THREE.Vector3(0, 0, 0);
        
        if (particle.sphPressureForce) {
            totalForce.add(particle.sphPressureForce);
        }
        if (particle.sphViscosityForce) {
            totalForce.add(particle.sphViscosityForce);
        }
        if (particle.sphCohesionForce) {
            totalForce.add(particle.sphCohesionForce);
        }
        if (particle.sphSurfaceTension) {
            totalForce.add(particle.sphSurfaceTension);
        }
        if (particle.fluidForces) {
            totalForce.add(particle.fluidForces);
        }
        
        return totalForce;
    }
    
    // Configuration methods
    setViscosity(viscosity) {
        this.viscosity = Math.max(0, viscosity);
    }
    
    setCohesion(cohesion) {
        this.cohesionStrength = Math.max(0, cohesion);
    }
    
    setSurfaceTension(tension) {
        this.surfaceTension = Math.max(0, tension);
    }
    
    setRestDensity(density) {
        this.restDensity = Math.max(100, density);
    }
}
