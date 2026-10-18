// Tareas que corren al abrir la app: recurrentes vencidos → pendientes; cuotas MSI vencidas → movimientos.
import { db } from './db';
import { fechasVencidas, ocurrencia } from '../lib/recurrentes';
import { cuotasPorCargar } from '../lib/tarjetas';
import { hoyISO } from '../lib/fechas';
import type { Movimiento } from '../lib/tipos';

export async function generarPendientes(hoy = hoyISO()): Promise<number> {
  return db.transaction('rw', [db.recurrentes, db.pendientes], async () => {
    let total = 0;
    for (const r of await db.recurrentes.toArray()) {
      if (!r.activo) continue;
      const fechas = fechasVencidas(r, hoy);
      if (!fechas.length) continue;
      await db.pendientes.bulkAdd(fechas.map((fecha) => ({ recurrenteId: r.id!, fecha, monto: r.plantilla.monto })));
      const generadas = r.generadas + fechas.length;
      await db.recurrentes.update(r.id!, {
        generadas,
        proximaFecha: ocurrencia(r.inicio, r.frecuencia, generadas, r.cadaNDias),
      });
      total += fechas.length;
    }
    return total;
  });
}

export async function cargarCuotasMsi(hoy = hoyISO()): Promise<number> {
  return db.transaction('rw', [db.msi, db.movimientos], async () => {
    let total = 0;
    for (const m of await db.msi.toArray()) {
      const cuotas = cuotasPorCargar(m, hoy);
      if (!cuotas.length) continue;
      const movs: Movimiento[] = cuotas.map((c) => ({
        tipo: 'gasto',
        monto: c.monto,
        fecha: c.fecha,
        categoriaId: m.categoriaId,
        cuentaId: m.tarjetaId,
        cuentaDestinoId: null,
        nota: `${m.descripcion} · MSI ${c.indice + 1}/${m.meses}`,
        recurrenteId: null,
        msiId: m.id!,
        creado: Date.now() + c.indice,
        ...(m.demo ? { demo: 1 as const } : {}),
      }));
      await db.movimientos.bulkAdd(movs);
      await db.msi.update(m.id!, { cuotasPagadas: m.cuotasPagadas + cuotas.length });
      total += cuotas.length;
    }
    return total;
  });
}

export async function procesarAutomaticos(hoy = hoyISO()) {
  const pendientes = await generarPendientes(hoy);
  const cuotas = await cargarCuotasMsi(hoy);
  return { pendientes, cuotas };
}
