import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: "backoffice.sevenpeaksbike.com",
      },
    ],
  },
};

export default nextConfig;
