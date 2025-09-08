/**
 * Physics Web Worker - Handles particle physics simulation in a separate thread
 * Processes particle dynamics, gravity, fluid dynamics, and liquid-specific physics
 * to avoid blocking the main rendering thread.
 * 
 * @fileoverview This worker runs the complete physics simulation including
 * gravitational forces, SPH fluid dynamics, and liquid-specific effects.
 * It maintains its own copies of the physics engine and particle system
 * to perform calculations independently from the main thread.
 */

importScripts('https://unpkg.com/three@0.158.0/build/three.min.js');

/**
 * @typedef {Object} ParticleData
 * @property {Object} position - Plain object with x, y, z properties
 * @property {number} position.x - X coordinate of the particle
 * @property {number} position.y - Y coordinate of the particle
 * @property {number} position.z - Z coordinate of the particle
 * @property {Object} velocity - Plain object with x, y, z properties
 * @property {number} velocity.x - X velocity component
 * @property {number} velocity.y - Y velocity component
 * @property {number} velocity.z - Z velocity component
 * @property {number} mass - Mass of the particle
 * @property {number} charge - Electric charge of the particle
 * @property {string} liquidType - Type of liquid the particle represents
 * @property {boolean} active - Whether the particle is active in simulation
 * @property {number} age - Age of the particle in seconds
 */

/**
 * @typedef {Object} GravityWellData
 * @property {Object} position - Plain object with x, y, z properties
 * @property {number} position.x - X coordinate of the gravity well
 * @property {number} position.y - Y coordinate of the gravity well
 * @property {number} position.z - Z coordinate of the gravity well
 * @property {number} mass - Mass of the gravity well
 * @property {number} radius - Radius of the gravity well
 * @property {string} type - Type of celestial body
 * @property {boolean} active - Whether the gravity well is active
 */

/**
 * @typedef {Object} WorkerMessage
 * @property {ParticleData[]} particles - Array of particle data objects
 * @property {number} deltaTime - Time delta for the physics update in seconds
 * @property {GravityWellData[]} gravityWells - Array of gravity well data objects
 */

/**
 * Handles messages from the main thread to run the physics simulation
 * Re-hydrates plain objects into THREE.Vector3 instances, runs physics update,
 * and sends updated particle data back to main thread
 * @param {MessageEvent} e - The message event from main thread
 * @param {WorkerMessage} e.data - The data sent from the main thread
 */
self.onmessage = function(e) {
    const { particles: plainParticles, deltaTime, gravityWells: plainGravityWells } = e.data;

    // Re-hydrate plain objects into THREE.Vector3 instances
    const particles = plainParticles.map(p => {
        p.position = new THREE.Vector3(p.position.x, p.position.y, p.position.z);
        p.velocity = new THREE.Vector3(p.velocity.x, p.velocity.y, p.velocity.z);
        return p;
    });

    const gravityWells = plainGravityWells.map(gw => {
        gw.position = new THREE.Vector3(gw.position.x, gw.position.y, gw.position.z);
        return gw;
    });

    // Initialize engines if they don't exist
    if (!self.physicsEngine) {
        self.physicsEngine = new PhysicsEngine();
    }
    if (!self.particleSystem) {
        self.particleSystem = new ParticleSystem(self.physicsEngine);
    }

    self.physicsEngine.gravityWells = gravityWells;
    self.particleSystem.activeParticles = new Set(particles);

    self.particleSystem.update(deltaTime);

    const updatedParticles = Array.from(self.particleSystem.activeParticles);

    self.postMessage({ particles: updatedParticles });
}

// --- Barnes-Hut Octree Node ---
class OctreeNode {
    constructor(bounds) {
        this.bounds = bounds; // { min: Vector3, max: Vector3 }
        this.centerOfMass = new THREE.Vector3(0, 0, 0);
        this.totalMass = 0;
        this.particle = null;
        this.children = null; // Array of 8 OctreeNode or null
        this.hasChildren = false;
    }

    insert(particle) {
        // If node doesn't contain particle, ignore
        if (!this.contains(particle.position)) {
            return;
        }

        // If node is empty, add particle
        if (this.totalMass === 0) {
            this.particle = particle;
            this.centerOfMass.copy(particle.position);
            this.totalMass = particle.mass;
            return;
        }

        // If node has a particle but no children, subdivide
        if (!this.hasChildren) {
            this.subdivide();
            
            // Move existing particle to child
            if (this.particle) {
                this.insertIntoChildren(this.particle);
                this.particle = null;
            }
        }

        // Insert new particle into children
        this.insertIntoChildren(particle);

        // Update center of mass
        const newTotalMass = this.totalMass + particle.mass;
        this.centerOfMass.multiplyScalar(this.totalMass);
        this.centerOfMass.add(particle.position.clone().multiplyScalar(particle.mass));
        this.centerOfMass.divideScalar(newTotalMass);
        this.totalMass = newTotalMass;
    }

