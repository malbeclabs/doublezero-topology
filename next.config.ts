import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Configure Server Actions to handle large file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb", // Allow up to 100MB for snapshot files
    },
  },
};

export default nextConfig;
