import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/skill.md", destination: "/skill" }];
  },
};

export default nextConfig;
