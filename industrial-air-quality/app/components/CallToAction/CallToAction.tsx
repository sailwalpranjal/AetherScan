'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  FiMapPin, 
  FiPlay, 
  FiDownload, 
  FiGithub, 
  FiMail, 
  FiExternalLink,
  FiArrowUp,
  FiStar} from 'react-icons/fi';

import { MOTION_VARIANTS, APP_METADATA } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import styles from './CallToAction.module.css';

// ==========================================
// CTA DATA
// ==========================================

const ctaOptions = [
  {
    id: 'explore',
    title: 'Explore Interactive Map',
    description: 'Experience real-time air quality monitoring with our interactive dashboard featuring satellite data and ML predictions.',
    icon: FiMapPin,
    action: 'primary',
    href: '/Map',
    external: true
  },
  {
    id: 'demo',
    title: 'Watch Live Demo',
    description: 'See the system in action with our comprehensive demonstration of quantum-enhanced processing capabilities.',
    icon: FiPlay,
    action: 'secondary',
    href: '#vision-section',
    external: false
  },
  {
    id: 'source',
    title: 'View Source Code',
    description: 'Access our open-source repository and contribute to advancing environmental monitoring technology.',
    icon: FiGithub,
    action: 'outline',
    href: 'https://github.com/sailwalpranjal/AetherScan',
    external: true
  }
] as const;

const quickStats = [
  {
    label: 'Open Source',
    value: '100%',
    description: 'Fully open-source for global accessibility'
  },
  {
    label: 'Real-time',
    value: '24/7',
    description: 'Continuous monitoring and analysis'
  },
  {
    label: 'Accuracy',
    value: '91%',
    description: 'Machine learning prediction accuracy'
  }
] as const;

// ==========================================
// CALL TO ACTION COMPONENT
// ==========================================

