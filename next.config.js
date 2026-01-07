/** @type {import('next').NextConfig} */

import {  fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

// Bundle analyzer for performance optimization (Task 6)
import bundleAnalyzer from '@next/bundle-analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // TypeScript and ESLint optimizations for faster builds
  typescript: {
    ignoreBuildErrors: true, // Skip TS checks during build (use CI for type checking)
  },
  
  // CRITICAL: Disable Turbopack to ensure webpack config works
  // Turbopack doesn't support webpack aliases yet (Next.js 16)
  // turbopack: {}, 
  
  // Webpack configuration to prevent Node.js modules from bundling client-side
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // CRITICAL: Use util package for browser compatibility with @reown/appkit
      // Force webpack to use util polyfill instead of Node.js util
      config.resolve.alias = {
        ...config.resolve.alias,
        util: require.resolve('util/'),
        // Prevent server-only cache modules from being bundled client-side
        '@/lib/cache/server': false,
        '@/lib/cache/compression': false,
      };
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
      
      // Provide util polyfill globally to fix @reown/appkit util.deprecate error
      config.plugins.push(
        new webpack.ProvidePlugin({
          util: 'util/',
        })
      );
    }
    
    // Ensure util is not marked as external (force bundling)
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals = config.externals.filter(
        (external) => typeof external !== 'string' || !external.includes('util')
      );
    }
    
    return config;
  },
  
  // Removed Nextra - incompatible with Vercel free tier (causes OOM)
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  async headers() {
    return [
      {
        // Apply CORS headers to all API routes and frame endpoints
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' }, // In production, restrict to specific origins
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' }, // Phase 1F: Removed POST (frames use link actions only)
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
      {
        // Allow embedding as miniapp in any Farcaster client
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ]
  },
  async redirects() {
    return [];
  },
  images: {
    // Phase 1F Task 7: Image optimization configuration
    formats: ['image/avif', 'image/webp'], // Prefer modern formats (AVIF first, WebP fallback)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Frame-optimized breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Icon/thumbnail sizes
    minimumCacheTTL: 86400, // Cache optimized images for 24 hours
    dangerouslyAllowSVG: true, // Allow SVG badges
    contentDispositionType: 'inline', // Display images inline, not as downloads
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bgnerptdanbgvcjentbt.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.farcaster.xyz',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.farcaster.phaver.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.neynar.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'warpcast.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.warpcast.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ipfs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ipfs.dweb.link',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.arweave.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.seadn.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.seadn.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.decentralized-content.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = { ...(config.resolve.fallback ?? {}), fs: false, net: false, tls: false };
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    
    // Fix Satori WASM imports for Frog frames
    // Satori uses WASM for font rendering, need to handle it properly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // Handle .wasm files
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });
    
    // Externalize satori on server-side to avoid bundling WASM
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('satori');
      }
    }
    
    return config;
  },
}

export default withBundleAnalyzer(nextConfig)