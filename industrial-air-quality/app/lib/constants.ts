/**
 * Application constants and configuration
 * Production-ready constants with comprehensive type safety
 */

import type { 
  ApplicationMetadata, 
  Contributor, 
  Supervisor, 
  ProjectFeature, 
  ResearchObjective,
  TechnicalSpecification,
  MotionVariants,
  SpringConfig
} from './types';

// ==========================================
// APPLICATION METADATA
// ==========================================

export const APP_METADATA: ApplicationMetadata = {
  name: 'Industrial Air Quality Monitoring System',
  version: '1.0.0',
  description: 'Advanced industrial air quality monitoring with quantum-enhanced data processing',
  authors: ['Sriya Rawat', 'Prakriti Kimothi', 'Siddhant Dabral', 'Pranjal Sailwal'],
  license: 'MIT',
  repository: 'https://github.com/air-quality-team/industrial-monitoring',
} as const;

export const SUPERVISOR: Supervisor = {
  name: 'Dr. Susheela Dahiya',
  title: 'Professor & Research Supervisor',
  department: 'Computer Science & Engineering',
  email: 'susheela.dahiya@gehu.ac.in',
  expertise: [
    'Environmental Informatics',
    'Machine Learning',
    'Data Analytics',
    'Atmospheric Science',
    'Remote Sensing'
  ],
  publications: [
    'Advanced Data Fusion Techniques for Environmental Monitoring',
    'Machine Learning Applications in Atmospheric Science',
    'Satellite-based Air Quality Assessment Methods'
  ],
} as const;

// ==========================================
// TEAM CONTRIBUTORS
// ==========================================

export const CONTRIBUTORS: readonly Contributor[] = [
  {
    id: 'sriya-rawat',
    name: 'Sriya Rawat',
    role: 'Project Lead & Data Scientist',
    section: 'G1',
    universityRollNo: '22012988',
    avatar: '/images/contributors/sriya-rawat.jpg',
    bio: 'Leading the development of machine learning algorithms for satellite data processing and air quality prediction models.',
    expertise: [
      'Machine Learning',
      'Satellite Data Processing', 
      'Python/TensorFlow',
      'Statistical Analysis',
      'Project Management'
    ],
    socialLinks: [
      {
        platform: 'github',
        url: 'https://github.com/sriya-rawat',
        label: 'GitHub Profile',
        verified: true
      },
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/sriya-rawat',
        label: 'LinkedIn Profile',
        verified: true
      }
    ],
    achievements: [
      'Lead developer of satellite data fusion algorithms',
      'Implemented ML models with 91% accuracy',
      'Published research on environmental data processing'
    ],
    isActive: true,
    joinedAt: new Date('2024-01-15')
  },
  {
    id: 'prakriti-kimothi',
    name: 'Prakriti Kimothi',
    role: 'Full-Stack Developer & UI/UX Designer',
    section: 'D1',
    universityRollNo: '2219256',
    avatar: '/images/contributors/prakriti-kimothi.jpg',
    bio: 'Specializing in creating intuitive user interfaces and robust backend systems for real-time environmental monitoring.',
    expertise: [
      'React/Next.js',
      'Node.js/Express',
      'UI/UX Design',
      'Database Design',
      'System Architecture'
    ],
    socialLinks: [
      {
        platform: 'github',
        url: 'https://github.com/prakriti-kimothi',
        label: 'GitHub Profile',
        verified: true
      },
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/prakriti-kimothi',
        label: 'LinkedIn Profile',
        verified: true
      }
    ],
    achievements: [
      'Designed responsive dashboard with 99.2% uptime',
      'Optimized database queries by 75%',
      'Created award-winning user interface design'
    ],
    isActive: true,
    joinedAt: new Date('2024-01-15')
  },
  {
    id: 'siddhant-dabral',
    name: 'Siddhant Dabral',
    role: 'Quantum Computing Researcher & Backend Developer',
    section: 'G1',
    universityRollNo: '2219714',
    avatar: '/images/contributors/siddhant-dabral.jpg',
    bio: 'Developing quantum algorithms for optimization problems in environmental monitoring and atmospheric modeling.',
    expertise: [
      'Quantum Computing',
      'Qiskit/Cirq',
      'Algorithm Optimization',
      'Python/C++',
      'Mathematical Modeling'
    ],
    socialLinks: [
      {
        platform: 'github',
        url: 'https://github.com/siddhant-dabral',
        label: 'GitHub Profile',
        verified: true
      },
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/siddhant-dabral',
        label: 'LinkedIn Profile',
        verified: true
      }
    ],
    achievements: [
      'Implemented QAOA for sensor network optimization',
      'Published quantum algorithms research',
      'Achieved 7.2% quantum advantage in simulations'
    ],
    isActive: true,
    joinedAt: new Date('2024-01-15')
  },
  {
    id: 'pranjal-sailwal',
    name: 'Pranjal Sailwal',
    role: 'DevOps Engineer & System Architect',
    section: 'L1',
    universityRollNo: '2219267',
    avatar: '/images/contributors/pranjal-sailwal.jpg',
    bio: 'Ensuring robust deployment, monitoring, and scaling of the air quality monitoring infrastructure.',
    expertise: [
      'DevOps/CI/CD',
      'Docker/Kubernetes',
      'Cloud Architecture',
      'Monitoring/Observability',
      'Performance Optimization'
    ],
    socialLinks: [
      {
        platform: 'github',
        url: 'https://github.com/pranjal-sailwal',
        label: 'GitHub Profile',
        verified: true
      },
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/pranjal-sailwal',
        label: 'LinkedIn Profile',
        verified: true
      }
    ],
    achievements: [
      'Designed scalable microservices architecture',
      'Achieved 99.8% system availability',
      'Reduced deployment time by 80%'
    ],
    isActive: true,
    joinedAt: new Date('2024-01-15')
  }
] as const;

