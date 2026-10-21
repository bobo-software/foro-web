import { create } from 'zustand';
import CompanyService from '../../services/companyService';
import InvoiceService from '../../services/invoiceService';
import QuotationService from '../../services/quotationService';
import ItemService from '../../services/itemService';
import BankingDetailsService from '../../services/bankingDetailsService';
import SuperadminDashboardService, {
  type ApplicationDashboardStats,
} from '../../services/superadminDashboardService';
import type { Invoice } from '../../types/invoice';
import { effectiveInvoiceStatus } from '../../utils/invoiceLifecycle';

export interface DashboardStats {
  companies: number;
  invoices: number;
  quotations: number;
  items: number;
  businesses?: number;
  projects?: number;
  payments?: number;
  knownCompanies?: number;
}

export interface DashboardFinancials {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
}

interface DashboardState {
  stats: DashboardStats;
  financials: DashboardFinancials;
  recentInvoices: Invoice[];
  loading: boolean;
  error: string | null;
  hasBankingDetails: boolean;
  bankingLoading: boolean;
  loadSnapshot: (businessId: number | null | undefined) => Promise<void>;
  loadApplicationSnapshot: () => Promise<void>;
  loadBankingPresence: (userId: number | null | undefined) => Promise<void>;
}

function applicationStats(stats: ApplicationDashboardStats): DashboardStats {
  return {
    businesses: stats.businesses,
    companies: stats.companies,
    invoices: stats.invoices,
    quotations: stats.quotations,
    items: stats.items,
    projects: stats.projects,
    payments: stats.payments,
    knownCompanies: stats.knownCompanies,
  };
}

function computeFinancials(invoices: Invoice[]): DashboardFinancials {
  let totalBilled = 0;
  let totalPaid = 0;
  let outstanding = 0;
  let overdue = 0;
  for (const inv of invoices) {
    const status = effectiveInvoiceStatus(inv);
    if (inv.document_kind === 'credit_note' || status === 'draft' || status === 'cancelled') continue;
    totalBilled += inv.total;
    if (status === 'paid') totalPaid += inv.total;
    if (status === 'sent' || status === 'overdue') outstanding += inv.total;
    if (status === 'overdue') overdue += inv.total;
  }
  return { totalBilled, totalPaid, outstanding, overdue };
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: { companies: 0, invoices: 0, quotations: 0, items: 0 },
  financials: { totalBilled: 0, totalPaid: 0, outstanding: 0, overdue: 0 },
  recentInvoices: [],
  loading: true,
  error: null,
  hasBankingDetails: false,
  // True until the first check so the "banking details missing" banner can't flash on mount.
  bankingLoading: true,

  loadSnapshot: async (businessId) => {
    set({ loading: true, error: null });
    try {
      const businessWhere = businessId != null ? { businessId } : undefined;
      const [allCompanies, allInvoices, allQuotations, allItems] = await Promise.all([
        CompanyService.findAll({ where: businessWhere }),
        InvoiceService.findAll({ where: businessWhere, orderBy: 'issue_date', orderDirection: 'DESC' }),
        QuotationService.findAll({ where: businessWhere }),
        ItemService.findAll({ where: businessWhere }),
      ]);
      set({
        stats: {
          companies: allCompanies.length,
          invoices: allInvoices.length,
          quotations: allQuotations.length,
          items: allItems.length,
        },
        financials: computeFinancials(allInvoices),
        recentInvoices: allInvoices.slice(0, 5),
        loading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to load dashboard',
        loading: false,
      });
    }
  },

  loadApplicationSnapshot: async () => {
    set({ loading: true, error: null });
    try {
      const snapshot = await SuperadminDashboardService.fetch();
      set({
        stats: applicationStats(snapshot.stats),
        financials: snapshot.financials,
        recentInvoices: snapshot.recentInvoices,
        loading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to load dashboard',
        loading: false,
      });
    }
  },

  loadBankingPresence: async (userId) => {
    if (!userId) {
      set({ hasBankingDetails: false, bankingLoading: false });
      return;
    }
    set({ bankingLoading: true });
    try {
      const rows = await BankingDetailsService.findByUserId(Number(userId));
      set({ hasBankingDetails: rows.length > 0, bankingLoading: false });
    } catch {
      set({ hasBankingDetails: false, bankingLoading: false });
    }
  },
}));
