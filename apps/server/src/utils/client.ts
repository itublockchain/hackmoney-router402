import { createPublicClient, http, type PublicClient } from "viem";
import { getChainConfig } from "../config/chain.js";
import { getConfig } from "../config/index.js";

let _publicClient: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!_publicClient) {
    const { chain, chainId } = getChainConfig();
    const config = getConfig();
    const rpcUrl =
      config.RPC_URL ??
      `https://rpc.walletconnect.com/v1/?chainId=eip155:${chainId}&projectId=${config.WALLET_CONNECT_PROJECT_ID}`;
    _publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }
  return _publicClient;
}
