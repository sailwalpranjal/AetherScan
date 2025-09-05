// lib/utils.ts
// ==========================================
// PRODUCTION-GRADE UTILITY FUNCTIONS (FIXED)
// ==========================================

import type { ErrorReport } from './types';

// ==========================================
// ERROR REPORTING UTILITIES
// ==========================================

/**
 * Creates a comprehensive error report for monitoring and debugging
 * @param error - The error object to report
 * @param context - Additional context information
 * @returns Structured error report
 */
export function createErrorReport(
  error: Error,
  context: {
    readonly component?: string;
    readonly digest?: string;
    readonly userId?: string;
    readonly sessionId?: string;
  } = {}
): ErrorReport {
  const timestamp = new Date().toISOString();
  const reportId = generateErrorId(error, timestamp);
  
  const viewport = typeof window !== 'undefined' 
    ? { width: window.innerWidth, height: window.innerHeight }
    : { width: 0, height: 0 };

  // Fix exactOptionalPropertyTypes issues by explicitly handling undefined values
  const errorData: ErrorReport['error'] = {
    name: error.name,
    message: error.message,
    ...(error.stack !== undefined && { stack: error.stack }),
    ...(context.digest !== undefined && { digest: context.digest }),
  };

  const contextData: ErrorReport['context'] = {
    ...(context.component !== undefined && { component: context.component }),
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    viewport: {
      width: viewport.width,
      height: viewport.height,
    },
  };

  const userData: ErrorReport['user'] = {
    ...(context.userId !== undefined && { id: context.userId }),
    ...(context.sessionId !== undefined && { sessionId: context.sessionId }),
  };

  return {
    id: reportId,
    timestamp,
    error: errorData,
    context: contextData,
    user: userData,
    severity: determineSeverity(error),
  };
}

/**
 * Generates a unique error ID based on error content and timestamp
 */
function generateErrorId(error: Error, timestamp: string): string {
  const content = `${error.name}-${error.message}-${timestamp}`;
  return btoa(content)
    .replace(/[+/=]/g, '')
    .substring(0, 16);
}

/**
 * Determines error severity based on error characteristics
 */
function determineSeverity(error: Error): ErrorReport['severity'] {
  const criticalErrors = [
    'ChunkLoadError',
    'SecurityError',
    'NetworkError',
    'DatabaseError',
  ];
  
  const highSeverityErrors = [
    'TypeError',
    'ReferenceError',
    'SyntaxError',
  ];
  
  const mediumSeverityErrors = [
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
  ];

  if (criticalErrors.some(type => error.name.includes(type))) {
    return 'critical';
  }
  
  if (highSeverityErrors.some(type => error.name.includes(type))) {
    return 'high';
  }
  
  if (mediumSeverityErrors.some(type => error.name.includes(type))) {
    return 'medium';
  }
  
  return 'low';
}

// ==========================================
// PERFORMANCE UTILITIES
// ==========================================

/**
 * Debounces a function call to improve performance
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttles a function call to limit execution frequency
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Creates a retry mechanism for async operations
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum retry attempts
 * @param delay - Delay between attempts in milliseconds
 * @returns Promise with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

// ==========================================
// VALIDATION UTILITIES
// ==========================================

/**
 * Validates email format using production-grade regex
 * @param email - Email string to validate
 * @returns Boolean indicating validity
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates URL format and security
 * @param url - URL string to validate
 * @returns Boolean indicating validity
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    return allowedProtocols.includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return html.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

// ==========================================
// FORMATTING UTILITIES
// ==========================================

/**
 * Formats numbers with locale-specific separators
 * @param value - Number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/**
 * Formats dates with timezone awareness
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(dateObj);
}

/**
 * Formats file sizes in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${formatNumber(size, { maximumFractionDigits: 1 })} ${sizes[i]}`;
}

// ==========================================
// ENVIRONMENT UTILITIES
// ==========================================

/**
 * Safely gets environment variable with type checking
 * @param key - Environment variable key
 * @param defaultValue - Default value if not found
 * @returns Environment variable value
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not defined`);
  }
  
  return value;
}

/**
 * Checks if code is running in development environment
 * @returns Boolean indicating development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Checks if code is running in production environment
 * @returns Boolean indicating production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Checks if code is running on client side
 * @returns Boolean indicating client-side execution
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Checks if code is running on server side
 * @returns Boolean indicating server-side execution
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

// ==========================================
// SECURITY UTILITIES
// ==========================================

/**
 * Generates a cryptographically secure random string
 * @param length - Length of the random string
 * @returns Random string
 */
