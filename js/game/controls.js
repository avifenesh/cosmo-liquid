// Interactive controls for launching particles and placing gravity wells

class GameControls {
    constructor(sceneManager, gameState) {
        this.sceneManager = sceneManager;
        this.gameState = gameState;
        this.canvas = sceneManager.renderer.domElement;
        
        // Input state
        this.isMouseDown = false;
        this.isDragging = false;
        this.mouseStartPos = { x: 0, y: 0 };
        this.mouseCurrentPos = { x: 0, y: 0 };
        this.dragThreshold = 5; // pixels
        
        // UI elements
        this.liquidTypeSelect = document.getElementById('liquidType');
        this.launchPowerSlider = document.getElementById('launchPower');
        this.powerValueDisplay = document.getElementById('powerValue');
        this.clearButton = document.getElementById('clearCanvas');
        this.pauseButton = document.getElementById('pauseTime');
        
        // Launch preview
        this.launchPreview = null;
        this.showPreview = true;
        
        // Keyboard state
        this.keys = {};
        
        // Touch support for mobile
        this.touches = {};
        
        this.setupEventListeners();
        this.createLaunchPreview();
    }
    
    setupEventListeners() {
        // Disable OrbitControls during liquid launching
        this.isLaunching = false;
        
        // Mouse events with proper binding and debugging - CAPTURE PHASE
        this.canvas.addEventListener('mousedown', (e) => {
            console.log('🖱️ Mouse down detected:', e.button, e.clientX, e.clientY);
            this.onMouseDown(e);
        }, true); // Use capture phase to intercept before OrbitControls
        
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e), true);
        
        this.canvas.addEventListener('mouseup', (e) => {
            console.log('🖱️ Mouse up detected:', e.button);
            this.onMouseUp(e);
        }, true);
        
        this.canvas.addEventListener('contextmenu', (e) => this.onRightClick(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        
        // Keyboard events
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // UI controls
        this.launchPowerSlider.addEventListener('input', (e) => {
            this.powerValueDisplay.textContent = e.target.value;
        });
        
        this.clearButton.addEventListener('click', () => this.clearCanvas());
        this.pauseButton.addEventListener('click', () => this.togglePause());
        
        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        console.log('🎮 Controls initialized with enhanced debugging!');
    }
    
    createLaunchPreview() {
        // Create a line geometry for showing launch trajectory preview
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5
        });
        
        this.launchPreview = new THREE.Line(geometry, material);
        this.launchPreview.visible = false;
        this.sceneManager.scene.add(this.launchPreview);
    }
    
    onMouseDown(event) {
        if (event.button === 0) { // Left click for liquid launching
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            console.log('🚀 LEFT CLICK CAPTURED FOR LIQUID LAUNCHING!');
            
            this.isMouseDown = true;
            this.isDragging = false;
            this.isLaunching = true;
            
            // FORCE disable OrbitControls during liquid launching
            this.sceneManager.controls.enabled = false;
            
            const mousePos = this.sceneManager.getMousePosition(event);
            this.mouseStartPos = { x: mousePos.x, y: mousePos.y };
            this.mouseCurrentPos = { x: mousePos.x, y: mousePos.y };
            
            console.log('🎯 Launch start position:', this.mouseStartPos);
            
            // Show launch preview
            if (this.showPreview) {
                this.updateLaunchPreview();
                this.launchPreview.visible = true;
            }
            
            return false; // Prevent any other handlers
        }
    }
    
    onMouseMove(event) {
        const mousePos = this.sceneManager.getMousePosition(event);
        this.mouseCurrentPos = { x: mousePos.x, y: mousePos.y };
        
        if (this.isMouseDown) {
            const dragDistance = Math.sqrt(
                Math.pow(mousePos.x - this.mouseStartPos.x, 2) +
                Math.pow(mousePos.y - this.mouseStartPos.y, 2)
            );
            
            if (dragDistance > this.dragThreshold / window.innerWidth) {
                this.isDragging = true;
            }
            
            // Update launch preview
            if (this.isDragging && this.showPreview) {
                this.updateLaunchPreview();
            }
        }
    }
    
    onMouseUp(event) {
        if (event.button === 0 && this.isMouseDown) { // Left click release
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            console.log('🚀 LEFT CLICK RELEASE - LAUNCHING LIQUID!', { 
                dragging: this.isDragging, 
                startPos: this.mouseStartPos, 
                currentPos: this.mouseCurrentPos 
            });
            
            if (this.isDragging) {
                this.launchLiquidStream();
            } else {
                // Single click - launch spectacular burst
                this.launchLiquidBurst();
            }
            
            // Re-enable OrbitControls after liquid launch
            setTimeout(() => {
                this.sceneManager.controls.enabled = true;
            }, 100);
            
            this.isMouseDown = false;
            this.isDragging = false;
            this.isLaunching = false;
            this.launchPreview.visible = false;
            
            return false; // Prevent any other handlers
        }
    }
    
    onRightClick(event) {
        event.preventDefault();
        
        // Right click places a gravity well
        const mousePos = this.sceneManager.getMousePosition(event);
        const worldPos = this.sceneManager.screenToWorld(mousePos.x, mousePos.y);
        
        if (worldPos) {
            this.placeGravityWell(worldPos);
        }
    }
    
    onWheel(event) {
        // Wheel controls launch power when holding shift
        if (event.shiftKey) {
            event.preventDefault();
            const delta = -event.deltaY * 0.1;
            const currentPower = parseInt(this.launchPowerSlider.value);
            const newPower = MathUtils.clamp(currentPower + delta, 1, 100);
            
            this.launchPowerSlider.value = newPower;
            this.powerValueDisplay.textContent = newPower;
        }
    }
    
    onKeyDown(event) {
        this.keys[event.code] = true;
        
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePause();
                break;
                
            case 'KeyC':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.clearCanvas();
                }
                break;
                
            case 'KeyR':
                this.resetCamera();
                break;
                
            case 'Digit1':
                this.liquidTypeSelect.value = 'plasma';
                break;
            case 'Digit2':
                this.liquidTypeSelect.value = 'crystal';
                break;
            case 'Digit3':
                this.liquidTypeSelect.value = 'temporal';
                break;
            case 'Digit4':
                this.liquidTypeSelect.value = 'antimatter';
                break;
        }
    }
    
    onKeyUp(event) {
        this.keys[event.code] = false;
    }
    
    // Touch event handlers for mobile support
    onTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                button: 0
            });
            this.onMouseDown(mouseEvent);
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.onMouseMove(mouseEvent);
        }
    }
    
    onTouchEnd(event) {
        event.preventDefault();
        if (event.changedTouches.length === 1) {
            const touch = event.changedTouches[0];
            const mouseEvent = new MouseEvent('mouseup', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                button: 0
            });
            this.onMouseUp(mouseEvent);
        }
    }
    
    updateLaunchPreview() {
        if (!this.launchPreview) return;
        
        const startWorld = this.sceneManager.screenToWorld(this.mouseStartPos.x, this.mouseStartPos.y);
        const endWorld = this.sceneManager.screenToWorld(this.mouseCurrentPos.x, this.mouseCurrentPos.y);
        
        if (!startWorld || !endWorld) return;
        
        // Calculate launch velocity
        const launchVector = endWorld.subtract(startWorld);
        const power = parseInt(this.launchPowerSlider.value) / 100.0;
        const velocity = launchVector.multiply(power * 2);
        
        // Create trajectory points
        const trajectoryPoints = this.calculateTrajectory(startWorld, velocity, 100);
        
        // Update line geometry
        const positions = new Float32Array(trajectoryPoints.length * 3);
        trajectoryPoints.forEach((point, index) => {
            positions[index * 3] = point.x;
            positions[index * 3 + 1] = point.y;
            positions[index * 3 + 2] = point.z;
        });
        
        this.launchPreview.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.launchPreview.geometry.attributes.position.needsUpdate = true;
        
        // Update preview color based on liquid type
        const liquidType = this.liquidTypeSelect.value;
        const color = ColorUtils.getLiquidColor(liquidType, 'primary');
        this.launchPreview.material.color.setHex(color);
    }
    
    calculateTrajectory(startPos, velocity, steps = 50) {
        const points = [startPos.clone()];
        let pos = startPos.clone();
        let vel = velocity.clone();
        const deltaTime = 0.1;
        
        for (let i = 0; i < steps; i++) {
            // Apply gravity from existing wells
            const gravityAccel = this.gameState.gravitySystem.getTotalGravitationalField(pos);
            vel = vel.add(gravityAccel.multiply(deltaTime));
            
            // Apply drag
            vel = vel.multiply(Physics.DRAG_COEFFICIENT);
            
            // Update position
            pos = pos.add(vel.multiply(deltaTime));
            points.push(pos.clone());
            
            // Stop if trajectory goes too far
            if (pos.length() > 200) break;
        }
        
        return points;
    }
    
    launchLiquidStream() {
        const startWorld = this.sceneManager.screenToWorld(this.mouseStartPos.x, this.mouseStartPos.y, 20);
        const endWorld = this.sceneManager.screenToWorld(this.mouseCurrentPos.x, this.mouseCurrentPos.y, 20);
        
        console.log('🌍 World positions:', { startWorld, endWorld });
        
        if (!startWorld || !endWorld) {
            console.warn('❌ Failed to get world positions - using fallback');
            // Fallback: create particles at camera position with random velocity
            const fallbackPos = new Vector3D(0, 0, 0);
            const fallbackVel = new Vector3D(
                MathUtils.randomFloat(-10, 10),
                MathUtils.randomFloat(-5, 5),
                MathUtils.randomFloat(-10, 10)
            );
            const liquidType = this.liquidTypeSelect.value;
            this.gameState.launchParticle(fallbackPos, fallbackVel, liquidType);
            return;
        }
        
        const launchVector = endWorld.subtract(startWorld);
        const power = parseInt(this.launchPowerSlider.value) / 100.0;
        const velocity = launchVector.multiply(power * 15); // Increased multiplier for more dramatic effect
        const liquidType = this.liquidTypeSelect.value;
        
        console.log('💫 Launch params:', { launchVector, power, velocity, liquidType });
        
        // Launch spectacular stream of particles
        const particleCount = Math.max(15, Math.floor(launchVector.length() * 30));
        
        // Create initial explosion effect
        this.gameState.effects.createExplosionEffect(startWorld, ColorUtils.getLiquidColor(liquidType, 'glow'), 1.5);
        
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                // Add randomness for natural liquid flow
                const randomOffset = new Vector3D(
                    MathUtils.randomFloat(-1, 1),
                    MathUtils.randomFloat(-1, 1),
                    MathUtils.randomFloat(-1, 1)
                );
                
                const particleVel = velocity.add(randomOffset);
                const particle = this.gameState.launchParticle(startWorld, particleVel, liquidType);
                
                if (particle) {
                    console.log('✨ Particle launched:', particle.type);
                }
            }, i * 20); // Faster stagger for fluid effect
        }
        
        // Update score
        this.gameState.scoring.addLaunch(launchVector.length(), power);
        
        console.log('🎉 Liquid stream launched successfully!');
    }
    
    launchLiquidBurst() {
        const clickWorld = this.sceneManager.screenToWorld(this.mouseStartPos.x, this.mouseStartPos.y, 20);
        
        console.log('💥 Burst at world position:', clickWorld);
        
        if (!clickWorld) {
            console.warn('❌ Failed to get click world position - using fallback');
            // Fallback: create burst at origin
            const fallbackPos = new Vector3D(0, 0, 0);
            const power = parseInt(this.launchPowerSlider.value) / 100.0;
            const liquidType = this.liquidTypeSelect.value;
            
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const velocity = new Vector3D(
                    Math.cos(angle) * power * 8,
                    Math.sin(angle) * power * 8,
                    MathUtils.randomFloat(-2, 2) * power
                );
                this.gameState.launchParticle(fallbackPos, velocity, liquidType);
            }
            return;
        }
        
        const power = parseInt(this.launchPowerSlider.value) / 100.0;
        const liquidType = this.liquidTypeSelect.value;
        
        // Create spectacular burst effect
        this.gameState.effects.createExplosionEffect(clickWorld, ColorUtils.getLiquidColor(liquidType, 'glow'), 2.0);
        this.gameState.effects.createSparkleEffect(clickWorld, ColorUtils.getLiquidColor(liquidType, 'primary'), 25);
        
        // Launch particles in spectacular burst pattern
        const burstCount = 16; // More particles for better effect
        for (let i = 0; i < burstCount; i++) {
            const angle = (i / burstCount) * Math.PI * 2;
            const elevation = MathUtils.randomFloat(-Math.PI/4, Math.PI/4); // Add vertical spread
            
            const velocity = new Vector3D(
                Math.cos(angle) * Math.cos(elevation) * power * 8,
                Math.sin(angle) * Math.cos(elevation) * power * 8,
                Math.sin(elevation) * power * 8
            );
            
            const particle = this.gameState.launchParticle(clickWorld, velocity, liquidType);
            if (particle) {
                console.log('💫 Burst particle created:', particle.type);
            }
        }
        
        // Update score
        this.gameState.scoring.addBurst();
        
        console.log('💥 Spectacular burst launched!');
    }
    
    placeGravityWell(position) {
        // Cycle through different gravity well types
        const types = ['star', 'planet', 'blackhole', 'neutron'];
        const currentType = this.gameState.gravitySystem.wells.length % types.length;
        const type = types[currentType];
        
        // Vary mass and radius based on type
        let mass, radius;
        switch (type) {
            case 'star':
                mass = MathUtils.randomFloat(80, 150);
                radius = MathUtils.randomFloat(2, 4);
                break;
            case 'planet':
                mass = MathUtils.randomFloat(30, 80);
                radius = MathUtils.randomFloat(1, 2.5);
                break;
            case 'blackhole':
                mass = MathUtils.randomFloat(200, 400);
                radius = MathUtils.randomFloat(0.5, 1.5);
                break;
            case 'neutron':
                mass = MathUtils.randomFloat(100, 200);
                radius = MathUtils.randomFloat(0.8, 1.2);
                break;
        }
        
        const well = this.gameState.gravitySystem.addWell(position, mass, radius, type);
        this.sceneManager.addGravityWell(well);
        
        // Update score
        this.gameState.scoring.addGravityWell();
        
        // Focus camera on new well briefly
        setTimeout(() => {
            this.sceneManager.focusOnObject(position, 30);
        }, 100);
    }
    
    clearCanvas() {
        this.gameState.clearAll();
        this.gameState.scoring.reset();
    }
    
    togglePause() {
        if (this.gameState.isPaused) {
            this.gameState.resume();
            this.pauseButton.textContent = 'Pause';
            this.sceneManager.resume();
        } else {
            this.gameState.pause();
            this.pauseButton.textContent = 'Resume';
            this.sceneManager.pause();
        }
    }
    
    resetCamera() {
        this.sceneManager.camera.position.set(0, 20, 50);
        this.sceneManager.camera.lookAt(0, 0, 0);
        this.sceneManager.controls.reset();
    }
    
    // Utility methods
    setLiquidType(type) {
        this.liquidTypeSelect.value = type;
    }
    
    setLaunchPower(power) {
        this.launchPowerSlider.value = MathUtils.clamp(power, 1, 100);
        this.powerValueDisplay.textContent = this.launchPowerSlider.value;
    }
    
    togglePreview() {
        this.showPreview = !this.showPreview;
        if (!this.showPreview) {
            this.launchPreview.visible = false;
        }
    }
    
    // Help system
    showHelp() {
        const helpText = `
🌌 Liquid Galaxy Painter Controls:

🖱️ Mouse Controls:
• Click and drag: Launch liquid stream
• Single click: Launch liquid burst  
• Right-click: Place gravity well
• Scroll: Zoom in/out
• Shift+Scroll: Adjust launch power

⌨️ Keyboard Shortcuts:
• Space: Pause/Resume simulation
• C: Clear canvas
• R: Reset camera view
• 1-4: Select liquid type
• Arrow keys: Move camera

🎨 Liquid Types:
• Plasma: Glowing, turbulent streams
• Crystal: Solidifying, growing particles
• Temporal: Time-distorted, pulsing
• Anti-matter: Repelled by gravity

🪐 Gravity Wells:
• Star: Steady gravitational pull
• Planet: Moderate gravity field  
• Black Hole: Extreme gravity, event horizon
• Neutron Star: Magnetic field effects
        `;
        
        alert(helpText);
    }
    
    dispose() {
        // Remove event listeners
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('contextmenu', this.onRightClick);
        this.canvas.removeEventListener('wheel', this.onWheel);
        
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        this.canvas.removeEventListener('touchend', this.onTouchEnd);
        
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        
        // Clean up Three.js objects
        if (this.launchPreview) {
            this.sceneManager.scene.remove(this.launchPreview);
            this.launchPreview.geometry.dispose();
            this.launchPreview.material.dispose();
        }
    }
}
