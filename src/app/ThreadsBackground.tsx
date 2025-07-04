"use client";
import React, { useRef, useEffect } from "react";

// Very soft purple palette for subtle background
const THREAD_COLORS = [
  "#f3f0ff",
  "#e9e5ff", 
  "#e0d7fa",
  "#d6c7f5",
  "#cbb8f0",
  "#c1a9eb",
  "#b79ae6"
];

const THREADS = 12; // Fewer threads for subtlety
const POINTS = 24; // Fewer points for smoother curves
const SPEED = 0.02; // Very slow movement
const AMPLITUDE = 408; // Smaller amplitude for subtlety
const THICKNESS = 0.8; // Thinner lines

export const ThreadsBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    function resize() {
      if (!canvas) return;
      if (!ctx) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    window.addEventListener("resize", resize);

    let t = 0;
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      
      for (let i = 0; i < THREADS; i++) {
        const color = THREAD_COLORS[i % THREAD_COLORS.length];
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.15 * Math.sin(i + t * 0.1); // Very subtle opacity
        ctx.strokeStyle = color;
        ctx.lineWidth = THICKNESS + 0.3 * Math.sin(i + t * 0.2);
        ctx.beginPath();
        
        for (let j = 0; j <= POINTS; j++) {
          const x = (j / POINTS) * width;
          const phase = t * SPEED + i * 0.3 + j * 0.12;
          const y =
            height / 2 +
            (height / 3) * Math.sin((i / THREADS) * Math.PI * 2 + 0.1 * t) * 0.05 +
            Math.sin(phase) * AMPLITUDE * (0.4 + 0.3 * Math.sin(i + t * 0.08));
          
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
      t += 0.05; // Much smaller increment for slower movement
      animationRef.current = requestAnimationFrame(draw);
    }
    draw();
    
    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none select-none"
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        userSelect: "none",
        background: "#fafaff"
      }}
    />
  );
}; 