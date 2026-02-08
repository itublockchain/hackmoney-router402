import { getDefaultConfig } from "connectkit";
import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { getConfig } from "./get-config";

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

function getRpcUrl() {
  const appConfig = getConfig();
  const targetChain = getTargetChain();
  return `https://rpc.walletconnect.com/v1/?chainId=eip155:${targetChain.id}&projectId=${appConfig.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID}`;
}

export function getWagmiConfig(): WagmiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const appConfig = getConfig();
  const targetChain = getTargetChain();
  const rpcUrl = getRpcUrl();

  cachedConfig = createConfig(
    getDefaultConfig({
      appName: "Router 402",
      walletConnectProjectId: appConfig.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
      chains: [targetChain],
      transports: {
        [targetChain.id]: http(rpcUrl),
      },
      ssr: true,
      enableFamily: false,
    })
  );

  return cachedConfig;
}
