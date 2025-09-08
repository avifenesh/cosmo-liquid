/**
 * AudioEngine - Procedural audio synthesis using Web Audio API
 * Generates all sounds dynamically for particle interactions and ambient soundscapes
 * @class
 */

import * as THREE from 'three';

/**
 * @typedef {Object} LiquidSoundConfig
 * @property {number} baseFrequency - Base frequency in Hz
 * @property {number[]} harmonics - Array of harmonic multipliers
 * @property {string} waveform - Oscillator waveform type
 * @property {number} attackTime - Attack time in seconds
 * @property {number} decayTime - Decay time in seconds
 * @property {number} sustainLevel - Sustain level (0-1)
 * @property {number} releaseTime - Release time in seconds
 * @property {number} filterFreq - Filter frequency in Hz
 * @property {number} filterQ - Filter Q factor
 * @property {boolean} [modulation] - Whether to apply modulation
 * @property {boolean} [distortion] - Whether to apply distortion
 * @property {boolean} [uncertainty] - Whether to apply quantum uncertainty
 * @property {boolean} [lowpass] - Whether to use lowpass filter
 * @property {boolean} [phaser] - Whether to apply phaser effect
 * @property {boolean} [bright] - Whether to use bright timbre
 */

/**
 * @typedef {Object} AmbientSource
 * @property {OscillatorNode} oscillator - The oscillator node
 * @property {OscillatorNode} lfo - The LFO oscillator node
 * @property {GainNode} gain - The gain node
 */

/**
 * @typedef {Object} SpatialSoundResult
 * @property {OscillatorNode} oscillator - The oscillator node
 * @property {PannerNode} panner - The panner node for 3D positioning
 * @property {GainNode} gain - The gain node
 */

export class AudioEngine {
    /**
     * Creates a new AudioEngine instance
     * @constructor
     */
    constructor() {
        // Audio context
        this.audioContext = null;
        this.masterGain = null;
        
        // Audio settings
        this.enabled = true;
        this.masterVolume = 0.3;
        this.sfxVolume = 0.5;
        this.ambientVolume = 0.2;
        
        // Audio nodes
        this.compressor = null;
        this.reverb = null;
        
        // Sound generators
        this.oscillators = new Map();
        this.activeNodes = new Set();
        
        // Liquid type sound configurations
        this.liquidSoundConfigs = {
            plasma: {
                baseFrequency: 440,
                harmonics: [1, 2, 3, 5],
                waveform: 'sawtooth',
                attackTime: 0.01,
                decayTime: 0.1,
                sustainLevel: 0.6,
                releaseTime: 0.5,
                filterFreq: 2000,
                filterQ: 5
            },
            crystal: {
                baseFrequency: 880,
                harmonics: [1, 1.5, 2, 3],
                waveform: 'sine',
                attackTime: 0.05,
                decayTime: 0.3,
                sustainLevel: 0.8,
                releaseTime: 1.0,
                filterFreq: 4000,
                filterQ: 10
            },
            temporal: {
                baseFrequency: 220,
                harmonics: [1, 1.618, 2.618, 4],
                waveform: 'triangle',
                attackTime: 0.02,
                decayTime: 0.2,
                sustainLevel: 0.4,
                releaseTime: 0.8,
                filterFreq: 1000,
                filterQ: 3,
                modulation: true
            },
            antimatter: {
                baseFrequency: 660,
                harmonics: [1, 0.5, 2, 1.5],
                waveform: 'square',
                attackTime: 0.001,
                decayTime: 0.05,
                sustainLevel: 0.9,
                releaseTime: 0.2,
                filterFreq: 3000,
                filterQ: 8,
                distortion: true
            },
            quantum: {
                baseFrequency: 330,
                harmonics: [1, Math.PI, Math.E, 7],
                waveform: 'sine',
                attackTime: 0.1,
                decayTime: 0.4,
                sustainLevel: 0.3,
                releaseTime: 1.2,
                filterFreq: 1500,
                filterQ: 2,
                uncertainty: true
            },
            darkmatter: {
                baseFrequency: 110,
                harmonics: [1, 1.5, 2.5, 4.5],
                waveform: 'sawtooth',
                attackTime: 0.2,
                decayTime: 0.8,
                sustainLevel: 0.5,
                releaseTime: 2.0,
                filterFreq: 500,
                filterQ: 1,
                lowpass: true
            },
            exotic: {
                baseFrequency: 550,
                harmonics: [1, 0.7, 1.4, 2.1],
                waveform: 'triangle',
                attackTime: 0.03,
                decayTime: 0.15,
                sustainLevel: 0.7,
                releaseTime: 0.6,
                filterFreq: 2500,
                filterQ: 6,
                phaser: true
            },
            photonic: {
                baseFrequency: 1760,
                harmonics: [1, 2, 4, 8],
                waveform: 'sine',
                attackTime: 0.001,
                decayTime: 0.01,
                sustainLevel: 1.0,
                releaseTime: 0.1,
                filterFreq: 8000,
                filterQ: 20,
                bright: true
            }
        };
        
        // Ambient soundscape
        this.ambientSources = [];
        this.spaceAmbienceGain = null;
        
        // Spatial audio
        this.listenerPosition = { x: 0, y: 0, z: 0 };
        
        this.isInitialized = false;
    }
    
