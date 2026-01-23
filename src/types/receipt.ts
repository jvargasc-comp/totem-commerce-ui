export type ReceiptItem = {
  productId: string;
  name: string;
  qty: number;
  unitCents: number;
  lineCents: number;
};

export type ReceiptPayment = {
  id: string;
  provider: string;
  status: string;
  amountCents: number;
  currency: string;
  externalRef?: string | null;
};

export type ReceiptAddress = {
  line1: string;
  reference?: string;
  city: string;
  zone?: string;
  lat?: number;
  lng?: number;
};

export type ReceiptDelivery = {
  windowId: string;
  date: string;      // ISO string (DateTime en Prisma)
  startTime: string; // "09:00"
  endTime: string;   // "11:00"
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

  // ✅ nuevos (opcionales porque pickup no los tendrá)
  address?: ReceiptAddress | null;
  delivery?: ReceiptDelivery | null;

  qrString: string;

  payment?: ReceiptPayment | null;
};
