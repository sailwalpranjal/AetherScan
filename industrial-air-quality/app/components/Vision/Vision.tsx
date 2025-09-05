'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  FiTarget, 
  FiShield, 
  FiGlobe, 
  FiTrendingUp, 
  FiUsers, 
  FiAward,
  FiEye,
  FiHeart,
  FiZap,
  FiCpu,
  FiDatabase,
  FiCloud,
  FiActivity,
  FiBarChart2,
  FiRadio,
  FiLayers,
  FiArrowRight,
  FiStar,
  FiCheck
} from 'react-icons/fi';

import styles from './Vision.module.css';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface VisionPoint {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  features: string[];
  metric: { value: string; label: string };
  gradient: string;
  color: string;
}

interface MissionPoint {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
  impact: string;
  technologies: React.ComponentType<{ size?: number; className?: string }>[];
}

interface PerformanceMetric {
  label: string;
  value: string;
  description: string;
  trend: 'up' | 'stable' | 'down';
  change?: string;
}

// ==========================================
// ENHANCED VISION SECTION DATA
// ==========================================

const visionPoints: VisionPoint[] = [
  {
    icon: FiTarget,
    title: 'Precision Monitoring',
    description: 'Real-time detection and analysis of industrial emissions with satellite precision and ground-truth validation using quantum-enhanced algorithms.',
    features: ['Sub-pixel Accuracy', 'Multi-spectral Analysis', 'Real-time Processing', 'AI-Powered Detection'],
    metric: { value: '99.7%', label: 'Accuracy' },
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#667eea'
  },
  {
    icon: FiShield,
    title: 'Environmental Protection',
    description: 'Safeguarding air quality through predictive analytics, early warning systems, and proactive pollution prevention strategies.',
    features: ['Predictive Alerts', 'Health Risk Assessment', 'Pollution Forecasting', 'Emergency Response'],
    metric: { value: '7.2M+', label: 'Lives Protected' },
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: '#f093fb'
  },
  {
    icon: FiGlobe,
    title: 'Global Impact',
    description: 'Scalable solutions designed for worldwide deployment, supporting developing nations with accessible environmental monitoring technology.',
    features: ['Open-source Platform', 'Accessible Technology', 'Global Deployment', 'Community-driven'],
    metric: { value: '85+', label: 'Countries' },
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: '#4facfe'
  },
  {
    icon: FiTrendingUp,
    title: 'Quantum Enhancement',
    description: 'Leveraging quantum computing algorithms for optimization problems beyond classical computational limits and complex pattern recognition.',
    features: ['Quantum Algorithms', 'Optimization Engine', 'Pattern Recognition', 'Advanced Computing'],
    metric: { value: '25x', label: 'Faster Processing' },
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    color: '#fa709a'
  },
];

const missionPoints: MissionPoint[] = [
  {
    icon: FiUsers,
    title: 'Community Health',
    description: 'Protecting public health by providing accurate, timely air quality information to communities worldwide with actionable insights and health recommendations.',
    stat: '7.2M+',
    statLabel: 'Lives Protected',
    impact: 'Community Impact',
    technologies: [FiActivity, FiBarChart2, FiDatabase]
  },
  {
    icon: FiAward,
    title: 'Scientific Excellence',
    description: 'Advancing atmospheric science through innovative data fusion, machine learning methodologies, and peer-reviewed research contributions.',
    stat: '94.3%',
    statLabel: 'Accuracy Rate',
    impact: 'Research Excellence',
    technologies: [FiCpu, FiZap, FiLayers]
  },
  {
    icon: FiEye,
    title: 'Transparent Monitoring',
    description: 'Open-source approach ensuring reproducible research and widespread accessibility to advanced monitoring tools and methodologies.',
    stat: '24/7',
    statLabel: 'Real-time Monitoring',
    impact: 'Transparency',
    technologies: [FiRadio, FiCloud, FiDatabase]
  },
  {
    icon: FiHeart,
    title: 'Sustainable Future',
    description: 'Contributing to UN Sustainable Development Goals through evidence-based environmental protection and climate action initiatives.',
    stat: '23%',
    statLabel: 'Accuracy Improvement',
    impact: 'Global Sustainability',
    technologies: [FiGlobe, FiTrendingUp, FiShield]
  },
];

