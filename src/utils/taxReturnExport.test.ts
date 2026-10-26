import { describe, expect, it } from 'vitest';
import type { TaxReturn, TaxReturnMonthlyTotals } from '@/types/businessTax';
import { formatSummaryAmount, taxReturnSummaryRows } from './businessTax';
import { formatCurrency } from './currency';
import { TAX_EXPORT_DISCLAIMER, buildTaxReturnCsv, shortMonthLabel, taxReturnFilename } from './taxReturnExport';

const baseReturn: TaxReturn = {
  id: 1,
  business_id: 62,
  kind: 'annual',
  tax_year_code: '2027-02',
  period_start: '2026-03-01',
  period_end: '2027-02-28',
  entity_type: 'sbc',
  status: 'draft',
  figures: {
    gross_income: 2200,
    credit_notes: 275,
    bill_costs: 1840,
    expense_costs: 0,
    non_deductible: 0,
    payroll_costs: 0,
    adjustments_total: 500000,
    taxable_income: 500085,
  },
  estimate_override: null,
  gross_tax: 46987.85,
  rebates: 0,
  tax_liability: 46987.85,
  rate_table_code: '2026/27',
  due_date: null,
  other_credits: 0,
  prior_payments: 23485,
  amount_due: 23502.85,
  warnings: ['Year still open, "estimate" only'],
  notes: null,
  submitted_at: null,
  updated_at: null,
  adjustments: [{ id: 9, label: 'Other add-back', direction: 'add', amount: 500000 }],
};

const monthly: TaxReturnMonthlyTotals = {
  return_id: 1,
  vat_registered: true,
  period_start: '2026-03-01',
  data_through: '2027-02-28',
  months: [
    {
      month: '2026-09',
      gross_income: 2200,
      credit_notes: 275,
      bill_costs: 1840,
      expense_costs: 0,
      non_deductible: 0,
      payroll_costs: 0,
      net: 85,
    },
  ],
  totals: {
    gross_income: 2200,
    credit_notes: 275,
    bill_costs: 1840,
    expense_costs: 0,
    non_deductible: 0,
    payroll_costs: 0,
    net: 85,
  },
};

describe('taxReturnExport', () => {
  it('signs deductions and payments negative in the summary', () => {
    const rows = taxReturnSummaryRows(baseReturn);
    const byLabel = Object.fromEntries(rows.map((row) => [row.label, row.amount]));
    expect(byLabel['Less credit notes']).toBe(-275);
    expect(byLabel['Adjustments']).toBe(500000);
    expect(byLabel['Taxable income']).toBe(500085);
    expect(byLabel['Less provisional tax already submitted']).toBe(-23485);
    expect(rows[rows.length - 1]).toEqual({
      label: 'Amount still due',
      amount: 23502.85,
      emphasis: true,
      isAmountDue: true,
    });
    expect(byLabel['Less rebates']).toBeUndefined();
  });

  it('shows the half-year line and estimate on a 1st-period IRP6', () => {
    const rows = taxReturnSummaryRows({
      ...baseReturn,
      kind: 'irp6_p1',
      estimate_override: 500000,
      gross_tax: 46970,
      tax_liability: 23485,
      prior_payments: 0,
      amount_due: 23485,
    });
    const labels = rows.map((row) => row.label);
    expect(labels).toContain('Projected taxable income');
    expect(labels).toContain('Your estimate of taxable income (used)');
    expect(rows.find((row) => row.label === 'Tax for the year')?.amount).toBe(46970);
    expect(rows.find((row) => row.label === 'Half for the 1st period')?.amount).toBe(23485);
    expect(rows[rows.length - 1].label).toBe('Payment due');
  });

  it('formats deductions in brackets and a negative amount due as a refund', () => {
    expect(formatSummaryAmount({ label: 'Less credit notes', amount: -275 })).toBe(`(${formatCurrency(275)})`);
    expect(formatSummaryAmount({ label: 'Less expenses', amount: -0 })).toBe(formatCurrency(0));
    expect(formatSummaryAmount({ label: 'Refund due', amount: -50, isAmountDue: true })).toBe(
      `${formatCurrency(50)} refund`,
    );
  });

  it('names files by return type and year', () => {
    expect(taxReturnFilename(baseReturn, 'pdf')).toBe('income-tax-2027-02.pdf');
    expect(taxReturnFilename({ ...baseReturn, kind: 'irp6_p2' }, 'csv')).toBe('irp6-p2-2027-02.csv');
    expect(shortMonthLabel('2026-09')).toBe('Sep 2026');
  });

  it('builds a CSV with the calculation, adjustments, months, warnings and disclaimer', () => {
    const csv = buildTaxReturnCsv(baseReturn, monthly, { taxReference: '9012345678' });
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Annual income tax return');
    expect(lines).toContain('Income tax reference,9012345678');
    expect(lines).toContain('Less credit notes,-275.00');
    expect(lines).toContain('Other add-back,Add back,500000.00');
    expect(lines).toContain('Month,Income,Credit notes,Bills,Expenses,Non-deductible,Payroll,Net');
    expect(lines).toContain('2026-09,2200.00,275.00,1840.00,0.00,0.00,0.00,85.00');
    expect(lines).toContain('Total,2200.00,275.00,1840.00,0.00,0.00,0.00,85.00');
    expect(lines).toContain('"Year still open, ""estimate"" only"');
    expect(lines[lines.length - 1]).toBe(TAX_EXPORT_DISCLAIMER.includes(',') ? `"${TAX_EXPORT_DISCLAIMER}"` : TAX_EXPORT_DISCLAIMER);
  });
});
