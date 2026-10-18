// Calendario de movimientos recurrentes (funciones puras).
import { addDays, addMonths, addYears, lastDayOfMonth } from 'date-fns';
import { aISO, deISO, sumarDias } from './fechas';
import type { Frecuencia, Recurrente } from './tipos';

export const NOMBRE_FRECUENCIA: Record<Frecuencia, string> = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  anual: 'Anual',
  dias: 'Cada N días',
};

function diaEnMes(anio: number, mes: number, dia: number): Date {
  const ultimo = lastDayOfMonth(new Date(anio, mes, 1)).getDate();
  return new Date(anio, mes, Math.min(dia, ultimo));
}

/**
 * Fecha de la ocurrencia número `n` (0 = inicio).
 * - mensual/anual: conserva el día del inicio; si el mes es más corto usa su último día (31 → 30 → 28 → 31).
 * - quincenal: días X y X+15 de cada mes (15 → 15 y 30; en febrero, 15 y 28).
 */
export function ocurrencia(inicio: string, frecuencia: Frecuencia, n: number, cadaNDias = 1): string {
  const d = deISO(inicio);
  switch (frecuencia) {
    case 'semanal':
      return aISO(addDays(d, 7 * n));
    case 'dias':
      return aISO(addDays(d, Math.max(1, cadaNDias) * n));
    case 'mensual': {
      const m = addMonths(new Date(d.getFullYear(), d.getMonth(), 1), n);
      return aISO(diaEnMes(m.getFullYear(), m.getMonth(), d.getDate()));
    }
    case 'anual': {
      const a = addYears(new Date(d.getFullYear(), d.getMonth(), 1), n);
      return aISO(diaEnMes(a.getFullYear(), a.getMonth(), d.getDate()));
    }
    case 'quincenal': {
      const dia = d.getDate();
      const segunda = dia > 15; // el inicio cae en la segunda quincena
      const base = segunda ? dia - 15 : dia;
      const k = n + (segunda ? 1 : 0);
      const m = addMonths(new Date(d.getFullYear(), d.getMonth(), 1), Math.floor(k / 2));
      const diaObjetivo = k % 2 === 0 ? base : base + 15;
      return aISO(diaEnMes(m.getFullYear(), m.getMonth(), diaObjetivo));
    }
  }
}

/** Fechas vencidas (≤ hoy) aún no generadas. Limita la cantidad para evitar avalanchas. */
export function fechasVencidas(r: Recurrente, hoy: string, maximo = 60): string[] {
  const out: string[] = [];
  let n = r.generadas;
  while (out.length < maximo) {
    const f = ocurrencia(r.inicio, r.frecuencia, n, r.cadaNDias);
    if (f > hoy) break;
    out.push(f);
    n++;
  }
  return out;
}

/** Ocurrencias futuras dentro de (hoy, hoy + dias]. */
export function proximasOcurrencias(r: Recurrente, hoy: string, dias = 30): string[] {
  if (!r.activo) return [];
  const limite = sumarDias(hoy, dias);
  const out: string[] = [];
  for (let n = r.generadas; out.length < 100; n++) {
    const f = ocurrencia(r.inicio, r.frecuencia, n, r.cadaNDias);
    if (f > limite) break;
    if (f > hoy) out.push(f);
  }
  return out;
}

export function describirFrecuencia(r: Pick<Recurrente, 'frecuencia' | 'cadaNDias'>): string {
  return r.frecuencia === 'dias' ? `Cada ${r.cadaNDias ?? 1} días` : NOMBRE_FRECUENCIA[r.frecuencia];
}
