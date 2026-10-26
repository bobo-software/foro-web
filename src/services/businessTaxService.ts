import { foroApiClient } from '../backend';
import { TAX_RETURN_KIND_ORDER } from '../types/businessTax';
import type {
  ProvisionalPlanRow,
  TaxReturnKind,
  BusinessTaxEntityType,
  BusinessTaxEstimate,
  BusinessTaxProfile,
  SaveBusinessTaxProfileDto,
  SaveTaxReturnAdjustmentDto,
  TaxEstimatePart,
  TaxMonthFigures,
  TaxReturn,
  TaxReturnMonthlyTotals,
  TaxReturnStatus,
  UpdateTaxReturnDto,
} from '../types/businessTax';

const PROFILES = '/api/v1/business-tax-profiles';
const ESTIMATE = '/api/v1/business-tax-estimate';
const RETURNS = '/api/v1/tax-returns';
const ADJUSTMENTS = '/api/v1/tax-return-adjustments';

interface ApiProfile {
  id: number;
  businessId: number;
  entityType: BusinessTaxEntityType;
  taxReference: string | null;
  financialYearEndMonth: number;
  vatRegistered: boolean;
  ownerDateOfBirth: string | null;
  basicAmount: string | null;
  notes: string | null;
}

interface ApiEstimatePart {
  figures: {
    grossIncome: number;
    creditNotes: number;
    billCosts: number;
    expenseCosts: number;
    nonDeductible: number;
    payrollCosts: number;
    adjustmentsTotal: number;
    taxableIncome: number;
  };
  tax: {
    taxableIncome: number;
    grossTax: number;
    rebates: number;
    taxLiability: number;
    rateTableCode: string;
    ratesExact: boolean;
  };
}

interface ApiEstimate {
  businessId: number;
  profileMissing: boolean;
  entityType: BusinessTaxEntityType;
  vatRegistered: boolean;
  yearOfAssessment: { code: string; startsOn: string; endsOn: string };
  daysElapsed: number;
  daysInYear: number;
  actual: ApiEstimatePart;
  projected: ApiEstimatePart | null;
  warnings: string[];
  provisional?: {
    kind: ProvisionalPlanRow['kind'];
    label: string;
    dueDate: string;
    suggestedPayment: number | null;
    returnId?: number | null;
    returnStatus?: TaxReturnStatus | null;
  }[];
}

function profileFromApi(row: ApiProfile): BusinessTaxProfile {
  return {
    id: row.id,
    business_id: row.businessId,
    entity_type: row.entityType,
    tax_reference: row.taxReference,
    financial_year_end_month: row.financialYearEndMonth,
    vat_registered: Boolean(row.vatRegistered),
    owner_date_of_birth: row.ownerDateOfBirth ? row.ownerDateOfBirth.slice(0, 10) : null,
    basic_amount: row.basicAmount,
    notes: row.notes ?? undefined,
  };
}

function profileToApi(data: SaveBusinessTaxProfileDto): Record<string, unknown> {
  return {
    entityType: data.entity_type,
    taxReference: data.tax_reference ?? '',
    financialYearEndMonth: data.financial_year_end_month,
    vatRegistered: data.vat_registered,
    ownerDateOfBirth: data.owner_date_of_birth ?? '',
    basicAmount: data.basic_amount ?? '',
    notes: data.notes ?? '',
  };
}

function partFromApi(part: ApiEstimatePart): TaxEstimatePart {
  return {
    figures: {
      gross_income: part.figures.grossIncome,
      credit_notes: part.figures.creditNotes,
      bill_costs: part.figures.billCosts,
      expense_costs: part.figures.expenseCosts,
      non_deductible: part.figures.nonDeductible,
      payroll_costs: part.figures.payrollCosts,
      adjustments_total: part.figures.adjustmentsTotal,
      taxable_income: part.figures.taxableIncome,
    },
    tax: {
      taxable_income: part.tax.taxableIncome,
      gross_tax: part.tax.grossTax,
      rebates: part.tax.rebates,
      tax_liability: part.tax.taxLiability,
      rate_table_code: part.tax.rateTableCode,
      rates_exact: part.tax.ratesExact,
    },
  };
}

