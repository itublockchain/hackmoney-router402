// LiFi API types
export interface Token {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  chainId?: number;
  priceUSD?: string;
  logoURI?: string;
}

export interface MetamaskInfo {
  chainId: string;
  blockExplorerUrls: string[];
  chainName: string;
  rpcUrls: string[];
}

export interface Chain {
  id: number;
  key: string;
  name: string;
  nativeToken: Token;
  nativeCurrency: Token;
  metamask: MetamaskInfo;
}

export interface ChainData {
  chains: Chain[];
}

export interface TransactionRequest {
  to: string;
  from?: string;
  data: string;
  value?: string;
  gasLimit?: string;
  gasPrice?: string;
  chainId?: number | string;
}

export interface QuoteResponse {
  id: string;
  type: string;
  action: {
    fromChainId: number;
    fromAmount: string;
    fromToken: Token;
    toChainId: number;
    toToken: Token;
    slippage: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
    feeCosts?: Array<{
      name: string;
      description: string;
      percentage: string;
      token: Token;
      amount: string;
      amountUSD: string;
    }>;
    gasCosts?: Array<{
      type: string;
      price: string;
      estimate: string;
      limit: string;
      amount: string;
      amountUSD: string;
      token: Token;
    }>;
  };
  transactionRequest?: TransactionRequest;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Blockchain response types
export interface NativeBalanceResponse {
  address: string;
  balance: string;
  tokenSymbol: string;
  chainId: string;
  decimals: number;
}

export interface TokenBalanceResponse {
  walletAddress: string;
  tokenAddress: string;
  balance: string;
  tokenSymbol: string;
  decimals: number;
  chainId: string;
}

export interface AllowanceResponse {
  tokenAddress: string;
  tokenSymbol: string;
  ownerAddress: string;
  spenderAddress: string;
  allowance: string;
  decimals: number;
  chainId: string;
}

export interface TransactionResponse {
  transactionHash: string;
  from: string;
  to: string;
  value?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  amount?: string;
  decimals?: number;
  chainId: string;
  gasLimit: number | string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce: number;
  transactionType?: string;
}
