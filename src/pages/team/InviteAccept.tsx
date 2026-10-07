import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  LuArrowRight,
  LuCircleAlert,
  LuCircleCheck,
  LuClock,
  LuLogIn,
  LuMail,
  LuShieldCheck,
  LuUserRoundPlus,
  LuUserRoundX,
} from 'react-icons/lu';
import useAuthStore from '@/stores/data/AuthStore';
import { useTeamStore } from '@/stores/data/TeamStore';
import {
  BusinessAvatar,
  InviteShell,
  formatRelativeExpiry,
  invalidReason,
  parseInviteDate,
  primaryButtonClass,
  roleInfo,
  secondaryButtonClass,
  StatusPanel,
  type InvalidReason,
} from './inviteShared';

const INVALID_COPY: Record<InvalidReason, { title: string; body: (business: string) => string }> = {
  expired: {
    title: 'This invitation has expired',
    body: (b) => `Ask an admin at ${b} to send you a new invitation.`,
  },
  revoked: {
    title: 'This invitation was cancelled',
    body: (b) => `An admin at ${b} withdrew this invitation. Reach out to them if you think this is a mistake.`,
  },
  accepted: {
    title: 'Invitation already accepted',
    body: (b) => `This invitation has already been used to join ${b}. Sign in to continue.`,
  },
  unavailable: {
    title: 'This invitation is no longer available',
    body: (b) => `Ask an admin at ${b} to send you a new invitation.`,
  },
};

