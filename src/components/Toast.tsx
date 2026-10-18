import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface Aviso {
  id: number;
  texto: string;
  accion?: { etiqueta: string; alHacer: () => void };
}

const Ctx = createContext<(texto: string, accion?: Aviso['accion']) => void>(() => {});

export function useAviso() {
  return useContext(Ctx);
}

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const temporizador = useRef<number>(undefined);

  const mostrar = useCallback((texto: string, accion?: Aviso['accion']) => {
    window.clearTimeout(temporizador.current);
    setAviso({ id: Date.now(), texto, accion });
  }, []);

  useEffect(() => {
    if (!aviso) return;
    temporizador.current = window.setTimeout(() => setAviso(null), aviso.accion ? 6000 : 2500);
    return () => window.clearTimeout(temporizador.current);
  }, [aviso]);

  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div className="toast-zona" aria-live="polite">
        {aviso && (
          <div className="toast" key={aviso.id}>
            <span>{aviso.texto}</span>
            {aviso.accion && (
              <button
                className="toast-accion"
                onClick={() => {
                  aviso.accion!.alHacer();
                  setAviso(null);
                }}
              >
                {aviso.accion.etiqueta}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