    insertIntoChildren(particle) {
        for (let i = 0; i < 8; i++) {
            this.children[i].insert(particle);
        }
    }

    subdivide() {
        if (this.hasChildren) return;

        const min = this.bounds.min;
        const max = this.bounds.max;
        const center = min.clone().add(max).multiplyScalar(0.5);

        this.children = [
            // Bottom level (z = min.z to center.z)
            new OctreeNode({min: new THREE.Vector3(min.x, min.y, min.z), max: new THREE.Vector3(center.x, center.y, center.z)}),
            new OctreeNode({min: new THREE.Vector3(center.x, min.y, min.z), max: new THREE.Vector3(max.x, center.y, center.z)}),
            new OctreeNode({min: new THREE.Vector3(min.x, center.y, min.z), max: new THREE.Vector3(center.x, max.y, center.z)}),
            new OctreeNode({min: new THREE.Vector3(center.x, center.y, min.z), max: new THREE.Vector3(max.x, max.y, center.z)}),
            // Top level (z = center.z to max.z)
            new OctreeNode({min: new THREE.Vector3(min.x, min.y, center.z), max: new THREE.Vector3(center.x, center.y, max.z)}),
            new OctreeNode({min: new THREE.Vector3(center.x, min.y, center.z), max: new THREE.Vector3(max.x, center.y, max.z)}),
            new OctreeNode({min: new THREE.Vector3(min.x, center.y, center.z), max: new THREE.Vector3(center.x, max.y, max.z)}),
            new OctreeNode({min: new THREE.Vector3(center.x, center.y, center.z), max: new THREE.Vector3(max.x, max.y, max.z)})
        ];

        this.hasChildren = true;
    }

    contains(position) {
        return position.x >= this.bounds.min.x && position.x <= this.bounds.max.x &&
               position.y >= this.bounds.min.y && position.y <= this.bounds.max.y &&
               position.z >= this.bounds.min.z && position.z <= this.bounds.max.z;
    }

    calculateForce(particle, theta = 0.5) {
        if (this.totalMass === 0) {
            return new THREE.Vector3(0, 0, 0);
        }

        const displacement = new THREE.Vector3().subVectors(this.centerOfMass, particle.position);
        const distance = displacement.length();

        if (distance === 0) {
            return new THREE.Vector3(0, 0, 0);
        }

        // If this is a leaf node with the same particle, ignore
        if (this.particle === particle) {
            return new THREE.Vector3(0, 0, 0);
        }

        const size = this.bounds.max.x - this.bounds.min.x; // Assuming cubic bounds
        
        // Barnes-Hut approximation: if s/d < theta, treat as single body
        if (!this.hasChildren || (size / distance) < theta) {
            // Calculate gravitational force directly
            const forceMagnitude = (1000.0 * this.totalMass * particle.mass) / (distance * distance);
            return displacement.normalize().multiplyScalar(forceMagnitude);
        }

        // Otherwise, sum forces from children
        let totalForce = new THREE.Vector3(0, 0, 0);
        for (let i = 0; i < 8; i++) {
            totalForce.add(this.children[i].calculateForce(particle, theta));
        }
        return totalForce;
    }
}

// --- PhysicsEngine with Barnes-Hut optimization ---
class PhysicsEngine {
    constructor() {
        this.G = 6.67430e-11;
        this.c = 299792458;
        this.k = 8.9875517923e9;
        this.timeScale = 1.0;
        this.gravityStrength = 1000.0;
        this.gravityScale = 1.0;
        this.dampingFactor = 0.995;
        this.gravityWells = [];
        this.spatialGrid = new Map();
        this.gridSize = 100;
        this.forces = new Map();
        this.isInitialized = true;
        
        // Barnes-Hut octree
        this.octree = null;
        this.theta = 0.5; // Barnes-Hut approximation parameter
        this.octreeBounds = {
            min: new THREE.Vector3(-2000, -2000, -2000),
            max: new THREE.Vector3(2000, 2000, 2000)
        };
    }

    update(deltaTime) {
        if (!this.isInitialized) return;
        const dt = Math.min(deltaTime * this.timeScale, 1/30);
        this.forces.clear();
        this.updateSpatialGrid();
    }

    updateSpatialGrid() {}

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

    // Build Barnes-Hut octree for particle-particle gravity
    buildOctree(particles) {
        this.octree = new OctreeNode(this.octreeBounds);
        
        // Insert all particles into octree
        for (const particle of particles) {
            if (particle.active) {
                this.octree.insert(particle);
            }
        }
    }

