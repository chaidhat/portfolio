// Create 64x32 character matrix
const WIDTH = 64;
const HEIGHT = 32;
const matrix = [];

// Initialize matrix with null (empty)
for (let y = 0; y < HEIGHT; y++) {
    matrix[y] = [];
    for (let x = 0; x < WIDTH; x++) {
        matrix[y][x] = null; // null = empty, number = brightness (0-1)
    }
}

// Convert brightness to color
function brightnessToColor(brightness) {
    const value = Math.min(255, Math.max(0, Math.round(324 - brightness * 258)));
    const hex = value.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
}

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

// Cube faces (indices into vertices array, wound for outward normals)
const cubeFaces = [
    [0, 3, 2, 1], // front (normal -Z)
    [4, 5, 6, 7], // back (normal +Z)
    [0, 1, 5, 4], // bottom (normal -Y)
    [2, 3, 7, 6], // top (normal +Y)
    [0, 4, 7, 3], // left (normal -X)
    [1, 2, 6, 5]  // right (normal +X)
];

// Rotation matrix (3x3, stored as flat array row-major)
let rotationMatrix = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
];

// Drag state
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Multiply two 3x3 matrices
function multiplyMatrices(a, b) {
    return [
        a[0]*b[0] + a[1]*b[3] + a[2]*b[6], a[0]*b[1] + a[1]*b[4] + a[2]*b[7], a[0]*b[2] + a[1]*b[5] + a[2]*b[8],
        a[3]*b[0] + a[4]*b[3] + a[5]*b[6], a[3]*b[1] + a[4]*b[4] + a[5]*b[7], a[3]*b[2] + a[4]*b[5] + a[5]*b[8],
        a[6]*b[0] + a[7]*b[3] + a[8]*b[6], a[6]*b[1] + a[7]*b[4] + a[8]*b[7], a[6]*b[2] + a[7]*b[5] + a[8]*b[8]
    ];
}

// Create rotation matrix around X axis
function rotationMatrixX(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [1, 0, 0, 0, c, -s, 0, s, c];
}

// Create rotation matrix around Y axis
function rotationMatrixY(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [c, 0, s, 0, 1, 0, -s, 0, c];
}

// Create rotation matrix around Z axis
function rotationMatrixZ(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
}

// Apply rotation matrix to point
function applyMatrix(m, p) {
    return {
        x: m[0]*p.x + m[1]*p.y + m[2]*p.z,
        y: m[3]*p.x + m[4]*p.y + m[5]*p.z,
        z: m[6]*p.x + m[7]*p.y + m[8]*p.z
    };
}

// Project 3D point to 2D screen space
function project(point) {
    const scale = 110;
    const distance = 8;
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

// Fill polygon (simple scanline fill)
function fillPolygon(points, brightness) {
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
                    matrix[y][x] = brightness;
                }
            }
        }
    }
}

// Clear matrix
function clearMatrix() {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            matrix[y][x] = null;
        }
    }
}

// Get canvas element
const canvas = document.getElementById('canvas');

// Render function
function render() {
    clearMatrix();

    // Rotate cube vertices using rotation matrix
    const rotatedVertices = cubeVertices.map(v => {
        const point = { x: v[0], y: v[1], z: v[2] };
        return applyMatrix(rotationMatrix, point);
    });

    // Process each face
    const faces = cubeFaces.map((faceIndices, i) => {
        const faceVertices = faceIndices.map(idx => rotatedVertices[idx]);
        const normal = getFaceNormal(faceVertices);
        const projected = faceVertices.map(v => project(v));
        const avgZ = faceVertices.reduce((sum, v) => sum + v.z, 0) / faceVertices.length;

        // Backface culling: normal pointing away from camera (z < 0) means visible
        if (normal.z >= 0) {
            return null;
        }

        // Brightness based on how much face points toward camera
        let brightness = Math.abs(normal.z);
        brightness = brightness ** 0.7;

        return { projected, brightness, avgZ };
    }).filter(face => face !== null);

    // Sort faces by depth (back to front)
    faces.sort((a, b) => b.avgZ - a.avgZ);

    // Render faces
    for (const face of faces) {
        fillPolygon(face.projected, face.brightness);
    }

    // Anti-aliasing: detect edges and blend them
    const edgeMatrix = [];
    for (let y = 0; y < HEIGHT; y++) {
        edgeMatrix[y] = [];
        for (let x = 0; x < WIDTH; x++) {
            if (matrix[y][x] !== null) {
                // Count empty neighbors (8-directional)
                let emptyNeighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny < 0 || ny >= HEIGHT || nx < 0 || nx >= WIDTH || matrix[ny][nx] === null) {
                            emptyNeighbors++;
                        }
                    }
                }
                // Edge pixel: blend brightness toward 0 (lighter) based on empty neighbors
                if (emptyNeighbors > 0) {
                    const edgeFactor = emptyNeighbors / 8;
                    edgeMatrix[y][x] = matrix[y][x] * (1 - edgeFactor * 0.7);
                } else {
                    edgeMatrix[y][x] = matrix[y][x];
                }
            } else {
                edgeMatrix[y][x] = null;
            }
        }
    }

    // Update rotation (only when not dragging)
    if (!isDragging) {
        const autoRotX = rotationMatrixX(0.02);
        const autoRotY = rotationMatrixY(0);
        const autoRotZ = rotationMatrixZ(0.02);
        rotationMatrix = multiplyMatrices(autoRotX, rotationMatrix);
        rotationMatrix = multiplyMatrices(autoRotY, rotationMatrix);
        rotationMatrix = multiplyMatrices(autoRotZ, rotationMatrix);
    }

    // Convert matrix to colored HTML with ASCII characters
    let output = '';
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const brightness = edgeMatrix[y][x];
            if (brightness === null) {
                output += ' ';
            } else {
                const color = brightnessToColor(brightness);
                output += `<span style="color:${color}">█</span>`;
            }
        }
        output += '\n';
    }

    canvas.innerHTML = output;
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

// Mouse drag controls
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;

    // Apply rotations in screen space (Y for horizontal drag, X for vertical)
    const dragRotY = rotationMatrixY(-deltaX * 0.01);
    const dragRotX = rotationMatrixX(deltaY * 0.01);
    rotationMatrix = multiplyMatrices(dragRotY, rotationMatrix);
    rotationMatrix = multiplyMatrices(dragRotX, rotationMatrix);

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
});

// Set initial cursor style
canvas.style.cursor = 'grab';