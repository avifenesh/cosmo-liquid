// Visual effects system for trails, glow, and particle effects

class EffectsManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.renderer = sceneManager.renderer;
        
        // Trail systems
        this.trailSystems = [];
        this.maxTrails = 1000;
        
        // Particle effect pools
        this.sparklePool = [];
        this.explosionPool = [];
        this.activeEffects = [];
        
        // Post-processing effects
        this.bloomEnabled = true;
        this.glowIntensity = 1.0;
        
        // Effect materials
        this.trailMaterial = null;
        this.sparkleMaterial = null;
        this.explosionMaterial = null;
        
        this.initialize();
    }
    
    initialize() {
        this.createMaterials();
        this.createEffectPools();
    }
    
    createMaterials() {
        // Trail material with gradient opacity
        this.trailMaterial = new THREE.LineBasicMaterial({
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });
        
        // Sparkle material for small particle effects
        this.sparkleMaterial = new THREE.PointsMaterial({
            size: 2.0,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            sizeAttenuation: true
        });
        
        // Explosion material for burst effects
        this.explosionMaterial = new THREE.PointsMaterial({
            size: 4.0,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            sizeAttenuation: true
        });
    }
    
    createEffectPools() {
        // Pre-create sparkle effects for performance
        for (let i = 0; i < 200; i++) {
            const geometry = new THREE.BufferGeometry();
            const material = this.sparkleMaterial.clone();
            const sparkle = new THREE.Points(geometry, material);
            sparkle.visible = false;
            this.sparklePool.push(sparkle);
            this.scene.add(sparkle);
        }
        
        // Pre-create explosion effects
        for (let i = 0; i < 50; i++) {
            const geometry = new THREE.BufferGeometry();
            const material = this.explosionMaterial.clone();
            const explosion = new THREE.Points(geometry, material);
            explosion.visible = false;
            this.explosionPool.push(explosion);
            this.scene.add(explosion);
        }
    }
    
    update(deltaTime, particles) {
        // Update particle trails
        this.updateParticleTrails(particles);
        
        // Update active effects
        this.updateActiveEffects(deltaTime);
        
        // Clean up old effects
        this.cleanupEffects();
    }
    
    updateParticleTrails(particles) {
        particles.forEach(particle => {
            if (particle.alive && particle.trail && particle.trail.length > 1) {
                this.updateTrailGeometry(particle);
            }
        });
    }
    
    updateTrailGeometry(particle) {
        if (!particle.trailMesh) {
            // Create trail mesh for this particle
            const geometry = new THREE.BufferGeometry();
            const material = this.trailMaterial.clone();
            material.color.setHex(particle.glowColor);
            
            particle.trailMesh = new THREE.Line(geometry, material);
            this.scene.add(particle.trailMesh);
        }
        
        const trail = particle.trail;
        if (trail.length < 2) return;
        
        // Create positions and colors for trail
        const positions = new Float32Array(trail.length * 3);
        const colors = new Float32Array(trail.length * 3);
        
        const baseColor = new THREE.Color(particle.glowColor);
        
        trail.forEach((segment, index) => {
            // Position
            positions[index * 3] = segment.position.x;
            positions[index * 3 + 1] = segment.position.y;
            positions[index * 3 + 2] = segment.position.z;
            
            // Color with alpha based on age
            const alpha = segment.alpha || (1.0 - index / trail.length);
            colors[index * 3] = baseColor.r * alpha;
            colors[index * 3 + 1] = baseColor.g * alpha;
            colors[index * 3 + 2] = baseColor.b * alpha;
        });
        
        // Update geometry
        particle.trailMesh.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particle.trailMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particle.trailMesh.geometry.attributes.position.needsUpdate = true;
        particle.trailMesh.geometry.attributes.color.needsUpdate = true;
        
        // Update material opacity based on particle age
        const ageRatio = particle.age / particle.maxAge;
        particle.trailMesh.material.opacity = Math.max(0.1, 0.6 * (1 - ageRatio));
    }
    
    updateActiveEffects(deltaTime) {
        this.activeEffects.forEach((effect, index) => {
            effect.age += deltaTime;
            effect.update(deltaTime);
            
            // Remove expired effects
            if (effect.age > effect.lifetime) {
                effect.dispose();
                this.activeEffects.splice(index, 1);
            }
        });
    }
    
    cleanupEffects() {
        // Clean up trail meshes for dead particles
        this.trailSystems.forEach((trailMesh, index) => {
            if (!trailMesh.userData.particle || !trailMesh.userData.particle.alive) {
                this.scene.remove(trailMesh);
                trailMesh.geometry.dispose();
                trailMesh.material.dispose();
                this.trailSystems.splice(index, 1);
            }
        });
    }
    
    // Effect creation methods
    createSparkleEffect(position, color = 0xffffff, count = 20) {
        const sparkle = this.getFromPool(this.sparklePool);
        if (!sparkle) return;
        
        // Create sparkle particles
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const velocities = [];
        
        const baseColor = new THREE.Color(color);
        
        for (let i = 0; i < count; i++) {
            // Random position around center
            const offset = new Vector3D(
                MathUtils.randomFloat(-1, 1),
                MathUtils.randomFloat(-1, 1),
                MathUtils.randomFloat(-1, 1)
            ).normalize().multiply(MathUtils.randomFloat(0.1, 2.0));
            
            positions[i * 3] = position.x + offset.x;
            positions[i * 3 + 1] = position.y + offset.y;
            positions[i * 3 + 2] = position.z + offset.z;
            
            // Random velocity
            velocities.push(new Vector3D(
                MathUtils.randomFloat(-2, 2),
                MathUtils.randomFloat(-2, 2),
                MathUtils.randomFloat(-2, 2)
            ));
            
            // Color variation
            const hue = (baseColor.getHSL({}).h + MathUtils.randomFloat(-0.1, 0.1)) % 1;
            const sparkleColor = new THREE.Color().setHSL(hue, 0.8, 0.9);
            colors[i * 3] = sparkleColor.r;
            colors[i * 3 + 1] = sparkleColor.g;
            colors[i * 3 + 2] = sparkleColor.b;
        }
        
        sparkle.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        sparkle.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        sparkle.visible = true;
        
        // Create effect controller
        const effect = {
            mesh: sparkle,
            positions: positions,
            velocities: velocities,
            age: 0,
            lifetime: 2000, // 2 seconds
            particleCount: count,
            
            update: function(deltaTime) {
                // Update particle positions
                for (let i = 0; i < this.particleCount; i++) {
                    this.positions[i * 3] += this.velocities[i].x * deltaTime;
                    this.positions[i * 3 + 1] += this.velocities[i].y * deltaTime;
                    this.positions[i * 3 + 2] += this.velocities[i].z * deltaTime;
                    
                    // Apply gravity
                    this.velocities[i].y -= 0.5 * deltaTime;
                    
                    // Apply drag
                    this.velocities[i] = this.velocities[i].multiply(0.98);
                }
                
                this.mesh.geometry.attributes.position.needsUpdate = true;
                
                // Fade out over time
                const fadeRatio = 1 - (this.age / this.lifetime);
                this.mesh.material.opacity = fadeRatio * 0.8;
            },
            
            dispose: function() {
                this.mesh.visible = false;
            }
        };
        
        this.activeEffects.push(effect);
        return effect;
    }
    
    createExplosionEffect(position, color = 0xff4444, intensity = 1.0) {
        const explosion = this.getFromPool(this.explosionPool);
        if (!explosion) return;
        
        const count = Math.floor(30 * intensity);
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const velocities = [];
        
        const baseColor = new THREE.Color(color);
        
        for (let i = 0; i < count; i++) {
            // Start at center
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            
            // Random explosion velocity
            const direction = new Vector3D(
                MathUtils.randomFloat(-1, 1),
                MathUtils.randomFloat(-1, 1),
                MathUtils.randomFloat(-1, 1)
            ).normalize();
            
            const speed = MathUtils.randomFloat(5, 15) * intensity;
            velocities.push(direction.multiply(speed));
            
            // Hot colors (red/orange/yellow)
            const temperature = MathUtils.randomFloat(0.7, 1.0);
            const explosionColor = new THREE.Color().setHSL(
                MathUtils.randomFloat(0.0, 0.15), // Red to yellow
                1.0,
                temperature
            );
            colors[i * 3] = explosionColor.r;
            colors[i * 3 + 1] = explosionColor.g;
            colors[i * 3 + 2] = explosionColor.b;
        }
        
        explosion.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        explosion.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        explosion.visible = true;
        
        const effect = {
            mesh: explosion,
            positions: positions,
            colors: colors,
            velocities: velocities,
            age: 0,
            lifetime: 1500,
            particleCount: count,
            
            update: function(deltaTime) {
                for (let i = 0; i < this.particleCount; i++) {
                    // Update positions
                    this.positions[i * 3] += this.velocities[i].x * deltaTime;
                    this.positions[i * 3 + 1] += this.velocities[i].y * deltaTime;
                    this.positions[i * 3 + 2] += this.velocities[i].z * deltaTime;
                    
                    // Apply drag
                    this.velocities[i] = this.velocities[i].multiply(0.95);
                    
                    // Fade colors to black over time
                    const fadeRatio = 1 - (this.age / this.lifetime);
                    this.colors[i * 3] *= (0.99 + fadeRatio * 0.01);
                    this.colors[i * 3 + 1] *= (0.99 + fadeRatio * 0.01);
                    this.colors[i * 3 + 2] *= (0.99 + fadeRatio * 0.01);
                }
                
                this.mesh.geometry.attributes.position.needsUpdate = true;
                this.mesh.geometry.attributes.color.needsUpdate = true;
                
                // Fade out
                const fadeRatio = 1 - (this.age / this.lifetime);
                this.mesh.material.opacity = fadeRatio;
            },
            
            dispose: function() {
                this.mesh.visible = false;
            }
        };
        
        this.activeEffects.push(effect);
        return effect;
    }
    
    createOrbitRingEffect(center, radius, color = 0x4080ff) {
        // Create a glowing ring to highlight orbital zones
        const geometry = new THREE.RingGeometry(radius * 0.98, radius * 1.02, 64);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(center.toThreeVector3());
        ring.rotation.x = Math.PI / 2; // Make it horizontal
        
        this.scene.add(ring);
        
        const effect = {
            mesh: ring,
            age: 0,
            lifetime: 5000,
            
            update: function(deltaTime) {
                // Pulse effect
                const pulseIntensity = 0.3 + 0.2 * Math.sin(this.age * 0.005);
                this.mesh.material.opacity = pulseIntensity;
                this.mesh.rotation.z += deltaTime * 0.001;
            },
            
            dispose: function() {
                if (this.mesh.parent) {
                    this.mesh.parent.remove(this.mesh);
                }
                this.mesh.geometry.dispose();
                this.mesh.material.dispose();
            }
        };
        
        this.activeEffects.push(effect);
        return effect;
    }
    
    createGravityWave(center, maxRadius, color = 0x8040ff) {
        // Create expanding gravity wave effect
        const geometry = new THREE.RingGeometry(0, 1, 32);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        const wave = new THREE.Mesh(geometry, material);
        wave.position.copy(center.toThreeVector3());
        wave.rotation.x = Math.PI / 2;
        
        this.scene.add(wave);
        
        const effect = {
            mesh: wave,
            center: center,
            maxRadius: maxRadius,
            age: 0,
            lifetime: 3000,
            
            update: function(deltaTime) {
                const progress = this.age / this.lifetime;
                const currentRadius = progress * this.maxRadius;
                
                // Update ring size
                this.mesh.geometry.dispose();
                this.mesh.geometry = new THREE.RingGeometry(
                    currentRadius * 0.95,
                    currentRadius * 1.05,
                    32
                );
                
                // Fade out
                this.mesh.material.opacity = (1 - progress) * 0.6;
            },
            
            dispose: function() {
                if (this.mesh.parent) {
                    this.mesh.parent.remove(this.mesh);
                }
                this.mesh.geometry.dispose();
                this.mesh.material.dispose();
            }
        };
        
        this.activeEffects.push(effect);
        return effect;
    }
    
    // Pool management
    getFromPool(pool) {
        for (let i = 0; i < pool.length; i++) {
            if (!pool[i].visible) {
                return pool[i];
            }
        }
        return null; // Pool exhausted
    }
    
    // Cleanup methods
    clearAllEffects() {
        this.activeEffects.forEach(effect => {
            effect.dispose();
        });
        this.activeEffects = [];
        
        // Reset pools
        this.sparklePool.forEach(sparkle => {
            sparkle.visible = false;
        });
        
        this.explosionPool.forEach(explosion => {
            explosion.visible = false;
        });
    }
    
    removeParticleTrail(particle) {
        if (particle.trailMesh) {
            this.scene.remove(particle.trailMesh);
            particle.trailMesh.geometry.dispose();
            particle.trailMesh.material.dispose();
            particle.trailMesh = null;
        }
    }
    
    dispose() {
        this.clearAllEffects();
        
        // Dispose of materials
        if (this.trailMaterial) this.trailMaterial.dispose();
        if (this.sparkleMaterial) this.sparkleMaterial.dispose();
        if (this.explosionMaterial) this.explosionMaterial.dispose();
        
        // Dispose of pool objects
        [...this.sparklePool, ...this.explosionPool].forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
            if (obj.parent) obj.parent.remove(obj);
        });
    }
}
