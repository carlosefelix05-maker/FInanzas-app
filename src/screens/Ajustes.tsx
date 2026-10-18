import { useEffect, useRef, useState } from 'react';
import { Bug, ChevronRight, Database, DownloadCloud, HardDrive, PiggyBank, Repeat, Tags, UploadCloud, Wallet } from 'lucide-react';
import { useAviso } from '../components/Toast';
import { Campo, CampoMonto } from '../components/Formularios';
import {
  AJUSTE_ULTIMO_RESPALDO, borrarDatosDemo, cargarDatosDemo, contarDatosDemo, exportarDatos, importarDatos,
} from '../db/acciones';
import { guardarAjuste, solicitarPersistencia } from '../db/db';
import { useAjuste } from '../hooks/datos';
import { AJUSTE_HORMIGA, HORMIGA_PREDETERMINADO, type ConfigHormiga } from '../lib/analisis';
import { nombreArchivoRespaldo } from '../lib/respaldo';
import { diasEntre, etiquetaFechaCorta, hoyISO } from '../lib/fechas';
import type { Pantalla } from '../App';
import { entregarArchivo } from '../components/archivo';

export function Ajustes({ irA }: { irA: (p: Pantalla) => void }) {
  const avisar = useAviso();
  const [demo, setDemo] = useState<number | null>(null);
  const [persistente, setPersistente] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);
  const ultimoRespaldo = useAjuste<string | null>(AJUSTE_ULTIMO_RESPALDO, null);
  const hormiga = useAjuste<ConfigHormiga>(AJUSTE_HORMIGA, HORMIGA_PREDETERMINADO);

  const refrescar = () => contarDatosDemo().then(setDemo);
  useEffect(() => {
    refrescar();
    navigator.storage?.persisted?.().then(setPersistente).catch(() => setPersistente(false));
  }, []);

  const conCarga = async (fn: () => Promise<void>) => {
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      avisar((e as Error).message || 'Algo salió mal');
    } finally {
      setOcupado(false);
      refrescar();
    }
  };

  const exportar = () =>
    conCarga(async () => {
      const respaldo = await exportarDatos();
      const ok = await entregarArchivo(nombreArchivoRespaldo(), JSON.stringify(respaldo));
      if (!ok) return;
      await guardarAjuste(AJUSTE_ULTIMO_RESPALDO, new Date().toISOString());
      avisar(`Respaldo listo: ${respaldo.datos.movimientos.length.toLocaleString('es-MX')} movimientos`);
    });

  const importar = (archivo: File) =>
    conCarga(async () => {
      let json: unknown;
      try {
        json = JSON.parse(await archivo.text());
      } catch {
        throw new Error('El archivo no es un JSON válido.');
      }
      if (!window.confirm('Importar este respaldo REEMPLAZARÁ todos los datos actuales de la app. ¿Continuar?')) return;
      const n = await importarDatos(json);
      avisar(`Respaldo importado: ${n.toLocaleString('es-MX')} movimientos`);
    });

  const diasRespaldo = ultimoRespaldo ? diasEntre(ultimoRespaldo.slice(0, 10), hoyISO()) : null;
  const cambiarHormiga = (p: Partial<ConfigHormiga>) => guardarAjuste(AJUSTE_HORMIGA, { ...hormiga, ...p });

  const enlaces: { p: Pantalla; texto: string; Icono: typeof Tags }[] = [
    { p: 'categorias', texto: 'Categorías', Icono: Tags },
    { p: 'cuentas', texto: 'Cuentas', Icono: Wallet },
    { p: 'recurrentes', texto: 'Movimientos recurrentes', Icono: Repeat },
    { p: 'presupuestos', texto: 'Presupuestos', Icono: PiggyBank },
  ];

  return (
    <>
      <nav className="tarjeta lista-enlaces" aria-label="Configuración">
        {enlaces.map(({ p, texto, Icono }) => (
          <button key={p} className="enlace-fila" onClick={() => irA(p)}>
            <Icono size={20} aria-hidden="true" /> <span>{texto}</span> <ChevronRight size={18} color="var(--naranja)" aria-hidden="true" />
          </button>
        ))}
      </nav>

      <section className="tarjeta">
        <h2><DownloadCloud size={18} aria-hidden="true" className="icono-titulo" />Respaldo</h2>
        <p className="texto-ayuda">
          Tus datos solo viven en este teléfono. Exporta un respaldo con frecuencia y guárdalo en Archivos, iCloud Drive o
          mándatelo por correo. Para restaurar, importa el archivo.
        </p>
        <p className="texto-ayuda">
          Último respaldo:{' '}
          <strong className={diasRespaldo == null || diasRespaldo > 14 ? 'texto-alerta' : ''}>
            {ultimoRespaldo ? `${etiquetaFechaCorta(ultimoRespaldo.slice(0, 10))} (hace ${diasRespaldo} días)` : 'nunca'}
          </strong>
        </p>
        <div className="botones">
          <button className="btn btn-primario" onClick={exportar} disabled={ocupado}>
            <DownloadCloud size={18} /> Exportar
          </button>
          <button className="btn btn-secundario" onClick={() => archivoRef.current?.click()} disabled={ocupado}>
            <UploadCloud size={18} /> Importar
          </button>
          <input
            ref={archivoRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) importar(f);
            }}
          />
        </div>
      </section>

      <section className="tarjeta">
        <h2><Bug size={18} aria-hidden="true" className="icono-titulo" />Gastos hormiga</h2>
        <div className="formulario">
          <Campo etiqueta="Monto máximo por gasto">
            {(id) => <CampoMonto key={hormiga.umbral} id={id} valor={hormiga.umbral} alCambiar={(umbral) => umbral > 0 && cambiarHormiga({ umbral })} />}
          </Campo>
          <div className="dos-columnas">
            <Campo etiqueta="Mínimo de gastos">
              {(id) => (
                <input id={id} className="campo" type="number" inputMode="numeric" min={1} value={hormiga.minimoMovimientos}
                  onChange={(e) => cambiarHormiga({ minimoMovimientos: Math.max(1, Number(e.target.value) || 1) })} />
              )}
            </Campo>
            <Campo etiqueta="% mínimo del gasto">
              {(id) => (
                <input id={id} className="campo" type="number" inputMode="decimal" min={0} max={100} value={hormiga.porcentajeMinimo}
                  onChange={(e) => cambiarHormiga({ porcentajeMinimo: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
              )}
            </Campo>
          </div>
        </div>
      </section>

      <section className="tarjeta">
        <h2><Database size={18} aria-hidden="true" className="icono-titulo" />Datos de ejemplo</h2>
        <p className="texto-ayuda">
          Carga un año de movimientos ficticios, una tarjeta con MSI, presupuestos, una meta y recurrentes para explorar la app.
          Se borran sin afectar tus datos reales.
        </p>
        <div className="botones">
          <button className="btn btn-secundario" disabled={ocupado} onClick={() => conCarga(async () => {
            const n = await cargarDatosDemo();
            avisar(`${n.toLocaleString('es-MX')} movimientos de ejemplo cargados`);
          })}>Cargar ejemplo</button>
          <button className="btn btn-peligro" disabled={ocupado || !demo} onClick={() => conCarga(async () => {
            if (!window.confirm('¿Borrar todos los datos de ejemplo? Tus datos reales no se tocan.')) return;
            await borrarDatosDemo();
            avisar('Datos de ejemplo borrados');
          })}>
            Borrar ejemplo{demo ? ` (${demo.toLocaleString('es-MX')})` : ''}
          </button>
        </div>
      </section>

      <section className="tarjeta">
        <h2><HardDrive size={18} aria-hidden="true" className="icono-titulo" />Almacenamiento</h2>
        <p className="texto-ayuda">
          En iPhone, usa la app desde el ícono de la pantalla de inicio (Safari → Compartir → Agregar a inicio) para que
          iOS no borre los datos.
        </p>
        <p className="texto-ayuda">
          Almacenamiento persistente: <strong>{persistente == null ? '…' : persistente ? 'activo' : 'no confirmado'}</strong>
        </p>
        {!persistente && (
          <button className="btn btn-secundario" onClick={async () => setPersistente(await solicitarPersistencia())}>
            Solicitar almacenamiento persistente
          </button>
        )}
      </section>

      <p className="version">SynapFinanzas · versión {__VERSION__}</p>
    </>
  );
}
