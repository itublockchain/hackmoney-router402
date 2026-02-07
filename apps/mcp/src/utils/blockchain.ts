import {
	type Address,
	BaseError,
	ContractFunctionRevertedError,
	createPublicClient,
	type Hex,
	http,
	isAddress,
	type PublicClient,
	parseAbi,
} from "viem";

/**
 * Result of a transaction simulation
 */
export interface SimulationResult {
	success: boolean;
	error?: string;
	revertReason?: string;
}

/**
 * Extract revert reason from an error
 */
export function extractRevertReason(error: unknown): string {
	if (error instanceof BaseError) {
		// Check for ContractFunctionRevertedError
		const revertError = error.walk((err) => err instanceof ContractFunctionRevertedError);
		if (revertError instanceof ContractFunctionRevertedError) {
			const errorName = revertError.data?.errorName;
			if (errorName) {
				return `Contract reverted with: ${errorName}`;
			}
		}

		// Try to extract reason from error message
		const message = error.message || error.shortMessage || "";

		// Look for common revert patterns
		if (message.includes("execution reverted")) {
			const match = message.match(/execution reverted:?\s*(.+?)(?:\n|$)/i);
			if (match?.[1]) {
				return match[1].trim();
			}
			return "Execution reverted (no reason provided)";
		}

		// Check for insufficient funds
		if (message.includes("insufficient funds") || message.includes("exceeds balance")) {
			return "Insufficient funds for gas * price + value";
		}

		// Return the short message if available
		if (error.shortMessage) {
			return error.shortMessage;
		}
	}

	// Fallback for non-BaseError
	if (error instanceof Error) {
		const message = error.message;
		if (message.includes("execution reverted")) {
			const match = message.match(/execution reverted:?\s*(.+?)(?:\n|$)/i);
			if (match?.[1]) {
				return match[1].trim();
			}
		}
		return error.message;
	}

	return "Unknown error";
}

/**
 * Simulate a transaction to check if it will succeed
 */
export async function simulateTransaction(
	client: PublicClient,
	params: {
		account: Address;
		to: Address;
		data?: Hex;
		value?: bigint;
	},
): Promise<SimulationResult> {
	try {
		await client.call({
			account: params.account,
			to: params.to,
			data: params.data,
			value: params.value,
		});
		return { success: true };
	} catch (error) {
		const revertReason = extractRevertReason(error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			revertReason,
		};
	}
}

/**
 * Simulate a contract write to check if it will succeed
 * Uses low-level call to match Go implementation's CallContract approach
 */
export async function simulateContractWrite(
	client: PublicClient,
	params: {
		account: Address;
		address: Address;
		data: Hex;
		value?: bigint;
	},
): Promise<SimulationResult> {
	return simulateTransaction(client, {
		account: params.account,
		to: params.address,
		data: params.data,
		value: params.value,
	});
}

/**
 * Create a public client for read-only blockchain operations
 */
export function createClient(rpcUrl: string): PublicClient {
	return createPublicClient({
		transport: http(rpcUrl),
	});
}

/**
 * Validate an Ethereum address
 */
export function validateAddress(address: string): address is Address {
	return isAddress(address);
}

/**
 * Get token info (symbol and decimals) from a token contract
 */
export async function getTokenInfo(
	client: PublicClient,
	tokenAddress: Address,
): Promise<{ symbol: string; decimals: number }> {
	try {
		const [symbol, decimals] = await Promise.all([
			client.readContract({
				address: tokenAddress,
				abi: parseAbi(["function symbol() view returns (string)"]),
				functionName: "symbol",
			}),
			client.readContract({
				address: tokenAddress,
				abi: parseAbi(["function decimals() view returns (uint8)"]),
				functionName: "decimals",
			}),
		]);

		return { symbol: symbol as string, decimals: Number(decimals) };
	} catch {
		return { symbol: "Unknown", decimals: 18 };
	}
}
