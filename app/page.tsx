"use client";

import { useRef, useEffect, useState } from "react";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [redCoeff, setRedCoeff] = useState(1);
  const [greenCoeff, setGreenCoeff] = useState(1);
  const [blueCoeff, setBlueCoeff] = useState(1);
  const [yIntercept, setYIntercept] = useState(1000);

  // Simple Perlin noise implementation
  const noise = (() => {
    const p = new Array(512);
    const permutation = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];

    for (let i = 0; i < 256; i++) {
      p[256 + i] = p[i] = permutation[i];
    }

    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (t: number, a: number, b: number) => a + t * (b - a);
    const grad = (hash: number, x: number, y: number) => {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };

    return (x: number, y: number) => {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      x -= Math.floor(x);
      y -= Math.floor(y);
      const u = fade(x);
      const v = fade(y);
      const A = p[X] + Y;
      const AA = p[A];
      const AB = p[A + 1];
      const B = p[X + 1] + Y;
      const BA = p[B];
      const BB = p[B + 1];

      return lerp(v, lerp(u, grad(p[AA], x, y), grad(p[BA], x - 1, y)),
        lerp(u, grad(p[AB], x, y - 1), grad(p[BB], x - 1, y - 1)));
    };
  })();

  const kelvinToRGB = (kelvin: number) => {
    const temp = kelvin / 100;
    let red, green, blue;

    // Red component
    if (temp <= 66) {
      red = 255;
    } else {
      red = temp - 60;
      red = 329.698727446 * Math.pow(red, -0.1332047592);
      red = Math.max(0, Math.min(255, red));
    }

    // Green component
    if (temp <= 66) {
      green = temp;
      green = 99.4708025861 * Math.log(green) - 161.1195681661;
    } else {
      green = temp - 60;
      green = 288.1221695283 * Math.pow(green, -0.0755148492);
    }
    green = Math.max(0, Math.min(255, green));

    // Blue component
    if (temp >= 66) {
      blue = 255;
    } else if (temp <= 19) {
      blue = 0;
    } else {
      blue = temp - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
      blue = Math.max(0, Math.min(255, blue));
    }

    return { r: Math.round(red), g: Math.round(green), b: Math.round(blue) };
  };

  // Animate sliders
  useEffect(() => {
    const interval = setInterval(() => {
      setRedCoeff(prev => {
        const change = (Math.random() - 0.5) * 0.01; // Random direction, 0.05 magnitude
        return Math.max(0.5, Math.min(1.5, prev + change));
      });
      setGreenCoeff(prev => {
        const change = (Math.random() - 0.5) * 0.01;
        return Math.max(0.5, Math.min(1.5, prev + change));
      });
      setBlueCoeff(prev => {
        const change = (Math.random() - 0.5) * 0.01;
        return Math.max(0.5, Math.min(1.5, prev + change));
      });
      setYIntercept(prev => {
        const change = (Math.random() - 0.5) * 200; // Random direction, 100 magnitude
        return Math.max(500, Math.min(3000, prev + change));
      });
    }, 1000 / 10); // 1/15th of a second

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Create image data for pixel manipulation
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;

      // Render temperature with radial gradient from bottom left to top right
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const index = (y * canvas.width + x) * 4;

          // Calculate distance from bottom left corner (0, canvas.height) to current pixel
          const dx = x;
          const dy = canvas.height - y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Calculate maximum possible distance (bottom left to top right)
          const maxDistance = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);

          // Normalize distance to 0-1 range
          const normalizedDistance = distance / maxDistance;

          // Apply smoothstep function for smoother gradient
          const smoothed = normalizedDistance * normalizedDistance * (3 - 2 * normalizedDistance);

          // Add random noise per pixel
          const randomNoise = (Math.random() - 0.5) * 2; // Random value between -1 and 1
          const noiseIntensity = 0.1; // How much noise affects the gradient

          // Combine gradient with noise
          const factor = smoothed + (randomNoise * noiseIntensity);
          const clampedFactor = Math.max(0, Math.min(1, factor));

          // Map to temperature range using y-intercept
          const kelvin = yIntercept + (clampedFactor * 7000);

          // Get RGB from temperature
          const color = kelvinToRGB(kelvin);

          // Apply RGB coefficients
          data[index] = Math.min(255, color.r * redCoeff);     // Red component
          data[index + 1] = Math.min(255, color.g * greenCoeff); // Green component
          data[index + 2] = Math.min(255, color.b * blueCoeff); // Blue component
          data[index + 3] = 255;     // Alpha (fully opaque)
        }
      }

      // Put the image data onto the canvas
      ctx.putImageData(imageData, 0, 0);
    }
  }, [redCoeff, greenCoeff, blueCoeff, yIntercept]);

  return (
    <div className="font-sans relative">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-[100vh] pointer-events-none z-0"
        style={{ cursor: 'none' }}
      />


      <main className="relative z-10 row-start-2 grid grid-cols-[10%_1fr]">
        <div className="grid-cols-1 h-[200vh] bg-[repeating-linear-gradient(45deg,#000000_0px,#000000_1px,transparent_1px,transparent_20px)] border-r-1 border-[#000000]">
        </div>
        <div className="font-sans grid grid-rows-[1px_1fr_20px] items-start justify-items-start min-h-screen">
          <div className="row-start-2 mt-[5%] ml-4 text-black">
            <h2 className="text-md">Portfolio</h2>
            <h1 className="text-4xl pr-8">Chaidhat Chaimongkol</h1>
            <h2 className="mt-8  text-xl">Computer Engineering @ UCLA</h2>
            <a href="https://github.com/chaidhat" className="block mt-16 text-xl underline">My Projects</a>
            <a href="https://www.linkedin.com/in/chaidhat/" className="block mt-4  text-xl underline">LinkedIn</a>
            <a href="mailto:chaimongkol@ucla.edu" className="block mt-4  text-xl underline">Email</a>
          </div>
        </div>
      </main>
      <footer className="relative z-10 row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
      </footer>
      <div className="fixed bottom-4 right-4 z-20">
        <h2 className="text-sm sm:text-base text-white">A simulation of caustic effect of a glass ball. Move your cursor or touch the screen to interact.</h2>
      </div>
    </div>
  );
}
