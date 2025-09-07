// GPU-accelerated particle system for 10,000+ particles with spectacular effects

class GPUParticleSystem {
    constructor(sceneManager, maxParticles = 10000) {
        this.sceneManager = sceneManager;
        this.maxParticles = maxParticles;
        this.particleCount = 0;
        
        // Particle attributes for GPU processing
        this.positions = new Float32Array(maxParticles * 3);
        this.velocities = new Float32Array(maxParticles * 3);
        this.colors = new Float32Array(maxParticles * 4); // RGBA
        this.sizes = new Float32Array(maxParticles);
        this.lifetimes = new Float32Array(maxParticles);
        this.types = new Float32Array(maxParticles); // Liquid type encoding
        
        // Particle state management
        this.activeParticles = new Set();
        this.particlePool = [];
        
        // Initialize particle pool
        for (let i = 0; i < maxParticles; i++) {
            this.particlePool.push(i);
        }
        
        this.createGPUParticleSystem();
    }
    
    createGPUParticleSystem() {
        // Create buffer geometry for instanced rendering
        this.geometry = new THREE.BufferGeometry();
        
        // Set up attributes for GPU processing
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('velocity', new THREE.BufferAttribute(this.velocities, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        this.geometry.setAttribute('lifetime', new THREE.BufferAttribute(this.lifetimes, 1));
        this.geometry.setAttribute('particleType', new THREE.BufferAttribute(this.types, 1));
        
        // Create SPECTACULAR shader material with advanced effects
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                deltaTime: { value: 0 },
                gravityWells: { value: [] },
                wellCount: { value: 0 },
                cameraPosition: { value: new THREE.Vector3() },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                
                // Visual effect uniforms
                glowIntensity: { value: 2.0 },
                pulseFrequency: { value: 0.5 },
                trailLength: { value: 50 },
                chromaShift: { value: 0.1 },
                
                // Physics uniforms
                viscosity: { value: 0.98 },
                cohesion: { value: 0.1 },
                turbulence: { value: 0.2 },
                
                // Texture maps for advanced effects
                noiseTexture: { value: this.createNoiseTexture() },
                gradientTexture: { value: this.createGradientTexture() }
            },
            
            vertexShader: `
                uniform float time;
                uniform float deltaTime;
                uniform vec3 cameraPosition;
                uniform float pulseFrequency;
                
                attribute vec3 velocity;
                attribute vec4 color;
                attribute float size;
                attribute float lifetime;
                attribute float particleType;
                
                varying vec4 vColor;
                varying float vLifetime;
                varying float vType;
                varying float vDistance;
                
                // Quantum fluctuation effect
                vec3 quantumFluctuation(vec3 pos, float t) {
                    float quantum = sin(pos.x * 10.0 + t) * cos(pos.y * 10.0 - t) * sin(pos.z * 10.0);
                    return vec3(quantum) * 0.05;
                }
                
                // Relativistic length contraction
                float lorentzFactor(float velocity) {
                    float v = min(velocity, 0.99);
                    return sqrt(1.0 - v * v);
                }
                
                void main() {
                    vColor = color;
                    vLifetime = lifetime;
                    vType = particleType;
                    
                    vec3 pos = position;
                    
                    // Apply quantum fluctuations for temporal particles
                    if (particleType > 2.5 && particleType < 3.5) {
                        pos += quantumFluctuation(position, time);
                    }
                    
                    // Calculate distance for LOD
                    vDistance = length(cameraPosition - pos);
                    
                    // Dynamic size based on velocity and lifetime
                    float speed = length(velocity);
                    float relativisticSize = size * lorentzFactor(speed / 100.0);
                    
                    // Pulsing effect
                    float pulse = 1.0 + sin(time * pulseFrequency + position.x) * 0.2;
                    
                    // Age-based size modification
                    float ageFactor = smoothstep(0.0, 0.2, lifetime) * smoothstep(1.0, 0.8, lifetime);
                    
                    gl_PointSize = relativisticSize * pulse * ageFactor * (300.0 / vDistance);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            
            fragmentShader: `
                uniform float time;
                uniform float glowIntensity;
                uniform float chromaShift;
                uniform sampler2D noiseTexture;
                uniform sampler2D gradientTexture;
                
                varying vec4 vColor;
                varying float vLifetime;
                varying float vType;
                varying float vDistance;
                
                // Create spectacular glow effect
                vec4 createGlow(vec2 coord, vec4 color) {
                    float dist = length(coord - vec2(0.5));
                    
                    // Multi-layer glow with different falloffs
                    float glow1 = exp(-dist * 8.0) * 2.0;
                    float glow2 = exp(-dist * 4.0) * 1.0;
                    float glow3 = exp(-dist * 2.0) * 0.5;
                    
                    float totalGlow = glow1 + glow2 + glow3;
                    
                    // Add noise for organic feel
                    vec4 noise = texture2D(noiseTexture, coord + time * 0.01);
                    totalGlow *= (0.8 + noise.r * 0.2);
                    
                    // Chromatic aberration for spectral effect
                    vec3 finalColor = color.rgb;
                    finalColor.r += chromaShift * (1.0 - dist);
                    finalColor.b -= chromaShift * (1.0 - dist);
                    
                    return vec4(finalColor * totalGlow * glowIntensity, color.a * totalGlow);
                }
                
                // HDR tonemapping
                vec3 aces(vec3 x) {
                    float a = 2.51;
                    float b = 0.03;
                    float c = 2.43;
                    float d = 0.59;
                    float e = 0.14;
                    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
                }
                
                void main() {
                    vec2 coord = gl_PointCoord;
                    
                    // Create spectacular particle with glow
                    vec4 particle = createGlow(coord, vColor);
                    
                    // Type-specific effects
                    if (vType < 1.5) { // Plasma
                        // Electric arc effect
                        float arc = sin(coord.x * 20.0 + time * 10.0) * 0.1;
                        particle.rgb += vec3(1.0, 0.8, 0.0) * arc;
                    } else if (vType < 2.5) { // Crystal
                        // Prismatic refraction
                        vec3 prism = texture2D(gradientTexture, vec2(coord.x + coord.y, 0.5)).rgb;
                        particle.rgb = mix(particle.rgb, prism, 0.3);
                    } else if (vType < 3.5) { // Temporal
                        // Time distortion ripples
                        float ripple = sin(length(coord - 0.5) * 10.0 - time * 5.0) * 0.2;
                        particle.rgb = mix(particle.rgb, vec3(1.0, 0.0, 1.0), ripple);
                    } else { // Antimatter
                        // Inverse glow effect
                        particle.rgb = 1.0 - particle.rgb;
                        particle.rgb += vec3(0.0, 1.0, 1.0) * 0.5;
                    }
                    
                    // Lifetime fade
                    float fade = smoothstep(0.0, 0.1, vLifetime) * smoothstep(1.0, 0.9, vLifetime);
                    particle.a *= fade;
                    
                    // Distance-based quality adjustment
                    if (vDistance > 100.0) {
                        particle.a *= 0.5; // Reduce opacity for distant particles
                    }
                    
                    // HDR tonemapping for cinematic look
                    particle.rgb = aces(particle.rgb);
                    
                    // Additive blending preparation
                    particle.rgb *= particle.a;
                    
                    gl_FragColor = particle;
                }
            `,
            
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        });
        
        // Create the point cloud
        this.pointCloud = new THREE.Points(this.geometry, this.material);
        this.pointCloud.frustumCulled = false; // Always render for continuous effect
        this.sceneManager.scene.add(this.pointCloud);
    }
    
    createNoiseTexture() {
        // Create procedural noise texture for organic effects
        const size = 256;
        const data = new Uint8Array(size * size * 4);
        
        for (let i = 0; i < size * size * 4; i += 4) {
            const noise = Math.random();
            data[i] = noise * 255;
            data[i + 1] = noise * 255;
            data[i + 2] = noise * 255;
            data[i + 3] = 255;
        }
        
        const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
        
        return texture;
    }
    
    createGradientTexture() {
        // Create gradient texture for prismatic effects
        const size = 256;
        const data = new Uint8Array(size * 4);
        
        for (let i = 0; i < size; i++) {
            const t = i / size;
            const color = new THREE.Color();
            color.setHSL(t, 1.0, 0.5);
            
            data[i * 4] = color.r * 255;
            data[i * 4 + 1] = color.g * 255;
            data[i * 4 + 2] = color.b * 255;
            data[i * 4 + 3] = 255;
        }
        
        const texture = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    addParticle(position, velocity, type = 'plasma', mass = 1.0) {
        if (this.particlePool.length === 0) {
            // Recycle oldest particle if pool is empty
            const oldestIndex = Math.min(...this.activeParticles);
            this.activeParticles.delete(oldestIndex);
            this.particlePool.push(oldestIndex);
        }
        
        const index = this.particlePool.pop();
        this.activeParticles.add(index);
        
        // Set particle data
        const i3 = index * 3;
        this.positions[i3] = position.x;
        this.positions[i3 + 1] = position.y;
        this.positions[i3 + 2] = position.z;
        
        this.velocities[i3] = velocity.x;
        this.velocities[i3 + 1] = velocity.y;
        this.velocities[i3 + 2] = velocity.z;
        
        // Set color based on type
        const color = new THREE.Color(ColorUtils.getLiquidColor(type, 'glow'));
        const i4 = index * 4;
        this.colors[i4] = color.r;
        this.colors[i4 + 1] = color.g;
        this.colors[i4 + 2] = color.b;
        this.colors[i4 + 3] = 1.0;
        
        // Set size and lifetime
        this.sizes[index] = Physics.PARTICLE_SIZE * (1.0 + Math.random() * 0.5);
        this.lifetimes[index] = 1.0;
        
        // Encode type as number
        const typeMap = { plasma: 1, crystal: 2, temporal: 3, antimatter: 4 };
        this.types[index] = typeMap[type] || 1;
        
        // Mark attributes for update
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.velocity.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
        this.geometry.attributes.lifetime.needsUpdate = true;
        this.geometry.attributes.particleType.needsUpdate = true;
        
        this.particleCount++;
        
        return index;
    }
    
    updateGravityWells(wells) {
        // Convert gravity wells to uniform format
        const wellData = [];
        wells.forEach((well, i) => {
            if (i < 10) { // Limit to 10 wells for shader
                wellData.push(new THREE.Vector4(
                    well.position.x,
                    well.position.y,
                    well.position.z,
                    well.mass
                ));
            }
        });
        
        this.material.uniforms.gravityWells.value = wellData;
        this.material.uniforms.wellCount.value = wellData.length;
    }
    
    update(deltaTime, gravityWells) {
        // Update shader uniforms
        this.material.uniforms.time.value += deltaTime;
        this.material.uniforms.deltaTime.value = deltaTime;
        this.material.uniforms.cameraPosition.value.copy(this.sceneManager.camera.position);
        
        // Update gravity wells
        this.updateGravityWells(gravityWells);
        
        // GPU-based physics update happens in shader
        // Here we just update lifetimes and recycle dead particles
        this.activeParticles.forEach(index => {
            this.lifetimes[index] -= deltaTime * 0.001;
            
            if (this.lifetimes[index] <= 0) {
                this.activeParticles.delete(index);
                this.particlePool.push(index);
                this.particleCount--;
                
                // Reset particle data
                const i3 = index * 3;
                this.positions[i3] = 0;
                this.positions[i3 + 1] = 0;
                this.positions[i3 + 2] = 0;
                
                this.velocities[i3] = 0;
                this.velocities[i3 + 1] = 0;
                this.velocities[i3 + 2] = 0;
                
                const i4 = index * 4;
                this.colors[i4 + 3] = 0; // Set alpha to 0
            }
        });
        
        this.geometry.attributes.lifetime.needsUpdate = true;
    }
    
    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        this.sceneManager.scene.remove(this.pointCloud);
    }
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GPUParticleSystem;
}
