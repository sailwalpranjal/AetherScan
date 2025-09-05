/**
 * Type definitions for Industrial Air Quality Monitoring System
 * Production-ready TypeScript interfaces with comprehensive error handling
 */

// ==========================================
// CORE APPLICATION TYPES
// ==========================================

export interface ApplicationMetadata {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly authors: readonly string[];
  readonly license: string;
  readonly repository: string;
}

export interface EnvironmentConfig {
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
  readonly isTest: boolean;
  readonly apiBaseUrl: string;
  readonly enableAnalytics: boolean;
  readonly enableDevTools: boolean;
}

// ==========================================
// CONTRIBUTOR & TEAM TYPES
// ==========================================

export interface SocialLink {
  readonly platform: 'github' | 'linkedin' | 'twitter' | 'email' | 'website';
  readonly url: string;
  readonly label: string;
  readonly verified: boolean;
}

export interface Contributor {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly section: string;
  readonly universityRollNo: string;
  readonly avatar: string;
  readonly bio: string;
  readonly expertise: readonly string[];
  readonly socialLinks: readonly SocialLink[];
  readonly achievements: readonly string[];
  readonly isActive: boolean;
  readonly joinedAt: Date;
}

export interface TeamMember extends Contributor {
  readonly isLead: boolean;
  readonly responsibilities: readonly string[];
  readonly projects: readonly string[];
}

export interface Supervisor {
  readonly name: string;
  readonly title: string;
  readonly department: string;
  readonly email: string;
  readonly expertise: readonly string[];
  readonly publications?: readonly string[];
}

// ==========================================
// PROJECT & RESEARCH TYPES
// ==========================================

export interface ProjectFeature {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly category: 'monitoring' | 'analysis' | 'quantum' | 'ai' | 'visualization';
  readonly status: 'planned' | 'in-progress' | 'completed' | 'deployed';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly estimatedCompletion?: Date;
}

export interface ResearchObjective {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: 'primary' | 'secondary' | 'exploratory';
  readonly measurableOutcome: string;
  readonly successCriteria: readonly string[];
  readonly risks: readonly string[];
}

export interface TechnicalSpecification {
  readonly component: string;
  readonly version: string;
  readonly purpose: string;
  readonly dependencies: readonly string[];
  readonly performance: {
    readonly latency: string;
    readonly throughput: string;
    readonly accuracy: string;
    readonly availability: string;
  };
  readonly scalability: {
    readonly maxUsers: number;
    readonly maxDataPoints: number;
    readonly storageRequirements: string;
  };
}

// ==========================================
// AIR QUALITY DATA TYPES
// ==========================================

export interface PollutantData {
  readonly type: 'PM2.5' | 'PM10' | 'NO2' | 'SO2' | 'CO' | 'O3' | 'NH3' | 'HCHO';
  readonly concentration: number;
  readonly unit: 'μg/m³' | 'ppm' | 'ppb';
  readonly timestamp: Date;
  readonly quality: 'excellent' | 'good' | 'moderate' | 'poor' | 'very-poor' | 'hazardous';
  readonly uncertainty: number;
  readonly sourceConfidence: number;
}

export interface MonitoringStation {
  readonly id: string;
  readonly name: string;
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
    readonly altitude: number;
    readonly address: string;
    readonly region: string;
  };
  readonly type: 'regulatory' | 'research' | 'industrial' | 'community';
  readonly operationalStatus: 'active' | 'maintenance' | 'offline' | 'decommissioned';
  readonly dataQuality: number;
  readonly lastCalibration: Date;
  readonly nextCalibration: Date;
}

export interface SatelliteObservation {
  readonly id: string;
  readonly mission: 'Sentinel-5P' | 'MODIS' | 'OMI' | 'TROPOMI';
  readonly instrument: string;
  readonly timestamp: Date;
  readonly boundingBox: {
    readonly north: number;
    readonly south: number;
    readonly east: number;
    readonly west: number;
  };
  readonly resolution: string;
  readonly cloudCover: number;
  readonly qualityFlags: readonly string[];
  readonly processingLevel: 'L1B' | 'L2' | 'L3';
}

// ==========================================
// UI COMPONENT TYPES
// ==========================================

export interface AnimationConfig {
  readonly duration: number;
  readonly delay: number;
  readonly easing: string;
  readonly stagger?: number;
  readonly repeat?: number | boolean;
  readonly direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
}

export interface ThemeVariables {
  readonly colors: {
    readonly primary: string;
    readonly secondary: string;
    readonly background: string;
    readonly surface: string;
    readonly text: string;
    readonly border: string;
  };
  readonly spacing: Record<string, string>;
  readonly typography: {
    readonly fontFamily: string;
    readonly fontSize: Record<string, string>;
    readonly fontWeight: Record<string, number>;
    readonly lineHeight: Record<string, number>;
  };
  readonly borderRadius: Record<string, string>;
  readonly shadows: Record<string, string>;
}

export interface ComponentProps {
  readonly className?: string;
  readonly children?: React.ReactNode;
  readonly testId?: string;
  readonly ariaLabel?: string;
  readonly ariaDescribedBy?: string;
}

export interface InteractiveComponentProps extends ComponentProps {
  readonly onClick?: () => void;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
  readonly onKeyDown?: (event: React.KeyboardEvent) => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
}

// ==========================================
// ANIMATION & INTERACTION TYPES
// ==========================================

