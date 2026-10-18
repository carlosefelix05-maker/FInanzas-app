// Metas de ahorro (funciones puras).
import { differenceInCalendarMonths } from 'date-fns';
import { deISO, diasEntre } from './fechas';
import type { Aportacion, Meta } from './tipos';

export function ahorrado(meta: Meta): number {
  return meta.aportaciones.reduce((s, a) => s + a.monto, 0);
}

export interface PlanMeta {
  ahorrado: number;
  faltante: number;
  porcentaje: number;
  completada: boolean;
  /** Solo si hay fecha objetivo. */
  plan: null | {
    vencida: boolean;
    diasRestantes: number;
    mesesRestantes: number;
    porMes: number;
    porQuincena: number;
    /** Lo que debería llevar hoy con un ritmo constante desde que se creó. */
    esperado: number;
    estado: 'adelantado' | 'en tiempo' | 'atrasado';
    diferencia: number;
  };
}

export function planMeta(meta: Meta, hoy: string): PlanMeta {
  const total = ahorrado(meta);
  const faltante = Math.max(0, meta.montoObjetivo - total);
  const porcentaje = meta.montoObjetivo > 0 ? Math.min(100, Math.floor((total / meta.montoObjetivo) * 100)) : 0;
  const completada = total >= meta.montoObjetivo && meta.montoObjetivo > 0;
  if (!meta.fechaObjetivo) return { ahorrado: total, faltante, porcentaje, completada, plan: null };

  const diasRestantes = diasEntre(hoy, meta.fechaObjetivo);
  const vencida = diasRestantes < 0;
  // Meses que faltan, contando el mes en curso si aún quedan días.
  const mesesRestantes = Math.max(1, differenceInCalendarMonths(deISO(meta.fechaObjetivo), deISO(hoy)) + (diasRestantes > 0 ? 0 : 1));
  const porMes = vencida ? faltante : Math.ceil(faltante / mesesRestantes);
  const porQuincena = vencida ? faltante : Math.ceil(faltante / (mesesRestantes * 2));

  const duracion = Math.max(1, diasEntre(meta.creada, meta.fechaObjetivo));
  const transcurrido = Math.min(duracion, Math.max(0, diasEntre(meta.creada, hoy)));
  const esperado = Math.round((meta.montoObjetivo * transcurrido) / duracion);
  const diferencia = total - esperado;
  const tolerancia = Math.round(meta.montoObjetivo * 0.02);
  const estado = diferencia > tolerancia ? 'adelantado' : diferencia < -tolerancia ? 'atrasado' : 'en tiempo';

  return {
    ahorrado: total,
    faltante,
    porcentaje,
    completada,
    plan: { vencida, diasRestantes, mesesRestantes, porMes, porQuincena, esperado, estado, diferencia },
  };
}

/** Aportaciones de todas las metas (para restarlas de los saldos de cuentas). */
export function todasLasAportaciones(metas: readonly Meta[]): Aportacion[] {
  return metas.flatMap((m) => m.aportaciones);
}
