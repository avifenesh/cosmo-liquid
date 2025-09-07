/**
 * Cosmo Liquid - Main Application Entry Point
 * Interactive 3D Physics Art Creation Tool
 */

import * as THREE from 'three';
import { PhysicsEngine } from './core/PhysicsEngine.js';
import { ParticleSystem } from './core/ParticleSystem.js';
import { RenderEngine } from './core/RenderEngine.js';
import { InputManager } from './core/InputManager.js';
import { PerformanceMonitor } from './core/PerformanceMonitor.js';
import { AudioEngine } from './core/AudioEngine.js';

class CosmoLiquid {
    constructor() {
        this.isInitialized = false;
        this.isRunning = false;
        
        // Core systems
        this.renderEngine = null;
        this.physicsEngine = null;
        this.particleSystem = null;
        this.inputManager = null;
        this.performanceMonitor = null;
        this.audioEngine = null;
        
        // State
        this.currentLiquidType = 'plasma';
        this.mousePressed = false;
        this.lastFrameTime = 0;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            await this.updateLoadingProgress(10, 'Detecting capabilities...');
            
            // Feature detection
            if (!this.detectWebGLSupport()) {
                throw new Error('WebGL is not supported');
            }
            
            await this.updateLoadingProgress(20, 'Initializing render engine...');
            
            // Initialize core systems
            this.renderEngine = new RenderEngine(document.getElementById('canvas-container'));
            await this.renderEngine.initialize();
            
            await this.updateLoadingProgress(40, 'Setting up physics engine...');
            
            this.physicsEngine = new PhysicsEngine();
            this.particleSystem = new ParticleSystem(this.physicsEngine);
            
            await this.updateLoadingProgress(60, 'Initializing audio system...');
            
            this.audioEngine = new AudioEngine();
            await this.audioEngine.initialize();
            
            await this.updateLoadingProgress(80, 'Setting up controls...');
            
            this.inputManager = new InputManager(this.renderEngine.canvas);
            this.performanceMonitor = new PerformanceMonitor();
            
            // Setup event listeners
            this.setupEventListeners();
            
            await this.updateLoadingProgress(100, 'Ready to create!');
            
            // Hide loading screen
            setTimeout(() => {
                document.getElementById('loading-screen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loading-screen').style.display = 'none';
                }, 1000);
            }, 500);
            
            this.isInitialized = true;
            this.start();
            
        } catch (error) {
            console.error('Failed to initialize Cosmo Liquid:', error);
            document.querySelector('.loading-text').textContent = 'Initialization failed: ' + error.message;
            document.querySelector('.loading-text').style.color = '#ff4444';
        }
    }
    
    detectWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    
    async updateLoadingProgress(percent, text) {
        document.getElementById('loading-progress').style.width = percent + '%';
        document.querySelector('.loading-text').textContent = text;
        
        // Small delay to show progress
        return new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setupEventListeners() {
        // Liquid type selection
        document.querySelectorAll('.liquid-button').forEach(button => {
            button.addEventListener('click', (e) => {
                // Remove active class from all buttons
                document.querySelectorAll('.liquid-button').forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                e.target.classList.add('active');
                
                // Update current liquid type
                this.currentLiquidType = e.target.dataset.liquid;
                
                // Play selection sound
                this.audioEngine.playLiquidSelectSound(this.currentLiquidType);
            });
        });
        
        // Keyboard shortcuts for liquid types
        document.addEventListener('keydown', (e) => {
            const key = parseInt(e.key);
            if (key >= 1 && key <= 8) {
                const buttons = document.querySelectorAll('.liquid-button');
                if (buttons[key - 1]) {
                    buttons[key - 1].click();
                }
            }
        });
        
        // Mouse interactions
        this.inputManager.on('mousedown', (event) => {
            if (event.button === 0) { // Left click
                this.mousePressed = true;
                this.startParticleStream(event.position);
            } else if (event.button === 2) { // Right click
                this.placeGravityWell(event.position);
            }
        });
        
        this.inputManager.on('mouseup', (event) => {
            if (event.button === 0) {
                this.mousePressed = false;
                this.stopParticleStream();
            }
        });
        
        this.inputManager.on('mousemove', (event) => {
            if (this.mousePressed) {
                this.updateParticleStream(event.position);
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.renderEngine.handleResize();
        });
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    startParticleStream(position) {
        const worldPosition = this.renderEngine.screenToWorld(position);
        const velocity = this.calculateInitialVelocity(worldPosition);
        
        this.particleSystem.startStream({
            position: worldPosition,
            velocity: velocity,
            liquidType: this.currentLiquidType,
            streamRate: 10 // particles per frame
        });
        
        // Play launch sound
        this.audioEngine.playLaunchSound(this.currentLiquidType, velocity.length());
    }
    
    updateParticleStream(position) {
        const worldPosition = this.renderEngine.screenToWorld(position);
        const velocity = this.calculateInitialVelocity(worldPosition);
        
        this.particleSystem.updateStream({
            position: worldPosition,
            velocity: velocity
        });
    }
    
    stopParticleStream() {
        this.particleSystem.stopStream();
    }
    
    calculateInitialVelocity(worldPosition) {
        // Calculate velocity based on camera direction and distance
        const camera = this.renderEngine.camera;
        const direction = new THREE.Vector3()
            .subVectors(worldPosition, camera.position)
            .normalize();
        
        // Base speed of 50 units/second
        return direction.multiplyScalar(50);
    }
    
    placeGravityWell(position) {
        const worldPosition = this.renderEngine.screenToWorld(position);
        
        this.physicsEngine.addGravityWell({
            position: worldPosition,
            mass: 1000,
            type: 'star' // Default gravity well type
        });
        
        // Visual feedback
        this.renderEngine.addGravityWellVisual(worldPosition);
        
        // Audio feedback
        this.audioEngine.playGravityWellSound();
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
    }
    
    stop() {
        this.isRunning = false;
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Cap delta time to prevent large jumps
        const cappedDeltaTime = Math.min(deltaTime, 1/30);
        
        // Update performance monitor
        this.performanceMonitor.update();
        
        // Update physics
        this.physicsEngine.update(cappedDeltaTime);
        
        // Update particle system
        this.particleSystem.update(cappedDeltaTime);
        
        // Update audio (spatial positioning, etc.)
        this.audioEngine.update(this.renderEngine.camera);
        
        // Render frame
        this.renderEngine.render(this.particleSystem.particles);
        
        // Update UI stats
        this.updatePerformanceStats();
        
        // Schedule next frame
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updatePerformanceStats() {
        const stats = this.performanceMonitor.getStats();
        
        document.getElementById('fps-counter').textContent = stats.fps;
        document.getElementById('particle-count').textContent = this.particleSystem.getActiveParticleCount();
        document.getElementById('memory-usage').textContent = Math.round(stats.memoryUsage);
        
        // Auto-quality adjustment
        if (stats.fps < 30) {
            this.performanceMonitor.degradeQuality();
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.cosmoLiquid = new CosmoLiquid();
});

// Export for debugging
export default CosmoLiquid;
