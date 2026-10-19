/**
 * Public document-signing service — reached from the emailed `/sign/:token` link,
 * OTP-gated while awaiting signature; a signed document's link opens read-only without one. Uses `documentSigningApiClient` (its own sessionStorage token,
 * separate from both the admin session and the statement portal).
 */

import { documentSigningApiClient } from '../backend/client/StatementPortalApiClient';
import type {
  SignatureSubmission,
  SigningDocumentStatus,
  SigningDocumentView,
  SigningLinkPreview,
} from '../types/signingDocument';

const BASE = '/api/v1/document-signing';
/** Which emailed link the stored session was opened from — a session never carries over to another document's link. */
const SESSION_LINK_KEY = 'foro_signing_session_link';

function readSessionLink(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_LINK_KEY);
  } catch {
    return null;
  }
}

function writeSessionLink(token: string | null): void {
  try {
    if (token) window.sessionStorage.setItem(SESSION_LINK_KEY, token);
    else window.sessionStorage.removeItem(SESSION_LINK_KEY);
  } catch {
    /* sessionStorage unavailable — session just won't persist across reload */
  }
}

interface ApiPublicDocument {
  id: number;
  title: string;
  bodyHtml: string;
  status: string;
  companyName: string | null;
  recipientName: string | null;
  senderSignedName: string | null;
  senderSignatureDate: string | null;
  senderSignatureUrl: string | null;
  recipientSignedName: string | null;
  recipientSignatureDate: string | null;
  recipientSignatureUrl: string | null;
}

interface ApiBusiness {
  name: string;
  address: string | null;
  phone: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
}

interface ApiSessionDocument {
  document: ApiPublicDocument;
  business: ApiBusiness | null;
  logoDownloadUrl: string | null;
}

function normalize(data: ApiSessionDocument): SigningDocumentView {
  const { document: d, business: b } = data;
  return {
    id: d.id,
    title: d.title,
    body_html: d.bodyHtml,
    status: d.status as SigningDocumentStatus,
    company_name: d.companyName ?? '',
    recipient_name: d.recipientName,
    sender_signed_name: d.senderSignedName,
    sender_signature_date: d.senderSignatureDate,
    sender_signature_url: d.senderSignatureUrl,
    recipient_signed_name: d.recipientSignedName,
    recipient_signature_date: d.recipientSignatureDate,
    recipient_signature_url: d.recipientSignatureUrl,
    business: {
      name: b?.name ?? '',
      address: b?.address ?? undefined,
      phone: b?.phone ?? undefined,
      vat_number: b?.vatNumber ?? undefined,
      registration_number: b?.registrationNumber ?? undefined,
      logo_download_url: data.logoDownloadUrl,
    },
  };
}

export class DocumentSigningPortalService {
  static hasSessionFor(linkToken: string): boolean {
    return documentSigningApiClient.hasSession() && readSessionLink() === linkToken;
  }

  static logout(): void {
    documentSigningApiClient.clearToken();
    writeSessionLink(null);
  }

  static async preview(token: string): Promise<SigningLinkPreview> {
    const response = await documentSigningApiClient.get<{
      title: string;
      status: string;
      businessName: string | null;
      recipientEmail: string;
    }>(`${BASE}/${encodeURIComponent(token)}`);
    return {
      title: response.data.title,
      status: response.data.status as SigningDocumentStatus,
      business_name: response.data.businessName,
      recipient_email: response.data.recipientEmail,
    };
  }

  /** Read-only copy of a signed document — the link alone is enough, no OTP or session. */
  static async getSignedCopy(token: string): Promise<SigningDocumentView> {
    const response = await documentSigningApiClient.get<ApiSessionDocument>(
      `${BASE}/${encodeURIComponent(token)}/signed-copy`,
    );
    return normalize(response.data);
  }

  static async requestOtp(token: string): Promise<string> {
    const response = await documentSigningApiClient.post<null>(`${BASE}/${encodeURIComponent(token)}/otp/request`);
    return response.message ?? 'A verification code has been sent to your email.';
  }

  static async verifyOtp(token: string, otp: string): Promise<void> {
    const response = await documentSigningApiClient.post<{ accessToken: string }>(
      `${BASE}/${encodeURIComponent(token)}/otp/verify`,
      { otp },
    );
    documentSigningApiClient.setToken(response.data.accessToken);
    writeSessionLink(token);
  }

  static async getDocument(): Promise<SigningDocumentView> {
    const response = await documentSigningApiClient.get<ApiSessionDocument>(`${BASE}/session/document`);
    return normalize(response.data);
  }

  static async sign(signature: SignatureSubmission): Promise<SigningDocumentView> {
    const response = await documentSigningApiClient.post<ApiSessionDocument>(`${BASE}/session/sign`, signature);
    return normalize(response.data);
  }
}

export default DocumentSigningPortalService;
