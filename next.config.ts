import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /** Faster SSG when pre-rendering thousands of /docs/claude-src/file/* pages */
    staticGenerationMaxConcurrency: 8,
    staticGenerationMinPagesPerWorker: 50,
  },
};

export default nextConfig;
