// lib/reminders.ts
// Recuerda (en el teléfono) a quién ya se le mandó recordatorio, para marcarlo como enviado.
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Appointment } from '../context/AppointmentsContext';
import { daysBetween, todayKey } from './dates';

const KEY = 'agenda_eventia_sent_reminders_v1';

export function useSentReminders() {
  const [sent, setSent] = useState<Record<string, string>>({});

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(v => v && setSent(JSON.parse(v)))
      .catch(() => {});
  }, []);

  const markSent = useCallback((id: string) => {
    setSent(prev => {
      const next = { ...prev, [id]: new Date().toISOString() };
      // limpiar registros de más de 60 días
      const cutoff = Date.now() - 60 * 86400000;
      for (const k of Object.keys(next)) {
        if (new Date(next[k]).getTime() < cutoff) delete next[k];
      }
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { sent, markSent };
}

export const clientKeyOf = (a: { clientName?: string; phone?: string | null }) => {
  const n = (a.clientName || '').trim().toLowerCase();
  const p = (a.phone || '').replace(/\D/g, '');
  return p ? `${n}::${p}` : n;
};

export type RetouchSuggestion = {
  key: string;
  clientName: string;
  phone?: string;
  lastService: string;
  lastDate: string;
  daysSince: number;
};

/**
 * Clientas a las que ya les toca retoque:
 * su último servicio REALIZADO fue hace >= (retouchDays - 3) días (máx. 60),
 * y no tienen otra cita pendiente a futuro.
 */
export function getRetouchSuggestions(appointments: Appointment[], retouchDays: number): RetouchSuggestion[] {
  const today = todayKey();
  const lastDone = new Map<string, Appointment>();
  const hasUpcoming = new Set<string>();

  for (const a of appointments) {
    const k = clientKeyOf(a);
    if (!k) continue;
    if (a.status === 'pendiente' && a.date >= today) hasUpcoming.add(k);
    if (a.status === 'realizada') {
      const prev = lastDone.get(k);
      if (!prev || a.date > prev.date) lastDone.set(k, a);
    }
  }

  const out: RetouchSuggestion[] = [];
  for (const [k, a] of lastDone) {
    if (hasUpcoming.has(k)) continue;
    const since = daysBetween(a.date, today);
    if (since >= Math.max(1, retouchDays - 3) && since <= 60) {
      out.push({
        key: k,
        clientName: a.clientName,
        phone: a.phone,
        lastService: a.service,
        lastDate: a.date,
        daysSince: since,
      });
    }
  }
  return out.sort((x, y) => y.daysSince - x.daysSince);
}
