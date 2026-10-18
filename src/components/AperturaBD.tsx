import { useEffect, useState, type ReactNode } from 'react';
import { abrirBD, type EstadoBD } from '../db/db';

const ESPERA_AVISO_MS = 4000;

/** No dibuja la app hasta que la base de datos abre; si tarda o falla, explica qué hacer. */
export function AperturaBD({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoBD>({ tipo: 'abriendo' });
  const [tarda, setTarda] = useState(false);

  useEffect(() => {
    abrirBD(setEstado);
    const t = window.setTimeout(() => setTarda(true), ESPERA_AVISO_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (estado.tipo === 'lista') return <>{children}</>;
  if (estado.tipo === 'abriendo' && !tarda) return null;

  return (
    <div className="error-app">
      <h1>{estado.tipo === 'error' ? 'No se pudo abrir tus datos' : 'Tus datos tardan en abrir'}</h1>
      {estado.tipo === 'bloqueada' && (
        <p>Hay otra pestaña o ventana de SynapFinanzas con una versión anterior abierta. Ciérrala y toca Reintentar.</p>
      )}
      <p>Prueba esto:</p>
      <ol>
        <li>Cierra las demás pestañas de SynapFinanzas.</li>
        <li>Cierra el navegador por completo (desliza hacia arriba en el selector de apps) y vuelve a abrirlo.</li>
        <li>Si usas modo incógnito, ábrela en una pestaña normal.</li>
      </ol>
      <p>Tus datos no se han borrado.</p>
      <button className="btn btn-primario btn-bloque" onClick={() => location.reload()}>Reintentar</button>
      {estado.tipo === 'error' && <pre className="error-detalle">{estado.mensaje}</pre>}
    </div>
  );
}
