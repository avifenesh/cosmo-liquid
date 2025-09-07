// Mathematical utilities for 3D physics calculations

class Vector3D {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // Vector operations
    add(v) {
        return new Vector3D(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    subtract(v) {
        return new Vector3D(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    multiply(scalar) {
        return new Vector3D(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    divide(scalar) {
        if (scalar === 0) return new Vector3D(0, 0, 0);
        return new Vector3D(this.x / scalar, this.y / scalar, this.z / scalar);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
        return new Vector3D(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    lengthSquared() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    normalize() {
        const len = this.length();
        if (len === 0) return new Vector3D(0, 0, 0);
        return this.divide(len);
    }

    distance(v) {
        return this.subtract(v).length();
    }

    distanceSquared(v) {
        return this.subtract(v).lengthSquared();
    }

    clone() {
        return new Vector3D(this.x, this.y, this.z);
    }

    toThreeVector3() {
        return new THREE.Vector3(this.x, this.y, this.z);
    }

    static fromThreeVector3(v) {
        return new Vector3D(v.x, v.y, v.z);
    }

    // Lerp between two vectors
    static lerp(v1, v2, t) {
        return v1.multiply(1 - t).add(v2.multiply(t));
    }
}

// Physics constants
const Physics = {
    GRAVITATIONAL_CONSTANT: 6.67430e-11, // Scaled for our simulation
    SPEED_OF_LIGHT: 299792458, // m/s (for relativistic effects)
    SIMULATION_SCALE: 1e-6, // Scale factor for distances
    TIME_SCALE: 1.0, // Time dilation factor
    
    // Simulation parameters
    GRAVITY_STRENGTH: 100, // Amplified for visual effect
    DRAG_COEFFICIENT: 0.99, // Air resistance in space (minimal)
    MIN_DISTANCE: 0.1, // Minimum distance for gravity calculations
    MAX_FORCE: 1000, // Maximum force to prevent singularities
    
    // Liquid properties
    LIQUID_VISCOSITY: 0.95,
    SURFACE_TENSION: 0.1,
    COHESION_DISTANCE: 2.0,
    
    // Visual parameters
    TRAIL_LENGTH: 50,
    GLOW_INTENSITY: 2.0,
    PARTICLE_SIZE: 0.5
};

// Mathematical helper functions
const MathUtils = {
    // Clamp value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    // Linear interpolation
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    // Map value from one range to another
    map(value, fromMin, fromMax, toMin, toMax) {
        return toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin);
    },

    // Random float between min and max
    randomFloat(min, max) {
        return min + Math.random() * (max - min);
    },

    // Random integer between min and max (inclusive)
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Smooth step function for smooth transitions
    smoothStep(t) {
        return t * t * (3 - 2 * t);
    },

    // Smoother step function
    smootherStep(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    },

    // Distance between two points in 3D space
    distance3D(x1, y1, z1, x2, y2, z2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    // Convert degrees to radians
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    },

    // Convert radians to degrees
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    },

    // Generate Perlin noise for procedural effects
    noise(x, y, z = 0) {
        // Simple pseudo-random noise function
        const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
        return n - Math.floor(n);
    },

    // Calculate orbital velocity for circular orbit
    orbitalVelocity(mass, distance) {
        return Math.sqrt(Physics.GRAVITY_STRENGTH * mass / distance);
    },

    // Calculate escape velocity
    escapeVelocity(mass, distance) {
        return Math.sqrt(2 * Physics.GRAVITY_STRENGTH * mass / distance);
    },

    // Calculate gravitational force between two objects
    gravitationalForce(mass1, mass2, distance) {
        if (distance < Physics.MIN_DISTANCE) distance = Physics.MIN_DISTANCE;
        const force = Physics.GRAVITY_STRENGTH * mass1 * mass2 / (distance * distance);
        return Math.min(force, Physics.MAX_FORCE);
    }
};

// Color utilities for different liquid types
const ColorUtils = {
    liquidColors: {
        plasma: {
            primary: 0xff4444,
            secondary: 0xffaa44,
            glow: 0xff8888
        },
        crystal: {
            primary: 0x44ff44,
            secondary: 0x88ffaa,
            glow: 0x88ff88
        },
        temporal: {
            primary: 0xff44ff,
            secondary: 0xaa88ff,
            glow: 0xff88ff
        },
        antimatter: {
            primary: 0x44ffff,
            secondary: 0x88aaff,
            glow: 0x88ffff
        },
        quantum: {
            primary: 0x0088ff,
            secondary: 0x00ffff,
            glow: 0x00ccff
        },
        dark: {
            primary: 0x220044,
            secondary: 0x110022,
            glow: 0x330066
        },
        exotic: {
            primary: 0xffaa00,
            secondary: 0xff6600,
            glow: 0xffcc00
        },
        photonic: {
            primary: 0xffffff,
            secondary: 0xffffaa,
            glow: 0xffff00
        }
    },

    // Get color for liquid type
    getLiquidColor(type, variant = 'primary') {
        return this.liquidColors[type]?.[variant] || this.liquidColors.plasma[variant];
    },

    // Mix two colors
    mixColors(color1, color2, ratio) {
        const r1 = (color1 >> 16) & 0xFF;
        const g1 = (color1 >> 8) & 0xFF;
        const b1 = color1 & 0xFF;
        
        const r2 = (color2 >> 16) & 0xFF;
        const g2 = (color2 >> 8) & 0xFF;
        const b2 = color2 & 0xFF;
        
        const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
        
        return (r << 16) | (g << 8) | b;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Vector3D, Physics, MathUtils, ColorUtils };
}
