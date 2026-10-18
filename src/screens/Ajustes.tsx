import { useEffect, useState } from 'react';
import { Database, HardDrive } from 'lucide-react';
import { useAviso } from '../components/Toast';
import { borrarDatosDemo, cargarDatosDemo, contarDatosDemo } from '../db/acciones';
import { solicitarPersistencia } from '../db/db';

export function Ajustes() {
  const avisar = useAviso();
  const [demo, setDemo] = useState<number | null>(null);
  const [persistente, setPersistente] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const refrescar = () => contarDatosDemo().then(setDemo);
  useEffect(() => {
    refrescar();
    navigator.storage?.persisted?.().then(setPersistente).catch(() => setPersistente(false));
  }, []);

  const cargar = async () => {
    setOcupado(true);
    const n = await cargarDatosDemo();
    setOcupado(false);
    refrescar();
    avisar(`${n.toLocaleString('es-MX')} movimientos de ejemplo cargados`);
  };

  const borrar = async () => {
    if (!window.confirm('¿Borrar todos los movimientos de ejemplo? Tus movimientos reales no se tocan.')) return;
    setOcupado(true);
    const n = await borrarDatosDemo();
    setOcupado(false);
    refrescar();
    avisar(`${n.toLocaleString('es-MX')} movimientos de ejemplo borrados`);
  };

  return (
    <>
      <section className="tarjeta">
        <h2><Database size={18} aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 6 }} />Datos de ejemplo</h2>
        <p className="texto-ayuda">
          Carga un año de movimientos ficticios para explorar la app. Se pueden borrar sin afectar tus datos reales.
        </p>
        <div className="botones">
          <button className="btn btn-secundario" onClick={cargar} disabled={ocupado}>Cargar ejemplo</button>
          <button className="btn btn-peligro" onClick={borrar} disabled={ocupado || !demo}>
            Borrar ejemplo{demo ? ` (${demo.toLocaleString('es-MX')})` : ''}
          </button>
        </div>
      </section>

      <section className="tarjeta">
        <h2><HardDrive size={18} aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 6 }} />Almacenamiento</h2>
        <p className="texto-ayuda">
          Tus datos viven solo en este teléfono. En iPhone, instala la app en la pantalla de inicio
          (Compartir → Agregar a inicio) para que Safari no los borre.
        </p>
        <p className="texto-ayuda">
          Almacenamiento persistente: <strong>{persistente == null ? '…' : persistente ? 'activo' : 'no confirmado'}</strong>
        </p>
        {!persistente && (
          <button className="btn btn-secundario" onClick={async () => setPersistente(await solicitarPersistencia())}>
            Solicitar almacenamiento persistente
          </button>
        )}
        <p className="texto-ayuda" style={{ marginTop: 'var(--esp-3)' }}>Respaldo JSON (exportar/importar): fase 7.</p>
      </section>

      <p className="version">SynapFinanzas · versión {__VERSION__}</p>
    </>
  );
}