export function estimateFromApi(row: ApiEstimate): BusinessTaxEstimate {
  return {
    business_id: row.businessId,
    profile_missing: row.profileMissing,
    entity_type: row.entityType,
    vat_registered: row.vatRegistered,
    year_of_assessment: {
      code: row.yearOfAssessment.code,
      starts_on: row.yearOfAssessment.startsOn,
      ends_on: row.yearOfAssessment.endsOn,
    },
    days_elapsed: row.daysElapsed,
    days_in_year: row.daysInYear,
    actual: partFromApi(row.actual),
    projected: row.projected ? partFromApi(row.projected) : null,
    warnings: row.warnings ?? [],
    provisional: (row.provisional ?? []).map((plan) => ({
      kind: plan.kind,
      label: plan.label,
      due_date: plan.dueDate,
      suggested_payment: plan.suggestedPayment,
      return_id: plan.returnId ?? null,
      return_status: plan.returnStatus ?? null,
    })),
  };
}

interface ApiTaxReturn {
  id: number;
  businessId: number;
  kind: TaxReturnKind;
  taxYearCode: string;
  periodStart: string;
  periodEnd: string;
  entityType: BusinessTaxEntityType;
  status: TaxReturnStatus;
  grossIncome: string;
  creditNotes: string;
  billCosts: string;
  expenseCosts: string;
  payrollCosts: string;
  nonDeductible: string;
  adjustmentsTotal: string;
  taxableIncome: string;
  estimateOverride: string | null;
  grossTax: string;
  rebates: string;
  taxLiability: string;
  rateTableCode: string | null;
  /** Detail endpoint only. */
  dueDate?: string | null;
  otherCredits: string;
  priorPayments: string;
  amountDue: string;
  /** Detail endpoint returns `warnings`; list/CRUD rows return the raw `warningsJson` column. */
  warnings?: string[];
  warningsJson?: string[] | null;
  notes: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
  adjustments?: { id: number; label: string; direction: 'add' | 'deduct'; amount: string }[];
}

const num = (value: string | number | null | undefined) => Number(value ?? 0) || 0;

interface ApiMonthFigures {
  grossIncome: number;
  creditNotes: number;
  billCosts: number;
  expenseCosts: number;
  nonDeductible: number;
  payrollCosts: number;
  net: number;
}

interface ApiMonthlyTotals {
  returnId: number;
  vatRegistered: boolean;
  periodStart: string;
  dataThrough: string;
  months: (ApiMonthFigures & { month: string })[];
  totals: ApiMonthFigures;
}

function monthFiguresFromApi(row: ApiMonthFigures): TaxMonthFigures {
  return {
    gross_income: num(row.grossIncome),
    credit_notes: num(row.creditNotes),
    bill_costs: num(row.billCosts),
    expense_costs: num(row.expenseCosts),
    non_deductible: num(row.nonDeductible),
    payroll_costs: num(row.payrollCosts),
    net: num(row.net),
  };
}

export function monthlyTotalsFromApi(row: ApiMonthlyTotals): TaxReturnMonthlyTotals {
  return {
    return_id: row.returnId,
    vat_registered: row.vatRegistered,
    period_start: row.periodStart,
    data_through: row.dataThrough,
    months: row.months.map((month) => ({ month: month.month, ...monthFiguresFromApi(month) })),
    totals: monthFiguresFromApi(row.totals),
  };
}

/** Newest year first; within a year, IRP6 periods in order, then the annual return. */
export function sortTaxReturns(rows: TaxReturn[]): TaxReturn[] {
  return [...rows].sort(
    (a, b) =>
      b.tax_year_code.localeCompare(a.tax_year_code) ||
      TAX_RETURN_KIND_ORDER.indexOf(a.kind) - TAX_RETURN_KIND_ORDER.indexOf(b.kind),
  );
}

export function taxReturnFromApi(row: ApiTaxReturn): TaxReturn {
  return {
    id: row.id,
    business_id: row.businessId,
    kind: row.kind,
    tax_year_code: row.taxYearCode,
    period_start: row.periodStart.slice(0, 10),
    period_end: row.periodEnd.slice(0, 10),
    entity_type: row.entityType,
    status: row.status,
    figures: {
      gross_income: num(row.grossIncome),
      credit_notes: num(row.creditNotes),
      bill_costs: num(row.billCosts),
      expense_costs: num(row.expenseCosts),
      non_deductible: num(row.nonDeductible),
      payroll_costs: num(row.payrollCosts),
      adjustments_total: num(row.adjustmentsTotal),
      taxable_income: num(row.taxableIncome),
    },
    estimate_override: row.estimateOverride == null ? null : num(row.estimateOverride),
    gross_tax: num(row.grossTax),
    rebates: num(row.rebates),
    tax_liability: num(row.taxLiability),
    rate_table_code: row.rateTableCode,
    due_date: row.dueDate ?? null,
    other_credits: num(row.otherCredits),
    prior_payments: num(row.priorPayments),
    amount_due: num(row.amountDue),
    warnings: row.warnings ?? row.warningsJson ?? [],
    notes: row.notes,
    submitted_at: row.submittedAt,
    updated_at: row.updatedAt,
    adjustments: (row.adjustments ?? []).map((adj) => ({ ...adj, amount: num(adj.amount) })),
  };
}

