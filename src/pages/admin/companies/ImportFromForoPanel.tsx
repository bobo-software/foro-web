import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuLink, LuSearch } from 'react-icons/lu';
import CompanyService from '@/services/companyService';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { CompanyLogo } from '@/components/elements/CompanyLogo';
import type { CompanyType, ForoBusinessMatch } from '@/types/company';

interface ImportFromForoPanelProps {
  businessId: number | undefined;
  /** Plan-limit check shared with the manual create form; returns false to block. */
  canAddCompany: () => boolean;
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="w-28 shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}

/**
 * Finds a business that already uses Foro by its exact email and adds it as one of
 * your companies, linked back to it — no retyping. The copy stays read-only while linked.
 */
export function ImportFromForoPanel({ businessId, canAddCompany }: ImportFromForoPanelProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<ForoBusinessMatch[] | null>(null);
  const [companyType, setCompanyType] = useState<CompanyType>('customer');
  const [importingId, setImportingId] = useState<number | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (businessId == null || !email.trim()) return;
    setSearching(true);
    try {
      setMatches(await CompanyService.lookupForoBusinesses(email.trim(), businessId));
    } catch (err) {
      const status = (err as { status?: number })?.status;
      toast.error(
        status === 429
          ? 'Too many searches — please wait a few minutes.'
          : err instanceof Error
            ? err.message
            : 'Search failed',
      );
    } finally {
      setSearching(false);
    }
  };

  const importMatch = async (match: ForoBusinessMatch) => {
    if (businessId == null || !canAddCompany()) return;
    setImportingId(match.source_business_id);
    try {
      const company = await CompanyService.importFromForo({
        businessId,
        sourceBusinessId: match.source_business_id,
        companyType,
      });
      toast.success(`${company.name} added from Foro`);
      navigate(`/app/companies/${company.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm lg:p-8">
      <div className="max-w-2xl space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Import a business already on Foro</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter their business or login email. We'll pull in their logo, details, address, banking and owner contact, and link the
            company to yours so it stays accurate. More linked features are coming soon.
          </p>
        </div>

        <form onSubmit={(e) => void search(e)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setMatches(null);
              }}
              placeholder="accounts@theircompany.co.za"
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <button
            type="submit"
            disabled={searching || businessId == null}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <LuSearch size={15} /> {searching ? 'Searching…' : 'Search Foro'}
          </button>
        </form>

        {matches !== null && matches.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-4 text-sm text-slate-500 dark:text-slate-400">
            No business on Foro uses that email. Check the spelling, or{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">enter their details manually</span> in the
            other tab.
          </div>
        )}

        {matches && matches.length > 0 && (
          <div className="space-y-3">
            <div className="max-w-xs">
              <AppLabeledSelectInput
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
            {matches.map((match) => (
              <div
                key={match.source_business_id}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
              >
                <div className="flex items-start gap-3">
                  <CompanyLogo path={match.logo_url} name={match.name} size="md" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{match.name}</p>
                    <Detail label="Email" value={match.email} />
                    <Detail label="Phone" value={match.phone} />
                    <Detail label="Address" value={match.address} />
                    <Detail label="VAT number" value={match.vat_number} />
                    <Detail label="Registration" value={match.registration_number} />
                    <Detail label="Website" value={match.website} />
                    <Detail label="Banking" value={match.has_banking_details ? 'Primary account will be copied' : null} />
                  </div>
                  {match.already_imported_company_id ? (
                    <Link
                      to={`/app/companies/${match.already_imported_company_id}`}
                      className="shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 no-underline hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Already added — view
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void importMatch(match)}
                      disabled={importingId !== null}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <LuLink size={13} />
                      {importingId === match.source_business_id ? 'Importing…' : 'Import & link'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportFromForoPanel;
