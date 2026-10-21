import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuBuilding2, LuCircleCheck, LuFileText, LuLogIn } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { usePortalNoIndex } from '@/hooks/usePortalNoIndex';
import AppInputLabeled from '@/components/forms/AppLabledInput';
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
  documentLabel,
  invalidCopy,
  relationshipLabel,
} from './companyInviteShared';

type Step = 'loading' | 'invalid' | 'sign-in' | 'details' | 'confirm' | 'password' | 'done';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Public page behind the emailed company invite (UPCOMING-1): the recipient
 * enters their company details without a login, both companies are linked, and
 * they can optionally set a password on the invite email to sign in. An email
 * that already has a password signs in instead (`/company-invite/:token/accept`).
 */
export function CompanyInvitePage() {
  usePortalNoIndex();
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const fetchUserBusinesses = useBusinessStore((s) => s.fetchUserBusinesses);
  const setCurrentBusinessById = useBusinessStore((s) => s.setCurrentBusinessById);

  const [step, setStep] = useState<Step>('loading');
  const [preview, setPreview] = useState<CompanyInvitePreview | null>(null);
  const [invalidReason, setInvalidReason] = useState<CompanyInvitePreview['reason'] | 'not-found'>(null);
  const [accepted, setAccepted] = useState<InviteAccepted | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const acceptPath = `/company-invite/${token}/accept`;

  // Runs once per token — signing in from the password step mustn't re-route this page.
  const load = useCallback(async () => {
    const isSignedIn = Boolean(useAuthStore.getState().sessionUser?.accessToken);
    try {
      const result = await CompanyInviteService.preview(token);
      setPreview(result);
      if (result.reason === 'accepted' && result.can_set_password) {
        setStep('password');
      } else if (result.reason === 'accepted' && result.document && isSignedIn) {
        // Already linked from an earlier click — the document is in their received documents.
        navigate(RECEIVED_DOCUMENTS_PATH, { replace: true });
      } else if (!result.valid) {
        setInvalidReason(result.reason);
        setStep('invalid');
      } else if (result.has_password || isSignedIn) {
        // Existing logins accept from the signed-in page, which links their business.
        if (isSignedIn) navigate(acceptPath, { replace: true });
        else setStep('sign-in');
      } else {
        setStep(result.has_business ? 'confirm' : 'details');
      }
    } catch {
      setInvalidReason('not-found');
      setStep('invalid');
    }
  }, [acceptPath, navigate, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async (details?: InviteCompanyDetails) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await CompanyInviteService.acceptWithDetails(token, details);
      setAccepted(result);
      setStep('password');
    } catch (err) {
      if (inviteErrorCode(err) === 'LOGIN_REQUIRED') {
        setStep('sign-in');
      } else {
        setError(errorMessage(err, 'We could not save your company. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const createLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setPasswordError('Use at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordError(undefined);
    setSubmitting(true);
    setError(null);
    try {
      const { sessionUser, businessId } = await CompanyInviteService.setPassword(token, password);
      await fetchUserBusinesses(Number(sessionUser.id));
      if (businessId) setCurrentBusinessById(businessId);
      toast.success('Your login is ready');
      navigate(accepted ? acceptedLandingPath(accepted) : '/app/companies', { replace: true });
    } catch (err) {
      if (inviteErrorCode(err) === 'PASSWORD_ALREADY_SET') {
        setStep('sign-in');
      } else {
        setError(errorMessage(err, 'We could not create your login. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const businessName = preview?.business_name ?? '';
  const sentDocument = preview?.document ?? null;

  if (step === 'loading') {
    return (
      <CompanyInviteShell>
        <p className="mt-8 text-center text-sm text-slate-500">Loading…</p>
      </CompanyInviteShell>
    );
  }

  if (step === 'invalid') {
    const copy = invalidCopy(invalidReason);
    return (
      <CompanyInviteShell>
        <InviteHeading businessName={businessName} title={copy.title}>
          {copy.body}
        </InviteHeading>
        {invalidReason === 'accepted' && (
          <Link
            to="/login"
            state={{ email: preview?.email, ...(sentDocument && { from: { pathname: RECEIVED_DOCUMENTS_PATH } }) }}
            className={`mt-6 w-full ${PRIMARY_BUTTON}`}
          >
            Sign in
          </Link>
        )}
      </CompanyInviteShell>
    );
  }

  if (step === 'sign-in') {
    return (
      <CompanyInviteShell>
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          <LuLogIn className="h-6 w-6" />
        </div>
        <InviteHeading
          businessName={businessName}
          title={sentDocument ? `Sign in to view ${documentLabel(sentDocument)}` : 'Sign in to accept'}
        >
          <strong className="text-slate-800 dark:text-slate-200 break-all">{preview?.email}</strong> already has a Foro
          login.{' '}
          {sentDocument
            ? `Sign in to see it, along with everything else ${businessName} sends you.`
            : `Sign in and we'll link your company with ${businessName}.`}
        </InviteHeading>
        <Link
          to="/login"
          state={{ from: { pathname: acceptPath }, email: preview?.email }}
          className={`mt-6 w-full ${PRIMARY_BUTTON}`}
        >
          Sign in
        </Link>
      </CompanyInviteShell>
    );
  }

  if (step === 'password') {
    return (
      <CompanyInviteShell>
        <InviteSteps current={1} />
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <LuCircleCheck className="h-6 w-6" />
        </div>
        <InviteHeading businessName={businessName} title="You're linked">
          {businessName} now has your company in their list, and you have theirs.{' '}
          {sentDocument
            ? `Create a login to view ${documentLabel(sentDocument)} and the other documents they send you`
            : 'Want to see the quotations and invoices they send you? Create a login'}{' '}
          for{' '}
          <strong className="text-slate-800 dark:text-slate-200 break-all">{preview?.email}</strong>.
        </InviteHeading>
        <ErrorBanner message={error} />
        <form onSubmit={(e) => void createLogin(e)} className="mt-6 space-y-4" noValidate>
          <AppInputLabeled
            id="invite_password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          <AppInputLabeled
            id="invite_password_confirm"
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordError}
            autoComplete="new-password"
          />
          <button type="submit" disabled={submitting} className={`w-full ${PRIMARY_BUTTON}`}>
            {submitting ? 'Creating login…' : 'Create login'}
          </button>
          <button type="button" onClick={() => setStep('done')} disabled={submitting} className={`w-full ${SECONDARY_BUTTON}`}>
            Skip for now
          </button>
        </form>
      </CompanyInviteShell>
    );
  }

  if (step === 'done') {
    return (
      <CompanyInviteShell>
        <InviteSteps current={2} />
        <InviteHeading businessName={businessName} title="All set">
          Your company and {businessName} are linked. If you change your mind, open this invite link again to create a
          login while it's still valid.
        </InviteHeading>
        <button type="button" onClick={() => setStep('password')} className={`mt-6 w-full ${SECONDARY_BUTTON}`}>
          Create a login after all
        </button>
      </CompanyInviteShell>
    );
  }

  if (step === 'confirm') {
    return (
      <CompanyInviteShell>
        <InviteSteps current={0} />
        <InviteHeading
          businessName={businessName}
          title={sentDocument ? `${businessName} sent you ${documentLabel(sentDocument)}` : `Link with ${businessName}`}
        >
          Your company is already on Foro. Confirm to add it to {businessName}'s companies as{' '}
          {relationshipLabel(preview!.company_type)}, and add {businessName} to yours.
        </InviteHeading>
        <ErrorBanner message={error} />
        <button type="button" onClick={() => void accept()} disabled={submitting} className={`mt-6 w-full ${PRIMARY_BUTTON}`}>
          {submitting ? 'Linking…' : 'Link my company'}
        </button>
      </CompanyInviteShell>
    );
  }

  return (
    <CompanyInviteShell wide>
      <InviteSteps current={0} />
      <InviteHeading
        businessName={businessName}
        title={sentDocument ? `${businessName} sent you ${documentLabel(sentDocument)}` : 'Add your company details'}
      >
        {sentDocument && 'Add your company details to view it on Foro. '}
        {businessName} would like to add your company as {relationshipLabel(preview!.company_type)}. Enter your details
        once and you'll appear in each other's company lists — no account needed.
      </InviteHeading>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 text-sm text-slate-600 dark:text-slate-400">
        <li className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <LuBuilding2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          Both companies are linked automatically.
        </li>
        <li className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <LuFileText className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          Optionally sign in to see their quotations, invoices and signed documents.
        </li>
      </ul>
      <ErrorBanner message={error} />
      <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
        <InviteCompanyDetailsForm
          email={preview!.email}
          submitting={submitting}
          submitLabel="Save and link companies"
          onSubmit={(details) => void accept(details)}
        />
      </div>
    </CompanyInviteShell>
  );
}