export class BusinessTaxService {
  static async listReturns(businessId: number): Promise<TaxReturn[]> {
    const response = await foroApiClient.get<ApiTaxReturn[]>(RETURNS, { businessId, limit: 100 });
    return sortTaxReturns((response.data ?? []).map(taxReturnFromApi));
  }

  static async getReturn(id: number): Promise<TaxReturn> {
    const response = await foroApiClient.get<ApiTaxReturn>(`${RETURNS}/${id}`);
    return taxReturnFromApi(response.data);
  }

  static async getMonthlyTotals(id: number): Promise<TaxReturnMonthlyTotals> {
    const response = await foroApiClient.get<ApiMonthlyTotals>(`${RETURNS}/${id}/monthly-totals`);
    return monthlyTotalsFromApi(response.data);
  }

  static async createReturn(businessId: number, kind: TaxReturnKind, taxYear: string): Promise<TaxReturn> {
    const response = await foroApiClient.post<ApiTaxReturn>(RETURNS, { businessId, kind, taxYear });
    return taxReturnFromApi(response.data);
  }

  static async updateReturn(id: number, data: UpdateTaxReturnDto): Promise<TaxReturn> {
    const body: Record<string, unknown> = { otherCredits: data.other_credits, notes: data.notes };
    if (data.estimate_override !== undefined) body.estimateOverride = data.estimate_override;
    await foroApiClient.put<ApiTaxReturn>(`${RETURNS}/${id}`, body);
    return this.getReturn(id);
  }

  static async recalculateReturn(id: number): Promise<TaxReturn> {
    const response = await foroApiClient.post<ApiTaxReturn>(`${RETURNS}/${id}/recalculate`, {});
    return taxReturnFromApi(response.data);
  }

  static async submitReturn(id: number): Promise<TaxReturn> {
    const response = await foroApiClient.post<ApiTaxReturn>(`${RETURNS}/${id}/submit`, {});
    return taxReturnFromApi(response.data);
  }

  static async deleteReturn(id: number): Promise<void> {
    await foroApiClient.delete(`${RETURNS}/${id}`);
  }

  /** Adjustment writes refill the parent return on the server, so the fresh return is reloaded. */
  static async addAdjustment(returnId: number, data: SaveTaxReturnAdjustmentDto): Promise<TaxReturn> {
    await foroApiClient.post(ADJUSTMENTS, { returnId, ...data });
    return this.getReturn(returnId);
  }

  static async updateAdjustment(
    returnId: number,
    adjustmentId: number,
    data: SaveTaxReturnAdjustmentDto,
  ): Promise<TaxReturn> {
    await foroApiClient.put(`${ADJUSTMENTS}/${adjustmentId}`, data);
    return this.getReturn(returnId);
  }

  static async deleteAdjustment(returnId: number, adjustmentId: number): Promise<TaxReturn> {
    await foroApiClient.delete(`${ADJUSTMENTS}/${adjustmentId}`);
    return this.getReturn(returnId);
  }

  static async findProfile(businessId: number): Promise<BusinessTaxProfile | null> {
    const response = await foroApiClient.get<ApiProfile[]>(PROFILES, { businessId, limit: 1 });
    const row = response.data?.[0];
    return row ? profileFromApi(row) : null;
  }

  static async saveProfile(businessId: number, data: SaveBusinessTaxProfileDto): Promise<BusinessTaxProfile> {
    const existing = await this.findProfile(businessId);
    const body = profileToApi(data);
    const response =
      existing != null
        ? await foroApiClient.put<ApiProfile>(`${PROFILES}/${existing.id}`, body)
        : await foroApiClient.post<ApiProfile>(PROFILES, { ...body, businessId });
    return profileFromApi(response.data);
  }

  static async getEstimate(businessId: number, taxYear?: string): Promise<BusinessTaxEstimate> {
    const params: Record<string, string | number> = { businessId };
    if (taxYear) params.taxYear = taxYear;
    const response = await foroApiClient.get<ApiEstimate>(ESTIMATE, params);
    return estimateFromApi(response.data);
  }
}

export default BusinessTaxService;
