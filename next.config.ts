import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Site-visit audio recordings can be several MB; OpenAI's transcription
      // API caps uploads at 25MB.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
