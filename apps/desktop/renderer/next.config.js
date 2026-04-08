/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export for production builds in nextron
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  // Nextron exports renderer build artifacts into `apps/desktop/app/`.
  // Keep this aligned with Nextron's requirement so packaged builds can run.
  distDir: '../app',
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@eh/quill-engine', '@eh/shared-types'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
