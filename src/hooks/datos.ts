import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db/db';
import type { Categoria, Cuenta, Movimiento } from '../lib/tipos';

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
