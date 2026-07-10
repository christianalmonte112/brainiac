import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    CLERK_CLOCK_SKEW_MS: "60000",
  },
};

export default nextConfig;
