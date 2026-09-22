import { describe, expect, it } from 'vitest';
import { buildPayRunCsv, payRunCsvFilename } from './payRunCsv';
import type { PayRunDetail } from '../types/payRun';

describe('payRunCsvFilename', () => {
  it('uses the run number', () => {
    expect(payRunCsvFilename('PR00001')).toBe('pay-run-PR00001.csv');
  });
});

describe('buildPayRunCsv', () => {
  it('includes employee nets for the accountant', () => {
    const csv = buildPayRunCsv({
      id: 1,
      business_id: 59,
      run_number: 'PR00001',
      period_start: '2026-09-01',
      period_end: '2026-09-30',
      pay_date: '2026-09-30',
      pay_frequency: 'monthly',
      status: 'paid',
      total_gross: '20000.00',
      total_paye: '1845.00',
      total_uif_employee: '177.12',
      total_uif_employer: '177.12',
      total_sdl: '200.00',
      total_net: '17800.00',
      lines: [
        {
          id: 1,
          pay_run_id: 1,
          employee_id: 1,
          first_name: 'Thabo',
          last_name: 'Molefe',
          gross: '20000.00',
          taxable: '18500.00',
          paye: '1845.00',
          uif_employee: '177.12',
          uif_employer: '177.12',
          sdl: '200.00',
          net: '17800.00',
          ytd_gross: '20000.00',
          ytd_taxable: '18500.00',
          ytd_paye: '1845.00',
          ytd_uif_employee: '177.12',
          periods_elapsed: 7,
          periods_in_year: 12,
          items: [
            {
              id: 1,
              pay_run_line_id: 1,
              component_type_id: 1,
              code: 'BASIC',
              name: 'Basic salary',
              direction: 'earning',
              amount: '20000.00',
              taxable: true,
              uifable: true,
              sdl_liable: true,
              reduces_taxable: false,
              is_once_off: false,
              sort_order: 10,
            },
          ],
        },
      ],
    } as PayRunDetail);
    expect(csv).toContain('Thabo Molefe');
    expect(csv).toContain('1845.00');
    expect(csv).toContain('BASIC');
  });
});
