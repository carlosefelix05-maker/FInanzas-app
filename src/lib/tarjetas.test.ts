import { describe, expect, it } from 'vitest';
import { cuotasPorCargar, estadoTarjeta, limitePagoDeCorte, montoCuota, proximoCorte, resumenMsi, ultimoCorte } from './tarjetas';
import type { Movimiento, Msi, Tarjeta } from './tipos';

let n = 0;
const mov = (p: Partial<Movimiento>): Movimiento => ({
  tipo: 'gasto', monto: 100, fecha: '2026-10-01', categoriaId: 1, cuentaId: 9, cuentaDestinoId: null,
  nota: '', recurrenteId: null, msiId: null, creado: n++, ...p,
});
const msi = (p: Partial<Msi>): Msi => ({
  tarjetaId: 9, descripcion: 'Laptop', montoTotal: 1200000, meses: 12, fechaPrimeraCuota: '2026-09-10',
  cuotasPagadas: 0, categoriaId: 1, ...p,
});

describe('cortes y fechas límite', () => {
  it('calcula cortes con ajuste a fin de mes', () => {
    expect(ultimoCorte(5, '2026-10-18')).toBe('2026-10-05');
    expect(proximoCorte(5, '2026-10-18')).toBe('2026-11-05');
    expect(ultimoCorte(31, '2026-11-15')).toBe('2026-10-31');
    expect(proximoCorte(31, '2026-11-15')).toBe('2026-11-30');
    expect(ultimoCorte(18, '2026-10-18')).toBe('2026-10-18');
  });
  it('fecha límite después del corte', () => {
    expect(limitePagoDeCorte('2026-10-05', 25)).toBe('2026-10-25');
    expect(limitePagoDeCorte('2026-10-20', 10)).toBe('2026-11-10');
  });
});

describe('MSI', () => {
  it('reparte centavos sin perder', () => {
    const total = 100000;
    const cuotas = Array.from({ length: 3 }, (_, i) => montoCuota(total, 3, i));
    expect(cuotas).toEqual([33333, 33333, 33334]);
    expect(cuotas.reduce((a, b) => a + b)).toBe(total);
  });
  it('cuotas por cargar y resumen', () => {
    const m = msi({});
    expect(cuotasPorCargar(m, '2026-10-18').map((c) => c.fecha)).toEqual(['2026-09-10', '2026-10-10']);
    const r = resumenMsi({ ...m, cuotasPagadas: 2 });
    expect(r).toEqual({ cuota: 100000, restantes: 10, pendiente: 1000000, proximaFecha: '2026-11-10' });
  });
});

describe('estadoTarjeta', () => {
  const t: Tarjeta = { cuentaId: 9, limite: 5000000, diaCorte: 5, diaLimitePago: 25 };
  it('calcula uso, periodo y pago sin intereses', () => {
    const movs = [
      mov({ fecha: '2026-09-20', monto: 300000 }), // antes del corte del 5 oct
      mov({ fecha: '2026-10-02', monto: 200000 }),
      mov({ fecha: '2026-10-10', monto: 50000 }), // periodo actual
      mov({ tipo: 'transferencia', fecha: '2026-10-12', monto: 100000, cuentaId: 1, cuentaDestinoId: 9 }), // pago
    ];
    const e = estadoTarjeta(t, 0, movs, [msi({ cuotasPagadas: 2 })], '2026-10-21');
    expect(e.deuda).toBe(450000);
    expect(e.pendienteMsi).toBe(1000000);
    expect(e.usado).toBe(1450000);
    expect(e.disponible).toBe(3550000);
    expect(e.porcentajeUso).toBe(29);
    expect(e.montoPeriodo).toBe(50000);
    expect(e.pagoSinIntereses).toBe(400000);
    expect(e.fechaLimitePago).toBe('2026-10-25');
    expect(e.diasAlLimite).toBe(4);
    expect(e.pagoProximo).toBe(true);
    expect(e.diasAlCorte).toBe(15);
  });
  it('después de la fecha límite muestra la siguiente', () => {
    const e = estadoTarjeta(t, 0, [], [], '2026-10-28');
    expect(e.fechaLimitePago).toBe('2026-11-25');
    expect(e.pagoProximo).toBe(false);
  });
});
