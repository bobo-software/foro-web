import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LuPaperclip } from 'react-icons/lu';
import type { Invoice, InvoiceItem } from '../../types/invoice';
import { useInvoiceStore } from '../../stores/data/InvoiceStore';
import { formatCurrency } from '../../utils/currency';
import { invoicePdfFilename } from '../../utils/invoicePdf';
import { effectiveInvoiceStatus } from '../../utils/invoiceLifecycle';
import { isCreditNoteInvoice } from '../../utils/invoiceLedger';
import AppInputLabeled from '../forms/AppLabledInput';
import AppLabeledAreaInput from '../forms/AppLabledAreaInput';
import { AppModal } from './AppModal';

interface SendInvoiceEmailModalProps {
  invoice: Invoice;
  lines: InvoiceItem[];
  isOpen: boolean;
  onClose: () => void;
  onSent: (invoice: Invoice) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SendInvoiceEmailModal({ invoice, lines, isOpen, onClose, onSent }: SendInvoiceEmailModalProps) {
  const [to, setTo] = useState(invoice.customer_email ?? '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const isDraft = effectiveInvoiceStatus(invoice) === 'draft';
  const isCn = isCreditNoteInvoice(invoice);
  const noun = isCn ? 'credit note' : 'invoice';

  useEffect(() => {
    if (!isOpen) return;
    setTo(invoice.customer_email ?? '');
    setMessage('');
    setError(undefined);
    setSending(false);
  }, [isOpen, invoice.id, invoice.customer_email]);

  const send = async () => {
    const email = to.trim();
    if (email && !EMAIL_RE.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setSending(true);
    setError(undefined);
    try {
      const result = await useInvoiceStore.getState().sendInvoiceEmail({ invoice, lines, to: email, message });
      toast.success(`${isCn ? 'Credit note' : 'Invoice'} sent to ${result.to}`);
      onSent(result.invoice);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to send ${noun}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={isDraft ? `Send ${noun}` : `Resend ${noun}`}
      subtitle={`${invoice.invoice_number} · ${formatCurrency(Number(invoice.total), invoice.currency)}`}
      size="md"
      closeOnBackdrop={!sending}
      buttons={[
        { label: 'Cancel', onClick: onClose, variant: 'secondary', disabled: sending },
        {
          label: 'Send email',
          onClick: () => void send(),
          variant: 'primary',
          loading: sending,
          loadingLabel: 'Sending…',
        },
      ]}
    >
      <div className="space-y-3">
        <AppInputLabeled
          label="To"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Leave blank to use the company's primary contact"
          error={error}
        />
        <AppLabeledAreaInput
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional note to include in the email"
          rows={4}
        />
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
          <LuPaperclip size={15} aria-hidden />
          <span>{invoicePdfFilename(invoice)}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The email includes a link so they can sign in (or create a free Foro login) and see this and other documents
          you send them.
          {isDraft && ` Sending marks this ${noun} as sent and locks its lines.`}
        </p>
      </div>
    </AppModal>
  );
}