export function InviteAccept() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const logout = useAuthStore((s) => s.logout);
  const invitePreview = useTeamStore((s) => s.invitePreview);
  const isLoading = useTeamStore((s) => s.isLoading);
  const error = useTeamStore((s) => s.error);
  const fetchInvitePreview = useTeamStore((s) => s.fetchInvitePreview);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchInvitePreview(token);
  }, [token, fetchInvitePreview]);

  const isAuthenticated = Boolean(sessionUser?.accessToken);
  const returnTo = `/invite/${token}/accept`;
  const authState = { from: { pathname: returnTo }, email: invitePreview?.email };

  // Ignore a preview left in the store from a different invite link.
  const preview = invitePreview?.token === token ? invitePreview : null;

  if (!preview) {
    if (error && !isLoading) {
      return (
        <InviteShell>
          <StatusPanel
            icon={<LuCircleAlert className="h-6 w-6" />}
            tone="rose"
            title="We couldn't find this invitation"
            body="The link may be incomplete or no longer valid. Check that you copied the full link from your email."
          >
            <Link to="/" className={secondaryButtonClass}>
              Go to Foro
            </Link>
          </StatusPanel>
        </InviteShell>
      );
    }
    return (
      <InviteShell>
        <LoadingSkeleton />
      </InviteShell>
    );
  }

  const businessName = preview.business_name || 'this business';
  const role = roleInfo(preview.role_key);
  const expiresAt = parseInviteDate(preview.expires_at);
  const reason = invalidReason(preview);

  if (reason) {
    const copy = INVALID_COPY[reason];
    return (
      <InviteShell>
        <StatusPanel
          icon={<LuClock className="h-6 w-6" />}
          tone="amber"
          title={copy.title}
          body={copy.body(businessName)}
        >
          {reason === 'accepted' ? (
            <Link to={isAuthenticated ? '/app/dashboard' : '/login'} className={primaryButtonClass}>
              {isAuthenticated ? 'Go to dashboard' : 'Sign in'}
            </Link>
          ) : (
            <Link to="/" className={secondaryButtonClass}>
              Go to Foro
            </Link>
          )}
        </StatusPanel>
      </InviteShell>
    );
  }

  const emailMismatch =
    isAuthenticated &&
    Boolean(sessionUser?.email) &&
    preview.email.toLowerCase() !== sessionUser!.email!.toLowerCase();

  const handleSwitchAccount = async () => {
    setIsSwitching(true);
    try {
      await logout();
    } finally {
      setIsSwitching(false);
      navigate(preview.has_account ? '/login' : '/register', { state: authState });
    }
  };

  return (
    <InviteShell>
      <div className="px-6 pt-8 pb-6 text-center sm:px-8">
        <BusinessAvatar name={preview.business_name || '?'} />
        <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">You've been invited to join</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 break-words">{businessName}</h1>
      </div>

      <dl className="mx-6 divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm dark:divide-slate-700 dark:border-slate-700 sm:mx-8">
        <div className="flex items-start gap-3 p-4">
          <LuShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" aria-hidden />
          <div className="min-w-0">
            <dt className="sr-only">Role</dt>
            <dd className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{role.label}</span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                Your role
              </span>
            </dd>
            <dd className="mt-0.5 text-slate-500 dark:text-slate-400">{role.description}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4">
          <LuMail className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
          <div className="min-w-0">
            <dt className="text-slate-500 dark:text-slate-400">Invitation sent to</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100 break-all">{preview.email}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4">
          <LuClock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
          <div className="min-w-0">
            <dt className="sr-only">Expiry</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{formatRelativeExpiry(expiresAt)}</dd>
            <dd className="text-slate-500 dark:text-slate-400">
              <time dateTime={expiresAt.toISOString()}>
                {expiresAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </time>
            </dd>
          </div>
        </div>
      </dl>

      <div className="space-y-4 px-6 pt-6 pb-8 sm:px-8">
        {emailMismatch ? (
          <>
            <NextStep tone="amber" icon={<LuUserRoundX className="h-5 w-5" />} title="You're signed in to a different account">
              You're signed in as <strong className="break-all">{sessionUser?.email}</strong>, but this invitation was
              sent to <strong className="break-all">{preview.email}</strong>. Invitations can only be accepted by the
              email they were sent to, so sign out and continue as {preview.email}.
            </NextStep>
            <button type="button" onClick={handleSwitchAccount} disabled={isSwitching} className={primaryButtonClass}>
              {isSwitching ? 'Signing out…' : `Switch to ${preview.email}`}
            </button>
          </>
        ) : isAuthenticated ? (
          <>
            <NextStep icon={<LuCircleCheck className="h-5 w-5" />} title="You're all set">
              You're signed in as <strong className="break-all">{preview.email}</strong>. Accept the invitation to join{' '}
              {businessName} as {withArticle(role.label)}. You'll be able to switch between your businesses at any time.
            </NextStep>
            <button type="button" onClick={() => navigate(returnTo, { replace: true })} className={primaryButtonClass}>
              Accept invitation
              <LuArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </>
        ) : preview.has_account ? (
          <>
            <NextStep icon={<LuLogIn className="h-5 w-5" />} title="Welcome back — sign in to continue">
              You already have a Foro account with <strong className="break-all">{preview.email}</strong>. Sign in and
              you'll come straight back here to accept.
            </NextStep>
            <Link to="/login" state={authState} className={primaryButtonClass}>
              Sign in to accept
              <LuArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </>
        ) : (
          <>
            <NextStep icon={<LuUserRoundPlus className="h-5 w-5" />} title="New to Foro? Let's create your account">
              Since you don't have a Foro account yet, you'll need to create one with{' '}
              <strong className="break-all">{preview.email}</strong> before you can join {businessName}. It only takes a
              minute, and you'll come straight back here to accept the invitation.
            </NextStep>
            <Link to="/register" state={authState} className={primaryButtonClass}>
              Create my account
              <LuArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Make sure you sign up with the same email this invitation was sent to.
            </p>
          </>
        )}
        <p className="border-t border-slate-200 pt-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Not expecting this invitation? You can safely ignore it — nothing happens unless you accept.
        </p>
      </div>
    </InviteShell>
  );
}

function withArticle(word: string) {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}

function NextStep({
  icon,
  title,
  tone = 'indigo',
  children,
}: {
  icon: ReactNode;
  title: string;
  tone?: 'indigo' | 'amber';
  children: ReactNode;
}) {
  const styles =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200'
      : 'border-indigo-100 bg-indigo-50/60 text-slate-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-slate-300';
  const iconStyles = tone === 'amber' ? '' : 'text-indigo-600 dark:text-indigo-300';
  return (
    <div role={tone === 'amber' ? 'alert' : undefined} className={`flex gap-3 rounded-lg border p-4 text-sm ${styles}`}>
      <span className={`mt-0.5 shrink-0 ${iconStyles}`} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`font-semibold ${tone === 'amber' ? '' : 'text-slate-900 dark:text-slate-100'}`}>{title}</p>
        <p className="mt-1 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse px-6 py-8 sm:px-8" aria-busy="true" aria-label="Checking invitation">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      <div className="mx-auto mt-5 h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mx-auto mt-3 h-6 w-56 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-8 h-40 rounded-xl bg-slate-100 dark:bg-slate-700/50" />
      <div className="mt-6 h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}
