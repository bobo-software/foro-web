import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuCircleAlert, LuLoaderCircle, LuLogIn, LuUserRoundX } from 'react-icons/lu';
import toast from 'react-hot-toast';
import useAuthStore from '@/stores/data/AuthStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useTeamStore } from '@/stores/data/TeamStore';
import { InviteShell, StatusPanel, primaryButtonClass, secondaryButtonClass } from './inviteShared';

export function InvitePostAuth() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const processed = useRef(false);

  const sessionUser = useAuthStore((s) => s.sessionUser);
  const logout = useAuthStore((s) => s.logout);
  const invitePreview = useTeamStore((s) => s.invitePreview);
  const acceptInvite = useTeamStore((s) => s.acceptInvite);
  const fetchInvitePreview = useTeamStore((s) => s.fetchInvitePreview);
  const isLoading = useTeamStore((s) => s.isLoading);
  const error = useTeamStore((s) => s.error);
  const setCurrentBusinessById = useBusinessStore((s) => s.setCurrentBusinessById);

  const isAuthenticated = Boolean(sessionUser?.accessToken);

  useEffect(() => {
    if (!token) return;
    fetchInvitePreview(token);
  }, [token, fetchInvitePreview]);

  const emailMatchesInvite = useMemo(() => {
    if (!invitePreview?.email || !sessionUser?.email) return true;
    return invitePreview.email.toLowerCase() === sessionUser.email.toLowerCase();
  }, [invitePreview?.email, sessionUser?.email]);

  useEffect(() => {
    if (!token || !isAuthenticated || processed.current) return;
    if (invitePreview && !invitePreview.valid) return;
    if (!emailMatchesInvite) return;

    processed.current = true;
    void (async () => {
      const result = await acceptInvite(token);
      if (!result?.success) {
        processed.current = false;
        return;
      }
      if (result.active_business_id) {
        setCurrentBusinessById(result.active_business_id);
      }
      toast.success('Invitation accepted');
      navigate('/app/dashboard', { replace: true });
    })();
  }, [acceptInvite, emailMatchesInvite, invitePreview, isAuthenticated, navigate, setCurrentBusinessById, token]);

  const returnTo = `/invite/${token}/accept`;
  const authState = { from: { pathname: returnTo }, email: invitePreview?.email };

  if (!isAuthenticated) {
    const hasAccount = invitePreview?.has_account === true;
    return (
      <InviteShell>
        <StatusPanel
          icon={<LuLogIn className="h-6 w-6" />}
          tone="indigo"
          title={invitePreview && !hasAccount ? 'Create your account' : 'Sign in to accept'}
          body={
            invitePreview ? (
              <>
                {hasAccount ? 'Sign in as' : 'Create a Foro account for'}{' '}
                <strong className="text-slate-800 dark:text-slate-100 break-all">{invitePreview.email}</strong> to join{' '}
                {invitePreview.business_name || 'this business'}.
              </>
            ) : (
              'Please sign in first to accept this invitation.'
            )
          }
        >
          {!invitePreview && isLoading ? (
            <div className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ) : (
            <Link to={invitePreview && !hasAccount ? '/register' : '/login'} state={authState} className={primaryButtonClass}>
              {invitePreview && !hasAccount ? 'Create account' : 'Sign in'}
            </Link>
          )}
        </StatusPanel>
      </InviteShell>
    );
  }

  if (!emailMatchesInvite) {
    return (
      <InviteShell>
        <StatusPanel
          icon={<LuUserRoundX className="h-6 w-6" />}
          tone="amber"
          title="Wrong account"
          body={
            <>
              This invitation is for <strong className="break-all">{invitePreview?.email}</strong>, but you're signed in
              as <strong className="break-all">{sessionUser?.email}</strong>.
            </>
          }
        >
          <button
            type="button"
            className={primaryButtonClass}
            onClick={async () => {
              await logout();
              navigate('/login', { state: authState });
            }}
          >
            Switch to {invitePreview?.email}
          </button>
        </StatusPanel>
      </InviteShell>
    );
  }

  if (error && !isLoading) {
    return (
      <InviteShell>
        <StatusPanel
          icon={<LuCircleAlert className="h-6 w-6" />}
          tone="rose"
          title="We couldn't accept this invitation"
          body={error}
        >
          <Link to={`/invite/${token}`} className={secondaryButtonClass}>
            Back to invitation
          </Link>
        </StatusPanel>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <StatusPanel
        icon={<LuLoaderCircle className="h-6 w-6 animate-spin" />}
        tone="indigo"
        title={`Joining ${invitePreview?.business_name || 'the team'}…`}
        body="Setting up your access. You'll be taken to the dashboard in a moment."
      />
    </InviteShell>
  );
}
