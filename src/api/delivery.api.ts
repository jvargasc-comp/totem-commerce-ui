import { apiGet } from './http';

export type DeliveryWindow = {
  id: string;
  date: string; // ISO o YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  feeCents?: number;
};

export type DeliveryWindowsParams = {
  storeId: string;
  date: string; // YYYY-MM-DD
  city?: string;
  zone?: string;
  postalCode?: string;
};

/**
 * Mientras el backend tenga ValidationPipe con forbidNonWhitelisted=true
 * y el DTO de query NO incluya city/zone/postalCode, hay que NO enviarlos.
 *
 * Cuando ya los soportes en el backend, cambia a true.
 */
const BACKEND_SUPPORTS_LOCATION_FILTERS = false;

function buildQuery(params: DeliveryWindowsParams): string {
  const qs = new URLSearchParams();

  qs.set('storeId', params.storeId);
  qs.set('date', params.date);

  if (BACKEND_SUPPORTS_LOCATION_FILTERS) {
    const city = params.city?.trim();
    const zone = params.zone?.trim();
    const postalCode = params.postalCode?.trim();

    if (city) qs.set('city', city);
    if (zone) qs.set('zone', zone);
    if (postalCode) qs.set('postalCode', postalCode);
  }

  return qs.toString();
}

export function getDeliveryWindows(params: DeliveryWindowsParams) {
  const q = buildQuery(params);
  return apiGet<DeliveryWindow[]>(`/delivery/windows?${q}`);
}
