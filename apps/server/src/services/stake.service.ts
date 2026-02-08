import { logger } from "@router402/utils";
import { type Address } from "viem";
import { publicClient } from "../utils/client.js";

const stakeLogger = logger.context("stake");

const STAKING_CONTRACT_ADDRESS =
  "0xA5B97115FDE7E4d91E533ba6B299A1a4C53a167E" as const;

const STAKING_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "isStaked",
    outputs: [{ internalType: "bool", name: "hasActiveStake", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Check if a smart account address has an active stake in the staking contract.
 */
export async function checkIsStaked(
  smartAccountAddr: string
): Promise<boolean> {
  try {
    const result = await publicClient.readContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: "isStaked",
      args: [smartAccountAddr as Address],
    });

    stakeLogger.debug("isStaked check", {
      smartAccount: smartAccountAddr.slice(0, 10),
      staked: result,
    });

    return result;
  } catch (error) {
    stakeLogger.error("Failed to check staking status", {
      smartAccount: smartAccountAddr.slice(0, 10),
      error,
    });
    // Fail-open or fail-closed? Defaulting to false (fail-closed) for security.
    return false;
  }
}
