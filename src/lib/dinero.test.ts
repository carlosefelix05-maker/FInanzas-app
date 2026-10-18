import { describe, expect, it } from 'vitest';
import { aplicarTecla, centavosATexto, formatearMonto, pesosACentavos, textoACentavos, textoTecladoVisible } from './dinero';

describe('formatearMonto', () => {
  it('usa formato es-MX', () => {
    expect(formatearMonto(123456)).toBe('$1,234.56');
    expect(formatearMonto(0)).toBe('$0.00');
    expect(formatearMonto(-5000)).toBe('-$50.00');
    expect(formatearMonto(5000, { signo: true })).toBe('+$50.00');
    expect(formatearMonto(123456, { sinCentavos: true })).toBe('$1,235');
  });
});

describe('conversiones', () => {
  it('evita errores de punto flotante', () => {
    expect(pesosACentavos(0.1 + 0.2)).toBe(30);
    expect(textoACentavos('19.99')).toBe(1999);
    expect(textoACentavos('0.07')).toBe(7);
    expect(textoACentavos('12.5')).toBe(1250);
    expect(textoACentavos('12.')).toBe(1200);
    expect(textoACentavos('')).toBe(0);
  });
  it('centavosATexto es inverso', () => {
    for (const c of [0, 7, 70, 1250, 1999, 100000, 123456]) {
      expect(textoACentavos(centavosATexto(c))).toBe(c);
    }
  });
});

describe('aplicarTecla', () => {
  const teclear = (s: string) => [...s].reduce((t, k) => aplicarTecla(t, (k === '<' ? 'borrar' : k) as never), '');
  it('construye montos', () => {
    expect(teclear('125')).toBe('125');
    expect(teclear('.5')).toBe('0.5');
    expect(teclear('1.234')).toBe('1.23');
    expect(teclear('1..2')).toBe('1.2');
    expect(teclear('007')).toBe('7');
    expect(teclear('12<')).toBe('1');
    expect(teclear('123456789')).toBe('12345678');
  });
  it('muestra separadores', () => {
    expect(textoTecladoVisible('')).toBe('$0');
    expect(textoTecladoVisible('1234.5')).toBe('$1,234.5');
  });
});
