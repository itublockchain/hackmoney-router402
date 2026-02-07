import type { Address } from "viem";
import {
  createClient,
  getTokenInfo,
  simulateTransaction,
  validateAddress,
} from "../utils/blockchain.js";
import { getNativeTokenInfo } from "../utils/chains.js";
import { ERC20_ABI } from "../constants.js";

/**
 * Get native token balance for an address
 */
export async function getNativeTokenBalance(args: {
  rpcUrl: string;
  address: string;
}): Promise<string> {
  if (!args.rpcUrl || !args.address) {
    throw new Error("Both rpcUrl and address parameters are required");
  }

  if (!validateAddress(args.address)) {
    throw new Error(`Invalid Ethereum address format: ${args.address}`);
  }

  const client = createClient(args.rpcUrl);
  const address = args.address as Address;

  const [balance, chainId] = await Promise.all([
    client.getBalance({ address }),
    client.getChainId(),
  ]);

  const { symbol, decimals } = await getNativeTokenInfo(BigInt(chainId));

  return JSON.stringify({
    address: args.address,
    balance: balance.toString(),
    tokenSymbol: symbol,
    chainId: chainId.toString(),
    decimals,
  });
}

/**
 * Get ERC20 token balance for an address
 */
export async function getTokenBalance(args: {
  rpcUrl: string;
  tokenAddress: string;
  walletAddress: string;
}): Promise<string> {
  if (!args.rpcUrl || !args.tokenAddress || !args.walletAddress) {
    throw new Error(
      "rpcUrl, tokenAddress, and walletAddress parameters are required",
    );
  }

  if (!validateAddress(args.tokenAddress)) {
    throw new Error(`Invalid token address format: ${args.tokenAddress}`);
  }
  if (!validateAddress(args.walletAddress)) {
    throw new Error(`Invalid wallet address format: ${args.walletAddress}`);
  }

  const client = createClient(args.rpcUrl);
  const tokenAddress = args.tokenAddress as Address;
  const walletAddress = args.walletAddress as Address;

  const [balanceResult, chainId, tokenInfo] = await Promise.all([
    client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress],
    }),
    client.getChainId(),
    getTokenInfo(client, tokenAddress),
  ]);
  const balance = balanceResult as bigint;

  return JSON.stringify({
    walletAddress: args.walletAddress,
    tokenAddress: args.tokenAddress,
    balance: balance.toString(),
    tokenSymbol: tokenInfo.symbol,
    decimals: tokenInfo.decimals,
    chainId: chainId.toString(),
  });
}

/**
 * Get ERC20 token allowance
 */
export async function getAllowance(args: {
  rpcUrl: string;
  tokenAddress: string;
  ownerAddress: string;
  spenderAddress: string;
}): Promise<string> {
  if (!args.rpcUrl) {
    throw new Error("RPC URL is required");
  }
  if (!args.tokenAddress) {
    throw new Error("token address is required");
  }
  if (!args.ownerAddress) {
    throw new Error("owner address is required");
  }
  if (!args.spenderAddress) {
    throw new Error("spender address is required");
  }

  if (!validateAddress(args.tokenAddress)) {
    throw new Error(`Invalid token address format: ${args.tokenAddress}`);
  }
  if (!validateAddress(args.ownerAddress)) {
    throw new Error(`Invalid owner address format: ${args.ownerAddress}`);
  }
  if (!validateAddress(args.spenderAddress)) {
    throw new Error(`Invalid spender address format: ${args.spenderAddress}`);
  }

  const client = createClient(args.rpcUrl);
  const tokenAddress = args.tokenAddress as Address;
  const ownerAddress = args.ownerAddress as Address;
  const spenderAddress = args.spenderAddress as Address;

  const [allowanceResult, chainId, tokenInfo] = await Promise.all([
    client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [ownerAddress, spenderAddress],
    }),
    client.getChainId(),
    getTokenInfo(client, tokenAddress),
  ]);
  const allowance = allowanceResult as bigint;

  return JSON.stringify({
    tokenAddress: args.tokenAddress,
    tokenSymbol: tokenInfo.symbol,
    ownerAddress: args.ownerAddress,
    spenderAddress: args.spenderAddress,
    allowance: allowance.toString(),
    decimals: tokenInfo.decimals,
    chainId: chainId.toString(),
  });
}

/**
 * Simulate a transaction to check if it will succeed
 * This is exposed as an MCP tool for clients to pre-validate transactions
 */
export async function simulateTransactionTool(args: {
  rpcUrl: string;
  from: string;
  to: string;
  data?: string;
  value?: string;
}): Promise<string> {
  if (!args.rpcUrl) {
    throw new Error("RPC URL is required");
  }
  if (!args.from) {
    throw new Error("from address is required");
  }
  if (!args.to) {
    throw new Error("to address is required");
  }

  if (!validateAddress(args.from)) {
    throw new Error(`Invalid from address format: ${args.from}`);
  }
  if (!validateAddress(args.to)) {
    throw new Error(`Invalid to address format: ${args.to}`);
  }

  const client = createClient(args.rpcUrl);
  const fromAddress = args.from as Address;
  const toAddress = args.to as Address;

  // Parse data if provided
  let data: `0x${string}` | undefined;
  if (args.data) {
    data = (
      args.data.startsWith("0x") ? args.data : `0x${args.data}`
    ) as `0x${string}`;
  }

  // Parse value if provided
  let value: bigint | undefined;
  if (args.value) {
    value = args.value.startsWith("0x")
      ? BigInt(args.value)
      : BigInt(args.value);
  }

  // Get chain ID for response
  const chainId = await client.getChainId();

  // Simulate the transaction
  const simulation = await simulateTransaction(client, {
    account: fromAddress,
    to: toAddress,
    data,
    value,
  });

  // Estimate gas if simulation succeeds (useful info for the caller)
  let gasEstimate: string | undefined;
  if (simulation.success) {
    try {
      const estimate = await client.estimateGas({
        account: fromAddress,
        to: toAddress,
        data,
        value,
      });
      gasEstimate = estimate.toString();
    } catch {
      // Gas estimation failed, but simulation passed - rare edge case
      gasEstimate = undefined;
    }
  }

  return JSON.stringify({
    success: simulation.success,
    revertReason: simulation.revertReason,
    error: simulation.error,
    from: args.from,
    to: args.to,
    value: value?.toString(),
    chainId: chainId.toString(),
    gasEstimate,
  });
}
