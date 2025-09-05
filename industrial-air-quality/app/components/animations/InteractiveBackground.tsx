'use client';

import React, { useRef, useEffect, useCallback } from 'react';

// ==========================================
// ENTERPRISE-GRADE TYPE DEFINITIONS
// ==========================================

interface InteractiveBackgroundProps {
  readonly mouseX: number;
  readonly mouseY: number;
  readonly reduceMotion?: boolean;
  readonly quality?: 'low' | 'medium' | 'high' | 'ultra';
  readonly colorScheme?: 'aurora' | 'quantum' | 'nebula' | 'cyber';
  readonly intensity?: number;
}

interface ColorScheme {
  readonly primary: [number, number, number];
  readonly secondary: [number, number, number];
  readonly tertiary: [number, number, number];
  readonly ambient: [number, number, number];
}

interface PerformanceConfig {
  readonly resolution: number;
  readonly updateFrequency: number;
  readonly noiseDetail: number;
  readonly waveComplexity: number;
  readonly enableAdvancedEffects: boolean;
  readonly enableDistortion: boolean;
  readonly maxComputeIterations: number;
}

interface NoiseState {
  time: number;
  mouseInfluence: number;
  wavePhase: number;
  colorShift: number;
  distortionField: Float32Array;
  gradientCache: Map<string, CanvasGradient>;
}

// ==========================================
// PERFORMANCE-OPTIMIZED CONFIGURATIONS
// ==========================================

const QUALITY_CONFIGS: Record<string, PerformanceConfig> = {
  low: {
    resolution: 0.5,
    updateFrequency: 30,
    noiseDetail: 4,
    waveComplexity: 2,
    enableAdvancedEffects: false,
    enableDistortion: false,
    maxComputeIterations: 50
  },
  medium: {
    resolution: 0.75,
    updateFrequency: 60,
    noiseDetail: 6,
    waveComplexity: 4,
    enableAdvancedEffects: true,
    enableDistortion: false,
    maxComputeIterations: 100
  },
  high: {
    resolution: 1,
    updateFrequency: 120,
    noiseDetail: 8,
    waveComplexity: 6,
    enableAdvancedEffects: true,
    enableDistortion: true,
    maxComputeIterations: 200
  },
  ultra: {
    resolution: 1.25,
    updateFrequency: 144,
    noiseDetail: 12,
    waveComplexity: 8,
    enableAdvancedEffects: true,
    enableDistortion: true,
    maxComputeIterations: 300
  }
} as const;

// ==========================================
// ADVANCED COLOR SCHEME DEFINITIONS
// ==========================================

const COLOR_SCHEMES: Record<string, ColorScheme> = {
  aurora: {
    primary: [108, 92, 231],
    secondary: [0, 212, 170],
    tertiary: [168, 85, 247],
    ambient: [10, 10, 15]
  },
  quantum: {
    primary: [0, 212, 170],
    secondary: [108, 92, 231],
    tertiary: [236, 72, 153],
    ambient: [5, 5, 8]
  },
  nebula: {
    primary: [236, 72, 153],
    secondary: [168, 85, 247],
    tertiary: [108, 92, 231],
    ambient: [15, 5, 26]
  },
  cyber: {
    primary: [0, 255, 136],
    secondary: [0, 136, 255],
    tertiary: [255, 0, 136],
    ambient: [10, 0, 21]
  }
} as const;

// ==========================================
// HIGH-PERFORMANCE NOISE GENERATION
// ==========================================

class AdvancedNoiseGenerator {
  private readonly permutation: number[];
  private readonly gradients: number[];
  
