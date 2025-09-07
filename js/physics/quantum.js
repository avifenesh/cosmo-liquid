// Quantum mechanics and relativistic physics for mind-blowing effects

class QuantumPhysics {
    constructor() {
        // Physical constants
        this.c = 299792458; // Speed of light (scaled for simulation)
        this.h = 6.62607015e-34; // Planck constant
        this.k = 1.380649e-23; // Boltzmann constant
        
        // Quantum field fluctuations
        this.quantumField = new Map();
        this.entangledPairs = [];
        this.waveFunctions = new Map();
        
        // Relativistic effects
        this.timeWarpZones = [];
        this.gravitationalLenses = [];
        
        // Electromagnetic fields
        this.magneticFields = [];
        this.electricFields = [];
    }
    
    // Apply quantum mechanics to particle
    applyQuantumEffects(particle, deltaTime) {
        // Heisenberg uncertainty principle
        const uncertainty = this.calculateUncertainty(particle);
        particle.position.x += uncertainty.x;
        particle.position.y += uncertainty.y;
        particle.position.z += uncertainty.z;
        
        // Wave-particle duality
        if (particle.type === 'quantum' || particle.type === 'photonic') {
            this.updateWaveFunction(particle, deltaTime);
        }
        
        // Quantum tunneling
        if (particle.type === 'quantum') {
            this.checkQuantumTunneling(particle);
        }
        
        // Quantum entanglement
        if (particle.entangledWith) {
            this.updateEntanglement(particle);
        }
    }
    
    // Calculate Heisenberg uncertainty
    calculateUncertainty(particle) {
        const deltaP = Math.sqrt(particle.velocity.lengthSquared());
        const deltaX = this.h / (4 * Math.PI * particle.mass * deltaP);
        
        return new Vector3D(
            MathUtils.randomFloat(-deltaX, deltaX) * 0.001,
            MathUtils.randomFloat(-deltaX, deltaX) * 0.001,
            MathUtils.randomFloat(-deltaX, deltaX) * 0.001
        );
    }
    
    // Update particle wave function
    updateWaveFunction(particle, deltaTime) {
        if (!this.waveFunctions.has(particle)) {
            this.waveFunctions.set(particle, {
                amplitude: 1.0,
                phase: 0,
                frequency: particle.velocity.length() / this.h
            });
        }
        
        const waveFunc = this.waveFunctions.get(particle);
        waveFunc.phase += waveFunc.frequency * deltaTime;
        
        // Collapse wave function randomly
        if (Math.random() < 0.001) {
            this.collapseWaveFunction(particle);
        }
        
        // Apply wave interference patterns
        const interference = Math.sin(waveFunc.phase) * waveFunc.amplitude;
        particle.position.x += interference * 0.1;
        particle.position.y += Math.cos(waveFunc.phase) * waveFunc.amplitude * 0.1;
    }
    
    // Collapse wave function to particle state
    collapseWaveFunction(particle) {
        const waveFunc = this.waveFunctions.get(particle);
        if (waveFunc) {
            // Probabilistic position determination
            const probability = Math.random();
            const collapse = probability * waveFunc.amplitude;
            
            particle.position.x += MathUtils.randomFloat(-collapse, collapse);
            particle.position.y += MathUtils.randomFloat(-collapse, collapse);
            particle.position.z += MathUtils.randomFloat(-collapse, collapse);
            
            // Reset wave function
            waveFunc.amplitude = 1.0;
            waveFunc.phase = 0;
        }
    }
    
    // Check for quantum tunneling through barriers
    checkQuantumTunneling(particle) {
        // Simplified tunneling probability
        const energy = 0.5 * particle.mass * particle.velocity.lengthSquared();
        const barrierHeight = 10; // Arbitrary barrier
        
        if (energy < barrierHeight) {
            const tunnelingProb = Math.exp(-2 * Math.sqrt(2 * particle.mass * (barrierHeight - energy)) / this.h);
            
            if (Math.random() < tunnelingProb * 0.01) {
                // Tunnel through!
                particle.position = particle.position.add(
                    particle.velocity.normalize().multiply(5)
                );
                
                // Create tunneling visual effect
                return {
                    type: 'tunnel',
                    position: particle.position,
                    color: 0x00ffff
                };
            }
        }
        
        return null;
    }
    
