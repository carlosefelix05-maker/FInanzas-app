import { describe, expect, it } from 'vitest';
import { compararPorCategoria, filtrarMovimientos, idsConHijas, nombrePeriodoAnterior, totalesPorCategoria } from './analisis';
import type { Categoria, Cuenta, Movimiento } from './tipos';

const cat = (id: number, padreId: number | null = null, nombre = `K${id}`): Categoria => ({
  id, nombre, tipo: 'gasto', icono: 'tag', color: '#000', padreId, orden: id, archivada: false,
});
const cuenta = (id: number, nombre: string): Cuenta => ({
  id, nombre, tipo: 'debito', saldoInicial: 0, color: '#000', archivada: false, orden: id,
});
let n = 0;
const mov = (p: Partial<Movimiento>): Movimiento => ({
  tipo: 'gasto', monto: 100, fecha: '2026-10-01', categoriaId: 1, cuentaId: 1, cuentaDestinoId: null,
  nota: '', recurrenteId: null, msiId: null, creado: n++, ...p,
});

const cats = [cat(1, null, 'Comida'), cat(2, 1, 'Cafetería'), cat(3, 2, 'Espresso'), cat(4, null, 'Súper')];
const cuentas = [cuenta(1, 'Efectivo'), cuenta(2, 'Débito')];

describe('idsConHijas', () => {
  it('incluye descendientes', () => {
    expect([...idsConHijas(cats, 1)].sort()).toEqual([1, 2, 3]);
    expect([...idsConHijas(cats, 4)]).toEqual([4]);
  });
});

describe('filtrarMovimientos', () => {
  const movs = [
    mov({ categoriaId: 3, nota: 'Café de la mañana' }),
    mov({ categoriaId: 4, cuentaId: 2 }),
    mov({ tipo: 'transferencia', categoriaId: null, cuentaId: 2, cuentaDestinoId: 1 }),
  ];
  it('por categoría con subcategorías', () => {
    expect(filtrarMovimientos(movs, { categoriaId: 1, cuentaId: null, texto: '' }, cats, cuentas)).toHaveLength(1);
  });
  it('por cuenta incluye transferencias entrantes', () => {
    expect(filtrarMovimientos(movs, { categoriaId: null, cuentaId: 1, texto: '' }, cats, cuentas)).toHaveLength(2);
  });
  it('por texto sin acentos', () => {
    expect(filtrarMovimientos(movs, { categoriaId: null, cuentaId: null, texto: 'cafe' }, cats, cuentas)).toHaveLength(1);
    expect(filtrarMovimientos(movs, { categoriaId: null, cuentaId: null, texto: 'super' }, cats, cuentas)).toHaveLength(1);
    expect(filtrarMovimientos(movs, { categoriaId: null, cuentaId: null, texto: 'debito' }, cats, cuentas)).toHaveLength(2);
  });
});

describe('totales y comparativa', () => {
  it('agrupa subcategorías en la principal', () => {
    const t = totalesPorCategoria([mov({ categoriaId: 3, monto: 50 }), mov({ categoriaId: 1, monto: 100 })], cats, 'gasto');
    expect(t.get(1)).toBe(150);
  });
  it('calcula diferencia y porcentaje', () => {
    const actual = [mov({ categoriaId: 1, monto: 11800 }), mov({ categoriaId: 4, monto: 500 })];
    const anterior = [mov({ categoriaId: 1, monto: 10000 }), mov({ categoriaId: 4, monto: 500 })];
    const c = compararPorCategoria(actual, anterior, cats);
    expect(c).toEqual([{ categoriaId: 1, actual: 11800, anterior: 10000, diferencia: 1800, porcentaje: 18 }]);
  });
  it('porcentaje nulo si antes era 0', () => {
    const c = compararPorCategoria([mov({ categoriaId: 4, monto: 300 })], [], cats);
    expect(c[0].porcentaje).toBeNull();
  });
  it('nombre del periodo anterior', () => {
    expect(nombrePeriodoAnterior('mes', '2026-09-01')).toBe('septiembre');
    expect(nombrePeriodoAnterior('anio', '2025-01-01')).toBe('2025');
  });
});
