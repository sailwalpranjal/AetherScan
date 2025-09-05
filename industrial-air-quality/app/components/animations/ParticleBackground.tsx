'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';

// ==========================================
// PRODUCTION-GRADE TYPE DEFINITIONS
// ==========================================

interface ParticleState {
  readonly id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
  energy: number;
  trail: ReadonlyArray<TrailPoint>;
}

interface TrailPoint {
  readonly x: number;
  readonly y: number;
  opacity: number;
}

interface ParticleBackgroundProps {
  readonly particleCount?: number;
  readonly connectionDistance?: number;
  readonly particleSpeed?: number;
  readonly colors?: ReadonlyArray<string>;
  readonly className?: string;
  readonly enableTrails?: boolean;
  readonly maxFPS?: number;
  readonly qualityMultiplier?: number;
}

interface AnimationMetrics {
  lastFrameTime: number;
  frameCount: number;
  avgFPS: number;
  isRunning: boolean;
}

interface PerformanceProfiler {
  renderTime: number;
  particleUpdateTime: number;
  connectionRenderTime: number;
  totalFrameTime: number;
}

// ==========================================
// ENTERPRISE-GRADE CONSTANTS
// ==========================================

const PRODUCTION_CONFIG = Object.freeze({
  DEFAULT_PARTICLE_COUNT: 50,
  DEFAULT_CONNECTION_DISTANCE: 100,
  DEFAULT_PARTICLE_SPEED: 0.5,
  DEFAULT_MAX_FPS: 60,
  DEFAULT_QUALITY_MULTIPLIER: 1.0,
  MOUSE_INFLUENCE_RADIUS: 100,
  PARTICLE_FRICTION: 0.99,
  CONNECTION_OPACITY_BASE: 0.5,
  BOUNCE_DAMPING: 0.8,
  TRAIL_LENGTH: 5,
  MIN_PARTICLE_SIZE: 0.5,
  MAX_PARTICLE_SIZE: 3,
  PERFORMANCE_THRESHOLD: 1000,
  ENERGY_DECAY_RATE: 0.001,
  MOUSE_FORCE_MULTIPLIER: 0.02,
} as const);

const DEFAULT_COLOR_PALETTE: ReadonlyArray<string> = Object.freeze([
  'rgba(0, 212, 170, 0.6)',
  'rgba(108, 92, 231, 0.4)', 
  'rgba(255, 255, 255, 0.3)',
  'rgba(64, 224, 208, 0.5)',
  'rgba(147, 112, 219, 0.4)'
]);

// ==========================================
// ADVANCED MATHEMATICAL UTILITIES
// ==========================================

