import * as THREE from 'three';

/**
 * ScreenSpaceFluid - lightweight screen-space fluid surface approximation.
 * Steps:
 * 1. Thickness Pass: Render particles as large, soft spheres accumulating thickness.
 * 2. Blur Passes: Separable Gaussian blur to smooth thickness field (half-res for perf).
 * 3. Composite Pass: Fullscreen quad sampling blurred thickness; applies color + Fresnel-like rim.
 *
 * This is an initial prototype (no normal reconstruction yet). Designed to be optional.
 */
export class ScreenSpaceFluid {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {Object} [options]
   */
  constructor(renderer, options = {}) {
    this.renderer = renderer;
    this.enabled = false;
    this.resolutionScale = options.resolutionScale || 0.5; // half-res default
    this.maxThickness = options.maxThickness || 3.5;
    this.globalPointScale = options.globalPointScale || 1.4;
    this.blurRadius = options.blurRadius || 4; // kernel half-width in texels
    this._needsResize = true;

    // Render targets
    this.thicknessRT = null;
    this.blurRT1 = null;
    this.blurRT2 = null;

    // Materials
    this.thicknessMaterial = this._createThicknessMaterial();
    this.blurMaterial = this._createBlurMaterial();
    this.compositeMaterial = this._createCompositeMaterial();

    // Fullscreen quad
    this.fsScene = new THREE.Scene();
    this.fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const plane = new THREE.PlaneGeometry(2, 2);
    this.fsQuad = new THREE.Mesh(plane, this.compositeMaterial);
    this.fsScene.add(this.fsQuad);
  }

  /** Enable or disable the effect */
  setEnabled(val) { this.enabled = val; }
  isEnabled() { return this.enabled; }

  /** Adjust quality scaling (hooked from external quality changes) */
  setQuality(level) {
    // Map to resolution & blur taps
    const map = {
      high: { scale: 0.75, blur: 5 },
      medium: { scale: 0.5, blur: 4 },
      low: { scale: 0.33, blur: 3 }
    };
    const q = map[level] || map.medium;
    this.resolutionScale = q.scale;
    this.blurRadius = q.blur;
    this._needsResize = true;
  }

  /** Ensure RT sizes match current canvas */
  _ensureTargets() {
    const rendererSize = this.renderer.getSize(new THREE.Vector2());
    const w = Math.max(2, Math.floor(rendererSize.x * this.resolutionScale));
    const h = Math.max(2, Math.floor(rendererSize.y * this.resolutionScale));
    if (this.thicknessRT && this.thicknessRT.width === w && !this._needsResize) return;

    const pars = { 
      minFilter: THREE.LinearFilter, 
      magFilter: THREE.LinearFilter, 
      format: THREE.RGBAFormat, 
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false
    };
    this._disposeTargets();
    this.thicknessRT = new THREE.WebGLRenderTarget(w, h, pars);
    this.blurRT1 = new THREE.WebGLRenderTarget(w, h, pars);
    this.blurRT2 = new THREE.WebGLRenderTarget(w, h, pars);
    this._needsResize = false;
  }

  _disposeTargets() {
    [this.thicknessRT, this.blurRT1, this.blurRT2].forEach(rt => rt && rt.dispose());
  }

  dispose() {
    this._disposeTargets();
    this.thicknessMaterial?.dispose();
    this.blurMaterial?.dispose();
    this.compositeMaterial?.dispose();
    this.fsQuad?.geometry?.dispose();
  }