    /**
     * Initializes the audio engine and sets up the Web Audio API context
     * @async
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Handle audio context state
            if (this.audioContext.state === 'suspended') {
                // Will be resumed on first user interaction
                console.log('Audio context created but suspended (awaiting user interaction)');
            }
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            
            // Create audio processing chain
            this.setupAudioProcessing();
            
            // Setup ambient soundscape
            this.setupAmbientSoundscape();
            
            // Setup spatial audio
            this.setupSpatialAudio();
            
            this.isInitialized = true;
            console.log('AudioEngine initialized');
            
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
            this.enabled = false;
        }
    }
    
    /**
     * Sets up the audio processing chain including compressor and reverb
     * @private
     */
    setupAudioProcessing() {
        // Compressor for dynamic range control
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        // Create reverb
        this.reverb = this.createReverbNode();
        
        // Connect processing chain
        this.compressor.connect(this.reverb);
        this.reverb.connect(this.masterGain);
    }
    
    /**
     * Creates a reverb node with procedurally generated impulse response
     * @private
     * @returns {ConvolverNode} The configured reverb convolver node
     */
    createReverbNode() {
        const convolver = this.audioContext.createConvolver();
        
        // Generate impulse response for reverb
        const impulseLength = this.audioContext.sampleRate * 2; // 2 seconds
        const impulse = this.audioContext.createBuffer(2, impulseLength, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < impulseLength; i++) {
                const decay = Math.pow(1 - (i / impulseLength), 2);
                channelData[i] = (Math.random() * 2 - 1) * decay * 0.1;
            }
        }
        
