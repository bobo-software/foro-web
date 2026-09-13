import { useEffect, useMemo, useState } from 'react';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useCompanyStore } from '@/stores/data/CompanyStore';
import { useTeamStore } from '@/stores/data/TeamStore';
import InvoiceService from '@/services/invoiceService';
import { useSubscriptionLimits } from './useSubscriptionLimits';
import type { SubscriptionTier } from '@/types/subscription';

export interface UsageMetric {
  label: string;
  used: number;
  /** null = unlimited */
  limit: number | null;
}

export interface SubscriptionUsage {
  tier: SubscriptionTier;
  /** True only while the (skippable, on an unlimited plan) invoice-count fetch is in flight. */
  loading: boolean;
  companies: UsageMetric;
  teamMembers: UsageMetric;
  invoicesThisMonth: UsageMetric;
}

/**
 * The active business's effective tier, its usage caps, and how much of each
 * it's actually used. Companies/team members reuse whatever those stores
 * already hold (and trigger a fetch if empty); invoices this month has no
 * dedicated store or count endpoint, so it's fetched directly here — skipped
 * entirely on an unlimited (invoices: null) plan to avoid a needless request.
 */
export function useSubscriptionUsage(): SubscriptionUsage {
  const { tier, limits } = useSubscriptionLimits();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id ?? null);

  const companies = useCompanyStore((s) => s.companies);
  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);
  const members = useTeamStore((s) => s.members);
  const invites = useTeamStore((s) => s.invites);
  const fetchMembers = useTeamStore((s) => s.fetchMembers);
  const fetchInvites = useTeamStore((s) => s.fetchInvites);

  const [invoiceCount, setInvoiceCount] = useState(0);
  const [invoiceCountLoading, setInvoiceCountLoading] = useState(false);

  useEffect(() => {
    if (businessId != null) void fetchCompanies();
  }, [businessId, fetchCompanies]);

  useEffect(() => {
    if (businessId != null) {
      void fetchMembers(businessId);
      void fetchInvites(businessId);
    }
  }, [businessId, fetchMembers, fetchInvites]);

  useEffect(() => {
    if (businessId == null || limits.invoices == null) {
      setInvoiceCount(0);
      return;
    }
    let cancelled = false;
    setInvoiceCountLoading(true);
    const monthPrefix = new Date().toISOString().slice(0, 7);
    InvoiceService.findAll({ where: { business_id: businessId } })
      .then((rows) => {
        if (cancelled) return;
        const count = rows.filter(
          (inv) => inv.document_kind === 'invoice' && (inv.issue_date ?? '').startsWith(monthPrefix)
        ).length;
        setInvoiceCount(count);
      })
      .catch(() => {
        if (!cancelled) setInvoiceCount(0);
      })
      .finally(() => {
        if (!cancelled) setInvoiceCountLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, limits.invoices]);

  const clientCompanyCount = useMemo(() => companies.filter((c) => !c.is_owner_company).length, [companies]);
  const activeMemberCount = useMemo(() => members.filter((m) => m.status === 'active').length, [members]);
  const pendingInviteCount = useMemo(
    () => invites.filter((i) => i.status === 'pending' || i.status === 'sent').length,
    [invites]
  );

  return {
    tier,
    loading: invoiceCountLoading,
    companies: { label: 'Companies', used: clientCompanyCount, limit: limits.companies },
    teamMembers: { label: 'Team members', used: activeMemberCount + pendingInviteCount, limit: limits.teamMembers },
    invoicesThisMonth: { label: 'Invoices this month', used: invoiceCount, limit: limits.invoices },
  };
}

export default useSubscriptionUsage;
