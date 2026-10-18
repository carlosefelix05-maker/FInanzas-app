// Tarjetas de crédito y meses sin intereses (funciones puras).
import { addMonths, lastDayOfMonth } from 'date-fns';
import { aISO, deISO, diasEntre, sumarDias } from './fechas';
import type { Movimiento, Msi, Tarjeta } from './tipos';

/** Fecha con ese día en el mes de `ref` desplazado `meses`, ajustando a fin de mes (31 → 30/28). */
export function fechaConDia(ref: string, dia: number, meses = 0): string {
  const d = deISO(ref);
  const m = addMonths(new Date(d.getFullYear(), d.getMonth(), 1), meses);
  const ultimo = lastDayOfMonth(m).getDate();
  return aISO(new Date(m.getFullYear(), m.getMonth(), Math.min(dia, ultimo)));
}

/** Último corte en o antes de hoy. */
export function ultimoCorte(diaCorte: number, hoy: string): string {
  const esteMes = fechaConDia(hoy, diaCorte);
  return esteMes <= hoy ? esteMes : fechaConDia(hoy, diaCorte, -1);
}

/** Próximo corte estrictamente después de hoy. */
export function proximoCorte(diaCorte: number, hoy: string): string {
  const esteMes = fechaConDia(hoy, diaCorte);
  return esteMes > hoy ? esteMes : fechaConDia(hoy, diaCorte, 1);
}

/** Fecha límite de pago correspondiente a un corte: el siguiente día `diaLimitePago` después del corte. */
export function limitePagoDeCorte(corte: string, diaLimitePago: number): string {
  const mismoMes = fechaConDia(corte, diaLimitePago);
  return mismoMes > corte ? mismoMes : fechaConDia(corte, diaLimitePago, 1);
}

/** Monto de la cuota `i` (0-based). El residuo de centavos se carga en la última. */
export function montoCuota(total: number, meses: number, i: number): number {
  const base = Math.floor(total / meses);
  return i === meses - 1 ? total - base * (meses - 1) : base;
}

export function fechaCuota(msi: Msi, i: number): string {
  return fechaConDia(msi.fechaPrimeraCuota, deISO(msi.fechaPrimeraCuota).getDate(), i);
}

/** Cuotas que ya vencieron (≤ hoy) y aún no se han cargado. */
export function cuotasPorCargar(msi: Msi, hoy: string): { indice: number; fecha: string; monto: number }[] {
  const out = [];
  for (let i = msi.cuotasPagadas; i < msi.meses; i++) {
    const fecha = fechaCuota(msi, i);
    if (fecha > hoy) break;
    out.push({ indice: i, fecha, monto: montoCuota(msi.montoTotal, msi.meses, i) });
  }
  return out;
}

export interface ResumenMsi {
  cuota: number;
  restantes: number;
  pendiente: number;
  proximaFecha: string | null;
}

export function resumenMsi(msi: Msi): ResumenMsi {
  let pendiente = 0;
  for (let i = msi.cuotasPagadas; i < msi.meses; i++) pendiente += montoCuota(msi.montoTotal, msi.meses, i);
  return {
    cuota: montoCuota(msi.montoTotal, msi.meses, 0),
    restantes: msi.meses - msi.cuotasPagadas,
    pendiente,
    proximaFecha: msi.cuotasPagadas < msi.meses ? fechaCuota(msi, msi.cuotasPagadas) : null,
  };
}

/** Efecto de un movimiento sobre el saldo de la tarjeta (negativo = más deuda). */
function efecto(m: Movimiento, cuentaId: number): number {
  let e = 0;
  if (m.cuentaId === cuentaId) e += m.tipo === 'ingreso' ? m.monto : -m.monto;
  if (m.tipo === 'transferencia' && m.cuentaDestinoId === cuentaId) e += m.monto;
  return e;
}

export interface EstadoTarjeta {
  deuda: number;
  pendienteMsi: number;
  usado: number;
  disponible: number;
  porcentajeUso: number;
  ultimoCorte: string;
  proximoCorte: string;
  diasAlCorte: number;
  /** Fecha límite del pago vigente. */
  fechaLimitePago: string;
  diasAlLimite: number;
  /** Gastos cargados desde el último corte. */
  montoPeriodo: number;
  /** Saldo al corte menos pagos posteriores: lo que hay que pagar para no generar intereses. */
  pagoSinIntereses: number;
  /** Faltan ≤ 5 días para la fecha límite y hay pago pendiente. */
  pagoProximo: boolean;
}

export function estadoTarjeta(
  tarjeta: Tarjeta,
  saldoInicial: number,
  movs: readonly Movimiento[],
  msis: readonly Msi[],
  hoy: string,
): EstadoTarjeta {
  const id = tarjeta.cuentaId;
  const corte = ultimoCorte(tarjeta.diaCorte, hoy);
  const siguiente = proximoCorte(tarjeta.diaCorte, hoy);

  let saldo = saldoInicial;
  let saldoAlCorte = saldoInicial;
  let pagosDespues = 0;
  let montoPeriodo = 0;
  for (const m of movs) {
    const e = efecto(m, id);
    if (!e || m.fecha > hoy) continue;
    saldo += e;
    if (m.fecha <= corte) saldoAlCorte += e;
    else if (e > 0) pagosDespues += e;
    else if (m.tipo === 'gasto') montoPeriodo += m.monto;
  }

  const deuda = Math.max(0, -saldo);
  const pendienteMsi = msis.filter((x) => x.tarjetaId === id).reduce((s, x) => s + resumenMsi(x).pendiente, 0);
  const usado = deuda + pendienteMsi;
  const pagoSinIntereses = Math.max(0, -saldoAlCorte - pagosDespues);

  // Si ya pasó la fecha límite del último corte, mostramos la del próximo.
  let fechaLimitePago = limitePagoDeCorte(corte, tarjeta.diaLimitePago);
  if (fechaLimitePago < hoy) fechaLimitePago = limitePagoDeCorte(siguiente, tarjeta.diaLimitePago);
  const diasAlLimite = diasEntre(hoy, fechaLimitePago);

  return {
    deuda,
    pendienteMsi,
    usado,
    disponible: tarjeta.limite - usado,
    porcentajeUso: tarjeta.limite > 0 ? Math.round((usado / tarjeta.limite) * 100) : 0,
    ultimoCorte: corte,
    proximoCorte: siguiente,
    diasAlCorte: diasEntre(hoy, siguiente),
    fechaLimitePago,
    diasAlLimite,
    montoPeriodo,
    pagoSinIntereses,
    pagoProximo: diasAlLimite <= 5 && pagoSinIntereses > 0,
  };
}

/** Periodo actual (entre cortes) como rango. */
export function periodoActual(diaCorte: number, hoy: string) {
  return { inicio: sumarDias(ultimoCorte(diaCorte, hoy), 1), fin: proximoCorte(diaCorte, hoy) };
}
