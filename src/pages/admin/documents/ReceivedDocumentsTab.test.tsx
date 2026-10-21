import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReceivedDocumentsTab } from './ReceivedDocumentsTab';

const hoisted = vi.hoisted(() => ({
  fetchAll: vi.fn(),
}));

vi.mock('@/stores/data/BusinessStore', () => ({
  useBusinessStore: (selector: (s: { currentBusiness: { id: number } }) => unknown) =>
    selector({ currentBusiness: { id: 83 } }),
}));

vi.mock('@/stores/data/ReceivedDocumentsStore', () => {
  const state = {
    documents: [
      {
        kind: 'signing',
        id: 12,
        number: '',
        title: 'Service agreement',
        issueDate: '2026-10-20',
        dueDate: null,
        status: 'signed',
        total: '0',
        currency: 'ZAR',
        companyId: 85,
        senderName: 'Bobo Software',
      },
      {
        kind: 'invoice',
        id: 9,
        number: 'INV-9',
        issueDate: '2026-10-19',
        dueDate: '2026-11-19',
        status: 'sent',
        total: '1500',
        currency: 'ZAR',
        companyId: 85,
        senderName: 'Bobo Software',
      },
    ],
    loading: false,
    error: null,
    fetchAll: hoisted.fetchAll,
  };
  return {
    useReceivedDocumentsStore: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

function renderTab() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ReceivedDocumentsTab />} />
        <Route
          path="/app/companies/:id/received/:kind/:docId"
          element={<p>received document page</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hoisted.fetchAll.mockReset();
});

describe('ReceivedDocumentsTab', () => {
  it('shows signed documents by title with no amount, and opens the received view', () => {
    renderTab();

    expect(hoisted.fetchAll).toHaveBeenCalledWith(undefined);
    expect(screen.getByText('Service agreement')).toBeInTheDocument();

    const row = screen.getByText('Service agreement').closest('tr')!;
    // Type and status both read "Signed".
    expect(within(row).getAllByText('Signed')).toHaveLength(2);
    // Signing documents have neither a due date nor a total.
    expect(within(row).getAllByText('—')).toHaveLength(2);

    fireEvent.click(row);
    expect(screen.getByText('received document page')).toBeInTheDocument();
  });

  it('filters to signing documents', () => {
    renderTab();

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'signing' } });
    expect(hoisted.fetchAll).toHaveBeenLastCalledWith('signing');
  });
});
