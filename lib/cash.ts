// lib/cash.ts
// Cálculos de caja. Regla: el anticipo forma parte del precio del servicio.
import type { Appointment, PaymentMethod } from '../context/AppointmentsContext';

export const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: 'cash-outline' | 'swap-horizontal-outline' | 'card-outline' }[] = [
  { key: 'efectivo', label: 'Efectivo', icon: 'cash-outline' },
  { key: 'transferencia', label: 'Transferencia', icon: 'swap-horizontal-outline' },
  { key: 'tarjeta', label: 'Tarjeta', icon: 'card-outline' },
];

/** Lo que falta por cobrar de una cita */
export const remainingOf = (a: Appointment) =>
  a.paid ? 0 : Math.max(0, (a.price ?? 0) - (a.deposit ?? 0));

/** Total cobrado de una cita pagada (servicio + propina) */
export const collectedOf = (a: Appointment) => (a.paid ? (a.price ?? 0) + (a.tip ?? 0) : 0);

export type CashSummary = {
  collected: number; // cobrado (pagadas): servicio + propina
  tips: number;
  byMethod: Record<string, number>; // efectivo / transferencia / tarjeta / sin_metodo
  paidCount: number;
  pendingAmount: number; // realizadas sin pagar
  pendingList: Appointment[];
  deposits: number; // anticipos recibidos de citas aún no pagadas
  paidList: Appointment[];
};

export function summarize(list: Appointment[]): CashSummary {
  const s: CashSummary = {
    collected: 0,
    tips: 0,
    byMethod: { efectivo: 0, transferencia: 0, tarjeta: 0, sin_metodo: 0 },
    paidCount: 0,
    pendingAmount: 0,
    pendingList: [],
    deposits: 0,
    paidList: [],
  };
  for (const a of list) {
    if (a.paid) {
      const amt = collectedOf(a);
      s.collected += amt;
      s.tips += a.tip ?? 0;
      s.byMethod[a.paymentMethod ?? 'sin_metodo'] += amt;
      s.paidCount++;
      s.paidList.push(a);
    } else {
      if (a.status === 'realizada' && remainingOf(a) > 0) {
        s.pendingAmount += remainingOf(a);
        s.pendingList.push(a);
      }
      if (a.status !== 'cancelada') s.deposits += a.deposit ?? 0;
    }
  }
  return s;
}
