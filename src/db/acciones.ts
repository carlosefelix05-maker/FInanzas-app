import { db, guardarAjuste } from './db';
import type { Aportacion, Categoria, Cuenta, Meta, Movimiento, Msi, Pendiente, Presupuesto, Recurrente, Tarjeta } from '../lib/tipos';
import { cargarCuotasMsi, generarPendientes } from './automaticos';
import { crearRespaldo, TABLAS, validarRespaldo, type DatosRespaldo, type Respaldo } from '../lib/respaldo';
import { idsConHijas } from '../lib/analisis';
import { hoyISO, sumarDias } from '../lib/fechas';

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
  const hoy = hoyISO();
  return db.transaction('rw', [db.cuentas, db.categorias, db.movimientos, db.tarjetas, db.msi, db.presupuestos, db.metas, db.recurrentes], async () => {
    const [categorias, cuentas] = await Promise.all([db.categorias.toArray(), db.cuentas.toArray()]);
    const cat = (nombre: string) => categorias.find((c) => c.nombre === nombre)?.id ?? null;
    const debito = cuentas.find((c) => c.tipo === 'debito' && !c.archivada)?.id ?? cuentas[0].id!;
    const ultima = await db.cuentas.orderBy('orden').last();

    // Tarjeta de crédito de ejemplo con compras, pagos mensuales y una compra a MSI.
    const tarjetaId = (await db.cuentas.add({
      nombre: 'Tarjeta (ejemplo)', tipo: 'credito', saldoInicial: 0, color: '#6B5B95', archivada: false,
      orden: (ultima?.orden ?? 0) + 1, demo: 1,
    })) as number;
    await db.tarjetas.add({ cuentaId: tarjetaId, limite: 6000000, diaCorte: 5, diaLimitePago: 25, demo: 1 });

    const movs = generarDemo(categorias, cuentas, hoy);
    const porMes = new Map<string, number>();
    movs.forEach((m, i) => {
      if (m.tipo === 'gasto' && m.categoriaId !== cat('Renta') && i % 4 === 0) {
        m.cuentaId = tarjetaId;
        const mes = m.fecha.slice(0, 7);
        porMes.set(mes, (porMes.get(mes) ?? 0) + m.monto);
      }
    });
    // Pago total de lo del mes el día 20 del mes siguiente (si ya ocurrió).
    for (const [mes, monto] of porMes) {
      const [a, mm] = mes.split('-').map(Number);
      const fecha = `${mm === 12 ? a + 1 : a}-${String(mm === 12 ? 1 : mm + 1).padStart(2, '0')}-20`;
      if (fecha <= hoy) {
        movs.push({ tipo: 'transferencia', monto, fecha, categoriaId: null, cuentaId: debito, cuentaDestinoId: tarjetaId,
          nota: 'Pago tarjeta', recurrenteId: null, msiId: null, creado: Date.now(), demo: 1 });
      }
    }
    await db.movimientos.bulkAdd(movs);

    const primera = sumarDias(hoy, -95).slice(0, 8) + '05';
    await db.msi.add({ tarjetaId, descripcion: 'Laptop', montoTotal: 1799900, meses: 12, fechaPrimeraCuota: primera,
      cuotasPagadas: 0, categoriaId: cat('Educación y cursos'), demo: 1 });

    const existentes = new Set((await db.presupuestos.toArray()).map((p) => p.categoriaId));
    const presupuestos: [string, number][] = [['Comida', 600000], ['Súper', 700000], ['Gasolina', 350000], ['Entretenimiento', 150000], ['Transporte', 100000]];
    for (const [nombre, monto] of presupuestos) {
      const id = cat(nombre);
      if (id != null && !existentes.has(id)) await db.presupuestos.add({ categoriaId: id, montoMensual: monto, demo: 1 });
    }

    await db.metas.add({
      nombre: 'Fondo de emergencia (ejemplo)', montoObjetivo: 6000000, fechaObjetivo: sumarDias(hoy, 300), color: '#2E7D5B',
      creada: sumarDias(hoy, -120), demo: 1,
      aportaciones: [120, 90, 60, 30].map((d) => ({ fecha: sumarDias(hoy, -d), monto: 500000, cuentaId: debito })),
    });

    const inicioMes = hoy.slice(0, 8) + '01';
    await db.recurrentes.bulkAdd([
      { plantilla: { tipo: 'gasto', monto: 29900, categoriaId: cat('Suscripciones'), cuentaId: tarjetaId, cuentaDestinoId: null, nota: 'Streaming (ejemplo)' },
        frecuencia: 'mensual', inicio: sumarDias(hoy, 3), generadas: 0, proximaFecha: sumarDias(hoy, 3), activo: true, demo: 1 },
      { plantilla: { tipo: 'gasto', monto: 95000, categoriaId: cat('Servicios'), cuentaId: debito, cuentaDestinoId: null, nota: 'Internet (ejemplo)' },
        frecuencia: 'mensual', inicio: inicioMes, generadas: 0, proximaFecha: inicioMes, activo: true, demo: 1 },
    ]);
    return movs.length;
  }).then(async (n) => {
    await generarPendientes();
    await cargarCuotasMsi();
    return n;
  });
}

