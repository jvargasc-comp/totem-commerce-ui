import { apiPost } from './http';

export function createPaymentIntent(orderId: string) {
  return apiPost<{ orderId: string; payment: { id: string; status: string } }>(
    '/payments/intent',
    { orderId, provider: 'SIMULATED' },
  );
}

export function confirmPayment(paymentId: string) {
  return apiPost<{ payment: { id: string; status: string }; order: { id: string } }>('/payments/confirm', { paymentId });
}
