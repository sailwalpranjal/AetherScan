'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { FiGithub, FiLinkedin, FiMail, FiExternalLink } from 'react-icons/fi';

import type { Contributor, SocialLink } from '@/lib/types';
import { MOTION_VARIANTS } from '@/lib/constants';
import { ReactElement, JSXElementConstructor, ReactNode, ReactPortal, AwaitedReactNode, Key } from 'react';

// ==========================================
// TYPES
// ==========================================

interface ContributorCardProps {
  readonly contributor: Contributor;
  readonly index: number;
  readonly inView: boolean;
}

// ==========================================
// CONTRIBUTOR CARD COMPONENT
// ==========================================

export function ContributorCard({ 
  contributor, 
  index}: ContributorCardProps): React.JSX.Element {
  
  const getIconForPlatform = (platform: string) => {
    switch (platform) {
      case 'github': return FiGithub;
      case 'linkedin': return FiLinkedin;
      case 'email': return FiMail;
      default: return FiExternalLink;
    }
  };

  return (
    <motion.div
      className="contributor-card"
      variants={MOTION_VARIANTS['scaleIn'] as unknown as import('framer-motion').Variants}
      style={{'--animation-delay': `${index * 0.1}s`,} as import('framer-motion').MotionStyle}
      whileHover={{
        scale: 1.03,
        rotateX: -5,
        rotateY: 5,
        z: 50,
        transition: { 
          type: 'spring', 
          stiffness: 300, 
          damping: 20 
        }
      }}
      whileTap={{ scale: 0.98 }}
      role="article"
      aria-labelledby={`contributor-${contributor.id}-name`}
      aria-describedby={`contributor-${contributor.id}-bio`}
    >
      {/* Card Background Glow */}
      <div className="card-glow" />
      
      {/* Profile Image */}
      <div className="profile-section">
        <div className="profile-image-container">
          <Image
            src={contributor.avatar}
            alt={`${contributor.name} profile picture`}
            width={120}
            height={120}
            className="profile-image"
            priority={index < 2} // Prioritize first 2 images for LCP
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGxwf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R0p+blFm4GzZN/GV+sF/9k="
          />
          
          {/* Status indicator */}
          <div className={`status-indicator ${contributor.isActive ? 'active' : 'inactive'}`}>
            <span className="status-dot" />
          </div>
        </div>
        
        {/* Role badge */}
        <div className="role-badge">
          {contributor.role.includes('Lead') ? '' : ''}
        </div>
      </div>

      {/* Basic Information */}
      <div className="info-section">
        <h3 
          id={`contributor-${contributor.id}-name`}
          className="contributor-name"
        >
          {contributor.name}
        </h3>
        
        <p className="contributor-role">{contributor.role}</p>
        
        <div className="contributor-details">
          <span className="detail-item">
            <strong>Section:</strong> {contributor.section}
          </span>
          <span className="detail-item">
            <strong>Roll No:</strong> {contributor.universityRollNo}
          </span>
        </div>
      </div>

      {/* Bio */}
      <p 
        id={`contributor-${contributor.id}-bio`}
        className="contributor-bio"
      >
        {contributor.bio}
      </p>

      {/* Expertise Tags */}
      <div className="expertise-section">
        <h4 className="expertise-title">Expertise</h4>
        <div className="expertise-tags">
          {contributor.expertise.slice(0, 3).map((skill: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined, skillIndex: Key | null | undefined) => (
            <span 
              key={skillIndex} 
              className="expertise-tag"
            >
              {skill}
            </span>
          ))}
          {contributor.expertise.length > 3 && (
            <span className="expertise-tag more">
              +{contributor.expertise.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Achievements */}
      {contributor.achievements.length > 0 && (
        <div className="achievements-section">
          <h4 className="achievements-title">Key Achievements</h4>
          <ul className="achievements-list">
            {contributor.achievements.slice(0, 2).map((achievement: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined, achIndex: Key | null | undefined) => (
              <li key={achIndex} className="achievement-item">
                {achievement}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Social Links */}
      <div className="social-section">
        <h4 className="social-title">Connect</h4>
        <div className="social-links">
          {contributor.socialLinks.map((link: SocialLink, linkIndex)=> {
            if (!link.url) return null;
            const IconComponent = getIconForPlatform(link.platform);
            return (
              <motion.a
                key={linkIndex}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                aria-label={link.label}
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <IconComponent size={18} />
              </motion.a>
            );
          })}
        </div>
      </div>

      <style>{`
        .contributor-card {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: var(--space-xl);
          background: var(--glass-bg);
          backdrop-filter: var(--glass-backdrop-filter);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius-2xl);
          box-shadow: var(--glass-shadow);
          cursor: pointer;
          overflow: hidden;
          transition: all var(--transition-normal);
          transform-style: preserve-3d;
          min-height: 480px;
        }

        .contributor-card:hover {
          border-color: var(--color-primary);
          box-shadow: 
            var(--glass-shadow),
            0 0 30px rgba(0, 212, 170, 0.2);
        }

        .card-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, var(--color-primary) 0%, transparent 70%);
          opacity: 0;
          filter: blur(60px);
          transform: translate(-50%, -50%);
          transition: opacity var(--transition-slow);
          z-index: -1;
        }

        .contributor-card:hover .card-glow {
          opacity: 0.08;
        }

        /* Profile Section */
        .profile-section {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: var(--space-lg);
        }

        .profile-image-container {
          position: relative;
          margin-bottom: var(--space-md);
        }

        .profile-image {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 3px solid var(--color-primary);
          transition: all var(--transition-normal);
          object-fit: cover;
        }

        .contributor-card:hover .profile-image {
          border-color: var(--color-primary-light);
          box-shadow: 0 0 20px rgba(0, 212, 170, 0.4);
        }

        .status-indicator {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          background: var(--color-surface-elevated);
          border: 2px solid var(--color-text-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-success);
        }

        .status-indicator.inactive .status-dot {
          background: var(--color-text-muted);
        }

        .role-badge {
          position: absolute;
          top: -10px;
          right: -5px;
          font-size: var(--font-size-lg);
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        /* Info Section */
        .info-section {
          text-align: center;
          margin-bottom: var(--space-lg);
        }

        .contributor-name {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-xs);
          line-height: var(--line-height-tight);
        }

        .contributor-role {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-medium);
          color: var(--color-primary);
          margin-bottom: var(--space-sm);
          line-height: var(--line-height-normal);
        }

        .contributor-details {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .detail-item {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .detail-item strong {
          color: var(--color-text-primary);
        }

        /* Bio */
        .contributor-bio {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          line-height: var(--line-height-relaxed);
          margin-bottom: var(--space-lg);
          text-align: center;
          flex-grow: 1;
        }

        /* Expertise Section */
        .expertise-section {
          margin-bottom: var(--space-lg);
        }

        .expertise-title {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-sm);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .expertise-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-xs);
          justify-content: center;
        }

        .expertise-tag {
          padding: var(--space-xs) var(--space-sm);
          background: rgba(0, 212, 170, 0.1);
          color: var(--color-primary);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-medium);
          border-radius: var(--border-radius-full);
          border: 1px solid rgba(0, 212, 170, 0.2);
          white-space: nowrap;
          transition: all var(--transition-fast);
        }

        .expertise-tag.more {
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-text-secondary);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .expertise-tag:hover {
          background: rgba(0, 212, 170, 0.2);
          border-color: var(--color-primary);
        }

        /* Achievements Section */
        .achievements-section {
          margin-bottom: var(--space-lg);
        }

        .achievements-title {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-sm);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .achievements-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .achievement-item {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          line-height: var(--line-height-relaxed);
          margin-bottom: var(--space-xs);
          position: relative;
          padding-left: var(--space-md);
        }

        .achievement-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          font-size: var(--font-size-xs);
        }

        /* Social Section */
        .social-section {
          border-top: 1px solid var(--color-border);
          padding-top: var(--space-md);
        }

        .social-title {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-sm);
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .social-links {
          display: flex;
          justify-content: center;
          gap: var(--space-md);
        }

        .social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius-lg);
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
          text-decoration: none;
        }

        .social-link:hover {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: var(--color-text-inverse);
          box-shadow: 0 0 15px rgba(0, 212, 170, 0.3);
        }

        .social-link:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .contributor-card {
            padding: var(--space-lg);
            min-height: 420px;
          }

          .profile-image {
            width: 100px;
            height: 100px;
          }

          .contributor-name {
            font-size: var(--font-size-lg);
          }

          .contributor-role {
            font-size: var(--font-size-sm);
          }

          .contributor-bio {
            font-size: var(--font-size-xs);
          }
        }

        @media (max-width: 480px) {
          .contributor-details {
            align-items: center;
          }

          .expertise-tags {
            justify-content: center;
          }

          .social-links {
            gap: var(--space-sm);
          }

          .social-link {
            width: 32px;
            height: 32px;
          }
        }

        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .contributor-card {
            background: var(--color-surface-elevated);
            border: 2px solid var(--color-border);
          }

          .expertise-tag {
            background: var(--color-surface);
            border: 2px solid var(--color-primary);
          }

          .social-link {
            background: var(--color-surface);
            border: 2px solid var(--color-border);
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .contributor-card {
            transition: border-color var(--transition-fast);
          }

          .card-glow {
            display: none;
          }

          .profile-image {
            transition: border-color var(--transition-fast);
          }

          .social-link {
            transition: background-color var(--transition-fast),
                       color var(--transition-fast);
          }
        }
      `}</style>
    </motion.div>
  );
}