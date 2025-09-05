export default function LoadingPage(): React.JSX.Element {
  return (
    <div className="loading-page">
      <div className="loading-container">
        <div className="loading-content">
          {/* Loading Animation */}
          <div className="loading-animation">
            <div className="satellite-orbit">
              <div className="satellite">🛰️</div>
              <div className="orbit-path" />
            </div>
            
            <div className="data-stream">
              <div className="data-point" />
              <div className="data-point" />
              <div className="data-point" />
            </div>
          </div>

          {/* Loading Text */}
          <div className="loading-text">
            <h1 className="loading-title">
              Air Quality Monitoring System
            </h1>
            <p className="loading-subtitle">
              Initializing quantum-enhanced environmental analysis...
            </p>
            
            <div className="loading-progress">
              <div className="progress-bar">
                <div className="progress-fill" />
              </div>
              <div className="progress-text">
                Loading satellite data and ML models
              </div>
            </div>
          </div>
        </div>

        {/* Background Grid */}
        <div className="grid-background">
          <div className="grid-line" />
          <div className="grid-line" />
          <div className="grid-line" />
          <div className="grid-line" />
        </div>
      </div>

      <style>{`
        .loading-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-background);
          position: relative;
          overflow: hidden;
        }

        .loading-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 600px;
          padding: var(--space-lg);
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-4xl) var(--space-2xl);
          background: var(--glass-bg);
          backdrop-filter: var(--glass-backdrop-filter);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius-2xl);
          box-shadow: var(--glass-shadow);
        }

        /* Loading Animation */
        .loading-animation {
          position: relative;
          width: 200px;
          height: 200px;
          margin-bottom: var(--space-3xl);
        }

        .satellite-orbit {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px dashed var(--color-primary);
          animation: pulse 2s ease-in-out infinite;
        }

        .satellite {
          position: absolute;
          font-size: var(--font-size-2xl);
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          animation: orbit 4s linear infinite;
        }

        .orbit-path {
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: var(--color-primary);
          animation: spin 2s linear infinite;
        }

        .data-stream {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          gap: var(--space-sm);
        }

        .data-point {
          width: 8px;
          height: 8px;
          background: var(--color-secondary);
          border-radius: 50%;
          animation: dataFlow 1.5s ease-in-out infinite;
        }

        .data-point:nth-child(2) {
          animation-delay: 0.2s;
        }

        .data-point:nth-child(3) {
          animation-delay: 0.4s;
        }

        /* Loading Text */
        .loading-text {
          width: 100%;
        }

        .loading-title {
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-md);
          line-height: var(--line-height-tight);
          background: var(--gradient-primary);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 200% 200%;
          animation: gradientShift 3s ease-in-out infinite;
        }

        .loading-subtitle {
          font-size: var(--font-size-base);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-2xl);
          line-height: var(--line-height-relaxed);
        }

        .loading-progress {
          width: 100%;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--border-radius-full);
          overflow: hidden;
          margin-bottom: var(--space-md);
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: var(--gradient-primary);
          border-radius: var(--border-radius-full);
          animation: progressFill 3s ease-in-out infinite;
          position: relative;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: progressShimmer 2s ease-in-out infinite;
        }

        .progress-text {
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          font-weight: var(--font-weight-medium);
          animation: textFade 2s ease-in-out infinite;
        }

        /* Background Grid */
        .grid-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.1;
          z-index: 0;
        }

        .grid-line {
          position: absolute;
          background: var(--color-primary);
        }

        .grid-line:nth-child(1) {
          top: 20%;
          left: 0;
          width: 100%;
          height: 1px;
          animation: gridMove 4s ease-in-out infinite;
        }

        .grid-line:nth-child(2) {
          top: 60%;
          left: 0;
          width: 100%;
          height: 1px;
          animation: gridMove 4s ease-in-out infinite reverse;
        }

        .grid-line:nth-child(3) {
          top: 0;
          left: 30%;
          width: 1px;
          height: 100%;
          animation: gridMove 5s ease-in-out infinite;
        }

        .grid-line:nth-child(4) {
          top: 0;
          right: 30%;
          width: 1px;
          height: 100%;
          animation: gridMove 5s ease-in-out infinite reverse;
        }

        /* Animations */
        @keyframes orbit {
          0% {
            transform: translateX(-50%) rotate(0deg) translateX(100px) rotate(0deg);
          }
          100% {
            transform: translateX(-50%) rotate(360deg) translateX(100px) rotate(-360deg);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @keyframes dataFlow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
        }

        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes progressFill {
          0% {
            width: 0%;
          }
          50% {
            width: 70%;
          }
          100% {
            width: 100%;
          }
        }

        @keyframes progressShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes textFade {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes gridMove {
          0%, 100% {
            opacity: 0.05;
          }
          50% {
            opacity: 0.15;
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .loading-container {
            padding: var(--space-md);
          }

          .loading-content {
            padding: var(--space-2xl) var(--space-lg);
          }

          .loading-animation {
            width: 150px;
            height: 150px;
            margin-bottom: var(--space-2xl);
          }

          .loading-title {
            font-size: var(--font-size-xl);
          }

          .loading-subtitle {
            font-size: var(--font-size-sm);
          }
        }

        @media (max-width: 480px) {
          .loading-animation {
            width: 120px;
            height: 120px;
          }

          .satellite {
            font-size: var(--font-size-lg);
          }

          .loading-title {
            font-size: var(--font-size-lg);
          }
        }

        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .loading-content {
            background: var(--color-surface);
            border: 2px solid var(--color-border);
          }

          .loading-title {
            -webkit-text-fill-color: var(--color-primary);
            color: var(--color-primary);
          }

          .satellite-orbit {
            border-color: var(--color-primary);
          }

          .progress-bar {
            background: var(--color-border);
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .satellite {
            animation: none;
          }

          .orbit-path {
            animation: spin 10s linear infinite;
          }

          .data-point {
            animation: none;
            opacity: 0.7;
          }

          .loading-title {
            animation: none;
          }

          .progress-fill {
            animation: progressFillSlow 6s ease-in-out infinite;
          }

          .progress-fill::after {
            animation: none;
          }

          .grid-line {
            animation: none;
            opacity: 0.05;
          }

          @keyframes progressFillSlow {
            0% { width: 0%; }
            50% { width: 50%; }
            100% { width: 100%; }
          }
        }

        /* Loading Screen Accessibility */
        .loading-page {
          color-scheme: dark;
        }

        @media (prefers-reduced-motion: reduce) {
          .loading-animation :global(*) {
            animation-duration: 6s;
          }
        }
      `}</style>
    </div>
  );
}