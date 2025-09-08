/**
 * RenderEngine - Three.js rendering system
 * Handles scene setup, camera controls, and particle rendering with advanced visual effects
 * @class
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VisualEffects } from './VisualEffects.js';
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/**
 * @typedef {Object} ScreenPosition
 * @property {number} x - The x coordinate in screen space
 * @property {number} y - The y coordinate in screen space
 */

/**
 * @typedef {Object} ParticleSystem
 * @property {Set} activeParticles - Set of active particles in the system
 */

export class RenderEngine {
    /**
     * Creates a new RenderEngine instance
     * @constructor
     * @param {HTMLElement} container - The DOM container to attach the canvas to
     */
    constructor(container) {
        /** @type {HTMLElement} The DOM container for the canvas */
        this.container = container;
        
        // Three.js core objects
        /** @type {THREE.Scene|null} The main Three.js scene */
        this.scene = null;
        /** @type {THREE.PerspectiveCamera|null} The camera for rendering */
        this.camera = null;
        /** @type {THREE.WebGLRenderer|null} The WebGL renderer */
        this.renderer = null;
        /** @type {OrbitControls|null} Camera controls for user interaction */
        this.controls = null;

        // Metaballs - temporarily disabled to prevent type errors
        /** @type {Worker|null} Web worker for metaball calculations */
        this.metaballsWorker = null;
        /** @type {THREE.Mesh|null} The mesh representing the liquid surface */
        this.liquidMesh = null;
        
        // Metaballs worker temporarily disabled due to type safety issues
        console.log('Metaballs worker disabled to prevent type errors - will be fixed in future version');
        
        // Visual effects system
        /** @type {VisualEffects|null} The visual effects system */
        this.visualEffects = null;
        
        // Rendering components
        /** @type {Map<string, THREE.Material>} Different materials per liquid type */
        this.particleMaterials = new Map();
        /** @type {THREE.ShaderMaterial|null} Material for gravity wells */
        this.gravityWellMaterial = null;
        /** @type {string} Current selected liquid type */
        this.currentLiquidType = 'plasma';
        
        // Particle rendering
        /** @type {THREE.Points|null} Main particle mesh for rendering */
        this.particleMesh = null;
        /** @type {ParticleSystem|null} Reference to particle system for material updates */
        this.particleSystemRef = null;
        
        // Post-processing
        /** @type {EffectComposer|null} Post-processing composer */
        this.composer = null;
        
        // State
        /** @type {HTMLCanvasElement|null} The rendering canvas */
        this.canvas = null;
        /** @type {boolean} Whether the render engine is initialized */
        this.isInitialized = false;
    }
    
    /**
     * Initializes the render engine with all necessary components
     * @async
     * @returns {Promise<void>}
     * @throws {Error} When initialization fails
     */
    async initialize() {
        try {
            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
            this.setupControls();
            
            // Initialize visual effects system
            this.visualEffects = new VisualEffects(this.renderer);
            await this.visualEffects.initialize();
            
            this.setupMaterials();
            this.setupLighting();
            this.setupPostProcessing();
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('Failed to initialize RenderEngine:', error);
            throw error;
        }
    }
    
