import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    CLERK_CLOCK_SKEW_MS: "60000",
  },
  // proxy.ts buffers request bodies; keep headroom for multi-page photo OCR uploads.
  experimental: {
    proxyClientMaxBodySize: "10mb",
  },
};

export default nextConfig;
