import { describe, expect, it } from 'vitest';
import type { Emp201Detail } from '../types/emp201';
import { buildEmp201Csv, emp201DueDate, emp201Filename, emp201PeriodLabel } from './emp201';

const detail: Emp201Detail = {
  id: 1,
  business_id: 59,
  period_year: 2026,
  period_month: 9,
  status: 'draft',
  total_paye: '1845.00',
  total_uif_employee: '177.12',
  total_uif_employer: '177.12',
  total_sdl: '200.00',
  total_due: '2399.24',
  run_count: 1,
  employee_count: 1,
  due_date: '2026-10-07',
  pay_runs: [
    {
      id: 1,
      run_number: 'PR00001',
      pay_date: '2026-09-30',
      pay_frequency: 'monthly',
      total_paye: '1845.00',
      total_uif_employee: '177.12',
      total_uif_employer: '177.12',
      total_sdl: '200.00',
    },
  ],
};

describe('emp201 labels', () => {
  it('names the file and due date from the calendar month', () => {
    expect(emp201PeriodLabel(2026, 9)).toBe('September 2026');
    expect(emp201Filename(2026, 9, 'csv')).toBe('emp201-2026-09.csv');
    expect(emp201DueDate(2026, 12)).toBe('2027-01-07');
  });
});

describe('buildEmp201Csv', () => {
  it('includes liabilities, SARS refs, and the paid run', () => {
    const csv = buildEmp201Csv(
      detail,
      { business_id: 59, paye_reference: '7123456789', sdl_liable: true },
      { name: 'Purchasing Test Co' },
    );
    expect(csv).toContain('EMP201 monthly return');
    expect(csv).toContain('Purchasing Test Co');
    expect(csv).toContain('September 2026');
    expect(csv).toContain('7123456789');
    expect(csv).toContain('2399.24');
    expect(csv).toContain('PR00001');
  });
});