        convolver.buffer = impulse;
        return convolver;
    }
    
    /**
     * Sets up the ambient soundscape for cosmic atmosphere
     * @private
     */
    setupAmbientSoundscape() {
        if (!this.isInitialized) return;
        
        // Create space ambience gain
        this.spaceAmbienceGain = this.audioContext.createGain();
        this.spaceAmbienceGain.gain.value = this.ambientVolume;
        this.spaceAmbienceGain.connect(this.compressor);
        
        // Generate cosmic background drone
        this.createCosmicAmbience();
    }
    
    /**
     * Creates procedural cosmic ambience with low-frequency drones and modulation
     * @private
     */
    createCosmicAmbience() {
        const frequencies = [55, 110, 165, 220]; // Low frequency drones
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.frequency.value = freq + (Math.random() - 0.5) * 5; // Slight detuning
            oscillator.type = 'sine';
            
            gain.gain.value = 0.05 / frequencies.length;
            
            filter.type = 'lowpass';
            filter.frequency.value = 300;
            filter.Q.value = 1;
            
            // Add slow modulation
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            
            lfo.frequency.value = 0.1 + index * 0.05; // Very slow modulation
            lfo.type = 'sine';
            lfoGain.gain.value = 2;
            
            lfo.connect(lfoGain);
            lfoGain.connect(oscillator.frequency);
            
            // Connect signal chain
            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(this.spaceAmbienceGain);
            
            // Start oscillators
            oscillator.start();
            lfo.start();
            
            this.ambientSources.push({ oscillator, lfo, gain });
        });
    }
    
    /**
     * Sets up spatial audio with default listener orientation
     * @private
     */
    setupSpatialAudio() {
        if (this.audioContext.listener) {
            // Set default listener orientation
            this.audioContext.listener.setPosition(0, 0, 0);
            this.audioContext.listener.setOrientation(0, 0, -1, 0, 1, 0);
        }
    }
    
    /**
     * Plays a launch sound based on liquid type and velocity
     * @param {string} liquidType - The type of liquid being launched
     * @param {number} velocity - The launch velocity for sound modulation
     */
    playLaunchSound(liquidType, velocity) {
        if (!this.enabled || !this.isInitialized) return;
        
        this.resumeContextIfNeeded();
        
        const config = this.liquidSoundConfigs[liquidType] || this.liquidSoundConfigs.plasma;
        const velocityFactor = Math.min(velocity / 100, 2); // Normalize velocity
        
        // Create sound based on liquid type
        this.createLiquidSound(config, velocityFactor, 0.3);
    }
    
    /**
     * Plays a selection sound when a liquid type is chosen
     * @param {string} liquidType - The type of liquid being selected
     */
    playLiquidSelectSound(liquidType) {
        if (!this.enabled || !this.isInitialized) return;
        
        this.resumeContextIfNeeded();
        
        const config = this.liquidSoundConfigs[liquidType] || this.liquidSoundConfigs.plasma;
        
        // Create a short selection sound
        this.createLiquidSound(config, 0.5, 0.2, 0.3);
    }
    
    /**
     * Plays a deep resonant sound for gravity well creation
     */
    playGravityWellSound() {
        if (!this.enabled || !this.isInitialized) return;
        
        this.resumeContextIfNeeded();
        
        // Create deep, resonant sound for gravity well
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.frequency.value = 80;
        oscillator.type = 'sine';
        
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 10;
        
        const now = this.audioContext.currentTime;
        
        // ADSR envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.1, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        
        // Frequency sweep
        oscillator.frequency.exponentialRampToValueAtTime(40, now + 2.0);
        
        // Connect and start
        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);
        
        oscillator.start(now);
        oscillator.stop(now + 2.0);
        
        this.activeNodes.add(oscillator);
        
        oscillator.onended = () => {
            this.activeNodes.delete(oscillator);
        };
    }
    
    /**
     * Creates a complex liquid sound with harmonics and effects based on configuration
     * @param {LiquidSoundConfig} config - The sound configuration for the liquid type
     * @param {number} [velocityFactor=1] - Factor to modulate frequency and filter based on velocity
     * @param {number} [volume=0.5] - Base volume for the sound (0-1)
     * @param {number|null} [duration=null] - Override duration in seconds, or null to use config values
     * @private
     */
    createLiquidSound(config, velocityFactor = 1, volume = 0.5, duration = null) {
        const now = this.audioContext.currentTime;
        const soundDuration = duration || (config.attackTime + config.decayTime + config.releaseTime);
        
        // Create oscillator bank for harmonics
        config.harmonics.forEach((harmonic, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            // Set frequency
            let frequency = config.baseFrequency * harmonic * velocityFactor;
            
            // Add uncertainty for quantum type
            if (config.uncertainty) {
                frequency *= 0.95 + Math.random() * 0.1;
            }
            
            oscillator.frequency.value = frequency;
            oscillator.type = config.waveform;
            
            // Set up filter
            filter.type = config.lowpass ? 'lowpass' : 'bandpass';
            filter.frequency.value = config.filterFreq * velocityFactor;
            filter.Q.value = config.filterQ;
            
            // ADSR envelope
            const harmonicVolume = volume / (index + 1) * 0.5; // Reduce volume for higher harmonics
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(harmonicVolume, now + config.attackTime);
            gain.gain.exponentialRampToValueAtTime(
                harmonicVolume * config.sustainLevel, 
                now + config.attackTime + config.decayTime
            );
            gain.gain.exponentialRampToValueAtTime(0.001, now + soundDuration);
            
            // Add modulation for temporal type
            if (config.modulation) {
                const lfo = this.audioContext.createOscillator();
                const lfoGain = this.audioContext.createGain();
                
                lfo.frequency.value = 5 + Math.random() * 10;
                lfo.type = 'sine';
                lfoGain.gain.value = frequency * 0.1;
                
                lfo.connect(lfoGain);
                lfoGain.connect(oscillator.frequency);
                
                lfo.start(now);
                lfo.stop(now + soundDuration);
            }
            
            // Connect audio graph
            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(this.compressor);
            
            // Start and schedule stop
            oscillator.start(now);
            oscillator.stop(now + soundDuration);
            
            this.activeNodes.add(oscillator);
            
            oscillator.onended = () => {
                this.activeNodes.delete(oscillator);
            };
        });
    }
    
    /**
     * Updates spatial audio listener position and orientation based on camera
     * @param {THREE.Camera} camera - The Three.js camera object
     */
    update(camera) {
        if (!this.enabled || !this.isInitialized || !this.audioContext.listener) return;
        
        // Update listener position based on camera
        this.listenerPosition.x = camera.position.x;
        this.listenerPosition.y = camera.position.y;
        this.listenerPosition.z = camera.position.z;
        
        // Update Web Audio API listener
        this.audioContext.listener.setPosition(
            camera.position.x * 0.01, // Scale down for audio
            camera.position.y * 0.01,
            camera.position.z * 0.01
        );
        
        // Update listener orientation based on camera direction
        const direction = camera.getWorldDirection(new THREE.Vector3());
        const up = camera.up;
        
        this.audioContext.listener.setOrientation(
            direction.x, direction.y, direction.z,
            up.x, up.y, up.z
        );
    }
    
    /**
     * Creates a positioned sound in 3D space
     * @param {THREE.Vector3} position - The 3D position for the sound
     * @param {LiquidSoundConfig} config - The sound configuration
     * @param {number} [volume=0.5] - The volume of the sound (0-1)
     * @returns {SpatialSoundResult|undefined} The created sound nodes or undefined if audio is disabled
     */
    createSpatialSound(position, config, volume = 0.5) {
        if (!this.enabled || !this.isInitialized) return;
        
        const panner = this.audioContext.createPanner();
        
        // Configure 3D audio
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'exponential';
        panner.refDistance = 10;
        panner.maxDistance = 1000;
        panner.rolloffFactor = 1;
        
        // Set position
        panner.setPosition(
            position.x * 0.01,
            position.y * 0.01,
            position.z * 0.01
        );
        
        // Create the sound and connect through the panner
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        oscillator.frequency.value = config.baseFrequency;
        oscillator.type = config.waveform;
        
        gain.gain.value = volume;
        
        oscillator.connect(gain);
        gain.connect(panner);
        panner.connect(this.compressor);
        
        const now = this.audioContext.currentTime;
        oscillator.start(now);
        oscillator.stop(now + 1.0);
        
        return { oscillator, panner, gain };
    }
    
    /**
     * Resumes the audio context if it was suspended due to browser policy
     * @private
     */
    resumeContextIfNeeded() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('Audio context resumed');
            }).catch(error => {
                console.warn('Failed to resume audio context:', error);
            });
        }
    }
    
    /**
     * Sets the master volume for all audio output
     * @param {number} volume - Volume level from 0 to 1
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }
    
    /**
     * Sets the volume for sound effects
     * @param {number} volume - Volume level from 0 to 1
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * Sets the volume for ambient sounds
     * @param {number} volume - Volume level from 0 to 1
     */
    setAmbientVolume(volume) {
        this.ambientVolume = Math.max(0, Math.min(1, volume));
        if (this.spaceAmbienceGain) {
            this.spaceAmbienceGain.gain.value = this.ambientVolume;
        }
    }
    
    /**
     * Enables the audio engine
     */
    enable() {
        this.enabled = true;
        this.setMasterVolume(this.masterVolume);
    }
    
    /**
     * Disables the audio engine
     */
    disable() {
        this.enabled = false;
        this.setMasterVolume(0);
    }
    
    /**
     * Mutes all audio output
     */
    mute() {
        if (this.masterGain) {
            this.masterGain.gain.value = 0;
        }
    }
    
    /**
     * Unmutes audio output, restoring previous volume
     */
    unmute() {
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }
    
    /**
     * Stops all currently playing sounds
     */
    stopAllSounds() {
        // Stop all active nodes
        for (const node of this.activeNodes) {
            try {
                if (node.stop) {
                    node.stop();
                }
            } catch (error) {
                // Node might already be stopped
            }
        }
        this.activeNodes.clear();
    }
    
    /**
     * Disposes of the audio engine and cleans up all resources
     */
    dispose() {
        // Stop all sounds
        this.stopAllSounds();
        
        // Stop ambient sources
        this.ambientSources.forEach(source => {
            if (source.oscillator) source.oscillator.stop();
            if (source.lfo) source.lfo.stop();
        });
        this.ambientSources = [];
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close().then(() => {
                console.log('Audio context closed');
            }).catch(error => {
                console.warn('Error closing audio context:', error);
            });
        }
        
        this.isInitialized = false;
        console.log('AudioEngine disposed');
    }
}
