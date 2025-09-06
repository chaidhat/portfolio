"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

class SimpleRenderer {
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.mouse = { x: 0, y: 0 };
    this.gridCols = 64;
    this.gridRows = 64;
    this.cellWidth = 0;
    this.cellHeight = 0;
    this.sphere = { x: 0, y: 0, radius: 80 };
    this.grid = [];
    this.isMobile = window.innerWidth < 768;
    this.animationTime = 0;
    this.causticTemplate = {};
    this.causticResolution = 128;
    
    this.setupCanvas();
    this.setupEventListeners();
    this.initGrid();
    this.loadOrPrecomputeCaustics();
    this.animate();
  }

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  mouse: { x: number; y: number };
  gridCols: number;
  gridRows: number;
  cellWidth: number;
  cellHeight: number;
  sphere: { x: number; y: number; radius: number };
  grid: { r: number; g: number; b: number; intensity: number }[][];
  isMobile: boolean;
  animationTime: number;
  causticTemplate: { [distance: string]: { r: number; g: number; b: number }[][] };
  causticResolution: number;

  setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.cellWidth = this.canvas.width / 64;
    this.cellHeight = this.canvas.height / 64;
    this.sphere.x = this.canvas.width / 2;
    this.sphere.y = this.canvas.height / 2;
  }

  setupEventListeners() {
    window.addEventListener('mousemove', (e) => {
      if (!this.isMobile) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
      }
    });

    window.addEventListener('resize', () => {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.cellWidth = this.canvas.width / 64;
      this.cellHeight = this.canvas.height / 64;
      this.sphere.x = this.canvas.width / 2;
      this.sphere.y = this.canvas.height / 2;
      this.isMobile = window.innerWidth < 768;
      this.initGrid();
    });
  }

  initGrid() {
    this.grid = [];
    
    for (let row = 0; row < 64; row++) {
      this.grid[row] = [];
      for (let col = 0; col < 64; col++) {
        this.grid[row][col] = {
          r: 0,
          g: 0,
          b: 0,
          intensity: 0
        };
      }
    }
  }

  howMuchLightIsBlocked(lightX: number, lightY: number, cellX: number, cellY: number): number {
    // Check if line from light to cell intersects with sphere
    const dx = cellX - lightX;
    const dy = cellY - lightY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return 0; // Same point
    
    // Normalize direction vector
    const dirX = dx / length;
    const dirY = dy / length;
    
    // Vector from light to sphere center
    const sphereDx = this.sphere.x - lightX;
    const sphereDy = this.sphere.y - lightY;
    
    // Project sphere center onto light ray
    const projection = sphereDx * dirX + sphereDy * dirY;
    
    // If projection is negative or beyond the cell, sphere doesn't block
    if (projection < 0 || projection > length) return 0;
    
    // Find closest point on ray to sphere center
    const closestX = lightX + dirX * projection;
    const closestY = lightY + dirY * projection;
    
    // Check distance from closest point to sphere center
    const distToSphere = Math.sqrt(
      (closestX - this.sphere.x) * (closestX - this.sphere.x) +
      (closestY - this.sphere.y) * (closestY - this.sphere.y)
    );
    
    // Smooth falloff at sphere edges
    const sphereRadius = this.sphere.radius;
    const softEdgeWidth = 15; // Pixels for soft edge
    
    if (distToSphere > sphereRadius + softEdgeWidth) {
      return 0; // No blocking
    } else if (distToSphere < sphereRadius - softEdgeWidth) {
      return 1; // Full blocking
    } else {
      // Smooth transition using smoothstep function
      const edgeDistance = distToSphere - (sphereRadius - softEdgeWidth);
      const normalizedDistance = edgeDistance / (2 * softEdgeWidth);
      const smoothed = normalizedDistance * normalizedDistance * (3 - 2 * normalizedDistance);
      return 1 - smoothed;
    }
  }

  precomputeCausticTemplate() {
    // Precompute caustics for different light distances at 0° angle (right side)
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const maxDistance = Math.max(this.canvas.width, this.canvas.height);
    
    // Store caustics for different distances
    for (let distance = this.sphere.radius + 100; distance <= maxDistance; distance += 50) {
      const lightX = centerX + distance;
      const lightY = centerY;
      const key = distance.toString();
      
      this.causticTemplate[key] = this.computeCausticMap(lightX, lightY);
    }
    
    // Save the first caustic map as PNG
    this.saveCausticMapAsPNG();
  }

  saveCausticMapAsPNG() {
    const keys = Object.keys(this.causticTemplate).sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b));
    if (keys.length === 0) return;
    
    // Calculate tile layout - arrange in a square grid
    const tilesPerSide = Math.ceil(Math.sqrt(keys.length));
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.causticResolution * tilesPerSide;
    tempCanvas.height = this.causticResolution * tilesPerSide;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    // Disable image smoothing for aliased (pixelated) result
    tempCtx.imageSmoothingEnabled = false;
    
    const fullImageData = tempCtx.createImageData(tempCanvas.width, tempCanvas.height);
    
    keys.forEach((key, index) => {
      const map = this.causticTemplate[key];
      const tileX = index % tilesPerSide;
      const tileY = Math.floor(index / tilesPerSide);
      const startX = tileX * this.causticResolution;
      const startY = tileY * this.causticResolution;
      
      for (let row = 0; row < this.causticResolution; row++) {
        for (let col = 0; col < this.causticResolution; col++) {
          const pixelX = startX + col;
          const pixelY = startY + row;
          const pixelIndex = (pixelY * tempCanvas.width + pixelX) * 4;
          const caustic = map[row][col];
          
          fullImageData.data[pixelIndex] = Math.min(255, caustic.r * 255);     // R
          fullImageData.data[pixelIndex + 1] = Math.min(255, caustic.g * 255); // G
          fullImageData.data[pixelIndex + 2] = Math.min(255, caustic.b * 255); // B
          fullImageData.data[pixelIndex + 3] = 255; // A
        }
      }
    });
    
    tempCtx.putImageData(fullImageData, 0, 0);
    
    // Save metadata as JSON
    const metadata = {
      distances: keys.map(k => Number.parseFloat(k)),
      tilesPerSide: tilesPerSide,
      tileResolution: this.causticResolution,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      sphereRadius: this.sphere.radius
    };
    
    // Download atlas PNG
    tempCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'caustic_atlas.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    });
    
    // Download metadata JSON
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const metadataUrl = URL.createObjectURL(metadataBlob);
    const metadataLink = document.createElement('a');
    metadataLink.href = metadataUrl;
    metadataLink.download = 'caustic_metadata.json';
    metadataLink.click();
    URL.revokeObjectURL(metadataUrl);
  }

  computeCausticMap(lightX: number, lightY: number) {
    const map: { r: number; g: number; b: number }[][] = [];
    const mapWidth = this.canvas.width * 2; // Capture larger area
    const mapHeight = this.canvas.height * 2;
    
    for (let row = 0; row < this.causticResolution; row++) {
      map[row] = [];
      for (let col = 0; col < this.causticResolution; col++) {
        const cellX = (mapWidth / this.causticResolution) * (col + 0.5) - mapWidth/4;
        const cellY = (mapHeight / this.causticResolution) * (row + 0.5) - mapHeight/4;
        
        map[row][col] = {
          r: this.getChromaticRefraction(lightX, lightY, cellX, cellY, 1.514),
          g: this.getChromaticRefraction(lightX, lightY, cellX, cellY, 1.520),
          b: this.getChromaticRefraction(lightX, lightY, cellX, cellY, 1.528)
        };
      }
    }
    
    return map;
  }

  getCausticValue(lightX: number, lightY: number, cellX: number, cellY: number) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Calculate light distance from sphere center
    const lightDistance = Math.sqrt((lightX - centerX) ** 2 + (lightY - centerY) ** 2);
    
    // Find nearest precomputed distance
    const distances = Object.keys(this.causticTemplate).map(k => parseFloat(k)).sort((a, b) => a - b);
    let nearestDistance = distances[0];
    for (const dist of distances) {
      if (Math.abs(dist - lightDistance) < Math.abs(nearestDistance - lightDistance)) {
        nearestDistance = dist;
      }
    }
    
    const templateKey = nearestDistance.toString();
    if (!this.causticTemplate[templateKey]) return { r: 0, g: 0, b: 0 };
    
    // Rotate cell position to align with template (0° reference)
    const lightAngle = Math.atan2(lightY - centerY, lightX - centerX);
    const cos = Math.cos(-lightAngle);
    const sin = Math.sin(-lightAngle);
    
    // Translate to sphere center, rotate, translate back to template space
    const relX = cellX - centerX;
    const relY = cellY - centerY;
    const rotatedX = relX * cos - relY * sin + centerX;
    const rotatedY = relX * sin + relY * cos + centerY;
    
    // Use the same mapping scale as the template was created with (2x larger area)
    const mapWidth = this.canvas.width * 2;
    const mapHeight = this.canvas.height * 2;
    const mapX = Math.floor(((rotatedX + mapWidth/4) / mapWidth) * this.causticResolution);
    const mapY = Math.floor(((rotatedY + mapHeight/4) / mapHeight) * this.causticResolution);
    const clampedX = Math.max(0, Math.min(this.causticResolution - 1, mapX));
    const clampedY = Math.max(0, Math.min(this.causticResolution - 1, mapY));
    
    return this.causticTemplate[templateKey][clampedY][clampedX];
  }

  getChromaticRefraction(lightX: number, lightY: number, cellX: number, cellY: number, glassIOR: number) {
    let totalRefraction = 0;
    
    // Calculate angle to light source
    const toLightAngle = Math.atan2(lightY - cellY, lightX - cellX);
    
    // Shoot rays from cell in directions that could theoretically reach light after refraction
    for (let angle = 0; angle < 360; angle += 0.5) {
      const radians = (angle * Math.PI) / 180;
      
      // Check if ray is within ±45 degrees of light source direction
      let angleDiff = Math.abs(radians - toLightAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff; // Handle wraparound
      if (angleDiff > Math.PI) continue; // Skip if outside ±45 degree cone (π/4 = 45°)
      
      const rayDx = Math.cos(radians);
      const rayDy = Math.sin(radians);
      
      // Ray-sphere intersection test from light source
      const sphereX = this.sphere.x;
      const sphereY = this.sphere.y;
      const sphereRadius = this.sphere.radius;
      
      const toSphereX = sphereX - lightX;
      const toSphereY = sphereY - lightY;
      
      const a = rayDx * rayDx + rayDy * rayDy;
      const b = 2 * (rayDx * (-toSphereX) + rayDy * (-toSphereY));
      const c = toSphereX * toSphereX + toSphereY * toSphereY - sphereRadius * sphereRadius;
      
      const discriminant = b * b - 4 * a * c;
      
      if (discriminant >= 0) {
        // Ray intersects sphere
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        
        if (t1 > 0) {
          // Entry point
          const entryX = lightX + t1 * rayDx;
          const entryY = lightY + t1 * rayDy;
          
          // Normal at entry point (pointing inward)
          const entryNormalX = (entryX - sphereX) / sphereRadius;
          const entryNormalY = (entryY - sphereY) / sphereRadius;
          
          // Refract ray entering sphere (air to glass)
          const cosTheta1 = -(rayDx * entryNormalX + rayDy * entryNormalY);
          const theta1 = Math.acos(Math.abs(cosTheta1)) * 180 / Math.PI;
          
          
          const n = 1.0 / glassIOR; // n1/n2 ratio
          const cosTheta2Sq = 1 - n * n * (1 - cosTheta1 * cosTheta1);
          
          if (cosTheta2Sq >= 0) {
            const cosTheta2 = Math.sqrt(cosTheta2Sq);
            const refractedDx = n * rayDx + (n * cosTheta1 - cosTheta2) * entryNormalX;
            const refractedDy = n * rayDy + (n * cosTheta1 - cosTheta2) * entryNormalY;
            
            // Exit point
            const exitX = lightX + t2 * rayDx;
            const exitY = lightY + t2 * rayDy;
            
            // Normal at exit point (pointing outward)
            const exitNormalX = (exitX - sphereX) / sphereRadius;
            const exitNormalY = (exitY - sphereY) / sphereRadius;
            
            // Refract ray exiting sphere (glass to air)
            const cosTheta3 = -(refractedDx * (-exitNormalX) + refractedDy * (-exitNormalY));
            const n2 = glassIOR; // n1/n2 ratio (glass to air)
            const cosTheta4Sq = 1 - n2 * n2 * (1 - cosTheta3 * cosTheta3);
            
            if (cosTheta4Sq >= 0) {
              const cosTheta4 = Math.sqrt(cosTheta4Sq);
              const finalDx = n2 * refractedDx + (n2 * cosTheta3 - cosTheta4) * (-exitNormalX);
              const finalDy = n2 * refractedDy + (n2 * cosTheta3 - cosTheta4) * (-exitNormalY);
              
              // Check if refracted ray passes near the cell
              const toCellX = cellX - exitX;
              const toCellY = cellY - exitY;
              
              // Calculate closest point on refracted ray to cell
              const rayLength = Math.sqrt(finalDx * finalDx + finalDy * finalDy);
              if (rayLength > 0) {
                const normalizedRayDx = finalDx / rayLength;
                const normalizedRayDy = finalDy / rayLength;
                
                const projectionLength = toCellX * normalizedRayDx + toCellY * normalizedRayDy;
                
                if (projectionLength > 0) {
                  const closestX = exitX + projectionLength * normalizedRayDx;
                  const closestY = exitY + projectionLength * normalizedRayDy;
                  
                  const distanceToRay = Math.sqrt(
                    (cellX - closestX) * (cellX - closestX) + 
                    (cellY - closestY) * (cellY - closestY)
                  );
                  
                  // Closer to ray = more refracted light
                  const refractionContribution = Math.max(0, 1 / (1 + distanceToRay * 0.1));
                  totalRefraction += refractionContribution;
                }
              }
            }
          }
        }
      }
    }
    
    return totalRefraction;
  }


  calculateGrid() {
    for (let row = 0; row < 64; row++) {
      for (let col = 0; col < 64; col++) {
        // Get center of grid cell
        const cellX = col * this.cellWidth + this.cellWidth / 2;
        const cellY = row * this.cellHeight + this.cellHeight / 2;
        
        // Check how much light is blocked by sphere
        const blockAmount = this.howMuchLightIsBlocked(this.mouse.x, this.mouse.y, cellX, cellY);
        
        // Calculate distance from cursor
        const dx = cellX - this.mouse.x;
        const dy = cellY - this.mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy) * 10;
        
        // Calculate brightness (inverse square law) reduced by shadow
        const baseBrightness = Math.max(0, 1 / (1 + distance * 0.001));
        const brightness = baseBrightness * (1 - blockAmount);
        const caustic = this.getCausticValue(this.mouse.x, this.mouse.y, cellX, cellY);
        this.grid[row][col].r = brightness + 0.05 * caustic.r; // Red light
        this.grid[row][col].g = brightness + 0.05 * caustic.g; // Green light  
        this.grid[row][col].b = brightness + 0.05 * caustic.b; // Blue light
      }
    }
  }

  animate() {
    this.animationTime += 0.005;
    
    // Update mouse position on mobile with circular orbit pattern
    if (this.isMobile) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      
      // Make orbit large enough to clear the sphere
      const minRadius = this.sphere.radius + 60; // Minimum distance from sphere center
      const radiusX = Math.max(minRadius, 180);
      const radiusY = Math.max(minRadius, 250);
      
      this.mouse.x = centerX + radiusX * Math.cos(this.animationTime);
      this.mouse.y = centerY + radiusY * Math.sin(this.animationTime);
    }
    
    // Clear canvas
    this.ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Calculate brightness for grid
    this.calculateGrid();
    
    // Render grid
    for (let row = 0; row < 64; row++) {
      for (let col = 0; col < 64; col++) {
        const cell = this.grid[row][col];
        
        if (cell.r > 0.001 || cell.g > 0.001 || cell.b > 0.001) {
          const cellX = col * this.cellWidth;
          const cellY = row * this.cellHeight;
          
          
          this.ctx.fillStyle = `rgba(${cell.r * 255}, ${cell.g * 255}, ${cell.b * 255}, 1)`;
          this.ctx.fillRect(cellX, cellY, this.cellWidth, this.cellHeight);
        }
      }
    }
    
    // Draw sphere
    this.ctx.fillStyle = 'rgba(0,0,0, 1)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.sphere.x, this.sphere.y, this.sphere.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw cursor
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(this.mouse.x, this.mouse.y, 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    requestAnimationFrame(() => this.animate());
  }
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      new SimpleRenderer(canvasRef.current);
    }
  }, []);

  return (
    <div className="font-sans relative">
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-[100vh] pointer-events-none z-0"
        style={{ cursor: 'none' }}
      />
      <main className="relative z-10 row-start-2 grid grid-cols-[10%_1fr]">
        <div className="grid-cols-1 h-[200vh] bg-[repeating-linear-gradient(45deg,#e5e7eb_0px,#e5e7eb_1px,transparent_1px,transparent_20px)] border-r-1 border-[#e5e7eb]">
        </div>
        <div className="font-sans grid grid-rows-[1px_1fr_20px] items-start justify-items-center min-h-screen">
          <div className="row-start-2 mt-[20%]">
            <hr className="border-white"/>
            <h2 className=" text-xl sm:text-2xl">Portfolio</h2>
            <hr className="mb-8 border-white"/>
            <hr className="border-white"/>
            <h1 className="flex text-[12vw] leading-[10vw]">Chaidhat Chaimongkol</h1>
            <h2 className="mt-16 text-xl sm:text-4xl">Computer Engineering @ UCLA</h2>
            <hr className="border-white"/>
          </div>
        </div>
      </main>
      <footer className="relative z-10 row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
      </footer>
    </div>
  );
}
