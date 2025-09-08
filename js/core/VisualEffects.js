/**
 * VisualEffects - Advanced visual effects system for liquid types
 * Creates unique, spectacular visuals for each liquid with custom shaders
 * @class
 */

import * as THREE from 'three';

/**
 * @typedef {Object} QualitySettings
 * @property {number} particleSize - Size of particles for this quality level
 * @property {boolean} effectsEnabled - Whether effects are enabled for this quality level
 */

export class VisualEffects {
    /**
     * Creates a new VisualEffects instance
     * @constructor
     * @param {THREE.WebGLRenderer} renderer - The Three.js WebGL renderer
     */
    constructor(renderer) {
      /** @type {THREE.WebGLRenderer} The Three.js WebGL renderer */
      this.renderer = renderer;

      // Shader materials for each liquid type
      /** @type {Map<string, THREE.Material>} Map of liquid type to shader material */
      this.liquidMaterials = new Map();
      /** @type {Map<string, Object>} Map of trail systems for each liquid type */
      this.trailSystems = new Map();
      /** @type {Map<string, THREE.Mesh>} Map of effect meshes for visual effects */
      this.effectMeshes = new Map();

      // Post-processing effects
      /** @type {Object|null} Bloom post-processing pass */
      this.bloomPass = null;
      /** @type {Object|null} Chromatic aberration post-processing pass */
      this.chromaticAberrationPass = null;
      /** @type {Object|null} Film grain post-processing pass */
      this.filmGrainPass = null;

      // Texture atlases for effects
      /** @type {Map<string, THREE.Texture>} Map of particle textures by liquid type */
      this.particleTextures = new Map();
      /** @type {Map<string, THREE.Texture>} Map of noise textures for effects */
      this.noiseTextures = new Map();

      // Performance settings
      /** @type {string} Current quality level: 'high', 'medium', or 'low' */
      this.qualityLevel = "high";
      /** @type {boolean} Whether visual effects are enabled */
      this.effectsEnabled = true;

      // Time uniform for animations
      /** @type {number} Current time for shader animations */
      this.time = 0;

      // NOTE: Do not auto-call initialize() here. The RenderEngine explicitly
      // awaits visualEffects.initialize() to ensure proper sequencing.
      // Auto-invoking the async initialize inside the constructor caused a
      // duplicate initialization race (textures & materials built twice).
      // Call initialize() explicitly after construction.
    }
    
    /**
     * Initializes the visual effects system by creating textures and materials
     * @async
     * @returns {Promise<void>}
     */
    async initialize() {
        // Create textures for effects
        await this.createParticleTextures();
        await this.createNoiseTextures();
        
        // Initialize liquid-specific materials
        this.initializeLiquidMaterials();
        
        console.log('VisualEffects system initialized');
    }
    
    /**
     * Creates all particle textures for different liquid types
     * @async
     * @returns {Promise<void>}
     * @private
     */
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
    
    /**
     * Creates a plasma texture with electric arc patterns
     * @returns {THREE.CanvasTexture} The created plasma texture
     * @private
     */
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
    
    /**
     * Creates a crystal texture with geometric lattice patterns
     * @returns {THREE.CanvasTexture} The created crystal texture
     * @private
     */
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
    
    /**
     * Creates a temporal texture with time distortion spiral patterns
     * @returns {THREE.CanvasTexture} The created temporal texture
     * @private
     */
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
    
    /**
     * Creates an antimatter texture with void distortion effects
     * @returns {THREE.CanvasTexture} The created antimatter texture
     * @private
     */
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
    
    /**
     * Creates a quantum texture with probability cloud patterns
     * @returns {THREE.CanvasTexture} The created quantum texture
     * @private
     */
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
    
    /**
     * Creates a dark matter texture with gravitational lensing effects
     * @returns {THREE.CanvasTexture} The created dark matter texture
     * @private
     */
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
    
    /**
     * Creates an exotic texture with impossible geometry patterns
     * @returns {THREE.CanvasTexture} The created exotic texture
     * @private
     */
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
    
    /**
     * Creates a photonic texture with light beam effects
     * @returns {THREE.CanvasTexture} The created photonic texture
     * @private
     */
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
    
    /**
     * Creates noise textures for various visual effects
     * @async
     * @returns {Promise<void>}
     * @private
     */
    async createNoiseTextures() {
        // Create Perlin noise texture for various effects
        this.noiseTextures.set('perlin', this.createPerlinNoiseTexture());
        this.noiseTextures.set('cloud', this.createCloudNoiseTexture());
    }
    
    /**
     * Creates a Perlin noise texture for procedural effects
     * @returns {THREE.CanvasTexture} The created Perlin noise texture
     * @private
     */
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
    
    /**
     * Creates a cloud noise texture with multi-octave patterns
     * @returns {THREE.CanvasTexture} The created cloud noise texture
     * @private
     */
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
    
    /**
     * Initializes custom shader materials for all liquid types
     * @private
     */
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

