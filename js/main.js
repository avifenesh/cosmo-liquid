// Main game controller for Liquid Galaxy Painter - SPECTACULAR EDITION

class GameState {
    constructor() {
        this.particles = [];
        this.gravitySystem = new GravitySystem();
        this.scoring = new ScoringSystem();
        this.sceneManager = null;
        this.controls = null;
        this.effects = null;
        
        // SPECTACULAR new systems
        this.gpuParticles = null;
        this.postProcessing = null;
        this.quantumPhysics = new QuantumPhysics();
        
        this.isPaused = false;
        this.clock = new THREE.Clock();
        this.lastUpdate = 0;
        
        // Performance tracking - MASSIVELY increased for GPU particles
        this.maxParticles = 10000; // GPU can handle way more!
        this.particleCleanupThreshold = 12000;
        this.useGPUParticles = true;
        
        // Game settings
        this.timeScale = 1.0;
        this.qualityLevel = 'ultra'; // Default to ULTRA quality!
        
        this.initialize();
    }
    
    initialize() {
        // Initialize scene manager
        const canvasContainer = document.getElementById('canvas-container');
        this.sceneManager = new SceneManager(canvasContainer);
        
        // Initialize SPECTACULAR GPU particle system
        if (this.useGPUParticles) {
            this.gpuParticles = new GPUParticleSystem(this.sceneManager, this.maxParticles);
            console.log('🚀 GPU Particle System initialized with', this.maxParticles, 'particles!');
        }
        
        // Initialize post-processing pipeline for cinematic effects
        if (typeof PostProcessingPipeline !== 'undefined') {
            // this.postProcessing = new PostProcessingPipeline(this.sceneManager);
            console.log('✨ Post-processing pipeline ready (disabled for now)');
        }
        
        // Initialize effects system
        this.effects = new EffectsManager(this.sceneManager);
        
        // Initialize controls
        this.controls = new GameControls(this.sceneManager, this);
        
        // Create initial galaxy setup with SPECTACULAR additions
        this.createInitialGalaxy();
        this.createAdvancedGravityWells();
        
        // Start the game loop
        this.sceneManager.start();
        this.startGameLoop();
        
        // Load saved progress if available
        this.scoring.load();
        
        console.log('🌌 Liquid Galaxy Painter SPECTACULAR EDITION initialized!');
        this.showWelcomeMessage();
        
        // Trigger achievement for starting the game
        if (window.holographicUI) {
            setTimeout(() => {
                window.holographicUI.showAchievement(
                    'Welcome to the Cosmos!',
                    'Begin your journey as a cosmic artist',
                    '🎨'
                );
            }, 2000);
        }
    }
    
    createInitialGalaxy() {
        // Create a SPECTACULAR galactic center with multiple stars
        const centerStar = this.gravitySystem.addWell(
            new Vector3D(0, 0, 0),
            150, 4.0, 'star'
        );
        this.sceneManager.addGravityWell(centerStar);
        
        // Binary star system!
        const binaryStar1 = this.gravitySystem.addWell(
            new Vector3D(30, 0, 0),
            80, 2.5, 'star'
        );
        this.sceneManager.addGravityWell(binaryStar1);
        
        const binaryStar2 = this.gravitySystem.addWell(
            new Vector3D(-30, 0, 0),
            80, 2.5, 'star'
        );
        this.sceneManager.addGravityWell(binaryStar2);
        
        // Planets in orbit
        const planet1 = this.gravitySystem.addWell(
            new Vector3D(50, 0, 20),
            40, 1.5, 'planet'
        );
        this.sceneManager.addGravityWell(planet1);
        
        const planet2 = this.gravitySystem.addWell(
            new Vector3D(-40, 30, -10),
            35, 1.2, 'planet'
        );
        this.sceneManager.addGravityWell(planet2);
        
        // Create quantum entanglement zone
        this.quantumPhysics.createTimeWarpZone(centerStar.position, 20, 0.8);
        
        // Create electromagnetic field around center
        this.quantumPhysics.createElectromagneticField(
            centerStar.position,
            'magnetic',
            50,
            30
        );
        
        // Create some initial spectacular effects
        setTimeout(() => {
            this.effects.createSparkleEffect(centerStar.position, centerStar.glowColor, 25);
            this.effects.createExplosionEffect(binaryStar1.position, 0xff8800, 2.0);
            this.effects.createExplosionEffect(binaryStar2.position, 0x8800ff, 2.0);
        }, 1000);
    }
    