export function generateSecureId(length: number = 16): string {
  if (isServer()) {
    const crypto = require('crypto');
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .substring(0, length);
  } else {
    // Client-side fallback using Web Crypto API
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, length);
  }
}

/**
 * Creates a Content Security Policy hash for inline scripts
 * @param content - Script content to hash
 * @returns CSP hash string
 */
export function createCspHash(content: string): string {
  if (isServer()) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(content).digest('base64');
    return `'sha256-${hash}'`;
  }
  throw new Error('CSP hash generation is only available on server side');
}

// ==========================================
// ACCESSIBILITY UTILITIES
// ==========================================

/**
 * Generates unique IDs for accessibility attributes
 * @param prefix - Prefix for the ID
 * @returns Unique accessibility ID
 */
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Announces content to screen readers
 * @param message - Message to announce
 * @param priority - Announcement priority
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (!isClient()) return;
  
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  document.body.appendChild(announcement);
  announcement.textContent = message;
  
  setTimeout(() => {
    if (announcement.parentNode) {
      announcement.parentNode.removeChild(announcement);
    }
  }, 1000);
}

// ==========================================
// ANALYTICS UTILITIES
// ==========================================

/**
 * Tracks user interactions for analytics
 * @param eventName - Name of the event
 * @param properties - Event properties
 */
export function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {}
): void {
  if (!isClient() || !isProduction()) return;
  
  const event = {
    name: eventName,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    },
  };
  
  // In production, this would integrate with your analytics service
  console.info('Analytics Event:', event);
}

// ==========================================
// MODERN PERFORMANCE METRICS (FIXED)
// ==========================================

/**
 * Measures page performance metrics using modern Performance API
 * @returns Performance metrics object
 */
export function getPerformanceMetrics(): Record<string, number> | null {
  if (!isClient() || !('performance' in window)) return null;
  
  const navigationEntries = performance.getEntriesByType('navigation');
  const navigation = navigationEntries.length > 0 ? navigationEntries[0] as PerformanceNavigationTiming : undefined;

  
  if (!navigation) return null;
  
  // Use modern Performance API without deprecated navigationStart
  const metrics: Record<string, number> = {
    // Page load timing
    pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
    firstByte: navigation.responseStart - navigation.fetchStart,
    domComplete: navigation.domComplete - navigation.fetchStart,
    networkLatency: navigation.responseStart - navigation.fetchStart,
    
    // Connection timing
    dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcpConnection: navigation.connectEnd - navigation.connectStart,
    
    // Resource timing
    resourceLoadTime: navigation.loadEventEnd - navigation.responseEnd,
    
    // Processing timing
    domProcessingTime: navigation.domComplete - navigation.responseEnd,
  };

  // Add SSL timing if available
  if (navigation.secureConnectionStart > 0) {
    metrics.sslTime = navigation.connectEnd - navigation.secureConnectionStart;
  }
  
  // Get paint metrics
  const paintMetrics = performance.getEntriesByType('paint');
  for (const paint of paintMetrics) {
    const metricName = paint.name.replace(/-/g, '');
    metrics[metricName] = paint.startTime;
  }
  
  // Get LCP if available with bulletproof type guards
  try {
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries && lcpEntries.length > 0) {
      const lcp = lcpEntries[lcpEntries.length - 1]; // Get the latest LCP
      if (lcp !== undefined && lcp !== null && typeof lcp.startTime === 'number') {
        metrics.largestContentfulPaint = lcp.startTime;
      }
    }
  } catch (lcpError) {
    // LCP might not be available in all browsers - graceful degradation
    console.debug('LCP metric not available:', lcpError);
  }
  
  // Get CLS if available
  try {
    const clsEntries = performance.getEntriesByType('layout-shift');
    let clsScore = 0;
    for (const entry of clsEntries) {
      const layoutShift = entry as any; // LayoutShift interface varies by browser
      if (!layoutShift.hadRecentInput) {
        clsScore += layoutShift.value;
      }
    }
    metrics.cumulativeLayoutShift = clsScore;
  } catch (error) {
    // CLS might not be available in all browsers
    console.debug('CLS metric not available:', error);
  }
  
  return metrics;
}

