// Liquid particle physics system

class LiquidParticle {
    constructor(position, velocity, type = 'plasma', mass = 1.0) {
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.acceleration = new Vector3D(0, 0, 0);
        this.type = type;
        this.mass = mass;
        this.age = 0;
        this.maxAge = 1000; // Particle lifetime in frames
        this.alive = true;
        
        // Visual properties
        this.color = ColorUtils.getLiquidColor(type, 'primary');
        this.glowColor = ColorUtils.getLiquidColor(type, 'glow');
        this.size = Physics.PARTICLE_SIZE;
        this.alpha = 1.0;
        
        // Physics properties based on liquid type
        this.setLiquidProperties(type);
        
        // Trail for visual effects
        this.trail = [];
        this.maxTrailLength = Physics.TRAIL_LENGTH;
        
        // For Three.js rendering
        this.mesh = null;
        this.glowMesh = null;
        
        // Interaction properties
        this.isInOrbit = false;
        this.orbitCenter = null;
        this.orbitRadius = 0;
        this.lastPosition = position.clone();
    }
    
    setLiquidProperties(type) {
        switch (type) {
            case 'plasma':
                this.viscosity = 0.98;
                this.conductivity = 1.0;
                this.magneticSusceptibility = 0.8;
                this.glowIntensity = 2.0;
                this.mass = 1.0;
                break;
                
            case 'crystal':
                this.viscosity = 0.85;
                this.conductivity = 0.3;
                this.magneticSusceptibility = 0.2;
                this.glowIntensity = 1.5;
                this.mass = 2.0;
                this.crystallization = 0.0;
                break;
                
            case 'temporal':
                this.viscosity = 0.95;
                this.conductivity = 0.5;
                this.magneticSusceptibility = 0.1;
                this.glowIntensity = 3.0;
                this.mass = 0.8;
                this.timeDistortion = 1.0;
                break;
                
            case 'antimatter':
                this.viscosity = 0.99;
                this.conductivity = 0.9;
                this.magneticSusceptibility = -0.5; // Repelled by magnetic fields
                this.glowIntensity = 2.5;
                this.mass = 1.2;
                this.antiGravity = true;
                break;
                
            case 'quantum':
                this.viscosity = 0.92;
                this.conductivity = 0.7;
                this.magneticSusceptibility = 0.0;
                this.glowIntensity = 4.0; // Brightest glow
                this.mass = 0.5; // Low mass for quantum effects
                this.quantumState = true;
                this.superposition = Math.random();
                break;
                
            case 'dark':
                this.viscosity = 0.8;
                this.conductivity = 0.0; // No electromagnetic interaction
                this.magneticSusceptibility = 0.0;
                this.glowIntensity = 0.5; // Nearly invisible
                this.mass = 5.0; // Very heavy
                this.invisible = true;
                break;
                
            case 'exotic':
                this.viscosity = 0.99;
                this.conductivity = 0.5;
                this.magneticSusceptibility = -1.0; // Strong repulsion
                this.glowIntensity = 3.5;
                this.mass = -1.0; // NEGATIVE MASS!
                this.antiGravity = true;
                this.exotic = true;
                break;
                
            case 'photonic':
                this.viscosity = 1.0; // No friction
                this.conductivity = 2.0; // Super conductive
                this.magneticSusceptibility = 0.0;
                this.glowIntensity = 5.0; // Brightest
                this.mass = 0.01; // Nearly massless
                this.lightSpeed = true;
                break;
        }
    }
    
