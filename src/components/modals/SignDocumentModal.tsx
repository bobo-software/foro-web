import { useState } from 'react';
import { LuPenLine } from 'react-icons/lu';
import AppModal from './AppModal';
import SignaturePadField from '../elements/SignaturePadField';
import type { SignatureSubmission } from '../../types/signingDocument';

interface SignDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  defaultName?: string;
  onSubmit: (signature: SignatureSubmission) => Promise<void>;
}

export function SignDocumentModal({ isOpen, onClose, documentTitle, defaultName, onSubmit }: SignDocumentModalProps) {
  const [signature, setSignature] = useState<SignatureSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!signature) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(signature);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your signature');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign document"
      titleIcon={<LuPenLine size={16} />}
      subtitle={documentTitle}
      size="xl"
      buttons={[
        { label: 'Cancel', onClick: onClose, variant: 'secondary' },
        {
          label: 'Sign now',
          onClick: submit,
          variant: 'primary',
          disabled: !signature,
          loading: submitting,
          loadingLabel: 'Signing…',
        },
      ]}
    >
      {/* Remount per opening so the pad and date start fresh. */}
      {isOpen && <SignaturePadField defaultName={defaultName} onChange={setSignature} />}
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        By clicking “Sign now” you agree that this electronic signature is the legal equivalent of your handwritten
        signature on this document.
      </p>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </AppModal>
  );
}

export default SignDocumentModal;
