import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Reduce memory usage during development
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react', '@tanstack/react-table', '@tanstack/react-query'],
  },
};

export default nextConfig;
