import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // @zerodev/permissions re-exports from @zerodev/webauthn-key in its
    // barrel file, but the SDK only uses ECDSA signing—not WebAuthn.
    // Mark the missing peer dependency as external to avoid build errors.
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("@zerodev/webauthn-key");
    }
    return config;
  },
};

export default nextConfig;
