// Generador determinista de datos de ejemplo (solo para probar la app).
import type { Categoria, Cuenta, Movimiento } from './tipos';
import { aISO, deISO, sumarDias } from './fechas';

function aleatorio(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

interface PatronGasto {
  categoria: string;
  porSemana: number;
  min: number;
  max: number;
  notas: string[];
}

const PATRONES: PatronGasto[] = [
  { categoria: 'Comida', porSemana: 5, min: 60, max: 420, notas: ['Tacos', 'Cafetería', 'Cena', 'Desayuno', ''] },
  { categoria: 'Súper', porSemana: 1.2, min: 450, max: 2200, notas: ['Súper de la semana', ''] },
  { categoria: 'Gasolina', porSemana: 1, min: 500, max: 1100, notas: [''] },
  { categoria: 'Transporte', porSemana: 2, min: 40, max: 180, notas: ['Uber', 'Estacionamiento', ''] },
  { categoria: 'Entretenimiento', porSemana: 0.6, min: 150, max: 900, notas: ['Cine', 'Salida', ''] },
  { categoria: 'Ropa', porSemana: 0.2, min: 400, max: 2500, notas: [''] },
  { categoria: 'Salud', porSemana: 0.15, min: 250, max: 1800, notas: ['Farmacia', 'Consulta'] },
  { categoria: 'Regalos', porSemana: 0.1, min: 300, max: 1500, notas: [''] },
];

export function generarDemo(
  categorias: readonly Categoria[],
  cuentas: readonly Cuenta[],
  hoy: string,
  meses = 12,
): Movimiento[] {
  const r = aleatorio(20261018);
  const porNombre = new Map(categorias.map((c) => [c.nombre, c.id!]));
  const ids = cuentas.filter((c) => !c.archivada).map((c) => c.id!);
  const debito = cuentas.find((c) => c.tipo === 'debito')?.id ?? ids[0];
  const efectivo = cuentas.find((c) => c.tipo === 'efectivo')?.id ?? ids[0];
  const movs: Movimiento[] = [];
  let creado = Date.now() - 1e9;

  const inicio = deISO(hoy);
  inicio.setMonth(inicio.getMonth() - meses);
  let fecha = aISO(inicio);

  const agregar = (p: Partial<Movimiento> & Pick<Movimiento, 'tipo' | 'monto'>) => {
    movs.push({
      fecha, categoriaId: null, cuentaId: debito, cuentaDestinoId: null, nota: '',
      recurrenteId: null, msiId: null, creado: creado++, demo: 1, ...p,
    });
  };

  while (fecha <= hoy) {
    const dia = Number(fecha.slice(8, 10));
    if (dia === 15 || dia === 30) {
      agregar({ tipo: 'ingreso', monto: 1850000, categoriaId: porNombre.get('Sueldo') ?? null, nota: 'Quincena' });
    }
    if (dia === 1) {
      agregar({ tipo: 'gasto', monto: 950000, categoriaId: porNombre.get('Renta') ?? null, nota: 'Renta' });
      agregar({ tipo: 'gasto', monto: 29900, categoriaId: porNombre.get('Suscripciones') ?? null, nota: 'Streaming' });
    }
    if (dia === 8) {
      agregar({ tipo: 'gasto', monto: Math.round(80000 + r() * 70000), categoriaId: porNombre.get('Servicios') ?? null, nota: 'Luz e internet' });
    }
    if (r() < 0.12) {
      agregar({ tipo: 'ingreso', monto: Math.round((2500 + r() * 4500) * 100), categoriaId: porNombre.get('Guardias y extras') ?? null, nota: 'Guardia' });
    }
    if (dia === 5 || dia === 20) {
      agregar({ tipo: 'transferencia', monto: 250000, cuentaId: debito, cuentaDestinoId: efectivo, nota: 'Retiro cajero' });
    }
    for (const p of PATRONES) {
      const prob = p.porSemana / 7;
      let veces = Math.floor(prob) + (r() < prob % 1 ? 1 : 0);
      while (veces-- > 0) {
        const pesos = p.min + r() * (p.max - p.min);
        agregar({
          tipo: 'gasto',
          monto: Math.round(pesos) * 100 + (r() < 0.3 ? Math.round(r() * 99) : 0),
          categoriaId: porNombre.get(p.categoria) ?? null,
          cuentaId: r() < 0.2 ? efectivo : debito,
          nota: p.notas[Math.floor(r() * p.notas.length)],
        });
      }
    }
    fecha = sumarDias(fecha, 1);
  }
  return movs;
}
