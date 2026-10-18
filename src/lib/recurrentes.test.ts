import { describe, expect, it } from 'vitest';
import { fechasVencidas, ocurrencia, proximasOcurrencias } from './recurrentes';
import type { Recurrente } from './tipos';

const rec = (p: Partial<Recurrente>): Recurrente => ({
  plantilla: { tipo: 'gasto', monto: 100, categoriaId: 1, cuentaId: 1, cuentaDestinoId: null, nota: '' },
  frecuencia: 'mensual', inicio: '2026-01-31', generadas: 0, proximaFecha: '2026-01-31', activo: true, ...p,
});

describe('ocurrencia', () => {
  it('mensual conserva el día 31', () => {
    expect([0, 1, 2, 3].map((n) => ocurrencia('2026-01-31', 'mensual', n))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });
  it('quincenal 15 y fin de mes', () => {
    expect([0, 1, 2, 3].map((n) => ocurrencia('2026-01-15', 'quincenal', n))).toEqual(['2026-01-15', '2026-01-30', '2026-02-15', '2026-02-28']);
    expect([0, 1, 2].map((n) => ocurrencia('2026-01-30', 'quincenal', n))).toEqual(['2026-01-30', '2026-02-15', '2026-02-28']);
  });
  it('semanal, anual y cada N días', () => {
    expect(ocurrencia('2026-10-18', 'semanal', 2)).toBe('2026-11-01');
    expect(ocurrencia('2028-02-29', 'anual', 1)).toBe('2029-02-28');
    expect(ocurrencia('2026-10-01', 'dias', 3, 10)).toBe('2026-10-31');
  });
});

describe('fechasVencidas y próximas', () => {
  it('devuelve solo las no generadas hasta hoy', () => {
    expect(fechasVencidas(rec({ generadas: 1 }), '2026-04-01')).toEqual(['2026-02-28', '2026-03-31']);
  });
  it('próximos 30 días', () => {
    const r = rec({ inicio: '2026-10-01', frecuencia: 'semanal', generadas: 3 });
    expect(proximasOcurrencias(r, '2026-10-18', 30)).toEqual(['2026-10-22', '2026-10-29', '2026-11-05', '2026-11-12']);
    expect(proximasOcurrencias({ ...r, activo: false }, '2026-10-18')).toEqual([]);
  });
});
