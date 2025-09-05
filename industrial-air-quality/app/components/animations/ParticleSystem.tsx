'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';

// ==========================================
// ADVANCED TYPE DEFINITIONS
// ==========================================
type PerformanceLevel = 'low' | 'medium' | 'high';

interface ParticleSystemProps {
  readonly count?: number;
  readonly interactive?: boolean;
  readonly performance?: PerformanceLevel;
  readonly color?: string;
  readonly opacity?: number;
  readonly size?: number;
  readonly speed?: number;
  readonly mouseInfluence?: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  originalX: number;
  originalY: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  hue: number;
  saturation: number;
  lightness: number;
}

interface PerformanceConfig {
  readonly maxParticles: number;
  readonly updateFrequency: number;
  readonly interactionRadius: number;
  readonly renderQuality: number;
  readonly enableBlur: boolean;
  readonly enableGlow: boolean;
}

// ==========================================
// PERFORMANCE OPTIMIZATION CONFIGURATIONS
// ==========================================

const PERFORMANCE_CONFIGS: Record<PerformanceLevel, PerformanceConfig> = {
  low: {
    maxParticles: 50,
    updateFrequency: 30,
    interactionRadius: 80,
    renderQuality: 0.5,
    enableBlur: false,
    enableGlow: false
  },
  medium: {
    maxParticles: 150,
    updateFrequency: 60,
    interactionRadius: 120,
    renderQuality: 0.75,
    enableBlur: true,
    enableGlow: false
  },
  high: {
    maxParticles: 300,
    updateFrequency: 120,
    interactionRadius: 200,
    renderQuality: 1,
    enableBlur: true,
    enableGlow: true
  }
} as const;

