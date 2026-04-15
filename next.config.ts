import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "loremflickr.com",
      },
      {
        protocol: "https",
        hostname: "image.pollinations.ai",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google Drive direct image URLs
      },
      {
        protocol: "https",
        hostname: "eyxxatvxvzomjtzgfaej.supabase.co", // Supabase Storage
      },
      {
        protocol: "https",
        hostname: "*.supabase.co", // Any Supabase project (future-proof)
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
