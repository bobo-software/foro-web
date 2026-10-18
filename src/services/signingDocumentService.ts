/**
 * Signing Document Service — admin side of custom document signing.
 * Talks to `/api/v1/signing-documents` (CRUD + send / resend / void / sender-signature).
 */

import { foroApiClient } from '../backend';
import type {
  SignatureSubmission,
  SignatureUrls,
  SigningDocument,
  SigningDocumentInput,
  SigningDocumentStatus,
} from '../types/signingDocument';

const BASE = '/api/v1/signing-documents';

interface ApiSigningDocumentRow {
  id: number;
  businessId: number;
  companyId: number;
  title: string;
  bodyHtml: string;
  status: string;
  recipientContactId: number | null;
  recipientName: string | null;
  recipientEmail: string | null;
  senderSignatureKey: string | null;
  senderSignedName: string | null;
  senderSignatureDate: string | null;
  recipientSignatureKey: string | null;
  recipientSignedName: string | null;
  recipientSignatureDate: string | null;
  recipientSignedAt: string | null;
  sentAt: string | null;
  voidedAt: string | null;
  deletedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function normalize(row: ApiSigningDocumentRow): SigningDocument {
  return {
    id: row.id,
    business_id: row.businessId,
    company_id: row.companyId,
    title: row.title,
    body_html: row.bodyHtml,
    status: row.status as SigningDocumentStatus,
    recipient_contact_id: row.recipientContactId,
    recipient_name: row.recipientName,
    recipient_email: row.recipientEmail,
    sender_signed_name: row.senderSignedName,
    sender_signature_date: row.senderSignatureDate,
    has_sender_signature: !!row.senderSignatureKey,
    recipient_signed_name: row.recipientSignedName,
    recipient_signature_date: row.recipientSignatureDate,
    recipient_signed_at: row.recipientSignedAt,
    has_recipient_signature: !!row.recipientSignatureKey,
    sent_at: row.sentAt,
    voided_at: row.voidedAt,
    deleted_at: row.deletedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function toApiBody(data: Partial<SigningDocumentInput>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.company_id !== undefined) body.companyId = data.company_id;
  if (data.title !== undefined) body.title = data.title;
  if (data.body_html !== undefined) body.bodyHtml = data.body_html;
  return body;
}

export class SigningDocumentService {
  static async findAll(params: { businessId?: number; status?: string; trashed?: boolean } = {}): Promise<SigningDocument[]> {
    const response = await foroApiClient.get<ApiSigningDocumentRow[]>(BASE, {
      limit: 200,
      ...(params.businessId != null && { businessId: params.businessId }),
      ...(params.status && params.status !== 'all' && { status: params.status }),
      ...(params.trashed ? { trashed: true } : {}),
    });
    return (response.data ?? []).map(normalize);
  }

  static async findById(id: number): Promise<SigningDocument> {
    const response = await foroApiClient.get<ApiSigningDocumentRow>(`${BASE}/${id}`);
    return normalize(response.data);
  }

  static async create(data: SigningDocumentInput): Promise<SigningDocument> {
    const response = await foroApiClient.post<ApiSigningDocumentRow>(BASE, toApiBody(data));
    return normalize(response.data);
  }

  static async update(id: number, data: Partial<SigningDocumentInput>): Promise<SigningDocument> {
    const response = await foroApiClient.put<ApiSigningDocumentRow>(`${BASE}/${id}`, toApiBody(data));
    return normalize(response.data);
  }

  static async delete(id: number): Promise<void> {
    await foroApiClient.delete(`${BASE}/${id}`);
  }

  static async restore(id: number): Promise<SigningDocument> {
    const response = await foroApiClient.post<ApiSigningDocumentRow>(`${BASE}/${id}/restore`);
    return normalize(response.data);
  }

  static async signAsSender(id: number, signature: SignatureSubmission): Promise<SigningDocument> {
    const response = await foroApiClient.post<ApiSigningDocumentRow>(`${BASE}/${id}/sender-signature`, signature);
    return normalize(response.data);
  }

  /** Omit `contactId` to send to the company's primary contact. */
  static async send(id: number, contactId?: number): Promise<SigningDocument> {
    const response = await foroApiClient.post<ApiSigningDocumentRow>(
      `${BASE}/${id}/send`,
      contactId != null ? { contactId } : {},
    );
    return normalize(response.data);
  }

  static async resend(id: number): Promise<SigningDocument> {
    const response = await foroApiClient.post<ApiSigningDocumentRow>(`${BASE}/${id}/resend`);
    return normalize(response.data);
  }

  static async void(id: number): Promise<SigningDocument> {
    const response = await foroApiClient.post<ApiSigningDocumentRow>(`${BASE}/${id}/void`);
    return normalize(response.data);
  }

  static async getSignatureUrls(id: number): Promise<SignatureUrls> {
    const response = await foroApiClient.get<{ senderSignatureUrl: string | null; recipientSignatureUrl: string | null }>(
      `${BASE}/${id}/signatures`,
    );
    return {
      sender_signature_url: response.data.senderSignatureUrl,
      recipient_signature_url: response.data.recipientSignatureUrl,
    };
  }
}

export default SigningDocumentService;
