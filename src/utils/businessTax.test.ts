import { describe, expect, it } from 'vitest';
import type { ProvisionalPlanRow } from '@/types/businessTax';
import {
  amountDueLabel,
  effectiveRatePercent,
  localIsoDate,
  nextProvisionalPayment,
  taxYearLabel,
  taxYearOptions,
} from './businessTax';
import { formatCurrency } from './currency';

describe('businessTax utils', () => {
  it('labels a year of assessment by its year end', () => {
    expect(taxYearLabel('2027-02')).toBe('Year ending February 2027');
    expect(taxYearLabel('bad')).toBe('bad');
  });

  it('lists the current and previous years of assessment', () => {
    expect(taxYearOptions('2027-06')).toEqual([
      { value: '2027-06', label: 'Year ending June 2027' },
      { value: '2026-06', label: 'Year ending June 2026' },
      { value: '2025-06', label: 'Year ending June 2025' },
    ]);
  });

  it('computes an effective rate and ignores losses', () => {
    expect(effectiveRatePercent(27000, 100000)).toBe(27);
    expect(effectiveRatePercent(7070, 200000)).toBe(3.5);
    expect(effectiveRatePercent(0, -5000)).toBe(0);
  });

  it('shows a negative amount due as a refund', () => {
    expect(amountDueLabel(-50)).toBe(`${formatCurrency(50)} refund`);
    expect(amountDueLabel(1200)).toBe(formatCurrency(1200));
  });

  it('formats a local calendar date', () => {
    expect(localIsoDate(new Date(2026, 9, 5))).toBe('2026-10-05');
  });

  it('picks the next provisional payment still to come', () => {
    const row = { return_id: null, return_status: null };
    const plan: ProvisionalPlanRow[] = [
      { kind: 'irp6_p1', label: '1st payment', due_date: '2026-08-31', suggested_payment: 100, ...row },
      { kind: 'irp6_p2', label: '2nd payment', due_date: '2027-02-28', suggested_payment: 100, ...row },
      { kind: 'irp6_p3', label: 'Top-up', due_date: '2027-09-30', suggested_payment: null, ...row },
    ];
    expect(nextProvisionalPayment(plan, '2026-08-31')?.kind).toBe('irp6_p1');
    expect(nextProvisionalPayment(plan, '2026-10-26')?.kind).toBe('irp6_p2');
    expect(nextProvisionalPayment(plan, '2027-10-01')).toBeNull();
  });

  it('skips provisional periods that are already submitted', () => {
    const plan: ProvisionalPlanRow[] = [
      { kind: 'irp6_p1', label: '1st', due_date: '2026-08-31', suggested_payment: 100, return_id: 3, return_status: 'submitted' },
      { kind: 'irp6_p2', label: '2nd', due_date: '2027-02-28', suggested_payment: 50, return_id: 4, return_status: 'draft' },
    ];
    expect(nextProvisionalPayment(plan, '2026-08-01')?.kind).toBe('irp6_p2');
  });
});
