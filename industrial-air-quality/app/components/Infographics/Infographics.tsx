'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  FiMapPin, 
  FiCpu, 
  FiTrendingUp, 
  FiShield,
  FiGlobe,
  FiZap,
  FiTarget,
  FiLayers
} from 'react-icons/fi';

import { MOTION_VARIANTS, PROJECT_FEATURES } from '@/lib/constants';
import { StatCard } from './StatCard';
import styles from './Infographics.module.css';

// ==========================================
// INFOGRAPHICS DATA
// ==========================================

const keyMetrics = [
  {
    id: 'accuracy',
    value: '91%',
    label: 'ML Prediction Accuracy',
    description: 'LSTM neural networks achieve 91% accuracy for 24-48 hour air quality forecasting',
    icon: FiTarget,
    color: 'var(--color-primary)',
    trend: '+15%',
    trendLabel: 'vs traditional methods'
  },
  {
    id: 'processing',
    value: '15min',
    label: 'Real-time Processing',
    description: 'End-to-end processing latency from satellite data ingestion to analysis results',
    icon: FiZap,
    color: 'var(--color-secondary)',
    trend: '<12min',
    trendLabel: 'average latency'
  },
  {
    id: 'quantum',
    value: '7.2%',
    label: 'Quantum Advantage',
    description: 'Performance improvement using QAOA for sensor network optimization problems',
    icon: FiCpu,
    color: 'var(--color-warning)',
    trend: '20+',
    trendLabel: 'qubit simulations'
  },
  {
    id: 'uptime',
    value: '99.2%',
    label: 'System Uptime',
    description: 'Operational reliability across 12-month deployment with automated recovery',
    icon: FiShield,
    color: 'var(--color-success)',
    trend: '24/7',
    trendLabel: 'continuous monitoring'
  }
] as const;

const technicalStats = [
  {
    category: 'Data Processing',
    stats: [
      { label: 'Satellite Files/Day', value: '50+', unit: '' },
      { label: 'Data Compression', value: '8.2', unit: ':1 ratio' },
      { label: 'Storage Efficiency', value: '500GB', unit: 'with compression' },
      { label: 'Memory Usage', value: '14.2GB', unit: 'peak analysis' }
    ]
  },
  {
    category: 'Performance Metrics',
    stats: [
      { label: 'Response Time', value: '1.8', unit: 'seconds avg' },
      { label: 'Concurrent Users', value: '150', unit: 'max capacity' },
      { label: 'Success Rate', value: '99.8', unit: '% reliability' },
      { label: 'Processing Throughput', value: '124', unit: 'requests/sec' }
    ]
  },
  {
    category: 'Scientific Validation',
    stats: [
      { label: 'Correlation (r)', value: '0.91', unit: 'with ground truth' },
      { label: 'RMSE Error', value: '<20', unit: '% for major pollutants' },
      { label: 'Spatial Resolution', value: '1km', unit: 'grid precision' },
      { label: 'Temporal Coverage', value: '72hr', unit: 'forecast horizon' }
    ]
  }
] as const;

// ==========================================
// INFOGRAPHICS COMPONENT
// ==========================================

