export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function roundTaxCents(subtotalCents: number, compositeRate: number): number {
  return Math.round(subtotalCents * compositeRate);
}
