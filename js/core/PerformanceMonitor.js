/**
 * PerformanceMonitor - Tracks FPS, memory usage, and performance metrics
 * Provides automatic quality adjustment and performance optimization
 * @class
 */

/**
 * @typedef {Object} QualitySettings
 * @property {number} maxParticles - Maximum number of particles allowed
 * @property {number} particleSize - Size multiplier for particles
 * @property {number} trailLength - Length of particle trails
 * @property {boolean} bloom - Whether bloom effect is enabled
 * @property {boolean} shadows - Whether shadows are enabled
 * @property {boolean} antialiasing - Whether antialiasing is enabled
 * @property {number} pixelRatio - Pixel ratio for rendering
 */

/**
 * @typedef {Object} PerformanceStats
 * @property {number} fps - Current frames per second
 * @property {number} frameTime - Time taken for the last frame in milliseconds
 * @property {number} memoryUsage - Current memory usage in MB
 * @property {number} gpuMemoryUsage - Estimated GPU memory usage in MB
 * @property {string} qualityLevel - Current quality level
 * @property {PerformanceWarnings} warnings - Current performance warnings
 */

/**
 * @typedef {Object} PerformanceWarnings
 * @property {boolean} lowFPS - Whether FPS is below minimum threshold
 * @property {boolean} highMemory - Whether memory usage is high
 * @property {boolean} gpuLimit - Whether GPU memory limit is being approached
 */

/**
 * @typedef {Object} SystemInfo
 * @property {string} userAgent - Browser user agent string
 * @property {string} platform - Operating system platform
 * @property {string|number} deviceMemory - Device memory in GB or 'unknown'
 * @property {string|number} hardwareConcurrency - Number of CPU cores or 'unknown'
 * @property {Object} screen - Screen information
 * @property {number} screen.width - Screen width in pixels
 * @property {number} screen.height - Screen height in pixels
 * @property {number} screen.pixelRatio - Device pixel ratio
 * @property {Object} [webgl] - WebGL information (if available)
 */

/**
 * @typedef {Object} BenchmarkResult
 * @property {string} name - Name of the benchmark
 * @property {number} iterations - Number of iterations run
 * @property {number} avgTime - Average time per iteration in milliseconds
 * @property {number} minTime - Minimum time recorded in milliseconds
 * @property {number} maxTime - Maximum time recorded in milliseconds
 * @property {number} fps - Calculated FPS based on average time
 */

export class PerformanceMonitor {
    /**
     * Creates a new PerformanceMonitor instance
     * @constructor
     */
    constructor() {
        // Frame timing
        /** @type {number[]} Array of recent frame timestamps */
        this.frameTimestamps = [];
        /** @type {number} Maximum number of frames to track in history */
        this.maxFrameHistory = 60;
        /** @type {number} Timestamp of the last frame */
        this.lastFrameTime = performance.now();
        
        // Performance metrics
        /** @type {number} Current frames per second */
        this.fps = 60;
        /** @type {number} Time taken for the last frame in milliseconds */
        this.frameTime = 16.67;
        /** @type {number} Current memory usage in MB */
        this.memoryUsage = 0;
        /** @type {number} Estimated GPU memory usage in MB */
        this.gpuMemoryUsage = 0;
        
        // Quality management
        /** @type {string} Current quality level */
        this.qualityLevel = 'high';
        /** @type {string[]} Available quality levels */
        this.qualityLevels = ['low', 'medium', 'high', 'ultra'];
        /** @type {number} Current index in quality levels array */
        this.qualityIndex = 2;
        
        // Auto-adjustment parameters
        /** @type {number} Target FPS for quality adjustment */
        this.targetFPS = 60;
        /** @type {number} Minimum acceptable FPS */
        this.minFPS = 30;
        /** @type {number[]} History of FPS measurements */
        this.fpsHistory = [];
        /** @type {number} Interval between performance checks in milliseconds */
        this.performanceCheckInterval = 1000;
        /** @type {number} Timestamp of last performance check */
        this.lastPerformanceCheck = 0;
        
        // Quality settings for each level
        /** @type {Object<string, QualitySettings>} Quality settings by level */
        this.qualitySettings = {
            low: {
                maxParticles: 1000,
                particleSize: 0.5,
                trailLength: 0,
                bloom: false,
                shadows: false,
                antialiasing: false,
                pixelRatio: 1
            },
            medium: {
                maxParticles: 2500,
                particleSize: 0.75,
                trailLength: 10,
                bloom: false,
                shadows: false,
                antialiasing: true,
                pixelRatio: 1
            },
            high: {
                maxParticles: 5000,
                particleSize: 1.0,
                trailLength: 20,
                bloom: true,
                shadows: false,
                antialiasing: true,
                pixelRatio: Math.min(window.devicePixelRatio, 2)
            },
            ultra: {
                maxParticles: 10000,
                particleSize: 1.0,
                trailLength: 30,
                bloom: true,
                shadows: true,
                antialiasing: true,
                pixelRatio: Math.min(window.devicePixelRatio, 2)
            }
        };
        
        // Performance warnings
        /** @type {PerformanceWarnings} Current performance warnings */
        this.warnings = {
            lowFPS: false,
            highMemory: false,
            gpuLimit: false
        };
        
        // Callbacks for quality changes
        /** @type {Function[]} Array of callback functions for quality changes */
        this.qualityChangeCallbacks = [];
        
        this.initialize();
    }
    
