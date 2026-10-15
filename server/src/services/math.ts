export const RATE_24K_PER_GRAM = 7000;

export interface CalculationResult {
  pureGoldGrams: number;
  goldValue: number;
  eligibleLoan: number;
}

export function computeQuote(netWeightGrams: number, karat: number, maxLtv: number): CalculationResult {
  const pureGoldGrams = Number((netWeightGrams * (karat / 24)).toFixed(4));
  const goldValue = Math.round(pureGoldGrams * RATE_24K_PER_GRAM);
  const effectiveLtv = Math.min(maxLtv, 0.75);
  const eligibleLoan = Math.floor(goldValue * effectiveLtv);

  return {
    pureGoldGrams,
    goldValue,
    eligibleLoan
  };
}
