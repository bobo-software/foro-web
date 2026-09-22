import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import type { SupplierRecurrenceInterval } from '@/types/supplier';
import { RECURRENCE_INTERVAL_OPTIONS, suggestNextExpectedPaymentDate } from '@/utils/recurrence';
import { localDateISO } from '@/utils/localDateISO';

const REPEAT_OPTIONS = [{ value: 'none', label: 'Does not repeat' }, ...RECURRENCE_INTERVAL_OPTIONS];

interface SupplierRecurrenceFieldsProps {
  interval: SupplierRecurrenceInterval | null;
  nextExpectedPaymentDate: string | null;
  expectedAmount: number | null;
  onIntervalChange: (value: SupplierRecurrenceInterval | null) => void;
  onNextDateChange: (value: string | null) => void;
  onExpectedAmountChange: (value: number | null) => void;
  disabled?: boolean;
}

export function SupplierRecurrenceFields({
  interval,
  nextExpectedPaymentDate,
  expectedAmount,
  onIntervalChange,
  onNextDateChange,
  onExpectedAmountChange,
  disabled,
}: SupplierRecurrenceFieldsProps) {
  return (
    <>
      <AppLabeledSelectInput
        label="Repeats"
        value={interval ?? 'none'}
        options={REPEAT_OPTIONS}
        placeholder="Does not repeat"
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          if (next === '' || next === 'none') {
            onIntervalChange(null);
            onNextDateChange(null);
            onExpectedAmountChange(null);
            return;
          }
          const value = next as SupplierRecurrenceInterval;
          onIntervalChange(value);
          if (!nextExpectedPaymentDate) {
            onNextDateChange(suggestNextExpectedPaymentDate(localDateISO(), value));
          }
        }}
      />
      {interval && (
        <>
          <AppInputLabeled
            label="Next expected payment *"
            type="date"
            value={nextExpectedPaymentDate ?? ''}
            onChange={(e) => onNextDateChange(e.target.value || null)}
            disabled={disabled}
            required
          />
          <AppInputLabeled
            label="Expected amount"
            type="number"
            min={0}
            step={0.01}
            value={expectedAmount == null ? '' : String(expectedAmount)}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onExpectedAmountChange(null);
                return;
              }
              const n = Number(raw);
              onExpectedAmountChange(Number.isFinite(n) ? n : null);
            }}
            disabled={disabled}
          />
        </>
      )}
    </>
  );
}
