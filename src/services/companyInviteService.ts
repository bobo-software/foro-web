/**
 * Company invites (UPCOMING-1): email someone a link to add their own company
 * details; accepting links both businesses, and the recipient can optionally
 * set a password to sign in. Public by-token endpoints need no session.
 */

import { foroApiClient } from '../backend';
import { applyAuthSession, type AuthTokensResponse } from './authService';
import type { CompanyType } from '../types/company';
import type { SessionUser } from '../types/Types';

const BASE = '/api/v1/company-invites';

export interface CompanyInvitePreview {
  valid: boolean;
  reason: 'expired' | 'revoked' | 'accepted' | null;
  status: string;
  email: string;
  company_type: CompanyType;
  expires_at: string;
  business_name: string;
  business_logo_url: string | null;
  has_account: boolean;
  has_password: boolean;
  has_business: boolean;
  can_set_password: boolean;
  /** Set when the invite came with an emailed document that is still live. */
  document: { type: InviteDocumentType; id: number; number: string } | null;
}

export type InviteDocumentType = 'quotation' | 'invoice';

/** The recipient's own company, as entered on the invite page. */
export interface InviteCompanyDetails {
  contact_name: string;
  name: string;
  phone?: string;
  vat_number?: string;
  registration_number?: string;
  address?: {
    street_address?: string;
    street_address_2?: string;
    suburb?: string;
    town?: string;
    city?: string;
    province?: string;
    country?: string;
    postal_code?: string;
  };
}

export interface InviteAccepted {
  business_id: number;
  linked_company_id: number;
  /** The emailed document, now in the recipient's received documents. */
  document: { type: InviteDocumentType; id: number } | null;
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function detailsToApi(details: InviteCompanyDetails) {
  const address = details.address ?? {};
  return {
    contactName: details.contact_name.trim(),
    name: details.name.trim(),
    phone: blankToUndefined(details.phone),
    vatNumber: blankToUndefined(details.vat_number),
    registrationNumber: blankToUndefined(details.registration_number),
    address: {
      streetAddress: blankToUndefined(address.street_address),
      streetAddress2: blankToUndefined(address.street_address_2),
      suburb: blankToUndefined(address.suburb),
      town: blankToUndefined(address.town),
      city: blankToUndefined(address.city),
      province: blankToUndefined(address.province),
      country: blankToUndefined(address.country),
      postalCode: blankToUndefined(address.postal_code),
    },
  };
}

/** foro-api's error code (`INVITE_EXPIRED`, `DETAILS_REQUIRED`, …) from a failed request. */
export function inviteErrorCode(err: unknown): string | undefined {
  const data = (err as { data?: { error?: unknown } } | null)?.data;
  return typeof data?.error === 'string' ? data.error : undefined;
}

export class CompanyInviteService {
  /** Emails the invite; re-inviting a pending email sends a fresh link instead. */
  static async send(args: { businessId: number; email: string; companyType: CompanyType }): Promise<void> {
    await foroApiClient.post(BASE, args);
  }

  static async preview(token: string): Promise<CompanyInvitePreview> {
    const response = await foroApiClient.get<CompanyInvitePreview>(`${BASE}/by-token/${encodeURIComponent(token)}/preview`);
    return response.data;
  }

  /** Public accept for an email with no login yet. `details` may be omitted when the preview says `has_business`. */
  static async acceptWithDetails(token: string, details?: InviteCompanyDetails): Promise<InviteAccepted> {
    const response = await foroApiClient.post<InviteAccepted>(
      `${BASE}/by-token/${encodeURIComponent(token)}/accept-details`,
      details ? { details: detailsToApi(details) } : {},
    );
    return response.data;
  }

  /** Sets the new account's first password and signs it in; `businessId` is their linked business. */
  static async setPassword(token: string, password: string): Promise<{ sessionUser: SessionUser; businessId: number | null }> {
    const response = await foroApiClient.post<AuthTokensResponse & { business_id: number | null }>(
      `${BASE}/by-token/${encodeURIComponent(token)}/set-password`,
      { password },
    );
    return { sessionUser: applyAuthSession(response.data), businessId: response.data.business_id };
  }

  /** Signed-in accept: links the given (or first) business, or creates one from `details`. */
  static async acceptSignedIn(
    token: string,
    args: { businessId?: number; details?: InviteCompanyDetails } = {},
  ): Promise<InviteAccepted> {
    const response = await foroApiClient.post<InviteAccepted>(`${BASE}/by-token/${encodeURIComponent(token)}/accept`, {
      businessId: args.businessId,
      details: args.details ? detailsToApi(args.details) : undefined,
    });
    return response.data;
  }
}

export default CompanyInviteService;
