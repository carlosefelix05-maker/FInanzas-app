import { memo, useRef, useState, type PointerEvent } from 'react';
import { ArrowLeftRight, Trash2 } from 'lucide-react';
import { IconoCategoria } from './iconos';
import { formatearMonto } from '../lib/dinero';
import type { Categoria, Cuenta, Movimiento } from '../lib/tipos';

const UMBRAL_BORRAR = 96;
const DURACION_TOQUE_LARGO = 480;

interface Props {
  mov: Movimiento;
  categoria?: Categoria;
  cuenta?: Cuenta;
  destino?: Cuenta;
  alEditar: (m: Movimiento) => void;
  alBorrar: (m: Movimiento) => void;
  alMenu: (m: Movimiento) => void;
}

export const FilaMovimiento = memo(function FilaMovimiento({ mov, categoria, cuenta, destino, alEditar, alBorrar, alMenu }: Props) {
  const [dx, setDx] = useState(0);
  const [animando, setAnimando] = useState(false);
  const gesto = useRef<{ x: number; y: number; modo: 'nada' | 'horizontal' | 'vertical'; largo: boolean; t?: number } | null>(null);

  const terminarTemporizador = () => {
    if (gesto.current?.t) window.clearTimeout(gesto.current.t);
  };

  const alBajar = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gesto.current = { x: e.clientX, y: e.clientY, modo: 'nada', largo: false };
    gesto.current.t = window.setTimeout(() => {
      if (gesto.current && gesto.current.modo === 'nada') {
        gesto.current.largo = true;
        navigator.vibrate?.(10);
        alMenu(mov);
      }
    }, DURACION_TOQUE_LARGO);
  };

  const alMover = (e: PointerEvent) => {
    const g = gesto.current;
    if (!g) return;
    const mx = e.clientX - g.x;
    const my = e.clientY - g.y;
    if (g.modo === 'nada' && Math.hypot(mx, my) > 8) {
      terminarTemporizador();
      g.modo = Math.abs(mx) > Math.abs(my) ? 'horizontal' : 'vertical';
      if (g.modo === 'horizontal') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (g.modo === 'horizontal') {
      setAnimando(false);
      setDx(Math.min(0, mx));
    }
  };

  const alSoltar = () => {
    const g = gesto.current;
    terminarTemporizador();
    gesto.current = null;
    if (!g) return;
    if (g.modo === 'horizontal') {
      setAnimando(true);
      if (dx < -UMBRAL_BORRAR) {
        setDx(-window.innerWidth);
        window.setTimeout(() => alBorrar(mov), 160);
      } else {
        setDx(0);
      }
      return;
    }
    if (g.modo === 'nada' && !g.largo) alEditar(mov);
  };

  const cancelar = () => {
    terminarTemporizador();
    gesto.current = null;
    setAnimando(true);
    setDx(0);
  };

  const esTransfer = mov.tipo === 'transferencia';
  const titulo = esTransfer ? 'Transferencia' : (categoria?.nombre ?? 'Sin categoría');
  const detalle = esTransfer
    ? `${cuenta?.nombre ?? '—'} → ${destino?.nombre ?? '—'}`
    : [mov.nota, cuenta?.nombre].filter(Boolean).join(' · ');
  const claseMonto = mov.tipo === 'ingreso' ? 'monto-ingreso' : mov.tipo === 'gasto' ? 'monto-gasto' : '';
  const signo = mov.tipo === 'ingreso' ? mov.monto : mov.tipo === 'gasto' ? -mov.monto : mov.monto;

  return (
    <div className="fila-mov-envoltura">
      <div className="fila-mov-fondo" aria-hidden="true" style={{ opacity: dx < -8 ? 1 : 0 }}>
        <Trash2 size={20} />
        <span>Eliminar</span>
      </div>
      <div
        className="fila-mov"
        role="button"
        tabIndex={0}
        aria-label={`${titulo}, ${formatearMonto(mov.monto)}. Toca para editar, mantén presionado para más opciones.`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: animando ? 'transform 0.18s ease-out' : 'none' }}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={cancelar}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') alEditar(mov);
          if (e.key === 'Delete' || e.key === 'Backspace') alBorrar(mov);
        }}
      >
        {esTransfer ? (
          <span className="icono-cat" style={{ background: 'var(--azul-suave)', color: 'var(--azul)' }} aria-hidden="true">
            <ArrowLeftRight size={20} strokeWidth={1.75} />
          </span>
        ) : (
          <IconoCategoria icono={categoria?.icono ?? 'tag'} color={categoria?.color ?? '#707B87'} />
        )}
        <div className="fila-mov-texto">
          <div className="fila-mov-titulo">{titulo}</div>
          {detalle && <div className="fila-mov-detalle">{detalle}</div>}
        </div>
        <div className={`fila-mov-monto num ${claseMonto}`}>
          {formatearMonto(signo, { signo: mov.tipo === 'ingreso' })}
        </div>
      </div>
    </div>
  );
});
