/**
 * Computes the next sequential document number from an array of existing number strings.
 * Finds the highest trailing integer across all values and increments it by one.
 */
export function computeNextDocumentNumber(numbers: string[], prefix = '', padLength = 4): string {
  let max = 0;
  for (const num of numbers) {
    const match = String(num ?? '').match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(padLength, '0')}`;
}
