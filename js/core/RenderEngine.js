/**
 * RenderEngine - Three.js rendering system
 * Handles scene setup, camera controls, and particle rendering
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class RenderEngine {
    constructor(container) {
        this.container = container;
        
        // Three.js core objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Rendering components
        this.particleMaterial = null;
        this.gravityWellMaterial = null;
        
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
        // Particle material with glow effect
        this.particleMaterial = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 4,
            sizeAttenuation: true,
            map: this.createParticleTexture(),
            blending: THREE.AdditiveBlending,
            transparent: true,
            vertexColors: true
        });
        
        // Gravity well material
        this.gravityWellMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
    }
    
    setupParticleSystem(particleSystem) {
        // Create Points mesh using particle geometry
        if (particleSystem && particleSystem.particleGeometry) {
            this.particleMesh = new THREE.Points(particleSystem.particleGeometry, this.particleMaterial);
            this.scene.add(this.particleMesh);
            console.log('Particle mesh added to scene');
            return this.particleMesh;
        }
        return null;
    }
    
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.4, 'rgba(255,255,255,0.4)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
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
        
        // Update gravity well materials (only if they have uniforms)
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
