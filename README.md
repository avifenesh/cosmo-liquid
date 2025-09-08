# Cosmic Liquid

An experimental WebGL playground: throw particle "liquids" into 3D space, drop a few gravity wells, watch clusters drift, merge, smear into something that kind of feels fluid if you squint. Mostly CPU worker physics + Three.js rendering. A bunch of knobs are exposed; nothing here is production‑grade. Have fun.

## What it does (short)
* Spawns particles with simple per‑type presets (mass / color / size tweaks).
* Simulates basic gravity + optional density / pressure effects in a Web Worker.
* Renders as point sprites with optional soft overlay and (prototype) screen‑space smoothing.
* Lets you place celestial bodies at depth (two placement modes).
* Provides a few debugging hooks in the global `window.cosmoLiquid` object.

## Status
Alpha / exploratory. Visual tricks > physical accuracy. Values are clamped defensively to avoid NaNs. Expect occasional resets if you push particle counts too high.

## Quick start
```bash
git clone <repo-url>
cd cosmo-liquid
python3 -m http.server 3030    # or any static server
# open http://localhost:3030
```
No build step required for the basic demo (plain modules + Three.js). Any optional npm scripts you see are experimental.

## Basic controls
| Action                         | Input                   |
| ------------------------------ | ----------------------- |
| Launch stream                  | Click + drag            |
| Quick burst                    | Single click            |
| Place gravity well             | Right click             |
| Orbit / rotate camera          | Left drag (empty space) |
| Zoom                           | Mouse wheel             |
| Adjust launch power            | Shift + wheel           |
| Pause / resume                 | Space                   |
| Switch liquid type             | Number keys (1‑8)       |
| Toggle info card               | I                       |
| Clear particles                | Cmd/Ctrl + C            |
| Toggle fluid smoothing overlay | Console (see below)     |

Depth placement keys:
* P – toggle mode (`cameraDistance` ↔ `planeZ`)
* [ / ] – adjust distance (cameraDistance mode) or planeZ (planeZ mode)

## Runtime tweaks (console)
```js
// Soft overlay (Gaussian-ish splats over points)
cosmoLiquid.renderEngine.toggleFluidSmoothing(true);
cosmoLiquid.renderEngine.toggleFluidSmoothing(false);

// Prototype screen‑space fluid accumulation
cosmoLiquid.renderEngine.toggleScreenSpaceFluid(true);

// Inspect physics worker status
cosmoLiquid.particleSystem.getPhysicsStatus();

// Visibility stats
cosmoLiquid.particleSystem.debugVisibilityStats();

// Adjust brightness of basic liquids
for (const [k,m] of cosmoLiquid.renderEngine.visualEffects.liquidMaterials) {
  if (m.uniforms?.brightness) m.uniforms.brightness.value = 1.4;
}
```

## Internals (very short map)
| File                           | Purpose                                                                   |
| ------------------------------ | ------------------------------------------------------------------------- |
| `js/main.js`                   | Bootstraps engine, input wiring, depth placement state                    |
| `js/core/ParticleSystem.js`    | Particle buffers, worker messaging, visibility modulation                 |
| `js/workers/physics.worker.js` | Gravity + (optional) SPH-ish density/pressure, adaptive feature disabling |
| `js/core/RenderEngine.js`      | Scene, camera, postprocessing, screenToWorld depth modes                  |
| `js/core/VisualEffects.js`     | Materials, bloom / overlay hooks                                          |
| `js/core/AudioEngine.js`       | Minimal procedural audio (stubby)                                         |

Not all “fancy” effects mentioned in earlier versions are present; the worker focuses on stability + basic forces.

## Particle visibility notes
* Each particle keeps a `baseSize`; dynamic scaling multiplies it by density / pressure factors.
* Minimum on‑screen clamp stops tiny near‑camera collapse.
* Additive blending + bloom supply most of the “glow”. Turn bloom down if everything becomes washed out.
* Overlay + prototype screen‑space pass are optional; disable if FPS tanks.

## Troubleshooting (condensed)
Particles look faint / tiny:
1. Increase material brightness (see snippet above).
2. Raise min point size uniform (`minPointSize` in basic liquid materials).
3. Ensure bloom enabled (otherwise just sparse points).

Streams stop near horizon:
* A fallback distance projection is already in place; if it still aborts, check console for unexpected errors.

Physics worker “stalls”:
* Check `getPhysicsStatus()`; if features auto‑disabled (SPH / octree) you exceeded soft thresholds.
* Reduce active particle count or frequency of bursts.

NaN or runaway particle sizes:
* Defensive clamps exist; if you still see it, inspect custom shader edits (likely `gl_PointSize` math).

## Extending
* Add a new liquid: extend type config (look for where liquid presets are listed) then provide color / mass / size bias.
* Custom shader: copy a basic liquid material; ensure attribute `aSize` is declared and used.
* Alternate depth logic: modify `RenderEngine.screenToWorld` (two modes already: planeZ & cameraDistance).

## Philosophy (why so minimal now?)
Previous README was… loud. This version is intentionally sparse: fewer promises, easier maintenance, less drift from reality.

## License
MIT – see `LICENSE`.

## Credit
Built on Three.js. Thanks to open fluid / SPH references and various WebGL posts. That’s it.

---
If something is unclear, read the code – it’s short. If it isn’t short, future you will probably trim it.
