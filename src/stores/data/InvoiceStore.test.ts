import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateInvoiceDto, Invoice, InvoiceItem } from '../../types/invoice';

const hoisted = vi.hoisted(() => ({
  createFull: vi.fn(),
  update: vi.fn(),
  cancel: vi.fn(),
  insertMany: vi.fn(),
  deleteByInvoiceId: vi.fn(),
}));

vi.mock('../../services/invoiceService', () => ({
  default: {
    createFull: hoisted.createFull,
    update: hoisted.update,
    cancel: hoisted.cancel,
  },
}));

vi.mock('../../services/invoiceItemService', () => ({
  default: {
    insertMany: hoisted.insertMany,
    deleteByInvoiceId: hoisted.deleteByInvoiceId,
  },
}));

vi.mock('./BusinessStore', () => ({
  useBusinessStore: {
    getState: () => ({ currentBusiness: { id: 7 } }),
  },
}));

import { useInvoiceStore } from './InvoiceStore';

const header: CreateInvoiceDto = {
  business_id: 7,
  invoice_number: '0031',
  customer_name: 'Micropower Modulek',
  issue_date: '2026-10-21',
  due_date: '2026-10-21',
  status: 'draft',
  subtotal: 16000,
  total: 16000,
};

const lines: (Omit<InvoiceItem, 'id' | 'invoice_id'> & { item_id?: number })[] = [
  {
    item_id: 93,
    sku: '06CU201',
    description: 'CU201C',
    quantity: 10,
    unit_price: 3200,
    unit_type: 'qty',
    discount_percent: 50,
    total: 16000,
  },
];

describe('InvoiceStore.createInvoiceWithLines', () => {
  beforeEach(() => {
    hoisted.createFull.mockReset().mockResolvedValue({ id: 42 });
    hoisted.update.mockReset().mockResolvedValue({ rowCount: 1 });
    hoisted.cancel.mockReset();
    hoisted.insertMany.mockReset();
    hoisted.deleteByInvoiceId.mockReset();
  });

  it('creates the header and lines with one atomic API call', async () => {
    const id = await useInvoiceStore.getState().createInvoiceWithLines(header, lines);

    expect(id).toBe(42);
    expect(hoisted.createFull).toHaveBeenCalledTimes(1);
    expect(hoisted.createFull).toHaveBeenCalledWith(header, lines);
    expect(hoisted.insertMany).not.toHaveBeenCalled();
  });

  it('surfaces a create without an id instead of writing orphan lines', async () => {
    hoisted.createFull.mockResolvedValue({});

    await expect(useInvoiceStore.getState().createInvoiceWithLines(header, lines)).rejects.toThrow(
      'Invoice was created but no id was returned',
    );
    expect(hoisted.createFull).toHaveBeenCalledTimes(1);
    expect(hoisted.insertMany).not.toHaveBeenCalled();
  });

  it('never sends status with a normal form save', async () => {
    await useInvoiceStore.getState().saveInvoiceWithLines(42, { ...header, status: 'sent' }, lines);

    expect(hoisted.update).toHaveBeenCalledWith(42, expect.not.objectContaining({ status: 'sent' }));
  });

  it('replaces the cached row after cancelling', async () => {
    const row = { ...header, id: 42, status: 'draft' as const } as unknown as Invoice;
    hoisted.cancel.mockResolvedValue({ ...row, status: 'cancelled' });
    useInvoiceStore.setState({ invoices: [row] });

    const updated = await useInvoiceStore.getState().cancelInvoice(42);

    expect(updated.status).toBe('cancelled');
    expect(useInvoiceStore.getState().invoices[0].status).toBe('cancelled');
  });
});
