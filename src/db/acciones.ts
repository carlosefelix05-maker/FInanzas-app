import { db, guardarAjuste } from './db';
import type { Categoria, Cuenta, Movimiento } from '../lib/tipos';
import { idsConHijas } from '../lib/analisis';
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

// ---------- Categorías ----------

export async function guardarCategoria(c: Categoria): Promise<number> {
  if (c.id == null) {
    const ultima = await db.categorias.orderBy('orden').last();
    c = { ...c, orden: (ultima?.orden ?? -1) + 1 };
  }
  return (await db.categorias.put(c)) as number;
}

export type ResultadoBaja = 'eliminada' | 'archivada';

/**
 * Elimina la categoría (y sus subcategorías) si nadie la usa;
 * si tiene movimientos, presupuestos o recurrentes, la archiva junto con sus subcategorías.
 */
export async function bajaCategoria(id: number): Promise<ResultadoBaja> {
  return db.transaction('rw', [db.categorias, db.movimientos, db.presupuestos, db.recurrentes], async () => {
    const todas = await db.categorias.toArray();
    const ids = [...idsConHijas(todas, id)];
    const usados = await db.movimientos.where('categoriaId').anyOf(ids).count();
    const recurrentes = (await db.recurrentes.toArray()).some((r) => r.plantilla.categoriaId != null && ids.includes(r.plantilla.categoriaId));
    if (usados > 0 || recurrentes) {
      await db.categorias.where('id').anyOf(ids).modify({ archivada: true });
      return 'archivada';
    }
    await db.presupuestos.where('categoriaId').anyOf(ids).delete();
    await db.categorias.bulkDelete(ids);
    return 'eliminada';
  });
}

export async function restaurarCategoria(id: number): Promise<void> {
  const c = await db.categorias.get(id);
  if (!c) return;
  await db.categorias.update(id, { archivada: false });
  // Si la principal está archivada, también se restaura para que la subcategoría sea visible.
  if (c.padreId != null) await restaurarCategoria(c.padreId);
}

/** Intercambia el orden con la hermana anterior/siguiente (mismo tipo y misma principal). */
export async function moverCategoria(id: number, direccion: -1 | 1): Promise<void> {
  await db.transaction('rw', db.categorias, async () => {
    const c = await db.categorias.get(id);
    if (!c) return;
    const hermanas = (await db.categorias.orderBy('orden').toArray()).filter(
      (x) => x.tipo === c.tipo && x.padreId === c.padreId && !x.archivada,
    );
    const i = hermanas.findIndex((x) => x.id === id);
    const otra = hermanas[i + direccion];
    if (!otra) return;
    await db.categorias.update(c.id!, { orden: otra.orden });
    await db.categorias.update(otra.id!, { orden: c.orden });
  });
}

// ---------- Cuentas ----------
export async function guardarCuenta(c: Cuenta): Promise<number> {
  if (c.id == null) {
    const ultima = await db.cuentas.orderBy('orden').last();
    c = { ...c, orden: (ultima?.orden ?? -1) + 1 };
  }
  return (await db.cuentas.put(c)) as number;
}

/** Elimina la cuenta si no tiene movimientos; si los tiene, la archiva. */
export async function bajaCuenta(id: number): Promise<ResultadoBaja> {
  return db.transaction('rw', [db.cuentas, db.movimientos, db.tarjetas], async () => {
    const usados =
      (await db.movimientos.where('[cuentaId+fecha]').between([id, ''], [id, '￿']).count()) +
      (await db.movimientos.where('cuentaDestinoId').equals(id).count());
    if (usados > 0) {
      await db.cuentas.update(id, { archivada: true });
      return 'archivada';
    }
    await db.tarjetas.delete(id);
    await db.cuentas.delete(id);
    return 'eliminada';
  });
}

export async function moverCuenta(id: number, direccion: -1 | 1): Promise<void> {
  await db.transaction('rw', db.cuentas, async () => {
    const lista = (await db.cuentas.orderBy('orden').toArray()).filter((x) => !x.archivada);
    const i = lista.findIndex((x) => x.id === id);
    const otra = lista[i + direccion];
    if (i < 0 || !otra) return;
    await db.cuentas.update(id, { orden: otra.orden });
    await db.cuentas.update(otra.id!, { orden: lista[i].orden });
  });
}

export async function restaurarCuenta(id: number): Promise<void> {
  await db.cuentas.update(id, { archivada: false });
}