// ==========================================
// ADVANCED PARTICLE SYSTEM IMPLEMENTATION
// ==========================================

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  count = 150,
  interactive = true,
  performance = 'medium',
  color = '#6c5ce7',
  opacity = 0.6,
  size = 1.5,
  speed = 0.5,
  mouseInfluence = 100
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const lastUpdateRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const config = PERFORMANCE_CONFIGS[performance];
  const targetFPS = config.updateFrequency;
  const frameInterval = 1000 / targetFPS;

  // ==========================================
  // COLOR UTILITIES
  // ==========================================
  
  const hexToHsl = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  }, []);

  const baseHsl = useMemo(() => hexToHsl(color), [color, hexToHsl]);

  // ==========================================
  // PARTICLE INITIALIZATION
  // ==========================================
  
  const createParticle = useCallback((x?: number, y?: number): Particle => {
    const { width, height } = dimensionsRef.current;
    
    const particleX = x ?? Math.random() * width;
    const particleY = y ?? Math.random() * height;
    
    return {
      x: particleX,
      y: particleY,
      z: Math.random() * 100,
      originalX: particleX,
      originalY: particleY,
      vx: (Math.random() - 0.5) * speed * 0.5,
      vy: (Math.random() - 0.5) * speed * 0.5,
      vz: (Math.random() - 0.5) * speed * 0.2,
      size: size * (0.5 + Math.random() * 1.5),
      opacity: opacity * (0.3 + Math.random() * 0.7),
      life: 0,
      maxLife: 300 + Math.random() * 200,
      hue: baseHsl.h + (Math.random() - 0.5) * 60,
      saturation: baseHsl.s + (Math.random() - 0.5) * 40,
      lightness: baseHsl.l + (Math.random() - 0.5) * 30
    };
  }, [speed, size, opacity, baseHsl]);

  const initializeParticles = useCallback(() => {
    const particleCount = Math.min(count, config.maxParticles);
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }
    
    particlesRef.current = particles;
  }, [count, config.maxParticles, createParticle]);

  // ==========================================
  // MOUSE TRACKING
  // ==========================================
  
  useEffect(() => {
    if (!interactive) return;
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true
      };
    };
    
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove, { passive: true });
      container.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    }
    
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [interactive]);

  // ==========================================
  // PARTICLE PHYSICS & ANIMATION
  // ==========================================
  
  const updateParticles = useCallback((deltaTime: number) => {
    const particles = particlesRef.current;
    const mouse = mouseRef.current;
    const { width, height } = dimensionsRef.current;
    const time = window.performance.now() * 0.001;
    
    particles.forEach((particle) => {
      // Update life cycle
      particle.life += deltaTime;
      if (particle.life > particle.maxLife) {
        particle.life = 0;
        particle.x = particle.originalX;
        particle.y = particle.originalY;
      }
      
      // Apply base velocity with organic motion
      const waveX = Math.sin(time * 0.5 + particle.originalX * 0.01) * 2;
      const waveY = Math.cos(time * 0.3 + particle.originalY * 0.01) * 1.5;
      
      particle.vx += waveX * deltaTime * 0.1;
      particle.vy += waveY * deltaTime * 0.1;
      
      // Mouse interaction
      if (interactive && mouse.active) {
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < config.interactionRadius) {
          const force = (1 - distance / config.interactionRadius) * mouseInfluence;
          const angle = Math.atan2(dy, dx);
          
          // Repulsion effect
          particle.vx -= Math.cos(angle) * force * deltaTime * 0.01;
          particle.vy -= Math.sin(angle) * force * deltaTime * 0.01;
          
          // Color shift on interaction
          particle.lightness = Math.min(80, particle.lightness + force * 0.5);
        }
      }
      
      // Apply velocity
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.z += particle.vz * deltaTime;
      
      // Boundary conditions with wrapping
      if (particle.x > width + 50) {
        particle.x = -50;
        particle.originalX = Math.random() * width;
      } else if (particle.x < -50) {
        particle.x = width + 50;
        particle.originalX = Math.random() * width;
      }
      
      if (particle.y > height + 50) {
        particle.y = -50;
        particle.originalY = Math.random() * height;
      } else if (particle.y < -50) {
        particle.y = height + 50;
        particle.originalY = Math.random() * height;
      }
      
      // Fade effect based on life cycle
      const lifeFactor = 1 - Math.abs((particle.life / particle.maxLife) - 0.5) * 2;
      particle.opacity = opacity * lifeFactor * (0.3 + Math.random() * 0.7);
      
      // Gentle drift back to original position
      const returnForce = 0.001;
      particle.vx += (particle.originalX - particle.x) * returnForce * deltaTime;
      particle.vy += (particle.originalY - particle.y) * returnForce * deltaTime;
      
      // Apply drag
      particle.vx *= 0.999;
      particle.vy *= 0.999;
      particle.vz *= 0.995;
    });
  }, [interactive, config.interactionRadius, mouseInfluence, opacity]);

  // ==========================================
  // ADVANCED RENDERING ENGINE
  // ==========================================
  
  const renderParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    const particles = particlesRef.current;
    const { width, height } = dimensionsRef.current;
    
    // Clear with fade effect for trails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);
    
    // Set blend mode for glow effect
    ctx.globalCompositeOperation = 'lighter';
    
    particles.forEach((particle) => {
      if (particle.opacity <= 0.01) return;
      
      const x = particle.x;
      const y = particle.y;
      const particleSize = Math.max(0.1, particle.size * (1 + particle.z * 0.01));
      const alpha = Math.max(0, Math.min(1, particle.opacity));
      
      // Create gradient for glow effect
      const gradientRadius = Math.max(0.1, particleSize * 3);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, gradientRadius);
      
      const hsl = `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, ${alpha})`;
      const hslOuter = `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, 0)`;
      
      gradient.addColorStop(0, hsl);
      gradient.addColorStop(0.4, `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, ${alpha * 0.6})`);
      gradient.addColorStop(1, hslOuter);
      
      ctx.fillStyle = gradient;
      
      // Draw particle with glow
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.1, particleSize), 0, Math.PI * 2);
      ctx.fill();
      
      // Add sparkle effect for high performance mode
      if (config.enableGlow && Math.random() < 0.1) {
        ctx.fillStyle = `hsla(${particle.hue}, ${particle.saturation}%, 90%, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(x + Math.random() * 4 - 2, y + Math.random() * 4 - 2, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Reset blend mode
    ctx.globalCompositeOperation = 'source-over';
  }, [config.enableGlow]);

  // ==========================================
  // OPTIMIZED ANIMATION LOOP
  // ==========================================
  
  const animate = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // FPS throttling
    if (currentTime - lastUpdateRef.current < frameInterval) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    
    const deltaTime = currentTime - lastUpdateRef.current;
    lastUpdateRef.current = currentTime;
    
    // Calculate FPS for debugging
    fpsRef.current = 1000 / deltaTime;
    
    // Update and render
    updateParticles(deltaTime);
    renderParticles(ctx);
    
    animationRef.current = requestAnimationFrame(animate);
  }, [updateParticles, renderParticles, frameInterval]);

  // ==========================================
  // RESPONSIVE CANVAS SETUP
  // ==========================================
  
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scaledWidth = rect.width * config.renderQuality;
    const scaledHeight = rect.height * config.renderQuality;
    
    canvas.width = scaledWidth * dpr;
    canvas.height = scaledHeight * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      
      // Enable anti-aliasing and smoothing
      ctx.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in ctx) {
        (ctx as any).imageSmoothingQuality = 'high';
      }
    }
    
    dimensionsRef.current = { width: scaledWidth, height: scaledHeight };
  }, [config.renderQuality]);

  // ==========================================
  // LIFECYCLE MANAGEMENT
  // ==========================================
  
  useEffect(() => {
    resizeCanvas();
    initializeParticles();
    
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [resizeCanvas, initializeParticles, animate]);

  // Update particles when props change
  useEffect(() => {
    initializeParticles();
  }, [count, color, size, speed, opacity, initializeParticles]);

  // ==========================================
  // RENDER COMPONENT
  // ==========================================
  
  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: interactive ? 'auto' : 'none',
        zIndex: -1,
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
          filter: config.enableBlur ? 'blur(0.5px)' : 'none'
        }}
      />
      </div>
  );
};

export type { ParticleSystemProps };