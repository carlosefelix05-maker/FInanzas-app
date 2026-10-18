import { describe, expect, it } from 'vitest';
import { gastoPorDia, gastosHormiga, proyeccionFinDeMes, serieMensual, tasaAhorro, tendenciaTasa, topGastos } from './analisis';
import { estadoPresupuestos } from './presupuestos';
import { calcularSaldos } from './movimientos';
import { crearRespaldo, validarRespaldo } from './respaldo';
import type { Categoria, Movimiento } from './tipos';

let n = 0;
const mov = (p: Partial<Movimiento>): Movimiento => ({
  tipo: 'gasto', monto: 100, fecha: '2026-10-01', categoriaId: 1, cuentaId: 1, cuentaDestinoId: null,
  nota: '', recurrenteId: null, msiId: null, creado: n++, ...p,
});
const cat = (id: number, padreId: number | null = null): Categoria => ({
  id, nombre: `K${id}`, tipo: 'gasto', icono: 'tag', color: '#000', padreId, orden: id, archivada: false,
});

describe('serie mensual y tasa de ahorro', () => {
  it('agrupa por mes', () => {
    const s = serieMensual([
      mov({ tipo: 'ingreso', monto: 1000, fecha: '2026-09-15' }),
      mov({ monto: 250, fecha: '2026-09-20' }),
      mov({ monto: 100, fecha: '2026-10-02' }),
      mov({ monto: 999, fecha: '2025-01-01' }), // fuera de rango
    ], '2026-10-18', 3);
    expect(s.map((p) => p.mes)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(s[1]).toMatchObject({ ingresos: 1000, gastos: 250, balance: 750, tasaAhorro: 75 });
    expect(s[2].tasaAhorro).toBeNull();
  });
  it('tasa y tendencia', () => {
    expect(tasaAhorro(1000, 1200)).toBe(-20);
    const serie = [10, 20, 30, 40, null].map((t, i) => ({ mes: `m${i}`, etiqueta: '', ingresos: 0, gastos: 0, balance: 0, tasaAhorro: t }));
    expect(tendenciaTasa(serie)).toEqual({ actual: 40, promedioPrevio: 20 });
  });
});

describe('top, hormiga, proyección y 7 días', () => {
  it('top 5 gastos', () => {
    const movs = [1, 9, 3, 7, 5, 2].map((m) => mov({ monto: m }));
    expect(topGastos(movs).map((m) => m.monto)).toEqual([9, 7, 5, 3, 2]);
  });
  it('detecta gastos hormiga', () => {
    const movs = [
      ...Array.from({ length: 6 }, () => mov({ categoriaId: 2, monto: 6000 })), // 6 cafés de $60 en subcategoría
      mov({ categoriaId: 3, monto: 100000 }),
      mov({ categoriaId: 3, monto: 5000 }),
    ];
    const h = gastosHormiga(movs, [cat(1), cat(2, 1), cat(3)]);
    expect(h).toEqual([{ categoriaId: 1, cantidad: 6, total: 36000, porcentaje: 25.5 }]);
  });
  it('proyecta fin de mes', () => {
    const p = proyeccionFinDeMes([mov({ monto: 300000, fecha: '2026-10-05' })], '2026-10-10', 800000);
    expect(p.proyectado).toBe(930000);
    expect(p.diferencia).toBe(130000);
  });
  it('gasto por día', () => {
    const d = gastoPorDia([mov({ fecha: '2026-10-18', monto: 50 }), mov({ fecha: '2026-10-12', monto: 30 })], '2026-10-18');
    expect(d.map((x) => x.gasto)).toEqual([30, 0, 0, 0, 0, 0, 50]);
    expect(d[0].etiqueta).toBe('L');
  });
});

describe('presupuestos', () => {
  it('incluye subcategorías y asigna nivel', () => {
    const e = estadoPresupuestos(
      [{ id: 1, categoriaId: 1, montoMensual: 1000 }, { id: 2, categoriaId: 3, montoMensual: 1000 }],
      [mov({ categoriaId: 2, monto: 850 }), mov({ categoriaId: 3, monto: 1200 })],
      [cat(1), cat(2, 1), cat(3)],
    );
    expect(e.map((x) => [x.presupuesto.id, x.porcentaje, x.nivel])).toEqual([[2, 120, 'excedido'], [1, 85, 'alerta']]);
  });
});

describe('saldos con metas', () => {
  it('las aportaciones apartan dinero de la cuenta', () => {
    const s = calcularSaldos(
      [{ id: 1, nombre: 'D', tipo: 'debito', saldoInicial: 10000, color: '', archivada: false, orden: 0 }],
      [],
      [{ fecha: '2026-10-01', monto: 3000, cuentaId: 1 }, { fecha: '2026-10-02', monto: -1000, cuentaId: 1 }],
    );
    expect(s.get(1)).toBe(8000);
  });
});

describe('respaldo', () => {
  it('ida y vuelta', () => {
    const datos = { cuentas: [], categorias: [], movimientos: [mov({})], recurrentes: [], pendientes: [], presupuestos: [], tarjetas: [], msi: [], metas: [], ajustes: [] };
    const r = validarRespaldo(JSON.parse(JSON.stringify(crearRespaldo(datos))));
    expect(r.datos.movimientos).toHaveLength(1);
  });
  it('rechaza archivos ajenos o dañados', () => {
    expect(() => validarRespaldo({ hola: 1 })).toThrow('no es un respaldo de SynapFinanzas');
    expect(() => validarRespaldo({ formato: 'synapfinanzas-respaldo', version: 1, datos: { movimientos: [{ monto: 1.5, fecha: '2026-01-01' }] } })).toThrow('inválidos');
    expect(() => validarRespaldo({ formato: 'synapfinanzas-respaldo', version: 99, datos: {} })).toThrow('más nueva');
  });
});