    // Calculate gravitational force using Barnes-Hut approximation
    calculateParticleGravityForce(particle, particles) {
        if (!this.octree) return new THREE.Vector3(0, 0, 0);
        
        // Use Barnes-Hut octree for O(n log n) calculation
        return this.octree.calculateForce(particle, this.theta);
    }

    calculateGravitationalForce(particle, gravityWell) {
        const displacement = new THREE.Vector3().subVectors(
          gravityWell.position,
          particle.position
        );
        let distance = displacement.length();
        const particleMass = Math.max(0.0001, Math.abs(particle.mass));
        const wellMass = Math.max(0.0001, gravityWell.mass);
        const minDistance = gravityWell.radius * 1.1;
        if (distance < minDistance) distance = minDistance;
        const influenceRadius = gravityWell.radius * 40;
        let falloff = 1.0;
        if (distance > influenceRadius) {
          const excess = distance - influenceRadius;
          falloff = 1.0 / (1.0 + Math.pow(excess / influenceRadius, 2.0));
        }
        const baseMagnitude =
          (this.gravityStrength * this.gravityScale * wellMass * particleMass) /
          (distance * distance);
        const forceDirection = displacement.normalize();
        const force = forceDirection.multiplyScalar(baseMagnitude * falloff);
        return force;
    }

    verletIntegration(particle, force, deltaTime) {
        const acceleration = force.clone().divideScalar(particle.mass);
        const displacement = particle.velocity.clone()
            .multiplyScalar(deltaTime)
            .add(acceleration.clone().multiplyScalar(0.5 * deltaTime * deltaTime));
        particle.position.add(displacement);
        particle.velocity.add(acceleration.multiplyScalar(deltaTime));
        particle.velocity.multiplyScalar(this.dampingFactor);
    }

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
                mass: -1.0,
                antiGravity: true,
                repulsive: true
            },
            photonic: {
                charge: 0.0,
                mass: 0.001,
                lightSpeed: true,
                maxVelocity: this.c * 0.9
            }
        };
        return properties[liquidType] || properties.plasma;
    }
}

// --- ParticleSystem ---
class ParticleSystem {
    constructor(physicsEngine) {
      this.physicsEngine = physicsEngine;
      this.fluidDynamics = new FluidDynamics();
      this.activeParticles = new Set();
    }

    update(deltaTime) {
        const activeParticlesArray = Array.from(this.activeParticles);
        if (activeParticlesArray.length > 0) {
          this.fluidDynamics.updateFluidDynamics(
            activeParticlesArray,
            deltaTime
          );
        }
        this.updateParticles(deltaTime);
    }

    updateParticles(deltaTime) {
        const activeParticlesArray = Array.from(this.activeParticles);
        
        // Build Barnes-Hut octree for particle-particle gravity (O(n log n))
        this.physicsEngine.buildOctree(activeParticlesArray);
        
        const gravityWells = this.physicsEngine.gravityWells;
        
        for (const particle of this.activeParticles) {
            if (!particle.active) continue;
            
            particle.age += deltaTime;
            const distanceFromOrigin = new THREE.Vector3(particle.position.x, particle.position.y, particle.position.z).length();
            if (distanceFromOrigin > 5000) {
                particle.active = false;
                continue;
            }
            
            const totalForce = new THREE.Vector3(0, 0, 0);
            
            // SPH fluid forces
            const sphForces = this.fluidDynamics.getSPHForces(particle);
            totalForce.add(sphForces);
            
            // Particle-particle gravity using Barnes-Hut (HUGE performance improvement)
            const particleGravityForce = this.physicsEngine.calculateParticleGravityForce(particle, activeParticlesArray);
            if (particle.liquidType === 'antimatter' || particle.liquidType === 'exotic') {
                particleGravityForce.multiplyScalar(-1); // Anti-gravity
            }
            if (particle.liquidType === 'darkmatter') {
                particleGravityForce.multiplyScalar(2); // Enhanced gravity
            }
            totalForce.add(particleGravityForce);
            
            // Gravity wells (external gravity sources)
            for (const well of gravityWells) {
                const gravityForce = this.physicsEngine.calculateGravitationalForce(particle, well);
                if (particle.liquidType === 'antimatter' || particle.liquidType === 'exotic') {
                    gravityForce.multiplyScalar(-1);
                }
                if (particle.liquidType === 'darkmatter') {
                    gravityForce.multiplyScalar(2);
                }
                totalForce.add(gravityForce);
            }
            
            this.physicsEngine.verletIntegration(particle, totalForce, deltaTime);
            this.applyConstraints(particle);
        }
    }

