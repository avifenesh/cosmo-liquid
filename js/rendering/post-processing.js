// Post-processing effects for HDR bloom, volumetric lighting, and cinematic visuals

class PostProcessingPipeline {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.composer = null;
        this.passes = {};
        
        this.initializePostProcessing();
    }
    
    initializePostProcessing() {
        // Create composer for effect chaining
        this.composer = new THREE.EffectComposer(this.sceneManager.renderer);
        
        // Add render pass (base scene)
        const renderPass = new THREE.RenderPass(
            this.sceneManager.scene,
            this.sceneManager.camera
        );
        this.composer.addPass(renderPass);
        this.passes.render = renderPass;
        
        // Add custom shaders for spectacular effects
        this.addHDRBloomPass();
        this.addVolumetricLightingPass();
        this.addChromaticAberrationPass();
        this.addFilmGrainPass();
        this.addVignettePass();
    }
    
    addHDRBloomPass() {
        // Custom HDR bloom shader for ethereal glow
        const bloomShader = {
            uniforms: {
                tDiffuse: { value: null },
                bloomStrength: { value: 2.0 },
                bloomRadius: { value: 0.5 },
                bloomThreshold: { value: 0.3 },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            },
            
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float bloomStrength;
                uniform float bloomRadius;
                uniform float bloomThreshold;
                uniform vec2 resolution;
                varying vec2 vUv;
                
                // Luminance calculation
                float getLuminance(vec3 color) {
                    return dot(color, vec3(0.299, 0.587, 0.114));
                }
                
                // Kawase blur for efficient bloom
                vec3 kawaseBlur(sampler2D tex, vec2 uv, float radius) {
                    vec2 texelSize = 1.0 / resolution;
                    vec3 color = vec3(0.0);
                    float total = 0.0;
                    
                    for (float x = -4.0; x <= 4.0; x++) {
                        for (float y = -4.0; y <= 4.0; y++) {
                            float weight = exp(-(x*x + y*y) / (2.0 * radius * radius));
                            vec2 offset = vec2(x, y) * texelSize;
                            color += texture2D(tex, uv + offset).rgb * weight;
                            total += weight;
                        }
                    }
                    
                    return color / total;
                }
                
                // HDR tonemapping with exposure
                vec3 acesTonemap(vec3 color, float exposure) {
                    color *= exposure;
                    float a = 2.51;
                    float b = 0.03;
                    float c = 2.43;
                    float d = 0.59;
                    float e = 0.14;
                    return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
                }
                
                void main() {
                    vec3 color = texture2D(tDiffuse, vUv).rgb;
                    
                    // Extract bright areas
                    float luminance = getLuminance(color);
                    vec3 brightColor = color * smoothstep(bloomThreshold, bloomThreshold + 0.1, luminance);
                    
                    // Multi-pass bloom
                    vec3 bloom = kawaseBlur(tDiffuse, vUv, bloomRadius * 2.0) * 0.5;
                    bloom += kawaseBlur(tDiffuse, vUv, bloomRadius * 4.0) * 0.3;
                    bloom += kawaseBlur(tDiffuse, vUv, bloomRadius * 8.0) * 0.2;
                    
                    // Combine with HDR tonemapping
                    vec3 finalColor = color + bloom * bloomStrength * brightColor;
                    finalColor = acesTonemap(finalColor, 1.2);
                    
                    // Add subtle color grading
                    finalColor.r = pow(finalColor.r, 0.95);
                    finalColor.b = pow(finalColor.b, 1.05);
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        };
        
        const bloomPass = new THREE.ShaderPass(bloomShader);
        this.composer.addPass(bloomPass);
        this.passes.bloom = bloomPass;
    }
    
    addVolumetricLightingPass() {
        // God rays / volumetric lighting effect
        const volumetricShader = {
            uniforms: {
                tDiffuse: { value: null },
                lightPosition: { value: new THREE.Vector2(0.5, 0.5) },
                exposure: { value: 0.3 },
                decay: { value: 0.95 },
                density: { value: 0.8 },
                weight: { value: 0.4 },
                samples: { value: 100 }
            },
            
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 lightPosition;
                uniform float exposure;
                uniform float decay;
                uniform float density;
                uniform float weight;
                uniform int samples;
                varying vec2 vUv;
                
                void main() {
                    vec2 texCoord = vUv;
                    vec2 deltaTexCoord = (texCoord - lightPosition) / float(samples) * density;
                    vec3 color = texture2D(tDiffuse, texCoord).rgb;
                    
                    float illuminationDecay = 1.0;
                    vec3 godRays = vec3(0.0);
                    
                    for (int i = 0; i < 100; i++) {
                        if (i >= samples) break;
                        
                        texCoord -= deltaTexCoord;
                        vec3 sample = texture2D(tDiffuse, texCoord).rgb;
                        sample *= illuminationDecay * weight;
                        godRays += sample;
                        illuminationDecay *= decay;
                    }
                    
                    godRays *= exposure;
                    gl_FragColor = vec4(color + godRays, 1.0);
                }
            `
        };
        
        const volumetricPass = new THREE.ShaderPass(volumetricShader);
        this.composer.addPass(volumetricPass);
        this.passes.volumetric = volumetricPass;
    }
    
    addChromaticAberrationPass() {
        // Chromatic aberration for lens distortion effect
        const chromaticShader = {
            uniforms: {
                tDiffuse: { value: null },
                amount: { value: 0.003 },
                angle: { value: 0.0 }
            },
            
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float amount;
                uniform float angle;
                varying vec2 vUv;
                
                void main() {
                    vec2 offset = amount * vec2(cos(angle), sin(angle));
                    vec2 cr = texture2D(tDiffuse, vUv + offset).rg;
                    vec2 cga = texture2D(tDiffuse, vUv).ga;
                    vec2 cb = texture2D(tDiffuse, vUv - offset).ba;
                    
                    gl_FragColor = vec4(cr.r, cga.r, cb.r, cga.g);
                }
            `
        };
        
        const chromaticPass = new THREE.ShaderPass(chromaticShader);
        this.composer.addPass(chromaticPass);
        this.passes.chromatic = chromaticPass;
    }
    
    addFilmGrainPass() {
        // Film grain for cinematic texture
        const grainShader = {
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0 },
                amount: { value: 0.05 }
            },
            
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                uniform float amount;
                varying vec2 vUv;
                
                float random(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float grain = random(vUv + time) * amount - amount * 0.5;
                    color.rgb += vec3(grain);
                    gl_FragColor = color;
                }
            `
        };
        
        const grainPass = new THREE.ShaderPass(grainShader);
        this.composer.addPass(grainPass);
        this.passes.grain = grainPass;
    }
    
    addVignettePass() {
        // Vignette for cinematic framing
        const vignetteShader = {
            uniforms: {
                tDiffuse: { value: null },
                offset: { value: 1.0 },
                darkness: { value: 1.5 }
            },
            
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float offset;
                uniform float darkness;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
                    float vignette = 1.0 - dot(uv, uv);
                    color.rgb = mix(color.rgb * 0.2, color.rgb, vignette);
                    gl_FragColor = color;
                }
            `
        };
        
        const vignettePass = new THREE.ShaderPass(vignetteShader);
        vignettePass.renderToScreen = true; // Final pass
        this.composer.addPass(vignettePass);
        this.passes.vignette = vignettePass;
    }
    
    updateLightPosition(position) {
        // Update volumetric light source position
        const screenPos = this.sceneManager.worldToScreen(position);
        this.passes.volumetric.uniforms.lightPosition.value = screenPos;
    }
    
    update(deltaTime) {
        // Update time-based effects
        if (this.passes.grain) {
            this.passes.grain.uniforms.time.value += deltaTime;
        }
        
        // Update chromatic aberration rotation
        if (this.passes.chromatic) {
            this.passes.chromatic.uniforms.angle.value += deltaTime * 0.5;
        }
    }
    
    render() {
        this.composer.render();
    }
    
    setQuality(level) {
        switch (level) {
            case 'low':
                this.passes.bloom.uniforms.bloomStrength.value = 1.0;
                this.passes.volumetric.uniforms.samples.value = 50;
                this.passes.grain.enabled = false;
                break;
            case 'medium':
                this.passes.bloom.uniforms.bloomStrength.value = 1.5;
                this.passes.volumetric.uniforms.samples.value = 75;
                this.passes.grain.enabled = true;
                break;
            case 'high':
                this.passes.bloom.uniforms.bloomStrength.value = 2.0;
                this.passes.volumetric.uniforms.samples.value = 100;
                this.passes.grain.enabled = true;
                break;
        }
    }
    
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.composer.setSize(width, height);
        
        // Update resolution uniforms
        if (this.passes.bloom) {
            this.passes.bloom.uniforms.resolution.value.set(width, height);
        }
    }
    
    dispose() {
        this.composer.dispose();
    }
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PostProcessingPipeline;
}