    update(deltaTime, gravityWells, otherParticles) {
        if (!this.alive) return;
        
        // Age the particle
        this.age += deltaTime;
        if (this.age > this.maxAge) {
            this.alive = false;
            return;
        }
        
        // Store last position for trail
        this.lastPosition = this.position.clone();
        
        // Reset acceleration
        this.acceleration = new Vector3D(0, 0, 0);
        
        // Apply gravitational forces
        this.applyGravitationalForces(gravityWells);
        
        // Apply particle interactions (cohesion, separation)
        this.applyParticleInteractions(otherParticles);
        
        // Apply drag/viscosity
        this.velocity = this.velocity.multiply(this.viscosity);
        
        // Apply special liquid effects
        this.applyLiquidEffects(deltaTime);
        
        // Integrate physics
        this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
        this.position = this.position.add(this.velocity.multiply(deltaTime));
        
        // Update trail
        this.updateTrail();
        
        // Update visual properties
        this.updateVisualProperties();
        
        // Check orbit status
        this.checkOrbitStatus(gravityWells);
        
        // Update Three.js meshes with SPECTACULAR effects
        if (this.mesh) {
            this.mesh.position.copy(this.position.toThreeVector3());
            this.mesh.material.opacity = this.alpha;
            
            // Dynamic emissive intensity based on speed
            const speed = this.velocity.length();
            this.mesh.material.emissiveIntensity = this.glowIntensity * 0.5 * (1 + speed * 0.1);
            
            // Update glow meshes
            if (this.innerGlowMesh) {
                this.innerGlowMesh.position.copy(this.position.toThreeVector3());
                this.innerGlowMesh.material.opacity = this.alpha * 0.4;
            }
            
            if (this.glowMesh) {
                this.glowMesh.position.copy(this.position.toThreeVector3());
                this.glowMesh.material.opacity = this.alpha * 0.15;
                
                // Pulsing effect
                const pulse = Math.sin(this.age * 0.1) * 0.2 + 1.0;
                this.glowMesh.scale.setScalar(pulse);
            }
            
            // Type-specific updates
            if (this.coronaMesh) {
                this.coronaMesh.position.copy(this.position.toThreeVector3());
                this.coronaMesh.material.opacity = this.alpha * 0.08;
                
                // Electric field fluctuation
                const fluctuation = Math.sin(this.age * 0.2) * 0.3 + 1.0;
                this.coronaMesh.scale.setScalar(fluctuation);
            }
            
            // Rotation for visual interest
            this.mesh.rotation.x += speed * 0.01;
            this.mesh.rotation.y += speed * 0.01;
        }
    }
    
    applyGravitationalForces(gravityWells) {
        gravityWells.forEach(well => {
            const direction = well.position.subtract(this.position);
            const distance = direction.length();
            
            if (distance < Physics.MIN_DISTANCE) return;
            
            // Calculate gravitational force
            let force = MathUtils.gravitationalForce(this.mass, well.mass, distance);
            
            // Apply antimatter properties
            if (this.antiGravity && this.type === 'antimatter') {
                force *= -0.5; // Reduced repulsion for visual appeal
            }
            
            // Apply force as acceleration (F = ma, so a = F/m)
            const acceleration = direction.normalize().multiply(force / this.mass);
            this.acceleration = this.acceleration.add(acceleration);
        });
    }
    
    applyParticleInteractions(otherParticles) {
        const cohesionForce = new Vector3D(0, 0, 0);
        const separationForce = new Vector3D(0, 0, 0);
        let neighborCount = 0;
        
        otherParticles.forEach(other => {
            if (other === this || !other.alive) return;
            
            const direction = other.position.subtract(this.position);
            const distance = direction.length();
            
            // Only interact with nearby particles
            if (distance < Physics.COHESION_DISTANCE && distance > 0) {
                neighborCount++;
                
                // Cohesion - attract to nearby particles of same type
                if (other.type === this.type) {
                    cohesionForce.x += direction.x * Physics.SURFACE_TENSION;
                    cohesionForce.y += direction.y * Physics.SURFACE_TENSION;
                    cohesionForce.z += direction.z * Physics.SURFACE_TENSION;
                }
                
                // Separation - avoid crowding
                if (distance < Physics.COHESION_DISTANCE * 0.5) {
                    const separationStrength = (Physics.COHESION_DISTANCE * 0.5 - distance) / distance;
                    separationForce.x -= direction.x * separationStrength * 0.5;
                    separationForce.y -= direction.y * separationStrength * 0.5;
                    separationForce.z -= direction.z * separationStrength * 0.5;
                }
            }
        });
        
        // Apply cohesion and separation forces
        if (neighborCount > 0) {
            this.acceleration = this.acceleration.add(cohesionForce.divide(neighborCount));
            this.acceleration = this.acceleration.add(separationForce);
        }
    }
    
    applyLiquidEffects(deltaTime) {
        switch (this.type) {
            case 'crystal':
                // Crystallization effect - particles slow down over time
                this.crystallization += deltaTime * 0.01;
                this.viscosity = Math.max(0.7, this.viscosity - deltaTime * 0.001);
                break;
                
            case 'temporal':
                // Time distortion effect - variable time flow
                this.timeDistortion = 1.0 + 0.3 * Math.sin(this.age * 0.05);
                break;
                
            case 'antimatter':
                // Antimatter effects - occasional energy bursts
                if (Math.random() < 0.001) {
                    const burst = new Vector3D(
                        MathUtils.randomFloat(-0.5, 0.5),
                        MathUtils.randomFloat(-0.5, 0.5),
                        MathUtils.randomFloat(-0.5, 0.5)
                    );
                    this.acceleration = this.acceleration.add(burst);
                }
                break;
                
            case 'plasma':
                // Plasma turbulence
                const turbulence = new Vector3D(
                    MathUtils.noise(this.position.x * 0.1, this.age * 0.01) - 0.5,
                    MathUtils.noise(this.position.y * 0.1, this.age * 0.01) - 0.5,
                    MathUtils.noise(this.position.z * 0.1, this.age * 0.01) - 0.5
                ).multiply(0.1);
                this.acceleration = this.acceleration.add(turbulence);
                break;
        }
    }
    
