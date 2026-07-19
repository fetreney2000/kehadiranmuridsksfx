import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development feedback
  reactStrictMode: true,

  // Allow images from external sources if needed (none currently)
  images: {
    remotePatterns: [],
  },

  // Headers for PWA manifest and other security
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
    ];
  },
};

export default nextConfig;