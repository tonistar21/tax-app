import type { SpecialRate } from "./tax.types.js";

export const NY_STATE_RATE = 0.04;
export const MCTD_RATE = 0.00375;

export function buildBreakdown(compositeRate: number, mctdIncluded: boolean) {
  const specialRates: SpecialRate[] = [];

  if (mctdIncluded) {
    specialRates.push({ name: "MCTD", rate: MCTD_RATE });
  }

  const specialsSum = specialRates.reduce((s, r) => s + r.rate, 0);

  const localRate = compositeRate - NY_STATE_RATE - specialsSum;

  const local = Math.max(0, Number(localRate.toFixed(6)));

  return {
    stateRate: NY_STATE_RATE,
    countyRate: local,
    cityRate: 0,
    specialRates,
  };
}
