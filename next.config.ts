import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Statement uploads go through a Server Action; the default 1 MB is tight.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
