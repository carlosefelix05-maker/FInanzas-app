/** Barra de progreso. `nivel` decide el color: azul normal, naranja alerta, rojo excedido. */
export function BarraProgreso({ porcentaje, nivel = 'ok', color, etiqueta }: {
  porcentaje: number;
  nivel?: 'ok' | 'alerta' | 'excedido';
  color?: string;
  etiqueta: string;
}) {
  const ancho = Math.max(0, Math.min(100, porcentaje));
  const fondo = color ?? (nivel === 'excedido' ? 'var(--gasto)' : nivel === 'alerta' ? 'var(--naranja)' : 'var(--azul)');
  return (
    <div className="barra" role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(porcentaje)}>
      <div className="barra-relleno" style={{ width: `${ancho}%`, background: fondo }} />
    </div>
  );
}