export default function Infographics(): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  
  const { ref: sectionRef, inView: sectionInView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const { ref: metricsRef, inView: metricsInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const { ref: featuresRef, inView: featuresInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const { ref: statsRef, inView: statsInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={styles['skeleton']} />;
  }

  return (
    <section 
      className={styles['infographics']} 
      ref={sectionRef}
      aria-labelledby="infographics-heading"
    >
      <div className={styles['container']}>
        {/* Section Header */}
        <motion.div 
          className={styles['header']}
          initial="hidden"
          animate={sectionInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['fadeInUp'] as unknown as import('framer-motion').Variants}
        >
          <h2 id="infographics-heading" className={styles['title']}>
            System <span className={styles['gradientText']}>Performance</span> & Capabilities
          </h2>
          <p className={styles['subtitle']}>
            Real-world performance metrics demonstrating the effectiveness of our 
            quantum-enhanced environmental monitoring platform.
          </p>
        </motion.div>

        {/* Key Metrics Grid */}
        <motion.div 
          className={styles['metricsSection']}
          ref={metricsRef}
          initial="hidden"
          animate={metricsInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['staggerContainer'] as unknown as import('framer-motion').Variants}
        >
          <div className={styles['metricsGrid']}>
            {keyMetrics.map((metric, index) => (
              <StatCard
                key={metric.id}
                metric={metric}
                index={index}
                inView={metricsInView}
              />
            ))}
          </div>
        </motion.div>

        {/* Project Features */}
        <motion.div 
          className={styles['featuresSection']}
          ref={featuresRef}
          initial="hidden"
          animate={featuresInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['staggerContainer'] as unknown as import('framer-motion').Variants}
        >
          <div className={styles['sectionHeader']}>
            <h3 className={styles['sectionTitle']}>Core Technologies</h3>
            <p className={styles['sectionSubtitle']}>
              Advanced systems integration for comprehensive environmental monitoring
            </p>
          </div>

          <div className={styles['featuresGrid']}>
            {PROJECT_FEATURES.map((feature, _index) => {
              const IconComponent = feature.icon === 'satellite' ? FiMapPin :
                                 feature.icon === 'quantum' ? FiCpu :
                                 feature.icon === 'ai' ? FiTrendingUp :
                                 feature.icon === 'visualization' ? FiLayers :
                                 FiGlobe;

              return (
                <motion.div
                  key={feature.id}
                  className={styles['featureCard']}
                  variants={MOTION_VARIANTS['scaleIn'] as unknown as import('framer-motion').Variants}
                  whileHover={{
                    scale: 1.05,
                    rotateX: -5,
                    rotateY: 5,
                    z: 50,
                    transition: { type: 'spring', stiffness: 300, damping: 20 }
                  }}
                >
                  <div className={styles['featureHeader']}>
                    <div className={styles['featureIcon']}>
                      <IconComponent size={24} />
                    </div>
                    <div className={styles['featureStatus']}>
                      <span className={`${styles['statusBadge']} ${styles[`status-${feature.status}`]}`}>
                        {feature.status.replace('-', ' ')}
                      </span>
                      <span className={`${styles['priorityBadge']} ${styles[`priority-${feature.priority}`]}`}>
                        {feature.priority}
                      </span>
                    </div>
                  </div>
                  
                  <h4 className={styles['featureTitle']}>{feature.title}</h4>
                  <p className={styles['featureDescription']}>{feature.description}</p>
                  
                  <div className={styles['featureFooter']}>
                    <span className={styles['featureCategory']}>
                      {feature.category.replace('-', ' ')}
                    </span>
                  </div>
                  
                  <div className={styles['featureGlow']} />
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Technical Statistics - FIXED VERSION */}
        <motion.div 
          className={styles['statsSection']}
          ref={statsRef}
          initial="hidden"
          animate={statsInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['staggerContainer'] as unknown as import('framer-motion').Variants}
        >
          <div className={styles['sectionHeader']}>
            <h3 className={styles['sectionTitle']}>Technical Specifications</h3>
            <p className={styles['sectionSubtitle']}>
              Detailed performance metrics and system capabilities
            </p>
          </div>

          <div className={styles['statsGrid']}>
            {technicalStats.map((category, categoryIndex) => (
              <motion.div
                key={category.category}
                className={styles['statsCategory']}
                variants={MOTION_VARIANTS['slideInFromLeft'] as unknown as import('framer-motion').Variants}
                transition={{ delay: categoryIndex * 0.2 }}
              >
                <div className={styles['categoryHeader']}>
                  <h4 className={styles['categoryTitle']}>{category.category}</h4>
                </div>
                
                <div className={styles['categoryStats']}>
                  {category.stats.map((stat, statIndex) => (
                    <motion.div
                      key={stat.label}
                      className={styles['statItem']}
                      variants={MOTION_VARIANTS['fadeInUp'] as unknown as import('framer-motion').Variants}
                      transition={{ delay: (categoryIndex * 0.2) + (statIndex * 0.1) }}
                    >
                      <div className={styles['statValue']}>
                        <span className={styles['statNumber']}>{stat.value}</span>
                        <span className={styles['statUnit']}>{stat.unit}</span>
                      </div>
                      <div className={styles['statLabel']}>{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Performance Visualization */}
        <motion.div 
          className={styles['visualizationSection']}
          initial="hidden"
          animate={statsInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['fadeInUp'] as unknown as import('framer-motion').Variants}
          transition={{ delay: 0.6 }}
        >
          <div className={styles['visualizationCard']}>
            <div className={styles['visualizationHeader']}>
              <h4 className={styles['visualizationTitle']}>
                System Architecture Overview
              </h4>
              <p className={styles['visualizationSubtitle']}>
                Real-time data flow from satellite ingestion to analysis output
              </p>
            </div>
            
            <div className={styles['visualizationFlow']}>
              <div className={styles['flowStep']}>
                <div className={styles['flowIcon']}>
                  <FiMapPin size={20} />
                </div>
                <span className={styles['flowLabel']}>Satellite Data</span>
              </div>
              
              <div className={styles['flowArrow']} />
              
              <div className={styles['flowStep']}>
                <div className={styles['flowIcon']}>
                  <FiLayers size={20} />
                </div>
                <span className={styles['flowLabel']}>Data Fusion</span>
              </div>
              
              <div className={styles['flowArrow']} />
              
              <div className={styles['flowStep']}>
                <div className={styles['flowIcon']}>
                  <FiCpu size={20} />
                </div>
                <span className={styles['flowLabel']}>ML Analytics</span>
              </div>
              
              <div className={styles['flowArrow']} />
              
              <div className={styles['flowStep']}>
                <div className={styles['flowIcon']}>
                  <FiTrendingUp size={20} />
                </div>
                <span className={styles['flowLabel']}>Insights</span>
              </div>
            </div>
            
            <div className={styles['visualizationStats']}>
              <div className={styles['visualStat']}>
                <span className={styles['visualStatValue']}>2GB</span>
                <span className={styles['visualStatLabel']}>Daily Processing</span>
              </div>
              <div className={styles['visualStat']}>
                <span className={styles['visualStatValue']}>5</span>
                <span className={styles['visualStatLabel']}>Satellite Sources</span>
              </div>
              <div className={styles['visualStat']}>
                <span className={styles['visualStatValue']}>10</span>
                <span className={styles['visualStatLabel']}>Pollutant Types</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}