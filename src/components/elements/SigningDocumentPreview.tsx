import type { SigningDocumentView } from '../../types/signingDocument';

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function SignatureColumn(props: {
  heading: string;
  imageUrl: string | null;
  name: string | null;
  date: string | null;
}) {
  const dateLabel = formatDate(props.date);
  return (
    <div className="flex-1 min-w-[200px]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{props.heading}</p>
      <div className="mt-2 flex h-20 items-end">
        {props.imageUrl ? (
          <img src={props.imageUrl} alt={`Signature of ${props.name ?? 'signer'}`} className="max-h-20 max-w-full object-contain" />
        ) : null}
      </div>
      <div className="border-b border-slate-400" />
      <p className="mt-1.5 text-xs text-slate-700">
        <span className="text-slate-500">Name: </span>
        {props.name ?? ' '}
      </p>
      <p className="mt-0.5 text-xs text-slate-700">
        <span className="text-slate-500">Date: </span>
        {dateLabel ?? ' '}
      </p>
    </div>
  );
}

/**
 * A4-proportioned preview with business header, the rich-text body and the
 * two-party signature block. `body_html` is sanitised by the API before storage.
 */
export function SigningDocumentPreview({ view }: { view: SigningDocumentView }) {
  const { business } = view;
  return (
    <div className="mx-auto w-full max-w-[794px] min-h-[1123px] bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
      <div className="flex flex-col gap-8 px-6 py-8 sm:px-12 sm:py-12">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <p className="text-base font-semibold">{business.name}</p>
            {business.address && <p className="mt-1 whitespace-pre-line text-xs text-slate-500">{business.address}</p>}
            {business.phone && <p className="text-xs text-slate-500">{business.phone}</p>}
            {business.vat_number && <p className="text-xs text-slate-500">VAT: {business.vat_number}</p>}
          </div>
          {business.logo_download_url && (
            <img src={business.logo_download_url} alt="" className="max-h-16 max-w-[160px] object-contain" />
          )}
        </header>

        <h1 className="text-2xl font-bold tracking-tight">{view.title}</h1>

        <div className="foro-rich-text" dangerouslySetInnerHTML={{ __html: view.body_html }} />

        <section className="mt-auto flex flex-wrap gap-10 border-t border-slate-200 pt-8">
          <SignatureColumn
            heading={`For ${business.name || 'the business'}`}
            imageUrl={view.sender_signature_url}
            name={view.sender_signed_name}
            date={view.sender_signature_date}
          />
          <SignatureColumn
            heading={`For ${view.company_name || 'the client'}`}
            imageUrl={view.recipient_signature_url}
            name={view.recipient_signed_name ?? view.recipient_name}
            date={view.recipient_signature_date}
          />
        </section>
      </div>
    </div>
  );
}

export default SigningDocumentPreview;
