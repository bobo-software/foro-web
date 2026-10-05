import type { Supplier, SupplierItem } from '@/types/supplier';
import type { PurchaseOrder, Bill } from '@/types/purchase';

export interface SupplierTabProps {
  supplier: Supplier;
  items: SupplierItem[];
  purchaseOrders: PurchaseOrder[];
  bills: Bill[];
  loading: boolean;
  onSupplierUpdate?: (supplier: Supplier) => void;
  onItemsChange?: () => void;
}