    /**
     * Sets up the Three.js scene with background and fog
     * @private
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        
        // Add subtle fog for depth
        this.scene.fog = new THREE.Fog(0x000011, 500, 2000);
    }
    
    /**
     * Sets up the perspective camera with appropriate settings
     * @private
     */
    setupCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);
        
        // Position camera for good initial view
        this.camera.position.set(0, 100, 300);
        this.camera.lookAt(0, 0, 0);
    }
    
    /**
     * Sets up the WebGL renderer with optimal settings
     * @private
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enable tone mapping for HDR-like effects
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Enable gamma correction
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        this.canvas = this.renderer.domElement;
        this.container.appendChild(this.canvas);
    }
    
    /**
     * Sets up orbit controls for camera interaction
     * @private
     */
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.canvas);
        
        // Configure controls for smooth camera movement
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 2000;
        this.controls.maxPolarAngle = Math.PI; // Allow full rotation
        
        // Smooth zoom
        this.controls.zoomSpeed = 0.5;
        this.controls.panSpeed = 0.8;
        this.controls.rotateSpeed = 0.4;
    }
    
    /**
     * Sets up materials for different liquid types and gravity wells
     * @private
     */
    setupMaterials() {
        // Set up materials for each liquid type using visual effects system
        const liquidTypes = ['plasma', 'crystal', 'temporal', 'antimatter', 'quantum', 'darkmatter', 'exotic', 'photonic'];
        
        for (const liquidType of liquidTypes) {
            this.particleMaterials.set(liquidType, this.visualEffects.getLiquidMaterial(liquidType));
        }
        
        // Gravity well material with enhanced glow
        this.gravityWellMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                color: { value: new THREE.Color(0x4488ff) },
                opacity: { value: 0.8 }
            },
            vertexShader: `
                uniform float time;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    
                    // Pulsing effect
                    vec3 pos = position;
                    float pulse = 1.0 + 0.1 * sin(time * 3.0);
                    pos *= pulse;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color;
                uniform float opacity;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    vec2 center = vec2(0.5, 0.5);
                    float dist = distance(vUv, center);
                    
                    // Fresnel-like glow
                    float fresnel = 1.0 - dist * 2.0;
                    fresnel = max(0.0, fresnel);
                    
                    // Pulsing intensity
                    float pulse = 0.7 + 0.3 * sin(time * 4.0);
                    
                    vec3 finalColor = color * fresnel * pulse;
                    float finalAlpha = opacity * fresnel;
                    
                    gl_FragColor = vec4(finalColor, finalAlpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
    }
    
    /**
     * Sets up the particle system for rendering individual particles
     * @param {ParticleSystem} particleSystem - The particle system to set up
     * @returns {THREE.Points} The created particle points mesh
     */
    setupParticleSystem(particleSystem) {
        // Store reference to particle system for material switching
        this.particleSystemRef = particleSystem;

        // Start with plasma material as default
        const defaultMaterial = this.visualEffects.getLiquidMaterial('plasma');

        // Create Points mesh from particle geometry
        this.particleMesh = new THREE.Points(particleSystem.particleGeometry, defaultMaterial);
        this.scene.add(this.particleMesh);

        console.log('Particle rendering system setup complete');
        return this.particleMesh;
    }
    
    /**
     * Updates the particle material based on the currently selected liquid type
     * @param {string} liquidType - The type of liquid to render particles as
     */
    updateParticleMaterial(liquidType) {
        if (this.particleMesh && this.visualEffects) {
            const newMaterial = this.visualEffects.getLiquidMaterial(liquidType);
            
            // Dispose old material to prevent memory leaks
            if (this.particleMesh.material && this.particleMesh.material.dispose) {
                this.particleMesh.material.dispose();
            }
            
            this.particleMesh.material = newMaterial;
            this.currentLiquidType = liquidType;
            
            console.log(`Updated particle material to: ${liquidType}`);
        }
    }
    
    /**
     * Sets up scene lighting with ambient and directional lights
     * @private
     */
    setupLighting() {
        // Ambient light for basic visibility
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // Directional light for depth
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(100, 100, 50);
        this.scene.add(directionalLight);
    }
    
    /**
     * Sets up post-processing effects including bloom
     * @private
     */
    setupPostProcessing() {
      // Basic bloom post-processing for liquid glow enhancement
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.2, // strength
        0.4, // radius
        0.85 // threshold
      );
      this.composer.addPass(bloomPass);
      this.bloomPass = bloomPass;
    }
    
    /**
     * Converts 2D screen coordinates to 3D world coordinates.
     * Projects the mouse click onto a plane at z=0.
     * @param {{x: number, y: number}} screenPosition - The 2D screen coordinates.
     * @returns {THREE.Vector3|undefined} The 3D world coordinates, or undefined if calculation fails.
     */
    screenToWorld(screenPosition) {
        if (!screenPosition || !this.camera) {
            console.warn('screenToWorld: Invalid input parameters');
            return undefined;
        }

        try {
            var vec = new THREE.Vector3();
            var pos = new THREE.Vector3();

            vec.set(
                (screenPosition.x / window.innerWidth) * 2 - 1,
                - (screenPosition.y / window.innerHeight) * 2 + 1,
                0.5 );

            vec.unproject( this.camera );

            vec.sub( this.camera.position ).normalize();

            // Guard against division by zero when clicking along the horizon
            if (Math.abs(vec.z) < 0.0001) {
                console.warn('screenToWorld: Cannot calculate world position along horizon');
                return undefined;
            }

            var distance = - this.camera.position.z / vec.z;

            pos.copy( this.camera.position ).add( vec.multiplyScalar( distance ) );
            return pos;
        } catch (error) {
            console.error('screenToWorld: Calculation error:', error);
            return undefined;
        }
    }
    
    /**
     * Adds a visual representation of a gravity well to the scene
     * @param {THREE.Vector3} position - The position where the gravity well should be placed
     * @returns {THREE.Mesh} The created gravity well mesh
     */
    addGravityWellVisual(position) {
        const geometry = new THREE.SphereGeometry(20, 16, 16);
        const mesh = new THREE.Mesh(geometry, this.gravityWellMaterial.clone());
        
        mesh.position.copy(position);
        mesh.userData = { type: 'gravityWell', createdAt: performance.now() };
        
        this.scene.add(mesh);
        
        // Animate scale-in effect
        mesh.scale.setScalar(0);
        const targetScale = 1;
        
        const animate = () => {
            const progress = Math.min((performance.now() - mesh.userData.createdAt) / 500, 1);
            const scale = this.easeOutElastic(progress) * targetScale;
            mesh.scale.setScalar(scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        animate();
        
        return mesh;
    }
    
    /**
     * Elastic easing function for smooth animations
     * @param {number} t - Time parameter between 0 and 1
     * @returns {number} Eased value
     * @private
     */
    easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
    
    /**
     * Renders the scene with all visual effects and updates
     * @param {ParticleSystem} particleSystem - The particle system to render
     */
    render(particleSystem) {
        if (!this.isInitialized) return;

        // Update controls
        this.controls.update();

        // Update time-based effects
        const time = performance.now() * 0.001;
        const deltaTime = 0.016; // Assume 60 FPS for now

        // Update visual effects system
        this.visualEffects.update(deltaTime);

        // Update gravity well materials
        if (this.gravityWellMaterial.uniforms) {
            this.gravityWellMaterial.uniforms.time.value = time;
        }

        this.scene.traverse((object) => {
            if (object.userData.type === 'gravityWell' && object.material.uniforms) {
                object.material.uniforms.time.value = time;
            }
        });

        // Metaballs worker disabled - no liquid mesh updates needed

        if (this.composer) {
          this.composer.render();
        } else {
        this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * Handles window resize events by updating camera and renderer
     */
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (height === 0) return;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        if (this.composer) {
          this.composer.setSize(width, height);
        }
    }
    
    // Shader code
    getParticleVertexShader() {
        return `
            attribute float size;
            attribute vec3 customColor;
            
            varying vec3 vColor;
            
            uniform float time;
            uniform float scale;
            
            void main() {
                vColor = customColor;
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                
                // Particle size based on distance and custom size
                gl_PointSize = size * scale / -mvPosition.z;
                
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
    }
    
    getParticleFragmentShader() {
        return `
            uniform sampler2D pointTexture;
            uniform float time;
            
            varying vec3 vColor;
            
            void main() {
                // Sample the particle texture
                vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                
                // Apply particle color with glow effect
                vec3 finalColor = vColor * texColor.rgb;
                
                // Add subtle pulsing effect
                float pulse = 0.8 + 0.2 * sin(time * 2.0);
                finalColor *= pulse;
                
                gl_FragColor = vec4(finalColor, texColor.a);
            }
        `;
    }
    
    getGravityWellVertexShader() {
        return `
            uniform float time;
            
            void main() {
                vec3 pos = position;
                
                // Add slight pulsing effect
                float pulse = 1.0 + 0.1 * sin(time * 3.0);
                pos *= pulse;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;
    }
    
    getGravityWellFragmentShader() {
        return `
            uniform float time;
            uniform vec3 color;
            uniform float opacity;
            
            void main() {
                // Create a glowing sphere effect
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(gl_PointCoord, center);
                
                // Fresnel-like effect
                float fresnel = 1.0 - dist * 2.0;
                fresnel = max(0.0, fresnel);
                
                // Pulsing glow
                float pulse = 0.5 + 0.5 * sin(time * 4.0);
                
                vec3 finalColor = color * fresnel * pulse;
                float finalOpacity = opacity * fresnel;
                
                gl_FragColor = vec4(finalColor, finalOpacity);
            }
        `;
    }
    
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.controls) {
            this.controls.dispose();
        }
        
        // Clean up materials
        if (this.particleMaterial) {
            this.particleMaterial.dispose();
        }
        
        if (this.gravityWellMaterial) {
            this.gravityWellMaterial.dispose();
        }
    }
}
