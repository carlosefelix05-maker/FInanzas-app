// Tipos del dominio. Todos los montos son centavos enteros (MXN).
// Todas las fechas son cadenas locales 'YYYY-MM-DD'.

export type TipoCuenta = 'efectivo' | 'debito' | 'credito';
export type TipoCategoria = 'ingreso' | 'gasto';
export type TipoMovimiento = 'ingreso' | 'gasto' | 'transferencia';
export type Frecuencia = 'semanal' | 'quincenal' | 'mensual' | 'anual' | 'dias';

export interface Cuenta {
  id?: number;
  nombre: string;
  tipo: TipoCuenta;
  saldoInicial: number;
  color: string;
  archivada: boolean;
  orden: number;
}

export interface Categoria {
  id?: number;
  nombre: string;
  tipo: TipoCategoria;
  icono: string;
  color: string;
  padreId: number | null;
  orden: number;
  archivada: boolean;
}

export interface Movimiento {
  id?: number;
  tipo: TipoMovimiento;
  monto: number;
  fecha: string;
  categoriaId: number | null;
  cuentaId: number;
  cuentaDestinoId: number | null;
  nota: string;
  recurrenteId: number | null;
  msiId: number | null;
  /** Marca de creación (ms) para ordenar dentro del mismo día. */
  creado: number;
  /** 1 si proviene de los datos de ejemplo. */
  demo?: 1;
}

export type PlantillaMovimiento = Omit<Movimiento, 'id' | 'fecha' | 'recurrenteId' | 'msiId' | 'creado' | 'demo'>;

export interface Recurrente {
  id?: number;
  plantilla: PlantillaMovimiento;
  frecuencia: Frecuencia;
  cadaNDias?: number;
  proximaFecha: string;
  activo: boolean;
}

export interface Presupuesto {
  id?: number;
  categoriaId: number;
  montoMensual: number;
}

export interface Tarjeta {
  cuentaId: number;
  limite: number;
  diaCorte: number;
  diaLimitePago: number;
}

export interface Msi {
  id?: number;
  tarjetaId: number;
  descripcion: string;
  montoTotal: number;
  meses: number;
  fechaPrimeraCuota: string;
  cuotasPagadas: number;
}

export interface Aportacion {
  fecha: string;
  monto: number;
  cuentaId: number;
}

export interface Meta {
  id?: number;
  nombre: string;
  montoObjetivo: number;
  fechaObjetivo: string | null;
  color: string;
  aportaciones: Aportacion[];
}

export interface Ajuste {
  clave: string;
  valor: unknown;
}
