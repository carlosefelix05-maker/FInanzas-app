import Dexie, { type EntityTable } from 'dexie';
import type { Ajuste, Categoria, Cuenta, Meta, Movimiento, Msi, Pendiente, Presupuesto, Recurrente, Tarjeta } from '../lib/tipos';
import { CUENTAS_INICIALES, categoriasIniciales } from './semillas';

export class FinanzasDB extends Dexie {
  cuentas!: EntityTable<Cuenta, 'id'>;
  categorias!: EntityTable<Categoria, 'id'>;
  movimientos!: EntityTable<Movimiento, 'id'>;
  recurrentes!: EntityTable<Recurrente, 'id'>;
  presupuestos!: EntityTable<Presupuesto, 'id'>;
  tarjetas!: EntityTable<Tarjeta, 'cuentaId'>;
  msi!: EntityTable<Msi, 'id'>;
  metas!: EntityTable<Meta, 'id'>;
  ajustes!: EntityTable<Ajuste, 'clave'>;
  pendientes!: EntityTable<Pendiente, 'id'>;

  constructor(nombre = 'synapfinanzas') {
    super(nombre);
    this.version(1).stores({
      cuentas: '++id, orden',
      categorias: '++id, tipo, padreId, orden',
      movimientos: '++id, fecha, [cuentaId+fecha], cuentaDestinoId, categoriaId, recurrenteId, msiId, demo',
      recurrentes: '++id, proximaFecha',
      presupuestos: '++id, &categoriaId',
      tarjetas: 'cuentaId',
      msi: '++id, tarjetaId',
      metas: '++id',
      ajustes: 'clave',
    });
    this.version(2).stores({
      recurrentes: '++id, proximaFecha',
      pendientes: '++id, recurrenteId, fecha',
    });
    this.on('populate', async (tx) => {
      await tx.table('cuentas').bulkAdd(CUENTAS_INICIALES);
      await tx.table('categorias').bulkAdd(categoriasIniciales());
    });
  }
}

export const db = new FinanzasDB();

export async function leerAjuste<T>(clave: string, porDefecto: T): Promise<T> {
  const a = await db.ajustes.get(clave);
  return a ? (a.valor as T) : porDefecto;
}

export async function guardarAjuste(clave: string, valor: unknown): Promise<void> {
  await db.ajustes.put({ clave, valor });
}

// Pide al navegador almacenamiento persistente (importante en iOS).
export async function solicitarPersistencia(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* sin soporte */
  }
  return false;
}
