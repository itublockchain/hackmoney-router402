import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ["@router402/sdk", "@router402/types", "@router402/utils"],
};

export default nextConfig;
