// Create 64x32 character matrix
const WIDTH = 64;
const HEIGHT = 32;
const matrix = [];

// Initialize matrix with spaces
for (let y = 0; y < HEIGHT; y++) {
    matrix[y] = [];
    for (let x = 0; x < WIDTH; x++) {
        matrix[y][x] = ' ';
    }
}

// 16-level ASCII shading (darkest to brightest)
const ASCII_SHADES = '.:-=+*#%@@';

// Cube vertices (8 corners)
const cubeVertices = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1]
];

// Cube faces (indices into vertices array)
const cubeFaces = [
    [0, 1, 2, 3], // front
    [4, 5, 6, 7], // back
    [0, 1, 5, 4], // bottom
    [2, 3, 7, 6], // top
    [0, 3, 7, 4], // left
    [1, 2, 6, 5]  // right
];

// Light direction (pointing down from top)
const lightDir = { x: 0, y: -1, z: 0 };

// Rotation angles
let angleX = 0;
let angleY = 0;
let angleZ = 0;

// 3D rotation matrices
function rotateX(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: point.x,
        y: point.y * cos - point.z * sin,
        z: point.y * sin + point.z * cos
    };
}

function rotateY(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: point.x * cos + point.z * sin,
        y: point.y,
        z: -point.x * sin + point.z * cos
    };
}

function rotateZ(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: point.x * cos - point.y * sin,
        y: point.x * sin + point.y * cos,
        z: point.z
    };
}

// Project 3D point to 2D screen space
function project(point) {
    const scale = 40;
    const distance = 3;
    const factor = scale / (distance + point.z);
    return {
        x: Math.floor(point.x * factor + WIDTH / 2),
        y: Math.floor(point.y * factor * 0.5 + HEIGHT / 2) // 0.5 for aspect ratio
    };
}

// Calculate face normal
function getFaceNormal(vertices) {
    // Get two edges of the face
    const v1 = {
        x: vertices[1].x - vertices[0].x,
        y: vertices[1].y - vertices[0].y,
        z: vertices[1].z - vertices[0].z
    };
    const v2 = {
        x: vertices[2].x - vertices[0].x,
        y: vertices[2].y - vertices[0].y,
        z: vertices[2].z - vertices[0].z
    };

    // Cross product
    const normal = {
        x: v1.y * v2.z - v1.z * v2.y,
        y: v1.z * v2.x - v1.x * v2.z,
        z: v1.x * v2.y - v1.y * v2.x
    };

    // Normalize
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    return {
        x: normal.x / length,
        y: normal.y / length,
        z: normal.z / length
    };
}

// Calculate dot product for lighting
function dotProduct(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

// Fill polygon (simple scanline fill)
function fillPolygon(points, char) {
    if (points.length < 3) return;

    // Find bounding box
    let minY = HEIGHT, maxY = 0;
    for (const p of points) {
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    }

    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(HEIGHT - 1, Math.ceil(maxY));

    // Scanline fill
    for (let y = minY; y <= maxY; y++) {
        const intersections = [];

        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
                const t = (y - p1.y) / (p2.y - p1.y);
                const x = p1.x + t * (p2.x - p1.x);
                intersections.push(x);
            }
        }

        intersections.sort((a, b) => a - b);

        for (let i = 0; i < intersections.length; i += 2) {
            if (i + 1 < intersections.length) {
                const x1 = Math.max(0, Math.floor(intersections[i]));
                const x2 = Math.min(WIDTH - 1, Math.ceil(intersections[i + 1]));

                for (let x = x1; x <= x2; x++) {
                    matrix[y][x] = char;
                }
            }
        }
    }
}

// Clear matrix
function clearMatrix() {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            matrix[y][x] = ' ';
        }
    }
}

// Get canvas element
const canvas = document.getElementById('canvas');

// Render function
function render() {
    clearMatrix();

    // Rotate cube vertices
    const rotatedVertices = cubeVertices.map(v => {
        let point = { x: v[0], y: v[1], z: v[2] };
        point = rotateX(point, angleX);
        point = rotateY(point, angleY);
        point = rotateZ(point, angleZ);
        return point;
    });

    // Process each face
    const faces = cubeFaces.map((faceIndices, i) => {
        const faceVertices = faceIndices.map(idx => rotatedVertices[idx]);
        const normal = getFaceNormal(faceVertices);
        const projected = faceVertices.map(v => project(v));

        // Calculate face center
        const faceCenter = {
            x: faceVertices.reduce((sum, v) => sum + v.x, 0) / faceVertices.length,
            y: faceVertices.reduce((sum, v) => sum + v.y, 0) / faceVertices.length,
            z: faceVertices.reduce((sum, v) => sum + v.z, 0) / faceVertices.length
        };

        // View direction from face to camera (camera is at positive Z)
        const viewDir = {
            x: -faceCenter.x,
            y: -faceCenter.y,
            z: 3 - faceCenter.z  // camera at z=3 (from distance in project)
        };

        // Normalize view direction
        const viewLength = Math.sqrt(viewDir.x * viewDir.x + viewDir.y * viewDir.y + viewDir.z * viewDir.z);
        viewDir.x /= viewLength;
        viewDir.y /= viewLength;
        viewDir.z /= viewLength;

        // Calculate lighting based on angle to view
        // Parallel to view plane (perpendicular to view direction) = dark (dot product ~0)
        // Perpendicular to view plane (facing camera) = bright (dot product ~1)
        let brightness = Math.abs(dotProduct(normal, viewDir));
        brightness = Math.max(0, Math.min(1, brightness));
        // Enhance contrast
        brightness = Math.pow(brightness, 0.7);

        // Map to ASCII shade
        const shadeIndex = Math.floor(brightness * (ASCII_SHADES.length - 1));
        const char = ASCII_SHADES[shadeIndex];

        // Calculate average Z for depth sorting
        const avgZ = faceVertices.reduce((sum, v) => sum + v.z, 0) / faceVertices.length;

        return { projected, char, avgZ, normal };
    });

    // Sort faces by depth (back to front)
    faces.sort((a, b) => a.avgZ - b.avgZ);

    // Render faces
    for (const face of faces) {
        fillPolygon(face.projected, face.char);
    }

    // Update rotation
    angleX += 0.01;
    angleY += 0.015;
    angleZ += 0.008;

    // Convert matrix to string
    let output = '';
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            output += matrix[y][x];
        }
        output += '\n';
    }

    canvas.textContent = output;
}

// 60 fps animation loop
let lastTime = 0;
const targetFPS = 60;
const frameInterval = 1000 / targetFPS;

function animate(currentTime) {
    requestAnimationFrame(animate);

    const deltaTime = currentTime - lastTime;

    if (deltaTime >= frameInterval) {
        lastTime = currentTime - (deltaTime % frameInterval);
        render();
    }
}

// Initial render
render();

// Start animation loop
requestAnimationFrame(animate);