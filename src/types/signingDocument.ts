/**
 * Signing document types — free-form documents sent to a customer contact
 * to sign through an emailed, OTP-gated link.
 */

export type SigningDocumentStatus = 'draft' | 'sent' | 'signed' | 'voided';

export interface SigningDocument {
  id: number;
  business_id: number;
  company_id: number;
  title: string;
  /** Sanitised HTML (server-side allowlist) — safe to render. */
  body_html: string;
  status: SigningDocumentStatus;
  recipient_contact_id: number | null;
  recipient_name: string | null;
  recipient_email: string | null;
  sender_signed_name: string | null;
  sender_signature_date: string | null;
  has_sender_signature: boolean;
  recipient_signed_name: string | null;
  recipient_signature_date: string | null;
  recipient_signed_at: string | null;
  has_recipient_signature: boolean;
  sent_at: string | null;
  voided_at: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SigningDocumentInput {
  business_id: number;
  company_id: number;
  title: string;
  body_html: string;
}

export interface SignatureUrls {
  sender_signature_url: string | null;
  recipient_signature_url: string | null;
}

/** What `SignaturePadField` produces; sent as-is to the sign endpoints. */
export interface SignatureSubmission {
  signatureDataUrl: string;
  signedName: string;
  /** YYYY-MM-DD */
  signatureDate: string;
}

/** Everything the A4 preview and PDF need, from either the admin or public side. */
export interface SigningDocumentView {
  id: number;
  title: string;
  body_html: string;
  status: SigningDocumentStatus;
  company_name: string;
  recipient_name: string | null;
  sender_signed_name: string | null;
  sender_signature_date: string | null;
  sender_signature_url: string | null;
  recipient_signed_name: string | null;
  recipient_signature_date: string | null;
  recipient_signature_url: string | null;
  business: {
    name: string;
    address?: string;
    phone?: string;
    vat_number?: string;
    registration_number?: string;
    /** A fetchable (presigned) URL, not a storage key. */
    logo_download_url?: string | null;
  };
}

export interface SigningLinkPreview {
  title: string;
  status: SigningDocumentStatus;
  business_name: string | null;
  recipient_email: string;
}