        // Create shared soft overlay material (used to visually blend clusters)
        this.softOverlayMaterial = this.createSoftOverlayMaterial();
    }

    /**
     * Creates a soft additive overlay material that renders enlarged gaussian splats
     * This approximates early-stage screen-space smoothing without extra passes.
     * @returns {THREE.ShaderMaterial}
     * @private
     */
    createSoftOverlayMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                intensity: { value: 0.55 },
                globalScale: { value: 1.8 }, // multiplies aSize for this overlay only
                falloff: { value: 1.4 }
            },
            vertexShader: `
                uniform float globalScale;
                attribute float aSize;
                varying float vFade;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float ps = max(2.0, aSize) * globalScale * (300.0 / -mvPosition.z);
                    gl_PointSize = ps;
                    // Slight distance fade to reduce halo popping
                    vFade = clamp(1.0 - (-mvPosition.z / 1500.0), 0.1, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float intensity;
                uniform float falloff;
                varying float vFade;
                void main() {
                    // Radial gaussian falloff
                    vec2 uv = gl_PointCoord - 0.5;
                    float d = dot(uv, uv) * 4.0; // 0 at center -> ~1 at edge
                    float alpha = exp(-d * falloff) * intensity * vFade;
                    if(alpha < 0.01) discard;
                    // Soft bluish-white energy tint (can be tinted later via blending)
                    vec3 col = mix(vec3(0.2,0.4,0.8), vec3(1.0), 1.0 - d);
                    gl_FragColor = vec4(col * alpha, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending
        });
    }

    /**
     * Returns the soft overlay material for optional smoothing layer
     * @returns {THREE.ShaderMaterial|null}
     */
    getSoftOverlayMaterial() {
        return this.softOverlayMaterial || null;
    }
    
    /**
     * Creates a plasma material with electric field distortions and pulsing effects
     * @returns {THREE.ShaderMaterial} The created plasma material
     * @private
     */
    createPlasmaMaterial() {
        return new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0.0 },
            pointTexture: { value: this.particleTextures.get("plasma") },
            size: { value: 4.0 }, // acts as global scale multiplier
            electricField: { value: new THREE.Vector3(0, 1, 0) },
            minPointSize: { value: 6.0 },
          },
          vertexShader: `
                uniform float time;
                uniform float size;
                                uniform float minPointSize;
                attribute vec3 customColor;
                attribute float aSize; // per-particle size
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
                    
                    float particleSize = aSize > 0.0 ? aSize : size; // fallback if attribute missing
                    // Clamp base size to avoid disappearing tiny points
                    particleSize = max(particleSize, 2.0);
                    float computed = particleSize * size * (300.0 / -mvPosition.z) * vIntensity;
                    gl_PointSize = max(minPointSize, computed);
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
          vertexColors: true,
        });
    }
    
    /**
     * Creates a crystal material with growth effects and prismatic refraction
     * @returns {THREE.ShaderMaterial} The created crystal material
     * @private
     */
    createCrystalMaterial() {
        return new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0.0 },
            pointTexture: { value: this.particleTextures.get("crystal") },
            size: { value: 6.0 },
            minPointSize: { value: 7.0 },
          },
          vertexShader: `
                uniform float time;
                uniform float size;
                                uniform float minPointSize;
                attribute vec3 customColor;
                attribute float aSize;
                varying vec3 vColor;
                varying float vGrowth;
                
                void main() {
                    vColor = customColor;
                    
                    // Crystal growth effect
                    vGrowth = 0.8 + 0.2 * sin(time * 2.0);
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float particleSize = aSize > 0.0 ? aSize : size;
                    particleSize = max(particleSize, 2.5);
                    float computed = particleSize * size * (300.0 / -mvPosition.z) * vGrowth;
                    gl_PointSize = max(minPointSize, computed);
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
          vertexColors: true,
        });
    }
    
    /**
     * Creates a temporal material with time dilation distortion effects
     * @returns {THREE.ShaderMaterial} The created temporal material
     * @private
     */
    createTemporalMaterial() {
        return new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0.0 },
            pointTexture: { value: this.particleTextures.get("temporal") },
            size: { value: 5.0 },
            minPointSize: { value: 6.0 },
          },
          vertexShader: `
                uniform float time;
                uniform float size;
                                uniform float minPointSize;
                attribute vec3 customColor;
                attribute float aSize;
                varying vec3 vColor;
                varying float vTimeDistortion;
                
                void main() {
                    vColor = customColor;
                    
                    // Time dilation effect
                    vTimeDistortion = sin(time * 0.5) * 0.5 + 0.5;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float particleSize = aSize > 0.0 ? aSize : size;
                    particleSize = max(particleSize, 2.0);
                    float computed = particleSize * size * (300.0 / -mvPosition.z);
                    gl_PointSize = max(minPointSize, computed);
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
          vertexColors: true,
        });
    }
    
    /**
     * Creates an antimatter material using basic liquid material as fallback
     * @returns {THREE.Material} The created antimatter material
     * @private
     */
    createAntimatterMaterial() {
        return this.createBasicLiquidMaterial('antimatter');
    }
    
    /**
     * Creates a quantum material using basic liquid material as fallback
     * @returns {THREE.Material} The created quantum material
     * @private
     */
    createQuantumMaterial() {
        return this.createBasicLiquidMaterial('quantum');
    }
    
    /**
     * Creates a dark matter material using basic liquid material as fallback
     * @returns {THREE.Material} The created dark matter material
     * @private
     */
    createDarkMatterMaterial() {
        return this.createBasicLiquidMaterial('darkmatter');
    }
    
    /**
     * Creates an exotic material using basic liquid material as fallback
     * @returns {THREE.Material} The created exotic material
     * @private
     */
    createExoticMaterial() {
        return this.createBasicLiquidMaterial('exotic');
    }
    
    /**
     * Creates a photonic material using basic liquid material as fallback
     * @returns {THREE.Material} The created photonic material
     * @private
     */
    createPhotonicMaterial() {
        return this.createBasicLiquidMaterial('photonic');
    }
    
    /**
     * Creates a basic liquid material with standard properties
     * @param {string} type - The liquid type for texture selection
     * @returns {THREE.PointsMaterial} The created basic material
     * @private
     */
    createBasicLiquidMaterial(type) {
        const texture = this.particleTextures.get(type);
        // Unified shader so per-particle aSize works and we can boost faint types
        return new THREE.ShaderMaterial({
          uniforms: {
            pointTexture: { value: texture },
            globalSize: { value: 4.0 },
            brightness: { value: 1.25 },
            time: { value: 0.0 },
            minPointSize: { value: 5.5 },
          },
          vertexShader: `
                uniform float globalSize;
                                uniform float minPointSize;
                attribute float aSize;
                attribute vec3 customColor;
                varying vec3 vColor;
                varying float vAlpha;
                void main(){
                    vColor = customColor;
                    vec4 mv = modelViewMatrix * vec4(position,1.0);
                    float baseSize = aSize > 0.0 ? aSize : globalSize;
                    baseSize = max(baseSize, 2.2); // enforce minimum for visibility
                    float computed = baseSize * globalSize * (300.0 / -mv.z);
                    gl_PointSize = max(minPointSize, computed);
                    vAlpha = 1.0; // could modulate later
                    gl_Position = projectionMatrix * mv;
                }
            `,
          fragmentShader: `
                uniform sampler2D pointTexture;
                uniform float brightness;
                varying vec3 vColor;
                varying float vAlpha;
                void main(){
                    vec4 tex = texture2D(pointTexture, gl_PointCoord);
                    if(tex.a < 0.05) discard;
                    vec3 col = vColor * tex.rgb * brightness;
                    float alpha = tex.a * vAlpha;
                    gl_FragColor = vec4(col, alpha);
                }
            `,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
          vertexColors: true,
        });
    }
    
    /**
     * Gets the material for a specific liquid type
     * @param {string} liquidType - The type of liquid to get material for
     * @returns {THREE.Material} The material for the liquid type, or plasma as fallback
     */
    getLiquidMaterial(liquidType) {
        return this.liquidMaterials.get(liquidType) || this.liquidMaterials.get('plasma');
    }
    
    /**
     * Updates time uniforms for animated shader effects
     * @param {number} deltaTime - The time elapsed since last update
     */
    update(deltaTime) {
        this.time += deltaTime;
        
        // Update shader uniforms
        for (const [type, material] of this.liquidMaterials) {
            if (material.uniforms && material.uniforms.time) {
                material.uniforms.time.value = this.time;
            }
        }
    }
    
    /**
     * Sets the quality level for visual effects performance management
     * @param {string} level - Quality level: 'high', 'medium', or 'low'
     */
    setQualityLevel(level) {
      this.qualityLevel = level;

      // Adjust effects based on quality
      const qualitySettings = {
        high: {
          particleSize: 6,
          effectsEnabled: true,
          overlayScale: 1.9,
          overlayIntensity: 0.6,
        },
        medium: {
          particleSize: 4,
          effectsEnabled: true,
          overlayScale: 1.6,
          overlayIntensity: 0.5,
        },
        low: {
          particleSize: 2,
          effectsEnabled: false,
          overlayScale: 1.3,
          overlayIntensity: 0.4,
        },
      };

      const settings = qualitySettings[level];

      // Update material properties
      for (const [type, material] of this.liquidMaterials) {
        if (material.uniforms && material.uniforms.size) {
          material.uniforms.size.value = settings.particleSize;
        }
      }
      // Adjust overlay smoothing if present
      if (this.softOverlayMaterial && this.softOverlayMaterial.uniforms) {
        if (this.softOverlayMaterial.uniforms.globalScale) {
          this.softOverlayMaterial.uniforms.globalScale.value =
            settings.overlayScale;
        }
        if (this.softOverlayMaterial.uniforms.intensity) {
          this.softOverlayMaterial.uniforms.intensity.value =
            settings.overlayIntensity;
        }
      }

      this.effectsEnabled = settings.effectsEnabled;
    }
    
    /**
     * Disposes of all materials and textures to free memory
     */
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
