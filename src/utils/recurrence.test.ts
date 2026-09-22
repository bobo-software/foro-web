import { describe, expect, it } from 'vitest';
import {
  formatCalendarDate,
  suggestNextExpectedPaymentDate,
  toCalendarDate,
} from './recurrence';

describe('suggestNextExpectedPaymentDate', () => {
  it('adds a week', () => {
    expect(suggestNextExpectedPaymentDate('2026-09-21', 'weekly')).toBe('2026-09-28');
  });

  it('adds a calendar month', () => {
    expect(suggestNextExpectedPaymentDate('2026-09-01', 'monthly')).toBe('2026-10-01');
  });

  it('adds a year', () => {
    expect(suggestNextExpectedPaymentDate('2026-09-21', 'yearly')).toBe('2027-09-21');
  });
});

describe('toCalendarDate', () => {
  it('keeps YYYY-MM-DD', () => {
    expect(toCalendarDate('2026-10-21')).toBe('2026-10-21');
  });

  it('slices an ISO timestamp', () => {
    expect(toCalendarDate('2026-10-21T00:00:00.000Z')).toBe('2026-10-21');
  });

  it('returns null for empty values', () => {
    expect(toCalendarDate(null)).toBeNull();
    expect(toCalendarDate('')).toBeNull();
  });
});

describe('formatCalendarDate', () => {
  it('formats without shifting the calendar day', () => {
    expect(formatCalendarDate('2026-10-21')).toBe('21/10/2026');
  });
});
