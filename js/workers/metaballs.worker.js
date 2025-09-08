/**
 * Metaballs Web Worker - Generates liquid surfaces using Marching Cubes algorithm
 * Processes particle positions to create smooth metaball surfaces in a separate thread
 * for better performance and to avoid blocking the main thread.
 * 
 * @fileoverview This worker implements the Marching Cubes algorithm to generate
 * smooth liquid surfaces from particle data. It uses lookup tables for efficient
 * mesh generation and runs independently from the main rendering thread.
 */

importScripts('https://unpkg.com/three@0.158.0/build/three.min.js');

/**
 * @typedef {Object} ParticleData
 * @property {Object} position - Plain object with x, y, z properties
 * @property {number} position.x - X coordinate of the particle
 * @property {number} position.y - Y coordinate of the particle
 * @property {number} position.z - Z coordinate of the particle
 * @property {number} size - The size/influence radius of the particle
 */

/**
 * @typedef {Object} MeshData
 * @property {Float32Array} vertices - Array of vertex positions (x,y,z triplets)
 * @property {Float32Array} normals - Array of vertex normals (x,y,z triplets)
 */

/**
 * Handles messages from the main thread to generate the metaball mesh
 * Receives particle data, updates the metaball field, and generates mesh using Marching Cubes
 * @param {MessageEvent} e - The message event from main thread
 * @param {Object} e.data - The data sent from the main thread
 * @param {ParticleData[]} e.data.particles - An array of particle data objects
 */
self.onmessage = function(e) {
    try {
        const { particles } = e.data;

        // Type validation for worker message
        if (!particles || !Array.isArray(particles)) {
            console.warn('Metaballs worker received invalid particles data:', particles);
            return;
        }

        // Initialize metaballs if it doesn't exist
        if (!self.metaballs) {
            self.metaballs = new Metaballs();
        }

        // Convert particle data to format expected by metaballs
        const validParticles = particles.filter(p => {
            return p && p.position && 
                   typeof p.position.x === 'number' && 
                   typeof p.position.y === 'number' && 
                   typeof p.position.z === 'number' &&
                   typeof p.size === 'number';
        });

        if (validParticles.length === 0) {
            // Send empty mesh if no valid particles
            const emptyVertices = new Float32Array(0);
            const emptyNormals = new Float32Array(0);
            self.postMessage({ vertices: emptyVertices, normals: emptyNormals });
            return;
        }

        self.metaballs.update(validParticles);
        const { vertices, normals } = self.metaballs.generateMesh();

        self.postMessage({ vertices, normals }, [vertices.buffer, normals.buffer]);
    } catch (error) {
        console.error('Metaballs worker error:', error);
        // Send empty mesh on error
        const emptyVertices = new Float32Array(0);
        const emptyNormals = new Float32Array(0);
        self.postMessage({ vertices: emptyVertices, normals: emptyNormals });
    }
}

// --- MarchingCubesTables ---
const edgeTable = [
    0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
    0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
    0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
    0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
    0x230, 0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c,
    0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
    0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5, 0x4ac,
    0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
    0x460, 0x569, 0x663, 0x76a, 0x66, 0x16f, 0x265, 0x36c,
    0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
    0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff, 0x3f5, 0x2fc,
    0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
    0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55, 0x15c,
    0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
    0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc,
    0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
    0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
    0xcc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
    0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
    0x15c, 0x55, 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
    0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
    0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
    0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
    0x36c, 0x265, 0x16f, 0x66, 0x76a, 0x663, 0x569, 0x460,
    0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
    0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0,
    0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
    0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33, 0x339, 0x230,
    0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
    0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99, 0x190,
    0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
    0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0
];

