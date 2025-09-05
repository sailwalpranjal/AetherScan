import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { SEO_CONFIG } from '@/lib/constants';

// ==========================================
// DYNAMIC IMPORTS FOR CODE SPLITTING
// ==========================================

const Hero = dynamic(() => import('@/components/Hero/Hero'), {
  ssr: true,
  loading: () => <HeroSkeleton />
});

const Vision = dynamic(() => import('@/components/Vision/Vision'), {
  ssr: true,
  loading: () => <SectionSkeleton />
});

const Infographics = dynamic(() => import('@/components/Infographics/Infographics'), {
  ssr: true,
  loading: () => <SectionSkeleton />
});

const Contributors = dynamic(() => import('@/components/Contributors/Contributors'), {
  ssr: true,
  loading: () => <SectionSkeleton />
});

const CallToAction = dynamic(() => import('@/components/CallToAction/CallToAction'), {
  ssr: true,
  loading: () => <SectionSkeleton />
});

// ==========================================
// LOADING SKELETONS
// ==========================================

function HeroSkeleton(): React.JSX.Element {
  return (
    <section 
      style={{ 
        height: '100vh', 
        background: 'var(--color-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      aria-label="Loading hero section"
    >
      <div 
        style={{
          width: '60px',
          height: '60px',
          border: '3px solid var(--color-primary)',
          borderTop: '3px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
        role="status"
        aria-label="Loading"
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}

function SectionSkeleton(): React.JSX.Element {
  return (
    <section 
      style={{ 
        minHeight: '400px', 
        background: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 'var(--space-4xl) 0'
      }}
      aria-label="Loading section"
    >
      <div className="animate-pulse-subtle">
        <div style={{
          width: '200px',
          height: '20px',
          background: 'var(--color-border)',
          borderRadius: 'var(--border-radius-md)',
          marginBottom: 'var(--space-md)'
        }} />
        <div style={{
          width: '300px',
          height: '16px',
          background: 'var(--color-border)',
          borderRadius: 'var(--border-radius-md)',
          marginBottom: 'var(--space-sm)'
        }} />
        <div style={{
          width: '250px',
          height: '16px',
          background: 'var(--color-border)',
          borderRadius: 'var(--border-radius-md)'
        }} />
      </div>
    </section>
  );
}

// ==========================================
// PAGE METADATA
// ==========================================

export const metadata: Metadata = {
  title: 'Home',
  description: SEO_CONFIG.defaultDescription,
  openGraph: {
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    url: SEO_CONFIG.siteUrl,
    type: 'website',
    images: [
      {
        url: SEO_CONFIG.defaultImage,
        width: 1200,
        height: 630,
        alt: 'Industrial Air Quality Monitoring System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    images: [SEO_CONFIG.defaultImage],
  },
  alternates: {
    canonical: SEO_CONFIG.siteUrl,
  },
};

// ==========================================
// HOME PAGE COMPONENT
// ==========================================

export default function HomePage(): React.JSX.Element {
  return (
    <>
      {/* Hero Section - Full viewport */}
      <Hero />
      
      {/* Vision & Mission Section */}
      <Vision />
      
      {/* Infographics & Statistics */}
      <Infographics />
      
      {/* Team Contributors */}
      <Contributors />
      
      {/* Call to Action */}
      <CallToAction />
    </>
  );
}

// ==========================================
// PERFORMANCE OPTIMIZATIONS
// ==========================================

// Enable static generation for better performance
export const revalidate = 3600; // Revalidate every hour

// Generate static params if needed
export async function generateStaticParams() {
  return [];
}

// Viewport and loading optimizations
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#00d4aa',
};

// Runtime configuration
export const runtime = 'nodejs';
export const preferredRegion = 'auto';