    // Create quantum entanglement between particles
    createEntanglement(particle1, particle2) {
        particle1.entangledWith = particle2;
        particle2.entangledWith = particle1;
        
        this.entangledPairs.push({
            particle1,
            particle2,
            correlation: 1.0
        });
    }
    
    // Update entangled particles
    updateEntanglement(particle) {
        const entangled = particle.entangledWith;
        if (!entangled || !entangled.alive) {
            particle.entangledWith = null;
            return;
        }
        
        // Instantaneous correlation (spooky action at a distance)
        const spinCorrelation = -particle.velocity.dot(entangled.velocity);
        
        // Apply correlated motion
        if (spinCorrelation < 0) {
            entangled.velocity = entangled.velocity.multiply(-0.1);
        }
        
        // Maintain quantum coherence
        const distance = particle.position.distance(entangled.position);
        if (distance > 100) {
            // Decoherence - break entanglement
            particle.entangledWith = null;
            entangled.entangledWith = null;
        }
    }
    
    // Apply relativistic effects
    applyRelativisticEffects(particle, deltaTime) {
        const speed = particle.velocity.length();
        const v = Math.min(speed / this.c, 0.99); // Velocity as fraction of c
        
        // Lorentz factor
        const gamma = 1 / Math.sqrt(1 - v * v);
        
        // Time dilation
        const properTime = deltaTime / gamma;
        particle.age += properTime - deltaTime; // Age slower at high speeds
        
        // Length contraction
        const contractionFactor = Math.sqrt(1 - v * v);
        particle.size *= contractionFactor;
        
        // Relativistic mass increase
        particle.mass = particle.restMass * gamma;
        
        // Relativistic Doppler shift (affects color)
        if (particle.type === 'photonic') {
            this.applyDopplerShift(particle, v);
        }
    }
    
    // Apply Doppler shift to particle color
    applyDopplerShift(particle, velocity) {
        // Simplified Doppler shift
        const shift = velocity > 0.5 ? 'blue' : velocity < -0.5 ? 'red' : 'normal';
        
        switch (shift) {
            case 'blue':
                particle.color = ColorUtils.mixColors(particle.color, 0x0000ff, velocity);
                break;
            case 'red':
                particle.color = ColorUtils.mixColors(particle.color, 0xff0000, Math.abs(velocity));
                break;
        }
    }
    
    // Create gravitational lensing effect
    createGravitationalLens(position, mass) {
        this.gravitationalLenses.push({
            position,
            mass,
            radius: Math.sqrt(mass) * 2,
            strength: mass / 100
        });
    }
    
    // Apply gravitational lensing to light paths
    applyGravitationalLensing(particle) {
        if (particle.type !== 'photonic') return;
        
        this.gravitationalLenses.forEach(lens => {
            const distance = particle.position.distance(lens.position);
            
            if (distance < lens.radius) {
                // Bend light path
                const deflection = lens.strength / (distance * distance);
                const direction = lens.position.subtract(particle.position).normalize();
                
                // Apply perpendicular deflection
                const perpendicular = particle.velocity.cross(direction).normalize();
                particle.velocity = particle.velocity.add(perpendicular.multiply(deflection));
            }
        });
    }
    
    // Create time warp zone
    createTimeWarpZone(position, radius, timeFactor) {
        this.timeWarpZones.push({
            position,
            radius,
            timeFactor, // < 1 for slow time, > 1 for fast time
            active: true
        });
    }
    
    // Get time dilation factor at position
    getTimeDilation(position) {
        let totalDilation = 1.0;
        
        this.timeWarpZones.forEach(zone => {
            if (!zone.active) return;
            
            const distance = position.distance(zone.position);
            if (distance < zone.radius) {
                // Smooth transition at boundary
                const factor = 1 - (distance / zone.radius);
                totalDilation *= 1 + (zone.timeFactor - 1) * factor;
            }
        });
        
        return totalDilation;
    }
    