// ==========================================
// PROJECT FEATURES
// ==========================================

export const PROJECT_FEATURES: readonly ProjectFeature[] = [
  {
    id: 'satellite-integration',
    title: 'Multi-Satellite Data Integration',
    description: 'Real-time processing of data from Sentinel-5P, MODIS, and OMI satellites for comprehensive atmospheric monitoring',
    icon: 'satellite',
    category: 'monitoring',
    status: 'completed',
    priority: 'critical'
  },
  {
    id: 'quantum-optimization',
    title: 'Quantum-Enhanced Processing',
    description: 'QAOA algorithms for sensor network optimization and atmospheric dispersion modeling',
    icon: 'quantum',
    category: 'quantum',
    status: 'in-progress',
    priority: 'high'
  },
  {
    id: 'ml-prediction',
    title: 'AI-Powered Predictions',
    description: 'LSTM neural networks and ensemble methods for 72-hour air quality forecasting',
    icon: 'ai',
    category: 'ai',
    status: 'completed',
    priority: 'critical'
  },
  {
    id: 'real-time-dashboard',
    title: 'Interactive Visualization',
    description: 'Real-time dashboards with 3D atmospheric data visualization and compliance monitoring',
    icon: 'visualization',
    category: 'visualization',
    status: 'completed',
    priority: 'high'
  }
] as const;

// ==========================================
// RESEARCH OBJECTIVES
// ==========================================

export const RESEARCH_OBJECTIVES: readonly ResearchObjective[] = [
  {
    id: 'data-fusion',
    title: 'Advanced Data Fusion',
    description: 'Develop optimal estimation algorithms for combining satellite and ground-based observations',
    category: 'primary',
    measurableOutcome: 'Achieve 15% improvement in accuracy over single-source methods',
    successCriteria: [
      'RMSE < 20% for major pollutants',
      'Correlation coefficient > 0.85',
      'Real-time processing < 15 minutes latency'
    ],
    risks: [
      'Satellite data availability',
      'Cloud coverage limitations',
      'Computational complexity'
    ]
  },
  {
    id: 'quantum-advantage',
    title: 'Quantum Computing Applications',
    description: 'Explore quantum algorithms for environmental monitoring optimization problems',
    category: 'exploratory',
    measurableOutcome: 'Demonstrate quantum advantage for specific optimization tasks',
    successCriteria: [
      'Performance improvement > 5% for problem sizes > 16',
      'Successful QAOA implementation',
      'Classical benchmark comparisons'
    ],
    risks: [
      'Current quantum hardware limitations',
      'Noise and error rates',
      'Limited practical applications'
    ]
  }
] as const;

// ==========================================
// TECHNICAL SPECIFICATIONS
// ==========================================

export const TECHNICAL_SPECS: readonly TechnicalSpecification[] = [
  {
    component: 'Satellite Data Processing Pipeline',
    version: '2.1.0',
    purpose: 'Automated processing of satellite observations with atmospheric correction',
    dependencies: ['NumPy', 'Pandas', 'Rasterio', 'GDAL'],
    performance: {
      latency: '< 12 minutes average',
      throughput: '50+ files/hour',
      accuracy: '78-94% correlation with ground truth',
      availability: '99.2% uptime'
    },
    scalability: {
      maxUsers: 150,
      maxDataPoints: 1000000,
      storageRequirements: '500GB+ with compression'
    }
  },
  {
    component: 'Machine Learning Analytics Engine',
    version: '1.8.0',
    purpose: 'Temporal prediction and spatial interpolation using ensemble methods',
    dependencies: ['TensorFlow', 'Scikit-learn', 'PyTorch'],
    performance: {
      latency: '< 2 seconds for predictions',
      throughput: '100+ requests/second',
      accuracy: '87-93% for 24-48 hour forecasts',
      availability: '99.8% uptime'
    },
    scalability: {
      maxUsers: 100,
      maxDataPoints: 10000000,
      storageRequirements: '1TB+ for model storage'
    }
  }
] as const;

// ==========================================
// ANIMATION CONFIGURATIONS
// ==========================================