    createAdvancedGravityWells() {
        // Add special gravity wells with unique properties
        
        // Black hole with gravitational lensing
        setTimeout(() => {
            const blackHole = this.gravitySystem.addWell(
                new Vector3D(0, -50, 0),
                300, 1.0, 'blackhole'
            );
            this.sceneManager.addGravityWell(blackHole);
            this.quantumPhysics.createGravitationalLens(blackHole.position, blackHole.mass);
            
            // Time dilation near black hole
            this.quantumPhysics.createTimeWarpZone(blackHole.position, 15, 0.3);
        }, 5000);
        
        // Neutron star with magnetic field
        setTimeout(() => {
            const neutronStar = this.gravitySystem.addWell(
                new Vector3D(70, 20, 0),
                150, 0.8, 'neutron'
            );
            this.sceneManager.addGravityWell(neutronStar);
            
            // Strong magnetic field
            this.quantumPhysics.createElectromagneticField(
                neutronStar.position,
                'magnetic',
                100,
                25
            );
        }, 8000);
    }
    
    startGameLoop() {
        const gameLoop = () => {
            if (!this.isPaused) {
                this.update();
            }
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }
    
    update() {
        const deltaTime = this.clock.getDelta() * this.timeScale;
        
        // Update physics
        this.updateParticles(deltaTime);
        this.updateGravitySystem(deltaTime);
        
        // Update visual effects
        this.effects.update(deltaTime, this.particles);
        
        // Update scoring system
        this.scoring.update(this.particles, this.gravitySystem.getActiveWells());
        
        // Cleanup dead particles
        this.cleanupParticles();
        
        // Performance optimization
        this.optimizePerformance();
        
        // Save progress periodically
        if (Math.random() < 0.001) { // About once every 1000 frames
            this.scoring.save();
        }
    }
    
    updateParticles(deltaTime) {
        const activeWells = this.gravitySystem.getActiveWells();
        
        // Update CPU particles (for complex physics)
        this.particles.forEach((particle, index) => {
            if (particle.alive) {
                particle.update(deltaTime, activeWells, this.particles);
                
                // Apply quantum physics to special particles
                if (particle.type === 'quantum' || particle.type === 'photonic' || 
                    particle.type === 'temporal' || particle.type === 'exotic') {
                    this.quantumPhysics.applyQuantumEffects(particle, deltaTime);
                    this.quantumPhysics.applyRelativisticEffects(particle, deltaTime);
                }
                
                // Check for special events
                this.checkParticleEvents(particle);
            }
        });
        
        // Update GPU particles (for massive particle counts)
        if (this.gpuParticles) {
            this.gpuParticles.update(deltaTime, activeWells);
        }
        
        // Update quantum physics system
        this.quantumPhysics.update(this.particles, deltaTime);
    }
    
    updateGravitySystem(deltaTime) {
        this.gravitySystem.update(deltaTime, this.particles);
    }
    
    checkParticleEvents(particle) {
        // Check for particle collisions with gravity wells
        this.gravitySystem.getActiveWells().forEach(well => {
            const distance = particle.position.distance(well.position);
            
            // Particle absorption by black holes
            if (well.type === 'blackhole' && distance < well.eventHorizon) {
                particle.alive = false;
                this.effects.createExplosionEffect(
                    particle.position,
                    particle.glowColor,
                    0.5
                );
                this.scoring.addScore(10, 'Black Hole Absorption');
            }
            
            // Orbital achievement detection
            if (particle.isInOrbit && !particle.orbitAchievementGiven) {
                particle.orbitAchievementGiven = true;
                this.effects.createOrbitRingEffect(
                    well.position,
                    particle.orbitRadius,
                    particle.glowColor
                );
            }
        });
        
        // Check for particle interactions
        this.particles.forEach(otherParticle => {
            if (otherParticle !== particle && otherParticle.alive) {
                const distance = particle.position.distance(otherParticle.position);
                
                // Particle collision/merging
                if (distance < 1.0 && particle.type === otherParticle.type) {
                    // Merge particles or create sparkle effect
                    if (Math.random() < 0.1) {
                        this.effects.createSparkleEffect(
                            particle.position,
                            particle.glowColor,
                            5
                        );
                        this.scoring.addScore(5, 'Particle Interaction');
                    }
                }
            }
        });
    }
    
    cleanupParticles() {
        // Remove dead particles and their effects
        this.particles = this.particles.filter(particle => {
            if (!particle.alive) {
                this.sceneManager.removeParticle(particle);
                this.effects.removeParticleTrail(particle);
                return false;
            }
            return true;
        });
        
        // Performance cleanup if too many particles
        if (this.particles.length > this.particleCleanupThreshold) {
            // Remove oldest particles
            const toRemove = this.particles.length - this.maxParticles;
            for (let i = 0; i < toRemove; i++) {
                const oldestParticle = this.particles.reduce((oldest, particle) => 
                    particle.age > oldest.age ? particle : oldest
                );
                
                const index = this.particles.indexOf(oldestParticle);
                if (index !== -1) {
                    oldestParticle.alive = false;
                }
            }
        }
    }
    
    optimizePerformance() {
        const fps = this.sceneManager.getFPS();
        
        // Dynamic quality adjustment based on performance
        if (fps < 30 && this.qualityLevel !== 'low') {
            this.qualityLevel = 'medium';
            this.sceneManager.setQuality('medium');
            Physics.TRAIL_LENGTH = 30;
        } else if (fps < 20) {
            this.qualityLevel = 'low';
            this.sceneManager.setQuality('low');
            Physics.TRAIL_LENGTH = 20;
            this.maxParticles = 300;
        } else if (fps > 55 && this.qualityLevel !== 'high') {
            this.qualityLevel = 'high';
            this.sceneManager.setQuality('high');
            Physics.TRAIL_LENGTH = 50;
            this.maxParticles = 500;
        }
    }
    
    launchParticle(position, velocity, type = 'plasma') {
        // Use GPU particles for most types, CPU for complex physics
        const useGPU = this.useGPUParticles && this.gpuParticles && 
                       ['plasma', 'crystal', 'temporal', 'antimatter'].includes(type);
        
        if (useGPU) {
            // Add to GPU particle system for massive performance
            const particleIndex = this.gpuParticles.addParticle(position, velocity, type);
            
            // Play launch sound
            if (window.holographicUI) {
                window.holographicUI.playSound('launch', 0.3);
            }
            
            // Create spectacular launch effect
            this.effects.createSparkleEffect(position, ColorUtils.getLiquidColor(type, 'glow'), 12);
            
            // Quantum entanglement for quantum particles
            if (type === 'quantum' && Math.random() < 0.3) {
                // Create entangled pair
                const entangledVel = velocity.multiply(-1);
                const entangledPos = position.add(new Vector3D(
                    MathUtils.randomFloat(-5, 5),
                    MathUtils.randomFloat(-5, 5),
                    MathUtils.randomFloat(-5, 5)
                ));
                this.gpuParticles.addParticle(entangledPos, entangledVel, type);
            }
            
            return particleIndex;
        } else {
            // Use CPU particles for complex physics types
            if (this.particles.length >= this.maxParticles / 10) {
                return; // Limit CPU particles
            }
            
            const particle = new LiquidParticle(position, velocity, type);
            
            // Add special properties for new liquid types
            switch(type) {
                case 'quantum':
                    particle.restMass = particle.mass;
                    break;
                case 'dark':
                    particle.invisible = true;
                    particle.mass *= 5; // Dark matter is heavy but invisible
                    break;
                case 'exotic':
                    particle.mass = -particle.mass; // Negative mass!
                    break;
                case 'photonic':
                    particle.mass = 0.01; // Nearly massless
                    particle.velocity = particle.velocity.normalize().multiply(50); // Light speed
                    break;
            }
            
            this.particles.push(particle);
            this.sceneManager.addParticle(particle);
            
            // Create spectacular launch effect
            this.effects.createSparkleEffect(position, particle.glowColor, 15);
            
            // Virtual particle creation for quantum foam
            if (type === 'quantum') {
                const virtualPairs = this.quantumPhysics.createVirtualParticles(position);
                if (virtualPairs) {
                    this.launchParticle(virtualPairs.matter.position, virtualPairs.matter.velocity, 'quantum');
                    this.launchParticle(virtualPairs.antimatter.position, virtualPairs.antimatter.velocity, 'antimatter');
                }
            }
            
            return particle;
        }
    }
    
    clearAll() {
        // Remove all particles
        this.particles.forEach(particle => {
            this.sceneManager.removeParticle(particle);
            this.effects.removeParticleTrail(particle);
        });
        this.particles = [];
        
        // Remove all gravity wells except the initial ones
        const wellsToKeep = this.gravitySystem.wells.slice(0, 3); // Keep first 3 wells
        this.gravitySystem.wells.slice(3).forEach(well => {
            this.sceneManager.removeGravityWell(well);
        });
        this.gravitySystem.wells = wellsToKeep;
        
        // Clear all effects
        this.effects.clearAllEffects();
        
        console.log('Canvas cleared');
    }
    
    pause() {
        this.isPaused = true;
        this.clock.stop();
    }
    
    resume() {
        this.isPaused = false;
        this.clock.start();
    }
    
    setTimeScale(scale) {
        this.timeScale = MathUtils.clamp(scale, 0.1, 5.0);
    }
    
    showWelcomeMessage() {
        // Create a SPECTACULAR holographic welcome overlay
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'holo-panel';
        welcomeDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            color: white;
            font-family: 'Orbitron', monospace;
        `;
        
        welcomeDiv.innerHTML = `
            <div class="holo-panel quantum-fluctuation" style="padding: 40px; border-radius: 20px; max-width: 600px; text-align: center;">
                <h1 class="neon-text" style="font-size: 2.5em; margin-bottom: 20px;">
                    🌌 LIQUID GALAXY PAINTER
                </h1>
                <h2 style="color: #ff00ff; font-size: 1.2em; margin-bottom: 20px;">
                    ✨ SPECTACULAR EDITION ✨
                </h2>
                <div style="margin: 20px 0; line-height: 1.8;">
                    <p style="color: #00ffff;">Create mind-blowing cosmic art with:</p>
                    <div style="margin: 20px 0; padding: 20px; background: rgba(255, 0, 255, 0.1); border-radius: 10px; border: 1px solid #ff00ff;">
                        <p>🚀 <strong>10,000+ GPU-accelerated particles</strong></p>
                        <p>⚛️ <strong>Quantum physics & relativistic effects</strong></p>
                        <p>🌈 <strong>HDR bloom & volumetric lighting</strong></p>
                        <p>🎆 <strong>8 exotic liquid types</strong></p>
                        <p>🕳️ <strong>Black holes, wormholes & neutron stars</strong></p>
                    </div>
                    <div style="margin: 20px 0; padding: 15px; background: rgba(0, 255, 255, 0.1); border-radius: 10px;">
                        <p><strong>🖱️ Click and drag</strong> to launch liquid streams</p>
                        <p><strong>🪐 Right-click</strong> to place gravity wells</p>
                        <p><strong>⚡ Number keys 1-8</strong> to switch liquid types</p>
                    </div>
                </div>
                <button id="startButton" class="holo-button" style="
                    padding: 20px 40px;
                    font-size: 20px;
                    margin-top: 20px;
                ">🎨 BEGIN YOUR COSMIC JOURNEY</button>
            </div>
        `;
        
        document.body.appendChild(welcomeDiv);
        
        // Remove welcome message when button is clicked
        document.getElementById('startButton').addEventListener('click', () => {
            welcomeDiv.remove();
            // Create initial demo effect
            setTimeout(() => {
                const centerPos = new Vector3D(0, 5, 0);
                const demoVelocity = new Vector3D(8, 2, 1);
                this.launchParticle(centerPos, demoVelocity, 'plasma');
            }, 500);
        });
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (welcomeDiv.parentNode) {
                welcomeDiv.remove();
            }
        }, 10000);
    }
    
    // Debug and utility methods
    getStats() {
        return {
            particles: this.particles.length,
            aliveParticles: this.particles.filter(p => p.alive).length,
            gravityWells: this.gravitySystem.wells.length,
            activeEffects: this.effects.activeEffects.length,
            fps: this.sceneManager.getFPS(),
            qualityLevel: this.qualityLevel,
            score: this.scoring.score,
            isPaused: this.isPaused
        };
    }
    
    exportSession() {
        const stats = this.getStats();
        const scoringData = this.scoring.exportStats();
        
        return {
            timestamp: new Date().toISOString(),
            stats: stats,
            scoring: JSON.parse(scoringData),
            version: '1.0.0'
        };
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check for Three.js support
    if (!window.THREE) {
        console.error('Three.js failed to load');
        document.body.innerHTML = '<h1>Error: Three.js failed to load. Please refresh the page.</h1>';
        return;
    }
    
    // Check for WebGL support
    if (!window.WebGLRenderingContext) {
        document.body.innerHTML = '<h1>WebGL not supported. Please use a modern browser.</h1>';
        return;
    }
    
    try {
        // Create global game instance
        window.game = new GameState();
        
        // Add some global helper functions for debugging
        window.getGameStats = () => window.game.getStats();
        window.clearCanvas = () => window.game.clearAll();
        window.pauseGame = () => window.game.isPaused ? window.game.resume() : window.game.pause();
        
        // Export function for sharing
        window.exportSession = () => {
            const data = window.game.exportSession();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `liquid-galaxy-session-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };
        
        console.log('🎮 Game ready! Use window.getGameStats() to see current status.');
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        document.body.innerHTML = `<h1>Game initialization failed: ${error.message}</h1>`;
    }
});

// Handle page visibility for performance
document.addEventListener('visibilitychange', () => {
    if (window.game) {
        if (document.hidden) {
            window.game.pause();
        } else {
            window.game.resume();
        }
    }
});

// Handle errors gracefully
window.addEventListener('error', (event) => {
    console.error('Game error:', event.error);
    if (window.game && window.game.sceneManager) {
        // Try to continue running but log the error
        window.game.scoring.addScore(-10, 'Error Recovery');
    }
});

// Performance monitoring
if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark('game-init-start');
    
    window.addEventListener('load', () => {
        performance.mark('game-init-end');
        performance.measure('game-initialization', 'game-init-start', 'game-init-end');
        
        const measure = performance.getEntriesByName('game-initialization')[0];
        console.log(`🚀 Game initialized in ${measure.duration.toFixed(2)}ms`);
    });
}
