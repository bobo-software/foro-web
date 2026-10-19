import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { usePortalNoIndex } from '@/hooks/usePortalNoIndex';
import { ThemeToggleButton } from '@/components/elements/ThemeToggleButton';
import StatementPortalService from '@/services/statementPortalService';
import type { BankingDetails } from '@/types/bankingDetails';
import type { Business } from '@/types/business';
import type { Invoice, InvoiceItem } from '@/types/invoice';
import { DocumentSheet } from '@/components/elements/DocumentSheet';
import { generateInvoicePdf } from '@/utils/invoicePdf';
import { isCreditNoteInvoice } from '@/utils/invoiceLedger';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, { dateStyle: 'long' });
}

export function StatementPortalInvoiceViewPage() {
  usePortalNoIndex();
  const navigate = useNavigate();
  const { companyId: companyIdParam, invoiceId: invoiceIdParam } = useParams<{
    companyId: string;
    invoiceId: string;
  }>();
  const companyId = Number(companyIdParam);
  const invoiceId = Number(invoiceIdParam);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [bankingDetails, setBankingDetails] = useState<BankingDetails | null>(null);

  useEffect(() => {
    if (!StatementPortalService.hasSession()) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    StatementPortalService.getInvoice(companyId, invoiceId)
      .then((result) => {
        if (cancelled) return;
        setInvoice(result.invoice);
        setLineItems(result.lineItems);
        setBusiness(result.business);
        setBankingDetails(result.bankingDetails);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          navigate('/statements');
        } else {
          setError('This invoice is not available.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, invoiceId, navigate]);

  const handleDownloadPdf = useCallback(async () => {
    if (!invoice) return;
    await generateInvoicePdf(invoice, lineItems, business);
  }, [invoice, lineItems, business]);

  if (!StatementPortalService.hasSession()) {
    return <Navigate to="/statements" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading invoice…</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <p className="text-slate-700 dark:text-slate-200 text-center max-w-md text-sm">{error ?? 'Not available.'}</p>
        <Link to={`/statements/${companyId}`} className="mt-6 text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
          Back to statement
        </Link>
      </div>
    );
  }

  const isCn = isCreditNoteInvoice(invoice);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 print:bg-white print:text-black">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to={`/statements/${companyId}`} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              ← Back to statement
            </Link>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {isCn ? 'Credit note' : 'Invoice'} {invoice.invoice_number}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Download PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <DocumentSheet
          business={business}
          bankingDetails={bankingDetails}
          dateLine={`Issued ${formatDate(invoice.issue_date)} · Due ${formatDate(invoice.due_date)}`}
          status={invoice.status}
          customerName={invoice.customer_name}
          customerAddress={invoice.customer_address}
          lines={lineItems}
          subtotal={Number(invoice.subtotal) || 0}
          taxRate={invoice.tax_rate}
          currency={invoice.currency}
          notes={invoice.notes}
        />
      </main>
    </div>
  );
}

export default StatementPortalInvoiceViewPage;
