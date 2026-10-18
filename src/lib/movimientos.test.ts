import { describe, expect, it } from 'vitest';
import { agruparPorDia, calcularSaldos, calcularTotales, categoriasFrecuentes } from './movimientos';
import type { Categoria, Cuenta, Movimiento } from './tipos';

let n = 0;
function mov(p: Partial<Movimiento>): Movimiento {
  return {
    tipo: 'gasto', monto: 100, fecha: '2026-10-01', categoriaId: null, cuentaId: 1,
    cuentaDestinoId: null, nota: '', recurrenteId: null, msiId: null, creado: n++, ...p,
  };
}
const cuenta = (id: number, saldoInicial = 0): Cuenta => ({
  id, nombre: `C${id}`, tipo: 'debito', saldoInicial, color: '#000', archivada: false, orden: id,
});

describe('calcularTotales', () => {
  it('excluye transferencias', () => {
    const t = calcularTotales([
      mov({ tipo: 'ingreso', monto: 10000 }),
      mov({ tipo: 'gasto', monto: 2500 }),
      mov({ tipo: 'transferencia', monto: 5000, cuentaDestinoId: 2 }),
    ]);
    expect(t).toEqual({ ingresos: 10000, gastos: 2500, balance: 7500 });
  });
});

describe('calcularSaldos', () => {
  it('aplica ingresos, gastos y transferencias', () => {
    const s = calcularSaldos(
      [cuenta(1, 100000), cuenta(2, -20000)],
      [
        mov({ tipo: 'ingreso', monto: 50000, cuentaId: 1 }),
        mov({ tipo: 'gasto', monto: 1550, cuentaId: 2 }),
        mov({ tipo: 'transferencia', monto: 21550, cuentaId: 1, cuentaDestinoId: 2 }),
      ],
    );
    expect(s.get(1)).toBe(100000 + 50000 - 21550);
    expect(s.get(2)).toBe(0); // pagar la tarjeta salda la deuda sin contar como gasto
  });
});

describe('agruparPorDia', () => {
  it('ordena desc y agrupa', () => {
    const g = agruparPorDia([
      mov({ fecha: '2026-10-01', monto: 1 }),
      mov({ fecha: '2026-10-03', monto: 2 }),
      mov({ fecha: '2026-10-01', monto: 3 }),
    ]);
    expect(g.map((x) => x.fecha)).toEqual(['2026-10-03', '2026-10-01']);
    expect(g[1].movimientos.map((m) => m.monto)).toEqual([3, 1]);
    expect(g[1].totales.gastos).toBe(4);
  });
});

describe('categoriasFrecuentes', () => {
  const cat = (id: number, orden: number, tipo: 'gasto' | 'ingreso' = 'gasto'): Categoria => ({
    id, nombre: `K${id}`, tipo, icono: 'tag', color: '#000', padreId: null, orden, archivada: false,
  });
  it('prioriza por uso y completa por orden', () => {
    const cats = [cat(1, 0), cat(2, 1), cat(3, 2), cat(4, 3, 'ingreso')];
    const movs = [mov({ categoriaId: 3 }), mov({ categoriaId: 3 }), mov({ categoriaId: 2 })];
    expect(categoriasFrecuentes(cats, movs, 'gasto', 8).map((c) => c.id)).toEqual([3, 2, 1]);
    expect(categoriasFrecuentes(cats, movs, 'gasto', 2).map((c) => c.id)).toEqual([3, 2]);
  });
});
