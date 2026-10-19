import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DocumentSheet } from '@/components/elements/DocumentSheet';
import ReceivedDocumentsService from '@/services/receivedDocumentsService';
import type { BankingDetails } from '@/types/bankingDetails';
import type { Business } from '@/types/business';
import type { Invoice, InvoiceItem } from '@/types/invoice';
import type { Quotation, QuotationLine } from '@/types/quotation';
import { generateInvoicePdf } from '@/utils/invoicePdf';
import { generateQuotationPdf } from '@/utils/quotationPdf';
import { isCreditNoteInvoice } from '@/utils/invoiceLedger';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, { dateStyle: 'long' });
}

type Loaded =
  | { kind: 'invoices'; invoice: Invoice; lineItems: InvoiceItem[]; business: Business | null; bankingDetails: BankingDetails | null }
  | {
      kind: 'quotations';
      quotation: Quotation;
      lineItems: QuotationLine[];
      business: Business | null;
      bankingDetails: BankingDetails | null;
    };

/** Read-only view of an invoice/quotation a linked Foro business sent you. */
export function ReceivedDocumentPage() {
  const { id = '', kind, docId = '' } = useParams<{ id: string; kind: string; docId: string }>();
  const companyId = Number(id);
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setError(null);
    const load: Promise<Loaded> =
      kind === 'quotations'
        ? ReceivedDocumentsService.getQuotation(companyId, Number(docId)).then((r) => ({ kind: 'quotations', ...r }))
        : ReceivedDocumentsService.getInvoice(companyId, Number(docId)).then((r) => ({ kind: 'invoices', ...r }));
    load
      .then((result) => {
        if (!cancelled) setDoc(result);
      })
      .catch(() => {
        if (!cancelled) setError('This document is not available.');
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, docId, kind]);

  const downloadPdf = useCallback(async () => {
    if (!doc) return;
    if (doc.kind === 'invoices') await generateInvoicePdf(doc.invoice, doc.lineItems, doc.business);
    else await generateQuotationPdf(doc.quotation, doc.lineItems, doc.business);
  }, [doc]);

  const backTo = `/app/companies/${companyId}?tab=received-${kind === 'quotations' ? 'quotations' : 'invoices'}`;

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-700 dark:text-slate-200">{error}</p>
        <Link to={backTo} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          ← Back to company
        </Link>
      </div>
    );
  }
  if (!doc) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>;

  const title =
    doc.kind === 'invoices'
      ? `${isCreditNoteInvoice(doc.invoice) ? 'Credit note' : 'Invoice'} ${doc.invoice.invoice_number}`
      : `Quotation ${doc.quotation.quotation_number}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link to={backTo} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            ← Back to {doc.business?.name ?? 'company'}
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sent to you by {doc.business?.name ?? 'a linked business'} · read-only</p>
        </div>
        <button
          type="button"
          onClick={() => void downloadPdf()}
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Download PDF
        </button>
      </div>

      {doc.kind === 'invoices' ? (
        <DocumentSheet
          business={doc.business}
          bankingDetails={doc.bankingDetails}
          dateLine={`Issued ${formatDate(doc.invoice.issue_date)} · Due ${formatDate(doc.invoice.due_date)}`}
          status={doc.invoice.status}
          customerName={doc.invoice.customer_name}
          customerAddress={doc.invoice.customer_address}
          lines={doc.lineItems}
          subtotal={Number(doc.invoice.subtotal) || 0}
          taxRate={doc.invoice.tax_rate}
          currency={doc.invoice.currency}
          notes={doc.invoice.notes}
        />
      ) : (
        <DocumentSheet
          business={doc.business}
          bankingDetails={doc.bankingDetails}
          dateLine={
            doc.quotation.valid_until
              ? `Issued ${formatDate(doc.quotation.issue_date)} · Valid until ${formatDate(doc.quotation.valid_until)}`
              : `Issued ${formatDate(doc.quotation.issue_date)}`
          }
          status={doc.quotation.status}
          customerName={doc.quotation.customer_name}
          customerAddress={doc.quotation.customer_address}
          lines={doc.lineItems}
          subtotal={Number(doc.quotation.subtotal) || 0}
          taxRate={doc.quotation.tax_rate}
          currency={doc.quotation.currency}
          notes={doc.quotation.notes}
        />
      )}
    </div>
  );
}
