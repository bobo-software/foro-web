import { describe, expect, it } from 'vitest';
import { emp501Filename, emp501PeriodLabel } from './emp501';

describe('emp501Filename', () => {
  it('slugs the tax year and period', () => {
    expect(emp501Filename('2026/27', 'interim', 'pdf')).toBe('emp501-2026-27-interim.pdf');
  });
});

describe('emp501PeriodLabel', () => {
  it('labels interim and annual', () => {
    expect(emp501PeriodLabel('2026/27', 'interim')).toBe('Interim 2026/27');
  });
});
