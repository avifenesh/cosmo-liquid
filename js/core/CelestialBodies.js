/**
 * CelestialBodies - Real celestial body system with accurate masses and properties
 * Allows users to place realistic space objects as gravity sources
 * @class
 */

import * as THREE from 'three';

/**
 * @typedef {Object} VisualEffects
 * @property {boolean} [glow] - Whether the body has a glow effect
 * @property {boolean} [rings] - Whether the body has rings
 * @property {boolean} [atmosphere] - Whether the body has atmospheric effects
 * @property {boolean} [clouds] - Whether the body has cloud effects
 * @property {boolean} [dust] - Whether the body has dust effects
 * @property {boolean} [storms] - Whether the body has storm effects
 * @property {boolean} [corona] - Whether the body has corona effects
 * @property {boolean} [flares] - Whether the body has solar flare effects
 * @property {boolean} [radiation] - Whether the body has radiation effects
 * @property {boolean} [intense] - Whether the body has intense effects
 * @property {boolean} [xray] - Whether the body emits X-ray effects
 * @property {boolean} [pulsar] - Whether the body has pulsar effects
 * @property {boolean} [magneticField] - Whether the body has magnetic field effects
 * @property {boolean} [spacetimeDistortion] - Whether the body distorts spacetime
 * @property {boolean} [accretionDisk] - Whether the body has an accretion disk
 * @property {boolean} [eventHorizon] - Whether the body has an event horizon
 * @property {boolean} [hawkingRadiation] - Whether the body emits Hawking radiation
 * @property {boolean} [lensingEffect] - Whether the body has gravitational lensing effects
 * @property {boolean} [tidalForces] - Whether the body creates tidal forces
 */

/**
 * @typedef {Object} CelestialTypeData
 * @property {string} name - The display name of the celestial body
 * @property {number} mass - The mass of the celestial body (scaled for simulation)
 * @property {number} radius - The radius of the celestial body
 * @property {THREE.Color} color - The primary color of the celestial body
 * @property {string} description - A description of the celestial body
 * @property {string} icon - The emoji icon for the celestial body
 * @property {number} gravitationalInfluence - The gravitational influence multiplier
 * @property {VisualEffects} visualEffects - The visual effects configuration
 */

/**
 * @typedef {Object} ActiveCelestialBody
 * @property {string} id - Unique identifier for the celestial body
 * @property {string} type - The type of celestial body
 * @property {CelestialTypeData} data - The celestial body configuration data
 * @property {Object} physics - The physics body in the simulation
 * @property {THREE.Mesh} visual - The visual mesh representation
 * @property {THREE.Vector3} position - The position of the celestial body
 */

const textureLoader = new THREE.TextureLoader();

export class CelestialBodies {
    /**
     * Creates a new CelestialBodies system
     * @constructor
     * @param {import('./PhysicsEngine.js').PhysicsEngine} physicsEngine - The physics engine instance
     * @param {import('./RenderEngine.js').RenderEngine} renderEngine - The render engine instance
     */
    constructor(physicsEngine, renderEngine) {
        /** @type {import('./PhysicsEngine.js').PhysicsEngine} The physics engine for gravity simulation */
        this.physicsEngine = physicsEngine;
        /** @type {import('./RenderEngine.js').RenderEngine} The render engine for visual representation */
        this.renderEngine = renderEngine;
        
        /** @type {string} Currently selected celestial type */
        this.selectedCelestialType = 'earth';
        
        /** @type {Map<string, ActiveCelestialBody>} Active celestial bodies in the simulation */
        this.activeBodies = new Map();
        
        /** @type {Object<string, CelestialTypeData>} Definitions of all celestial body types */
        this.celestialTypes = {};
        
        // Initialize celestial body definitions
        this.initializeCelestialTypes();
        
        console.log('CelestialBodies system initialized');
    }
    
