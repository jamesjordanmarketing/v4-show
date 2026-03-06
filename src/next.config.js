const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ESLint during build (lint separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ]
  },
  webpack: (config, { isServer, nextRuntime }) => {
    // Handle SVG imports
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    // Fix: Polyfill __dirname and __filename for Edge Runtime (Vercel middleware)
    // @supabase/supabase-js transitive dependencies reference Node.js globals
    // that don't exist in the Edge Runtime, causing ReferenceError at runtime.
    if (nextRuntime === 'edge') {
      config.plugins.push(
        new webpack.DefinePlugin({
          __dirname: JSON.stringify('/'),
          __filename: JSON.stringify('/index.js'),
        })
      );
    }

    // Fix pdf-parse build issue on Vercel
    // pdf-parse references test files that don't exist in the npm package
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };

      // Prevent canvas from being bundled (optional dependency)
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('canvas');
      }
    }

    // Suppress warnings about missing optional dependencies
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/pdf-parse/ },
      /Critical dependency: the request of a dependency is an expression/,
    ];

    // Tell webpack to ignore these problematic paths during build
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
    };

    return config;
  },
  // Configure to handle static file imports
  staticPageGenerationTimeout: 120,
  // Enable experimental features for better performance
  swcMinify: true,
  // Optimize for production
  compress: true,
  poweredByHeader: false,
  // Handle dynamic imports and external packages
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'html-to-text', 'tar-stream', '@huggingface/hub'],
  },
}

module.exports = nextConfig