// Cálculos puros sobre movimientos.
import type { Categoria, Cuenta, Movimiento, TipoCategoria } from './tipos';

export interface Totales {
  ingresos: number;
  gastos: number;
  balance: number;
}

/** Totales de ingresos y gastos. Las transferencias no cuentan. */
export function calcularTotales(movs: readonly Movimiento[]): Totales {
  let ingresos = 0;
  let gastos = 0;
  for (const m of movs) {
    if (m.tipo === 'ingreso') ingresos += m.monto;
    else if (m.tipo === 'gasto') gastos += m.monto;
  }
  return { ingresos, gastos, balance: ingresos - gastos };
}

/**
 * Saldo actual por cuenta: saldoInicial + ingresos − gastos ± transferencias.
 * En tarjetas de crédito un saldo negativo es deuda.
 */
export function calcularSaldos(cuentas: readonly Cuenta[], movs: readonly Movimiento[]): Map<number, number> {
  const saldos = new Map<number, number>();
  for (const c of cuentas) if (c.id != null) saldos.set(c.id, c.saldoInicial);
  for (const m of movs) {
    if (saldos.has(m.cuentaId)) {
      saldos.set(m.cuentaId, saldos.get(m.cuentaId)! + (m.tipo === 'ingreso' ? m.monto : -m.monto));
    }
    if (m.tipo === 'transferencia' && m.cuentaDestinoId != null && saldos.has(m.cuentaDestinoId)) {
      saldos.set(m.cuentaDestinoId, saldos.get(m.cuentaDestinoId)! + m.monto);
    }
  }
  return saldos;
}

/** Orden de lista: fecha descendente y, dentro del día, lo más reciente primero. */
export function compararMovimientos(a: Movimiento, b: Movimiento): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
  return b.creado - a.creado;
}

export interface GrupoDia {
  fecha: string;
  movimientos: Movimiento[];
  totales: Totales;
}

export function agruparPorDia(movs: readonly Movimiento[]): GrupoDia[] {
  const ordenados = [...movs].sort(compararMovimientos);
  const grupos: GrupoDia[] = [];
  let actual: GrupoDia | null = null;
  for (const m of ordenados) {
    if (!actual || actual.fecha !== m.fecha) {
      actual = { fecha: m.fecha, movimientos: [], totales: { ingresos: 0, gastos: 0, balance: 0 } };
      grupos.push(actual);
    }
    actual.movimientos.push(m);
  }
  for (const g of grupos) g.totales = calcularTotales(g.movimientos);
  return grupos;
}

/**
 * Categorías para la captura rápida: las `n` más usadas del tipo dado
 * (por número de movimientos) y, si faltan, las demás por su orden.
 */
export function categoriasFrecuentes(
  categorias: readonly Categoria[],
  movs: readonly Movimiento[],
  tipo: TipoCategoria,
  n = 8,
): Categoria[] {
  const disponibles = categorias.filter((c) => c.tipo === tipo && !c.archivada);
  const conteo = new Map<number, number>();
  for (const m of movs) {
    if (m.tipo === tipo && m.categoriaId != null) conteo.set(m.categoriaId, (conteo.get(m.categoriaId) ?? 0) + 1);
  }
  return [...disponibles]
    .sort((a, b) => {
      const dif = (conteo.get(b.id!) ?? 0) - (conteo.get(a.id!) ?? 0);
      if (dif !== 0) return dif;
      // Sin uso: primero las categorías principales, luego por orden.
      if ((a.padreId == null) !== (b.padreId == null)) return a.padreId == null ? -1 : 1;
      return a.orden - b.orden;
    })
    .slice(0, n);
}

export function filtrarPorRango(movs: readonly Movimiento[], inicio: string, fin: string): Movimiento[] {
  return movs.filter((m) => m.fecha >= inicio && m.fecha <= fin);
}
