import { getDefaultConfig } from "connectkit";
import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { getConfig } from "@/config/index";

type WagmiConfig = ReturnType<typeof createConfig>;
let cachedConfig: WagmiConfig | undefined;

/**
 * Get the target chain based on environment configuration
 * - testnet: Base Sepolia
 * - mainnet: Base Mainnet
 */
function getTargetChain() {
  const appConfig = getConfig();
  return appConfig.NEXT_PUBLIC_CHAIN_ENV === "mainnet" ? base : baseSepolia;
}

export function getWagmiConfig(): WagmiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const appConfig = getConfig();
  const targetChain = getTargetChain();

  cachedConfig = createConfig(
    getDefaultConfig({
      appName: "Router 402",
      walletConnectProjectId: appConfig.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
      chains: [targetChain],
      transports: {
        [targetChain.id]: http(),
      },
      ssr: true,
      enableFamily: false,
    })
  );

  return cachedConfig;
}
