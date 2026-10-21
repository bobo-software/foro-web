import type { Quotation, QuotationLine } from '../types/quotation';
import { useQuotationStore } from '../stores/data/QuotationStore';
import type { Business } from '../types/business';
import {
  generateStandardDocumentPdf,
  generateStandardDocumentPdfBlob,
  computePdfTotals,
  type StandardDocumentInput,
} from './pdfTemplates/generateStandardDocumentPdf';
import { useBusinessStore } from '../stores/data/BusinessStore';

const QUOTATION_STATUS_COLORS: Record<string, [number, number, number]> = {
  draft: [100, 100, 100],
  sent: [59, 130, 246],
  accepted: [34, 197, 94],
  declined: [239, 68, 68],
  expired: [156, 163, 175],
  converted: [139, 92, 246],
};

/** Fetch quotation + line items by id, then download PDF. Use from list view. */
export async function downloadQuotationPdfById(quotationId: number): Promise<void> {
  const { quotation, lines } = await useQuotationStore.getState().fetchQuotationWithLines(quotationId);
  if (!quotation) throw new Error('Quotation not found');
  const business = useBusinessStore.getState().currentBusiness;
  await generateQuotationPdf(quotation, lines, business);
}

export function quotationPdfFilename(quotation: Pick<Quotation, 'quotation_number'>): string {
  return `quotation-${quotation.quotation_number}.pdf`;
}

export async function generateQuotationPdf(
  quotation: Quotation,
  lineItems: QuotationLine[] = [],
  business?: Business | null,
): Promise<void> {
  await generateStandardDocumentPdf(quotationPdfInput(quotation, lineItems, business), business);
}

/** The quotation PDF as a Blob (for emailing) — a draft is rendered as sent, which sending makes it. */
export async function generateQuotationPdfBlob(
  quotation: Quotation,
  lineItems: QuotationLine[] = [],
  business?: Business | null,
): Promise<Blob> {
  const status = quotation.status === 'draft' ? 'sent' : quotation.status;
  return generateStandardDocumentPdfBlob(quotationPdfInput({ ...quotation, status }, lineItems, business), business);
}

function quotationPdfInput(
  quotation: Quotation,
  lineItems: QuotationLine[],
  business?: Business | null,
): StandardDocumentInput {
  const { subtotal, vatRate, vatAmount, total } = computePdfTotals(
    lineItems,
    quotation.subtotal,
    quotation.tax_rate
  );

  const curr = quotation.currency || 'ZAR';

  return {
    header: {
      businessName: business?.name || 'Business Name',
      businessAddress: business?.address,
      businessPhone: business?.phone,
      businessVat: business?.vat_number,
      businessReg: business?.registration_number,
      documentTitle: 'Quotation',
      documentNumber: `#${quotation.quotation_number}`,
      orderNumber: quotation.order_number,
      status: quotation.status,
      statusColors: QUOTATION_STATUS_COLORS,
    },
    customer: {
      customerName: quotation.customer_name,
      customerEmail: quotation.customer_email,
      customerAddress: quotation.customer_address,
      customerVat: quotation.customer_vat_number,
      deliveryAddress: quotation.delivery_address,
      deliveryConditions: quotation.delivery_conditions,
    },
    dates: {
      issueDate: quotation.issue_date,
      validUntil: quotation.valid_until,
      terms: quotation.terms,
    },
    lineItems: lineItems.map((item) => ({
      sku: item.sku,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      total: Number(item.total),
      unitType: item.unit_type ?? 'qty',
    })),
    totals: { subtotal, vatRate, vatAmount, total, currency: curr, bankingDetails: business?.banking_details },
    notes: quotation.notes || undefined,
    filename: quotationPdfFilename(quotation),
  };
}