/** Borra todo lo marcado como ejemplo (movimientos, tarjeta, MSI, presupuestos, metas, recurrentes). */
export async function borrarDatosDemo(): Promise<number> {
  return db.transaction('rw', [db.cuentas, db.movimientos, db.tarjetas, db.msi, db.presupuestos, db.metas, db.recurrentes, db.pendientes], async () => {
    const recurrentes = (await db.recurrentes.toArray()).filter((r) => r.demo).map((r) => r.id!);
    await db.pendientes.where('recurrenteId').anyOf(recurrentes).delete();
    await db.recurrentes.bulkDelete(recurrentes);
    await db.msi.filter((x) => x.demo === 1).delete();
    await db.presupuestos.filter((x) => x.demo === 1).delete();
    await db.metas.filter((x) => x.demo === 1).delete();
    await db.tarjetas.filter((x) => x.demo === 1).delete();
    await db.cuentas.filter((x) => x.demo === 1).delete();
    return db.movimientos.where('demo').equals(1).delete();
  });
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

// ---------- Recurrentes ----------

export async function guardarRecurrente(r: Recurrente): Promise<number> {
  const id = (await db.recurrentes.put(r)) as number;
  await generarPendientes();
  return id;
}

/** Borra la regla y sus pendientes. Los movimientos ya confirmados se conservan. */
export async function eliminarRecurrente(id: number): Promise<void> {
  await db.transaction('rw', [db.recurrentes, db.pendientes], async () => {
    await db.pendientes.where('recurrenteId').equals(id).delete();
    await db.recurrentes.delete(id);
  });
}

function movimientoDePendiente(p: Pendiente, r: Recurrente, monto = p.monto): Movimiento {
  return {
    ...r.plantilla,
    monto,
    fecha: p.fecha,
    recurrenteId: r.id!,
    msiId: null,
    creado: Date.now(),
    ...(r.demo ? { demo: 1 as const } : {}),
  };
}

export async function confirmarPendiente(id: number, monto?: number): Promise<void> {
  await db.transaction('rw', [db.pendientes, db.recurrentes, db.movimientos], async () => {
    const p = await db.pendientes.get(id);
    if (!p) return;
    const r = await db.recurrentes.get(p.recurrenteId);
    if (r) await db.movimientos.add(movimientoDePendiente(p, r, monto));
    await db.pendientes.delete(id);
  });
}

/** Movimiento listo para abrir en la captura y editar antes de confirmar. */
export async function borradorDePendiente(id: number): Promise<Movimiento | null> {
  const p = await db.pendientes.get(id);
  const r = p && (await db.recurrentes.get(p.recurrenteId));
  return p && r ? movimientoDePendiente(p, r) : null;
}

export async function omitirPendiente(id: number): Promise<void> {
  await db.pendientes.delete(id);
}

// ---------- Presupuestos ----------
export async function guardarPresupuesto(categoriaId: number, montoMensual: number): Promise<void> {
  const existente = await db.presupuestos.where('categoriaId').equals(categoriaId).first();
  if (existente) await db.presupuestos.update(existente.id!, { montoMensual });
  else await db.presupuestos.add({ categoriaId, montoMensual } as Presupuesto);
}

export async function eliminarPresupuesto(id: number): Promise<void> {
  await db.presupuestos.delete(id);
}

// ---------- Tarjetas y MSI ----------
export async function guardarTarjeta(t: Tarjeta): Promise<void> {
  await db.tarjetas.put(t);
}

export async function guardarMsi(m: Msi): Promise<number> {
  const id = (await db.msi.put(m)) as number;
  await cargarCuotasMsi();
  return id;
}

/** Elimina la compra MSI. Si `conCuotas`, borra también las cuotas ya cargadas. */
export async function eliminarMsi(id: number, conCuotas: boolean): Promise<void> {
  await db.transaction('rw', [db.msi, db.movimientos], async () => {
    if (conCuotas) await db.movimientos.where('msiId').equals(id).delete();
    else await db.movimientos.where('msiId').equals(id).modify({ msiId: null });
    await db.msi.delete(id);
  });
}

// ---------- Metas ----------
export const AJUSTE_META_PRINCIPAL = 'metaPrincipalId';

export async function guardarMeta(m: Meta): Promise<number> {
  return (await db.metas.put(m)) as number;
}

export async function eliminarMeta(id: number): Promise<void> {
  await db.metas.delete(id);
}

export async function agregarAportacion(metaId: number, a: Aportacion): Promise<void> {
  await db.transaction('rw', db.metas, async () => {
    const m = await db.metas.get(metaId);
    if (!m) return;
    await db.metas.update(metaId, { aportaciones: [...m.aportaciones, a] });
  });
}

export async function quitarAportacion(metaId: number, indice: number): Promise<void> {
  await db.transaction('rw', db.metas, async () => {
    const m = await db.metas.get(metaId);
    if (!m) return;
    await db.metas.update(metaId, { aportaciones: m.aportaciones.filter((_, i) => i !== indice) });
  });
}

// ---------- Respaldo ----------
export const AJUSTE_ULTIMO_RESPALDO = 'ultimoRespaldo';

function tabla(nombre: keyof DatosRespaldo) {
  return db.table(nombre);
}

export async function exportarDatos(): Promise<Respaldo> {
  const datos = {} as Record<string, unknown[]>;
  await db.transaction('r', TABLAS.map(tabla), async () => {
    for (const t of TABLAS) datos[t] = await tabla(t).toArray();
  });
  return crearRespaldo(datos as unknown as DatosRespaldo);
}

/** Reemplaza TODOS los datos por los del respaldo. */
export async function importarDatos(json: unknown): Promise<number> {
  const r = validarRespaldo(json);
  await db.transaction('rw', TABLAS.map(tabla), async () => {
    for (const t of TABLAS) {
      await tabla(t).clear();
      await tabla(t).bulkAdd(r.datos[t] as never[]);
    }
  });
  return r.datos.movimientos.length;
}
