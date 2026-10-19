import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LuCircleCheck, LuFileDown, LuLogOut, LuPenLine } from 'react-icons/lu';
import { usePortalNoIndex } from '@/hooks/usePortalNoIndex';
import { ThemeToggleButton } from '@/components/elements/ThemeToggleButton';
import SigningDocumentPreview from '@/components/elements/SigningDocumentPreview';
import SignDocumentModal from '@/components/modals/SignDocumentModal';
import DocumentSigningPortalService from '@/services/documentSigningPortalService';
import type { SigningDocumentView, SigningLinkPreview } from '@/types/signingDocument';
import { downloadSigningDocumentPdf } from '@/utils/signingDocumentPdf';

type Step = 'loading' | 'invalid' | 'intro' | 'otp' | 'view';

const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-sm shadow-indigo-500/25 disabled:opacity-50';
const SECONDARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50';

/**
 * Public page behind the emailed signing link: email OTP → view / download / sign.
 * Once signed, the link opens the read-only copy directly — nothing left to protect
 * with a code. No Foro login — the credential is access to the recipient's inbox.
 */
export function DocumentSigningPage() {
  usePortalNoIndex();
  const { token = '' } = useParams();

  const [step, setStep] = useState<Step>('loading');
  const [preview, setPreview] = useState<SigningLinkPreview | null>(null);
  const [view, setView] = useState<SigningDocumentView | null>(null);
  const [otp, setOtp] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [justSigned, setJustSigned] = useState(false);
  const [downloading, setDownloading] = useState(false);
  /** Opened via a signed document's link — no session, so nothing to sign out of. */
  const [readOnlyCopy, setReadOnlyCopy] = useState(false);

  const loadDocument = useCallback(async () => {
    try {
      setView(await DocumentSigningPortalService.getDocument());
      setStep('view');
    } catch (err) {
      // Session expired (or the document was voided) — back to the code step.
      DocumentSigningPortalService.logout();
      if ((err as { status?: number })?.status === 404) {
        setStep('invalid');
        return;
      }
      setStep('intro');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (DocumentSigningPortalService.hasSessionFor(token)) {
        await loadDocument();
        return;
      }
      try {
        const result = await DocumentSigningPortalService.preview(token);
        if (cancelled) return;
        setPreview(result);
        if (result.status === 'signed') {
          const copy = await DocumentSigningPortalService.getSignedCopy(token);
          if (cancelled) return;
          setView(copy);
          setReadOnlyCopy(true);
          setStep('view');
          return;
        }
        setStep('intro');
      } catch {
        if (!cancelled) setStep('invalid');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, loadDocument]);

  const requestCode = async () => {
    setSubmitting(true);
    setError(null);
    try {
      setInfo(await DocumentSigningPortalService.requestOtp(token));
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await DocumentSigningPortalService.verifyOtp(token, otp);
      await loadDocument();
    } catch {
      setError('Invalid or expired code');
    } finally {
      setSubmitting(false);
    }
  };

  const download = async () => {
    if (!view) return;
    setDownloading(true);
    try {
      await downloadSigningDocumentPdf(view);
    } catch (err) {
      console.error('Failed to export signing document PDF:', err);
      setError('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const businessName = view?.business.name || preview?.business_name || '';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 text-slate-900 dark:text-white no-underline">
            <img src="/favicon.png" alt="" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-xl font-bold tracking-tight">Foro</span>
          </Link>
          <div className="flex items-center gap-2">
            {step === 'view' && !readOnlyCopy && (
              <button
                type="button"
                onClick={() => {
                  DocumentSigningPortalService.logout();
                  setView(null);
                  setOtp('');
                  setStep('intro');
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <LuLogOut size={13} /> Sign out
              </button>
            )}
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {step === 'loading' && <p className="mt-20 text-center text-sm text-slate-500">Loading…</p>}

      {step === 'invalid' && (
        <main className="flex-1 max-w-md mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Link unavailable</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            This signing link is invalid, has expired, or the document was withdrawn. Ask the sender to resend it.
          </p>
        </main>
      )}

      {(step === 'intro' || step === 'otp') && (
        <main className="flex-1 max-w-md mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
          {businessName && (
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {businessName}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {preview?.title ?? 'Document'}
          </h1>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {step === 'intro' && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                To keep this document private we'll email a 6-digit code to{' '}
                <strong className="text-slate-800 dark:text-slate-200">{preview?.recipient_email ?? 'your inbox'}</strong>.
              </p>
              <button type="button" onClick={() => void requestCode()} disabled={submitting} className={`w-full ${PRIMARY_BUTTON}`}>
                {submitting ? 'Sending…' : 'Email me a code'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <form onSubmit={(e) => void verifyCode(e)} className="mt-6 space-y-4">
              {info && <p className="text-sm text-slate-600 dark:text-slate-400">{info}</p>}
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  6-digit code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tracking-[0.3em] text-center font-mono"
                  placeholder="000000"
                />
              </div>
              <button type="submit" disabled={submitting} className={`w-full ${PRIMARY_BUTTON}`}>
                {submitting ? 'Verifying…' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={() => void requestCode()}
                disabled={submitting}
                className="w-full text-sm text-slate-500 dark:text-slate-400 hover:underline"
              >
                Send a new code
              </button>
            </form>
          )}
        </main>
      )}

      {step === 'view' && view && (
        <main className="flex-1 w-full max-w-5xl mx-auto px-2 sm:px-6 py-6 space-y-4">
          {justSigned && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300 print:hidden">
              <LuCircleCheck size={18} className="mt-0.5 shrink-0" />
              <span>Thank you — the document is signed. We've emailed you a link to your signed copy.</span>
            </div>
          )}
          {!justSigned && view.status === 'signed' && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 print:hidden">
              This document has been signed. You can download a copy below.
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 px-2 sm:px-0 print:hidden">
            <button type="button" onClick={() => void download()} disabled={downloading} className={SECONDARY_BUTTON}>
              <LuFileDown size={16} /> {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
            {view.status === 'sent' && (
              <button type="button" onClick={() => setSignOpen(true)} className={`sm:ml-auto ${PRIMARY_BUTTON}`}>
                <LuPenLine size={16} /> Sign now
              </button>
            )}
          </div>

          <div className="overflow-x-auto pb-8">
            <SigningDocumentPreview view={view} />
          </div>

          <SignDocumentModal
            isOpen={signOpen}
            onClose={() => setSignOpen(false)}
            documentTitle={view.title}
            defaultName={view.recipient_name ?? ''}
            onSubmit={async (signature) => {
              setView(await DocumentSigningPortalService.sign(signature));
              setJustSigned(true);
            }}
          />
        </main>
      )}
    </div>
  );
}

export default DocumentSigningPage;
