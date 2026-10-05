import { foroApiClient } from '../backend';
import type { CreateExpenseDto, Expense, ExpenseCategory } from '../types/expense';
import { EXPENSE_CATEGORIES } from '../types/expense';
import { toCalendarDate } from '../utils/recurrence';

const BASE = '/api/v1/expenses';

interface ApiExpenseRow {
  id: number;
  businessId: number;
  date: string;
  amount: string | number;
  currency: string | null;
  category: string;
  payee: string | null;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function isCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

function fromApi(row: ApiExpenseRow): Expense {
  const amount = Number(row.amount);
  return {
    id: row.id,
    business_id: row.businessId,
    date: toCalendarDate(row.date) ?? row.date,
    amount: Number.isFinite(amount) ? amount : 0,
    currency: row.currency ?? undefined,
    category: isCategory(row.category) ? row.category : 'other',
    payee: row.payee,
    payment_method: row.paymentMethod ?? undefined,
    reference: row.reference,
    notes: row.notes,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateExpenseDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.date !== undefined) body.date = data.date;
  if (data.amount !== undefined) body.amount = data.amount;
  if (data.currency !== undefined) body.currency = data.currency;
  if (data.category !== undefined) body.category = data.category;
  if (data.payee !== undefined) body.payee = data.payee;
  if (data.payment_method !== undefined) body.paymentMethod = data.payment_method;
  if (data.reference !== undefined) body.reference = data.reference;
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class ExpenseService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
  }): Promise<Expense[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiExpenseRow[]>(BASE, {
      limit: params?.limit ?? 200,
      offset: params?.offset ?? 0,
      ...((where.business_id ?? where.businessId) !== undefined && {
        businessId: where.business_id ?? where.businessId,
      }),
      ...((where.category) !== undefined && { category: where.category }),
      ...((where.payment_method ?? where.paymentMethod) !== undefined && {
        paymentMethod: where.payment_method ?? where.paymentMethod,
      }),
    });
    return (response.data ?? []).map(fromApi);
  }

  static async findById(id: number): Promise<Expense | null> {
    try {
      const response = await foroApiClient.get<ApiExpenseRow>(`${BASE}/${id}`);
      return response.data ? fromApi(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateExpenseDto): Promise<Expense> {
    const response = await foroApiClient.post<ApiExpenseRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(id: number, data: Partial<CreateExpenseDto>): Promise<Expense> {
    const response = await foroApiClient.put<ApiExpenseRow>(`${BASE}/${id}`, toApiBody(data));
    return fromApi(response.data);
  }

  static async delete(id: number): Promise<void> {
    await foroApiClient.delete(`${BASE}/${id}`);
  }
}

export default ExpenseService;
