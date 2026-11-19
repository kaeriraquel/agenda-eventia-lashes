// lib/whatsapp.ts
// Abre WhatsApp con un mensaje ya escrito para la clienta.
import { Alert, Linking } from 'react-native';
import { formatLongDate, formatTime12 } from './dates';

/** Normaliza un teléfono mexicano para wa.me (52 + 10 dígitos). */
export function toWhatsAppNumber(phone?: string | null): string | null {
  let d = (phone || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 10) d = '52' + d; // número local de México
  if (d.length === 13 && d.startsWith('521')) d = '52' + d.slice(3); // formato viejo con 1
  return d.length >= 11 ? d : null;
}

/** Reemplaza {variables} de la plantilla. */
export function fillTemplate(
  template: string,
  vars: { nombre?: string; fecha?: string; hora?: string; servicio?: string; negocio?: string; dias?: number }
) {
  const firstName = (vars.nombre || '').trim().split(/\s+/)[0] || '';
  return template
    .replace(/\{nombre\}/g, firstName)
    .replace(/\{fecha\}/g, vars.fecha ? formatLongDate(vars.fecha) : '')
    .replace(/\{hora\}/g, vars.hora ? formatTime12(vars.hora) : '')
    .replace(/\{servicio\}/g, (vars.servicio || '').toLowerCase())
    .replace(/\{negocio\}/g, vars.negocio || '')
    .replace(/\{dias\}/g, vars.dias != null ? String(vars.dias) : '');
}

/** Abre WhatsApp con el texto. Devuelve false si no hay teléfono válido. */
export async function openWhatsApp(phone: string | null | undefined, text: string): Promise<boolean> {
  const num = toWhatsAppNumber(phone);
  if (!num) {
    Alert.alert('Sin teléfono', 'Esta clienta no tiene un número válido de 10 dígitos.');
    return false;
  }
  const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('No se pudo abrir WhatsApp', 'Revisa que WhatsApp esté instalado.');
    return false;
  }
}