const triTable = [
    [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 2, 10, 0, 2, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [2, 8, 3, 2, 10, 8, 10, 9, 8, -1, -1, -1, -1, -1, -1, -1],
    [3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 11, 2, 8, 11, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 9, 0, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 11, 2, 1, 9, 11, 9, 8, 11, -1, -1, -1, -1, -1, -1, -1],
    [3, 10, 1, 11, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 10, 1, 0, 8, 10, 8, 11, 10, -1, -1, -1, -1, -1, -1, -1],
    [3, 9, 0, 3, 11, 9, 11, 10, 9, -1, -1, -1, -1, -1, -1, -1],
    [9, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 3, 0, 7, 3, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 1, 9, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 1, 9, 4, 7, 1, 7, 3, 1, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 4, 7, 3, 0, 4, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1],
    [9, 2, 10, 9, 0, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
    [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1, -1, -1, -1],
    [8, 4, 7, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [11, 4, 7, 11, 2, 4, 2, 0, 4, -1, -1, -1, -1, -1, -1, -1],
    [9, 0, 1, 8, 4, 7, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
    [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1, -1, -1, -1],
    [3, 10, 1, 3, 11, 10, 7, 8, 4, -1, -1, -1, -1, -1, -1, -1],
    [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1, -1, -1, -1],
    [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1, -1, -1, -1],
    [4, 7, 11, 4, 11, 9, 9, 11, 10, -1, -1, -1, -1, -1, -1, -1],
    [9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 5, 4, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [8, 3, 1, 8, 1, 5, 8, 5, 4, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 8, 1, 2, 10, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
    [5, 2, 10, 5, 4, 2, 4, 0, 2, -1, -1, -1, -1, -1, -1, -1],
    [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1, -1, -1, -1],
    [9, 5, 4, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 11, 2, 0, 8, 11, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
    [0, 5, 4, 0, 1, 5, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
    [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1, -1, -1, -1],
    [10, 3, 11, 10, 1, 3, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1],
    [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1, -1, -1, -1],
    [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1, -1, -1, -1],
    [5, 4, 8, 5, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1],
    [9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1, -1, -1, -1, -1],
    [0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1, -1, -1, -1, -1],
    [1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 7, 8, 9, 5, 7, 10, 1, 2, -1, -1, -1, -1, -1, -1, -1],
    [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1, -1, -1, -1],
    [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1, -1, -1, -1],
    [2, 10, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1],
    [7, 9, 5, 7, 8, 9, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1],
    [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1, -1, -1, -1],
    [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1, -1, -1, -1],
    [11, 2, 1, 11, 1, 7, 7, 1, 5, -1, -1, -1, -1, -1, -1, -1],
    [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1, -1, -1, -1],
    [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
    [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
    [11, 10, 5, 7, 11, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 0, 1, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 8, 3, 1, 9, 8, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
    [1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 6, 5, 1, 2, 6, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1],
    [9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1, -1, -1, -1, -1],
    [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1, -1, -1, -1],
    [2, 3, 11, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [11, 0, 8, 11, 2, 0, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
    [0, 1, 9, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
    [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1, -1, -1, -1],
    [6, 3, 11, 6, 5, 3, 5, 1, 3, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1, -1, -1, -1],
    [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1, -1, -1, -1],
    [6, 5, 9, 6, 9, 11, 11, 9, 8, -1, -1, -1, -1, -1, -1, -1],
    [5, 10, 6, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 7, 8, 5, 10, 6, 0, 3, -1, -1, -1, -1, -1, -1, -1, -1],
    [5, 10, 6, 9, 0, 1, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
    [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1, -1, -1, -1],
    [6, 1, 2, 6, 5, 1, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1, -1, -1, -1],
    [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1, -1, -1, -1],
    [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
    [5, 10, 6, 3, 11, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
    [2, 0, 4, 2, 4, 7, 2, 7, 11, 6, 7, 4, 5, 10, 6, -1],
    [1, 9, 0, 5, 10, 6, 8, 4, 7, 2, 3, 11, -1, -1, -1, -1],
    [10, 6, 5, 1, 9, 2, 9, 11, 2, 9, 4, 11, 7, 11, 4, -1],
    [6, 5, 1, 6, 1, 8, 6, 8, 7, 8, 1, 3, 11, 3, 1, -1],
    [1, 0, 5, 1, 5, 6, 0, 7, 5, 6, 5, 11, 7, 11, 5, -1],
    [7, 8, 0, 7, 0, 11, 7, 11, 6, 5, 11, 0, 9, 0, 5, -1],
    [11, 6, 5, 7, 11, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [10, 4, 9, 6, 4, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 10, 6, 4, 9, 10, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1],
    [10, 0, 1, 10, 6, 0, 6, 4, 0, -1, -1, -1, -1, -1, -1, -1],
    [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1, -1, -1, -1],
    [1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1, -1, -1, -1],
    [0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1],
    [10, 4, 9, 10, 6, 4, 11, 2, 3, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1, -1, -1, -1],
    [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1, -1, -1, -1],
    [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
    [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1, -1, -1, -1],
    [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
    [3, 11, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1, -1, -1, -1, -1],
    [6, 4, 8, 11, 6, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [7, 10, 6, 7, 8, 10, 8, 9, 10, -1, -1, -1, -1, -1, -1, -1],
    [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1, -1, -1, -1],
    [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1, -1, -1, -1],
    [10, 6, 7, 10, 7, 1, 1, 7, 3, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1, -1, -1, -1],
    [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
    [7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1, -1, -1, -1, -1],
    [7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [2, 3, 11, 10, 6, 9, 10, 9, 8, 10, 8, 7, -1, -1, -1, -1],
    [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
    [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
    [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1, -1, -1, -1],
    [8, 9, 1, 8, 1, 7, 7, 1, 3, 11, 3, 1, 10, 6, 1, -1],
    [10, 6, 0, 11, 0, 3, 1, 0, 6, 7, 0, 8, -1, -1, -1, -1],
    [10, 0, 3, 10, 3, 6, 0, 8, 3, 7, 3, 11, -1, -1, -1, -1],
    [11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 8, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 1, 9, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [8, 1, 9, 8, 3, 1, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
    [10, 1, 2, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, 3, 0, 8, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
    [2, 9, 0, 2, 10, 9, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
    [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1, -1, -1, -1],
    [7, 2, 3, 6, 2, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [7, 0, 8, 7, 6, 0, 6, 2, 0, -1, -1, -1, -1, -1, -1, -1],
    [2, 7, 6, 2, 3, 7, 0, 1, 9, -1, -1, -1, -1, -1, -1, -1],
    [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1, -1, -1, -1],
    [10, 7, 6, 10, 1, 7, 1, 3, 7, -1, -1, -1, -1, -1, -1, -1],
    [10, 7, 6, 1, 7, 10, 1, 8, 7, 8, 0, 7, -1, -1, -1, -1],
    [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1, -1, -1, -1],
    [7, 6, 10, 7, 10, 8, 8, 10, 9, -1, -1, -1, -1, -1, -1, -1],
    [6, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [6, 4, 7, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 0, 1, 6, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 8, 3, 1, 9, 8, 6, 4, 7, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, 4, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 8, 1, 2, 10, 4, 7, 6, -1, -1, -1, -1, -1, -1, -1],
    [9, 0, 1, 4, 7, 6, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1],
    [2, 10, 9, 2, 9, 8, 2, 8, 3, 4, 7, 6, -1, -1, -1, -1],
    [6, 4, 7, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, 4, 7, 6, 2, 11, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 0, 1, 6, 4, 7, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
    [1, 8, 3, 1, 9, 8, 6, 4, 7, 2, 11, -1, -1, -1, -1, -1],
    [1, 2, 10, 3, 11, 6, 3, 6, 4, 3, 4, 7, -1, -1, -1, -1],
    [1, 2, 10, 0, 8, 4, 0, 4, 7, 0, 7, 6, -1, -1, -1, -1],
    [9, 0, 2, 9, 2, 10, 0, 7, 2, 6, 2, 7, 4, 7, 0, -1],
    [2, 10, 9, 2, 9, 3, 3, 9, 4, 3, 4, 7, 6, 7, 4, -1],
    [6, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [6, 5, 4, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 1, 9, 4, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 8, 3, 1, 9, 8, 4, 6, 5, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, 5, 4, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 8, 1, 2, 10, 5, 4, 6, -1, -1, -1, -1, -1, -1, -1],
    [9, 0, 1, 5, 4, 6, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1],
    [2, 10, 9, 2, 9, 8, 2, 8, 3, 5, 4, 6, -1, -1, -1, -1],
    [2, 3, 11, 4, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, 2, 11, 4, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 0, 1, 4, 6, 5, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
    [1, 8, 3, 1, 9, 8, 4, 6, 5, 2, 11, -1, -1, -1, -1, -1],
    [1, 2, 10, 3, 11, 5, 3, 5, 4, 3, 4, 6, -1, -1, -1, -1],
    [1, 2, 10, 0, 8, 5, 0, 5, 4, 0, 4, 6, -1, -1, -1, -1],
    [0, 1, 9, 2, 10, 3, 11, 5, 4, 6, -1, -1, -1, -1, -1, -1],
    [10, 9, 8, 10, 8, 3, 10, 3, 2, 5, 4, 6, -1, -1, -1, -1],
    [5, 9, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [5, 9, 4, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [8, 3, 1, 8, 1, 5, 8, 5, 4, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 8, 1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1],
    [5, 2, 10, 5, 4, 2, 4, 0, 2, -1, -1, -1, -1, -1, -1, -1],
    [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1, -1, -1, -1],
    [9, 5, 4, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, 2, 11, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 5, 4, 0, 1, 5, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
    [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1, -1, -1, -1],
    [10, 1, 3, 10, 3, 11, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1],
    [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1, -1, -1, -1],
    [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1, -1, -1, -1],
    [5, 4, 8, 5, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1],
    [9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1, -1, -1, -1, -1],
    [0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1, -1, -1, -1, -1],
    [1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 7, 8, 9, 5, 7, 10, 1, 2, -1, -1, -1, -1, -1, -1, -1],
    [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1, -1, -1, -1],
    [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1, -1, -1, -1],
    [2, 10, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1],
    [7, 9, 5, 7, 8, 9, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1],
    [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1, -1, -1, -1],
    [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1, -1, -1, -1],
    [11, 2, 1, 11, 1, 7, 7, 1, 5, -1, -1, -1, -1, -1, -1, -1],
    [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1, -1, -1, -1],
    [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
    [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
    [11, 10, 5, 7, 11, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 0, 1, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 8, 3, 1, 9, 8, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
    [1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 6, 5, 1, 2, 6, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1],
    [9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1, -1, -1, -1, -1],
    [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1, -1, -1, -1],
    [2, 3, 11, 10, 6, 5, -1, -1, -1, -1, -.1, -1, -1, -1, -1, -1],
    [11, 0, 8, 11, 2, 0, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
    [0, 1, 9, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
    [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1, -1, -1, -1],
    [6, 3, 11, 6, 5, 3, 5, 1, 3, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1, -1, -1, -1],
    [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1, -1, -1, -1],
    [6, 5, 9, 6, 9, 11, 11, 9, 8, -1, -1, -1, -1, -1, -1, -1],
    [5, 10, 6, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 7, 8, 5, 10, 6, 0, 3, -1, -1, -1, -1, -1, -1, -1, -1],
    [5, 10, 6, 9, 0, 1, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
    [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1, -1, -1, -1],
    [6, 1, 2, 6, 5, 1, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1, -1, -1, -1],
    [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1, -1, -1, -1],
    [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
    [5, 10, 6, 3, 11, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
    [2, 0, 4, 2, 4, 7, 2, 7, 11, 6, 7, 4, 5, 10, 6, -1],
    [1, 9, 0, 5, 10, 6, 8, 4, 7, 2, 3, 11, -1, -1, -1, -1],
    [10, 6, 5, 1, 9, 2, 9, 11, 2, 9, 4, 11, 7, 11, 4, -1],
    [6, 5, 1, 6, 1, 8, 6, 8, 7, 8, 1, 3, 11, 3, 1, -1],
    [1, 0, 5, 1, 5, 6, 0, 7, 5, 6, 5, 11, 7, 11, 5, -1],
    [7, 8, 0, 7, 0, 11, 7, 11, 6, 5, 11, 0, 9, 0, 5, -1],
    [11, 6, 5, 7, 11, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [10, 4, 9, 6, 4, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 10, 6, 4, 9, 10, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1],
    [10, 0, 1, 10, 6, 0, 6, 4, 0, -1, -1, -1, -1, -1, -1, -1],
    [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1, -1, -1, -1],
    [1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1, -1, -1, -1],
    [0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1],
    [10, 4, 9, 10, 6, 4, 11, 2, 3, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1, -1, -1, -1],
    [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1, -1, -1, -1],
    [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
    [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1, -1, -1, -1],
    [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
    [3, 11, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1, -1, -1, -1, -1],
    [6, 4, 8, 11, 6, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [7, 10, 6, 7, 8, 10, 8, 9, 10, -1, -1, -1, -1, -1, -1, -1],
    [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1, -1, -1, -1],
    [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1, -1, -1, -1],
    [10, 6, 7, 10, 7, 1, 1, 7, 3, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1, -1, -1, -1],
    [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
    [7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1, -1, -1, -1, -1],
    [7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [2, 3, 11, 10, 6, 9, 10, 9, 8, 10, 8, 7, -1, -1, -1, -1],
    [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
    [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
    [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1, -1, -1, -1],
    [8, 9, 1, 8, 1, 7, 7, 1, 3, 11, 3, 1, 10, 6, 1, -1],
    [10, 6, 0, 11, 0, 3, 1, 0, 6, 7, 0, 8, -1, -1, -1, -1],
    [10, 0, 3, 10, 3, 6, 0, 8, 3, 7, 3, 11, -1, -1, -1, -1],
    [11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
];

// --- Metaballs ---
class Metaballs {
    /**
     * Creates an instance of the Metaballs generator.
     * @param {number} [resolution=32] - The resolution of the grid.
     * @param {number} [size=200] - The size of the metaball field.
     */
    constructor(resolution = 32, size = 200) {
        this.resolution = resolution;
        this.size = size;
        this.grid = new Float32Array(resolution * resolution * resolution);
        this.threshold = 0.5;
    }

    /**
     * Updates the metaball grid based on particle positions.
     * @param {ParticleData[]} particles - An array of particles to influence the grid.
     */
    update(particles) {
        this.grid.fill(0);

        for (const particle of particles) {
            const halfSize = this.size / 2;
            const gridX = Math.floor(((particle.position.x + halfSize) / this.size) * this.resolution);
            const gridY = Math.floor(((particle.position.y + halfSize) / this.size) * this.resolution);
            const gridZ = Math.floor(((particle.position.z + halfSize) / this.size) * this.resolution);

            for (let x = -2; x <= 2; x++) {
                for (let y = -2; y <= 2; y++) {
                    for (let z = -2; z <= 2; z++) {
                        const ix = gridX + x;
                        const iy = gridY + y;
                        const iz = gridZ + z;

                        if (ix >= 0 && ix < this.resolution && iy >= 0 && iy < this.resolution && iz >= 0 && iz < this.resolution) {
                            const index = ix + iy * this.resolution + iz * this.resolution * this.resolution;
                            const worldX = (ix / this.resolution) * this.size - halfSize;
                            const worldY = (iy / this.resolution) * this.size - halfSize;
                            const worldZ = (iz / this.resolution) * this.size - halfSize;
                            const pos = new THREE.Vector3(worldX, worldY, worldZ);
                            const dist = pos.distanceTo(new THREE.Vector3(particle.position.x, particle.position.y, particle.position.z));
                            this.grid[index] += (particle.size * 10) / (dist * dist + 1);
                        }
                    }
                }
            }
        }
    }

    /**
     * Generates the mesh from the current grid state using the Marching Cubes algorithm.
     * @returns {{vertices: Float32Array, normals: Float32Array}} The generated vertices and normals.
     */
    generateMesh() {
        const vertices = [];
        const normals = [];

        const halfSize = this.size / 2;

        for (let z = 0; z < this.resolution - 1; z++) {
            for (let y = 0; y < this.resolution - 1; y++) {
                for (let x = 0; x < this.resolution - 1; x++) {
                    const cubeIndex = this.calculateCubeIndex(x, y, z);
                    if (edgeTable[cubeIndex] === 0) continue;

                    const cornerPositions = this.getCornerPositions(x, y, z, halfSize);
                    const cornerValues = this.getCornerValues(x, y, z);

                    const vertexList = this.getVertexList(cornerPositions, cornerValues, cubeIndex);

                    for (let i = 0; triTable[cubeIndex][i] !== -1; i += 3) {
                        const v1 = vertexList[triTable[cubeIndex][i]];
                        const v2 = vertexList[triTable[cubeIndex][i + 1]];
                        const v3 = vertexList[triTable[cubeIndex][i + 2]];

                        // Skip triangles with null vertices
                        if (!v1 || !v2 || !v3) {
                            console.warn('Skipping triangle with null vertex:', { v1, v2, v3 });
                            continue;
                        }

                        try {
                            const edge1 = new THREE.Vector3().subVectors(v2, v1);
                            const edge2 = new THREE.Vector3().subVectors(v3, v1);
                            const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

                            // Ensure normal is valid
                            if (!isFinite(normal.x) || !isFinite(normal.y) || !isFinite(normal.z)) {
                                console.warn('Invalid normal calculated, using default:', normal);
                                normal.set(0, 1, 0); // Default up vector
                            }

                            vertices.push(v1.x, v1.y, v1.z);
                            vertices.push(v2.x, v2.y, v2.z);
                            vertices.push(v3.x, v3.y, v3.z);

                            normals.push(normal.x, normal.y, normal.z);
                            normals.push(normal.x, normal.y, normal.z);
                            normals.push(normal.x, normal.y, normal.z);
                        } catch (error) {
                            console.warn('Error generating triangle:', error);
                        }
                    }
                }
            }
        }

        return { vertices: new Float32Array(vertices), normals: new Float32Array(normals) };
    }

    calculateCubeIndex(x, y, z) {
        let cubeIndex = 0;
        if (this.grid[x + y * this.resolution + z * this.resolution * this.resolution] < this.threshold) cubeIndex |= 1;
        if (this.grid[(x + 1) + y * this.resolution + z * this.resolution * this.resolution] < this.threshold) cubeIndex |= 2;
        if (this.grid[(x + 1) + (y + 1) * this.resolution + z * this.resolution * this.resolution] < this.threshold) cubeIndex |= 4;
        if (this.grid[x + (y + 1) * this.resolution + z * this.resolution * this.resolution] < this.threshold) cubeIndex |= 8;
        if (this.grid[x + y * this.resolution + (z + 1) * this.resolution * this.resolution] < this.threshold) cubeIndex |= 16;
        if (this.grid[(x + 1) + y * this.resolution + (z + 1) * this.resolution * this.resolution] < this.threshold) cubeIndex |= 32;
        if (this.grid[(x + 1) + (y + 1) * this.resolution + (z + 1) * this.resolution * this.resolution] < this.threshold) cubeIndex |= 64;
        if (this.grid[x + (y + 1) * this.resolution + (z + 1) * this.resolution * this.resolution] < this.threshold) cubeIndex |= 128;
        return cubeIndex;
    }

    getCornerPositions(x, y, z, halfSize) {
        const cornerPositions = [];
        for (let i = 0; i < 8; i++) {
            const cx = x + (i & 1);
            const cy = y + ((i >> 1) & 1);
            const cz = z + ((i >> 2) & 1);
            cornerPositions.push(new THREE.Vector3((cx / this.resolution) * this.size - halfSize, (cy / this.resolution) * this.size - halfSize, (cz / this.resolution) * this.size - halfSize));
        }
        return cornerPositions;
    }

    getCornerValues(x, y, z) {
        const cornerValues = [];
        for (let i = 0; i < 8; i++) {
            const cx = x + (i & 1);
            const cy = y + ((i >> 1) & 1);
            const cz = z + ((i >> 2) & 1);
            cornerValues.push(this.grid[cx + cy * this.resolution + cz * this.resolution * this.resolution]);
        }
        return cornerValues;
    }

    getVertexList(cornerPositions, cornerValues, cubeIndex) {
        const vertexList = [];
        
        // Correct edge to vertex mapping for marching cubes
        const edgeVertices = [
            [0, 1], [1, 2], [2, 3], [3, 0], // bottom face edges
            [4, 5], [5, 6], [6, 7], [7, 4], // top face edges  
            [0, 4], [1, 5], [2, 6], [3, 7]  // vertical edges
        ];
        
        for (let i = 0; i < 12; i++) {
            if ((edgeTable[cubeIndex] & (1 << i)) === 0) {
                vertexList.push(null);
                continue;
            }
            
            const edge = edgeVertices[i];
            const edgeIndex1 = edge[0];
            const edgeIndex2 = edge[1];

            const p1 = cornerPositions[edgeIndex1];
            const p2 = cornerPositions[edgeIndex2];
            const v1 = cornerValues[edgeIndex1];
            const v2 = cornerValues[edgeIndex2];

            // Add safety checks for undefined values
            if (!p1 || !p2 || v1 === undefined || v2 === undefined) {
                console.warn('Invalid corner data in metaballs:', { p1, p2, v1, v2, edgeIndex1, edgeIndex2 });
                vertexList.push(null);
                continue;
            }

            // Prevent division by zero
            const denominator = v2 - v1;
            if (Math.abs(denominator) < 1e-6) {
                // Use midpoint if values are too close
                vertexList.push(new THREE.Vector3().lerpVectors(p1, p2, 0.5));
            } else {
                const t = Math.max(0, Math.min(1, (this.threshold - v1) / denominator));
                vertexList.push(new THREE.Vector3().lerpVectors(p1, p2, t));
            }
        }
        return vertexList;
    }
}
