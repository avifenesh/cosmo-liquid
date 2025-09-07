// Gravity well system for creating gravitational fields

class GravityWell {
    constructor(position, mass = 100, radius = 2.0, type = 'star') {
        this.position = position.clone();
        this.mass = mass;
        this.radius = radius;
        this.type = type;
        this.active = true;
        
        // Visual properties
        this.color = this.getTypeColor(type);
        this.glowColor = this.getGlowColor(type);
        this.pulsePhase = Math.random() * Math.PI * 2;
        
        // Physics properties
        this.schwarzschildRadius = 2 * Physics.GRAVITY_STRENGTH * mass / (Physics.SPEED_OF_LIGHT * Physics.SPEED_OF_LIGHT);
        this.eventHorizon = Math.max(this.schwarzschildRadius, this.radius * 0.1);
        
        // Orbital zones for visual feedback
        this.stableOrbitZone = this.calculateStableOrbitRadius();
        this.dangerZone = this.radius * 3;
        
        // Three.js objects
        this.mesh = null;
        this.glowMesh = null;
        this.fieldMesh = null;
        this.orbitRings = [];
        
        // Animation properties
        this.rotationSpeed = 0.01;
        this.pulseSpeed = 0.05;
        this.age = 0;
        
        // Interaction tracking
        this.capturedParticles = [];
        this.orbitingParticles = [];
    }
    
    getTypeColor(type) {
        const colors = {
            star: 0xffdd44,
            planet: 0x4488ff,
            blackhole: 0x220022,
            neutron: 0xff44ff,
            gasgiant: 0x88ff44,
            dwarf: 0xffaa88
        };
        return colors[type] || colors.star;
    }
    
    getGlowColor(type) {
        const glowColors = {
            star: 0xffff88,
            planet: 0x88ccff,
            blackhole: 0x8800ff,
            neutron: 0xff88ff,
            gasgiant: 0xaaffaa,
            dwarf: 0xffccaa
        };
        return glowColors[type] || glowColors.star;
    }
    
    calculateStableOrbitRadius() {
        // Calculate radius for stable circular orbit
        // This is a simplified calculation for visual purposes
        return this.radius * 6 + Math.sqrt(Physics.GRAVITY_STRENGTH * this.mass) * 2;
    }
    
    update(deltaTime, particles) {
        this.age += deltaTime;
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Track particle interactions
        this.updateParticleTracking(particles);
        
        // Update Three.js objects
        if (this.mesh) {
            this.updateMeshes(deltaTime);
        }
        
        // Apply special effects based on type
        this.applyTypeEffects(deltaTime, particles);
    }
    
    updateVisualEffects(deltaTime) {
        // Update pulse phase for pulsing effects
        this.pulsePhase += this.pulseSpeed * deltaTime;
        
        // Type-specific visual updates
        switch (this.type) {
            case 'blackhole':
                // Black holes have irregular pulsing
                this.pulseSpeed = 0.02 + 0.01 * Math.sin(this.age * 0.1);
                break;
                
            case 'neutron':
                // Neutron stars pulse rapidly
                this.pulseSpeed = 0.2;
                this.rotationSpeed = 0.1;
                break;
                
            case 'star':
                // Stars have slow, steady pulsing
                this.pulseSpeed = 0.03;
                break;
                
            case 'planet':
                // Planets don't pulse much
                this.pulseSpeed = 0.01;
                break;
        }
    }
    
    updateParticleTracking(particles) {
        this.capturedParticles = [];
        this.orbitingParticles = [];
        
        particles.forEach(particle => {
            if (!particle.alive) return;
            
            const distance = this.position.distance(particle.position);
            
            // Check if particle is captured (inside danger zone)
            if (distance < this.dangerZone) {
                this.capturedParticles.push(particle);
            }
            
            // Check if particle is in stable orbit
            if (particle.isInOrbit && particle.orbitCenter && 
                this.position.distance(particle.orbitCenter) < this.radius) {
                this.orbitingParticles.push(particle);
            }
        });
    }
    
