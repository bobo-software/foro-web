import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LuArrowLeft,
  LuBan,
  LuFileDown,
  LuPencil,
  LuPenLine,
  LuRefreshCw,
  LuSend,
  LuTrash2,
} from 'react-icons/lu';
import SigningDocumentPreview from '../../../components/elements/SigningDocumentPreview';
import SignDocumentModal from '../../../components/modals/SignDocumentModal';
import SendSigningDocumentModal from '../../../components/modals/SendSigningDocumentModal';
import AppModal from '../../../components/modals/AppModal';
import SigningDocumentService from '../../../services/signingDocumentService';
import { StorageService } from '../../../services/storageService';
import useAuthStore from '../../../stores/data/AuthStore';
import { useBusinessStore } from '../../../stores/data/BusinessStore';
import { useCompanyStore } from '../../../stores/data/CompanyStore';
import { useSigningDocumentStore } from '../../../stores/data/SigningDocumentStore';
import type { SignatureUrls, SigningDocument, SigningDocumentView } from '../../../types/signingDocument';
import { downloadSigningDocumentPdf } from '../../../utils/signingDocumentPdf';
import { SigningStatusBadge } from './SigningStatusBadge';

const ACTION_CLASS =
  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50';
const PRIMARY = `${ACTION_CLASS} bg-indigo-600 text-white hover:bg-indigo-500`;
const SECONDARY = `${ACTION_CLASS} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700`;

type ConfirmAction = 'void' | 'trash' | 'resend' | null;

