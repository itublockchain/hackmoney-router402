import { createPublicClient, http, type PublicClient } from "viem";
import { getChainConfig } from "../config/chain.js";
import { getConfig } from "../config/index.js";

let _publicClient: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!_publicClient) {
    const { chain } = getChainConfig();
    _publicClient = createPublicClient({
      chain,
      transport: http(getConfig().RPC_URL),
    });
  }
  return _publicClient;
}
