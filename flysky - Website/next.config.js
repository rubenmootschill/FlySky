const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep dev artifacts separate from production build output to avoid manifest corruption.
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-runtime',
  outputFileTracingRoot: path.join(__dirname),
  images: {
    domains: ['cdn.simbrief.com', 'avatars.githubusercontent.com'],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid flaky file-system cache corruption on Windows when .next is reset.
      config.cache = false
    }
    return config
  },
}

module.exports = nextConfig
