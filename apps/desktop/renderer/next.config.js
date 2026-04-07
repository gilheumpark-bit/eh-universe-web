/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export for production builds in nextron
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  distDir: 'out',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