    applyConstraints(particle) {
        const softBoundary = 1500;
        const hardBoundary = 2000;
        const distanceFromOrigin = new THREE.Vector3(particle.position.x, particle.position.y, particle.position.z).length();
        if (distanceFromOrigin > softBoundary) {
            const pullStrength = Math.min((distanceFromOrigin - softBoundary) / 500, 1.0) * 50.0;
            const pullDirection = new THREE.Vector3(particle.position.x, particle.position.y, particle.position.z).normalize().multiplyScalar(-pullStrength);
            particle.velocity.add(pullDirection.multiplyScalar(0.01));
            if (distanceFromOrigin > hardBoundary) {
                const direction = new THREE.Vector3(particle.position.x, particle.position.y, particle.position.z).normalize();
                particle.position.copy(direction.multiplyScalar(hardBoundary));
                const velocityDirection = new THREE.Vector3(particle.velocity.x, particle.velocity.y, particle.velocity.z).normalize();
                const dot = velocityDirection.dot(direction);
                if (dot > 0) {
                    particle.velocity.reflect(direction);
                    particle.velocity.multiplyScalar(0.9);
                }
            }
        }
        if (new THREE.Vector3(particle.velocity.x, particle.velocity.y, particle.velocity.z).length() < 0.01) {
            particle.velocity.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            ));
        }
    }
}

// --- FluidDynamics ---
class FluidDynamics {
    constructor() {
        this.smoothingRadius = 15.0;
        this.restDensity = 1000.0;
        this.gasConstant = 2000.0;
        this.viscosity = 250.0;
        this.surfaceTension = 0.0728;
        this.cohesionStrength = 0.1;
        this.adhesionStrength = 0.05;
        this.spatialGrid = new Map();
        this.gridSize = this.smoothingRadius;
        this.maxNeighbors = 64;
        this.poly6Kernel = this.precomputePoly6();
        this.spikyGradient = this.precomputeSpikyGradient();
        this.viscosityLaplacian = this.precomputeViscosityLaplacian();
        this.neighborBuffer = new Array(this.maxNeighbors);
        this.densityBuffer = new Float32Array(10000);
        this.pressureBuffer = new Float32Array(10000);
    }

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

    updateFluidDynamics(particles, deltaTime) {
        if (particles.length === 0) return;
        this.spatialGrid.clear();
        this.buildSpatialGrid(particles);
        this.calculateDensityAndPressure(particles);
        this.calculateSPHForces(particles);
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
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const key = `${gridX + x},${gridY + y},${gridZ + z}`;
                    const cellParticles = this.spatialGrid.get(key);
                    if (!cellParticles) continue;
                    for (const neighbor of cellParticles) {
                        if (neighbor === particle || !neighbor.active) continue;
                        const distanceSquared = new THREE.Vector3(particle.position.x, particle.position.y, particle.position.z).distanceToSquared(new THREE.Vector3(neighbor.position.x, neighbor.position.y, neighbor.position.z));
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
            let density = particle.mass;
            for (const neighbor of neighbors) {
                const r = neighbor.distance;
                if (r < this.smoothingRadius) {
                    const q = r / this.smoothingRadius;
                    const kernelValue = this.poly6Kernel * Math.pow(1 - q * q, 3);
                    density += neighbor.particle.mass * kernelValue;
                }
            }
            particle.density = Math.max(density, this.restDensity * 0.1);
            particle.pressure = this.gasConstant * (particle.density - this.restDensity);
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
                    const direction = new THREE.Vector3().subVectors(new THREE.Vector3(particle.position.x, particle.position.y, particle.position.z), new THREE.Vector3(neighborParticle.position.x, neighborParticle.position.y, neighborParticle.position.z)).normalize();
                    const pressureTerm = (particle.pressure + neighborParticle.pressure) / (2 * neighborParticle.density);
                    const spikyValue = this.spikyGradient * Math.pow(this.smoothingRadius - r, 2);
                    pressureForce.add(direction.clone().multiplyScalar(pressureTerm * spikyValue * neighborParticle.mass));
                    const viscosityValue = this.viscosityLaplacian * (this.smoothingRadius - r);
                    const velocityDiff = new THREE.Vector3().subVectors(new THREE.Vector3(neighborParticle.velocity.x, neighborParticle.velocity.y, neighborParticle.velocity.z), new THREE.Vector3(particle.velocity.x, particle.velocity.y, particle.velocity.z));
                    viscosityForce.add(velocityDiff.multiplyScalar(this.viscosity * viscosityValue * neighborParticle.mass / neighborParticle.density));
                }
            }
            particle.sphPressureForce = pressureForce;
            particle.sphViscosityForce = viscosityForce;
        }
    }

    getSPHForces(particle) {
        const totalForce = new THREE.Vector3(0, 0, 0);
        if (particle.sphPressureForce) {
            totalForce.add(particle.sphPressureForce);
        }
        if (particle.sphViscosityForce) {
            totalForce.add(particle.sphViscosityForce);
        }
        return totalForce;
    }
}