    /**
     * Initializes the celestial body type definitions with realistic properties
     * @private
     */
    initializeCelestialTypes() {
        // Real celestial body data with accurate relative masses and properties
        this.celestialTypes = {
            moon: {
                name: 'Moon',
                mass: 73.5, // Scaled for simulation (real: 7.35 × 10^22 kg)
                radius: 12,
                color: new THREE.Color(0xcccccc),
                description: 'Earth\'s natural satellite',
                icon: '🌙',
                gravitationalInfluence: 0.8,
                visualEffects: {
                    glow: true,
                    rings: false,
                    atmosphere: false
                }
            },
            
            earth: {
                name: 'Earth',
                mass: 598, // Scaled (real: 5.98 × 10^24 kg)
                radius: 20,
                color: new THREE.Color(0x4488ff),
                description: 'Our home planet',
                icon: '🌍',
                gravitationalInfluence: 1.0,
                visualEffects: {
                    glow: true,
                    rings: false,
                    atmosphere: true,
                    clouds: true
                }
            },
            
            mars: {
                name: 'Mars',
                mass: 64.2, // Scaled (real: 6.42 × 10^23 kg)
                radius: 16,
                color: new THREE.Color(0xff4444),
                description: 'The Red Planet',
                icon: '🔴',
                gravitationalInfluence: 0.9,
                visualEffects: {
                    glow: true,
                    rings: false,
                    atmosphere: false,
                    dust: true
                }
            },
            
            jupiter: {
                name: 'Jupiter',
                mass: 1900, // Scaled (real: 1.90 × 10^27 kg)
                radius: 35,
                color: new THREE.Color(0xffaa44),
                description: 'Gas giant with Great Red Spot',
                icon: '🪐',
                gravitationalInfluence: 2.5,
                visualEffects: {
                    glow: true,
                    rings: true,
                    atmosphere: true,
                    storms: true
                }
            },
            
            sun: {
                name: 'Sun',
                mass: 19900, // Scaled (real: 1.99 × 10^30 kg)
                radius: 50,
                color: new THREE.Color(0xffff00),
                description: 'Our solar system\'s star',
                icon: '☀️',
                gravitationalInfluence: 10.0,
                visualEffects: {
                    glow: true,
                    corona: true,
                    flares: true,
                    radiation: true
                }
            },
            
            whiteDwarf: {
                name: 'White Dwarf',
                mass: 5980, // Scaled - very dense
                radius: 15,
                color: new THREE.Color(0xffffff),
                description: 'Extremely dense stellar remnant',
                icon: '⚪',
                gravitationalInfluence: 5.0,
                visualEffects: {
                    glow: true,
                    intense: true,
                    xray: true
                }
            },
            
            neutronStar: {
                name: 'Neutron Star',
                mass: 14000, // Scaled - incredibly dense
                radius: 10,
                color: new THREE.Color(0x8844ff),
                description: 'Ultra-dense collapsed star',
                icon: '✦',
                gravitationalInfluence: 8.0,
                visualEffects: {
                    glow: true,
                    pulsar: true,
                    magneticField: true,
                    spacetimeDistortion: true
                }
            },
            
            blackHole: {
                name: 'Black Hole',
                mass: 30000, // Scaled - extreme mass
                radius: 25,
                color: new THREE.Color(0x000000),
                description: 'Spacetime singularity',
                icon: '⚫',
                gravitationalInfluence: 15.0,
                visualEffects: {
                    glow: false,
                    accretionDisk: true,
                    eventHorizon: true,
                    hawkingRadiation: true,
                    lensingEffect: true,
                    tidalForces: true
                }
            }
        };
    }
    
    /**
     * Gets the configuration data for a given celestial body type
     * @param {string} type - The type of celestial body (e.g., 'earth', 'sun')
     * @returns {CelestialTypeData} The configuration object for the celestial body
     */
    getCelestialType(type) {
        return this.celestialTypes[type] || this.celestialTypes.earth;
    }
    
    /**
     * Gets a list of all available celestial body types
     * @returns {string[]} An array of celestial body type names
     */
    getAllCelestialTypes() {
        return Object.keys(this.celestialTypes);
    }
    
    /**
     * Sets the type of celestial body to be placed next
     * @param {string} type - The celestial body type to select
     */
    setSelectedCelestialType(type) {
        if (this.celestialTypes[type]) {
            this.selectedCelestialType = type;
            console.log(`Selected celestial type: ${this.celestialTypes[type].name}`);
        }
    }
    
