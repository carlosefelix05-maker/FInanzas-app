// Utilidades de dinero. Internamente todo son centavos enteros.

const formato = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoCorto = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 123456 → "$1,234.56". Los negativos se muestran como "-$1,234.56". */
export function formatearMonto(centavos: number, opciones: { signo?: boolean; sinCentavos?: boolean } = {}): string {
  const abs = Math.abs(centavos);
  const f = opciones.sinCentavos ? formatoCorto : formato;
  const texto = f.format(abs / 100);
  if (centavos < 0) return `-${texto}`;
  if (opciones.signo && centavos > 0) return `+${texto}`;
  return texto;
}

/** Convierte un número en pesos (p. ej. 12.5) a centavos sin errores de punto flotante. */
export function pesosACentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/**
 * Convierte el texto del teclado ("1250.5", "0.07", "") a centavos.
 * Nunca usa aritmética de punto flotante sobre la parte decimal.
 */
export function textoACentavos(texto: string): number {
  if (!texto || texto === '.') return 0;
  const [entero = '', decimal = ''] = texto.split('.');
  const pesos = parseInt(entero || '0', 10);
  const cent = parseInt((decimal + '00').slice(0, 2), 10);
  return pesos * 100 + cent;
}

/** Inverso de textoACentavos para precargar el teclado al editar. */
export function centavosATexto(centavos: number): string {
  if (!centavos) return '';
  const pesos = Math.floor(centavos / 100);
  const cent = centavos % 100;
  if (cent === 0) return String(pesos);
  if (cent % 10 === 0) return `${pesos}.${cent / 10}`;
  return `${pesos}.${String(cent).padStart(2, '0')}`;
}

export type TeclaMonto = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'borrar';

/** Máximo $99,999,999.99 */
const MAX_DIGITOS_ENTEROS = 8;

/** Aplica una tecla del teclado numérico al texto actual. */
export function aplicarTecla(texto: string, tecla: TeclaMonto): string {
  if (tecla === 'borrar') return texto.slice(0, -1);
  if (tecla === '.') {
    if (texto.includes('.')) return texto;
    return (texto || '0') + '.';
  }
  const [entero, decimal] = texto.split('.');
  if (decimal !== undefined) {
    if (decimal.length >= 2) return texto;
    return texto + tecla;
  }
  if (entero === '0') return tecla; // evita "05"
  if (entero.length >= MAX_DIGITOS_ENTEROS) return texto;
  return texto + tecla;
}

/** Muestra el texto del teclado con separadores de miles, sin forzar decimales. */
export function textoTecladoVisible(texto: string): string {
  if (!texto) return '$0';
  const [entero, decimal] = texto.split('.');
  const conComas = parseInt(entero || '0', 10).toLocaleString('es-MX');
  return decimal !== undefined ? `$${conComas}.${decimal}` : `$${conComas}`;
}
