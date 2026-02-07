import { createPublicClient, http } from "viem";
import { getChainConfig } from "../config/chain.js";
import { getConfig } from "../config/index.js";

const { chain } = getChainConfig();

export const publicClient = createPublicClient({
  chain,
  transport: http(getConfig().RPC_URL),
});
