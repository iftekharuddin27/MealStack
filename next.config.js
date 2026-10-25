// ============================================================
// MealStack · Next.js Configuration
// ============================================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.themealdb.com',
        pathname: '/images/**',
      },
    ],
  },
  experimental: {
    // Enable server actions (used for potential future Server Actions)
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

module.exports = nextConfig;
