"use client";

import { useEffect, useRef } from "react";

// The rotating ASCII cube. This is a near-verbatim port of the original
// vanilla index.js: the same scanline rasteriser, backface culling, edge
// anti-aliasing and drag-momentum logic — just wrapped so it runs against a
// React ref on mount and tears its listeners down on unmount.
export default function Cube() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const WIDTH = 64;
    const HEIGHT = 32;
    const matrix: (number | null)[][] = [];
    for (let y = 0; y < HEIGHT; y++) {
      matrix[y] = [];
      for (let x = 0; x < WIDTH; x++) matrix[y][x] = null;
    }

    function brightnessToColor(brightness: number) {
      const value = Math.min(255, Math.max(0, Math.round(324 - brightness * 258)));
      const hex = value.toString(16).padStart(2, "0");
      return `#${hex}${hex}${hex}`;
    }

    const cubeVertices = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ];

    const cubeFaces = [
      [0, 3, 2, 1],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [2, 3, 7, 6],
      [0, 4, 7, 3],
      [1, 2, 6, 5],
    ];

    let rotationMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let velocityX = 0;
    let velocityY = 0;
    const friction = 0.95;

    function multiplyMatrices(a: number[], b: number[]) {
      return [
        a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
        a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
        a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
      ];
    }

    function rotationMatrixX(angle: number) {
      const c = Math.cos(angle), s = Math.sin(angle);
      return [1, 0, 0, 0, c, -s, 0, s, c];
    }
    function rotationMatrixY(angle: number) {
      const c = Math.cos(angle), s = Math.sin(angle);
      return [c, 0, s, 0, 1, 0, -s, 0, c];
    }
    function rotationMatrixZ(angle: number) {
      const c = Math.cos(angle), s = Math.sin(angle);
      return [c, -s, 0, s, c, 0, 0, 0, 1];
    }

    type Vec3 = { x: number; y: number; z: number };
    function applyMatrix(m: number[], p: Vec3): Vec3 {
      return {
        x: m[0] * p.x + m[1] * p.y + m[2] * p.z,
        y: m[3] * p.x + m[4] * p.y + m[5] * p.z,
        z: m[6] * p.x + m[7] * p.y + m[8] * p.z,
      };
    }

    function project(point: Vec3) {
      const scale = 110;
      const distance = 8;
      const factor = scale / (distance + point.z);
      return {
        x: Math.floor(point.x * factor + WIDTH / 2),
        y: Math.floor(point.y * factor * 0.5 + HEIGHT / 2),
      };
    }

    function getFaceNormal(vertices: Vec3[]) {
      const v1 = { x: vertices[1].x - vertices[0].x, y: vertices[1].y - vertices[0].y, z: vertices[1].z - vertices[0].z };
      const v2 = { x: vertices[2].x - vertices[0].x, y: vertices[2].y - vertices[0].y, z: vertices[2].z - vertices[0].z };
      const normal = {
        x: v1.y * v2.z - v1.z * v2.y,
        y: v1.z * v2.x - v1.x * v2.z,
        z: v1.x * v2.y - v1.y * v2.x,
      };
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      return { x: normal.x / length, y: normal.y / length, z: normal.z / length };
    }

    function fillPolygon(points: { x: number; y: number }[], brightness: number) {
      if (points.length < 3) return;
      let minY = HEIGHT, maxY = 0;
      for (const p of points) {
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      minY = Math.max(0, Math.floor(minY));
      maxY = Math.min(HEIGHT - 1, Math.ceil(maxY));
      for (let y = minY; y <= maxY; y++) {
        const intersections: number[] = [];
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
            for (let x = x1; x <= x2; x++) matrix[y][x] = brightness;
          }
        }
      }
    }

    function clearMatrix() {
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) matrix[y][x] = null;
      }
    }

    function render() {
      clearMatrix();

      const rotatedVertices = cubeVertices.map((v) =>
        applyMatrix(rotationMatrix, { x: v[0], y: v[1], z: v[2] }),
      );

      const faces = cubeFaces
        .map((faceIndices) => {
          const faceVertices = faceIndices.map((idx) => rotatedVertices[idx]);
          const normal = getFaceNormal(faceVertices);
          const projected = faceVertices.map((v) => project(v));
          const avgZ = faceVertices.reduce((sum, v) => sum + v.z, 0) / faceVertices.length;
          if (normal.z >= 0) return null;
          let brightness = Math.abs(normal.z);
          brightness = brightness ** 0.7;
          return { projected, brightness, avgZ };
        })
        .filter((face): face is { projected: { x: number; y: number }[]; brightness: number; avgZ: number } => face !== null);

      faces.sort((a, b) => b.avgZ - a.avgZ);
      for (const face of faces) fillPolygon(face.projected, face.brightness);

      const edgeMatrix: (number | null)[][] = [];
      for (let y = 0; y < HEIGHT; y++) {
        edgeMatrix[y] = [];
        for (let x = 0; x < WIDTH; x++) {
          if (matrix[y][x] !== null) {
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
            if (emptyNeighbors > 0) {
              const edgeFactor = emptyNeighbors / 8;
              edgeMatrix[y][x] = (matrix[y][x] as number) * (1 - edgeFactor * 0.7);
            } else {
              edgeMatrix[y][x] = matrix[y][x];
            }
          } else {
            edgeMatrix[y][x] = null;
          }
        }
      }

      if (!isDragging) {
        velocityX *= friction;
        velocityY *= friction;
        rotationMatrix = multiplyMatrices(rotationMatrixY(-velocityX), rotationMatrix);
        rotationMatrix = multiplyMatrices(rotationMatrixX(velocityY), rotationMatrix);
        rotationMatrix = multiplyMatrices(rotationMatrixX(0.02), rotationMatrix);
        rotationMatrix = multiplyMatrices(rotationMatrixZ(0.02), rotationMatrix);
      }

      let output = "";
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          const brightness = edgeMatrix[y][x];
          if (brightness === null) {
            output += " ";
          } else {
            output += `<span style="color:${brightnessToColor(brightness)}">█</span>`;
          }
        }
        output += "\n";
      }
      canvas!.innerHTML = output;
    }

    let rafId = 0;
    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    function animate(currentTime: number) {
      rafId = requestAnimationFrame(animate);
      const deltaTime = currentTime - lastTime;
      if (deltaTime >= frameInterval) {
        lastTime = currentTime - (deltaTime % frameInterval);
        render();
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      canvas.style.cursor = "grabbing";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      velocityX = deltaX * 0.01;
      velocityY = deltaY * 0.01;
      rotationMatrix = multiplyMatrices(rotationMatrixY(-velocityX), rotationMatrix);
      rotationMatrix = multiplyMatrices(rotationMatrixX(velocityY), rotationMatrix);
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };
    const onMouseUp = () => {
      isDragging = false;
      canvas.style.cursor = "grab";
    };

    canvas.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    canvas.style.cursor = "grab";

    render();
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return <div id="canvas" ref={canvasRef} />;
}