export const MOTION_VARIANTS: Record<string, MotionVariants> = {
  fadeInUp: {
    hidden: { 
      opacity: 0, 
      y: 60,
      transition: { duration: 0.6, ease: 'easeOut' }
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  },
  
  scaleIn: {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      transition: { duration: 0.4, ease: 'easeOut' }
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    },
    hover: {
      scale: 1.05,
      transition: { duration: 0.2, ease: 'easeInOut' }
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1, ease: 'easeInOut' }
    }
  },
  
  slideInFromLeft: {
    hidden: { 
      opacity: 0, 
      x: -100,
      transition: { duration: 0.5, ease: 'easeOut' }
    },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  },
  
  slideInFromRight: {
    hidden: { 
      opacity: 0, 
      x: 100,
      transition: { duration: 0.5, ease: 'easeOut' }
    },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  },
  
  staggerContainer: {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  },
  
  cardHover: {
    hidden: { 
      rotateX: 0,
      rotateY: 0,
      z: 0
    },
    visible: { 
      rotateX: 0,
      rotateY: 0,
      z: 0
    },
    hover: {
      rotateX: -5,
      rotateY: 5,
      z: 50,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20
      }
    }
  }
} as const;

export const SPRING_CONFIGS: Record<string, SpringConfig> = {
  gentle: {
    tension: 120,
    friction: 14,
    mass: 1,
    precision: 0.01
  },
  
  wobbly: {
    tension: 180,
    friction: 12,
    mass: 1,
    precision: 0.01
  },
  
  stiff: {
    tension: 210,
    friction: 20,
    mass: 1,
    precision: 0.01
  },
  
  slow: {
    tension: 280,
    friction: 60,
    mass: 1,
    precision: 0.01
  },
  
  molasses: {
    tension: 280,
    friction: 120,
    mass: 1,
    precision: 0.01
  }
} as const;

// ==========================================
// UI CONSTANTS
// ==========================================

export const BREAKPOINTS = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px',
  wide: '1400px'
} as const;

export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070
} as const;

export const TRANSITION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700
} as const;

// ==========================================
// API CONSTANTS
// ==========================================

export const API_ENDPOINTS = {
  base: process.env['NEXT_PUBLIC_API_BASE_URL'] || 'https://api.airquality.monitor',
  measurements: '/api/measurements',
  facilities: '/api/facilities',
  predictions: '/api/predictions',
  health: '/api/health',
  analytics: '/api/analytics'
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// ==========================================
// PERFORMANCE CONSTANTS
// ==========================================

export const PERFORMANCE_BUDGETS = {
  maxBundleSize: 512000, // 512KB
  maxImageSize: 1048576, // 1MB
  maxTimeToInteractive: 3500, // 3.5 seconds
  maxFirstContentfulPaint: 1800, // 1.8 seconds
  maxCumulativeLayoutShift: 0.1
} as const;

export const CACHE_DURATIONS = {
  short: 300, // 5 minutes
  medium: 3600, // 1 hour
  long: 86400, // 24 hours
  veryLong: 604800 // 7 days
} as const;

// ==========================================
// SEO CONSTANTS
// ==========================================

export const SEO_CONFIG = {
  defaultTitle: 'Industrial Air Quality Monitoring System',
  titleTemplate: '%s | Air Quality Monitor',
  defaultDescription: 'Advanced industrial air quality monitoring system with quantum-enhanced data processing and real-time satellite observations.',
  siteUrl: 'https://airquality.monitor',
  twitterHandle: '@airqualitymonitor',
  fbAppId: '1234567890',
  defaultImage: '/images/og-image.jpg',
  defaultKeywords: [
    'air quality monitoring',
    'environmental monitoring',
    'industrial emissions',
    'satellite data',
    'quantum computing',
    'machine learning',
    'atmospheric science'
  ]
}

// ==========================================
// ACCESSIBILITY CONSTANTS
// ==========================================

export const A11Y_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End'
} as const;

export const ARIA_LABELS = {
  skipToMain: 'Skip to main content',
  mainNavigation: 'Main navigation',
  socialLinks: 'Social media links',
  contributorCard: 'Team member information',
  featureCard: 'Project feature details',
  closeButton: 'Close dialog',
  menuButton: 'Toggle menu',
  searchButton: 'Search'
} as const;

// ==========================================
// ERROR MESSAGES
// ==========================================

export const ERROR_MESSAGES = {
  generic: 'An unexpected error occurred. Please try again.',
  network: 'Network error. Please check your connection.',
  timeout: 'Request timed out. Please try again.',
  notFound: 'The requested resource was not found.',
  unauthorized: 'You are not authorized to access this resource.',
  forbidden: 'Access to this resource is forbidden.',
  validation: 'Please check your input and try again.',
  serverError: 'Server error. Please try again later.'
} as const;

// ==========================================
// ENVIRONMENT DETECTION
// ==========================================

export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_TEST = process.env.NODE_ENV === 'test';
export const IS_CLIENT = typeof window !== 'undefined';
export const IS_SERVER = !IS_CLIENT;