import { describe, expect, it } from 'vitest';
import { planMeta } from './metas';
import type { Meta } from './tipos';

const meta = (p: Partial<Meta>): Meta => ({
  nombre: 'Viaje', montoObjetivo: 1200000, fechaObjetivo: '2027-10-18', color: '#000', aportaciones: [], creada: '2026-10-18', ...p,
});

describe('planMeta', () => {
  it('sin fecha objetivo', () => {
    const p = planMeta(meta({ fechaObjetivo: null, aportaciones: [{ fecha: '2026-10-18', monto: 300000, cuentaId: 1 }] }), '2026-10-18');
    expect(p.porcentaje).toBe(25);
    expect(p.faltante).toBe(900000);
    expect(p.plan).toBeNull();
  });
  it('calcula ahorro mensual y quincenal', () => {
    const p = planMeta(meta({}), '2026-10-18');
    expect(p.plan!.mesesRestantes).toBe(12);
    expect(p.plan!.porMes).toBe(100000);
    expect(p.plan!.porQuincena).toBe(50000);
  });
  it('detecta adelanto y atraso', () => {
    const hoy = '2027-04-18'; // mitad del plazo: esperado ≈ 600,000
    const ad = planMeta(meta({ aportaciones: [{ fecha: hoy, monto: 800000, cuentaId: 1 }] }), hoy);
    const at = planMeta(meta({ aportaciones: [{ fecha: hoy, monto: 300000, cuentaId: 1 }] }), hoy);
    expect(ad.plan!.estado).toBe('adelantado');
    expect(at.plan!.estado).toBe('atrasado');
  });
  it('retiros restan', () => {
    const p = planMeta(meta({ aportaciones: [{ fecha: '2026-10-18', monto: 500000, cuentaId: 1 }, { fecha: '2026-10-19', monto: -200000, cuentaId: 1 }] }), '2026-10-20');
    expect(p.ahorrado).toBe(300000);
  });
});
