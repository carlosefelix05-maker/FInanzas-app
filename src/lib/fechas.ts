// Fechas locales 'YYYY-MM-DD'. Nunca usamos UTC para evitar corrimientos de día.
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  differenceInCalendarDays,
} from 'date-fns';
import { es } from 'date-fns/locale';

export type TipoPeriodo = 'dia' | 'semana' | 'mes' | 'anio';

const OPC_SEMANA = { weekStartsOn: 1 as const };

export function aISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function deISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function hoyISO(ahora: Date = new Date()): string {
  return aISO(ahora);
}

export function sumarDias(iso: string, n: number): string {
  return aISO(addDays(deISO(iso), n));
}

export function diasEntre(desde: string, hasta: string): number {
  return differenceInCalendarDays(deISO(hasta), deISO(desde));
}

export interface Rango {
  inicio: string;
  fin: string;
}

export function rangoPeriodo(tipo: TipoPeriodo, ref: string): Rango {
  const d = deISO(ref);
  switch (tipo) {
    case 'dia':
      return { inicio: ref, fin: ref };
    case 'semana':
      return { inicio: aISO(startOfWeek(d, OPC_SEMANA)), fin: aISO(endOfWeek(d, OPC_SEMANA)) };
    case 'mes':
      return { inicio: aISO(startOfMonth(d)), fin: aISO(endOfMonth(d)) };
    case 'anio':
      return { inicio: aISO(startOfYear(d)), fin: aISO(endOfYear(d)) };
  }
}

export function desplazarPeriodo(tipo: TipoPeriodo, ref: string, n: number): string {
  const d = deISO(ref);
  switch (tipo) {
    case 'dia':
      return aISO(addDays(d, n));
    case 'semana':
      return aISO(addWeeks(d, n));
    case 'mes':
      return aISO(addMonths(d, n));
    case 'anio':
      return aISO(addYears(d, n));
  }
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function etiquetaPeriodo(tipo: TipoPeriodo, ref: string): string {
  const { inicio, fin } = rangoPeriodo(tipo, ref);
  const di = deISO(inicio);
  const df = deISO(fin);
  switch (tipo) {
    case 'dia':
      return capitalizar(format(di, "EEEE d 'de' MMMM yyyy", { locale: es }));
    case 'semana':
      if (di.getMonth() === df.getMonth()) {
        return `${format(di, 'd', { locale: es })}–${format(df, "d 'de' MMMM", { locale: es })}`;
      }
      return `${format(di, 'd MMM', { locale: es })} – ${format(df, 'd MMM yyyy', { locale: es })}`;
    case 'mes':
      return capitalizar(format(di, 'MMMM yyyy', { locale: es }));
    case 'anio':
      return format(di, 'yyyy');
  }
}

/** Encabezado de día para listas: "Hoy", "Ayer" o "Lunes 13 de octubre". */
export function etiquetaDia(iso: string, hoy: string = hoyISO()): string {
  const dif = diasEntre(iso, hoy);
  if (dif === 0) return 'Hoy';
  if (dif === 1) return 'Ayer';
  const d = deISO(iso);
  const mismoAnio = iso.slice(0, 4) === hoy.slice(0, 4);
  return capitalizar(format(d, mismoAnio ? "EEEE d 'de' MMMM" : "EEEE d 'de' MMMM yyyy", { locale: es }));
}

/** Etiqueta corta para el chip de fecha: "Hoy", "Ayer", "13 oct". */
export function etiquetaFechaCorta(iso: string, hoy: string = hoyISO()): string {
  const dif = diasEntre(iso, hoy);
  if (dif === 0) return 'Hoy';
  if (dif === 1) return 'Ayer';
  const mismoAnio = iso.slice(0, 4) === hoy.slice(0, 4);
  return format(deISO(iso), mismoAnio ? 'd MMM' : 'd MMM yy', { locale: es });
}

export function nombreMes(iso: string): string {
  return format(deISO(iso), 'MMMM', { locale: es });
}