export interface MotionVariants {
  readonly hidden: Record<string, unknown>;
  readonly visible: Record<string, unknown>;
  readonly hover?: Record<string, unknown>;
  readonly tap?: Record<string, unknown>;
  readonly exit?: Record<string, unknown>;
}

export interface SpringConfig {
  readonly tension: number;
  readonly friction: number;
  readonly mass?: number;
  readonly velocity?: number;
  readonly precision?: number;
  readonly clamp?: boolean;
}

export interface GestureBounds {
  readonly left?: number;
  readonly right?: number;
  readonly top?: number;
  readonly bottom?: number;
}

export interface DragConfig {
  readonly axis?: 'x' | 'y';
  readonly bounds?: GestureBounds;
  readonly elastic?: number | boolean;
  readonly momentum?: boolean;
  readonly onDragStart?: (event: MouseEvent | TouchEvent) => void;
  readonly onDragEnd?: (event: MouseEvent | TouchEvent) => void;
}

// ==========================================
// PERFORMANCE & MONITORING TYPES
// ==========================================

export interface PerformanceMetrics {
  readonly loadTime: number;
  readonly interactivity: number;
  readonly visualStability: number;
  readonly memoryUsage: number;
  readonly bundleSize: number;
  readonly cacheHitRate: number;
}

export interface ErrorReport {
  readonly id: string;
  readonly timestamp: string;
  readonly error: {
    readonly name: string;
    readonly message: string;
    readonly stack?: string;
    readonly digest?: string;
  };
  readonly context: {
    readonly component?: string;
    readonly url: string;
    readonly userAgent: string;
    readonly viewport: {
      readonly width: number;
      readonly height: number;
    };
  };
  readonly user?: {
    readonly id?: string;
    readonly sessionId?: string;
  };
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AnalyticsEvent {
  readonly name: string;
  readonly timestamp: Date;
  readonly properties: Record<string, string | number | boolean>;
  readonly userId?: string;
  readonly sessionId: string;
  readonly pageUrl: string;
  readonly referrer?: string;
}

// ==========================================
// API & DATA FETCHING TYPES
// ==========================================

export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
  readonly metadata?: {
    readonly timestamp: Date;
    readonly requestId: string;
    readonly version: string;
  };
}

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

export interface QueryParams {
  readonly [key: string]: string | number | boolean | readonly (string | number | boolean)[] | undefined;
}

export interface RequestConfig {
  readonly timeout: number;
  readonly retries: number;
  readonly retryDelay: number;
  readonly headers?: Record<string, string>;
  readonly cache?: 'no-cache' | 'reload' | 'force-cache' | 'only-if-cached';
}

// ==========================================
// UTILITY TYPES
// ==========================================

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type NonEmptyArray<T> = readonly [T, ...T[]];

export type Await<T> = T extends Promise<infer U> ? U : T;

export type KeyOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// ==========================================
// FORM & VALIDATION TYPES
// ==========================================

export interface ValidationRule {
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: RegExp;
  readonly custom?: (value: unknown) => string | null;
}

export interface FieldError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

export interface FormState<T = Record<string, unknown>> {
  readonly values: T;
  readonly errors: readonly FieldError[];
  readonly touched: Record<keyof T, boolean>;
  readonly isSubmitting: boolean;
  readonly isValid: boolean;
  readonly isDirty: boolean;
}

// ==========================================
// ACCESSIBILITY TYPES
// ==========================================

export interface AccessibilityProps {
  readonly 'aria-label'?: string;
  readonly 'aria-labelledby'?: string;
  readonly 'aria-describedby'?: string;
  readonly 'aria-expanded'?: boolean;
  readonly 'aria-hidden'?: boolean;
  readonly 'aria-live'?: 'off' | 'polite' | 'assertive';
  readonly role?: string;
  readonly tabIndex?: number;
}

export interface KeyboardNavigationProps {
  readonly onKeyDown?: (event: React.KeyboardEvent) => void;
  readonly onKeyUp?: (event: React.KeyboardEvent) => void;
  readonly onKeyPress?: (event: React.KeyboardEvent) => void;
}

// ==========================================
// QUANTUM COMPUTING TYPES
// ==========================================

export interface QuantumAlgorithm {
  readonly name: string;
  readonly type: 'QAOA' | 'VQE' | 'Grover' | 'Shor' | 'Custom';
  readonly qubits: number;
  readonly depth: number;
  readonly gates: readonly string[];
  readonly parameters: Record<string, number>;
  readonly expectedAdvantage: string;
}

export interface QuantumSimulationResult {
  readonly algorithmName: string;
  readonly executionTime: number;
  readonly classicalTime: number;
  readonly quantumAdvantage: number;
  readonly accuracy: number;
  readonly convergence: boolean;
  readonly iterations: number;
}

// ==========================================
// EXPORT CONSOLIDATED TYPES
// ==========================================

export type * from './types';

// Type guards and validation functions
export const isContributor = (obj: unknown): obj is Contributor => {
  return typeof obj === 'object' && 
         obj !== null && 
         'id' in obj && 
         'name' in obj && 
         'role' in obj;
};

export const isPollutantData = (obj: unknown): obj is PollutantData => {
  return typeof obj === 'object' && 
         obj !== null && 
         'type' in obj && 
         'concentration' in obj && 
         'timestamp' in obj;
};

export const isApiResponse = <T>(obj: unknown): obj is ApiResponse<T> => {
  return typeof obj === 'object' && 
         obj !== null && 
         'success' in obj && 
         typeof (obj as ApiResponse).success === 'boolean';
};