import { useState } from 'react';
import toast from 'react-hot-toast';
import { LuMailPlus } from 'react-icons/lu';
import CompanyInviteService from '@/services/companyInviteService';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import type { CompanyType } from '@/types/company';

interface InviteByEmailPanelProps {
  businessId: number | undefined;
  /** Plan-limit check shared with the manual create form; returns false to block. */
  canAddCompany: () => boolean;
  initialEmail?: string;
}

const STEPS = [
  'They get an email with a link — no account needed.',
  'They enter their own company details.',
  "You're added to each other's companies automatically.",
  'They can create a login to see the quotations and invoices you send.',
];

/** Emails a company that isn't on Foro yet a link to enter its own details (UPCOMING-1). */
export function InviteByEmailPanel({ businessId, canAddCompany, initialEmail = '' }: InviteByEmailPanelProps) {
  const [email, setEmail] = useState(initialEmail);
  const [companyType, setCompanyType] = useState<CompanyType>('customer');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (businessId == null || !address || !canAddCompany()) return;
    setSending(true);
    try {
      await CompanyInviteService.send({ businessId, email: address, companyType });
      setSentTo(address);
      setEmail('');
      toast.success(`Invite sent to ${address}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the invite');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <div className="max-w-xl space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Invite them to add their details</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              For companies that aren't on Foro yet. We'll email them a link to fill in their own details, so you don't
              have to retype anything.
            </p>
          </div>

          <form onSubmit={(e) => void send(e)} className="space-y-4">
            <AppInputLabeled
              id="company_invite_email"
              label="Their email address"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSentTo(null);
              }}
              placeholder="accounts@theircompany.co.za"
              required
            />
            <div className="max-w-xs">
              <AppLabeledSelectInput
                id="company_invite_type"
                label="Add them as"
                value={companyType}
                options={[
                  { value: 'customer', label: 'Customer' },
                  { value: 'supplier', label: 'Supplier' },
                  { value: 'both', label: 'Customer & supplier' },
                ]}
                onChange={(e) => setCompanyType(e.target.value as CompanyType)}
              />
            </div>
            <button
              type="submit"
              disabled={sending || businessId == null || !email.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <LuMailPlus size={15} /> {sending ? 'Sending…' : 'Send invite'}
            </button>
          </form>

          {sentTo && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
              Invite sent to <strong className="break-all">{sentTo}</strong>. They'll appear in your companies as soon
              as they add their details — we'll notify you. Sending again to the same email replaces the old link.
            </div>
          )}
        </div>

        <ol className="space-y-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 p-4 text-sm text-slate-600 dark:text-slate-400">
          <li className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">How it works</li>
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
