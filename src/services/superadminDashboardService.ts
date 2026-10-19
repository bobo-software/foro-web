import { foroApiClient } from '../backend';
import type { Invoice, InvoiceStatus } from '../types/invoice';

const BASE = '/api/v1/superadmin/dashboard';

export interface ApplicationDashboardStats {
  businesses: number;
  companies: number;
  invoices: number;
  quotations: number;
  items: number;
  projects: number;
  payments: number;
  knownCompanies: number;
}

export interface ApplicationDashboardFinancials {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
}

interface ApiRecentInvoice {
  id: number;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  status: string;
  total: number;
  currency: string;
  documentKind: string;
}

interface ApiApplicationDashboard {
  stats: ApplicationDashboardStats;
  financials: ApplicationDashboardFinancials;
  recentInvoices: ApiRecentInvoice[];
}

export interface ApplicationDashboard {
  stats: ApplicationDashboardStats;
  financials: ApplicationDashboardFinancials;
  recentInvoices: Invoice[];
}

function toInvoice(row: ApiRecentInvoice): Invoice {
  return {
    id: row.id,
    invoice_number: row.invoiceNumber,
    customer_name: row.customerName,
    issue_date: row.issueDate,
    due_date: row.dueDate,
    status: row.status as InvoiceStatus,
    subtotal: row.total,
    total: row.total,
    currency: row.currency,
    document_kind: row.documentKind === 'credit_note' ? 'credit_note' : 'invoice',
  };
}

export class SuperadminDashboardService {
  static async fetch(): Promise<ApplicationDashboard> {
    const response = await foroApiClient.get<ApiApplicationDashboard>(BASE);
    const data = response.data;
    return {
      stats: data.stats,
      financials: data.financials,
      recentInvoices: (data.recentInvoices ?? []).map(toInvoice),
    };
  }
}

export default SuperadminDashboardService;
