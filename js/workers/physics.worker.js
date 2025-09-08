importScripts('https://unpkg.com/three@0.158.0/build/three.min.js');

// PhysicsEngine and ParticleSystem code will be here

self.onmessage = function(e) {
    const { particles, deltaTime, gravityWells } = e.data;

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

// --- PhysicsEngine ---
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
            const sphForces = this.fluidDynamics.getSPHForces(particle);
            totalForce.add(sphForces);
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