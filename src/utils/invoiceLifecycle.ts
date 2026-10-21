import type { Invoice, InvoiceStatus } from '../types/invoice';
import { localDateISO } from './localDateISO';

interface InvoiceStatusFields {
  status?: string;
  due_date?: string | null;
  document_kind?: string | null;
}

function storedStatus(status: string | undefined): InvoiceStatus {
  if (status === 'accepted' || status === 'overdue') return 'sent';
  return (status as InvoiceStatus) || 'draft';
}

/** The status shown in the UI/API: stored sent + past due becomes overdue. */
export function effectiveInvoiceStatus(
  invoice: InvoiceStatusFields,
  today = localDateISO(),
): InvoiceStatus {
  const status = storedStatus(invoice.status);
  if (
    status === 'sent' &&
    invoice.document_kind !== 'credit_note' &&
    invoice.due_date &&
    invoice.due_date.slice(0, 10) < today
  ) {
    return 'overdue';
  }
  return status;
}

export function withEffectiveInvoiceStatus(invoice: Invoice, today = localDateISO()): Invoice {
  return { ...invoice, status: effectiveInvoiceStatus(invoice, today) };
}

export function canSendInvoice(invoice: InvoiceStatusFields): boolean {
  const status = effectiveInvoiceStatus(invoice);
  return status === 'draft' || status === 'sent' || status === 'overdue';
}

export function canCancelInvoice(invoice: InvoiceStatusFields): boolean {
  const status = effectiveInvoiceStatus(invoice);
  return status === 'draft' || status === 'sent' || status === 'overdue';
}

export function canMarkInvoicePaid(invoice: InvoiceStatusFields): boolean {
  const status = effectiveInvoiceStatus(invoice);
  return invoice.document_kind !== 'credit_note' && (status === 'sent' || status === 'overdue');
}
