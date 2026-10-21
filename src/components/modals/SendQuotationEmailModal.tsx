import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LuPaperclip } from 'react-icons/lu';
import type { Quotation, QuotationLine } from '../../types/quotation';
import { useQuotationStore } from '../../stores/data/QuotationStore';
import { formatCurrency } from '../../utils/currency';
import { quotationPdfFilename } from '../../utils/quotationPdf';
import AppInputLabeled from '../forms/AppLabledInput';
import AppLabeledAreaInput from '../forms/AppLabledAreaInput';
import { AppModal } from './AppModal';

interface SendQuotationEmailModalProps {
  quotation: Quotation;
  lines: QuotationLine[];
  isOpen: boolean;
  onClose: () => void;
  onSent: (quotation: Quotation) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SendQuotationEmailModal({ quotation, lines, isOpen, onClose, onSent }: SendQuotationEmailModalProps) {
  const [to, setTo] = useState(quotation.customer_email ?? '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!isOpen) return;
    setTo(quotation.customer_email ?? '');
    setMessage('');
    setError(undefined);
    setSending(false);
  }, [isOpen, quotation.id, quotation.customer_email]);

  const send = async () => {
    const email = to.trim();
    if (email && !EMAIL_RE.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setSending(true);
    setError(undefined);
    try {
      const result = await useQuotationStore.getState().sendQuotationEmail({ quotation, lines, to: email, message });
      toast.success(`Quotation sent to ${result.to}`);
      onSent(result.quotation);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send quotation');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={quotation.status === 'draft' ? 'Send quotation' : 'Resend quotation'}
      subtitle={`${quotation.quotation_number} · ${formatCurrency(Number(quotation.total), quotation.currency)}`}
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
          <span>{quotationPdfFilename(quotation)}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The email includes a link so they can sign in (or create a free Foro login) and see this and other documents
          you send them.
          {quotation.status === 'draft' && ' Sending marks this quotation as sent.'}
        </p>
      </div>
    </AppModal>
  );
}