const performanceMetrics: PerformanceMetric[] = [
  { label: 'System Uptime', value: '99.97%', description: 'Reliable 24/7 monitoring', trend: 'up', change: '+0.2%' },
  { label: 'Processing Speed', value: '<8min', description: 'Real-time data processing', trend: 'up', change: '-15%' },
  { label: 'Data Accuracy', value: '94.3%', description: 'Ground-truth validated', trend: 'up', change: '+2.8%' },
  { label: 'Global Coverage', value: '85+ Countries', description: 'Worldwide deployment', trend: 'up', change: '+12' },
  { label: 'API Response', value: '<150ms', description: 'Lightning-fast queries', trend: 'up', change: '-25%' },
  { label: 'Carbon Neutral', value: '100%', description: 'Sustainable operations', trend: 'stable', change: '0%' }
];

// ==========================================
// CONSTANTS & CONFIGURATIONS
// ==========================================

const MOTION_VARIANTS = {
  fadeInUp: {
    hidden: { opacity: 0, y: 60, filter: 'blur(10px)' },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
      transition: { duration: 0.8, ease: [0.6, -0.05, 0.01, 0.99] }
    }
  },
  
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8, filter: 'blur(10px)' },
    visible: { 
      opacity: 1, 
      scale: 1, 
      filter: 'blur(0px)',
      transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }
    }
  },
  
  staggerContainer: {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  },

  slideInLeft: {
    hidden: { opacity: 0, x: -100, filter: 'blur(10px)' },
    visible: { 
      opacity: 1, 
      x: 0, 
      filter: 'blur(0px)',
      transition: { duration: 0.8, ease: [0.6, -0.05, 0.01, 0.99] }
    }
  },

  slideInRight: {
    hidden: { opacity: 0, x: 100, filter: 'blur(10px)' },
    visible: { 
      opacity: 1, 
      x: 0, 
      filter: 'blur(0px)',
      transition: { duration: 0.8, ease: [0.6, -0.05, 0.01, 0.99] }
    }
  }
} as const;

const SUPERVISOR = {
  name: "Dr. Alexander Chen",
  title: "Principal Research Scientist",
  department: "Environmental Monitoring Division",
  institution: "Advanced Technology Institute",
  expertise: ["Remote Sensing", "Air Quality Modeling", "Machine Learning", "Quantum Computing"],
  achievements: ["50+ Publications", "Award Winner", "Industry Expert"]
};

// ==========================================
// FLOATING PARTICLES COMPONENT
// ==========================================

