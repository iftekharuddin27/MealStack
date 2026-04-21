// ============================================================
// MealStack · Next.js Configuration
// ============================================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable server actions (used for potential future Server Actions)
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

module.exports = nextConfig;
