import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { procesarAutomaticos } from './automaticos';
import { bajaCategoria, confirmarPendiente, exportarDatos, importarDatos, omitirPendiente } from './acciones';

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

describe('base de datos', () => {
  it('siembra cuentas y categorías', async () => {
    expect(await db.cuentas.count()).toBe(2);
    expect(await db.categorias.count()).toBe(18);
  });

  it('genera pendientes de recurrentes y cuotas MSI una sola vez', async () => {
    const [cuenta] = await db.cuentas.toArray();
    await db.recurrentes.add({
      plantilla: { tipo: 'gasto', monto: 29900, categoriaId: 1, cuentaId: cuenta.id!, cuentaDestinoId: null, nota: 'Streaming' },
      frecuencia: 'mensual', inicio: '2026-08-01', generadas: 0, proximaFecha: '2026-08-01', activo: true,
    });
    await db.msi.add({
      tarjetaId: cuenta.id!, descripcion: 'Laptop', montoTotal: 1200000, meses: 12,
      fechaPrimeraCuota: '2026-09-10', cuotasPagadas: 0, categoriaId: 1,
    });
    expect(await procesarAutomaticos('2026-10-18')).toEqual({ pendientes: 3, cuotas: 2 });
    expect(await procesarAutomaticos('2026-10-18')).toEqual({ pendientes: 0, cuotas: 0 });
    expect((await db.recurrentes.toArray())[0].proximaFecha).toBe('2026-11-01');

    const [p1, p2] = await db.pendientes.orderBy('fecha').toArray();
    await confirmarPendiente(p1.id!, 31000);
    await omitirPendiente(p2.id!);
    const movs = await db.movimientos.toArray();
    expect(movs.filter((m) => m.recurrenteId != null).map((m) => [m.fecha, m.monto])).toEqual([['2026-08-01', 31000]]);
    expect(movs.filter((m) => m.msiId != null).map((m) => m.monto)).toEqual([100000, 100000]);
    expect(await db.pendientes.count()).toBe(1);
  });

  it('archiva categorías usadas y elimina las que no', async () => {
    const [comida, , gasolina] = await db.categorias.orderBy('orden').toArray();
    await db.movimientos.add({
      tipo: 'gasto', monto: 100, fecha: '2026-10-01', categoriaId: comida.id!, cuentaId: 1, cuentaDestinoId: null,
      nota: '', recurrenteId: null, msiId: null, creado: 1,
    });
    expect(await bajaCategoria(comida.id!)).toBe('archivada');
    expect(await bajaCategoria(gasolina.id!)).toBe('eliminada');
    expect((await db.categorias.get(comida.id!))?.archivada).toBe(true);
  });

  it('exporta e importa todos los datos', async () => {
    await db.metas.add({ nombre: 'Viaje', montoObjetivo: 100, fechaObjetivo: null, color: '#000', aportaciones: [], creada: '2026-10-18' });
    const respaldo = JSON.parse(JSON.stringify(await exportarDatos()));
    await db.metas.clear();
    await db.cuentas.clear();
    await importarDatos(respaldo);
    expect(await db.metas.count()).toBe(1);
    expect(await db.cuentas.count()).toBe(2);
  });
});
