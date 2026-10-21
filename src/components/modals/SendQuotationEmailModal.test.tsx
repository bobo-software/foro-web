import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Quotation } from '../../types/quotation';
import { SendQuotationEmailModal } from './SendQuotationEmailModal';

const hoisted = vi.hoisted(() => ({
  sendQuotationEmail: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: hoisted.toastError },
}));

vi.mock('../../stores/data/QuotationStore', () => ({
  useQuotationStore: {
    getState: () => ({ sendQuotationEmail: hoisted.sendQuotationEmail }),
  },
}));

vi.mock('../../utils/quotationPdf', () => ({
  quotationPdfFilename: (q: { quotation_number: string }) => `quotation-${q.quotation_number}.pdf`,
}));

const quotation: Quotation = {
  id: 53,
  quotation_number: '0039',
  customer_name: 'Ernest',
  customer_email: 'ernest@example.test',
  issue_date: '2026-10-20',
  status: 'draft',
  subtotal: 32000,
  total: 32000,
  currency: 'ZAR',
};

describe('SendQuotationEmailModal', () => {
  beforeEach(() => {
    hoisted.sendQuotationEmail.mockReset();
    hoisted.toastError.mockReset();
  });

  it('prefills the customer email and sends with the message', async () => {
    const user = userEvent.setup();
    const onSent = vi.fn();
    hoisted.sendQuotationEmail.mockResolvedValue({
      to: 'ernest@example.test',
      quotation: { ...quotation, status: 'sent' },
    });
    render(<SendQuotationEmailModal quotation={quotation} lines={[]} isOpen onClose={() => {}} onSent={onSent} />);

    expect(screen.getByLabelText(/^to/i)).toHaveValue('ernest@example.test');
    expect(screen.getByText('quotation-0039.pdf')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/optional note/i), 'Deposit is 40%');
    await user.click(screen.getByRole('button', { name: 'Send email' }));

    expect(hoisted.sendQuotationEmail).toHaveBeenCalledWith({
      quotation,
      lines: [],
      to: 'ernest@example.test',
      message: 'Deposit is 40%',
    });
    expect(onSent).toHaveBeenCalledWith({ ...quotation, status: 'sent' });
  });

  it('rejects an invalid address without sending', async () => {
    const user = userEvent.setup();
    render(<SendQuotationEmailModal quotation={quotation} lines={[]} isOpen onClose={() => {}} onSent={() => {}} />);

    await user.clear(screen.getByLabelText(/^to/i));
    await user.type(screen.getByLabelText(/^to/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send email' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(hoisted.sendQuotationEmail).not.toHaveBeenCalled();
  });

  it('shows the API error and stays open', async () => {
    const user = userEvent.setup();
    const onSent = vi.fn();
    hoisted.sendQuotationEmail.mockRejectedValue(new Error('Unable to send email right now.'));
    render(<SendQuotationEmailModal quotation={quotation} lines={[]} isOpen onClose={() => {}} onSent={onSent} />);

    await user.click(screen.getByRole('button', { name: 'Send email' }));

    expect(hoisted.toastError).toHaveBeenCalledWith('Unable to send email right now.');
    expect(onSent).not.toHaveBeenCalled();
  });
});
