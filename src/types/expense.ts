export const EXPENSE_CATEGORIES = ['fuel', 'travel', 'office', 'meals', 'utilities', 'other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'fuel', label: 'Fuel' },
  { value: 'travel', label: 'Travel' },
  { value: 'office', label: 'Office' },
  { value: 'meals', label: 'Meals' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
];

export interface Expense {
  id?: number;
  business_id: number;
  date: string;
  amount: number;
  currency?: string;
  category: ExpenseCategory;
  payee?: string | null;
  payment_method?: string;
  reference?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CreateExpenseDto = Omit<Expense, 'id' | 'created_at' | 'updated_at'>;
