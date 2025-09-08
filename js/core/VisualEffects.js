/**
 * VisualEffects - Advanced visual effects system for liquid types
 * Creates unique, spectacular visuals for each liquid with custom shaders
 */

import * as THREE from 'three';

export class VisualEffects {
    constructor(renderer) {
      this.renderer = renderer;

      // Shader materials for each liquid type
      this.liquidMaterials = new Map();
      this.trailSystems = new Map();
      this.effectMeshes = new Map();

      // Post-processing effects
      this.bloomPass = null;
      this.chromaticAberrationPass = null;
      this.filmGrainPass = null;

      // Texture atlases for effects
      this.particleTextures = new Map();
      this.noiseTextures = new Map();

      // Performance settings
      this.qualityLevel = "high"; // high, medium, low
      this.effectsEnabled = true;

      // Time uniform for animations
      this.time = 0;

      // NOTE: Do not auto-call initialize() here. The RenderEngine explicitly
      // awaits visualEffects.initialize() to ensure proper sequencing.
      // Auto-invoking the async initialize inside the constructor caused a
      // duplicate initialization race (textures & materials built twice).
      // Call initialize() explicitly after construction.
    }
    
    async initialize() {
        // Create textures for effects
        await this.createParticleTextures();
        await this.createNoiseTextures();
        
        // Initialize liquid-specific materials
        this.initializeLiquidMaterials();
        
        console.log('VisualEffects system initialized');
    }
    
    async createParticleTextures() {
        // Plasma texture - electric energy
        this.particleTextures.set('plasma', this.createPlasmaTexture());
        
        // Crystal texture - geometric patterns
        this.particleTextures.set('crystal', this.createCrystalTexture());
        
        // Temporal texture - time distortion
        this.particleTextures.set('temporal', this.createTemporalTexture());
        
        // Antimatter texture - void distortion
        this.particleTextures.set('antimatter', this.createAntimatterTexture());
        
        // Quantum texture - probability cloud
        this.particleTextures.set('quantum', this.createQuantumTexture());
        
        // Dark matter texture - gravitational lensing
        this.particleTextures.set('darkmatter', this.createDarkMatterTexture());
        
        // Exotic texture - impossible geometry
        this.particleTextures.set('exotic', this.createExoticTexture());
        
        // Photonic texture - light beams
        this.particleTextures.set('photonic', this.createPhotonicTexture());
    }
    
    createPlasmaTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Electric arc pattern
        const centerX = 64, centerY = 64;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 64);
        
        gradient.addColorStop(0, 'rgba(0,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(0,200,255,0.8)');
        gradient.addColorStop(0.6, 'rgba(0,100,255,0.4)');
        gradient.addColorStop(1, 'rgba(0,50,255,0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        // Add electric arcs
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = centerX + Math.cos(angle) * 20;
            const y1 = centerY + Math.sin(angle) * 20;
            const x2 = centerX + Math.cos(angle) * 50;
            const y2 = centerY + Math.sin(angle) * 50;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createCrystalTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Crystal lattice pattern
        const centerX = 64, centerY = 64;
        
        // Base crystal glow
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 64);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.5, 'rgba(200,200,255,0.6)');
        gradient.addColorStop(1, 'rgba(100,100,200,0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        // Geometric patterns
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        
        // Hexagonal pattern
        for (let ring = 1; ring <= 3; ring++) {
            const radius = ring * 15;
            ctx.beginPath();
            for (let i = 0; i <= 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createTemporalTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Time distortion spiral
        const centerX = 64, centerY = 64;
        
        // Background gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 64);
        gradient.addColorStop(0, 'rgba(255,0,255,1)');
        gradient.addColorStop(0.4, 'rgba(200,0,200,0.7)');
        gradient.addColorStop(0.8, 'rgba(150,0,150,0.3)');
        gradient.addColorStop(1, 'rgba(100,0,100,0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        // Spiral time distortion
        ctx.strokeStyle = 'rgba(255,100,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < 100; i++) {
            const t = i / 100;
            const angle = t * Math.PI * 6;
            const radius = t * 50;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createAntimatterTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Void distortion effect
        const centerX = 64, centerY = 64;
        
        // Dark core with red edges
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 64);
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(0.3, 'rgba(50,0,0,0.8)');
        gradient.addColorStop(0.6, 'rgba(255,50,50,0.6)');
        gradient.addColorStop(0.8, 'rgba(255,100,100,0.3)');
        gradient.addColorStop(1, 'rgba(255,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        // Annihilation rings
        ctx.strokeStyle = 'rgba(255,50,50,0.9)';
        ctx.lineWidth = 1;
        for (let ring = 1; ring <= 4; ring++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, ring * 12, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createQuantumTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Probability cloud
        const centerX = 64, centerY = 64;
        
        // Fuzzy quantum cloud
        for (let i = 0; i < 200; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 50;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            const size = Math.random() * 4 + 1;
            const alpha = Math.random() * 0.5 + 0.2;
            
            ctx.fillStyle = `rgba(100,255,100,${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createDarkMatterTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Gravitational lensing effect
        const centerX = 64, centerY = 64;
        
        // Dark gradient with lensing distortion
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 64);
        gradient.addColorStop(0, 'rgba(50,50,50,1)');
        gradient.addColorStop(0.3, 'rgba(30,30,30,0.8)');
        gradient.addColorStop(0.6, 'rgba(70,70,70,0.4)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        // Lensing rings
        ctx.strokeStyle = 'rgba(100,100,100,0.6)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, 15 + i * 8, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createExoticTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Impossible geometry
        const centerX = 64, centerY = 64;
        
        // Shifting color gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 64);
        gradient.addColorStop(0, 'rgba(255,170,0,1)');
        gradient.addColorStop(0.3, 'rgba(255,100,100,0.8)');
        gradient.addColorStop(0.6, 'rgba(100,255,170,0.6)');
        gradient.addColorStop(1, 'rgba(170,100,255,0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        // Fractal-like patterns
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1;
        
        for (let level = 0; level < 3; level++) {
            const numSides = 5 + level * 2;
            const radius = 20 + level * 15;
            
            ctx.beginPath();
            for (let i = 0; i <= numSides; i++) {
                const angle = (i / numSides) * Math.PI * 2;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createPhotonicTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Light beam effect
        const centerX = 64, centerY = 64;
        
        // Bright core
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 64);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,200,0.9)');
        gradient.addColorStop(0.5, 'rgba(255,255,100,0.6)');
        gradient.addColorStop(0.8, 'rgba(255,255,0,0.3)');
        gradient.addColorStop(1, 'rgba(255,200,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        // Light rays
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = centerX + Math.cos(angle) * 10;
            const y1 = centerY + Math.sin(angle) * 10;
            const x2 = centerX + Math.cos(angle) * 60;
            const y2 = centerY + Math.sin(angle) * 60;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    async createNoiseTextures() {
        // Create Perlin noise texture for various effects
        this.noiseTextures.set('perlin', this.createPerlinNoiseTexture());
        this.noiseTextures.set('cloud', this.createCloudNoiseTexture());
    }
    
    createPerlinNoiseTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        const imageData = ctx.createImageData(256, 256);
        const data = imageData.data;
        
        // Simple noise generation
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random();
            data[i] = noise * 255;     // R
            data[i + 1] = noise * 255; // G
            data[i + 2] = noise * 255; // B
            data[i + 3] = 255;         // A
        }
        
        ctx.putImageData(imageData, 0, 0);
        return new THREE.CanvasTexture(canvas);
    }
    
    createCloudNoiseTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Multi-octave noise for cloud-like patterns
        const imageData = ctx.createImageData(256, 256);
        const data = imageData.data;
        
        for (let y = 0; y < 256; y++) {
            for (let x = 0; x < 256; x++) {
                const index = (y * 256 + x) * 4;
                
                // Simple fractal noise
                let noise = 0;
                let amplitude = 1;
                let frequency = 0.01;
                
                for (let octave = 0; octave < 4; octave++) {
                    noise += Math.sin(x * frequency) * Math.sin(y * frequency) * amplitude;
                    amplitude *= 0.5;
                    frequency *= 2;
                }
                
                noise = (noise + 1) * 0.5; // Normalize to 0-1
                
                data[index] = noise * 255;     // R
                data[index + 1] = noise * 255; // G
                data[index + 2] = noise * 255; // B
                data[index + 3] = 255;         // A
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        return new THREE.CanvasTexture(canvas);
    }
    
    initializeLiquidMaterials() {
        // Create custom shader materials for each liquid type
        this.liquidMaterials.set('plasma', this.createPlasmaMaterial());
        this.liquidMaterials.set('crystal', this.createCrystalMaterial());
        this.liquidMaterials.set('temporal', this.createTemporalMaterial());
        this.liquidMaterials.set('antimatter', this.createAntimatterMaterial());
        this.liquidMaterials.set('quantum', this.createQuantumMaterial());
        this.liquidMaterials.set('darkmatter', this.createDarkMatterMaterial());
        this.liquidMaterials.set('exotic', this.createExoticMaterial());
        this.liquidMaterials.set('photonic', this.createPhotonicMaterial());
    }
    
    createPlasmaMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                pointTexture: { value: this.particleTextures.get('plasma') },
                size: { value: 4.0 },
                electricField: { value: new THREE.Vector3(0, 1, 0) }
            },
            vertexShader: `
                uniform float time;
                uniform float size;
                attribute vec3 customColor;
                varying vec3 vColor;
                varying float vIntensity;
                
                void main() {
                    vColor = customColor;
                    
                    // Electric field distortion
                    vec3 pos = position;
                    float distortion = sin(time * 10.0 + pos.x * 0.1) * 0.5;
                    pos.y += distortion;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    
                    // Pulsing intensity
                    vIntensity = 0.8 + 0.2 * sin(time * 5.0);
                    
                    gl_PointSize = size * (300.0 / -mvPosition.z) * vIntensity;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                uniform float time;
                varying vec3 vColor;
                varying float vIntensity;
                
                void main() {
                    vec2 coords = gl_PointCoord;
                    
                    // Electric arc effect
                    float arc = sin(coords.x * 20.0 + time * 10.0) * 0.1;
                    coords.y += arc;
                    
                    vec4 texColor = texture2D(pointTexture, coords);
                    
                    // Electric glow
                    vec3 finalColor = vColor * texColor.rgb * vIntensity;
                    finalColor += vec3(0.0, 0.5, 1.0) * texColor.a * 0.3;
                    
                    gl_FragColor = vec4(finalColor, texColor.a);
                }
            `,
            blending: THREE.AdditiveBlending,
            transparent: true,
            vertexColors: true
        });
    }
    
    createCrystalMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                pointTexture: { value: this.particleTextures.get('crystal') },
                size: { value: 6.0 }
            },
            vertexShader: `
                uniform float time;
                uniform float size;
                attribute vec3 customColor;
                varying vec3 vColor;
                varying float vGrowth;
                
                void main() {
                    vColor = customColor;
                    
                    // Crystal growth effect
                    vGrowth = 0.8 + 0.2 * sin(time * 2.0);
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * vGrowth;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying vec3 vColor;
                varying float vGrowth;
                
                void main() {
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    
                    // Crystalline refraction
                    vec3 finalColor = vColor * texColor.rgb;
                    finalColor *= vGrowth;
                    
                    // Add prismatic edge
                    float edge = 1.0 - length(gl_PointCoord - 0.5) * 2.0;
                    finalColor += vec3(1.0) * edge * 0.3;
                    
                    gl_FragColor = vec4(finalColor, texColor.a);
                }
            `,
            blending: THREE.AdditiveBlending,
            transparent: true,
            vertexColors: true
        });
    }
    
    // Similar material creation methods for other liquid types...
    createTemporalMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                pointTexture: { value: this.particleTextures.get('temporal') },
                size: { value: 5.0 }
            },
            vertexShader: `
                uniform float time;
                uniform float size;
                attribute vec3 customColor;
                varying vec3 vColor;
                varying float vTimeDistortion;
                
                void main() {
                    vColor = customColor;
                    
                    // Time dilation effect
                    vTimeDistortion = sin(time * 0.5) * 0.5 + 0.5;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                uniform float time;
                varying vec3 vColor;
                varying float vTimeDistortion;
                
                void main() {
                    vec2 coords = gl_PointCoord;
                    
                    // Temporal distortion
                    float angle = atan(coords.y - 0.5, coords.x - 0.5);
                    float radius = length(coords - 0.5);
                    angle += time * 2.0 * vTimeDistortion;
                    
                    coords = vec2(cos(angle), sin(angle)) * radius + 0.5;
                    
                    vec4 texColor = texture2D(pointTexture, coords);
                    vec3 finalColor = vColor * texColor.rgb;
                    
                    gl_FragColor = vec4(finalColor, texColor.a);
                }
            `,
            blending: THREE.AdditiveBlending,
            transparent: true,
            vertexColors: true
        });
    }
    
    // Placeholder methods for other materials - would implement similar custom shaders
    createAntimatterMaterial() {
        return this.createBasicLiquidMaterial('antimatter');
    }
    
    createQuantumMaterial() {
        return this.createBasicLiquidMaterial('quantum');
    }
    
    createDarkMatterMaterial() {
        return this.createBasicLiquidMaterial('darkmatter');
    }
    
    createExoticMaterial() {
        return this.createBasicLiquidMaterial('exotic');
    }
    
    createPhotonicMaterial() {
        return this.createBasicLiquidMaterial('photonic');
    }
    
    createBasicLiquidMaterial(type) {
        return new THREE.PointsMaterial({
            size: 4,
            map: this.particleTextures.get(type),
            blending: THREE.AdditiveBlending,
            transparent: true,
            vertexColors: true,
            sizeAttenuation: true
        });
    }
    
    // Get material for specific liquid type
    getLiquidMaterial(liquidType) {
        return this.liquidMaterials.get(liquidType) || this.liquidMaterials.get('plasma');
    }
    
    // Update time uniforms for animation
    update(deltaTime) {
        this.time += deltaTime;
        
        // Update shader uniforms
        for (const [type, material] of this.liquidMaterials) {
            if (material.uniforms && material.uniforms.time) {
                material.uniforms.time.value = this.time;
            }
        }
    }
    
    // Performance management
    setQualityLevel(level) {
        this.qualityLevel = level;
        
        // Adjust effects based on quality
        const qualitySettings = {
            high: { particleSize: 6, effectsEnabled: true },
            medium: { particleSize: 4, effectsEnabled: true },
            low: { particleSize: 2, effectsEnabled: false }
        };
        
        const settings = qualitySettings[level];
        
        // Update material properties
        for (const [type, material] of this.liquidMaterials) {
            if (material.uniforms && material.uniforms.size) {
                material.uniforms.size.value = settings.particleSize;
            }
        }
        
        this.effectsEnabled = settings.effectsEnabled;
    }
    
    dispose() {
        // Clean up materials and textures
        for (const [type, material] of this.liquidMaterials) {
            material.dispose();
        }
        
        for (const [type, texture] of this.particleTextures) {
            texture.dispose();
        }
        
        for (const [type, texture] of this.noiseTextures) {
            texture.dispose();
        }
    }
}
