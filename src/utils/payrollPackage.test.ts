import { describe, expect, it } from 'vitest';
import { summarizePackage } from './payrollPackage';

describe('summarizePackage', () => {
  it('resolves percent of basic', () => {
    const summary = summarizePackage(
      [
        { component_type_id: 1, calculation_method: 'amount', amount: '10000' },
        { component_type_id: 2, calculation_method: 'percent_of_basic', percent: 10 },
      ],
      [
        { id: 1, code: 'BASIC', direction: 'earning' },
        { id: 2, code: 'RETIREMENT', direction: 'deduction' },
      ],
    );
    expect(summary.basic).toBe(10000);
    expect(summary.deductions).toBe(1000);
    expect(summary.netBeforeTax).toBe(9000);
  });
});
