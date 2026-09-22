import { describe, expect, it } from 'vitest';
import type { PayRunDetail, PayRunLine } from '../types/payRun';
import {
  assertPayslipReady,
  buildPayslipModel,
  groupPayslipItems,
  payRunLegalName,
  payslipFilename,
  slugForFilename,
} from './payslipPdf';

const line: PayRunLine = {
  id: 1,
  pay_run_id: 1,
  employee_id: 1,
  first_name: 'Thabo',
  last_name: 'Molefe',
  known_as: 'T',
  gross: '20000.00',
  taxable: '18500.00',
  paye: '1845.00',
  uif_employee: '177.12',
  uif_employer: '177.12',
  sdl: '200.00',
  net: '16477.88',
  ytd_gross: '20000.00',
  ytd_taxable: '18500.00',
  ytd_paye: '1845.00',
  ytd_uif_employee: '177.12',
  periods_elapsed: 1,
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
    {
      id: 2,
      pay_run_line_id: 1,
      component_type_id: 6,
      code: 'RETIREMENT',
      name: 'Retirement',
      direction: 'deduction',
      amount: '1500.00',
      taxable: false,
      uifable: false,
      sdl_liable: false,
      reduces_taxable: true,
      is_once_off: false,
      sort_order: 60,
    },
    {
      id: 3,
      pay_run_line_id: 1,
      component_type_id: 7,
      code: 'PAYE',
      name: 'PAYE',
      direction: 'deduction',
      amount: '1845.00',
      taxable: false,
      uifable: false,
      sdl_liable: false,
      reduces_taxable: false,
      is_once_off: false,
      sort_order: 70,
    },
    {
      id: 4,
      pay_run_line_id: 1,
      component_type_id: 9,
      code: 'UIF_ER',
      name: 'UIF (employer)',
      direction: 'employer',
      amount: '177.12',
      taxable: false,
      uifable: false,
      sdl_liable: false,
      reduces_taxable: false,
      is_once_off: false,
      sort_order: 90,
    },
    {
      id: 5,
      pay_run_line_id: 1,
      component_type_id: 3,
      code: 'BONUS',
      name: 'Bonus',
      direction: 'earning',
      amount: '2000.00',
      taxable: true,
      uifable: true,
      sdl_liable: true,
      reduces_taxable: false,
      is_once_off: true,
      sort_order: 30,
    },
  ],
};

const run = {
  id: 1,
  business_id: 59,
  run_number: 'PR00001',
  period_start: '2026-09-01',
  period_end: '2026-09-30',
  pay_date: '2026-09-30',
  pay_frequency: 'monthly' as const,
  status: 'paid' as const,
  total_gross: '20000.00',
  total_paye: '1845.00',
  total_uif_employee: '177.12',
  total_uif_employer: '177.12',
  total_sdl: '200.00',
  total_net: '16477.88',
  lines: [line],
} satisfies PayRunDetail;

describe('payslip filename', () => {
  it('uses period end and the legal name, not the known-as', () => {
    expect(payRunLegalName(line)).toBe('Thabo Molefe');
    expect(payslipFilename('2026-09-30', 'Thabo Molefe')).toBe('payslip-2026-09-30-thabo-molefe.pdf');
  });

  it('strips punctuation from the employee slug', () => {
    expect(slugForFilename("O'Connor / Jr.")).toBe('o-connor-jr');
  });
});

describe('groupPayslipItems', () => {
  it('splits earnings, deductions, and employer contributions', () => {
    const grouped = groupPayslipItems(line.items);
    expect(grouped.earnings.map((row) => row.name)).toEqual(['Basic salary', 'Bonus (once-off)']);
    expect(grouped.deductions.map((row) => row.name)).toEqual(['Retirement', 'PAYE']);
    expect(grouped.employerContributions.map((row) => row.name)).toEqual(['UIF (employer)']);
  });
});

describe('buildPayslipModel', () => {
  it('refuses a draft run', () => {
    expect(() => assertPayslipReady('draft')).toThrow(/approved/);
    expect(() =>
      buildPayslipModel({
        run: { ...run, status: 'draft' },
        line,
      }),
    ).toThrow(/approved/);
  });

  it('builds employer, employee, and YTD fields for a paid run', () => {
    const model = buildPayslipModel({
      run,
      line,
      employee: {
        business_id: 59,
        first_name: 'Thabo',
        last_name: 'Molefe',
        tax_number: '1234567890',
        job_title: 'Baker',
        employment_type: 'permanent',
        start_date: '2026-03-01',
        pay_frequency: 'monthly',
        status: 'active',
        uif_eligible: true,
        paye_registered: true,
        medical_aid_members: 0,
      },
      settings: {
        business_id: 59,
        paye_reference: '7123456789',
        uif_reference: 'U123',
        sdl_reference: 'L123',
        sdl_liable: true,
      },
      business: { name: 'Purchasing Test Co', address: '1 Main Rd', phone: '011 000 0000' },
    });
    expect(model.filename).toBe('payslip-2026-09-30-thabo-molefe.pdf');
    expect(model.employerName).toBe('Purchasing Test Co');
    expect(model.payeReference).toBe('7123456789');
    expect(model.employeeName).toBe('Thabo Molefe');
    expect(model.taxNumber).toBe('1234567890');
    expect(model.net).toBe(16477.88);
    expect(model.ytdPaye).toBe(1845);
    expect(model.earnings).toHaveLength(2);
    expect(model.deductionTotal).toBe(3345);
  });
});