    updateMeshes(deltaTime) {
        // Rotate the gravity well
        this.mesh.rotation.y += this.rotationSpeed * deltaTime;
        
        // Pulse effect
        const pulseScale = 1.0 + 0.1 * Math.sin(this.pulsePhase);
        this.glowMesh.scale.setScalar(pulseScale);
        
        // Update glow intensity based on activity
        const activity = this.capturedParticles.length + this.orbitingParticles.length;
        const glowIntensity = 0.3 + Math.min(activity * 0.1, 0.7);
        this.glowMesh.material.opacity = glowIntensity;
        
        // Update field visualization if it exists
        if (this.fieldMesh) {
            this.fieldMesh.rotation.y -= this.rotationSpeed * 0.5 * deltaTime;
            this.fieldMesh.material.opacity = 0.1 + activity * 0.02;
        }
    }
    
    applyTypeEffects(deltaTime, particles) {
        switch (this.type) {
            case 'blackhole':
                this.applyBlackHoleEffects(particles);
                break;
                
            case 'neutron':
                this.applyNeutronStarEffects(particles);
                break;
                
            case 'star':
                this.applyStellarWindEffects(particles);
                break;
        }
    }
    
    applyBlackHoleEffects(particles) {
        // Black holes have strong gravitational lensing and accretion effects
        particles.forEach(particle => {
            const distance = this.position.distance(particle.position);
            
            // Event horizon effect - particles get destroyed
            if (distance < this.eventHorizon) {
                particle.alive = false;
                return;
            }
            
            // Accretion disk heating - particles glow brighter near black hole
            if (distance < this.stableOrbitZone) {
                const heatingFactor = (this.stableOrbitZone - distance) / this.stableOrbitZone;
                particle.glowIntensity = Math.min(particle.glowIntensity + heatingFactor, 5.0);
            }
        });
    }
    
    applyNeutronStarEffects(particles) {
        // Neutron stars emit powerful magnetic fields and radiation
        particles.forEach(particle => {
            const distance = this.position.distance(particle.position);
            
            if (distance < this.stableOrbitZone) {
                // Magnetic field effects on charged particles
                if (particle.type === 'plasma' || particle.type === 'antimatter') {
                    const magneticForce = new Vector3D(
                        Math.sin(this.age * 0.1) * 0.5,
                        Math.cos(this.age * 0.1) * 0.5,
                        Math.sin(this.age * 0.05) * 0.3
                    );
                    particle.acceleration = particle.acceleration.add(magneticForce);
                }
            }
        });
    }
    
    applyStellarWindEffects(particles) {
        // Stars emit solar wind that pushes particles outward
        particles.forEach(particle => {
            const direction = particle.position.subtract(this.position);
            const distance = direction.length();
            
            if (distance < this.stableOrbitZone && distance > this.radius * 2) {
                const windStrength = this.mass * 0.01 / (distance * distance);
                const windForce = direction.normalize().multiply(windStrength);
                particle.acceleration = particle.acceleration.add(windForce);
            }
        });
    }
    
