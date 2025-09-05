import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';

import { APP_METADATA, SEO_CONFIG, IS_PRODUCTION } from '@/lib/constants';
import { SkipLink } from '@/components/ui/SkipLink';
import './globals.css';

// ==========================================
// FONT OPTIMIZATION
// ==========================================

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: true,
  weight: ['300', '400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: false,
  fallback: ['monospace'],
  adjustFontFallback: true,
  weight: ['400', '500', '600', '700'],
});

// ==========================================
// METADATA CONFIGURATION
// ==========================================

export const metadata: Metadata = {
  metadataBase: new URL(SEO_CONFIG.siteUrl),
  title: {
    default: SEO_CONFIG.defaultTitle,
    template: SEO_CONFIG.titleTemplate,
  },
  description: SEO_CONFIG.defaultDescription,
  keywords: SEO_CONFIG.defaultKeywords,
  authors: [
    { name: 'Sriya Rawat', url: 'https://github.com/sriya-rawat' },
    { name: 'Prakriti Kimothi', url: 'https://github.com/prakriti-kimothi' },
    { name: 'Siddhant Dabral', url: 'https://github.com/siddhant-dabral' },
    { name: 'Pranjal Sailwal', url: 'https://github.com/pranjal-sailwal' },
  ],
  creator: 'Air Quality Monitoring Team',
  publisher: 'Graphic Era Hill University',
  category: 'Environmental Technology',
  classification: 'Research Project',
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SEO_CONFIG.siteUrl,
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    siteName: APP_METADATA.name,
    images: [
      {
        url: SEO_CONFIG.defaultImage,
        width: 1200,
        height: 630,
        alt: 'Industrial Air Quality Monitoring System Dashboard',
        type: 'image/jpeg',
      },
      {
        url: '/images/og-image-square.jpg',
        width: 600,
        height: 600,
        alt: 'Air Quality Monitoring Logo',
        type: 'image/jpeg',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    site: SEO_CONFIG.twitterHandle,
    creator: SEO_CONFIG.twitterHandle,
    images: [SEO_CONFIG.defaultImage],
  },
  
  // Facebook
  facebook: {
    appId: SEO_CONFIG.fbAppId,
  },
  
  // Robots
  robots: {
    index: IS_PRODUCTION,
    follow: IS_PRODUCTION,
    nocache: !IS_PRODUCTION,
    googleBot: {
      index: IS_PRODUCTION,
      follow: IS_PRODUCTION,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Verification
  verification: {
    google: process.env['NEXT_PUBLIC_GOOGLE_VERIFICATION'] ?? '',
    yandex: process.env['NEXT_PUBLIC_YANDEX_VERIFICATION'] ?? '',
    yahoo: process.env['NEXT_PUBLIC_YAHOO_VERIFICATION'] ?? '',
  },
  
  // Alternative URLs
  alternates: {
    canonical: SEO_CONFIG.siteUrl,
    languages: {
      'en-US': SEO_CONFIG.siteUrl,
      'x-default': SEO_CONFIG.siteUrl,
    },
  },
  
  // Application metadata
  applicationName: APP_METADATA.name,
  referrer: 'origin-when-cross-origin',
  colorScheme: 'dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#00d4aa' },
    { media: '(prefers-color-scheme: dark)', color: '#00d4aa' },
  ],
  
  // Manifest
  manifest: '/manifest.json',
  
  // Icons
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon-57x57.png', sizes: '57x57', type: 'image/png' },
      { url: '/apple-touch-icon-60x60.png', sizes: '60x60', type: 'image/png' },
      { url: '/apple-touch-icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/apple-touch-icon-76x76.png', sizes: '76x76', type: 'image/png' },
      { url: '/apple-touch-icon-114x114.png', sizes: '114x114', type: 'image/png' },
      { url: '/apple-touch-icon-120x120.png', sizes: '120x120', type: 'image/png' },
      { url: '/apple-touch-icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#00d4aa',
      },
    ],
  },
  
  // Additional metadata
  other: {
    'msapplication-TileColor': '#0a0a0f',
    'msapplication-config': '/browserconfig.xml',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Air Quality Monitor',
    'application-name': 'Air Quality Monitor',
    'theme-color': '#00d4aa',
    'format-detection': 'telephone=no',
    'HandheldFriendly': 'true',
    'MobileOptimized': '320',
  },
};

// ==========================================
// VIEWPORT CONFIGURATION
// ==========================================

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#00d4aa' },
    { media: '(prefers-color-scheme: dark)', color: '#00d4aa' },
  ],
  colorScheme: 'dark light',
};

// ==========================================
// ROOT LAYOUT COMPONENT
// ==========================================

interface RootLayoutProps {
  readonly children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.airquality.monitor" />
        
        {/* DNS prefetch for likely external resources */}
        <link rel="dns-prefetch" href="//github.com" />
        <link rel="dns-prefetch" href="//linkedin.com" />
        <link rel="dns-prefetch" href="//vercel.com" />
        
        {/* Resource hints for critical assets */}
        <link rel="preload" href="/images/hero-bg.jpg" as="image" type="image/jpeg" />
        
        {/* Security headers via meta tags (backup to server headers) */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
        
        {/* Performance and loading optimization */}
        <meta name="generator" content={`Next.js ${process.env['NEXT_PUBLIC_VERSION'] || '14.1.0'}`} />
        <meta name="robots" content={IS_PRODUCTION ? "index,follow" : "noindex,nofollow"} />
        
        {/* Structured data for rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": APP_METADATA.name,
              "description": SEO_CONFIG.defaultDescription,
              "url": SEO_CONFIG.siteUrl,
              "applicationCategory": "Environmental Technology",
              "operatingSystem": "Web Browser",
              "author": {
                "@type": "Organization",
                "name": "Graphic Era Hill University",
                "url": "https://www.gehu.ac.in"
              },
              "creator": APP_METADATA.authors.map((author: any) => ({
                "@type": "Person",
                "name": author
              })),
              "datePublished": "2024-09-04",
              "version": APP_METADATA.version,
              "license": APP_METADATA.license,
              "programmingLanguage": [
                "TypeScript",
                "Python",
                "JavaScript",
                "C++"
              ],
              "runtimePlatform": "Next.js",
              "softwareRequirements": "Modern web browser with JavaScript enabled",
              "featureList": [
                "Real-time air quality monitoring",
                "Satellite data integration",
                "Machine learning predictions",
                "Quantum computing optimization",
                "Interactive visualizations"
              ]
            })
          }}
        />
      </head>
      
      <body>
        {/* Skip link for screen readers */}
        <SkipLink />
        
        {/* Main application content */}
        <main id="main-content" role="main">
          {children}
        </main>
        
        {/* Analytics and monitoring */}
        {IS_PRODUCTION && <Analytics />}
        
        {/* Development tools */}
        {!IS_PRODUCTION && (
          <div 
            id="development-indicator"
            style={{
              position: 'fixed',
              bottom: '10px',
              left: '10px',
              padding: '4px 8px',
              backgroundColor: '#ff6b35',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '4px',
              zIndex: 10000,
              fontFamily: 'monospace'
            }}
            aria-hidden="true"
          >
            DEV
          </div>
        )}
        
        {/* Service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && location.protocol === 'https:') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  }).catch(function(err) {
                    console.log('ServiceWorker registration failed');
                  });
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}

// ==========================================
// ERROR BOUNDARY FALLBACK
// ==========================================

export function generateStaticParams() {
  return [];
}