export default function CallToAction(): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  
  const { ref: sectionRef } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const { ref: ctaRef, inView: ctaInView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
  });

  const { ref: footerRef, inView: footerInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  // ==========================================
  // HANDLERS
  // ==========================================

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  const handleOptionClick = useCallback((option: typeof ctaOptions[number]) => {
    if (!option.external && option.href.startsWith('#')) {
      const element = document.querySelector(option.href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={styles['skeleton']} />;
  }

  return (
    <section 
      className={styles['callToAction']} 
      ref={sectionRef}
      aria-labelledby="cta-heading"
    >
      <div className={styles['container']}>
        {/* Main CTA Section */}
        <motion.div 
          className={styles['ctaContent']}
          ref={ctaRef}
          initial="hidden"
          animate={ctaInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['staggerContainer'] as unknown as import('framer-motion').Variants}
        >
          {/* Header */}
          <motion.div 
            className={styles['ctaHeader']}
            variants={MOTION_VARIANTS['fadeInUp'] as unknown as import('framer-motion').Variants}
          >
            <h2 id="cta-heading" className={styles['ctaTitle']}>
              Ready to <span className={styles['gradientText']}>Transform</span> Environmental Monitoring?
            </h2>
            <p className={styles['ctaSubtitle']}>
              Join us in revolutionizing air quality monitoring with cutting-edge technology. 
              Experience the power of quantum-enhanced environmental science.
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div 
            className={styles['statsBar']}
            variants={MOTION_VARIANTS['slideInFromLeft'] as unknown as import('framer-motion').Variants}
          >
            {quickStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className={styles['quickStat']}
                variants={MOTION_VARIANTS['scaleIn'] as unknown as import('framer-motion').Variants}
                transition={{ delay: index * 0.1 }}
              >
                <div className={styles['statValue']}>{stat.value}</div>
                <div className={styles['statLabel']}>{stat.label}</div>
                <div className={styles['statDesc']}>{stat.description}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Options */}
          <motion.div 
            className={styles['ctaOptions']}
            variants={MOTION_VARIANTS['staggerContainer'] as unknown as import('framer-motion').Variants}
          >
            {ctaOptions.map((option) => {
              const IconComponent = option.icon;

              return (
                <motion.div
                  key={option.id}
                  className={styles['ctaOption']}
                  variants={MOTION_VARIANTS['scaleIn'] as unknown as import('framer-motion').Variants}
                  whileHover={{
                    scale: 1.03,
                    y: -5,
                    transition: { type: 'spring', stiffness: 300, damping: 20 }
                  }}
                >
                  <div className={styles['optionIcon']}>
                    <IconComponent size={24} />
                  </div>
                  
                  <div className={styles['optionContent']}>
                    <h3 className={styles['optionTitle']}>{option.title}</h3>
                    <p className={styles['optionDescription']}>{option.description}</p>
                  </div>

                  <div className={styles['optionAction']}>
                    <Button
                      variant={option.action as any}
                      size="lg"
                      rightIcon={option.external ? <FiExternalLink /> : undefined}
                      href={option.external ? option.href : ''}
                      onClick={() => handleOptionClick(option)}
                      target={option.external ? '_blank' : '_self'}
                      rel={option.external ? 'noopener noreferrer' : ''}
                      fullWidth
                      {...({} as React.ComponentProps<typeof Button>)}
                    >Get Started</Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Additional Resources */}
          <motion.div 
            className={styles['resources']}
            variants={MOTION_VARIANTS['fadeInUp'] as unknown as import('framer-motion').Variants}
          >
            <div className={styles['resourcesHeader']}>
              <h3 className={styles['resourcesTitle']}>Additional Resources</h3>
              <p className={styles['resourcesSubtitle']}>
                Explore documentation, research papers, and technical specifications
              </p>
            </div>
            
            <div className={styles['resourceLinks']}>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<FiDownload />}
                href="/docs/technical-specifications.pdf"
                target="_blank"
              >
                Technical Docs
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<FiStar />}
                href="https://github.com/sailwalpranjal/AetherScan"
                target="_blank"
                rel="noopener noreferrer"
              >
                Star on GitHub
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<FiMail />}
                href="mailto:team@airquality.monitor"
              >
                Contact Us
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* IMPROVED Footer Section */}
        <motion.footer 
          className={styles['footer']}
          ref={footerRef}
          initial="hidden"
          animate={footerInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['fadeInUp'] as unknown as import('framer-motion').Variants}
        >
          <div className={styles['footerMain']}>
            <div className={styles['footerLeft']}>
              <div className={styles['footerBrand']}>
                <h4 className={styles['brandName']}>{APP_METADATA.name}</h4>
                <p className={styles['brandDescription']}>
                  Advancing environmental science through quantum-enhanced monitoring technology
                </p>
              </div>
            </div>
            
            <div className={styles['footerRight']}>
              <div className={styles['footerMeta']}>
                <div className={styles['metaGroup']}>
                  <div className={styles['metaItem']}>
                    <span className={styles['metaLabel']}>Version:</span>
                    <span className={styles['metaValue']}>{APP_METADATA.version}</span>
                  </div>
                  
                  <div className={styles['metaItem']}>
                    <span className={styles['metaLabel']}>License:</span>
                    <span className={styles['metaValue']}>{APP_METADATA.license}</span>
                  </div>
                  
                  <div className={styles['metaItem']}>
                    <span className={styles['metaLabel']}>Last Updated:</span>
                    <span className={styles['metaValue']}>September 2024</span>
                  </div>
                </div>
                
                <div className={styles['footerActions']}>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<FiArrowUp />}
                    onClick={scrollToTop}
                    ariaLabel="Scroll back to top of page"
                  >
                    Back to Top
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles['footerDivider']} />
          
          <div className={styles['footerBottom']}>
            <div className={styles['footerBottomLeft']}>
              <p className={styles['copyright']}>
                © 2024 {APP_METADATA.authors.join(', ')}. All rights reserved.
              </p>
            </div>
            
            <div className={styles['footerBottomRight']}>
              <div className={styles['footerLinks']}>
                <a href="/privacy" className={styles['footerLink']}>Privacy Policy</a>
                <a href="/terms" className={styles['footerLink']}>Terms of Service</a>
                <a href="/accessibility" className={styles['footerLink']}>Accessibility</a>
              </div>
            </div>
          </div>
        </motion.footer>

        {/* Background Elements */}
        <div className={styles['backgroundElements']}>
          <motion.div 
            className={styles['floatingElement1']}
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 5, 0]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          />
          
          <motion.div 
            className={styles['floatingElement2']}
            animate={{ 
              y: [0, 25, 0],
              rotate: [0, -3, 0]
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              ease: 'easeInOut',
              delay: 2
            }}
          />
        </div>
      </div>
    </section>
  );
}