/**
 * Enhanced performance observer for real-time monitoring
 * @param callback - Callback to handle performance entries
 * @returns Cleanup function
 */
export function observePerformance(
  callback: (entries: PerformanceEntry[]) => void
): () => void {
  if (!isClient() || !('PerformanceObserver' in window)) {
    return () => {}; // No-op cleanup
  }
  
  const observers: PerformanceObserver[] = [];
  
  // Observe different entry types
  const entryTypes = [
    'navigation',
    'paint',
    'largest-contentful-paint',
    'layout-shift',
    'first-input',
    'resource'
  ];
  
  for (const entryType of entryTypes) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ entryTypes: [entryType] });
      observers.push(observer);
    } catch (error) {
      // Some entry types might not be supported
      console.debug(`Performance observer for ${entryType} not supported:`, error);
    }
  }
  
  // Return cleanup function
  return () => {
    observers.forEach(observer => observer.disconnect());
  };
}

/**
 * Calculates Web Vitals scores for performance monitoring
 * @returns Promise resolving to Web Vitals scores
 */
export function getWebVitals(): Promise<{
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
}> {
  return new Promise((resolve) => {
    if (!isClient()) {
      resolve({ lcp: null, fid: null, cls: null, fcp: null, ttfb: null });
      return;
    }
    
    const vitals = {
      lcp: null as number | null,
      fid: null as number | null,
      cls: null as number | null,
      fcp: null as number | null,
      ttfb: null as number | null,
    };
    
    let completedMetrics = 0;
    const totalMetrics = 5;
    
    const checkComplete = () => {
      completedMetrics++;
      if (completedMetrics >= totalMetrics) {
        resolve(vitals);
      }
    };
    
    // Get TTFB from navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      vitals.ttfb = navigation.responseStart - navigation.fetchStart;
    }
    checkComplete();
    
    // Get FCP
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      vitals.fcp = fcpEntry.startTime;
    }
    checkComplete();
    
    // Get LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            vitals.lcp = lastEntry.startTime;
          }
        }
        lcpObserver.disconnect();
        checkComplete();
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch {
      checkComplete();
    }

    
    // Get FID
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const fidEntry = entries[0] as any;
          vitals.fid = fidEntry.processingStart - fidEntry.startTime;
        }
        fidObserver.disconnect();
        checkComplete();
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch {
      checkComplete();
    }
    
    // Get CLS with enterprise-grade error handling and precise type checking
    try {
      let clsScore = 0;
      let clsObserver: PerformanceObserver | null = null;
      
      clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          // Bulletproof type checking for layout shift entries
          const layoutShift = entry as any;
          if (layoutShift && 
              typeof layoutShift.value === 'number' && 
              typeof layoutShift.hadRecentInput === 'boolean' && 
              !layoutShift.hadRecentInput) {
            clsScore += layoutShift.value;
          }
        }
        vitals.cls = clsScore;
      });
      
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      
      // Stop observing CLS after optimal measurement window
      setTimeout(() => {
        if (clsObserver) {
          try {
            clsObserver.disconnect();
            vitals.cls = clsScore; // Final CLS score assignment
          } catch (disconnectError) {
            console.debug('CLS observer disconnect failed:', disconnectError);
            vitals.cls = clsScore; // Ensure score is still captured
          }
        }
        checkComplete();
      }, 5000);
    } catch (clsError) {
      console.debug('CLS measurement failed:', clsError);
      // Fallback: attempt to get CLS from existing entries
      try {
        const existingClsEntries = performance.getEntriesByType('layout-shift');
        let fallbackClsScore = 0;
        for (const entry of existingClsEntries) {
          const layoutShift = entry as any;
          if (layoutShift && 
              typeof layoutShift.value === 'number' && 
              typeof layoutShift.hadRecentInput === 'boolean' && 
              !layoutShift.hadRecentInput) {
            fallbackClsScore += layoutShift.value;
          }
        }
        vitals.cls = fallbackClsScore;
      } catch (fallbackError) {
        console.debug('CLS fallback measurement failed:', fallbackError);
        vitals.cls = null;
      }
      checkComplete();
    }
    
    // Fallback timeout
    setTimeout(() => {
      resolve(vitals);
    }, 10000);
  });
}