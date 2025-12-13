// Create 64x32 character matrix
const WIDTH = 64;
const HEIGHT = 32;
const matrix = [];

// Initialize matrix with 'a' characters
for (let y = 0; y < HEIGHT; y++) {
    matrix[y] = [];
    for (let x = 0; x < WIDTH; x++) {
        matrix[y][x] = 'a';
    }
}

// Get canvas element
const canvas = document.getElementById('canvas');

// Render function
function render() {
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

        // Render the matrix
        render();
    }
}

// Initial render
render();

// Start animation loop
requestAnimationFrame(animate);