    initialize() {
        // Start performance monitoring
        this.startMonitoring();
        
        // Detect hardware capabilities
        this.detectHardwareCapabilities();
        
        console.log(`PerformanceMonitor initialized at ${this.qualityLevel} quality`);
    }
    
    detectHardwareCapabilities() {
        // Get GPU info if available
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                
                console.log(`GPU: ${vendor} ${renderer}`);
                
                // Adjust initial quality based on known GPU performance
                this.adjustQualityForGPU(renderer);
            }
        }
        
        // Check memory limits
        if (navigator.deviceMemory) {
            console.log(`Device memory: ${navigator.deviceMemory}GB`);
            
            if (navigator.deviceMemory < 4) {
                this.setQuality('medium');
            }
        }
        
        // Check if mobile device
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            this.setQuality('low');
            console.log('Mobile device detected, setting quality to low');
        }
    }
    
    adjustQualityForGPU(renderer) {
        const lowEndGPUs = [
            'Intel HD Graphics',
            'Intel UHD Graphics',
            'AMD Radeon R5',
            'AMD Radeon R7',
            'NVIDIA GeForce GT'
        ];
        
        const midRangeGPUs = [
            'NVIDIA GeForce GTX 1050',
            'NVIDIA GeForce GTX 1060',
            'AMD Radeon RX 560',
            'AMD Radeon RX 570'
        ];
        
        const renderer_lower = renderer.toLowerCase();
        
        if (lowEndGPUs.some(gpu => renderer_lower.includes(gpu.toLowerCase()))) {
            this.setQuality('medium');
        } else if (midRangeGPUs.some(gpu => renderer_lower.includes(gpu.toLowerCase()))) {
            this.setQuality('high');
        }
        // High-end GPUs default to ultra
    }
    
    startMonitoring() {
        // Memory monitoring (if available)
        if (performance.memory) {
            setInterval(() => {
                this.updateMemoryUsage();
            }, 1000);
        }
        
        // GPU memory estimation
        setInterval(() => {
            this.estimateGPUMemoryUsage();
        }, 2000);
    }
    
    update() {
        const currentTime = performance.now();
        
        // Calculate frame time and FPS
        this.frameTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Add to frame history
        this.frameTimestamps.push(currentTime);
        
        // Keep only recent frames
        if (this.frameTimestamps.length > this.maxFrameHistory) {
            this.frameTimestamps.shift();
        }
        
        // Calculate average FPS
        if (this.frameTimestamps.length > 1) {
            const timeSpan = currentTime - this.frameTimestamps[0];
            this.fps = Math.round((this.frameTimestamps.length - 1) * 1000 / timeSpan);
        }
        
        // Check if performance adjustment is needed
        if (currentTime - this.lastPerformanceCheck > this.performanceCheckInterval) {
            this.checkPerformance();
            this.lastPerformanceCheck = currentTime;
        }
    }
    
    checkPerformance() {
        // Add current FPS to history
        this.fpsHistory.push(this.fps);
        
        // Keep only recent FPS measurements
        if (this.fpsHistory.length > 10) {
            this.fpsHistory.shift();
        }
        
        // Calculate average FPS over recent history
        const avgFPS = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
        
        // Check if quality adjustment is needed
        if (avgFPS < this.minFPS && this.qualityIndex > 0) {
            // Performance is poor, reduce quality
            this.degradeQuality();
        } else if (avgFPS > this.targetFPS + 10 && this.qualityIndex < this.qualityLevels.length - 1) {
            // Performance is excellent, try increasing quality
            this.improveQuality();
        }
        
        // Update performance warnings
        this.updateWarnings(avgFPS);
    }
    
    updateWarnings(avgFPS) {
        // Low FPS warning
        const lowFPSWarning = avgFPS < this.minFPS;
        if (lowFPSWarning !== this.warnings.lowFPS) {
            this.warnings.lowFPS = lowFPSWarning;
            if (lowFPSWarning) {
                console.warn(`Low FPS detected: ${avgFPS.toFixed(1)} FPS`);
            }
        }
        
        // High memory warning
        const highMemoryWarning = this.memoryUsage > 400; // 400MB threshold
        if (highMemoryWarning !== this.warnings.highMemory) {
            this.warnings.highMemory = highMemoryWarning;
            if (highMemoryWarning) {
                console.warn(`High memory usage detected: ${this.memoryUsage.toFixed(1)}MB`);
            }
        }
        
        // GPU memory warning
        const gpuLimitWarning = this.gpuMemoryUsage > 800; // 800MB threshold
        if (gpuLimitWarning !== this.warnings.gpuLimit) {
            this.warnings.gpuLimit = gpuLimitWarning;
            if (gpuLimitWarning) {
                console.warn(`GPU memory limit approaching: ${this.gpuMemoryUsage.toFixed(1)}MB`);
            }
        }
    }
    
    updateMemoryUsage() {
        if (performance.memory) {
            // Convert bytes to MB
            this.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
        }
    }
    
    estimateGPUMemoryUsage() {
        // Rough estimation based on known factors
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        
        const width = canvas.width;
        const height = canvas.height;
        const pixelRatio = window.devicePixelRatio || 1;
        
        // Estimate framebuffer memory
        const framebufferMemory = width * height * pixelRatio * pixelRatio * 4 * 4; // RGBA + depth + multiple buffers
        
        // Add texture memory estimate (rough)
        const textureMemory = 50 * 1024 * 1024; // ~50MB for particle textures and effects
        
        // Add geometry memory estimate
        const geometryMemory = 10000 * 32; // Max particles * bytes per particle
        
        this.gpuMemoryUsage = (framebufferMemory + textureMemory + geometryMemory) / (1024 * 1024);
    }
    
    degradeQuality() {
        if (this.qualityIndex > 0) {
            this.qualityIndex--;
            this.qualityLevel = this.qualityLevels[this.qualityIndex];
            
            console.log(`Quality degraded to: ${this.qualityLevel}`);
            this.notifyQualityChange();
        }
    }
    
    improveQuality() {
        if (this.qualityIndex < this.qualityLevels.length - 1) {
            this.qualityIndex++;
            this.qualityLevel = this.qualityLevels[this.qualityIndex];
            
            console.log(`Quality improved to: ${this.qualityLevel}`);
            this.notifyQualityChange();
        }
    }
    
    setQuality(level) {
        const index = this.qualityLevels.indexOf(level);
        if (index !== -1) {
            this.qualityIndex = index;
            this.qualityLevel = level;
            
            console.log(`Quality set to: ${this.qualityLevel}`);
            this.notifyQualityChange();
        }
    }
    
    notifyQualityChange() {
        const settings = this.getCurrentQualitySettings();
        
        for (const callback of this.qualityChangeCallbacks) {
            try {
                callback(this.qualityLevel, settings);
            } catch (error) {
                console.error('Error in quality change callback:', error);
            }
        }
    }
    
    onQualityChange(callback) {
        this.qualityChangeCallbacks.push(callback);
    }
    
    getCurrentQualitySettings() {
        return { ...this.qualitySettings[this.qualityLevel] };
    }
    
    getStats() {
        return {
            fps: this.fps,
            frameTime: this.frameTime,
            memoryUsage: this.memoryUsage,
            gpuMemoryUsage: this.gpuMemoryUsage,
            qualityLevel: this.qualityLevel,
            warnings: { ...this.warnings }
        };
    }
    
    // Performance measurement utilities
    startMeasurement(name) {
        performance.mark(`${name}-start`);
        return {
            end: () => {
                performance.mark(`${name}-end`);
                performance.measure(name, `${name}-start`, `${name}-end`);
                
                const measure = performance.getEntriesByName(name)[0];
                const duration = measure ? measure.duration : 0;
                
                // Clean up marks and measures
                performance.clearMarks(`${name}-start`);
                performance.clearMarks(`${name}-end`);
                performance.clearMeasures(name);
                
                return duration;
            }
        };
    }
    
    measureFunction(fn, name = 'function') {
        const measurement = this.startMeasurement(name);
        const result = fn();
        const duration = measurement.end();
        
        return { result, duration };
    }
    
    // Benchmarking utilities
    async runBenchmark(name, iterations = 100) {
        const times = [];
        
        console.log(`Running benchmark: ${name} (${iterations} iterations)`);
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            
            // Benchmark code would be injected here
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            const end = performance.now();
            times.push(end - start);
        }
        
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        const results = {
            name,
            iterations,
            avgTime,
            minTime,
            maxTime,
            fps: 1000 / avgTime
        };
        
        console.log(`Benchmark results for ${name}:`, results);
        return results;
    }
    
    // System information
    getSystemInfo() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        const info = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            deviceMemory: navigator.deviceMemory || 'unknown',
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            screen: {
                width: screen.width,
                height: screen.height,
                pixelRatio: window.devicePixelRatio || 1
            }
        };
        
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            
            info.webgl = {
                version: gl.getParameter(gl.VERSION),
                vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
                renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
                maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS)
            };
        }
        
        return info;
    }
    
    // Debug output
    logPerformanceInfo() {
        const stats = this.getStats();
        const sysInfo = this.getSystemInfo();
        
        console.group('Performance Information');
        console.log('Stats:', stats);
        console.log('System:', sysInfo);
        console.log('Quality Settings:', this.getCurrentQualitySettings());
        console.groupEnd();
    }
    
    dispose() {
        // Clear callbacks
        this.qualityChangeCallbacks = [];
        
        // Clear history
        this.frameTimestamps = [];
        this.fpsHistory = [];
        
        console.log('PerformanceMonitor disposed');
    }
}
