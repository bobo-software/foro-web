import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuPrinter } from 'react-icons/lu';
import InvoiceService from '@/services/invoiceService';
import PaymentService from '@/services/paymentService';
import StorageService from '@/services/storageService';
import { formatCurrency, SUPPORTED_CURRENCIES } from '@/utils/currency';
import type { StatementRow } from '@/utils/statementPdf';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useBusinessDocumentContextStore } from '@/stores/data/BusinessDocumentContextStore';
import { ACCOUNT_TYPES } from '@/types/bankingDetails';
import { isCreditNoteInvoice } from '@/utils/invoiceLedger';
import type { CompanyTabProps } from './types';
import { formatDate } from './types';

function firstDayOfCurrentMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

function lastDayOfCurrentMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().split('T')[0];
}

export function CompanyStatementsTab({ company, projects = [], selectedProjectId = 'all' }: CompanyTabProps) {
  const navigate = useNavigate();
  const business = useBusinessStore((s) => s.currentBusiness);
  const bankingDetails = useBusinessDocumentContextStore((s) => s.bankingDetails);
  const loadDocumentContext = useBusinessDocumentContextStore((s) => s.loadForCurrentBusiness);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [stmtFromDate, setStmtFromDate] = useState<string>(() => firstDayOfCurrentMonth());
  const [stmtToDate, setStmtToDate] = useState<string>(() => lastDayOfCurrentMonth());
  const [stmtCurrency, setStmtCurrency] = useState<string>('ZAR');
  const [stmtRows, setStmtRows] = useState<StatementRow[]>([]);
  const [stmtLoading, setStmtLoading] = useState(false);
  const [stmtGenerated, setStmtGenerated] = useState(false);
  const [stmtScope, setStmtScope] = useState<'company' | 'project'>('company');
  const [stmtProjectId, setStmtProjectId] = useState<number | null>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === stmtProjectId) ?? null,
    [projects, stmtProjectId]
  );

  const scopeLabel = stmtScope === 'project'
    ? selectedProject?.name ?? 'Project'
    : 'All projects';

  const ensureProjectScopeSelection = useCallback(() => {
    if (stmtScope !== 'project') return true;
    if (stmtProjectId != null) return true;
    return false;
  }, [stmtScope, stmtProjectId]);

  useEffect(() => {
    if (selectedProjectId !== 'all') {
      setStmtScope('project');
      setStmtProjectId(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (business?.id == null) return;
    void loadDocumentContext();
  }, [business?.id, loadDocumentContext]);

  useEffect(() => {
    if (!business?.logo_url) { setLogoUrl(null); return; }
    StorageService.getFileDownloadUrl(business.logo_url)
      .then((url) => setLogoUrl(url ?? null))
      .catch(() => setLogoUrl(null));
  }, [business?.logo_url]);

  useEffect(() => {
    if (!company?.logo_url) { setCompanyLogoUrl(null); return; }
    StorageService.getFileDownloadUrl(company.logo_url)
      .then((url) => setCompanyLogoUrl(url ?? null))
      .catch(() => setCompanyLogoUrl(null));
  }, [company?.logo_url]);

  const generateStatement = useCallback(async () => {
    if (!company?.id) return;
    setStmtLoading(true);
    setStmtGenerated(false);
    try {
      const [invList, payList] = await Promise.all([
        InvoiceService.findAll({
          where: {
            company_id: company.id,
            ...(stmtScope === 'project' && stmtProjectId != null ? { project_id: stmtProjectId } : {}),
          },
          orderBy: 'issue_date',
          orderDirection: 'ASC',
          limit: 1000,
        }),
        PaymentService.findByCompanyId(
          company.id,
          stmtScope === 'project' && stmtProjectId != null ? { projectId: stmtProjectId } : undefined
        ),
      ]);

      const from = stmtFromDate || '1970-01-01';
      const to = stmtToDate || '9999-12-31';
      const filterByDate = (d: string) => d >= from && d <= to;

      const combined: Array<{
        date: string;
        type: 'invoice' | 'payment' | 'credit_note';
        reference: string;
        amount: number;
        currency: string;
        invoiceId?: number;
      }> = [];
      for (const inv of invList) {
        const d = inv.issue_date?.split('T')[0] ?? inv.issue_date ?? '';
        if (filterByDate(d)) {
          const isCn = isCreditNoteInvoice(inv);
          combined.push({
            date: d,
            type: isCn ? 'credit_note' : 'invoice',
            reference: inv.invoice_number ?? (isCn ? `CN #${inv.id}` : `Invoice #${inv.id}`),
            amount: Number(inv.total) || 0,
            currency: inv.currency || 'ZAR',
            invoiceId: inv.id,
          });
        }
      }
      for (const pay of payList) {
        const d = pay.date?.split('T')[0] ?? pay.date ?? '';
        if (filterByDate(d)) {
          combined.push({
            date: d,
            type: 'payment',
            reference: pay.reference || `Payment #${pay.id}`,
            amount: Number(pay.amount) || 0,
            currency: pay.currency || 'ZAR',
          });
        }
      }
      combined.sort((a, b) => a.date.localeCompare(b.date));

      const byCurrency = new Map<string, StatementRow[]>();
      for (const item of combined) {
        const c = item.currency;
        if (!byCurrency.has(c)) byCurrency.set(c, []);
        const list = byCurrency.get(c)!;
        const prevBalance = list.length > 0 ? list[list.length - 1].balance : 0;
        const isDebit = item.type === 'invoice';
        const isCredit = item.type === 'payment' || item.type === 'credit_note';
        const balance = isDebit ? prevBalance + item.amount : prevBalance - item.amount;
        list.push({
          date: item.date,
          type: item.type,
          reference: item.reference,
          debit: isDebit ? item.amount : 0,
          credit: isCredit ? item.amount : 0,
          balance,
          currency: c,
          invoiceId: item.invoiceId,
        });
      }

      const allRows: StatementRow[] = [];
      byCurrency.forEach((list) => allRows.push(...list));
      allRows.sort((a, b) => a.date.localeCompare(b.date));
      setStmtRows(allRows);
      setStmtGenerated(true);
    } catch (err) {
      console.error(err);
      setStmtRows([]);
    } finally {
      setStmtLoading(false);
    }
  }, [company?.name, stmtFromDate, stmtToDate, stmtScope, stmtProjectId]);

  const handlePrintStatement = useCallback(() => {
    const prev = document.title;
    document.title = `statement-${company.name}`;
    window.print();
    document.title = prev;
  }, [company.name]);

  const stmtFilteredRows = useMemo(
    () => stmtRows.filter((r) => r.currency === stmtCurrency),
    [stmtRows, stmtCurrency]
  );

  const stmtTotals = useMemo(() => {
    const totalDebits = stmtFilteredRows.reduce((s, r) => s + r.debit, 0);
    const totalCredits = stmtFilteredRows.reduce((s, r) => s + r.credit, 0);
    const openingBalance = stmtFilteredRows.length > 0
      ? stmtFilteredRows[0].balance - stmtFilteredRows[0].debit + stmtFilteredRows[0].credit
      : 0;
    const closingBalance = stmtFilteredRows.length > 0
      ? stmtFilteredRows[stmtFilteredRows.length - 1].balance
      : 0;
    return { totalDebits, totalCredits, openingBalance, closingBalance };
  }, [stmtFilteredRows]);

  const thClass = 'px-2 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide';
  const statementPortalUrl = `${window.location.origin}/statements`;

  return (
    <>
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm print:hidden">
      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
        Generate a statement for {company.name} with date range and running balance. Dates default to the current month.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <div className="flex flex-col">
          <label htmlFor="stmt-scope" className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Scope
          </label>
          <select
            id="stmt-scope"
            value={stmtScope}
            onChange={(e) => setStmtScope(e.target.value as 'company' | 'project')}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="company">Company (all projects)</option>
            <option value="project">Specific project</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="stmt-project" className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Project
          </label>
          <select
            id="stmt-project"
            value={stmtProjectId ?? ''}
            onChange={(e) => setStmtProjectId(e.target.value ? Number(e.target.value) : null)}
            disabled={stmtScope !== 'project'}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-50"
          >
            <option value="">Select project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="stmt-from" className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            From date
          </label>
          <input
            id="stmt-from"
            type="date"
            value={stmtFromDate}
            onChange={(e) => setStmtFromDate(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="stmt-to" className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            To date
          </label>
          <input
            id="stmt-to"
            type="date"
            value={stmtToDate}
            onChange={(e) => setStmtToDate(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="stmt-currency" className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Currency
          </label>
          <select
            id="stmt-currency"
            value={stmtCurrency}
            onChange={(e) => setStmtCurrency(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={generateStatement}
            disabled={stmtLoading || !ensureProjectScopeSelection()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stmtLoading ? 'Generating…' : 'Generate'}
          </button>
          {stmtGenerated && stmtFilteredRows.length > 0 && (
            <button
              type="button"
              onClick={handlePrintStatement}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <LuPrinter size={15} aria-hidden />
              Print / Save PDF
            </button>
          )}
        </div>
      </div>
    </div>

    {stmtGenerated && (
      <div className="statement-print-root w-full max-w-[794px] mx-auto mt-8 flex flex-col gap-4 print:max-w-none print:mx-0 print:mt-0 print:gap-0">
        <div className="statement-print-page bg-white dark:bg-gray-800 w-full min-h-[1123px] p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col gap-0 print:shadow-none print:border-none print:rounded-none print:min-h-0 print:p-8 print:bg-white dark:print:bg-white">

          {/* ── Header ── */}
          <div className="flex items-start justify-between pb-4 mb-4 border-b-2 border-gray-300 dark:border-gray-600">
            <div className="flex-1 min-w-0">
              {logoUrl && (
                <img src={logoUrl} alt="logo" className="mb-2 max-h-14 max-w-[120px] object-contain" />
              )}
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">{business?.name ?? '—'}</p>
              {business?.address && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line leading-snug max-w-[160px]">{business.address}</p>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400 pt-1 px-4">
              {business?.phone && <span>Tel: {business.phone}</span>}
              {business?.vat_number && <span>VAT: {business.vat_number}</span>}
              {business?.registration_number && <span>Reg: {business.registration_number}</span>}
            </div>

            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-wide uppercase leading-none text-right">
                Statement of Account
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Generated {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            </div>
          </div>

          {/* ── Account / Statement details ── */}
          <div className="grid grid-cols-2 gap-6 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              {companyLogoUrl && (
                <img src={companyLogoUrl} alt="logo" className="mt-4 h-10 w-10 shrink-0 rounded object-contain" />
              )}
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Account</p>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{company.name}</p>
                {company.address && <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line">{company.address}</p>}
                {company.email && <p className="text-xs text-gray-500 dark:text-gray-400">{company.email}</p>}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Statement Details</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Period: {stmtFromDate ? formatDate(stmtFromDate) : '—'} to {stmtToDate ? formatDate(stmtToDate) : '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Currency: {stmtCurrency}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Scope: {scopeLabel}</p>
            </div>
          </div>

          {/* ── Transaction table ── */}
          <div className="mb-4">
            {stmtFilteredRows.length > 0 ? (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                    <th className={`${thClass} border-r border-gray-200 dark:border-gray-600`}>Date</th>
                    <th className={`${thClass} border-r border-gray-200 dark:border-gray-600`}>Type</th>
                    <th className={`${thClass} border-r border-gray-200 dark:border-gray-600`}>Reference</th>
                    <th className={`${thClass} text-right border-r border-gray-200 dark:border-gray-600`}>Debit</th>
                    <th className={`${thClass} text-right border-r border-gray-200 dark:border-gray-600`}>Credit</th>
                    <th className={`${thClass} text-right`}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {stmtFilteredRows.map((row, idx) => {
                    const clickable = row.type !== 'payment' && row.invoiceId != null;
                    return (
                      <tr
                        key={`${row.date}-${row.type}-${row.reference}-${idx}`}
                        className={`border border-gray-200 dark:border-gray-700 ${idx % 2 === 1 ? 'bg-gray-50 dark:bg-gray-700/30' : ''} ${clickable ? 'cursor-pointer' : ''}`}
                        onClick={
                          clickable
                            ? () => navigate(`/app/invoices/${row.invoiceId}?from_company=${company.id}`)
                            : undefined
                        }
                      >
                        <td className="px-2 py-1 text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600 whitespace-nowrap">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-2 py-1 text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">
                          {row.type === 'invoice' ? 'Invoice' : row.type === 'credit_note' ? 'Credit note' : 'Payment'}
                        </td>
                        <td
                          className={`px-2 py-1 border-r border-gray-200 dark:border-gray-600 ${
                            clickable ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {row.reference}
                        </td>
                        <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">
                          {row.debit > 0 ? formatCurrency(row.debit, row.currency) : '—'}
                        </td>
                        <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">
                          {row.credit > 0 ? formatCurrency(row.credit, row.currency) : '—'}
                        </td>
                        <td className="px-2 py-1 text-right text-gray-800 dark:text-gray-200 font-medium">
                          {formatCurrency(row.balance, row.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No transactions in this currency for the selected period.</p>
            )}
          </div>

          {/* ── Banking + Totals — pushed to bottom ── */}
          <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 print:break-inside-avoid">
            <div className="grid grid-cols-2 gap-8 items-start print:break-inside-avoid">
              {bankingDetails.length > 0 ? (
                <div className="text-xs">
                  <p className="mb-1.5 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Banking Details</p>
                  {bankingDetails.map((bd) => (
                    <div key={bd.id} className="mb-3">
                      {bd.label && <p className="font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{bd.label}</p>}
                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-gray-600 dark:text-gray-400">
                        <span className="text-gray-400 dark:text-gray-500">Bank</span><span>{bd.bank_name}</span>
                        {bd.account_holder && (<><span className="text-gray-400 dark:text-gray-500">Acc. Holder</span><span>{bd.account_holder}</span></>)}
                        <span className="text-gray-400 dark:text-gray-500">Account No.</span><span>{bd.account_number}</span>
                        {bd.account_type && (<><span className="text-gray-400 dark:text-gray-500">Acc. Type</span><span>{ACCOUNT_TYPES.find((t) => t.value === bd.account_type)?.label ?? bd.account_type}</span></>)}
                        {bd.branch_code && (<><span className="text-gray-400 dark:text-gray-500">Branch Code</span><span>{bd.branch_code}</span></>)}
                        {bd.swift_code && (<><span className="text-gray-400 dark:text-gray-500">SWIFT</span><span>{bd.swift_code}</span></>)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div />}

              <div className="text-xs">
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                  <span>Opening Balance</span>
                  <span>{formatCurrency(stmtTotals.openingBalance, stmtCurrency)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                  <span>Total Invoiced</span>
                  <span>{formatCurrency(stmtTotals.totalDebits, stmtCurrency)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                  <span>Total Paid / Credited</span>
                  <span>−{formatCurrency(stmtTotals.totalCredits, stmtCurrency)}</span>
                </div>
                <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-700 dark:border-gray-300 text-sm font-bold text-gray-900 dark:text-gray-100">
                  <span>Balance Due</span>
                  <span>{formatCurrency(stmtTotals.closingBalance, stmtCurrency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="print-doc-footer mt-auto pt-6 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              To view your statements online, please visit{' '}
              <a href={statementPortalUrl} className="text-indigo-500 dark:text-indigo-400 no-underline">
                {statementPortalUrl}
              </a>
            </p>
            <p className="text-xs text-gray-300 dark:text-gray-600">Foro by Bobo Softwares (2026)</p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default CompanyStatementsTab;
