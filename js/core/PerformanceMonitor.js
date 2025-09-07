/**
 * PerformanceMonitor - Tracks FPS, memory usage, and performance metrics
 * Provides automatic quality adjustment and performance optimization
 */

export class PerformanceMonitor {
    constructor() {
        // Frame timing
        this.frameTimestamps = [];
        this.maxFrameHistory = 60; // Track last 60 frames
        this.lastFrameTime = performance.now();
        
        // Performance metrics
        this.fps = 60;
        this.frameTime = 16.67; // milliseconds
        this.memoryUsage = 0;
        this.gpuMemoryUsage = 0;
        
        // Quality management
        this.qualityLevel = 'high';
        this.qualityLevels = ['low', 'medium', 'high', 'ultra'];
        this.qualityIndex = 2; // Start at 'high'
        
        // Auto-adjustment parameters
        this.targetFPS = 60;
        this.minFPS = 30;
        this.fpsHistory = [];
        this.performanceCheckInterval = 1000; // 1 second
        this.lastPerformanceCheck = 0;
        
        // Quality settings for each level
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
        this.warnings = {
            lowFPS: false,
            highMemory: false,
            gpuLimit: false
        };
        
        // Callbacks for quality changes
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