  constructor() {
    // Initialize Perlin noise permutation table with cryptographic randomness
    this.permutation = new Array(512);
    this.gradients = new Array(512 * 3);
    
    const p = new Uint8Array(256);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const randomArray = new Uint8Array(256);
      crypto.getRandomValues(randomArray);
      for (let i = 0; i < 256; i++) {
        p[i] = randomArray[i]!;
      }
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < 256; i++) {
        p[i] = Math.floor(Math.random() * 256);
      }
    }
    
    // Duplicate permutation table for seamless wrapping
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = p[i]!;
      this.permutation[i + 256] = p[i]!;
      
      // Pre-generate gradient vectors for optimal performance
      const theta = (p[i]! / 255) * 2 * Math.PI;
      const phi = ((p[(i + 1) % 256]!) / 255) * Math.PI;
      
      this.gradients[i * 3] = Math.sin(phi) * Math.cos(theta);
      this.gradients[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
      this.gradients[i * 3 + 2] = Math.cos(phi);
    }
  }
  
  private fade(t: number): number {
    // Improved fade function for smoother interpolation
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }
  
  private dot(g: number, x: number, y: number, z: number): number {
    const gi = g * 3;
    const gx = this.gradients[gi] ?? 0;
    const gy = this.gradients[gi + 1] ?? 0;
    const gz = this.gradients[gi + 2] ?? 0;
    return gx * x + gy * y + gz * z;
  }
  
  public noise3D(x: number, y: number, z: number): number {
    // Find grid cell coordinates
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    // Find relative coordinates within cell
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    // Compute fade curves
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    
    // Hash coordinates of 8 cube corners with bounds checking
    const A = (this.permutation[X] ?? 0) + Y;
    const AA = (this.permutation[A] ?? 0) + Z;
    const AB = (this.permutation[A + 1] ?? 0) + Z;
    const B = (this.permutation[X + 1] ?? 0) + Y;
    const BA = (this.permutation[B] ?? 0) + Z;
    const BB = (this.permutation[B + 1] ?? 0) + Z;
    
    // Interpolate along all axes
    return this.lerp(w,
      this.lerp(v,
        this.lerp(u,
          this.dot(this.permutation[AA] ?? 0, x, y, z),
          this.dot(this.permutation[BA] ?? 0, x - 1, y, z)
        ),
        this.lerp(u,
          this.dot(this.permutation[AB] ?? 0, x, y - 1, z),
          this.dot(this.permutation[BB] ?? 0, x - 1, y - 1, z)
        )
      ),
      this.lerp(v,
        this.lerp(u,
          this.dot(this.permutation[AA + 1] ?? 0, x, y, z - 1),
          this.dot(this.permutation[BA + 1] ?? 0, x - 1, y, z - 1)
        ),
        this.lerp(u,
          this.dot(this.permutation[AB + 1] ?? 0, x, y - 1, z - 1),
          this.dot(this.permutation[BB + 1] ?? 0, x - 1, y - 1, z - 1)
        )
      )
    );
  }
  
  public fractalNoise(x: number, y: number, z: number, octaves: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value / maxValue;
  }
}

// ==========================================
// ADVANCED RENDERING ENGINE
// ==========================================

class QuantumRenderingEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly noiseGenerator: AdvancedNoiseGenerator;
  private readonly state: NoiseState;
  private readonly offscreenCanvas: HTMLCanvasElement;
  private readonly offscreenCtx: CanvasRenderingContext2D;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      colorSpace: 'srgb'
    });
    
    if (!ctx) {
      throw new Error('Failed to acquire 2D rendering context');
    }
    
    this.ctx = ctx;
    this.noiseGenerator = new AdvancedNoiseGenerator();
    
    // Create offscreen canvas for double buffering
    this.offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = this.offscreenCanvas.getContext('2d');
    if (!offscreenCtx) {
      throw new Error('Failed to create offscreen rendering context');
    }
    this.offscreenCtx = offscreenCtx;
    
    // Initialize rendering state
    this.state = {
      time: 0,
      mouseInfluence: 0,
      wavePhase: 0,
      colorShift: 0,
      distortionField: new Float32Array(0),
      gradientCache: new Map()
    };
  }
  
  public resize(width: number, height: number, pixelRatio: number): void {
    const scaledWidth = width * pixelRatio;
    const scaledHeight = height * pixelRatio;
    
    this.canvas.width = scaledWidth;
    this.canvas.height = scaledHeight;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    this.offscreenCanvas.width = scaledWidth;
    this.offscreenCanvas.height = scaledHeight;
    
    this.ctx.scale(pixelRatio, pixelRatio);
    this.offscreenCtx.scale(pixelRatio, pixelRatio);
    
    // Initialize distortion field
    const fieldSize = Math.ceil(scaledWidth * scaledHeight / 16);
    this.state.distortionField = new Float32Array(fieldSize);
    
    // Clear gradient cache on resize
    this.state.gradientCache.clear();
  }
  
  public render(
    mouseX: number,
    mouseY: number,
    colors: ColorScheme,
    config: PerformanceConfig,
    intensity: number,
    deltaTime: number
  ): void {
    const { width, height } = this.canvas;
    const ctx = this.offscreenCtx;
    
    // Update temporal state
    this.state.time += deltaTime * 0.001;
    this.state.wavePhase += deltaTime * 0.002;
    this.state.colorShift += deltaTime * 0.0005;
    
    // Calculate mouse influence with smooth falloff
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const mouseDistance = Math.sqrt(
      Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2)
    );
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    this.state.mouseInfluence = 1 - Math.min(mouseDistance / maxDistance, 1);
    
    // Clear canvas with ambient background
    const [ar, ag, ab] = colors.ambient;
    ctx.fillStyle = `rgb(${ar}, ${ag}, ${ab})`;
    ctx.fillRect(0, 0, width, height);
    
    // Render layered effects
    this.renderFlowField(ctx, colors, config, intensity, mouseX, mouseY);
    this.renderWaveDistortion(ctx, colors, config, intensity);
    this.renderColorGradients(ctx, colors, intensity);
    
    if (config.enableAdvancedEffects) {
      this.renderQuantumParticles(ctx, colors, intensity, mouseX, mouseY);
      this.renderEnergyStreaks(ctx, colors, intensity);
    }
    
    // Copy to main canvas
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }
  
  private renderFlowField(
    ctx: CanvasRenderingContext2D,
    colors: ColorScheme,
    config: PerformanceConfig,
    intensity: number,
    mouseX: number,
    mouseY: number
  ): void {
    const { width, height } = ctx.canvas;
    const resolution = Math.max(1, Math.floor(20 / config.resolution));
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3 * intensity;
    
    for (let x = 0; x < width; x += resolution) {
      for (let y = 0; y < height; y += resolution) {
        const noiseX = x * 0.01;
        const noiseY = y * 0.01;
        const noiseZ = this.state.time * 0.5;
        
        const noise = this.noiseGenerator.fractalNoise(noiseX, noiseY, noiseZ, config.noiseDetail);
        const angle = noise * Math.PI * 2 + this.state.wavePhase;
        
        // Mouse interaction
        const dx = mouseX - x;
        const dy = mouseY - y;
        const mouseDistance = Math.sqrt(dx * dx + dy * dy);
        const mouseInfluence = Math.exp(-mouseDistance / 200) * this.state.mouseInfluence;
        
        const finalAngle = angle + mouseInfluence * Math.PI * 0.5;
        const magnitude = (noise * 0.5 + 0.5) * 20 * (1 + mouseInfluence);
        
        const endX = x + Math.cos(finalAngle) * magnitude;
        const endY = y + Math.sin(finalAngle) * magnitude;
        
        // Dynamic color based on noise and mouse proximity
        const colorMix = (noise + 1) * 0.5;
        const [r1, g1, b1] = colors.primary;
        const [r2, g2, b2] = colors.secondary;
        
        const r = Math.floor(r1 + (r2 - r1) * colorMix + mouseInfluence * 50);
        const g = Math.floor(g1 + (g2 - g1) * colorMix + mouseInfluence * 50);
        const b = Math.floor(b1 + (b2 - b1) * colorMix + mouseInfluence * 50);
        
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = 1 + mouseInfluence * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
  
  private renderWaveDistortion(
    ctx: CanvasRenderingContext2D,
    colors: ColorScheme,
    config: PerformanceConfig,
    intensity: number
  ): void {
    const { width, height } = ctx.canvas;
    
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.4 * intensity;
    
    // Create dynamic wave gradients
    for (let i = 0; i < config.waveComplexity; i++) {
      const phase = this.state.wavePhase + i * Math.PI / 3;
      const amplitude = height * 0.1 * (1 + Math.sin(this.state.time * 2 + i) * 0.3);
      
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      const [r, g, b] = i % 2 === 0 ? colors.secondary : colors.tertiary;
      
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.3)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5);
      
      for (let x = 0; x <= width; x += 10) {
        const y = height * 0.5 + Math.sin(x * 0.01 + phase) * amplitude;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  private renderColorGradients(
    ctx: CanvasRenderingContext2D,
    colors: ColorScheme,
    intensity: number
  ): void {
    const { width, height } = ctx.canvas;
    
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.6 * intensity;
    
    // Dynamic radial gradients
    const centerX = width * (0.3 + 0.4 * Math.sin(this.state.time));
    const centerY = height * (0.3 + 0.4 * Math.cos(this.state.time * 0.7));
    const radius = Math.max(width, height) * (0.8 + 0.3 * Math.sin(this.state.time * 1.3));
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    
    const [r1, g1, b1] = colors.primary;
    const [r2, g2, b2] = colors.secondary;
    const [r3, g3, b3] = colors.tertiary;
    
    gradient.addColorStop(0, `rgba(${r1}, ${g1}, ${b1}, 0.8)`);
    gradient.addColorStop(0.4, `rgba(${r2}, ${g2}, ${b2}, 0.4)`);
    gradient.addColorStop(0.8, `rgba(${r3}, ${g3}, ${b3}, 0.2)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.restore();
  }
  
  private renderQuantumParticles(
    ctx: CanvasRenderingContext2D,
    colors: ColorScheme,
    intensity: number,
    mouseX: number,
    mouseY: number
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    const particleCount = Math.floor(50 * intensity);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + this.state.time * 2;
      const radius = 100 + Math.sin(this.state.time * 3 + i) * 50;
      const x = mouseX + Math.cos(angle) * radius;
      const y = mouseY + Math.sin(angle) * radius;
      
      const size = Math.max(0.5, 2 + Math.sin(this.state.time * 5 + i) * 1);
      const [r, g, b] = colors.tertiary;
      const alpha = 0.7 * intensity * (0.5 + 0.5 * Math.sin(this.state.time * 4 + i));
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow effect
      const glowRadius = Math.max(0.1, size * 3);
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  private renderEnergyStreaks(
    ctx: CanvasRenderingContext2D,
    colors: ColorScheme,
    intensity: number
  ): void {
    const { width, height } = ctx.canvas;
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3 * intensity;
    
    const streakCount = Math.floor(5 * intensity);
    
    for (let i = 0; i < streakCount; i++) {
      const progress = (this.state.time * 0.5 + i * 0.7) % 1;
      const x = width * progress;
      const y = height * (0.2 + 0.6 * Math.sin(progress * Math.PI * 4 + i));
      
      const [r, g, b] = i % 2 === 0 ? colors.primary : colors.secondary;
      
      const gradient = ctx.createLinearGradient(x - 50, y, x + 50, y);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.8)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 50, y - 2, 100, 4);
    }
    
    ctx.restore();
  }
}

// ==========================================
// MAIN INTERACTIVE BACKGROUND COMPONENT
// ==========================================

export const InteractiveBackground: React.FC<InteractiveBackgroundProps> = ({
  mouseX,
  mouseY,
  reduceMotion = false,
  quality = 'medium',
  colorScheme = 'quantum',
  intensity = 1.0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<QuantumRenderingEngine | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  
  // Ensure we have valid config and colors with strict type safety
  const getConfig = (qualityKey: string): PerformanceConfig => {
    return QUALITY_CONFIGS[qualityKey] ?? QUALITY_CONFIGS.medium!;
  };
  
  const getColors = (schemeKey: string): ColorScheme => {
    return COLOR_SCHEMES[schemeKey] ?? COLOR_SCHEMES.quantum!;
  };
  
  const config: PerformanceConfig = getConfig(quality);
  const colors: ColorScheme = getColors(colorScheme);
  const targetFPS = reduceMotion ? 30 : config.updateFrequency;
  const frameInterval = 1000 / targetFPS;

  // ==========================================
  // ADVANCED INITIALIZATION
  // ==========================================
  
  const initializeEngine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;
    
    try {
      engineRef.current = new QuantumRenderingEngine(canvas);
    } catch (error) {
      console.error('Failed to initialize rendering engine:', error);
    }
  }, []);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const engine = engineRef.current;
    if (!container || !engine) return;
    
    const rect = container.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio * config.resolution;
    
    engine.resize(rect.width, rect.height, pixelRatio);
  }, [config.resolution]);

  // ==========================================
  // HIGH-PERFORMANCE ANIMATION LOOP
  // ==========================================
  
  const animate = useCallback((currentTime: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    // FPS throttling for optimal performance
    if (currentTime - lastTimeRef.current < frameInterval) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;
    
    // Calculate FPS for debugging
    fpsRef.current = 1000 / deltaTime;
    
    // Render frame
    try {
      engine.render(mouseX, mouseY, colors, config, intensity, deltaTime);
    } catch (error) {
      console.error('Rendering error:', error);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [mouseX, mouseY, colors, config, intensity, frameInterval]);

  // ==========================================
  // LIFECYCLE MANAGEMENT
  // ==========================================
  
  useEffect(() => {
    initializeEngine();
    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Start animation loop
    if (!reduceMotion) {
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
      engineRef.current = null;
    };
  }, [initializeEngine, resizeCanvas, animate, reduceMotion]);

  // Restart animation when reduceMotion changes
  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (!reduceMotion && engineRef.current) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [reduceMotion, animate]);

  // ==========================================
  // RENDER COMPONENT
  // ==========================================
  
  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: -2,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          filter: reduceMotion ? 'none' : 'contrast(1.1) saturate(1.1)',
          transition: 'filter 0.3s ease'
        }}
      />
    </div>
  );
};

export type { InteractiveBackgroundProps };