    /**
     * Places a celestial body in the simulation at the given position
     * @param {THREE.Vector3} position - The 3D world position to place the body
     * @returns {string} The ID of the newly created celestial body
     */
    placeCelestialBody(position) {
        const celestialData = this.getCelestialType(this.selectedCelestialType);
        
        // Create physics body with realistic mass
        const physicsBody = this.physicsEngine.addGravityWell({
            position: position,
            mass: celestialData.mass,
            type: this.selectedCelestialType,
            radius: celestialData.radius
        });
        
        // Create visual representation
        const visualBody = this.createCelestialVisual(position, celestialData);
        
        // Store the celestial body
        const celestialId = this.generateId();
        this.activeBodies.set(celestialId, {
            id: celestialId,
            type: this.selectedCelestialType,
            data: celestialData,
            physics: physicsBody,
            visual: visualBody,
            position: position.clone()
        });
        
        this.showConfirmationMessage(`Placed ${celestialData.name}`);

        console.log(`Placed ${celestialData.name} at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
        
        return celestialId;
    }
    
    /**
     * Creates a visual representation of a celestial body with realistic materials and shaders
     * @param {THREE.Vector3} position - The position where the celestial body should be placed
     * @param {CelestialTypeData} celestialData - The configuration data for the celestial body
     * @returns {THREE.Mesh} The created mesh with appropriate material and animations
     * @private
     */
    createCelestialVisual(position, celestialData) {
        const geometry = new THREE.SphereGeometry(celestialData.radius, 32, 16);
        
        let material;
        
        // Create unique material for each celestial type
        switch (celestialData.name) {
          case "Sun":
            // Sun - realistic solar surface with granulation and flares
            material = new THREE.ShaderMaterial({
              uniforms: {
                time: { value: 0.0 },
                intensity: { value: 2.0 },
              },
              vertexShader: `
                        uniform float time;
                        varying vec2 vUv;
                        varying vec3 vNormal;
                        varying vec3 vPosition;
                        
                        // Noise for surface distortion
                        float noise(vec3 p) {
                            return sin(p.x * 10.0) * sin(p.y * 10.0) * sin(p.z * 10.0);
                        }
                        
                        void main() {
                            vUv = uv;
                            vNormal = normalize(normalMatrix * normal);
                            
                            // Solar surface convection
                            vec3 pos = position;
                            float convection = noise(pos + vec3(time * 0.5)) * 0.05;
                            pos *= 1.0 + convection;
                            
                            // Solar flares
                            float flare = sin(time * 2.0 + pos.y * 5.0) * 0.02;
                            flare += cos(time * 3.0 + pos.x * 7.0) * 0.02;
                            pos *= 1.0 + flare;
                            
                            vPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                        }
                    `,
              fragmentShader: `
                        uniform float time;
                        uniform float intensity;
                        varying vec2 vUv;
                        varying vec3 vNormal;
                        varying vec3 vPosition;
                        
                        // Voronoi for granulation
                        vec2 hash2(vec2 p) {
                            p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
                            return fract(sin(p) * 43758.5453123);
                        }
                        
                        float voronoi(vec2 x) {
                            vec2 n = floor(x);
                            vec2 f = fract(x);
                            float minDist = 1.0;
                            
                            for(int j = -1; j <= 1; j++) {
                                for(int i = -1; i <= 1; i++) {
                                    vec2 neighbor = vec2(float(i), float(j));
                                    vec2 point = hash2(n + neighbor);
                                    point = 0.5 + 0.5 * sin(time * 0.5 + 6.2831 * point);
                                    vec2 diff = neighbor + point - f;
                                    float dist = length(diff);
                                    minDist = min(minDist, dist);
                                }
                            }
                            return minDist;
                        }
                        
                        // Fractal noise for surface detail
                        float fbm(vec2 p) {
                            float value = 0.0;
                            float amplitude = 0.5;
                            for(int i = 0; i < 4; i++) {
                                value += amplitude * voronoi(p);
                                p *= 2.0;
                                amplitude *= 0.5;
                            }
                            return value;
                        }
                        
                        void main() {
                            // Solar granulation pattern
                            float granulation = fbm(vUv * 20.0 + vec2(time * 0.1));
                            granulation = smoothstep(0.2, 0.8, granulation);
                            
                            // Temperature variation
                            vec3 hotColor = vec3(1.0, 1.0, 0.9);
                            vec3 coolColor = vec3(1.0, 0.7, 0.0);
                            vec3 surfaceColor = mix(coolColor, hotColor, granulation);
                            
                            // Sunspots (dark regions)
                            float spotPattern = sin(vUv.x * 30.0 + time * 0.05) * sin(vUv.y * 20.0);
                            float sunspot = smoothstep(0.7, 0.9, spotPattern) * 0.5;
                            surfaceColor *= (1.0 - sunspot);
                            
                            // Limb darkening
                            float limb = dot(vNormal, vec3(0.0, 0.0, 1.0));
                            limb = pow(max(limb, 0.0), 0.5);
                            surfaceColor *= mix(0.5, 1.0, limb);
                            
                            // Corona glow
                            float rim = 1.0 - limb;
                            vec3 coronaColor = vec3(1.0, 0.95, 0.8) * pow(rim, 2.0) * 2.0;
                            
                            // Emission
                            vec3 finalColor = surfaceColor * intensity + coronaColor;
                            
                            // Brightness variations
                            float brightness = 0.9 + 0.1 * sin(time * 3.0 + granulation * 10.0);
                            finalColor *= brightness;
                            
                            gl_FragColor = vec4(finalColor, 1.0);
                        }
                    `,
              transparent: false,
              blending: THREE.AdditiveBlending,
            });
            break;

          case "Black Hole":
            // Black hole - event horizon effect
            material = new THREE.ShaderMaterial({
              uniforms: {
                time: { value: 0.0 },
              },
              vertexShader: `
                        uniform float time;
                        varying vec2 vUv;
                        
                        void main() {
                            vUv = uv;
                            
                            // Spacetime distortion
                            vec3 pos = position;
                            float distortion = sin(time * 2.0 + length(pos) * 0.1) * 0.05;
                            pos += normalize(pos) * distortion;
                            
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                        }
                    `,
              fragmentShader: `
                        uniform float time;
                        varying vec2 vUv;
                        
                        void main() {
                            vec2 center = vec2(0.5, 0.5);
                            float dist = distance(vUv, center);
                            
                            // Event horizon - completely black center
                            if (dist < 0.4) {
                                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                            } else {
                                // Purple edge glow
                                float edge = 1.0 - smoothstep(0.4, 0.5, dist);
                                vec3 finalColor = vec3(0.5, 0.0, 0.5) * edge;
                                gl_FragColor = vec4(finalColor, 1.0);
                            }
                        }
                    `,
              transparent: false,
            });
            break;

          case "Neutron Star":
            // Neutron Star - intense pulsing + magnetosphere hint
            material = new THREE.ShaderMaterial({
              uniforms: {
                time: { value: 0.0 },
                baseColor: { value: new THREE.Color(0x9966ff) },
                pulseIntensity: { value: 1.0 },
              },
              vertexShader: `
                        uniform float time;
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        void main(){
                            vNormal = normalMatrix * normal;
                            vUv = uv;
                            // Slight oblateness due to rapid rotation
                            vec3 p = position;
                            p.y *= 0.97 + 0.02 * sin(time * 30.0);
                            // Rapid core pulse
                            float pulse = 1.0 + 0.05 * sin(time * 40.0);
                            p *= pulse;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
                        }
                    `,
              fragmentShader: `
                        uniform float time;
                        uniform vec3 baseColor;
                        uniform float pulseIntensity;
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}                        
                        void main(){
                            float nd = max(dot(normalize(vNormal), vec3(0.0,0.0,1.0)), 0.0);
                            float rim = pow(1.0-nd, 2.0);
                            float flicker = 0.9 + 0.1 * sin(time * 60.0 + hash(vUv*200.0)*10.0);
                            vec3 core = mix(baseColor*1.2, vec3(1.0), pow(nd,3.0));
                            vec3 color = core * flicker * (1.0 + rim * 0.5);
                            gl_FragColor = vec4(color, 1.0);
                        }
                    `,
              transparent: false,
              blending: THREE.AdditiveBlending,
            });
            break;

          case "White Dwarf":
            // White Dwarf - dense hot core with subtle bluish halo & flicker
            material = new THREE.ShaderMaterial({
              uniforms: {
                time: { value: 0.0 },
                baseColor: { value: new THREE.Color(0xffffff) },
                temperature: { value: 1.0 },
              },
              vertexShader: `
                        uniform float time;
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        varying float vRadial;
                        void main() {
                            vNormal = normalMatrix * normal;
                            vUv = uv;
                            // Radial factor for limb darkening / glow falloff
                            vRadial = length(position) / length(vec3(1.0));
                            // Tiny pulsation (white dwarf quasi-static)
                            float pulsate = 1.0 + 0.01 * sin(time * 6.0 + position.y * 10.0);
                            vec3 displaced = position * pulsate;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
                        }
                    `,
              fragmentShader: `
                        uniform float time;
                        uniform vec3 baseColor;
                        uniform float temperature;
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        varying float vRadial;
                        // Simple hash noise
                        float hash(vec2 p){
                            p = fract(p * vec2(123.34, 456.21));
                            p += dot(p, p + 45.32);
                            return fract(p.x * p.y);
                        }
                        void main(){
                            // Limb darkening using view-aligned normal
                            float nd = max(dot(normalize(vNormal), vec3(0.0,0.0,1.0)), 0.0);
                            float limb = pow(nd, 0.35);
                            // Subtle surface mottling
                            float n = hash(vUv * 40.0) * 0.5 + hash(vUv * 80.0) * 0.3;
                            // High-frequency flicker (scaled down for realism)
                            float flicker = 0.95 + 0.05 * sin(time * 50.0 + n * 10.0);
                            // Bluish-white core color variation by limb darkening
                            vec3 hotBlue = vec3(0.85, 0.90, 1.0);
                            vec3 core = mix(hotBlue, baseColor, limb);
                            vec3 color = core * flicker * (1.1 + n * 0.1);
                            gl_FragColor = vec4(color, 1.0);
                        }
                    `,
              transparent: false,
              blending: THREE.AdditiveBlending,
            });
            break;

          case "Jupiter":
            // Jupiter - realistic banded atmosphere with Great Red Spot
            const jupiterTexture = textureLoader.load('js/textures/jupiter_map.jpg');
            material = new THREE.ShaderMaterial({
              uniforms: {
                time: { value: 0.0 },
                sunDirection: {
                  value: new THREE.Vector3(1, 0.5, 0.5).normalize(),
                },
                jupiterTexture: { value: jupiterTexture },
              },
              vertexShader: `
                        varying vec2 vUv;
                        varying vec3 vNormal;
                        varying vec3 vPosition;
                        
                        void main() {
                            vUv = uv;
                            vNormal = normalize(normalMatrix * normal);
                            vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
              fragmentShader: `
                        uniform float time;
                        uniform vec3 sunDirection;
                        uniform sampler2D jupiterTexture;
                        varying vec2 vUv;
                        varying vec3 vNormal;
                        varying vec3 vPosition;
                        
                        void main() {
                            vec3 baseColor = texture2D(jupiterTexture, vUv).rgb;
                            
                            // Lighting
                            float NdotL = max(dot(vNormal, sunDirection), 0.0);
                            float ambient = 0.3;
                            float diffuse = NdotL * 0.7;
                            
                            // Subsurface scattering effect for gas giant
                            float scatter = pow(1.0 - NdotL, 2.0) * 0.3;
                            vec3 scatterColor = vec3(1.0, 0.8, 0.6) * scatter;
                            
                            vec3 finalColor = baseColor * (ambient + diffuse) + scatterColor;
                            
                            gl_FragColor = vec4(finalColor, 1.0);
                        }
                    `,
              transparent: false,
            });
            break;

