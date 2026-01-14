import { apiGet } from './http';

export type DeliveryWindow = {
  id: string;
  date: string;      // ISO
  startTime: string; // "09:00"
  endTime: string;   // "11:00"
  capacity: number;
};

export function getDeliveryWindows() {
  return apiGet<DeliveryWindow[]>('/delivery/windows');
}
