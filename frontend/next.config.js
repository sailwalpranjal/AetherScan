/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['deck.gl', '@deck.gl/core', '@deck.gl/layers', '@deck.gl/react', '@deck.gl/geo-layers'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@deck.gl/core': require.resolve('@deck.gl/core'),
      '@deck.gl/layers': require.resolve('@deck.gl/layers'),
      '@deck.gl/geo-layers': require.resolve('@deck.gl/geo-layers'),
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
  },
}

module.exports = nextConfig
