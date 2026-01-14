export type ReceiptItem = {
  productId: string;
  name: string;
  qty: number;
  unitCents: number;
  lineCents: number;
};

export type Receipt = {
  orderId: string;
  status: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  items: ReceiptItem[];
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  qrString: string;
  payment?: {
    id: string;
    provider: string;
    status: string;
    amountCents: number;
    currency: string;
    externalRef?: string | null;
  } | null;
};
