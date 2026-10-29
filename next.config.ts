import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Emulated linux/amd64 Docker builds OOM if Next forks a worker per core.
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
