// Three.js scene management and rendering

class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Lighting
        this.ambientLight = null;
        this.directionalLight = null;
        this.pointLights = [];
        
        // Background and environment
        this.starField = null;
        this.nebula = null;
        
        // Particle system for rendering optimization
        this.particleGeometry = null;
        this.particleMaterial = null;
        this.particleSystem = null;
        
        // Animation
        this.clock = new THREE.Clock();
        this.animationId = null;
        this.isRunning = false;
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.fps = 60;
        
        this.initialize();
    }
    
    initialize() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.createLighting();
        this.createBackground();
        this.setupEventListeners();
        
        console.log('Scene initialized successfully');
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000011, 100, 1000);
    }
    
    createCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(0, 20, 50);
        this.camera.lookAt(0, 0, 0);
    }
    
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enable transparency and better blending
        this.renderer.sortObjects = true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Background color
        this.renderer.setClearColor(0x000011, 1);
        
        this.container.appendChild(this.renderer.domElement);
    }
    
    createControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.5;
        
        // CRITICAL FIX: Make OrbitControls use RIGHT mouse button for rotation
        // This leaves LEFT mouse button completely free for liquid launching
        this.controls.mouseButtons = {
            LEFT: null, // Disable left click for OrbitControls
            MIDDLE: THREE.MOUSE.DOLLY, // Middle mouse for zoom
            RIGHT: THREE.MOUSE.ROTATE  // Right mouse for rotation
        };
        
        // Set reasonable limits
        this.controls.minDistance = 10;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI; // Allow full rotation
        
        // Smooth controls
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        
        // Allow controls to be temporarily disabled during liquid launching
        this.controlsEnabled = true;
    }
    
    createLighting() {
        // Ambient light for general illumination
        this.ambientLight = new THREE.AmbientLight(0x404080, 0.4);
        this.scene.add(this.ambientLight);
        
        // Directional light simulating distant starlight
        this.directionalLight = new THREE.DirectionalLight(0x8080ff, 0.6);
        this.directionalLight.position.set(50, 50, 25);
        this.directionalLight.castShadow = false; // Disable for performance
        this.scene.add(this.directionalLight);
        
        // Add some colored point lights for atmosphere
        this.addPointLight(new THREE.Vector3(30, 0, 30), 0xff4080, 0.3, 100);
        this.addPointLight(new THREE.Vector3(-30, 20, -30), 0x4080ff, 0.3, 100);
        this.addPointLight(new THREE.Vector3(0, -30, 20), 0x80ff40, 0.2, 80);
    }
    
    addPointLight(position, color, intensity, distance) {
        const light = new THREE.PointLight(color, intensity, distance);
        light.position.copy(position);
        this.pointLights.push(light);
        this.scene.add(light);
    }
    
    createBackground() {
        this.createStarField();
        this.createNebula();
    }
    
    createStarField() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 8000; // SPECTACULAR star count for immersive experience
        
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        
        for (let i = 0; i < starCount; i++) {
            // MAGNIFICENT multi-layered star distribution
            const layer = Math.floor(i / (starCount / 4)); // 4 layers
            const baseRadius = 150 + layer * 150;
            const radius = MathUtils.randomFloat(baseRadius, baseRadius + 100);
            
            // Galaxy spiral structure for more realism
            const spiralArm = Math.floor(i / (starCount / 3)); // 3 spiral arms
            const spiralAngle = (spiralArm * 2 * Math.PI / 3) + (radius * 0.01);
            const theta = spiralAngle + MathUtils.randomFloat(-0.5, 0.5);
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            // SPECTACULAR star colors based on stellar classification
            const starType = Math.random();
            const starColor = new THREE.Color();
            
            if (starType < 0.4) {
                // Main sequence stars (white to yellow-white)
                starColor.setHSL(MathUtils.randomFloat(0.15, 0.2), 0.3, MathUtils.randomFloat(0.8, 1.0));
            } else if (starType < 0.7) {
                // Blue-white hot stars
                starColor.setHSL(MathUtils.randomFloat(0.6, 0.67), 0.8, MathUtils.randomFloat(0.9, 1.0));
            } else if (starType < 0.9) {
                // Red giants and supergiants
                starColor.setHSL(MathUtils.randomFloat(0.0, 0.08), 1.0, MathUtils.randomFloat(0.6, 0.9));
            } else {
                // Rare neutron stars and pulsars (blue-purple)
                starColor.setHSL(MathUtils.randomFloat(0.7, 0.8), 1.0, 1.0);
            }
            
            colors[i * 3] = starColor.r;
            colors[i * 3 + 1] = starColor.g;
            colors[i * 3 + 2] = starColor.b;
            
            // DRAMATIC size variation
            let starSize = MathUtils.randomFloat(0.5, 2.0);
            if (starType > 0.95) starSize *= 3; // Supergiants
            if (starType > 0.98) starSize *= 5; // Hypergiants
            sizes[i] = starSize;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 4, // Larger for more dramatic effect
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending
        });
        
        this.starField = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.starField);
        
        console.log('🌌 Created MAGNIFICENT galaxy with', starCount, 'stars in spiral arms');
    }
    
    createNebula() {
        // Create a subtle nebula background using multiple large spheres
        const nebulaGroup = new THREE.Group();
        
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.SphereGeometry(MathUtils.randomFloat(100, 300), 16, 8);
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(
                    MathUtils.randomFloat(0.7, 0.9), // Blue to purple hues
                    0.6,
                    0.1
                ),
                transparent: true,
                opacity: 0.05,
                side: THREE.BackSide,
                fog: false
            });
            
            const nebulaSphere = new THREE.Mesh(geometry, material);
            nebulaSphere.position.set(
                MathUtils.randomFloat(-200, 200),
                MathUtils.randomFloat(-200, 200),
                MathUtils.randomFloat(-400, -100)
            );
            
            nebulaGroup.add(nebulaSphere);
        }
        
        this.nebula = nebulaGroup;
        this.scene.add(this.nebula);
    }
    
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        // Handle visibility change for performance
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    addObject(object) {
        this.scene.add(object);
    }
    
    removeObject(object) {
        this.scene.remove(object);
    }
    
    addParticle(particle) {
        const meshes = particle.createMesh();
        
        // Add all particle meshes for SPECTACULAR effects
        this.scene.add(meshes.particle);
        if (meshes.glow) this.scene.add(meshes.glow);
        if (meshes.innerGlow) this.scene.add(meshes.innerGlow);
        if (meshes.corona) this.scene.add(meshes.corona);
        
        console.log('✨ Added spectacular particle with', Object.keys(meshes).length, 'mesh layers');
    }
    
    removeParticle(particle) {
        // Remove all particle meshes
        if (particle.mesh) {
            this.scene.remove(particle.mesh);
        }
        if (particle.glowMesh) {
            this.scene.remove(particle.glowMesh);
        }
        if (particle.innerGlowMesh) {
            this.scene.remove(particle.innerGlowMesh);
        }
        if (particle.coronaMesh) {
            this.scene.remove(particle.coronaMesh);
        }
        particle.dispose();
    }
    
    addGravityWell(well) {
        const meshes = well.createMesh();
        this.scene.add(meshes.main);
        this.scene.add(meshes.glow);
        this.scene.add(meshes.field);
        meshes.rings.forEach(ring => this.scene.add(ring));
    }
    
    removeGravityWell(well) {
        if (well.mesh) this.scene.remove(well.mesh);
        if (well.glowMesh) this.scene.remove(well.glowMesh);
        if (well.fieldMesh) this.scene.remove(well.fieldMesh);
        well.orbitRings.forEach(ring => this.scene.remove(ring));
        well.dispose();
    }
    
    // Animation methods
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }
    
    pause() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    resume() {
        if (!this.isRunning) {
            this.start();
        }
    }
    
    animate() {
        if (!this.isRunning) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Update controls only if enabled
        if (this.controlsEnabled) {
            this.controls.update();
        }
        
        // Update background animations
        this.updateBackground(deltaTime);
        
        // Update performance monitoring
        this.updatePerformanceStats();
        
        // Render the scene
        this.render();
    }
    
    updateBackground(deltaTime) {
        // Slowly rotate star field
        if (this.starField) {
            this.starField.rotation.y += deltaTime * 0.001;
        }
        
        // Animate nebula
        if (this.nebula) {
            this.nebula.rotation.x += deltaTime * 0.0005;
            this.nebula.rotation.y += deltaTime * 0.0008;
        }
        
        // SPECTACULAR animated point lights with dynamic effects
        this.pointLights.forEach((light, index) => {
            const time = this.clock.elapsedTime;
            
            // Pulsing intensity with different frequencies
            const pulseFreq = 0.5 + index * 0.3;
            light.intensity = 0.4 + 0.3 * Math.sin(time * pulseFreq + index);
            
            // MAGNIFICENT color shifting through spectrum
            const hue = (time * 0.05 + index * 0.33) % 1;
            light.color.setHSL(hue, 0.7, 0.9);
            
            // Gentle orbital motion for living universe effect
            const orbitRadius = 8 + index * 2;
            const orbitSpeed = time * (0.1 + index * 0.05);
            const originalX = (index === 0) ? 30 : (index === 1) ? -30 : 0;
            const originalZ = (index === 0) ? 30 : (index === 1) ? -30 : 20;
            
            light.position.x = originalX + Math.cos(orbitSpeed) * orbitRadius * 0.3;
            light.position.z = originalZ + Math.sin(orbitSpeed) * orbitRadius * 0.3;
        });
    }
    
    updatePerformanceStats() {
        this.frameCount++;
        const now = performance.now();
        
        if (now - this.lastFPSUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = now;
        }
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    // Utility methods
    getMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1
        };
    }
    
    screenToWorld(screenX, screenY, depth = 50) {
        const mouse = new THREE.Vector2(screenX, screenY);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        // Project onto a plane perpendicular to camera view at specified depth
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        
        // Create plane at the specified depth in front of camera
        const planePoint = this.camera.position.clone().add(cameraDirection.multiplyScalar(depth));
        const plane = new THREE.Plane(cameraDirection.clone().negate(), -cameraDirection.dot(planePoint));
        
        const intersection = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        
        return intersection ? Vector3D.fromThreeVector3(intersection) : null;
    }
    
    worldToScreen(worldPosition) {
        const screenPosition = worldPosition.toThreeVector3().project(this.camera);
        return {
            x: (screenPosition.x + 1) / 2,
            y: -(screenPosition.y - 1) / 2
        };
    }
    
    enableAutoRotate() {
        this.controls.autoRotate = true;
    }
    
    disableAutoRotate() {
        this.controls.autoRotate = false;
    }
    
    focusOnObject(position, distance = 50) {
        // Smoothly move camera to focus on an object
        const targetPosition = position.toThreeVector3().clone();
        targetPosition.z += distance;
        
        // Simple animation to target position
        const startPosition = this.camera.position.clone();
        const duration = 2000; // 2 seconds
        const startTime = Date.now();
        
        const animateCamera = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = MathUtils.smootherStep(progress);
            
            this.camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            this.camera.lookAt(position.toThreeVector3());
            
            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        };
        
        animateCamera();
    }
    
    // Cleanup
    dispose() {
        this.pause();
        
        // Dispose of Three.js objects
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.starField) {
            this.starField.geometry.dispose();
            this.starField.material.dispose();
        }
        
        if (this.nebula) {
            this.nebula.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        
        // Remove renderer from DOM
        if (this.container && this.renderer && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
    
    // Performance optimization methods
    setQuality(level) {
        // Adjust rendering quality based on performance
        switch (level) {
            case 'low':
                this.renderer.setPixelRatio(1);
                this.starField.material.size = 1;
                break;
            case 'medium':
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
                this.starField.material.size = 1.5;
                break;
            case 'high':
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                this.starField.material.size = 2;
                break;
        }
    }
    
    getFPS() {
        return this.fps;
    }
}
