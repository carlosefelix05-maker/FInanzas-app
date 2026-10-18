import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  abierta: boolean;
  alCerrar: () => void;
  etiqueta: string;
  children: ReactNode;
}

/**
 * Hoja inferior modal (bottom sheet).
 * Se monta en <body> con un portal: dentro del área con scroll, iOS Safari puede recortar
 * los elementos fijos y dejar el botón Guardar detrás de la barra de navegación.
 */
export function HojaInferior({ abierta, alCerrar, etiqueta, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierta) return;
    const previo = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
      previo?.focus?.();
    };
  }, [abierta, alCerrar]);

  if (!abierta) return null;
  return createPortal(
    <div className="hoja-fondo" onClick={alCerrar}>
      <div
        className="hoja"
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hoja-asa" aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
