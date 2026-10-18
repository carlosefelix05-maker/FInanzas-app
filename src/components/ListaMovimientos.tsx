import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Pencil, Trash2 } from 'lucide-react';
import { FilaMovimiento } from './FilaMovimiento';
import { HojaInferior } from './HojaInferior';
import { useCaptura } from './Captura';
import { useAviso } from './Toast';
import { useScroll } from './Scroll';
import { borrarMovimiento, restaurarMovimiento } from '../db/acciones';
import { useCategorias, useCuentas, useMapa } from '../hooks/datos';
import { formatearMonto } from '../lib/dinero';
import { etiquetaDia } from '../lib/fechas';
import { agruparPorDia } from '../lib/movimientos';
import type { Movimiento } from '../lib/tipos';

type Fila = { tipo: 'dia'; fecha: string; balance: number } | { tipo: 'mov'; mov: Movimiento };

export function useBorrarConDeshacer() {
  const avisar = useAviso();
  return useCallback(
    async (m: Movimiento) => {
      if (m.id == null) return;
      const borrado = await borrarMovimiento(m.id);
      if (borrado) avisar('Movimiento eliminado', { etiqueta: 'Deshacer', alHacer: () => restaurarMovimiento(borrado) });
    },
    [avisar],
  );
}

/** Lista virtualizada agrupada por día. Soporta decenas de miles de filas. */
export function ListaMovimientos({ movimientos, sinTotalesDia }: {
  movimientos: Movimiento[];
  /** Oculta el total por día (cuando la lista no incluye todos los movimientos del día). */
  sinTotalesDia?: boolean;
}) {
  const categorias = useMapa(useCategorias());
  const cuentas = useMapa(useCuentas());
  const abrirCaptura = useCaptura();
  const borrar = useBorrarConDeshacer();
  const [menu, setMenu] = useState<Movimiento | null>(null);
  const scrollRef = useScroll();
  const listaRef = useRef<HTMLDivElement>(null);
  const [margen, setMargen] = useState(0);

  const filas = useMemo<Fila[]>(() => {
    const out: Fila[] = [];
    for (const g of agruparPorDia(movimientos)) {
      out.push({ tipo: 'dia', fecha: g.fecha, balance: g.totales.balance });
      for (const m of g.movimientos) out.push({ tipo: 'mov', mov: m });
    }
    return out;
  }, [movimientos]);

  useLayoutEffect(() => {
    setMargen(listaRef.current?.offsetTop ?? 0);
  });

  const virtual = useVirtualizer({
    count: filas.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (filas[i].tipo === 'dia' ? 40 : 64),
    overscan: 10,
    scrollMargin: margen,
    getItemKey: (i) => {
      const f = filas[i];
      return f.tipo === 'dia' ? `d${f.fecha}` : `m${f.mov.id}`;
    },
  });

  const alMenu = useCallback((m: Movimiento) => setMenu(m), []);
  const cerrarMenu = useCallback(() => setMenu(null), []);

  return (
    <>
      <div ref={listaRef} className="lista-mov" style={{ height: virtual.getTotalSize(), position: 'relative' }}>
        {virtual.getVirtualItems().map((v) => {
          const f = filas[v.index];
          return (
            <div
              key={v.key}
              data-index={v.index}
              ref={virtual.measureElement}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${v.start - margen}px)` }}
            >
              {f.tipo === 'dia' ? (
                <div className="dia-encabezado">
                  <span>{etiquetaDia(f.fecha)}</span>
                  {!sinTotalesDia && <span className="num">{formatearMonto(f.balance, { signo: true })}</span>}
                </div>
              ) : (
                <FilaMovimiento
                  mov={f.mov}
                  categoria={f.mov.categoriaId != null ? categorias.get(f.mov.categoriaId) : undefined}
                  cuenta={cuentas.get(f.mov.cuentaId)}
                  destino={f.mov.cuentaDestinoId != null ? cuentas.get(f.mov.cuentaDestinoId) : undefined}
                  alEditar={abrirCaptura}
                  alBorrar={borrar}
                  alMenu={alMenu}
                />
              )}
            </div>
          );
        })}
      </div>
      <HojaInferior abierta={!!menu} alCerrar={cerrarMenu} etiqueta="Opciones del movimiento">
        <div className="menu-acciones">
          <button
            className="menu-accion"
            onClick={() => {
              const m = menu!;
              setMenu(null);
              abrirCaptura(m);
            }}
          >
            <Pencil size={20} /> Editar
          </button>
          <button
            className="menu-accion peligro"
            onClick={() => {
              const m = menu!;
              setMenu(null);
              borrar(m);
            }}
          >
            <Trash2 size={20} /> Eliminar
          </button>
          <button className="btn btn-secundario btn-bloque" onClick={cerrarMenu}>Cancelar</button>
        </div>
      </HojaInferior>
    </>
  );
}