    updateTrail() {
        // Add current position to trail
        this.trail.push({
            position: this.position.clone(),
            alpha: this.alpha,
            age: 0
        });
        
        // Update trail segments
        this.trail.forEach(segment => {
            segment.age++;
            segment.alpha = 1.0 - (segment.age / this.maxTrailLength);
        });
        
        // Remove old trail segments
        this.trail = this.trail.filter(segment => segment.age < this.maxTrailLength);
    }
    
    updateVisualProperties() {
        // Update alpha based on age
        const ageRatio = this.age / this.maxAge;
        this.alpha = Math.max(0, 1.0 - ageRatio * ageRatio);
        
        // Update size based on velocity and type
        const velocityMagnitude = this.velocity.length();
        this.size = Physics.PARTICLE_SIZE * (1.0 + velocityMagnitude * 0.1);
        
        // Type-specific visual updates
        switch (this.type) {
            case 'crystal':
                // Crystals grow larger as they crystallize
                this.size *= (1.0 + this.crystallization * 0.5);
                break;
                
            case 'temporal':
                // Temporal particles pulse
                this.size *= (1.0 + 0.3 * Math.sin(this.age * 0.1));
                break;
                
            case 'antimatter':
                // Antimatter particles have unstable size
                this.size *= (1.0 + 0.1 * Math.sin(this.age * 0.3));
                break;
        }
    }
    
    checkOrbitStatus(gravityWells) {
        // Simple orbit detection based on circular motion
        gravityWells.forEach(well => {
            const distance = this.position.distance(well.position);
            const velocity = this.velocity.length();
            const orbitalVel = MathUtils.orbitalVelocity(well.mass, distance);
            
            // Check if velocity is close to orbital velocity
            const velocityRatio = Math.abs(velocity - orbitalVel) / orbitalVel;
            
            if (velocityRatio < 0.3 && distance > well.radius * 2) {
                if (!this.isInOrbit) {
                    this.isInOrbit = true;
                    this.orbitCenter = well.position.clone();
                    this.orbitRadius = distance;
                }
            } else {
                this.isInOrbit = false;
                this.orbitCenter = null;
            }
        });
    }
    
    createMesh() {
        // Create SPECTACULAR particle with advanced materials
        const geometry = new THREE.SphereGeometry(this.size, 16, 12); // Higher quality geometry
        
        // Advanced material with custom shader-like properties
        const material = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: this.alpha,
            emissive: this.glowColor,
            emissiveIntensity: this.glowIntensity * 0.5,
            blending: THREE.AdditiveBlending // Additive blending for spectacular glow
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position.toThreeVector3());
        
        // Create SPECTACULAR multi-layered glow effect
        const innerGlowGeometry = new THREE.SphereGeometry(this.size * 1.5, 12, 8);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: this.glowColor,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });
        
        const outerGlowGeometry = new THREE.SphereGeometry(this.size * 3, 8, 6);
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
            color: this.glowColor,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });
        
        this.innerGlowMesh = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        this.innerGlowMesh.position.copy(this.position.toThreeVector3());
        
        this.glowMesh = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
        this.glowMesh.position.copy(this.position.toThreeVector3());
        
        // Type-specific spectacular effects
        if (this.type === 'plasma') {
            // Add electric corona effect
            const coronaGeometry = new THREE.SphereGeometry(this.size * 4, 6, 4);
            const coronaMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.08,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide
            });
            this.coronaMesh = new THREE.Mesh(coronaGeometry, coronaMaterial);
            this.coronaMesh.position.copy(this.position.toThreeVector3());
        }
        
        return { 
            particle: this.mesh, 
            glow: this.glowMesh, 
            innerGlow: this.innerGlowMesh,
            corona: this.coronaMesh 
        };
    }
    
    dispose() {
        // Clean up Three.js objects
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
        }
        if (this.glowMesh) {
            if (this.glowMesh.geometry) this.glowMesh.geometry.dispose();
            if (this.glowMesh.material) this.glowMesh.material.dispose();
        }
        this.alive = false;
    }
}
