import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 40, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer ring - represents atmosphere */}
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="url(#gradient1)"
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />

      {/* Middle ring - air quality monitoring */}
      <circle
        cx="50"
        cy="50"
        r="35"
        stroke="url(#gradient2)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.8"
      />

      {/* Inner circle - Earth/location */}
      <circle
        cx="50"
        cy="50"
        r="25"
        fill="url(#gradient3)"
      />

      {/* Wave patterns - representing air/pollution monitoring */}
      <path
        d="M 30 50 Q 35 45, 40 50 T 50 50 T 60 50 T 70 50"
        stroke="#60A5FA"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M 30 55 Q 35 50, 40 55 T 50 55 T 60 55 T 70 55"
        stroke="#34D399"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />

      {/* Sensor/radar indicator */}
      <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
      <circle cx="50" cy="50" r="2" fill="#3B82F6">
        <animate
          attributeName="r"
          values="2;6;2"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="1;0;1"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Gradients */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>

        <radialGradient id="gradient3">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default Logo;
