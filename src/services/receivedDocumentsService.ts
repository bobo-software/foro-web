/**
 * Read-only invoices/quotations a linked Foro business issued to the current
 * business — served from `/api/v1/companies/:id/received/*`, where `:id` is the
 * current business's company row for that linked business.
 */

import { foroApiClient } from '../backend';
import type { BankingDetails } from '../types/bankingDetails';
import type { Business } from '../types/business';
import type { Invoice, InvoiceItem } from '../types/invoice';
import type { Quotation, QuotationLine } from '../types/quotation';
import { normalizeQuotation, type ApiQuotationRow } from './quotationService';
import { quotationLineFromApi, type ApiQuotationLineRow } from './quotationLineService';
import {
  normalizeBankingDetails,
  normalizeBusiness,
  normalizeInvoice,
  normalizeInvoiceItem,
  type ApiBusinessRow,
  type ApiInvoiceItemRow,
  type ApiInvoiceRow,
} from './statementPortalService';

const base = (companyId: number) => `/api/v1/companies/${companyId}/received`;

interface IssuerBranding {
  business: Business | null;
  bankingDetails: BankingDetails | null;
}

export type ReceivedDocumentKind = 'quotation' | 'invoice';

/** One row of `GET /api/v1/received-documents` — documents from every linked sender. */
export interface ReceivedDocumentSummary {
  kind: ReceivedDocumentKind;
  id: number;
  number: string;
  issueDate: string;
  /** Invoice due date or quotation valid-until date. */
  dueDate: string | null;
  status: string;
  total: string;
  currency: string;
  /** The current business's company row for the sender (`:id` in the per-company routes). */
  companyId: number;
  senderName: string;
}

export class ReceivedDocumentsService {
  static async listAll(businessId: number, kind?: ReceivedDocumentKind): Promise<ReceivedDocumentSummary[]> {
    const res = await foroApiClient.get<ReceivedDocumentSummary[]>('/api/v1/received-documents', {
      businessId,
      ...(kind ? { type: kind } : {}),
    });
    return res.data ?? [];
  }

  static async listInvoices(companyId: number): Promise<Invoice[]> {
    const res = await foroApiClient.get<ApiInvoiceRow[]>(`${base(companyId)}/invoices`);
    return (res.data ?? []).map(normalizeInvoice);
  }

  static async listQuotations(companyId: number): Promise<Quotation[]> {
    const res = await foroApiClient.get<ApiQuotationRow[]>(`${base(companyId)}/quotations`);
    return (res.data ?? []).map(normalizeQuotation);
  }

  static async getInvoice(
    companyId: number,
    invoiceId: number,
  ): Promise<{ invoice: Invoice; lineItems: InvoiceItem[] } & IssuerBranding> {
    const res = await foroApiClient.get<{
      invoice: ApiInvoiceRow;
      lineItems: ApiInvoiceItemRow[];
      business: ApiBusinessRow | null;
    }>(`${base(companyId)}/invoices/${invoiceId}`);
    return {
      invoice: normalizeInvoice(res.data.invoice),
      lineItems: res.data.lineItems.map(normalizeInvoiceItem),
      business: normalizeBusiness(res.data.business),
      bankingDetails: normalizeBankingDetails(res.data.business?.bankingDetails),
    };
  }

  static async getQuotation(
    companyId: number,
    quotationId: number,
  ): Promise<{ quotation: Quotation; lineItems: QuotationLine[] } & IssuerBranding> {
    const res = await foroApiClient.get<{
      quotation: ApiQuotationRow;
      lineItems: ApiQuotationLineRow[];
      business: ApiBusinessRow | null;
    }>(`${base(companyId)}/quotations/${quotationId}`);
    return {
      quotation: normalizeQuotation(res.data.quotation),
      lineItems: res.data.lineItems.map(quotationLineFromApi),
      business: normalizeBusiness(res.data.business),
      bankingDetails: normalizeBankingDetails(res.data.business?.bankingDetails),
    };
  }
}

export default ReceivedDocumentsService;