    // Create electromagnetic field
    createElectromagneticField(position, type, strength, radius) {
        const field = {
            position,
            type, // 'electric' or 'magnetic'
            strength,
            radius,
            rotation: new Vector3D(0, 0, 0)
        };
        
        if (type === 'magnetic') {
            this.magneticFields.push(field);
        } else {
            this.electricFields.push(field);
        }
    }
    
    // Apply electromagnetic forces
    applyElectromagneticForces(particle) {
        // Lorentz force: F = q(E + v × B)
        let totalForce = new Vector3D(0, 0, 0);
        
        // Electric field forces
        this.electricFields.forEach(field => {
            const distance = particle.position.distance(field.position);
            if (distance < field.radius) {
                const direction = particle.position.subtract(field.position).normalize();
                const force = direction.multiply(field.strength / (distance * distance));
                totalForce = totalForce.add(force);
            }
        });
        
        // Magnetic field forces (perpendicular to velocity)
        this.magneticFields.forEach(field => {
            const distance = particle.position.distance(field.position);
            if (distance < field.radius) {
                const magneticForce = particle.velocity.cross(field.rotation).multiply(field.strength);
                totalForce = totalForce.add(magneticForce);
            }
        });
        
        // Apply force as acceleration
        particle.acceleration = particle.acceleration.add(totalForce.divide(particle.mass));
    }
    
    // Create aurora effect near magnetic poles
    createAuroraEffect(magneticField) {
        const particles = [];
        const colors = [0x00ff00, 0x00ffff, 0xff00ff, 0xffff00];
        
        for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2;
            const height = MathUtils.randomFloat(5, 15);
            
            particles.push({
                position: new Vector3D(
                    magneticField.position.x + Math.cos(angle) * magneticField.radius,
                    magneticField.position.y + height,
                    magneticField.position.z + Math.sin(angle) * magneticField.radius
                ),
                color: colors[Math.floor(Math.random() * colors.length)],
                lifetime: MathUtils.randomFloat(2, 5)
            });
        }
        
        return particles;
    }
    
    // Update all quantum and relativistic effects
    update(particles, deltaTime) {
        particles.forEach(particle => {
            if (!particle.alive) return;
            
            // Apply quantum effects
            this.applyQuantumEffects(particle, deltaTime);
            
            // Apply relativistic effects
            this.applyRelativisticEffects(particle, deltaTime);
            
            // Apply gravitational lensing
            this.applyGravitationalLensing(particle);
            
            // Apply electromagnetic forces
            this.applyElectromagneticForces(particle);
            
            // Apply time dilation
            const timeDilation = this.getTimeDilation(particle.position);
            particle.velocity = particle.velocity.multiply(timeDilation);
        });
        
        // Update entangled pairs
        this.entangledPairs = this.entangledPairs.filter(pair => 
            pair.particle1.alive && pair.particle2.alive
        );
    }
    
    // Get quantum field energy at position
    getQuantumFieldEnergy(position) {
        // Zero-point energy fluctuations
        const fluctuation = MathUtils.noise(
            position.x * 0.1,
            position.y * 0.1,
            position.z * 0.1
        );
        
        return fluctuation * this.h * this.c;
    }
    
    // Create virtual particle pairs (matter-antimatter)
    createVirtualParticles(position) {
        const energy = this.getQuantumFieldEnergy(position);
        
        if (Math.random() < energy * 0.001) {
            return {
                matter: {
                    position: position.clone(),
                    velocity: new Vector3D(
                        MathUtils.randomFloat(-1, 1),
                        MathUtils.randomFloat(-1, 1),
                        MathUtils.randomFloat(-1, 1)
                    ),
                    type: 'quantum',
                    lifetime: 0.1
                },
                antimatter: {
                    position: position.clone(),
                    velocity: new Vector3D(
                        MathUtils.randomFloat(-1, 1),
                        MathUtils.randomFloat(-1, 1),
                        MathUtils.randomFloat(-1, 1)
                    ).multiply(-1),
                    type: 'antimatter',
                    lifetime: 0.1
                }
            };
        }
        
        return null;
    }
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuantumPhysics;
}
