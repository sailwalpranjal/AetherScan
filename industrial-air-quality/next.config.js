/** @type {import('next').NextConfig} */
const path = require('path');
const crypto = require('crypto');

// ==========================================
// PRODUCTION NEXT.JS CONFIGURATION
// ==========================================

const nextConfig = {
  // React configuration
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    esmExternals: 'loose',
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: ['localhost'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    unoptimized: false,
  },
  
  // Experimental features for performance
  experimental: {
    optimizeCss: process.env.NODE_ENV === 'production',
    scrollRestoration: true,
    optimizePackageImports: [
      'framer-motion',
      'react-icons',
      '@react-spring/web',
      'lottie-react'
    ],
  },
  
  // Security headers
  async headers() {
    const securityHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()'
      }
    ];

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push(
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload'
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel.app *.googleapis.com",
            "style-src 'self' 'unsafe-inline' *.googleapis.com fonts.googleapis.com",
            "img-src 'self' blob: data: *.googleapis.com *.gstatic.com",
            "font-src 'self' fonts.gstatic.com",
            "connect-src 'self' *.vercel.app *.googleapis.com",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
          ].join('; ')
        }
      );
    }

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Redirects for SEO and UX
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      // Add more redirects as needed
    ];
  },

  // Custom webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer in development
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
    }

    // Optimize chunks for better caching
    config.optimization.splitChunks = {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        // React framework bundle
        framework: {
          chunks: 'all',
          name: 'framework',
          test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
          priority: 40,
          enforce: true,
        },
        // Large libraries
        lib: {
          test(module) {
            return (
              module.size() > 160000 &&
              /node_modules[/\\]/.test(module.identifier())
            );
          },
          name(module) {
            const hash = crypto.createHash('sha1');
            const identifier = module.libIdent 
              ? module.libIdent({ context: config.context })
              : module.identifier();
            hash.update(identifier);
            return hash.digest('hex').substring(0, 8);
          },
          priority: 30,
          minChunks: 1,
          reuseExistingChunk: true,
        },
        // Common chunks
        commons: {
          name: 'commons',
          minChunks: 2,
          priority: 20,
          reuseExistingChunk: true,
        },
        // Default group
        default: {
          minChunks: 2,
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    };

    // Optimize tree shaking
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;

    // Add resolve aliases for cleaner imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './app'),
      '@/components': path.resolve(__dirname, './app/components'),
      '@/lib': path.resolve(__dirname, './app/lib'),
      '@/styles': path.resolve(__dirname, './app/styles'),
    };

    // Ignore problematic modules that cause warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Add webpack plugins for production
    if (!dev && !isServer) {
      // Add compression plugin
      const CompressionPlugin = require('compression-webpack-plugin');
      config.plugins.push(
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8,
        })
      );

      // Define environment variables
      config.plugins.push(
        new webpack.DefinePlugin({
          __DEV__: JSON.stringify(false),
          __PROD__: JSON.stringify(true),
          __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
        })
      );
    }

    // Handle styled-jsx server-side rendering issues
    if (isServer) {
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        
        // Add polyfills for server-side rendering
        if (entries['main.js'] && !entries['main.js'].includes('./polyfills.js')) {
          entries['main.js'].unshift('./polyfills.js');
        }
        
        return entries;
      };
    }

    // Optimize module resolution
    config.resolve.modules = [
      path.resolve(__dirname, './app'),
      'node_modules'
    ];

    // Handle client-only modules properly
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'client-only': false,
      };
    }

    return config;
  },

  // Environment variables
  env: {
    CUSTOM_BUILD_TIME: new Date().toISOString(),
    CUSTOM_BUILD_ID: crypto.randomBytes(16).toString('hex'),
  },

  // Output configuration
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Trailing slash handling
  trailingSlash: false,
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Sass configuration
  sassOptions: {
    includePaths: [path.join(__dirname, 'app/styles')],
  },
};

// Export configuration
module.exports = nextConfig;