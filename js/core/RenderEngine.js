/**
 * RenderEngine - Three.js rendering system
 * Handles scene setup, camera controls, and particle rendering with advanced visual effects
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VisualEffects } from './VisualEffects.js';

export class RenderEngine {
    constructor(container) {
        this.container = container;
        
        // Three.js core objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Visual effects system
        this.visualEffects = null;
        
        // Rendering components
        this.particleMaterials = new Map(); // Different materials per liquid type
        this.gravityWellMaterial = null;
        this.currentLiquidType = 'plasma';
        
        // Multiple particle meshes for different liquid types
        this.particleMeshes = new Map();
        
        // Post-processing
        this.composer = null;
        
        // State
        this.canvas = null;
        this.isInitialized = false;
    }
    
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
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        
        // Add subtle fog for depth
        this.scene.fog = new THREE.Fog(0x000011, 500, 2000);
    }
    
    setupCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);
        
        // Position camera for good initial view
        this.camera.position.set(0, 100, 300);
        this.camera.lookAt(0, 0, 0);
    }
    
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
    
    setupParticleSystem(particleSystem) {
        // Create multiple particle meshes for different liquid types
        if (particleSystem && particleSystem.particleGeometry) {
            // Create a mesh for each liquid type (initially hidden)
            const liquidTypes = ['plasma', 'crystal', 'temporal', 'antimatter', 'quantum', 'darkmatter', 'exotic', 'photonic'];
            
            for (const liquidType of liquidTypes) {
                const material = this.particleMaterials.get(liquidType);
                const mesh = new THREE.Points(particleSystem.particleGeometry, material);
                mesh.visible = liquidType === 'plasma'; // Only show plasma initially
                this.particleMeshes.set(liquidType, mesh);
                this.scene.add(mesh);
            }
            
            console.log('Particle meshes added to scene for all liquid types');
            return this.particleMeshes.get('plasma');
        }
        return null;
    }
    
    // Switch active liquid type for rendering
    setActiveLiquidType(liquidType) {
        // Hide all particle meshes
        for (const [type, mesh] of this.particleMeshes) {
            mesh.visible = false;
        }
        
        // Show the selected liquid type mesh
        const activeMesh = this.particleMeshes.get(liquidType);
        if (activeMesh) {
            activeMesh.visible = true;
            this.currentLiquidType = liquidType;
        }
    }
    
    // Update particle geometry for active liquid type
    updateParticleGeometry(particleSystem) {
        // Update all meshes to use the same geometry data
        for (const [type, mesh] of this.particleMeshes) {
            if (mesh.geometry !== particleSystem.particleGeometry) {
                mesh.geometry = particleSystem.particleGeometry;
            }
        }
    }
    
    setupLighting() {
        // Ambient light for basic visibility
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // Directional light for depth
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(100, 100, 50);
        this.scene.add(directionalLight);
    }
    
    setupPostProcessing() {
        // TODO: Implement bloom and other effects in future iterations
        // For now, we'll use the basic renderer
    }
    
    screenToWorld(screenPosition) {
        // Convert screen coordinates to world coordinates
        const mouse = new THREE.Vector2();
        mouse.x = (screenPosition.x / window.innerWidth) * 2 - 1;
        mouse.y = -(screenPosition.y / window.innerHeight) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        // Project onto a plane in front of the camera
        const distance = 200; // Distance from camera
        const direction = raycaster.ray.direction.normalize();
        const worldPosition = this.camera.position.clone().add(direction.multiplyScalar(distance));
        
        return worldPosition;
    }
    
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
    
    easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
    
    render(particles) {
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
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
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
