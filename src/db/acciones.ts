import { db, guardarAjuste } from './db';
import type { Movimiento } from '../lib/tipos';
import { hoyISO } from '../lib/fechas';

export const AJUSTE_ULTIMA_CUENTA = 'ultimaCuentaId';

export async function guardarMovimiento(m: Movimiento): Promise<number> {
  const id = await db.movimientos.put(m);
  await guardarAjuste(AJUSTE_ULTIMA_CUENTA, m.cuentaId);
  return id as number;
}

/** Borra y devuelve el movimiento para poder deshacer. */
export async function borrarMovimiento(id: number): Promise<Movimiento | undefined> {
  const m = await db.movimientos.get(id);
  if (m) await db.movimientos.delete(id);
  return m;
}

export async function restaurarMovimiento(m: Movimiento): Promise<void> {
  await db.movimientos.put(m);
}

export async function cargarDatosDemo(): Promise<number> {
  const { generarDemo } = await import('../lib/demo');
  const [categorias, cuentas] = await Promise.all([db.categorias.toArray(), db.cuentas.toArray()]);
  const movs = generarDemo(categorias, cuentas, hoyISO());
  await db.movimientos.bulkAdd(movs);
  return movs.length;
}

export async function borrarDatosDemo(): Promise<number> {
  return db.movimientos.where('demo').equals(1).delete();
}

export async function contarDatosDemo(): Promise<number> {
  return db.movimientos.where('demo').equals(1).count();
}
