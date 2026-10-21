import { describe, expect, it } from 'vitest';
import {
  canCancelInvoice,
  canMarkInvoicePaid,
  canSendInvoice,
  effectiveInvoiceStatus,
} from './invoiceLifecycle';

const invoice = (status: string, dueDate = '2026-11-01', documentKind = 'invoice') => ({
  status,
  due_date: dueDate,
  document_kind: documentKind,
});

const today = '2026-10-21';

describe('effectiveInvoiceStatus', () => {
  it('derives overdue only when a sent invoice is past due', () => {
    expect(effectiveInvoiceStatus(invoice('sent', '2026-11-01'), today)).toBe('sent');
    expect(effectiveInvoiceStatus(invoice('sent', '2026-10-21'), today)).toBe('sent');
    expect(effectiveInvoiceStatus(invoice('sent', '2026-10-20'), today)).toBe('overdue');
  });

  it('does not age credit notes and maps legacy accepted rows to sent', () => {
    expect(effectiveInvoiceStatus(invoice('sent', '2026-10-20', 'credit_note'), today)).toBe('sent');
    expect(effectiveInvoiceStatus(invoice('accepted', '2026-10-20'), today)).toBe('overdue');
  });

  it('leaves draft, paid and cancelled alone', () => {
    expect(effectiveInvoiceStatus(invoice('draft', '2026-01-01'), today)).toBe('draft');
    expect(effectiveInvoiceStatus(invoice('paid', '2026-01-01'), today)).toBe('paid');
    expect(effectiveInvoiceStatus(invoice('cancelled', '2026-01-01'), today)).toBe('cancelled');
  });
});

describe('invoice action guards', () => {
  it('allows sending and cancelling drafts and sent/overdue invoices only', () => {
    for (const status of ['draft', 'sent', 'overdue']) {
      expect(canSendInvoice(invoice(status))).toBe(true);
      expect(canCancelInvoice(invoice(status))).toBe(true);
    }
    for (const status of ['paid', 'cancelled']) {
      expect(canSendInvoice(invoice(status))).toBe(false);
      expect(canCancelInvoice(invoice(status))).toBe(false);
    }
  });

  it('allows marking only sent/overdue invoices paid, never credit notes', () => {
    expect(canMarkInvoicePaid(invoice('sent'))).toBe(true);
    expect(canMarkInvoicePaid(invoice('sent', '2026-10-20'))).toBe(true);
    expect(canMarkInvoicePaid(invoice('draft'))).toBe(false);
    expect(canMarkInvoicePaid(invoice('paid'))).toBe(false);
    expect(canMarkInvoicePaid(invoice('cancelled'))).toBe(false);
    expect(canMarkInvoicePaid(invoice('sent', '2026-11-01', 'credit_note'))).toBe(false);
  });
});
