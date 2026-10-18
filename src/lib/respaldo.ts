// Formato del archivo de respaldo JSON.
import type { Ajuste, Categoria, Cuenta, Meta, Movimiento, Msi, Pendiente, Presupuesto, Recurrente, Tarjeta } from './tipos';

export const FORMATO_RESPALDO = 'synapfinanzas-respaldo';
export const VERSION_RESPALDO = 1;

export interface DatosRespaldo {
  cuentas: Cuenta[];
  categorias: Categoria[];
  movimientos: Movimiento[];
  recurrentes: Recurrente[];
  pendientes: Pendiente[];
  presupuestos: Presupuesto[];
  tarjetas: Tarjeta[];
  msi: Msi[];
  metas: Meta[];
  ajustes: Ajuste[];
}

export const TABLAS: (keyof DatosRespaldo)[] = [
  'cuentas', 'categorias', 'movimientos', 'recurrentes', 'pendientes', 'presupuestos', 'tarjetas', 'msi', 'metas', 'ajustes',
];

export interface Respaldo {
  formato: typeof FORMATO_RESPALDO;
  version: number;
  exportado: string;
  datos: DatosRespaldo;
}

export function crearRespaldo(datos: DatosRespaldo, ahora = new Date()): Respaldo {
  return { formato: FORMATO_RESPALDO, version: VERSION_RESPALDO, exportado: ahora.toISOString(), datos };
}

export function nombreArchivoRespaldo(ahora = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `synapfinanzas-${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}.json`;
}

/** Valida un respaldo leído de archivo. Lanza un Error con mensaje en español si no es válido. */
export function validarRespaldo(json: unknown): Respaldo {
  if (!json || typeof json !== 'object') throw new Error('El archivo no es un respaldo válido.');
  const r = json as Partial<Respaldo>;
  if (r.formato !== FORMATO_RESPALDO) throw new Error('Este archivo no es un respaldo de SynapFinanzas.');
  if (typeof r.version !== 'number' || r.version > VERSION_RESPALDO) {
    throw new Error('El respaldo es de una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.');
  }
  if (!r.datos || typeof r.datos !== 'object') throw new Error('El respaldo no contiene datos.');
  const datos = {} as DatosRespaldo;
  for (const t of TABLAS) {
    const v = (r.datos as unknown as Record<string, unknown>)[t] ?? [];
    if (!Array.isArray(v)) throw new Error(`La sección "${t}" del respaldo está dañada.`);
    (datos as unknown as Record<string, unknown[]>)[t] = v;
  }
  for (const m of datos.movimientos) {
    if (!Number.isInteger(m.monto) || typeof m.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha)) {
      throw new Error('Hay movimientos con monto o fecha inválidos en el respaldo.');
    }
  }
  return { formato: FORMATO_RESPALDO, version: r.version, exportado: String(r.exportado ?? ''), datos };
}
