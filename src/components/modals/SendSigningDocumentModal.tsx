import { useEffect, useState } from 'react';
import { LuSend } from 'react-icons/lu';
import AppModal from './AppModal';
import ContactService from '../../services/contactService';
import type { Contact } from '../../types/contact';

interface SendSigningDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
  companyName: string;
  onSend: (contactId: number) => Promise<void>;
}

/** Picks the recipient: the company's primary contact by default, or any other contact with an email. */
export function SendSigningDocumentModal({ isOpen, onClose, companyId, companyName, onSend }: SendSigningDocumentModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    ContactService.findByCompanyId(companyId)
      .then((rows) => {
        if (cancelled) return;
        // Primary first, then by name.
        const sorted = [...rows].sort(
          (a, b) => Number(!!b.is_primary) - Number(!!a.is_primary) || a.name.localeCompare(b.name),
        );
        setContacts(sorted);
        const primary = sorted.find((c) => c.is_primary && c.email?.trim());
        const firstWithEmail = sorted.find((c) => c.email?.trim());
        setSelectedId((primary ?? firstWithEmail)?.id ?? null);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Failed to load contacts'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, companyId]);

  const send = async () => {
    if (selectedId == null) return;
    setSending(true);
    setError(null);
    try {
      await onSend(selectedId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send document');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Send for signature"
      titleIcon={<LuSend size={16} />}
      subtitle={companyName}
      size="lg"
      buttons={[
        { label: 'Cancel', onClick: onClose, variant: 'secondary' },
        {
          label: 'Send',
          onClick: send,
          variant: 'primary',
          disabled: selectedId == null,
          loading: sending,
          loadingLabel: 'Sending…',
        },
      ]}
    >
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        The recipient gets an email link. They confirm a one-time code sent to the same address before they can
        view, download and sign. The document can't be edited after it is sent.
      </p>
      {loading ? (
        <p className="py-4 text-center text-xs text-slate-500">Loading contacts…</p>
      ) : contacts.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">
          This company has no contacts yet. Add one on the company's Contacts tab first.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {contacts.map((contact) => {
            const email = contact.email?.trim();
            const disabled = !email;
            return (
              <li key={contact.id}>
                <label
                  className={`flex items-center gap-3 px-3 py-2 text-sm ${
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="signing-recipient"
                    checked={selectedId === contact.id}
                    disabled={disabled}
                    onChange={() => setSelectedId(contact.id ?? null)}
                    className="accent-indigo-600"
                  />
                  <span className="flex-1">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{contact.name}</span>
                    {contact.is_primary && (
                      <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        Primary
                      </span>
                    )}
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{email || 'No email address'}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </AppModal>
  );
}

export default SendSigningDocumentModal;
