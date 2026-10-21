import { LuFileText } from 'react-icons/lu';
import { AppModal } from './AppModal';
import { formatCurrency } from '../../utils/currency';

export interface ConverInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  converting: boolean;
  quotationNumber: string;
  quotationStatus: string;
  customerName: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency?: string;
}

function ConverInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  converting,
  quotationNumber,
  quotationStatus,
  customerName,
  subtotal,
  vatRate,
  vatAmount,
  total,
  currency,
}: ConverInvoiceModalProps) {
  return (
    <AppModal
      isOpen={isOpen}
      onClose={() => !converting && onClose()}
      title="Convert to Invoice"
      titleIcon={<LuFileText size={16} />}
      size="sm"
      closeOnBackdrop={!converting}
      showCloseButton={!converting}
      buttons={[
        {
          label: 'Cancel',
          variant: 'secondary',
          onClick: onClose,
          disabled: converting,
        },
        {
          label: 'Convert',
          variant: 'primary',
          onClick: () => onConfirm(),
          loading: converting,
          loadingLabel: 'Converting…',
        },
      ]}
    >
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
        <p>
          Create an invoice from{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {quotationNumber}
          </span>{' '}
          for{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {customerName}
          </span>
          ?
        </p>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 px-4 py-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400 dark:text-slate-500">Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          {vatRate > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500">VAT ({vatRate}%)</span>
              <span>{formatCurrency(vatAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-200 dark:border-slate-600">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          The new invoice starts as a draft so its lines can still be edited.
        </p>

        {quotationStatus !== 'accepted' && quotationStatus !== 'sent' && (
          <p className="text-amber-600 dark:text-amber-400 text-xs">
            Note: This quotation has status "{quotationStatus}". Accepted or sent status is recommended before converting.
          </p>
        )}
      </div>
    </AppModal>
  );
}

export default ConverInvoiceModal;
