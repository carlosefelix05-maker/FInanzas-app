// Filtros y comparativas por categoría (funciones puras).
import type { Categoria, Cuenta, Movimiento, TipoCategoria } from './tipos';
import { deISO, type TipoPeriodo } from './fechas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface Filtros {
  categoriaId: number | null;
  cuentaId: number | null;
  texto: string;
}

export const FILTROS_VACIOS: Filtros = { categoriaId: null, cuentaId: null, texto: '' };

export function normalizarTexto(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Ids de una categoría y todas sus subcategorías. */
export function idsConHijas(categorias: readonly Categoria[], id: number): Set<number> {
  const ids = new Set([id]);
  let crecio = true;
  while (crecio) {
    crecio = false;
    for (const c of categorias) {
      if (c.padreId != null && ids.has(c.padreId) && !ids.has(c.id!)) {
        ids.add(c.id!);
        crecio = true;
      }
    }
  }
  return ids;
}

export function filtrarMovimientos(
  movs: readonly Movimiento[],
  filtros: Filtros,
  categorias: readonly Categoria[],
  cuentas: readonly Cuenta[],
): Movimiento[] {
  const ids = filtros.categoriaId != null ? idsConHijas(categorias, filtros.categoriaId) : null;
  const q = normalizarTexto(filtros.texto.trim());
  const nombreCat = new Map(categorias.map((c) => [c.id!, c.nombre]));
  const nombreCuenta = new Map(cuentas.map((c) => [c.id!, c.nombre]));
  return movs.filter((m) => {
    if (ids && (m.categoriaId == null || !ids.has(m.categoriaId))) return false;
    if (filtros.cuentaId != null && m.cuentaId !== filtros.cuentaId && m.cuentaDestinoId !== filtros.cuentaId) return false;
    if (q) {
      const texto = [
        m.nota,
        m.categoriaId != null ? nombreCat.get(m.categoriaId) : 'transferencia',
        nombreCuenta.get(m.cuentaId),
        m.cuentaDestinoId != null ? nombreCuenta.get(m.cuentaDestinoId) : '',
      ].join(' ');
      if (!normalizarTexto(texto).includes(q)) return false;
    }
    return true;
  });
}

/** Categoría principal (raíz) de una categoría. */
export function categoriaRaiz(porId: Map<number, Categoria>, id: number): number {
  let actual = porId.get(id);
  const vistos = new Set<number>();
  while (actual?.padreId != null && !vistos.has(actual.id!)) {
    vistos.add(actual.id!);
    const padre = porId.get(actual.padreId);
    if (!padre) break;
    actual = padre;
  }
  return actual?.id ?? id;
}

/** Suma por categoría de un tipo. Con `agruparEnPadre`, las subcategorías suman a su categoría principal. */
export function totalesPorCategoria(
  movs: readonly Movimiento[],
  categorias: readonly Categoria[],
  tipo: TipoCategoria,
  agruparEnPadre = true,
): Map<number, number> {
  const porId = new Map(categorias.map((c) => [c.id!, c]));
  const out = new Map<number, number>();
  for (const m of movs) {
    if (m.tipo !== tipo || m.categoriaId == null) continue;
    const id = agruparEnPadre ? categoriaRaiz(porId, m.categoriaId) : m.categoriaId;
    out.set(id, (out.get(id) ?? 0) + m.monto);
  }
  return out;
}

export interface Comparacion {
  categoriaId: number;
  actual: number;
  anterior: number;
  diferencia: number;
  /** Cambio porcentual redondeado; null si el periodo anterior fue 0. */
  porcentaje: number | null;
}

export function compararPorCategoria(
  actual: readonly Movimiento[],
  anterior: readonly Movimiento[],
  categorias: readonly Categoria[],
  tipo: TipoCategoria = 'gasto',
): Comparacion[] {
  const a = totalesPorCategoria(actual, categorias, tipo);
  const b = totalesPorCategoria(anterior, categorias, tipo);
  const ids = new Set([...a.keys(), ...b.keys()]);
  return [...ids]
    .map((id) => {
      const act = a.get(id) ?? 0;
      const ant = b.get(id) ?? 0;
      return {
        categoriaId: id,
        actual: act,
        anterior: ant,
        diferencia: act - ant,
        porcentaje: ant === 0 ? null : Math.round(((act - ant) / ant) * 100),
      };
    })
    .filter((c) => c.diferencia !== 0)
    .sort((x, y) => Math.abs(y.diferencia) - Math.abs(x.diferencia));
}

/** Nombre del periodo anterior para frases como "vs. septiembre". */
export function nombrePeriodoAnterior(tipo: TipoPeriodo, inicioAnterior: string): string {
  const d = deISO(inicioAnterior);
  switch (tipo) {
    case 'dia':
      return 'el día anterior';
    case 'semana':
      return 'la semana anterior';
    case 'mes':
      return format(d, 'MMMM', { locale: es });
    case 'anio':
      return format(d, 'yyyy');
  }
}
