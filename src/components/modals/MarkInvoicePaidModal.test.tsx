import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Invoice } from '../../types/invoice';
import { MarkInvoicePaidModal } from './MarkInvoicePaidModal';

const hoisted = vi.hoisted(() => ({
  markInvoicePaid: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../stores/data/InvoiceStore', () => ({
  useInvoiceStore: {
    getState: () => ({ markInvoicePaid: hoisted.markInvoicePaid }),
  },
}));

const invoice: Invoice = {
  id: 12,
  invoice_number: 'INV-12',
  customer_name: 'Acme',
  issue_date: '2026-10-01',
  due_date: '2026-10-31',
  status: 'sent',
  subtotal: 250,
  total: 250,
  currency: 'ZAR',
};

describe('MarkInvoicePaidModal', () => {
  beforeEach(() => {
    hoisted.markInvoicePaid.mockReset();
  });

  it('requires an amount and a payment date before saving', async () => {
    const user = userEvent.setup();
    render(<MarkInvoicePaidModal invoice={invoice} isOpen onClose={() => {}} onPaid={() => {}} />);

    await user.clear(screen.getByLabelText(/amount/i));
    await user.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(await screen.findByText('Amount is required')).toBeInTheDocument();
    expect(hoisted.markInvoicePaid).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/amount/i), '250');
    await user.clear(screen.getByLabelText(/^date/i));
    await user.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(await screen.findByText('Payment date must be a valid date')).toBeInTheDocument();
    expect(hoisted.markInvoicePaid).not.toHaveBeenCalled();
  });
});
