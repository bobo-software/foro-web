export const RECURRENCE_INTERVALS = ['weekly', 'monthly', 'yearly'] as const;
export type RecurrenceInterval = (typeof RECURRENCE_INTERVALS)[number];

export const RECURRENCE_INTERVAL_OPTIONS: { value: RecurrenceInterval; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function isRecurrenceInterval(value: unknown): value is RecurrenceInterval {
  return value === 'weekly' || value === 'monthly' || value === 'yearly';
}

/** Calendar `YYYY-MM-DD` from an API date, ISO timestamp, or already-canonical string. */
export function toCalendarDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    return match ? match[1] : null;
  }
  return null;
}

/** Display a calendar date without local-timezone shift. */
export function formatCalendarDate(iso: string): string {
  const date = toCalendarDate(iso);
  if (!date) return iso;
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', { timeZone: 'UTC' });
}

/** Calendar-date arithmetic in UTC so ISO `YYYY-MM-DD` does not shift with local TZ. */
export function suggestNextExpectedPaymentDate(fromIso: string, interval: RecurrenceInterval): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromIso.trim());
  if (!match) return fromIso;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (interval === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
  else if (interval === 'monthly') date.setUTCMonth(date.getUTCMonth() + 1);
  else date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}
