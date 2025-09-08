# GEMINI.md

## Project Overview

**Cosmo Liquid Painter** is an interactive 3D physics art game that allows users to create spectacular cosmic art. The application simulates liquid streams dancing through space, influenced by advanced physics principles like gravity, quantum mechanics, and relativistic effects. It's built using **Three.js** for 3D rendering, with custom **WebGL shaders** for GPU-accelerated particle effects and advanced visuals.

The project is written in **JavaScript (ES6 Modules)** and follows a modular architecture, separating concerns into distinct engines for rendering, physics, particle management, and user input.

### Core Technologies:
- **3D Rendering:** Three.js (r128)
- **GPU Acceleration:** WebGL 2.0, GLSL Shaders
- **Audio:** Web Audio API for procedural sound
- **Architecture:** ES6 Modules

### Key Architectural Components:
- **`RenderEngine.js`**: Manages the Three.js scene, camera, lighting, and post-processing effects like bloom.
- **`PhysicsEngine.js`**: Handles complex physics simulations, including N-body gravitation, electromagnetic forces, and quantum effects.
- **`ParticleSystem.js`**: Manages the lifecycle of over 10,000 simultaneous particles, including their state, physics integration, and visual properties.
- **`VisualEffects.js`**: Implements advanced visual effects through custom GLSL shaders, such as HDR bloom, volumetric lighting, and chromatic aberration.
- **`InputManager.js`**: Manages user interactions, including mouse controls for launching particles and placing gravity wells, and keyboard shortcuts.
- **`AudioEngine.js`**: Generates procedural audio for events like particle launches, collisions, and UI interactions.
- **`CelestialBodies.js`**: Manages the properties and placement of celestial bodies that act as gravity wells.

## Building and Running

The project can be run directly in a modern web browser that supports WebGL 2.0.

### Quick Start (No Build Required)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/cosmic-liquid-painter.git
    cd cosmic-liquid-painter
    ```
2.  **Start a local web server:**
    ```bash
    python3 -m http.server 8080
    ```
3.  **Open in your browser:**
    Navigate to `http://localhost:8080`

### Development Workflow

The project includes optional npm scripts for a more structured development process.

1.  **Install dependencies (optional):**
    ```bash
    npm install
    ```
2.  **Run the development server:**
    ```bash
    npm run dev
    ```
3.  **Build for production:**
    ```bash
    npm run build
    ```
4.  **Deploy to GitHub Pages:**
    The `.github/workflows/deploy.yml` file defines a GitHub Actions workflow to automatically deploy the `main` branch to GitHub Pages.
    ```bash
    npm run deploy
    ```

## Development Conventions

- **Modularity:** The codebase is highly modular, with responsibilities separated into distinct classes (e.g., `RenderEngine`, `PhysicsEngine`). This makes the code easier to understand, maintain, and extend.
- **ES6 Modules:** The project uses ES6 `import`/`export` syntax for clean and explicit dependency management.
- **Performance:** The application is designed for performance, with features like GPU-accelerated particles, dynamic LOD, and efficient physics calculations.
- **UI:** The UI is built with standard HTML and CSS, overlaid on the 3D canvas. It includes a performance monitor, liquid selectors, and control hints.
- **Physics Simulation:** The simulation is based on a custom physics engine that implements Verlet integration and calculates forces such as gravity, electromagnetism, and quantum uncertainty.
- **Visuals:** The project aims for high-quality cinematic visuals, using post-processing effects and custom shaders to create a rich, immersive experience.
