/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' for Vercel deployment (allows API routes and dynamic rendering)
  images: {
    unoptimized: true, // Can remove this if you want Vercel image optimization
  },
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;