  /** Thickness material - accumulates radial falloff into color (R/G/B/A same). */
  _createThicknessMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        maxThickness: { value: this.maxThickness },
        globalPointScale: { value: this.globalPointScale }
      },
      vertexShader: `
        uniform float globalPointScale;
        attribute float aSize;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          float ps = max(2.0, aSize) * globalPointScale * (300.0 / -mv.z);
          gl_PointSize = ps;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float maxThickness;
        void main(){
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
            float r2 = dot(uv,uv);
          if(r2>1.0) discard;
          float sphereZ = sqrt(1.0 - r2); // hemisphere depth
          float thickness = sphereZ; // 0..1
          thickness = min(thickness, maxThickness);
          gl_FragColor = vec4(vec3(thickness), thickness);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });
  }

  /** Single-pass blur material (direction provided via uniform). */
  _createBlurMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        inputTex: { value: null },
        direction: { value: new THREE.Vector2(1,0) },
        texSize: { value: new THREE.Vector2(1,1) },
        radius: { value: this.blurRadius }
      },
      vertexShader: `
        varying vec2 vUv; 
        void main(){
          vUv = uv; 
          gl_Position = vec4(position,1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv; 
        uniform sampler2D inputTex; 
        uniform vec2 direction; 
        uniform vec2 texSize; 
        uniform float radius; 
        float gauss(float x, float sigma){ return exp(- (x*x) / (2.0*sigma*sigma)); }
        void main(){
          vec2 inv = 1.0 / texSize; 
          float sigma = radius * 0.5 + 0.5; 
          vec4 sum = vec4(0.0);
          float wSum = 0.0;
          for(int i=-16;i<=16;i++){
            float fi = float(i);
            if(abs(fi) > radius) continue;
            float w = gauss(fi, sigma);
            vec2 off = direction * fi * inv;
            sum += texture2D(inputTex, vUv + off) * w;
            wSum += w;
          }
          gl_FragColor = sum / max(wSum, 1e-4);
        }
      `,
      depthTest: false,
      depthWrite: false,
      transparent: false
    });
  }

  /** Composite material - colorizes thickness */
  _createCompositeMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        thicknessTex: { value: null },
        intensity: { value: 1.0 },
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv; 
        void main(){ vUv = uv; gl_Position = vec4(position,1.0); }
      `,
      fragmentShader: `
        varying vec2 vUv; 
        uniform sampler2D thicknessTex; 
        uniform float intensity; 
        uniform float time; 
        void main(){
          vec4 t = texture2D(thicknessTex, vUv);
          float th = t.a; // stored thickness in alpha
          // Basic thickness remap
          float d = clamp(th * 1.2, 0.0, 1.0);
          // Fake Fresnel using screen position distance from center
          vec2 centered = vUv * 2.0 - 1.0; 
          float fres = pow(1.0 - clamp(length(centered),0.0,1.0), 1.5);
          float glowPulse = 0.85 + 0.15 * sin(time * 2.0);
          vec3 baseCol = mix(vec3(0.1,0.3,0.6), vec3(0.9,0.95,1.0), d);
          vec3 finalCol = baseCol * (0.4 + 0.6 * fres) * glowPulse;
          float alpha = d * 0.9;
          if(alpha < 0.02) discard;
          gl_FragColor = vec4(finalCol * intensity, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });
  }

  /** Perform full fluid pass (call after main scene render) */
  render(renderer, particlePoints, elapsedTime) {
    if (!this.enabled || !particlePoints) return;
    this._ensureTargets();

    // Update uniforms that may change
    this.blurMaterial.uniforms.radius.value = this.blurRadius;
    this.compositeMaterial.uniforms.time.value = elapsedTime;

    // 1. Thickness accumulation
    const originalMaterial = particlePoints.material;
    particlePoints.material = this.thicknessMaterial;
    renderer.setRenderTarget(this.thicknessRT);
    renderer.clearColor();
    renderer.clear();
    renderer.render(particlePoints, renderer.getCurrentCamera?.() || particlePoints.parent?.parent?.camera || this._fallbackCamera());

    // Restore material
    particlePoints.material = originalMaterial;

    // 2. Blur passes
    // Horizontal
    this.blurMaterial.uniforms.inputTex.value = this.thicknessRT.texture;
    this.blurMaterial.uniforms.direction.value.set(1,0);
    this.blurMaterial.uniforms.texSize.value.set(this.thicknessRT.width, this.thicknessRT.height);
    this._renderFullscreen(this.blurMaterial, this.blurRT1);
    // Vertical
    this.blurMaterial.uniforms.inputTex.value = this.blurRT1.texture;
    this.blurMaterial.uniforms.direction.value.set(0,1);
    this._renderFullscreen(this.blurMaterial, this.blurRT2);

    // 3. Composite to screen
    this.compositeMaterial.uniforms.thicknessTex.value = this.blurRT2.texture;
    renderer.setRenderTarget(null);
    this._renderFullscreen(this.compositeMaterial, null);
  }

  _renderFullscreen(material, target) {
    const prev = this.fsQuad.material;
    this.fsQuad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.fsScene, this.fsCamera);
    this.fsQuad.material = prev;
  }

  _fallbackCamera() {
    if (!this._internalPerspective) {
      this._internalPerspective = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
      this._internalPerspective.position.set(0,0,300);
    }
    return this._internalPerspective;
  }
}