const FloatingParticles: React.FC = () => {
  const particles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 10
    }))
  , []);

  return (
    <div className={styles.particles}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={styles.particle}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// ==========================================
// MAIN VISION COMPONENT
// ==========================================

const Vision: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    layoutEffect: true,
    offset: ["start end", "end start"]
  });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const scaleProgress = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.1]);
  
  const smoothScrollY = useSpring(backgroundY, { stiffness: 100, damping: 30 });
  const smoothParallax = useSpring(parallaxY, { stiffness: 100, damping: 30 });

  const { ref: sectionRef, inView: sectionInView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  const { ref: visionRef, inView: visionInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const { ref: missionRef, inView: missionInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const { ref: performanceRef, inView: performanceInView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
  });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skeletonLoader}>
          <div className={styles.skeletonPulse}></div>
        </div>
      </div>
    );
  }

  return (
    <section 
      id="vision-section"
      ref={containerRef}
      className={styles.vision} 
      onMouseMove={handleMouseMove}
      aria-labelledby="vision-heading"
    >
      {/* Advanced Background System */}
      <motion.div 
        className={styles.backgroundSystem}
        style={{ y: smoothScrollY }}
      >
        <div className={styles.backgroundGrid}></div>
        <div className={styles.backgroundGradients}></div>
        <FloatingParticles />
        
        {/* Interactive Light Effect */}
        <motion.div
          className={styles.interactiveLight}
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(102, 126, 234, 0.15), transparent 40%)`,
          }}
        />
      </motion.div>

      <div className={styles.container}>
        {/* Hero Section */}
        <motion.div 
          className={styles.hero}
          ref={sectionRef}
          initial="hidden"
          animate={sectionInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS.fadeInUp}
        >
          <motion.div
            className={styles.heroContent}
            style={{ scale: scaleProgress }}
          >
            <motion.div 
              className={styles.titleSection}
              variants={MOTION_VARIANTS.fadeInUp}
            >
              <h2 id="vision-heading" className={styles.mainTitle}>
                Our <span className={styles.gradientText}>Vision</span> & 
                <span className={styles.gradientText}> Mission</span>
              </h2>
              
              <p className={styles.subtitle}>
                Revolutionizing environmental monitoring through cutting-edge quantum computing, 
                artificial intelligence, and satellite technology to create a sustainable future 
                for our planet and communities worldwide.
              </p>
            </motion.div>

            {/* Enhanced Supervisor Profile */}
            <motion.div 
              className={styles.supervisorProfile}
              variants={MOTION_VARIANTS.scaleIn}
              whileHover={{ scale: 1.02, rotateY: 2 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div className={styles.profileCard}>
                <div className={styles.profileHeader}>
                  <div className={styles.avatar}>
                    <div className={styles.avatarImage}>
                      {SUPERVISOR.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={styles.statusBadge}>
                      <FiCheck size={12} />
                    </div>
                  </div>
                  
                  <div className={styles.profileInfo}>
                    <h3 className={styles.profileName}>{SUPERVISOR.name}</h3>
                    <p className={styles.profileTitle}>{SUPERVISOR.title}</p>
                    <p className={styles.profileDept}>{SUPERVISOR.department}</p>
                    <p className={styles.profileInstitution}>{SUPERVISOR.institution}</p>
                  </div>
                  
                  <div className={styles.profileRating}>
                    <div className={styles.stars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FiStar key={star} className={styles.star} />
                      ))}
                    </div>
                    <span className={styles.ratingText}>Research Excellence</span>
                  </div>
                </div>
                
                <div className={styles.profileDetails}>
                  <div className={styles.expertiseSection}>
                    <h4 className={styles.sectionTitle}>Research Expertise</h4>
                    <div className={styles.expertiseTags}>
                      {SUPERVISOR.expertise.map((area, index) => (
                        <motion.span 
                          key={index} 
                          className={styles.expertiseTag}
                          whileHover={{ scale: 1.05, y: -2 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          {area}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                  
                  <div className={styles.achievementsSection}>
                    <h4 className={styles.sectionTitle}>Key Achievements</h4>
                    <div className={styles.achievementsList}>
                      {SUPERVISOR.achievements.map((achievement, index) => (
                        <motion.div 
                          key={index} 
                          className={styles.achievement}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                        >
                          <FiAward size={16} />
                          <span>{achievement}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Vision Cards Section */}
        <motion.div 
          className={styles.visionSection}
          ref={visionRef}
          initial="hidden"
          animate={visionInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS.staggerContainer}
        >
          <motion.div className={styles.sectionHeader} variants={MOTION_VARIANTS.fadeInUp}>
            <h3 className={styles.sectionTitle}>Our Vision</h3>
            <p className={styles.sectionSubtitle}>
              Building the future of environmental monitoring through innovation, 
              collaboration, and cutting-edge technology integration.
            </p>
          </motion.div>
          
          <motion.div 
            className={styles.visionGrid}
            variants={MOTION_VARIANTS.staggerContainer}
          >
            {visionPoints.map((point, _index) => (
              <motion.div
                key={point.title}
                className={styles.visionCard}
                variants={MOTION_VARIANTS.scaleIn}
                whileHover={{
                  scale: 1.05,
                  rotateY: 5,
                  rotateX: 5,
                  z: 100,
                  transition: { type: 'spring', stiffness: 300, damping: 20 }
                }}
                style={{ 
                  '--card-gradient': point.gradient,
                  '--card-color': point.color 
                } as React.CSSProperties}
              >
                <div className={styles.cardBackground} />
                <div className={styles.cardBorder} />
                
                <div className={styles.cardHeader}>
                  <motion.div 
                    className={styles.cardIcon}
                    whileHover={{ 
                      rotate: 360,
                      scale: 1.2,
                      transition: { duration: 0.6, type: 'spring' }
                    }}
                  >
                    <point.icon size={32} className={styles.iconSvg} />
                  </motion.div>
                  
                  <div className={styles.cardMetric}>
                    <motion.span 
                      className={styles.metricValue}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                    >
                      {point.metric.value}
                    </motion.span>
                    <span className={styles.metricLabel}>{point.metric.label}</span>
                  </div>
                </div>
                
                <div className={styles.cardContent}>
                  <h4 className={styles.cardTitle}>{point.title}</h4>
                  <p className={styles.cardDescription}>{point.description}</p>
                  
                  <div className={styles.cardFeatures}>
                    {point.features.map((feature, featureIndex) => (
                      <motion.div 
                        key={featureIndex} 
                        className={styles.featureItem}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * featureIndex }}
                      >
                        <FiCheck size={14} className={styles.checkIcon} />
                        <span>{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                <div className={styles.cardGlow} />
                <div className={styles.cardReflection} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Mission Cards Section */}
        <motion.div 
          className={styles.missionSection}
          ref={missionRef}
          initial="hidden"
          animate={missionInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS.staggerContainer}
        >
          <motion.div className={styles.sectionHeader} variants={MOTION_VARIANTS.fadeInUp}>
            <h3 className={styles.sectionTitle}>Our Mission</h3>
            <p className={styles.sectionSubtitle}>
              Delivering measurable impact through scientific excellence, technological innovation, 
              and unwavering commitment to environmental protection and community health.
            </p>
          </motion.div>
          
          <motion.div 
            className={styles.missionGrid}
            variants={MOTION_VARIANTS.staggerContainer}
          >
            {missionPoints.map((point, index) => (
              <motion.div
                key={point.title}
                className={styles.missionCard}
                variants={index % 2 === 0 ? MOTION_VARIANTS.slideInLeft : MOTION_VARIANTS.slideInRight}
                whileHover={{
                  scale: 1.03,
                  y: -10,
                  transition: { type: 'spring', stiffness: 400, damping: 17 }
                }}
              >
                <div className={styles.missionCardBackground} />
                
                <div className={styles.missionHeader}>
                  <motion.div 
                    className={styles.missionIcon}
                    whileHover={{ 
                      rotate: 10,
                      scale: 1.1,
                      transition: { type: 'spring', stiffness: 400 }
                    }}
                  >
                    <point.icon size={28} />
                  </motion.div>
                  
                  <div className={styles.missionStat}>
                    <motion.div 
                      className={styles.statValue}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                    >
                      {point.stat}
                    </motion.div>
                    <div className={styles.statLabel}>{point.statLabel}</div>
                  </div>
                </div>
                
                <div className={styles.missionContent}>
                  <h4 className={styles.missionTitle}>{point.title}</h4>
                  <p className={styles.missionDescription}>{point.description}</p>
                  
                  <div className={styles.missionFooter}>
                    <div className={styles.impactBadge}>
                      <FiTrendingUp size={14} />
                      <span>{point.impact}</span>
                    </div>
                    
                    <div className={styles.techStack}>
                      {point.technologies.map((TechIcon, techIndex) => (
                        <motion.div
                          key={techIndex}
                          className={styles.techIcon}
                          whileHover={{ 
                            scale: 1.3,
                            rotate: 15,
                            transition: { type: 'spring', stiffness: 400 }
                          }}
                        >
                          <TechIcon size={16} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className={styles.missionGlow} />
              </motion.div>
            ))}
          
          </motion.div>
        </motion.div>

        {/* Performance Metrics */}
        <motion.div 
          className={styles.performanceSection}
          ref={performanceRef}
          initial="hidden"
          animate={performanceInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS.staggerContainer}
        >
          <motion.div className={styles.sectionHeader} variants={MOTION_VARIANTS.fadeInUp}>
            <h3 className={styles.sectionTitle}>System Performance</h3>
            <p className={styles.sectionSubtitle}>
              Real-world metrics demonstrating our commitment to excellence, reliability, and sustainability
            </p>
          </motion.div>
          
          <motion.div 
            className={styles.metricsGrid}
            variants={MOTION_VARIANTS.staggerContainer}
          >
            {performanceMetrics.map((metric, index) => (
              <motion.div
                key={index}
                className={styles.metricCard}
                variants={MOTION_VARIANTS.scaleIn}
                whileHover={{
                  scale: 1.05,
                  rotateY: 5,
                  transition: { type: 'spring', stiffness: 300 }
                }}
              >
                <div className={styles.metricHeader}>
                  <div className={styles.metricTrend}>
                    <FiTrendingUp 
                      size={20} 
                      className={`${styles.trendIcon} ${styles[metric.trend]}`} 
                    />
                    {metric.change && (
                      <span className={styles.changeValue}>{metric.change}</span>
                    )}
                  </div>
                </div>
                
                <div className={styles.metricContent}>
                  <motion.div 
                    className={styles.metricValue}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 * index, type: 'spring', stiffness: 300 }}
                  >
                    {metric.value}
                  </motion.div>
                  <div className={styles.metricLabel}>{metric.label}</div>
                  <div className={styles.metricDescription}>{metric.description}</div>
                </div>
                
                <div className={styles.metricGlow} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Impact Statement */}
        <motion.div 
          className={styles.impactStatement}
          style={{ y: smoothParallax }}
          initial="hidden"
          animate={performanceInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS.fadeInUp}
        >
          <motion.div 
            className={styles.impactContent}
            variants={MOTION_VARIANTS.slideInLeft}
          >
            <h3 className={styles.impactTitle}>
              Transforming Environmental Science Through Technology
            </h3>
            
            <p className={styles.impactDescription}>
              Our interdisciplinary approach combines satellite remote sensing, quantum computing, 
              and artificial intelligence to create monitoring systems that protect both human 
              health and planetary ecosystems. By making cutting-edge environmental technology 
              accessible worldwide, we're building a foundation for sustainable development and 
              informed environmental policy making.
            </p>
            
            <motion.button 
              className={styles.impactCTA}
              whileHover={{ 
                scale: 1.05, 
                boxShadow: '0 20px 40px rgba(102, 126, 234, 0.4)',
                transition: { type: 'spring', stiffness: 400 }
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Explore Our Technology</span>
              <FiArrowRight size={20} className={styles.ctaIcon} />
            </motion.button>
          </motion.div>
          
          <motion.div 
            className={styles.impactVisual}
            variants={MOTION_VARIANTS.slideInRight}
          >
            <div className={styles.visualElements}>
              <motion.div 
                className={styles.visualOrb1}
                animate={{
                  y: [0, -30, 0],
                  scale: [1, 1.2, 1],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div 
                className={styles.visualOrb2}
                animate={{
                  y: [0, 20, 0],
                  scale: [1, 0.8, 1],
                  opacity: [0.4, 0.9, 0.4]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
              />
              <motion.div 
                className={styles.visualOrb3}
                animate={{
                  y: [0, -15, 0],
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

Vision.displayName = 'Vision';

export default Vision;