import { describe, expect, it } from 'vitest';
import { taxYearCodeSlug, yearEndFilename } from './yearEndPdf';

describe('yearEndFilename', () => {
  it('uses IRP5, the tax year, and the legal name', () => {
    expect(taxYearCodeSlug('2026/27')).toBe('2026-27');
    expect(yearEndFilename('irp5', '2026/27', 'Thabo Molefe')).toBe('irp5-2026-27-thabo-molefe.pdf');
  });
});
