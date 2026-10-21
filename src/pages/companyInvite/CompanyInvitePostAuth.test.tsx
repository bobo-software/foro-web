import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CompanyInvitePostAuth } from './CompanyInvitePostAuth';
import { acceptedLandingPath } from './companyInviteShared';

const hoisted = vi.hoisted(() => ({
  preview: vi.fn(),
  acceptSignedIn: vi.fn(),
  setCurrentBusinessById: vi.fn(),
  fetchUserBusinesses: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/usePortalNoIndex', () => ({ usePortalNoIndex: () => {} }));
vi.mock('@/components/elements/ThemeToggleButton', () => ({ ThemeToggleButton: () => null }));

vi.mock('@/stores/data/AuthStore', () => {
  const state = {
    sessionUser: { id: '24', email: 'ernest@example.test', accessToken: 'token' },
    logout: vi.fn(),
  };
  return { default: (selector: (s: typeof state) => unknown) => selector(state) };
});

vi.mock('@/stores/data/BusinessStore', () => {
  const state = {
    fetchUserBusinesses: hoisted.fetchUserBusinesses,
    setCurrentBusinessById: hoisted.setCurrentBusinessById,
    activeBusinessId: 83,
  };
  const useBusinessStore = (selector: (s: typeof state) => unknown) => selector(state);
  useBusinessStore.getState = () => state;
  return { useBusinessStore };
});

vi.mock('@/services/companyInviteService', () => ({
  default: { preview: hoisted.preview, acceptSignedIn: hoisted.acceptSignedIn },
  inviteErrorCode: () => undefined,
}));

const PREVIEW = {
  valid: true,
  reason: null,
  status: 'pending',
  email: 'ernest@example.test',
  company_type: 'customer',
  expires_at: '2026-11-03 10:00:00',
  business_name: 'bobo software',
  business_logo_url: null,
  has_account: true,
  has_password: true,
  has_business: true,
  can_set_password: false,
  document: { type: 'quotation', id: 53, number: '0039' },
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/company-invite/:token/accept" element={<CompanyInvitePostAuth />} />
        <Route path="/app/companies/:id/received/:kind/:docId" element={<p>received document page</p>} />
        <Route path="/app/documents/received" element={<p>received documents tab</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CompanyInvitePostAuth', () => {
  beforeEach(() => {
    hoisted.preview.mockReset();
    hoisted.acceptSignedIn.mockReset();
    hoisted.setCurrentBusinessById.mockReset();
  });

  it('lands on the emailed quotation after linking', async () => {
    hoisted.preview.mockResolvedValue(PREVIEW);
    hoisted.acceptSignedIn.mockResolvedValue({
      business_id: 83,
      linked_company_id: 85,
      document: { type: 'quotation', id: 53 },
    });

    renderAt('/company-invite/tok/accept');

    expect(await screen.findByText('received document page')).toBeInTheDocument();
    expect(hoisted.setCurrentBusinessById).toHaveBeenCalledWith(83);
  });

  it('sends an already-used document link to the received documents tab', async () => {
    hoisted.preview.mockResolvedValue({ ...PREVIEW, valid: false, reason: 'accepted', status: 'accepted' });

    renderAt('/company-invite/tok/accept');

    expect(await screen.findByText('received documents tab')).toBeInTheDocument();
    expect(hoisted.acceptSignedIn).not.toHaveBeenCalled();
  });
});

describe('acceptedLandingPath', () => {
  it('points at the received document, or the company without one', () => {
    expect(acceptedLandingPath({ linked_company_id: 85, document: { type: 'quotation', id: 53 } })).toBe(
      '/app/companies/85/received/quotations/53',
    );
    expect(acceptedLandingPath({ linked_company_id: 85, document: { type: 'invoice', id: 9 } })).toBe(
      '/app/companies/85/received/invoices/9',
    );
    expect(acceptedLandingPath({ linked_company_id: 85, document: { type: 'signing', id: 12 } })).toBe(
      '/app/companies/85/received/signing-documents/12',
    );
    expect(acceptedLandingPath({ linked_company_id: 85, document: null })).toBe('/app/companies/85');
  });
});
