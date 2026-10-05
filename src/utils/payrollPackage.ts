export interface PackageTypeRef {
  id: number;
  code: string;
  direction: string;
}

export interface PackageLineRef {
  component_type_id: number;
  calculation_method: string;
  amount?: string | number | null;
  percent?: string | number | null;
}

export function parseMoney(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function basicSalaryAmount(lines: PackageLineRef[], types: PackageTypeRef[]): number {
  const basicType = types.find((type) => type.code === 'BASIC');
  if (!basicType?.id) return 0;
  const line = lines.find((row) => row.component_type_id === basicType.id);
  if (!line || line.calculation_method !== 'amount') return 0;
  return roundMoney(parseMoney(line.amount));
}

export function resolvedLineAmount(line: PackageLineRef, basic: number): number {
  if (line.calculation_method === 'percent_of_basic') {
    return roundMoney((basic * parseMoney(line.percent)) / 100);
  }
  return roundMoney(parseMoney(line.amount));
}

export function summarizePackage(lines: PackageLineRef[], types: PackageTypeRef[]) {
  const byId = new Map(types.map((type) => [type.id, type]));
  const basic = basicSalaryAmount(lines, types);
  let earnings = 0;
  let deductions = 0;
  let employerContributions = 0;
  const items = lines.map((line) => {
    const type = byId.get(line.component_type_id);
    const amount = resolvedLineAmount(line, basic);
    if (type?.direction === 'earning') earnings = roundMoney(earnings + amount);
    else if (type?.direction === 'deduction') deductions = roundMoney(deductions + amount);
    else if (type?.direction === 'employer') employerContributions = roundMoney(employerContributions + amount);
    return { ...line, amount, type };
  });
  return {
    basic,
    earnings,
    deductions,
    employerContributions,
    netBeforeTax: roundMoney(earnings - deductions),
    items,
  };
}
