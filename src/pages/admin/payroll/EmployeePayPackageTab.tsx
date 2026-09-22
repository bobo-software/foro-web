import { useEffect, useMemo, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledCheckbox from '@/components/forms/AppLabeledCheckbox';
import { useEmployeeRecurringComponentStore } from '@/stores/data/EmployeeRecurringComponentStore';
import { usePayrollComponentTypeStore } from '@/stores/data/PayrollComponentTypeStore';
import { employeeRecurringComponentSchema, payrollComponentTypeSchema } from '@/validation/schemas';
import { formatCurrency } from '@/utils/currency';
import { parseMoney, summarizePackage } from '@/utils/payrollPackage';
import type { Employee } from '@/types/employee';
import type { PayrollCalculationMethod, PayrollComponentDirection } from '@/types/payrollPackage';
import {
  PAYROLL_CALCULATION_METHOD_OPTIONS,
  PAYROLL_COMPONENT_DIRECTION_OPTIONS,
} from '@/types/payrollPackage';

interface EmployeePayPackageTabProps {
  employee: Employee;
}

export function EmployeePayPackageTab({ employee }: EmployeePayPackageTabProps) {
  const types = usePayrollComponentTypeStore((s) => s.types);
  const typesLoading = usePayrollComponentTypeStore((s) => s.loading);
  const fetchTypes = usePayrollComponentTypeStore((s) => s.fetchTypes);
  const createType = usePayrollComponentTypeStore((s) => s.createType);
  const lines = useEmployeeRecurringComponentStore((s) => s.lines);
  const linesLoading = useEmployeeRecurringComponentStore((s) => s.loading);
  const fetchLines = useEmployeeRecurringComponentStore((s) => s.fetchLines);
  const addLine = useEmployeeRecurringComponentStore((s) => s.addLine);
  const updateLine = useEmployeeRecurringComponentStore((s) => s.updateLine);
  const removeLine = useEmployeeRecurringComponentStore((s) => s.removeLine);

  const [componentTypeId, setComponentTypeId] = useState('');
  const [method, setMethod] = useState<PayrollCalculationMethod>('amount');
  const [amount, setAmount] = useState('');
  const [percent, setPercent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customDirection, setCustomDirection] = useState<PayrollComponentDirection>('earning');

  useEffect(() => {
    if (employee.id == null) return;
    void fetchTypes({ packageEligible: true });
    void fetchLines(employee.id);
  }, [employee.id, fetchTypes, fetchLines]);

  const usedTypeIds = useMemo(
    () => new Set(lines.map((line) => line.component_type_id)),
    [lines],
  );
  const availableTypes = useMemo(
    () => types.filter((type) => type.id != null && !usedTypeIds.has(type.id) && type.package_eligible),
    [types, usedTypeIds],
  );
  const selectedType = types.find((type) => String(type.id) === componentTypeId);
  const typeById = useMemo(
    () => new Map(types.filter((type) => type.id != null).map((type) => [type.id!, type])),
    [types],
  );
  const summary = useMemo(
    () =>
      summarizePackage(
        lines.map((line) => ({
          component_type_id: line.component_type_id,
          calculation_method: line.calculation_method,
          amount: line.amount,
          percent: line.percent,
        })),
        types
          .filter((type) => type.id != null)
          .map((type) => ({ id: type.id!, code: type.code, direction: type.direction })),
      ),
    [lines, types],
  );

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (employee.id == null) return;
    const parsed = employeeRecurringComponentSchema.safeParse({
      component_type_id: Number(componentTypeId),
      calculation_method: method,
      amount: method === 'amount' ? Number(amount) : undefined,
      percent: method === 'percent_of_basic' ? Number(percent) : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please check your input');
      return;
    }
    if (selectedType?.code === 'BASIC' && method !== 'amount') {
      toast.error('Basic salary must be a rand amount');
      return;
    }
    setSaving(true);
    try {
      await addLine({
        employee_id: employee.id,
        component_type_id: parsed.data.component_type_id,
        calculation_method: parsed.data.calculation_method,
        amount: parsed.data.calculation_method === 'amount' ? parsed.data.amount : null,
        percent: parsed.data.calculation_method === 'percent_of_basic' ? parsed.data.percent : null,
        sort_order: lines.length * 10,
      });
      setComponentTypeId('');
      setAmount('');
      setPercent('');
      setMethod('amount');
      toast.success('Added to package');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add package line');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustom = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = payrollComponentTypeSchema.safeParse({
      code: customCode,
      name: customName,
      direction: customDirection,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please check your input');
      return;
    }
    const earning = parsed.data.direction === 'earning';
    setSaving(true);
    try {
      const created = await createType({
        code: parsed.data.code.toUpperCase(),
        name: parsed.data.name.trim(),
        direction: parsed.data.direction,
        taxable: earning,
        uifable: earning,
        sdl_liable: earning,
        package_eligible: true,
        sort_order: 200,
      });
      setShowCustom(false);
      setCustomName('');
      setCustomCode('');
      setCustomDirection('earning');
      if (created.id != null) setComponentTypeId(String(created.id));
      toast.success('Custom component created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create component');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLine = async (id: number, nextAmount: string, nextPercent: string, nextMethod: PayrollCalculationMethod) => {
    const parsed = employeeRecurringComponentSchema.safeParse({
      component_type_id: lines.find((line) => line.id === id)?.component_type_id,
      calculation_method: nextMethod,
      amount: nextMethod === 'amount' ? Number(nextAmount) : undefined,
      percent: nextMethod === 'percent_of_basic' ? Number(nextPercent) : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please check your input');
      return;
    }
    try {
      await updateLine(id, {
        calculation_method: parsed.data.calculation_method,
        amount: parsed.data.calculation_method === 'amount' ? parsed.data.amount : null,
        percent: parsed.data.calculation_method === 'percent_of_basic' ? parsed.data.percent : null,
      });
      toast.success('Package line updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update package line');
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeLine(id);
      toast.success('Removed from package');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove package line');
    }
  };

  if (typesLoading || linesLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading pay package…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="Basic" value={formatCurrency(summary.basic)} />
        <SummaryCard label="Earnings" value={formatCurrency(summary.earnings)} />
        <SummaryCard label="Deductions" value={formatCurrency(summary.deductions)} />
        <SummaryCard label="Net before tax" value={formatCurrency(summary.netBeforeTax)} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        PAYE, UIF and SDL are calculated when you run payroll — they are not part of this package.
      </p>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
        {lines.length === 0 && (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
            No recurring pay yet. Add basic salary, then medical aid or retirement if they apply.
          </p>
        )}
        {lines.map((line) => (
          <PackageLineRow
            key={line.id}
            name={typeById.get(line.component_type_id)?.name ?? `Component #${line.component_type_id}`}
            code={typeById.get(line.component_type_id)?.code}
            isBasic={typeById.get(line.component_type_id)?.code === 'BASIC'}
            method={line.calculation_method}
            amount={line.amount}
            percent={line.percent}
            computed={resolvedDisplay(line, summary.basic)}
            disabled={saving}
            onSave={(nextMethod, nextAmount, nextPercent) => {
              if (line.id == null) return;
              void handleUpdateLine(line.id, nextAmount, nextPercent, nextMethod);
            }}
            onRemove={() => {
              if (line.id == null) return;
              void handleRemove(line.id);
            }}
          />
        ))}
      </div>

      <form
        onSubmit={handleAdd}
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm space-y-4"
      >
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Add to package
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <AppLabeledSelectInput
            id="package-add-component"
            label="Component"
            value={componentTypeId}
            onChange={(e) => {
              const nextId = e.target.value;
              setComponentTypeId(nextId);
              const nextType = types.find((type) => String(type.id) === nextId);
              if (nextType?.code === 'BASIC') setMethod('amount');
            }}
            options={availableTypes.map((type) => ({
              value: String(type.id),
              label: type.name,
            }))}
            disabled={saving || availableTypes.length === 0}
            required
          />
          <AppLabeledSelectInput
            id="package-add-method"
            label="How it is calculated"
            value={method}
            onChange={(e) => setMethod(e.target.value as PayrollCalculationMethod)}
            options={
              selectedType?.code === 'BASIC'
                ? PAYROLL_CALCULATION_METHOD_OPTIONS.filter((option) => option.value === 'amount')
                : PAYROLL_CALCULATION_METHOD_OPTIONS
            }
            disabled={saving || selectedType?.code === 'BASIC'}
            required
          />
          {method === 'percent_of_basic' ? (
            <AppInputLabeled
              id="package-add-percent"
              label="Percent of basic"
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              disabled={saving}
              required
            />
          ) : (
            <AppInputLabeled
              id="package-add-amount"
              label="Amount (ZAR)"
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={saving}
              required
            />
          )}
        </div>
        <button
          type="submit"
          disabled={saving || !componentTypeId}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Add line
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm space-y-4">
        <AppLabeledCheckbox
          label="Create a custom component"
          checked={showCustom}
          onChange={setShowCustom}
          helperText="For a housing allowance or another earning/deduction this business uses."
        />
        {showCustom && (
          <form onSubmit={handleCreateCustom} className="grid gap-4 sm:grid-cols-3">
            <AppInputLabeled
              label="Name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              disabled={saving}
              required
            />
            <AppInputLabeled
              label="Code"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              disabled={saving}
              required
              placeholder="HOUSING"
            />
            <AppLabeledSelectInput
              label="Direction"
              value={customDirection}
              onChange={(e) => setCustomDirection(e.target.value as PayrollComponentDirection)}
              options={PAYROLL_COMPONENT_DIRECTION_OPTIONS.filter((option) => option.value !== 'employer')}
              disabled={saving}
              required
            />
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                Save custom component
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function resolvedDisplay(
  line: { calculation_method: string; amount?: string | number | null; percent?: string | number | null },
  basic: number,
): string {
  if (line.calculation_method === 'percent_of_basic') {
    return formatCurrency((basic * parseMoney(line.percent)) / 100);
  }
  return formatCurrency(parseMoney(line.amount));
}

function PackageLineRow({
  name,
  code,
  isBasic,
  method,
  amount,
  percent,
  computed,
  disabled,
  onSave,
  onRemove,
}: {
  name: string;
  code?: string;
  isBasic: boolean;
  method: PayrollCalculationMethod;
  amount?: string | number | null;
  percent?: string | number | null;
  computed: string;
  disabled: boolean;
  onSave: (method: PayrollCalculationMethod, amount: string, percent: string) => void;
  onRemove: () => void;
}) {
  const [nextMethod, setNextMethod] = useState(method);
  const [nextAmount, setNextAmount] = useState(amount == null ? '' : String(amount));
  const [nextPercent, setNextPercent] = useState(percent == null ? '' : String(percent));

  useEffect(() => {
    setNextMethod(method);
    setNextAmount(amount == null ? '' : String(amount));
    setNextPercent(percent == null ? '' : String(percent));
  }, [method, amount, percent]);

  return (
    <div className="p-4 grid gap-4 sm:grid-cols-[1fr_160px_160px_auto] items-end">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{name}</p>
        {code && <p className="text-xs text-slate-400 dark:text-slate-500">{code} · {computed}</p>}
      </div>
      <AppLabeledSelectInput
        id={`package-line-method-${code ?? name}`}
        label="How it is calculated"
        value={nextMethod}
        onChange={(e) => setNextMethod(e.target.value as PayrollCalculationMethod)}
        options={
          isBasic
            ? PAYROLL_CALCULATION_METHOD_OPTIONS.filter((option) => option.value === 'amount')
            : PAYROLL_CALCULATION_METHOD_OPTIONS
        }
        disabled={disabled || isBasic}
      />
      {nextMethod === 'percent_of_basic' ? (
        <AppInputLabeled
          id={`package-line-percent-${code ?? name}`}
          label="Percent"
          type="number"
          min={0.01}
          max={100}
          step={0.01}
          value={nextPercent}
          onChange={(e) => setNextPercent(e.target.value)}
          disabled={disabled}
        />
      ) : (
        <AppInputLabeled
          id={`package-line-amount-${code ?? name}`}
          label="Amount"
          type="number"
          min={0}
          step={0.01}
          value={nextAmount}
          onChange={(e) => setNextAmount(e.target.value)}
          disabled={disabled}
        />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave(nextMethod, nextAmount, nextPercent)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default EmployeePayPackageTab;
