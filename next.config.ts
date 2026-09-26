import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Progress photos are downscaled in the browser to well under 1.5 MB before upload.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
