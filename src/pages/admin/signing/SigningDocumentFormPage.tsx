import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuArrowLeft } from 'react-icons/lu';
import AppLabledInput from '../../../components/forms/AppLabledInput';
import AppLabledAutocomplete from '../../../components/forms/AppLabledAutocomplete';
import RichTextEditor from '../../../components/forms/RichTextEditor';
import SigningDocumentService from '../../../services/signingDocumentService';
import { useBusinessStore } from '../../../stores/data/BusinessStore';
import { useCompanyStore } from '../../../stores/data/CompanyStore';
import { useSigningDocumentStore } from '../../../stores/data/SigningDocumentStore';
import type { Company } from '../../../types/company';

/** Create or edit a draft. Only drafts are editable — sent documents are locked server-side too. */
export function SigningDocumentFormPage() {
  const { id } = useParams();
  const documentId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const business = useBusinessStore((s) => s.currentBusiness);
  const companies = useCompanyStore((s) => s.companies);
  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);
  const upsertDocument = useSigningDocumentStore((s) => s.upsertDocument);

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [loading, setLoading] = useState(!!documentId);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ company?: string; title?: string; body?: string }>({});

  useEffect(() => {
    if (companies.length === 0) fetchCompanies();
  }, [companies.length, fetchCompanies]);

  useEffect(() => {
    if (!documentId) return;
    SigningDocumentService.findById(documentId)
      .then((doc) => {
        if (doc.status !== 'draft') {
          toast.error('Only drafts can be edited');
          navigate(`/app/documents/signing/${doc.id}`, { replace: true });
          return;
        }
        setCompanyId(doc.company_id);
        setTitle(doc.title);
        setBodyHtml(doc.body_html);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load document'))
      .finally(() => setLoading(false));
  }, [documentId, navigate]);

  // Clients only — not the business's own company row.
  const clientCompanies = useMemo(
    () => companies.filter((c) => c.id != null && c.id !== business?.id),
    [companies, business?.id],
  );
  const selectedCompany = clientCompanies.find((c) => c.id === companyId) ?? null;

  const save = async () => {
    const plainBody = bodyHtml.replace(/<[^>]*>/g, '').trim();
    const nextErrors = {
      company: companyId == null ? 'Choose a company' : undefined,
      title: title.trim() ? undefined : 'Give the document a title',
      body: plainBody ? undefined : 'Write the document body',
    };
    setErrors(nextErrors);
    if (nextErrors.company || nextErrors.title || nextErrors.body || business?.id == null || companyId == null) return;

    setSaving(true);
    try {
      const payload = { business_id: business.id, company_id: companyId, title: title.trim(), body_html: bodyHtml };
      const saved = documentId
        ? await SigningDocumentService.update(documentId, payload)
        : await SigningDocumentService.create(payload);
      upsertDocument(saved);
      toast.success(documentId ? 'Draft saved' : 'Draft created');
      navigate(`/app/documents/signing/${saved.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-xs text-slate-500">Loading document…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          to={documentId ? `/app/documents/signing/${documentId}` : '/app/documents/signing'}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          aria-label="Back"
        >
          <LuArrowLeft size={16} />
        </Link>
        <h1 className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
          {documentId ? 'Edit document' : 'New document for signature'}
        </h1>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AppLabledAutocomplete<Company>
            label="Company *"
            options={clientCompanies}
            value={companyId != null ? String(companyId) : ''}
            displayValue={selectedCompany?.name ?? ''}
            accessor="name"
            valueAccessor="id"
            onSelect={(company) => setCompanyId(company.id ?? null)}
            onClear={() => setCompanyId(null)}
            placeholder="Search company…"
            error={errors.company}
            required
          />
          <AppLabledInput
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Service agreement"
            error={errors.title}
            required
          />
        </div>
        <RichTextEditor
          label="Document body"
          value={bodyHtml}
          onChange={setBodyHtml}
          placeholder="Write the document…"
          error={errors.body}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          A signature and date block for you and the client is added at the bottom automatically. You can sign
          before sending from the document page.
        </p>
      </div>
    </div>
  );
}

export default SigningDocumentFormPage;
