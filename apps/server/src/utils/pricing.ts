import { Decimal } from "decimal.js";

/**
 * Pricing per million tokens for each supported model.
 * Prices are in USD.
 */
export const PRICING = {
  // Claude models
  "anthropic/claude-opus-4.5": { input: 15.0, output: 75.0 },
  "anthropic/claude-sonnet-4.5": { input: 3.0, output: 15.0 },
  "anthropic/claude-haiku-4.5": { input: 0.25, output: 1.25 },
  // Gemini models
  "google/gemini-3-pro-preview": { input: 2.0, output: 12.0 },
  "google/gemini-3-flash-preview": { input: 0.5, output: 3.0 },
} as const;

/**
 * Commission rate applied on top of base cost (10%)
 */
export const COMMISSION_RATE = new Decimal("0.10");

/**
 * Supported model identifiers for pricing
 */
export type SupportedModel = keyof typeof PRICING;

/**
 * Cost breakdown returned by calculateCost
 */
export interface CostBreakdown {
  /** Base cost before commission (input + output cost) */
  baseCost: Decimal;
  /** Commission amount (10% of base cost) */
  commission: Decimal;
  /** Total cost (base cost + commission) */
  totalCost: Decimal;
}

/**
 * Checks if a model is supported for pricing
 */
export function isSupportedModel(model: string): model is SupportedModel {
  return model in PRICING;
}

/**
 * Calculates the cost for a given model and token usage.
 *
 * Uses Decimal.js for precise arithmetic to avoid floating-point errors.
 * Prices are per million tokens.
 *
 * @param model - The model identifier (e.g., 'anthropic/claude-sonnet-4.5')
 * @param promptTokens - Number of input/prompt tokens
 * @param completionTokens - Number of output/completion tokens
 * @returns Cost breakdown with baseCost, commission, and totalCost
 * @throws Error if model is not supported
 *
 * @example
 * const cost = calculateCost('anthropic/claude-sonnet-4.5', 1000, 500);
 * // baseCost = (1000/1M * 3.00) + (500/1M * 15.00) = 0.003 + 0.0075 = 0.0105
 * // commission = 0.0105 * 0.10 = 0.00105
 * // totalCost = 0.0105 + 0.00105 = 0.01155
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): CostBreakdown {
  if (!isSupportedModel(model)) {
    throw new Error(`Unsupported model for pricing: ${model}`);
  }

  const pricing = PRICING[model];

  // Calculate input cost: (promptTokens / 1,000,000) * inputPrice
  const inputCost = new Decimal(promptTokens).div(1_000_000).mul(pricing.input);

  // Calculate output cost: (completionTokens / 1,000,000) * outputPrice
  const outputCost = new Decimal(completionTokens)
    .div(1_000_000)
    .mul(pricing.output);

  // Base cost is input + output
  const baseCost = inputCost.plus(outputCost);

  // Commission is 10% of base cost
  const commission = baseCost.mul(COMMISSION_RATE);

  // Total cost is base + commission
  const totalCost = baseCost.plus(commission);

  return { baseCost, commission, totalCost };
}
