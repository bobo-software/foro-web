import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuCircleAlert, LuLoaderCircle, LuUserRoundX } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { usePortalNoIndex } from '@/hooks/usePortalNoIndex';
import useAuthStore from '@/stores/data/AuthStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import CompanyInviteService, {
  inviteErrorCode,
  type CompanyInvitePreview,
  type InviteAccepted,
  type InviteCompanyDetails,
} from '@/services/companyInviteService';
import { InviteCompanyDetailsForm } from './InviteCompanyDetailsForm';
import {
  CompanyInviteShell,
  ErrorBanner,
  InviteHeading,
  InviteSteps,
  PRIMARY_BUTTON,
  RECEIVED_DOCUMENTS_PATH,
  SECONDARY_BUTTON,
  acceptedLandingPath,
  invalidCopy,
  relationshipLabel,
} from './companyInviteShared';

type Step = 'linking' | 'details' | 'wrong-account' | 'error';

/**
 * Signed-in half of the company invite: links the user's current business
 * (or their first owned one) with the inviter, or asks for company details
 * when they have no business yet. Lands on the linked company's page.
 */
export function CompanyInvitePostAuth() {
  usePortalNoIndex();
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const logout = useAuthStore((s) => s.logout);
  const fetchUserBusinesses = useBusinessStore((s) => s.fetchUserBusinesses);
  const setCurrentBusinessById = useBusinessStore((s) => s.setCurrentBusinessById);
  const started = useRef(false);

  const [step, setStep] = useState<Step>('linking');
  const [preview, setPreview] = useState<CompanyInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const finish = useCallback(
    async (result: InviteAccepted) => {
      if (sessionUser) await fetchUserBusinesses(Number(sessionUser.id));
      setCurrentBusinessById(result.business_id);
      if (!result.document) toast.success('Companies linked');
      navigate(acceptedLandingPath(result), { replace: true });
    },
    [fetchUserBusinesses, navigate, sessionUser, setCurrentBusinessById],
  );

  const accept = useCallback(
    async (details?: InviteCompanyDetails) => {
      setSubmitting(true);
      setError(null);
      try {
        // Prefer the business they're working in, if they own or admin it; the API falls back otherwise.
        const activeBusinessId = useBusinessStore.getState().activeBusinessId ?? undefined;
        const result = await CompanyInviteService.acceptSignedIn(token, {
          businessId: details ? undefined : activeBusinessId,
          details,
        });
        await finish(result);
      } catch (err) {
        const code = inviteErrorCode(err);
        if (code === 'DETAILS_REQUIRED') {
          setStep('details');
        } else if (code === 'FORBIDDEN' && !details) {
          // Not an owner/admin of the active business — let the API pick one they own.
          try {
            await finish(await CompanyInviteService.acceptSignedIn(token));
          } catch (retryErr) {
            if (inviteErrorCode(retryErr) === 'DETAILS_REQUIRED') setStep('details');
            else {
              setError(retryErr instanceof Error ? retryErr.message : 'We could not link your company.');
              setStep('error');
            }
          }
        } else {
          setError(err instanceof Error ? err.message : 'We could not link your company.');
          setStep(details ? 'details' : 'error');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [finish, token],
  );

  useEffect(() => {
    if (!sessionUser?.accessToken) {
      navigate('/login', { replace: true, state: { from: { pathname: `/company-invite/${token}/accept` } } });
      return;
    }
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const result = await CompanyInviteService.preview(token);
        setPreview(result);
        if (result.reason === 'accepted' && result.document) {
          navigate(RECEIVED_DOCUMENTS_PATH, { replace: true });
          return;
        }
        if (!result.valid) {
          setError(invalidCopy(result.reason).body);
          setStep('error');
          return;
        }
        if (result.email.toLowerCase() !== (sessionUser.email ?? '').toLowerCase()) {
          setStep('wrong-account');
          return;
        }
        await accept();
      } catch {
        setError(invalidCopy('not-found').body);
        setStep('error');
      }
    })();
  }, [accept, navigate, sessionUser, token]);

  const businessName = preview?.business_name ?? '';

  if (step === 'wrong-account') {
    return (
      <CompanyInviteShell>
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
          <LuUserRoundX className="h-6 w-6" />
        </div>
        <InviteHeading businessName={businessName} title="Wrong account">
          This invite is for <strong className="break-all">{preview?.email}</strong>, but you're signed in as{' '}
          <strong className="break-all">{sessionUser?.email}</strong>.
        </InviteHeading>
        <button
          type="button"
          className={`mt-6 w-full ${PRIMARY_BUTTON}`}
          onClick={async () => {
            await logout();
            navigate(`/company-invite/${token}`, { replace: true });
          }}
        >
          Sign out and continue as {preview?.email}
        </button>
      </CompanyInviteShell>
    );
  }

  if (step === 'error') {
    return (
      <CompanyInviteShell>
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
          <LuCircleAlert className="h-6 w-6" />
        </div>
        <InviteHeading businessName={businessName} title="We couldn't link your company">
          {error}
        </InviteHeading>
        <Link to="/app/companies" className={`mt-6 w-full ${SECONDARY_BUTTON}`}>
          Go to Companies
        </Link>
      </CompanyInviteShell>
    );
  }

  if (step === 'details' && preview) {
    return (
      <CompanyInviteShell wide>
        <InviteSteps current={0} />
        <InviteHeading businessName={businessName} title="Add your company details">
          You don't have a company on Foro yet. Add it and {businessName} will have it as{' '}
          {relationshipLabel(preview.company_type)} — and you'll have theirs.
        </InviteHeading>
        <ErrorBanner message={error} />
        <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
          <InviteCompanyDetailsForm
            email={preview.email}
            defaultContactName={sessionUser?.full_name ?? sessionUser?.name ?? ''}
            submitting={submitting}
            submitLabel="Save and link companies"
            onSubmit={(details) => void accept(details)}
          />
        </div>
      </CompanyInviteShell>
    );
  }

  return (
    <CompanyInviteShell>
      <div className="mt-8 text-center">
        <LuLoaderCircle className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          Linking your company{businessName ? ` with ${businessName}` : ''}…
        </p>
      </div>
    </CompanyInviteShell>
  );
}
