// Filtros y comparativas por categoría (funciones puras).
import type { Categoria, Cuenta, Movimiento, TipoCategoria } from './tipos';
import { aISO, deISO, sumarDias, type TipoPeriodo } from './fechas';
import { addMonths, format, getDaysInMonth } from 'date-fns';
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

// ---------- Series y métricas de la pantalla Análisis ----------

export interface PuntoMensual {
  mes: string; // 'YYYY-MM'
  etiqueta: string; // 'oct'
  ingresos: number;
  gastos: number;
  balance: number;
  /** (ingresos − gastos) / ingresos en %, null si no hubo ingresos. */
  tasaAhorro: number | null;
}

/** Últimos `n` meses terminando en el mes de `hoy`. */
export function serieMensual(movs: readonly Movimiento[], hoy: string, n = 12): PuntoMensual[] {
  const base = deISO(hoy);
  const meses: PuntoMensual[] = [];
  const indice = new Map<string, PuntoMensual>();
  for (let i = n - 1; i >= 0; i--) {
    const d = addMonths(new Date(base.getFullYear(), base.getMonth(), 1), -i);
    const mes = aISO(d).slice(0, 7);
    const p = { mes, etiqueta: format(d, 'MMM', { locale: es }).replace('.', ''), ingresos: 0, gastos: 0, balance: 0, tasaAhorro: null };
    meses.push(p);
    indice.set(mes, p);
  }
  for (const m of movs) {
    const p = indice.get(m.fecha.slice(0, 7));
    if (!p || m.fecha > hoy) continue;
    if (m.tipo === 'ingreso') p.ingresos += m.monto;
    else if (m.tipo === 'gasto') p.gastos += m.monto;
  }
  for (const p of meses) {
    p.balance = p.ingresos - p.gastos;
    p.tasaAhorro = tasaAhorro(p.ingresos, p.gastos);
  }
  return meses;
}

export function tasaAhorro(ingresos: number, gastos: number): number | null {
  if (ingresos <= 0) return null;
  return Math.round(((ingresos - gastos) / ingresos) * 1000) / 10;
}

/** Tendencia: tasa del último mes completo vs. promedio de los 3 anteriores. */
export function tendenciaTasa(serie: readonly PuntoMensual[]): { actual: number | null; promedioPrevio: number | null } {
  const completos = serie.slice(0, -1); // el último mes está en curso
  const actual = completos.at(-1)?.tasaAhorro ?? null;
  const previos = completos.slice(-4, -1).map((p) => p.tasaAhorro).filter((t): t is number => t != null);
  const promedioPrevio = previos.length ? Math.round((previos.reduce((s, t) => s + t, 0) / previos.length) * 10) / 10 : null;
  return { actual, promedioPrevio };
}

export function topGastos(movs: readonly Movimiento[], n = 5): Movimiento[] {
  return movs.filter((m) => m.tipo === 'gasto').sort((a, b) => b.monto - a.monto).slice(0, n);
}

export interface ConfigHormiga {
  /** Monto máximo por movimiento para considerarlo "hormiga" (centavos). */
  umbral: number;
  /** Mínimo de movimientos pequeños en la categoría. */
  minimoMovimientos: number;
  /** % mínimo del gasto total del periodo que deben sumar. */
  porcentajeMinimo: number;
}

export const AJUSTE_HORMIGA = 'hormiga';

export const HORMIGA_PREDETERMINADO: ConfigHormiga = { umbral: 15000, minimoMovimientos: 5, porcentajeMinimo: 5 };

export interface GastoHormiga {
  categoriaId: number;
  cantidad: number;
  total: number;
  porcentaje: number;
}

export function gastosHormiga(
  movs: readonly Movimiento[],
  categorias: readonly Categoria[],
  config: ConfigHormiga = HORMIGA_PREDETERMINADO,
): GastoHormiga[] {
  const porId = new Map(categorias.map((c) => [c.id!, c]));
  const totalGastos = movs.reduce((s, m) => s + (m.tipo === 'gasto' ? m.monto : 0), 0);
  if (totalGastos === 0) return [];
  const acc = new Map<number, { cantidad: number; total: number }>();
  for (const m of movs) {
    if (m.tipo !== 'gasto' || m.categoriaId == null || m.monto >= config.umbral) continue;
    const id = categoriaRaiz(porId, m.categoriaId);
    const a = acc.get(id) ?? { cantidad: 0, total: 0 };
    a.cantidad++;
    a.total += m.monto;
    acc.set(id, a);
  }
  return [...acc.entries()]
    .map(([categoriaId, a]) => ({ categoriaId, ...a, porcentaje: Math.round((a.total / totalGastos) * 1000) / 10 }))
    .filter((h) => h.cantidad >= config.minimoMovimientos && h.porcentaje >= config.porcentajeMinimo)
    .sort((a, b) => b.total - a.total);
}

export interface Proyeccion {
  gastado: number;
  diasTranscurridos: number;
  diasMes: number;
  ritmoDiario: number;
  proyectado: number;
  presupuesto: number;
  /** proyectado − presupuesto (positivo = se pasaría). */
  diferencia: number;
}

/** Gasto proyectado a fin de mes según el ritmo diario actual. */
export function proyeccionFinDeMes(movsDelMes: readonly Movimiento[], hoy: string, presupuestoTotal: number): Proyeccion {
  const d = deISO(hoy);
  const diasMes = getDaysInMonth(d);
  const diasTranscurridos = d.getDate();
  const gastado = movsDelMes.reduce((s, m) => s + (m.tipo === 'gasto' && m.fecha <= hoy ? m.monto : 0), 0);
  const ritmoDiario = Math.round(gastado / diasTranscurridos);
  const proyectado = Math.round((gastado / diasTranscurridos) * diasMes);
  return { gastado, diasTranscurridos, diasMes, ritmoDiario, proyectado, presupuesto: presupuestoTotal, diferencia: proyectado - presupuestoTotal };
}

/** Gasto por día de los últimos `n` días (incluye hoy). */
export function gastoPorDia(movs: readonly Movimiento[], hoy: string, n = 7): { fecha: string; etiqueta: string; gasto: number }[] {
  const out = [];
  const indice = new Map<string, { fecha: string; etiqueta: string; gasto: number }>();
  for (let i = n - 1; i >= 0; i--) {
    const fecha = sumarDias(hoy, -i);
    const p = { fecha, etiqueta: format(deISO(fecha), 'EEEEE', { locale: es }).toUpperCase(), gasto: 0 };
    out.push(p);
    indice.set(fecha, p);
  }
  for (const m of movs) {
    if (m.tipo !== 'gasto') continue;
    const p = indice.get(m.fecha);
    if (p) p.gasto += m.monto;
  }
  return out;
}