export function SigningDocumentDetailPage() {
  const { id } = useParams();
  const documentId = Number(id);
  const navigate = useNavigate();
  const business = useBusinessStore((s) => s.currentBusiness);
  const userName = useAuthStore((s) => s.sessionUser?.full_name ?? s.sessionUser?.name);
  const companies = useCompanyStore((s) => s.companies);
  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);
  const { upsertDocument, removeDocument } = useSigningDocumentStore();

  const [doc, setDoc] = useState<SigningDocument | null>(null);
  const [urls, setUrls] = useState<SignatureUrls>({ sender_signature_url: null, recipient_signature_url: null });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signOpen, setSignOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const applyDocument = useCallback(
    async (next: SigningDocument) => {
      setDoc(next);
      upsertDocument(next);
      if (next.has_sender_signature || next.has_recipient_signature) {
        setUrls(await SigningDocumentService.getSignatureUrls(next.id));
      } else {
        setUrls({ sender_signature_url: null, recipient_signature_url: null });
      }
    },
    [upsertDocument],
  );

  useEffect(() => {
    if (!Number.isFinite(documentId)) return;
    setLoading(true);
    SigningDocumentService.findById(documentId)
      .then(applyDocument)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load document'))
      .finally(() => setLoading(false));
  }, [documentId, applyDocument]);

  useEffect(() => {
    if (companies.length === 0) fetchCompanies();
  }, [companies.length, fetchCompanies]);

  useEffect(() => {
    if (!business?.logo_url || business.show_logo_on_documents === false) {
      setLogoUrl(null);
      return;
    }
    StorageService.getFileDownloadUrl(business.logo_url)
      .then(setLogoUrl)
      .catch(() => setLogoUrl(null));
  }, [business?.logo_url, business?.show_logo_on_documents]);

  const companyName = companies.find((c) => c.id === doc?.company_id)?.name ?? '';

  const view = useMemo<SigningDocumentView | null>(() => {
    if (!doc) return null;
    return {
      id: doc.id,
      title: doc.title,
      body_html: doc.body_html,
      status: doc.status,
      company_name: companyName,
      recipient_name: doc.recipient_name,
      sender_signed_name: doc.sender_signed_name,
      sender_signature_date: doc.sender_signature_date,
      sender_signature_url: urls.sender_signature_url,
      recipient_signed_name: doc.recipient_signed_name,
      recipient_signature_date: doc.recipient_signature_date,
      recipient_signature_url: urls.recipient_signature_url,
      business: {
        name: business?.name ?? '',
        address: business?.address,
        phone: business?.phone,
        vat_number: business?.vat_number,
        registration_number: business?.registration_number,
        logo_download_url: logoUrl,
      },
    };
  }, [doc, companyName, urls, business, logoUrl]);

  const run = async (action: () => Promise<SigningDocument>, success: string) => {
    setBusy(true);
    try {
      await applyDocument(await action());
      toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const confirmAction = async () => {
    if (!doc) return;
    if (confirm === 'void') await run(() => SigningDocumentService.void(doc.id), 'Document voided');
    if (confirm === 'resend') await run(() => SigningDocumentService.resend(doc.id), 'Signing link resent');
    if (confirm === 'trash') {
      setBusy(true);
      try {
        await removeDocument(doc.id);
        toast.success('Moved to trash');
        navigate('/app/documents/signing');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete document');
      } finally {
        setBusy(false);
        setConfirm(null);
      }
    }
  };

  const download = async () => {
    if (!view) return;
    setDownloading(true);
    try {
      await downloadSigningDocumentPdf(view);
    } catch (err) {
      console.error('Failed to export signing document PDF:', err);
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-xs text-slate-500">Loading document…</div>;
  if (!doc || !view) return <div className="p-6 text-center text-xs text-slate-500">Document not found.</div>;

  const confirmCopy: Record<Exclude<ConfirmAction, null>, { title: string; body: string; label: string }> = {
    void: {
      title: 'Void document',
      body: 'The signing link stops working and the document can no longer be signed. This cannot be undone.',
      label: 'Void',
    },
    resend: {
      title: 'Resend signing link',
      body: `A new link is emailed to ${doc.recipient_email ?? 'the recipient'}. The previous link stops working.`,
      label: 'Resend',
    },
    trash: { title: 'Move to trash', body: 'You can restore it from the Trash tab.', label: 'Move to trash' },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/app/documents/signing"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          aria-label="Back to documents"
        >
          <LuArrowLeft size={16} />
        </Link>
        <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{doc.title}</h1>
        <SigningStatusBadge status={doc.status} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {doc.status === 'draft' && (
            <>
              <Link to={`/app/documents/signing/${doc.id}/edit`} className={`${SECONDARY} no-underline`}>
                <LuPencil size={13} /> Edit
              </Link>
              <button type="button" className={SECONDARY} onClick={() => setSignOpen(true)}>
                <LuPenLine size={13} /> {doc.has_sender_signature ? 'Re-sign' : 'Sign'}
              </button>
              <button type="button" className={PRIMARY} onClick={() => setSendOpen(true)}>
                <LuSend size={13} /> Send for signature
              </button>
            </>
          )}
          {doc.status === 'sent' && (
            <>
              <button type="button" className={SECONDARY} onClick={() => setConfirm('resend')} disabled={busy}>
                <LuRefreshCw size={13} /> Resend link
              </button>
              <button type="button" className={SECONDARY} onClick={() => setConfirm('void')} disabled={busy}>
                <LuBan size={13} /> Void
              </button>
            </>
          )}
          <button type="button" className={SECONDARY} onClick={download} disabled={downloading}>
            <LuFileDown size={13} /> {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
          {doc.status !== 'sent' && (
            <button type="button" className={SECONDARY} onClick={() => setConfirm('trash')} aria-label="Move to trash">
              <LuTrash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {doc.status !== 'draft' && doc.recipient_email && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {doc.status === 'signed' ? 'Signed by' : 'Sent to'} {doc.recipient_name} ({doc.recipient_email})
        </p>
      )}

      <div className="overflow-x-auto pb-6">
        <SigningDocumentPreview view={view} />
      </div>

      <SignDocumentModal
        isOpen={signOpen}
        onClose={() => setSignOpen(false)}
        documentTitle={doc.title}
        defaultName={doc.sender_signed_name ?? userName ?? ''}
        onSubmit={async (signature) => {
          await applyDocument(await SigningDocumentService.signAsSender(doc.id, signature));
          toast.success('Signed');
        }}
      />

      <SendSigningDocumentModal
        isOpen={sendOpen}
        onClose={() => setSendOpen(false)}
        companyId={doc.company_id}
        companyName={companyName}
        onSend={async (contactId) => {
          await applyDocument(await SigningDocumentService.send(doc.id, contactId));
          toast.success('Sent for signature');
        }}
      />

      {confirm && (
        <AppModal
          isOpen
          onClose={() => setConfirm(null)}
          title={confirmCopy[confirm].title}
          size="sm"
          buttons={[
            { label: 'Cancel', onClick: () => setConfirm(null), variant: 'secondary' },
            {
              label: confirmCopy[confirm].label,
              onClick: confirmAction,
              variant: confirm === 'resend' ? 'primary' : 'danger',
              loading: busy,
            },
          ]}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">{confirmCopy[confirm].body}</p>
        </AppModal>
      )}
    </div>
  );
}

export default SigningDocumentDetailPage;