const MathUtilities = Object.freeze({
  clamp: (value: number, min: number, max: number): number => 
    Math.max(min, Math.min(max, value)),

  lerp: (start: number, end: number, factor: number): number => 
    start + (end - start) * factor,

  smoothstep: (min: number, max: number, value: number): number => {
    const x = MathUtilities.clamp((value - min) / (max - min), 0, 1);
    return x * x * (3 - 2 * x);
  },

  distance: (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  },

  fastDistance: (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return dx + dy - 0.4 * Math.min(dx, dy);
  },

  normalizeVector: (x: number, y: number): { x: number; y: number; length: number } => {
    const length = Math.sqrt(x * x + y * y);
    return length > 0 ? { x: x / length, y: y / length, length } : { x: 0, y: 0, length: 0 };
  },

  generateUUID: (): string => `p_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
});

// ==========================================
// PRODUCTION COLOR MANAGEMENT SYSTEM
// ==========================================

class ProductionColorManager {
  private readonly colorPalette: ReadonlyArray<string>;
  private readonly colorCache = new Map<string, string>();
  
  constructor(colors: ReadonlyArray<string>) {
    this.colorPalette = colors.length > 0 ? colors : DEFAULT_COLOR_PALETTE;
  }

  getRandomColor(): string {
    if (this.colorPalette.length === 0) {
      return DEFAULT_COLOR_PALETTE[0] as string;
    }
    
    const index = Math.floor(Math.random() * this.colorPalette.length);
    const color = this.colorPalette[index];
    
    // Type-safe access with guaranteed fallback
    return color ?? DEFAULT_COLOR_PALETTE[0] as string;
  }

  getInterpolatedColor(factor: number): string {
    const normalizedFactor = MathUtilities.clamp(factor, 0, 1);
    const cacheKey = `interp_${normalizedFactor.toFixed(3)}`;
    
    const cachedColor = this.colorCache.get(cacheKey);
    if (cachedColor) {
      return cachedColor;
    }

    const index = normalizedFactor * (this.colorPalette.length - 1);
    const baseIndex = Math.floor(index);
    const nextIndex = Math.min(baseIndex + 1, this.colorPalette.length - 1);
    
    const baseColor = this.colorPalette[baseIndex] ?? DEFAULT_COLOR_PALETTE[0] as string;
    const nextColor = this.colorPalette[nextIndex] ?? DEFAULT_COLOR_PALETTE[0] as string;
    
    const result = normalizedFactor < 0.5 ? baseColor : nextColor;
    this.colorCache.set(cacheKey, result);
    
    return result;
  }

  clearCache(): void {
    this.colorCache.clear();
  }
}

// ==========================================
// HIGH-PERFORMANCE PHYSICS ENGINE
// ==========================================

class AdvancedParticlePhysicsEngine {
  private readonly config = PRODUCTION_CONFIG;

  updateParticle(
    particle: ParticleState, 
    mousePos: { x: number; y: number }, 
    bounds: { width: number; height: number },
    deltaTime: number
  ): void {
    const timeMultiplier = deltaTime / 16.667; // Normalize to 60fps baseline

    // Time-compensated position updates
    particle.x += particle.vx * timeMultiplier;
    particle.y += particle.vy * timeMultiplier;
    particle.life++;

    // Advanced boundary collision with energy conservation
    this.processBoundaryCollisions(particle, bounds);

    // Sophisticated mouse interaction with energy transfer
    this.applyMouseForces(particle, mousePos, timeMultiplier);

    // Apply realistic physics forces
    this.updatePhysicalProperties(particle, timeMultiplier);

    // Update visual characteristics
    this.updateVisualProperties(particle);

    // Maintain particle trail system
    this.updateTrailSystem(particle);
  }

  private processBoundaryCollisions(particle: ParticleState, bounds: { width: number; height: number }): void {
    const { width, height } = bounds;
    const margin = particle.size;

    if (particle.x <= margin || particle.x >= width - margin) {
      particle.vx *= -this.config.BOUNCE_DAMPING;
      particle.x = MathUtilities.clamp(particle.x, margin, width - margin);
      particle.energy *= 0.95;
    }

    if (particle.y <= margin || particle.y >= height - margin) {
      particle.vy *= -this.config.BOUNCE_DAMPING;
      particle.y = MathUtilities.clamp(particle.y, margin, height - margin);
      particle.energy *= 0.95;
    }
  }

  private applyMouseForces(
    particle: ParticleState, 
    mousePos: { x: number; y: number }, 
    timeMultiplier: number
  ): void {
    const distance = MathUtilities.distance(particle.x, particle.y, mousePos.x, mousePos.y);
    
    if (distance < this.config.MOUSE_INFLUENCE_RADIUS && distance > 0) {
      const influence = MathUtilities.smoothstep(this.config.MOUSE_INFLUENCE_RADIUS, 0, distance);
      const force = influence * this.config.MOUSE_FORCE_MULTIPLIER * timeMultiplier;
      
      const normalized = MathUtilities.normalizeVector(
        particle.x - mousePos.x, 
        particle.y - mousePos.y
      );

      particle.vx += normalized.x * force;
      particle.vy += normalized.y * force;
      particle.energy = Math.min(particle.energy + influence * 0.1, 2.0);
    }
  }

  private updatePhysicalProperties(particle: ParticleState, timeMultiplier: number): void {
    const frictionFactor = Math.pow(this.config.PARTICLE_FRICTION, timeMultiplier);
    particle.vx *= frictionFactor;
    particle.vy *= frictionFactor;

    const energyMultiplier = MathUtilities.lerp(0.8, 1.2, particle.energy / 2.0);
    particle.vx *= energyMultiplier;
    particle.vy *= energyMultiplier;

    particle.energy = Math.max(0, particle.energy - this.config.ENERGY_DECAY_RATE * timeMultiplier);
  }

  private updateVisualProperties(particle: ParticleState): void {
    const lifeRatio = particle.life / particle.maxLife;
    const energyFactor = MathUtilities.smoothstep(0, 1, particle.energy);
    
    particle.opacity = Math.max(0, 
      0.7 * (1 - lifeRatio) * (0.5 + 0.5 * energyFactor)
    );

    const baseSizeMultiplier = 1 + 0.3 * energyFactor;
    const lifecycleMultiplier = MathUtilities.smoothstep(0.9, 1.0, lifeRatio) * 0.5 + 0.5;
    
    particle.size = MathUtilities.clamp(
      particle.size * baseSizeMultiplier * lifecycleMultiplier,
      this.config.MIN_PARTICLE_SIZE,
      this.config.MAX_PARTICLE_SIZE
    );
  }

  private updateTrailSystem(particle: ParticleState): void {
    const newTrail = [...particle.trail, {
      x: particle.x,
      y: particle.y,
      opacity: particle.opacity * 0.5
    }];

    if (newTrail.length > this.config.TRAIL_LENGTH) {
      newTrail.shift();
    }

    // Update trail opacity with smooth decay
    const updatedTrail = newTrail.map((point, index) => ({
      ...point,
      opacity: point.opacity * ((index + 1) / newTrail.length)
    }));

    (particle as any).trail = Object.freeze(updatedTrail);
  }
}

// ==========================================
// ENTERPRISE PERFORMANCE PROFILER
// ==========================================

const createPerformanceProfiler = () => {
  let metrics: PerformanceProfiler = {
    renderTime: 0,
    particleUpdateTime: 0,
    connectionRenderTime: 0,
    totalFrameTime: 0
  };

  return {
    startTiming: (operation: keyof PerformanceProfiler) => {
      const start = performance.now();
      return () => {
        metrics[operation] = performance.now() - start;
      };
    },
    getMetrics: (): Readonly<PerformanceProfiler> => ({ ...metrics }),
    resetMetrics: () => {
      metrics = {
        renderTime: 0,
        particleUpdateTime: 0,
        connectionRenderTime: 0,
        totalFrameTime: 0
      };
    }
  };
};

// ==========================================
// MAIN PRODUCTION COMPONENT
// ==========================================

export function ParticleBackground({
  particleCount = PRODUCTION_CONFIG.DEFAULT_PARTICLE_COUNT,
  connectionDistance = PRODUCTION_CONFIG.DEFAULT_CONNECTION_DISTANCE,
  particleSpeed = PRODUCTION_CONFIG.DEFAULT_PARTICLE_SPEED,
  colors = DEFAULT_COLOR_PALETTE,
  className = '',
  enableTrails = false,
  maxFPS = PRODUCTION_CONFIG.DEFAULT_MAX_FPS,
  qualityMultiplier = PRODUCTION_CONFIG.DEFAULT_QUALITY_MULTIPLIER,
}: ParticleBackgroundProps): React.JSX.Element {
  
  // ==========================================
  // ENTERPRISE REF MANAGEMENT
  // ==========================================
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<ParticleState[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const animationMetricsRef = useRef<AnimationMetrics>({
    lastFrameTime: 0,
    frameCount: 0,
    avgFPS: 0,
    isRunning: false
  });

  // ==========================================
  // PRODUCTION SYSTEM INITIALIZATION
  // ==========================================

  const colorManager = useMemo(() => new ProductionColorManager(colors), [colors]);
  const physicsEngine = useMemo(() => new AdvancedParticlePhysicsEngine(), []);
  const performanceProfiler = useMemo(() => createPerformanceProfiler(), []);

  const targetFrameTime = useMemo(() => 1000 / maxFPS, [maxFPS]);

  // ==========================================
  // PRODUCTION PARTICLE FACTORY
  // ==========================================

  const createProductionParticle = useCallback((width: number, height: number): ParticleState => {
    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid canvas dimensions: ${width}x${height}`);
    }

    const baseSize = Math.random() * 2 + 0.5;
    const energy = Math.random() * 0.5 + 0.3;
    
    return Object.freeze({
      id: MathUtilities.generateUUID(),
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * particleSpeed * qualityMultiplier,
      vy: (Math.random() - 0.5) * particleSpeed * qualityMultiplier,
      size: MathUtilities.clamp(
        baseSize * qualityMultiplier, 
        PRODUCTION_CONFIG.MIN_PARTICLE_SIZE, 
        PRODUCTION_CONFIG.MAX_PARTICLE_SIZE
      ),
      opacity: MathUtilities.clamp(Math.random() * 0.5 + 0.2, 0.1, 0.7),
      color: colorManager.getRandomColor(),
      life: 0,
      maxLife: Math.floor(Math.random() * 300 + 200),
      energy,
      trail: Object.freeze([]) as ReadonlyArray<TrailPoint>
    } as ParticleState);
  }, [particleSpeed, qualityMultiplier, colorManager]);

  // ==========================================
  // SYNCHRONOUS PARTICLE INITIALIZATION
  // ==========================================

  const initializeProductionParticleSystem = useCallback((width: number, height: number): void => {
    try {
      if (width <= 0 || height <= 0 || particleCount <= 0) {
        particlesRef.current = [];
        return;
      }

      const particles: ParticleState[] = [];
      
      // Synchronous batch processing for production reliability
      for (let i = 0; i < particleCount; i++) {
        particles.push(createProductionParticle(width, height));
      }
      
      particlesRef.current = particles;
      colorManager.clearCache();
      
    } catch (error) {
      console.error('Production particle system initialization failed:', error);
      particlesRef.current = [];
    }
  }, [particleCount, createProductionParticle, colorManager]);

  // ==========================================
  // ENTERPRISE CANVAS MANAGEMENT
  // ==========================================

  const configureProductionCanvas = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (dimensionsRef.current.width !== width || dimensionsRef.current.height !== height) {
        const pixelRatio = Math.min(window.devicePixelRatio * qualityMultiplier, 3);
        
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Type-safe context acquisition with proper error handling
        const ctx = canvas.getContext('2d', {
          alpha: true,
          desynchronized: true,
          powerPreference: 'high-performance'
        }) as CanvasRenderingContext2D | null;

        if (ctx) {
          ctx.scale(pixelRatio, pixelRatio);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = qualityMultiplier > 1.5 ? 'high' : 'medium';
          contextRef.current = ctx;
        } else {
          throw new Error('Failed to acquire 2D rendering context');
        }

        dimensionsRef.current = { width, height };
        
        if (width > 0 && height > 0) {
          initializeProductionParticleSystem(width, height);
        }
      }
    } catch (error) {
      console.error('Production canvas configuration failed:', error);
    }
  }, [qualityMultiplier, initializeProductionParticleSystem]);

  // ==========================================
  // OPTIMIZED MOUSE INTERACTION
  // ==========================================

  const handleProductionMouseMove = useCallback((event: MouseEvent): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Smooth interpolation for fluid interaction
      mouseRef.current.x = MathUtilities.lerp(mouseRef.current.x, x, 0.1);
      mouseRef.current.y = MathUtilities.lerp(mouseRef.current.y, y, 0.1);
      
    } catch (error) {
      console.error('Production mouse interaction failed:', error);
    }
  }, []);

  // ==========================================
  // HIGH-PERFORMANCE RENDERING SYSTEM
  // ==========================================

  const renderProductionParticle = useCallback((ctx: CanvasRenderingContext2D, particle: ParticleState): void => {
    const endTiming = performanceProfiler.startTiming('renderTime');
    
    try {
      // Render trail system if enabled
      if (enableTrails && particle.trail.length > 1) {
        ctx.save();
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = particle.size * 0.3;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        const firstPoint = particle.trail[0];
        if (firstPoint) {
          ctx.moveTo(firstPoint.x, firstPoint.y);
          
          for (let i = 1; i < particle.trail.length; i++) {
            const point = particle.trail[i];
            if (point) {
              ctx.globalAlpha = point.opacity;
              ctx.lineTo(point.x, point.y);
            }
          }
        }
        
        ctx.stroke();
        ctx.restore();
      }

      // Render particle with advanced effects
      ctx.save();
      ctx.globalAlpha = particle.opacity;
      
      // Energy-based glow effects
      if (particle.energy > 0.8) {
        const glowSize = particle.size * (1 + particle.energy);
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = glowSize * 2;
      }
      
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      
    } catch (error) {
      console.error('Particle rendering failed:', error);
    } finally {
      endTiming();
    }
  }, [enableTrails, performanceProfiler]);

  const renderProductionConnections = useCallback((ctx: CanvasRenderingContext2D): void => {
    const endTiming = performanceProfiler.startTiming('connectionRenderTime');
    
    try {
      const particles = particlesRef.current;
      if (particles.length < 2) return;

      ctx.save();
      
      const useOptimization = particles.length > PRODUCTION_CONFIG.PERFORMANCE_THRESHOLD;
      
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        if (!particle) continue;

        const maxConnections = useOptimization ? 3 : particles.length;
        let connectionCount = 0;

        for (let j = i + 1; j < particles.length && connectionCount < maxConnections; j++) {
          const otherParticle = particles[j];
          if (!otherParticle) continue;

          const distance = useOptimization ? 
            MathUtilities.fastDistance(particle.x, particle.y, otherParticle.x, otherParticle.y) :
            MathUtilities.distance(particle.x, particle.y, otherParticle.x, otherParticle.y);

          if (distance < connectionDistance) {
            const opacity = MathUtilities.smoothstep(connectionDistance, 0, distance) * 
              PRODUCTION_CONFIG.CONNECTION_OPACITY_BASE;
            
            const energyFactor = (particle.energy + otherParticle.energy) * 0.5;
            const finalOpacity = opacity * (0.3 + 0.7 * energyFactor);
            
            ctx.globalAlpha = finalOpacity;
            ctx.strokeStyle = `rgba(255, 255, 255, ${finalOpacity})`;
            ctx.lineWidth = 1 + energyFactor;
            
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
            
            connectionCount++;
          }
        }
      }

      ctx.restore();
      
    } catch (error) {
      console.error('Connection rendering failed:', error);
    } finally {
      endTiming();
    }
  }, [connectionDistance, performanceProfiler]);

  // ==========================================
  // PRODUCTION ANIMATION LOOP
  // ==========================================

  const executeProductionAnimation = useCallback((): void => {
    const currentTime = performance.now();
    const animationMetrics = animationMetricsRef.current;
    
    if (!animationMetrics.isRunning) return;

    // Frame rate limiting with precision timing
    const deltaTime = currentTime - animationMetrics.lastFrameTime;
    if (deltaTime < targetFrameTime) {
      animationFrameRef.current = requestAnimationFrame(executeProductionAnimation);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    if (!canvas || !ctx) {
      animationFrameRef.current = requestAnimationFrame(executeProductionAnimation);
      return;
    }

    const { width, height } = dimensionsRef.current;
    if (width <= 0 || height <= 0) {
      animationFrameRef.current = requestAnimationFrame(executeProductionAnimation);
      return;
    }

    try {
      const frameStartTime = performance.now();
      performanceProfiler.resetMetrics();

      // Optimized frame clearing
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, width, height);
      ctx.restore();

      // Process particle physics and rendering
      const updateTiming = performanceProfiler.startTiming('particleUpdateTime');
      
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        if (!particle) continue;

        // Create mutable copy for physics updates
        const mutableParticle = { ...particle } as ParticleState;
        physicsEngine.updateParticle(mutableParticle, mouseRef.current, { width, height }, deltaTime);
        
        // Check for particle respawn
        if (mutableParticle.life > mutableParticle.maxLife || mutableParticle.opacity <= 0) {
          particles[i] = createProductionParticle(width, height);
          continue;
        }

        // Update particle reference
        particles[i] = Object.freeze(mutableParticle);
        renderProductionParticle(ctx, mutableParticle);
      }
      
      updateTiming();

      // Render connection network
      renderProductionConnections(ctx);

      // Update performance metrics
      animationMetrics.frameCount++;
      animationMetrics.lastFrameTime = currentTime;
      
      // Adaptive performance monitoring
      if (animationMetrics.frameCount % 60 === 0) {
        const frameEndTime = performance.now();
        animationMetrics.avgFPS = 1000 / (frameEndTime - frameStartTime);
        
        // Performance optimization feedback
        if (animationMetrics.avgFPS < maxFPS * 0.8) {
          console.info(`Performance optimization: Average FPS ${animationMetrics.avgFPS.toFixed(1)}`);
        }
      }

    } catch (error) {
      console.error('Animation loop critical failure:', error);
    }

    // Schedule next frame
    if (animationMetrics.isRunning) {
      animationFrameRef.current = requestAnimationFrame(executeProductionAnimation);
    }
  }, [targetFrameTime, physicsEngine, createProductionParticle, renderProductionParticle, 
      renderProductionConnections, performanceProfiler, maxFPS]);

  // ==========================================
  // PRODUCTION LIFECYCLE MANAGEMENT
  // ==========================================

  const cleanupProductionResources = useCallback((): void => {
    const animationMetrics = animationMetricsRef.current;
    animationMetrics.isRunning = false;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    contextRef.current = null;
    particlesRef.current = [];
    colorManager.clearCache();
    performanceProfiler.resetMetrics();
  }, [colorManager, performanceProfiler]);

  // ==========================================
  // PRODUCTION EFFECTS
  // ==========================================

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return cleanupProductionResources;

    let resizeObserver: ResizeObserver | null = null;

    try {
      animationMetricsRef.current.isRunning = true;

      resizeObserver = new ResizeObserver(() => {
        try {
          configureProductionCanvas();
        } catch (error) {
          console.error('ResizeObserver callback failed:', error);
        }
      });
      
      resizeObserver.observe(canvas);

      const mouseHandler = (event: MouseEvent): void => {
        try {
          handleProductionMouseMove(event);
        } catch (error) {
          console.error('Mouse event handler failed:', error);
        }
      };

      canvas.addEventListener('mousemove', mouseHandler, { passive: true });

      configureProductionCanvas();
      animationFrameRef.current = requestAnimationFrame(executeProductionAnimation);

      return () => {
        cleanupProductionResources();
        resizeObserver?.disconnect();
        canvas.removeEventListener('mousemove', mouseHandler);
      };

    } catch (error) {
      console.error('Component initialization critical failure:', error);
      return cleanupProductionResources;
    }
  }, [configureProductionCanvas, handleProductionMouseMove, executeProductionAnimation, cleanupProductionResources]);

  useEffect(() => {
    const { width, height } = dimensionsRef.current;
    if (width > 0 && height > 0) {
      initializeProductionParticleSystem(width, height);
    }
  }, [particleCount, particleSpeed, qualityMultiplier, initializeProductionParticleSystem]);

  // ==========================================
  // PRODUCTION RENDER
  // ==========================================

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        willChange: 'transform',
        contain: 'layout style paint',
      }}
      aria-hidden="true"
      role="presentation"
    />
  );
}