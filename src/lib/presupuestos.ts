// Presupuestos mensuales por categoría.
import { idsConHijas } from './analisis';
import type { Categoria, Movimiento, Presupuesto } from './tipos';

export type NivelPresupuesto = 'ok' | 'alerta' | 'excedido';

export interface EstadoPresupuesto {
  presupuesto: Presupuesto;
  gastado: number;
  restante: number;
  /** Porcentaje usado (puede pasar de 100). */
  porcentaje: number;
  nivel: NivelPresupuesto;
}

export const UMBRAL_ALERTA = 80;

export function nivelPresupuesto(porcentaje: number): NivelPresupuesto {
  if (porcentaje >= 100) return 'excedido';
  if (porcentaje >= UMBRAL_ALERTA) return 'alerta';
  return 'ok';
}

/** Estado de cada presupuesto con los gastos del mes (incluye subcategorías). */
export function estadoPresupuestos(
  presupuestos: readonly Presupuesto[],
  movsDelMes: readonly Movimiento[],
  categorias: readonly Categoria[],
): EstadoPresupuesto[] {
  return presupuestos
    .map((p) => {
      const ids = idsConHijas(categorias, p.categoriaId);
      let gastado = 0;
      for (const m of movsDelMes) if (m.tipo === 'gasto' && m.categoriaId != null && ids.has(m.categoriaId)) gastado += m.monto;
      const porcentaje = p.montoMensual > 0 ? Math.round((gastado / p.montoMensual) * 100) : 0;
      return { presupuesto: p, gastado, restante: p.montoMensual - gastado, porcentaje, nivel: nivelPresupuesto(porcentaje) };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje);
}
