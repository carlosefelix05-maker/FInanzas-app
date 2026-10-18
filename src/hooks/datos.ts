import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db/db';
import type { Categoria, Cuenta, Meta, Movimiento, Msi, Pendiente, Presupuesto, Recurrente, Tarjeta } from '../lib/tipos';
import { calcularSaldos } from '../lib/movimientos';
import { todasLasAportaciones } from '../lib/metas';

const VACIO: never[] = [];

export function useCuentas(): Cuenta[] {
  return useLiveQuery(() => db.cuentas.orderBy('orden').toArray(), [], VACIO);
}

export function useCategorias(): Categoria[] {
  return useLiveQuery(() => db.categorias.orderBy('orden').toArray(), [], VACIO);
}

export function useMovimientos(): Movimiento[] | undefined {
  return useLiveQuery(() => db.movimientos.toArray(), []);
}

export function useMovimientosRango(inicio: string, fin: string): Movimiento[] | undefined {
  return useLiveQuery(
    () => db.movimientos.where('fecha').between(inicio, fin, true, true).toArray(),
    [inicio, fin],
  );
}

export function useMapa<T extends { id?: number }>(lista: readonly T[]): Map<number, T> {
  return useMemo(() => new Map(lista.map((x) => [x.id!, x])), [lista]);
}

export function useRecurrentes(): Recurrente[] {
  return useLiveQuery(() => db.recurrentes.toArray(), [], VACIO);
}

export function usePendientes(): Pendiente[] {
  return useLiveQuery(() => db.pendientes.orderBy('fecha').toArray(), [], VACIO);
}

export function usePresupuestos(): Presupuesto[] {
  return useLiveQuery(() => db.presupuestos.toArray(), [], VACIO);
}

export function useTarjetas(): Tarjeta[] {
  return useLiveQuery(() => db.tarjetas.toArray(), [], VACIO);
}

export function useMsis(): Msi[] {
  return useLiveQuery(() => db.msi.toArray(), [], VACIO);
}

export function useMetas(): Meta[] {
  return useLiveQuery(() => db.metas.toArray(), [], VACIO);
}

export function useAjuste<T>(clave: string, porDefecto: T): T {
  return useLiveQuery(async () => {
    const a = await db.ajustes.get(clave);
    return a ? (a.valor as T) : porDefecto;
  }, [clave], porDefecto) as T;
}

/** Saldos de todas las cuentas (movimientos + aportaciones a metas). */
export function useSaldos(): Map<number, number> | undefined {
  const cuentas = useCuentas();
  const movimientos = useMovimientos();
  const metas = useMetas();
  return useMemo(
    () => (movimientos ? calcularSaldos(cuentas, movimientos, todasLasAportaciones(metas)) : undefined),
    [cuentas, movimientos, metas],
  );
}
