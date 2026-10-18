import { describe, expect, it } from 'vitest';
import { desplazarPeriodo, etiquetaDia, etiquetaPeriodo, rangoPeriodo, sumarDias } from './fechas';

describe('rangoPeriodo', () => {
  it('semana inicia en lunes', () => {
    // 18 oct 2026 es domingo
    expect(rangoPeriodo('semana', '2026-10-18')).toEqual({ inicio: '2026-10-12', fin: '2026-10-18' });
    expect(rangoPeriodo('semana', '2026-10-19')).toEqual({ inicio: '2026-10-19', fin: '2026-10-25' });
  });
  it('mes y año', () => {
    expect(rangoPeriodo('mes', '2028-02-10')).toEqual({ inicio: '2028-02-01', fin: '2028-02-29' });
    expect(rangoPeriodo('anio', '2026-06-01')).toEqual({ inicio: '2026-01-01', fin: '2026-12-31' });
  });
});

describe('desplazarPeriodo', () => {
  it('navega entre periodos', () => {
    expect(desplazarPeriodo('mes', '2026-01-31', 1)).toBe('2026-02-28');
    expect(desplazarPeriodo('dia', '2026-12-31', 1)).toBe('2027-01-01');
    expect(desplazarPeriodo('semana', '2026-10-18', -1)).toBe('2026-10-11');
  });
  it('sumarDias cruza cambio de horario sin corrimiento', () => {
    expect(sumarDias('2026-04-04', 1)).toBe('2026-04-05');
    expect(sumarDias('2026-11-01', 1)).toBe('2026-11-02');
  });
});

describe('etiquetas', () => {
  it('en español', () => {
    expect(etiquetaPeriodo('mes', '2026-09-03')).toBe('Septiembre 2026');
    expect(etiquetaDia('2026-10-18', '2026-10-18')).toBe('Hoy');
    expect(etiquetaDia('2026-10-17', '2026-10-18')).toBe('Ayer');
    expect(etiquetaDia('2026-10-13', '2026-10-18')).toBe('Martes 13 de octubre');
  });
});
