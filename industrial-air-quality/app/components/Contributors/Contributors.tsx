'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FiGithub, FiMail, FiAward, FiCode, FiUsers } from 'react-icons/fi';

import { MOTION_VARIANTS, CONTRIBUTORS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { ContributorCard } from './ContributorCard';
import styles from './Contributors.module.css';

// ==========================================
// TEAM STATS DATA
// ==========================================

const teamStats = [
  {
    icon: FiUsers,
    value: '4',
    label: 'Team Members',
    description: 'Interdisciplinary experts in CS, ML, and Environmental Science'
  },
  {
    icon: FiCode,
    value: '12+',
    label: 'Months Development',
    description: 'Continuous development and research since January 2024'
  },
  {
    icon: FiAward,
    value: '5+',
    label: 'Key Technologies',
    description: 'Python, TypeScript, Machine Learning, Quantum Computing'
  }
] as const;

// ==========================================
// CONTRIBUTORS COMPONENT
// ==========================================

export default function Contributors(): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  
  const { ref: sectionRef, inView: sectionInView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const { ref: statsRef, inView: statsInView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
  });

  const { ref: teamRef, inView: teamInView } = useInView({
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
      className={styles['contributors']} 
      ref={sectionRef}
      aria-labelledby="contributors-heading"
    >
      <div className={styles['container']}>
        {/* Section Header */}
        <motion.div 
          className={styles['header']}
          initial="hidden"
          animate={sectionInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['fadeInUp'] as unknown as import('framer-motion').Variants}
        >
          <h2 id="contributors-heading" className={styles['title']}>
            Meet Our <span className={styles['gradientText']}>Team</span>
          </h2>
          <p className={styles['subtitle']}>
            Passionate researchers and developers working together to advance 
            environmental monitoring technology through innovation and collaboration.
          </p>
        </motion.div>

        {/* Team Statistics */}
        <motion.div 
          className={styles['statsSection']}
          ref={statsRef}
          initial="hidden"
          animate={statsInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['staggerContainer'] as unknown as import('framer-motion').Variants}
        >
          <div className={styles['statsGrid']}>
            {teamStats.map((stat, _index) => {
              const IconComponent = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  className={styles['statCard']}
                  variants={MOTION_VARIANTS['scaleIn'] as unknown as import('framer-motion').Variants}
                  whileHover={{
                    scale: 1.05,
                    y: -5,
                    transition: { type: 'spring', stiffness: 400, damping: 17 }
                  }}
                >
                  <div className={styles['statIcon']}>
                    <IconComponent size={24} />
                  </div>
                  <div className={styles['statContent']}>
                    <div className={styles['statValue']}>{stat.value}</div>
                    <div className={styles['statLabel']}>{stat.label}</div>
                    <div className={styles['statDescription']}>{stat.description}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Team Members Grid */}
        <motion.div 
          className={styles['teamSection']}
          ref={teamRef}
          initial="hidden"
          animate={teamInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['staggerContainer'] as unknown as import('framer-motion').Variants}
        >
          <div className={styles['sectionHeader']}>
            <h3 className={styles['sectionTitle']}>Core Team</h3>
            <p className={styles['sectionSubtitle']}>
              Meet the talented individuals driving this project forward with their expertise and dedication.
            </p>
          </div>

          <div className={styles['teamGrid']}>
            {CONTRIBUTORS.map((contributor, index) => (
              <ContributorCard
                key={contributor.id}
                contributor={contributor}
                index={index}
                inView={teamInView}
              />
            ))}
          </div>
        </motion.div>

        {/* Team Collaboration */}
        <motion.div 
          className={styles['collaborationSection']}
          initial="hidden"
          animate={teamInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['fadeInUp'] as unknown as import('framer-motion').Variants}
          transition={{ delay: 0.8 }}
        >
          <div className={styles['collaborationCard']}>
            <div className={styles['collaborationContent']}>
              <h4 className={styles['collaborationTitle']}>
                Collaborative Excellence
              </h4>
              <p className={styles['collaborationDescription']}>
                Our interdisciplinary team combines expertise in computer science, environmental 
                engineering, machine learning, and quantum computing to tackle complex challenges 
                in air quality monitoring. Through agile development practices and continuous 
                research, we're building solutions that make a real difference.
              </p>
              
              <div className={styles['collaborationFeatures']}>
                <div className={styles['feature']}>
                  <div className={styles['featureIcon']}></div>
                  <div className={styles['featureText']}>
                    <strong>Agile Development</strong>
                    <span>Sprint-based development with continuous integration</span>
                  </div>
                </div>
                
                <div className={styles['feature']}>
                  <div className={styles['featureIcon']}></div>
                  <div className={styles['featureText']}>
                    <strong>Research-Driven</strong>
                    <span>Evidence-based solutions with peer review process</span>
                  </div>
                </div>
                
                <div className={styles['feature']}>
                  <div className={styles['featureIcon']}></div>
                  <div className={styles['featureText']}>
                    <strong>Open Source</strong>
                    <span>Transparent development for global accessibility</span>
                  </div>
                </div>
              </div>

              <div className={styles['collaborationActions']}>
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<FiGithub />}
                  href="https://github.com/air-quality-team"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Source Code
                </Button>
                
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<FiMail />}
                  href="mailto:team@airquality.monitor"
                >
                  Contact Team
                </Button>
              </div>
            </div>
            
            <div className={styles['collaborationVisual']}>
              <div className={styles['networkNode']} />
              <div className={styles['networkNode']} />
              <div className={styles['networkNode']} />
              <div className={styles['networkNode']} />
              <div className={styles['connectionLine']} />
              <div className={styles['connectionLine']} />
              <div className={styles['connectionLine']} />
            </div>
          </div>
        </motion.div>

        {/* Acknowledgments */}
        <motion.div 
          className={styles['acknowledgments']}
          initial="hidden"
          animate={teamInView ? "visible" : "hidden"}
          variants={MOTION_VARIANTS['fadeInUp'] as unknown as import('framer-motion').Variants}
          transition={{ delay: 1.0 }}
        >
          <div className={styles['acknowledgmentCard']}>
            <h4 className={styles['acknowledgmentTitle']}>Special Thanks</h4>
            <p className={styles['acknowledgmentText']}>
              We extend our gratitude to <strong>Graphic Era Hill University</strong> for 
              providing the academic framework and research support that made this project possible. 
              Special recognition to our supervisor <strong>Dr. Susheela Dahiya</strong> for her 
              invaluable guidance and expertise in environmental informatics.
            </p>
            
            <div className={styles['institutionInfo']}>
              <div className={styles['institutionLogo']}>🎓</div>
              <div className={styles['institutionDetails']}>
                <div className={styles['institutionName']}>Graphic Era Hill University</div>
                <div className={styles['institutionDept']}>Department of Computer Science & Engineering</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}