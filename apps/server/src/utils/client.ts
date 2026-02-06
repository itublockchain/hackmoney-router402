import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { getConfig } from "../config/index.js";

export const publicClient = createPublicClient({
  chain: base,
  transport: http(getConfig().RPC_URL),
});