          case "Mars":
            // Mars - realistic red planet with dust and polar caps
            const marsTexture = textureLoader.load('js/textures/mars_map.jpg');
            material = new THREE.ShaderMaterial({
              uniforms: {
                time: { value: 0.0 },
                sunDirection: {
                  value: new THREE.Vector3(1, 0.5, 0.5).normalize(),
                },
                marsTexture: { value: marsTexture },
              },
              vertexShader: `
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        varying vec3 vPosition;
                        
                        void main() {
                            vUv = uv;
                            vNormal = normalize(normalMatrix * normal);
                            vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
              fragmentShader: `
                        uniform float time;
                        uniform vec3 sunDirection;
                        uniform sampler2D marsTexture;
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        varying vec3 vPosition;
                        
                        void main() {
                            vec3 baseColor = texture2D(marsTexture, vUv).rgb;
                            
                            // Lighting
                            float NdotL = max(dot(vNormal, sunDirection), 0.0);
                            float ambient = 0.25;
                            float diffuse = NdotL * 0.75;
                            
                            // Thin atmosphere effect
                            float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
                            rim = pow(rim, 2.5);
                            vec3 atmosphereColor = vec3(0.8, 0.4, 0.2) * rim * 0.2;
                            
                            vec3 finalColor = baseColor * (ambient + diffuse) + atmosphereColor;
                            
                            gl_FragColor = vec4(finalColor, 1.0);
                        }
                    `,
              transparent: false,
            });
            break;

          case "Earth":
            // Earth - realistic with continents, oceans, and clouds
            const earthTexture = textureLoader.load('js/textures/earth_daymap.jpg');
            const earthNormalMap = textureLoader.load('js/textures/earth_normal_map.png');
            const earthCloudMap = textureLoader.load('js/textures/earth_clouds.jpg');

            material = new THREE.ShaderMaterial({
              uniforms: {
                time: { value: 0.0 },
                sunDirection: {
                  value: new THREE.Vector3(1, 0.5, 0.5).normalize(),
                },
                earthTexture: { value: earthTexture },
                earthNormalMap: { value: earthNormalMap },
                earthCloudMap: { value: earthCloudMap },
              },
              vertexShader: `
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        varying vec3 vPosition;
                        
                        void main() {
                            vUv = uv;
                            vNormal = normalize(normalMatrix * normal);
                            vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
              fragmentShader: `
                        uniform float time;
                        uniform vec3 sunDirection;
                        uniform sampler2D earthTexture;
                        uniform sampler2D earthNormalMap;
                        uniform sampler2D earthCloudMap;
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        varying vec3 vPosition;
                        
                        void main() {
                            vec3 normal = texture2D(earthNormalMap, vUv).rgb * 2.0 - 1.0;
                            vec3 baseColor = texture2D(earthTexture, vUv).rgb;
                            float clouds = texture2D(earthCloudMap, vUv).r;

                            // Lighting
                            float NdotL = max(dot(normal, sunDirection), 0.0);
                            float ambient = 0.3;
                            float diffuse = NdotL * 0.7;
                            
                            // Atmosphere rim lighting
                            float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
                            rim = pow(rim, 2.0);
                            vec3 atmosphereColor = vec3(0.3, 0.5, 1.0) * rim * 0.5;
                            
                            vec3 finalColor = baseColor * (ambient + diffuse) + atmosphereColor;
                            finalColor = mix(finalColor, vec3(1.0), clouds * 0.5);
                            
                            // Add specular for water
                            if (baseColor.b > baseColor.g) {
                                vec3 viewDir = normalize(cameraPosition - vPosition);
                                vec3 reflectDir = reflect(-sunDirection, normal);
                                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                                finalColor += vec3(1.0) * spec * 0.5;
                            }
                            
                            gl_FragColor = vec4(finalColor, 1.0);
                        }
                    `,
              transparent: false,
            });
            break;

          case "Moon":
            // Moon - realistic lunar surface with craters
            material = new THREE.ShaderMaterial({
              uniforms: {
                sunDirection: {
                  value: new THREE.Vector3(1, 0.5, 0.5).normalize(),
                },
              },
              vertexShader: `
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        varying vec3 vPosition;
                        
                        void main() {
                            vUv = uv;
                            vNormal = normalize(normalMatrix * normal);
                            vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
              fragmentShader: `
                        uniform vec3 sunDirection;
                        varying vec3 vNormal;
                        varying vec2 vUv;
                        varying vec3 vPosition;
                        
                        // Simple crater pattern using distance fields
                        float crater(vec2 p, vec2 center, float radius) {
                            float d = length(p - center);
                            return smoothstep(radius, radius * 0.7, d) * smoothstep(radius * 0.3, radius * 0.5, d);
                        }
                        
                        // Hash function for procedural generation
                        float hash(vec2 p) {
                            p = fract(p * vec2(123.34, 456.21));
                            p += dot(p, p + 45.32);
                            return fract(p.x * p.y);
                        }
                        
                        void main() {
                            // Base lunar colors
                            vec3 regolithLight = vec3(0.7, 0.68, 0.65);
                            vec3 regolithDark = vec3(0.4, 0.38, 0.35);
                            vec3 mariaColor = vec3(0.25, 0.23, 0.22);
                            
                            // Generate crater pattern
                            float craterPattern = 0.0;
                            for(int i = 0; i < 5; i++) {
                                vec2 craterPos = vec2(
                                    hash(vec2(float(i), 0.0)),
                                    hash(vec2(float(i), 1.0))
                                );
                                float craterSize = 0.05 + hash(vec2(float(i), 2.0)) * 0.1;
                                craterPattern += crater(vUv, craterPos, craterSize);
                            }
                            
                            // Mare (dark patches) pattern
                            float marePattern = smoothstep(0.4, 0.6, 
                                sin(vUv.x * 10.0) * sin(vUv.y * 8.0) + 
                                hash(floor(vUv * 4.0)) * 0.5
                            );
                            
                            // Mix surface colors
                            vec3 surfaceColor = mix(regolithLight, regolithDark, craterPattern);
                            surfaceColor = mix(surfaceColor, mariaColor, marePattern * 0.5);
                            
                            // Add surface detail noise
                            float detail = hash(vUv * 50.0) * 0.1 + 0.9;
                            surfaceColor *= detail;
                            
                            // Harsh lighting (no atmosphere)
                            float NdotL = max(dot(vNormal, sunDirection), 0.0);
                            float ambient = 0.1; // Very low ambient (no atmosphere to scatter light)
                            float diffuse = NdotL * 0.9;
                            
                            // Sharp shadows
                            diffuse = smoothstep(0.0, 0.05, diffuse) * 0.9;
                            
                            vec3 finalColor = surfaceColor * (ambient + diffuse);
                            
                            // Subtle rim light from Earth-shine
                            float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
                            rim = pow(rim, 3.0);
                            finalColor += vec3(0.15, 0.15, 0.2) * rim * 0.1;
                            
                            gl_FragColor = vec4(finalColor, 1.0);
                        }
                    `,
              transparent: false,
            });
            break;

          default:
            // Fallback material
            material = new THREE.MeshBasicMaterial({
              color: celestialData.color,
            });
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.userData = {
            type: 'celestialBody',
            celestialType: celestialData.name,
            createdAt: performance.now()
        };
        
        // Add to scene
        this.renderEngine.scene.add(mesh);
        
        // Create additional effects
        this.addCelestialEffects(mesh, celestialData);
        
        // Animate scale-in
        mesh.scale.setScalar(0);
        const targetScale = 1;
        
        const animate = () => {
            const progress = Math.min((performance.now() - mesh.userData.createdAt) / 1000, 1);
            const scale = this.easeOutBounce(progress) * targetScale;
            mesh.scale.setScalar(scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        animate();
        
        return mesh;
    }
    
    // Add special effects for celestial bodies
    addCelestialEffects(mesh, celestialData) {
      if (
        celestialData.visualEffects.rings &&
        celestialData.name === "Jupiter"
      ) {
        // Add planetary rings
        const ringGeometry = new THREE.RingGeometry(
          celestialData.radius * 1.5,
          celestialData.radius * 2.2,
          32
        );
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0x888866,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = Math.PI / 2;
        mesh.add(rings);
      }

      if (
        celestialData.visualEffects.accretionDisk &&
        celestialData.name === "Black Hole"
      ) {
        // Add accretion disk for black hole
        const diskGeometry = new THREE.RingGeometry(
          celestialData.radius * 1.2,
          celestialData.radius * 3.0,
          64
        );
        const diskMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0.0 },
            innerRadius: { value: celestialData.radius * 1.2 },
            outerRadius: { value: celestialData.radius * 3.0 },
          },
          vertexShader: `
                    varying vec2 vUv;
                    varying float vRadius;
                    
                    void main() {
                        vUv = uv;
                        vRadius = length(position);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
          fragmentShader: `
                    uniform float time;
                    uniform float innerRadius;
                    uniform float outerRadius;
                    varying vec2 vUv;
                    varying float vRadius;
                    
                    void main() {
                        float normalizedRadius = (vRadius - innerRadius) / (outerRadius - innerRadius);
                        
                        // Hot inner disk, cooler outer disk
                        vec3 innerColor = vec3(1.0, 0.5, 0.0); // Hot orange
                        vec3 outerColor = vec3(0.5, 0.0, 0.0); // Cool red
                        
                        vec3 color = mix(innerColor, outerColor, normalizedRadius);
                        
                        // Rotation effect
                        float rotation = time * 0.5 + normalizedRadius * 10.0;
                        float intensity = 0.5 + 0.5 * sin(rotation);
                        
                        gl_FragColor = vec4(color * intensity, 0.8);
                    }
                `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        });
        const disk = new THREE.Mesh(diskGeometry, diskMaterial);
        disk.rotation.x = Math.PI / 2;
        mesh.add(disk);
      }

      if (celestialData.visualEffects.atmosphere) {
        // Add atmospheric glow
        const atmosphereGeometry = new THREE.SphereGeometry(
          celestialData.radius * 1.1,
          32,
          16
        );
        const atmosphereMaterial = new THREE.ShaderMaterial({
          uniforms: {
            color: { value: celestialData.color },
          },
          vertexShader: `
                    varying vec3 vNormal;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
          fragmentShader: `
                    uniform vec3 color;
                    varying vec3 vNormal;
                    
                    void main() {
                        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                        gl_FragColor = vec4(color, 1.0) * intensity;
                    }
                `,
          blending: THREE.AdditiveBlending,
          transparent: true,
          side: THREE.BackSide,
        });
        const atmosphere = new THREE.Mesh(
          atmosphereGeometry,
          atmosphereMaterial
        );
        mesh.add(atmosphere);
      }

      // Specialized halo for White Dwarf (distinct from generic atmosphere)
      if (celestialData.name === "White Dwarf") {
        const haloGeometry = new THREE.SphereGeometry(
          celestialData.radius * 1.6,
          32,
          16
        );
        const haloMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0.0 },
            innerColor: { value: new THREE.Color(0xe0f4ff) },
            outerColor: { value: new THREE.Color(0x6fa8ff) },
          },
          vertexShader: `
                    varying vec3 vNormal;
                    void main(){
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                    }
                `,
          fragmentShader: `
                    uniform float time;
                    uniform vec3 innerColor;
                    uniform vec3 outerColor;
                    varying vec3 vNormal;
                    void main(){
                        float rim = 1.0 - max(dot(vNormal, vec3(0.0,0.0,1.0)), 0.0);
                        rim = pow(rim, 3.0);
                        // Subtle breathing
                        float breathe = 0.8 + 0.2 * sin(time * 2.5 + rim * 10.0);
                        vec3 color = mix(outerColor, innerColor, rim) * breathe;
                        gl_FragColor = vec4(color, rim * 0.6);
                    }
                `,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          side: THREE.BackSide,
        });
        const halo = new THREE.Mesh(haloGeometry, haloMaterial);
        halo.userData.isWhiteDwarfHalo = true;
        mesh.add(halo);
      }

      // Pulsar beams for Neutron Star
      if (celestialData.name === "Neutron Star") {
        const beamMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0.0 },
            color: { value: new THREE.Color(0xbb99ff) },
          },
          vertexShader: `
                    varying vec2 vUv;
                    void main(){
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                    }
                `,
          fragmentShader: `
                    uniform float time; uniform vec3 color; varying vec2 vUv;
                    void main(){
                        // Soft beam center, fade edges
                        float d = distance(vUv, vec2(0.5,0.0));
                        float intensity = smoothstep(0.8,0.0,d);
                        // Pulse bands
                        float bands = 0.5 + 0.5 * sin(time*30.0 + vUv.y*20.0);
                        vec3 col = color * intensity * bands;
                        gl_FragColor = vec4(col, intensity*0.6);
                    }
                `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const beamHeight = celestialData.radius * 6.0;
        const beamRadius = celestialData.radius * 0.6;
        // Two opposing cones
        const coneGeom = new THREE.ConeGeometry(
          beamRadius,
          beamHeight,
          16,
          1,
          true
        );
        const cone1 = new THREE.Mesh(coneGeom, beamMaterial.clone());
        cone1.rotation.x = Math.PI; // invert so open end outward
        cone1.position.y = beamHeight * 0.5;
        cone1.userData.isPulsarBeam = true;
        const cone2 = new THREE.Mesh(coneGeom, beamMaterial.clone());
        cone2.position.y = -beamHeight * 0.5;
        cone2.userData.isPulsarBeam = true;
        mesh.add(cone1);
        mesh.add(cone2);
        // Group rotation tilt to simulate beam misalignment
        mesh.userData.pulsarBeamTilt = new THREE.Euler(0.4, 0.0, 0.2);
      }
    }
    
    /**
     * Updates the animations and effects for all active celestial bodies.
     * @param {number} deltaTime - The time elapsed since the last frame.
     */
    update(deltaTime) {
        const time = performance.now() * 0.001;
        
        for (const [id, body] of this.activeBodies) {
          // Update shader uniforms for animated effects
          if (body.visual.material.uniforms) {
            if (body.visual.material.uniforms.time) {
              body.visual.material.uniforms.time.value = time;
            }
          }

          // Update child effects (rings, accretion disks, etc.)
          body.visual.children.forEach((child) => {
            if (child.material.uniforms && child.material.uniforms.time) {
              child.material.uniforms.time.value = time;
            }
          });

          // Special neutron star pulsar beam rotation
          if (body.data.name === "Neutron Star") {
            // Rotate beams around Y axis to simulate spin
            const spinSpeed = 2.0; // radians per second
            body.visual.rotation.y += spinSpeed * (deltaTime || 0.016);
            // Apply tilt for beams (only once; ensure exists)
            if (
              body.visual.userData.pulsarBeamTiltApplied !== true &&
              body.visual.userData.pulsarBeamTilt
            ) {
              body.visual.rotation.x = body.visual.userData.pulsarBeamTilt.x;
              body.visual.rotation.z = body.visual.userData.pulsarBeamTilt.z;
              body.visual.userData.pulsarBeamTiltApplied = true;
            }
            // Optionally modulate beam alpha via material uniforms (already driven by time)
          }

          // White dwarf halo breathing already handled by time uniform in child shader
        }
    }
    
    /**
     * Removes a celestial body from the simulation.
     * @param {string} id - The ID of the celestial body to remove.
     */
    removeCelestialBody(id) {
        const body = this.activeBodies.get(id);
        if (body) {
            // Remove from physics
            this.physicsEngine.removeGravityWell(body.physics.id);
            
            // Remove visual
            this.renderEngine.scene.remove(body.visual);
            body.visual.geometry.dispose();
            body.visual.material.dispose();
            
            // Remove from active bodies
            this.activeBodies.delete(id);
        }
    }
    
    /**
     * Removes all celestial bodies from the simulation.
     */
    clearAll() {
        for (const id of this.activeBodies.keys()) {
            this.removeCelestialBody(id);
        }
    }
    
    // Utility functions
    showConfirmationMessage(message) {
        const messageElement = document.getElementById('confirmation-message');
        messageElement.textContent = message;
        messageElement.style.opacity = 1;
        setTimeout(() => {
            messageElement.style.opacity = 0;
        }, 2000);
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }
    
    // Get info about all active celestial bodies
    getActiveBodies() {
        return Array.from(this.activeBodies.values()).map(body => ({
            id: body.id,
            type: body.type,
            name: body.data.name,
            mass: body.data.mass,
            position: body.position
        }));
    }
}