    createMesh() {
        // Main gravity well body
        const geometry = new THREE.SphereGeometry(this.radius, 16, 12);
        
        let material;
        switch (this.type) {
            case 'blackhole':
                material = new THREE.MeshBasicMaterial({
                    color: this.color,
                    transparent: true,
                    opacity: 0.8
                });
                break;
                
            default:
                material = new THREE.MeshBasicMaterial({
                    color: this.color,
                    emissive: this.color,
                    emissiveIntensity: 0.3
                });
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position.toThreeVector3());
        
        // Glow effect
        const glowGeometry = new THREE.SphereGeometry(this.radius * 2, 16, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.glowColor,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowMesh.position.copy(this.position.toThreeVector3());
        
        // Gravitational field visualization
        this.createFieldVisualization();
        
        // Orbital zone indicators
        this.createOrbitRings();
        
        return {
            main: this.mesh,
            glow: this.glowMesh,
            field: this.fieldMesh,
            rings: this.orbitRings
        };
    }
    
    createFieldVisualization() {
        // Create a wireframe sphere to show gravitational influence
        const fieldGeometry = new THREE.SphereGeometry(this.stableOrbitZone, 16, 8);
        const fieldMaterial = new THREE.MeshBasicMaterial({
            color: this.glowColor,
            wireframe: true,
            transparent: true,
            opacity: 0.1
        });
        
        this.fieldMesh = new THREE.Mesh(fieldGeometry, fieldMaterial);
        this.fieldMesh.position.copy(this.position.toThreeVector3());
    }
    
    createOrbitRings() {
        // Create rings to show stable orbital zones
        const ringRadii = [
            this.stableOrbitZone * 0.7,
            this.stableOrbitZone,
            this.stableOrbitZone * 1.3
        ];
        
        ringRadii.forEach((radius, index) => {
            const ringGeometry = new THREE.RingGeometry(radius * 0.98, radius * 1.02, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: this.glowColor,
                transparent: true,
                opacity: 0.2 - index * 0.05,
                side: THREE.DoubleSide
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.copy(this.position.toThreeVector3());
            ring.rotation.x = Math.PI / 2; // Make it horizontal
            
            this.orbitRings.push(ring);
        });
    }
    
    // Calculate gravitational acceleration at a given position
    getGravitationalAcceleration(position, mass = 1.0) {
        const direction = this.position.subtract(position);
        const distance = direction.length();
        
        if (distance < Physics.MIN_DISTANCE) return new Vector3D(0, 0, 0);
        
        const force = MathUtils.gravitationalForce(mass, this.mass, distance);
        return direction.normalize().multiply(force / mass);
    }
    
    // Check if a position is within the gravity well's influence
    isInInfluence(position, threshold = 0.1) {
        const distance = this.position.distance(position);
        const acceleration = this.getGravitationalAcceleration(position);
        return acceleration.length() > threshold;
    }
    
    // Get orbital velocity required for circular orbit at given distance
    getOrbitalVelocity(distance) {
        return MathUtils.orbitalVelocity(this.mass, distance);
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
        if (this.fieldMesh) {
            if (this.fieldMesh.geometry) this.fieldMesh.geometry.dispose();
            if (this.fieldMesh.material) this.fieldMesh.material.dispose();
        }
        
        this.orbitRings.forEach(ring => {
            if (ring.geometry) ring.geometry.dispose();
            if (ring.material) ring.material.dispose();
        });
        
        this.active = false;
    }
}

// Gravity well manager for handling multiple wells
class GravitySystem {
    constructor() {
        this.wells = [];
        this.defaultWellTypes = ['star', 'planet', 'blackhole', 'neutron'];
    }
    
    addWell(position, mass = 100, radius = 2.0, type = 'star') {
        const well = new GravityWell(position, mass, radius, type);
        this.wells.push(well);
        return well;
    }
    
    removeWell(well) {
        const index = this.wells.indexOf(well);
        if (index !== -1) {
            well.dispose();
            this.wells.splice(index, 1);
        }
    }
    
    update(deltaTime, particles) {
        this.wells.forEach(well => {
            if (well.active) {
                well.update(deltaTime, particles);
            }
        });
    }
    
    getActiveWells() {
        return this.wells.filter(well => well.active);
    }
    
    clear() {
        this.wells.forEach(well => well.dispose());
        this.wells = [];
    }
    
    // Create a random well at a position
    createRandomWell(position) {
        const type = this.defaultWellTypes[MathUtils.randomInt(0, this.defaultWellTypes.length - 1)];
        const mass = MathUtils.randomFloat(50, 200);
        const radius = MathUtils.randomFloat(1.0, 3.0);
        
        return this.addWell(position, mass, radius, type);
    }
    
    // Get total gravitational field at a position
    getTotalGravitationalField(position, mass = 1.0) {
        let totalField = new Vector3D(0, 0, 0);
        
        this.wells.forEach(well => {
            if (well.active) {
                const fieldContribution = well.getGravitationalAcceleration(position, mass);
                totalField = totalField.add(fieldContribution);
            }
        });
        
        return totalField;
    }
}
