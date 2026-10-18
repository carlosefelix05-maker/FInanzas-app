import type { Categoria, Cuenta } from '../lib/tipos';

type SemillaCategoria = Omit<Categoria, 'id' | 'padreId' | 'orden' | 'archivada'>;

export const CATEGORIAS_GASTO: SemillaCategoria[] = [
  { nombre: 'Comida', tipo: 'gasto', icono: 'utensils', color: '#C0703F' },
  { nombre: 'Súper', tipo: 'gasto', icono: 'shopping-cart', color: '#4F8A6E' },
  { nombre: 'Gasolina', tipo: 'gasto', icono: 'fuel', color: '#8A6A3B' },
  { nombre: 'Transporte', tipo: 'gasto', icono: 'bus', color: '#4E6E9A' },
  { nombre: 'Renta', tipo: 'gasto', icono: 'house', color: '#6B5B95' },
  { nombre: 'Servicios', tipo: 'gasto', icono: 'zap', color: '#B08A2E' },
  { nombre: 'Salud', tipo: 'gasto', icono: 'heart-pulse', color: '#A64B5A' },
  { nombre: 'Educación y cursos', tipo: 'gasto', icono: 'graduation-cap', color: '#3E7CB1' },
  { nombre: 'Congresos', tipo: 'gasto', icono: 'presentation', color: '#5A7F8F' },
  { nombre: 'Suscripciones', tipo: 'gasto', icono: 'repeat', color: '#7A6FA8' },
  { nombre: 'Ropa', tipo: 'gasto', icono: 'shirt', color: '#9A6B7F' },
  { nombre: 'Entretenimiento', tipo: 'gasto', icono: 'clapperboard', color: '#5B8C8C' },
  { nombre: 'Regalos', tipo: 'gasto', icono: 'gift', color: '#B0596F' },
  { nombre: 'Otros gastos', tipo: 'gasto', icono: 'ellipsis', color: '#707B87' },
];

export const CATEGORIAS_INGRESO: SemillaCategoria[] = [
  { nombre: 'Sueldo', tipo: 'ingreso', icono: 'briefcase', color: '#2E7D5B' },
  { nombre: 'Guardias y extras', tipo: 'ingreso', icono: 'stethoscope', color: '#3B7A8C' },
  { nombre: 'Negocio', tipo: 'ingreso', icono: 'store', color: '#5E7F4A' },
  { nombre: 'Otros ingresos', tipo: 'ingreso', icono: 'circle-plus', color: '#707B87' },
];

export const CUENTAS_INICIALES: Omit<Cuenta, 'id'>[] = [
  { nombre: 'Efectivo', tipo: 'efectivo', saldoInicial: 0, color: '#2E7D5B', archivada: false, orden: 0 },
  { nombre: 'Débito', tipo: 'debito', saldoInicial: 0, color: '#1A3A5C', archivada: false, orden: 1 },
];

export function categoriasIniciales(): Omit<Categoria, 'id'>[] {
  return [...CATEGORIAS_GASTO, ...CATEGORIAS_INGRESO].map((c, i) => ({
    ...c,
    padreId: null,
    orden: i,
    archivada: false,
  }));
}
