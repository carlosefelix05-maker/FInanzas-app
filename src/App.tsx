import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChartPie, CreditCard, House, List, Plus, Settings, Target } from 'lucide-react';
import { ProveedorAvisos } from './components/Toast';
import { ProveedorCaptura, useCaptura } from './components/Captura';
import { ScrollCtx } from './components/Scroll';
import { Inicio } from './screens/Inicio';
import { Movimientos } from './screens/Movimientos';
import { Ajustes } from './screens/Ajustes';
import { Categorias } from './screens/Categorias';
import { Cuentas } from './screens/Cuentas';
import { Recurrentes } from './screens/Recurrentes';
import { Presupuestos } from './screens/Presupuestos';
import { Tarjetas } from './screens/Tarjetas';
import { Metas } from './screens/Metas';
// Análisis carga Recharts; se separa para que la app abra más rápido.
const Analisis = lazy(() => import('./screens/Analisis').then((m) => ({ default: m.Analisis })));
import { procesarAutomaticos } from './db/automaticos';

const TABS = [
  { id: 'inicio', etiqueta: 'Inicio', Icono: House },
  { id: 'movimientos', etiqueta: 'Movimientos', Icono: List },
  { id: 'analisis', etiqueta: 'Análisis', Icono: ChartPie },
  { id: 'tarjetas', etiqueta: 'Tarjetas', Icono: CreditCard },
  { id: 'metas', etiqueta: 'Metas', Icono: Target },
] as const;

export type Pantalla = (typeof TABS)[number]['id'] | 'ajustes' | 'categorias' | 'cuentas' | 'recurrentes' | 'presupuestos';
const SECUNDARIAS: Pantalla[] = ['ajustes', 'categorias', 'cuentas', 'recurrentes', 'presupuestos'];
const PANTALLAS: Pantalla[] = [...TABS.map((t) => t.id), ...SECUNDARIAS];

function leerHash(): Pantalla {
  const h = window.location.hash.replace(/^#\/?/, '') as Pantalla;
  return PANTALLAS.includes(h) ? h : 'inicio';
}

const TITULOS: Record<Pantalla, string> = {
  inicio: 'SynapFinanzas',
  movimientos: 'Movimientos',
  analisis: 'Análisis',
  tarjetas: 'Tarjetas',
  metas: 'Metas',
  ajustes: 'Ajustes',
  categorias: 'Categorías',
  cuentas: 'Cuentas',
  recurrentes: 'Recurrentes',
  presupuestos: 'Presupuestos',
};

export default function App() {
  return (
    <ProveedorAvisos>
      <ProveedorCaptura>
        <Estructura />
      </ProveedorCaptura>
    </ProveedorAvisos>
  );
}

function Estructura() {
  const [pantalla, setPantalla] = useState<Pantalla>(leerHash);
  const scrollRef = useRef<HTMLElement>(null);
  const abrirCaptura = useCaptura();

  useEffect(() => {
    const alCambiar = () => setPantalla(leerHash());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pantalla]);

  // Recurrentes vencidos y cuotas MSI: al abrir la app y al volver a ella (puede haber cambiado el día).
  useEffect(() => {
    const procesar = () => procesarAutomaticos().catch((e) => console.error('Automáticos', e));
    procesar();
    const alVolver = () => document.visibilityState === 'visible' && procesar();
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, []);

  const irA = useCallback((p: Pantalla) => {
    if (p === leerHash()) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.location.hash = `/${p}`;
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-fila">
          {SECUNDARIAS.includes(pantalla) && (
            <button
              className="btn-icono"
              aria-label="Regresar"
              onClick={() => (history.length > 1 ? history.back() : irA(pantalla === 'ajustes' ? 'inicio' : 'ajustes'))}
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <h1>{TITULOS[pantalla]}</h1>
          {!SECUNDARIAS.includes(pantalla) && (
            <button className="btn-icono" aria-label="Ajustes" onClick={() => irA('ajustes')}>
              <Settings size={22} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </header>

      <ScrollCtx.Provider value={scrollRef}>
        <main className="contenido" ref={scrollRef}>
          {pantalla === 'inicio' && <Inicio irA={irA} />}
          {pantalla === 'movimientos' && <Movimientos />}
          {pantalla === 'analisis' && <Suspense fallback={null}><Analisis /></Suspense>}
          {pantalla === 'tarjetas' && <Tarjetas />}
          {pantalla === 'metas' && <Metas />}
          {pantalla === 'ajustes' && <Ajustes irA={irA} />}
          {pantalla === 'categorias' && <Categorias />}
          {pantalla === 'cuentas' && <Cuentas />}
          {pantalla === 'recurrentes' && <Recurrentes />}
          {pantalla === 'presupuestos' && <Presupuestos />}
        </main>
      </ScrollCtx.Provider>

      <button className="fab" aria-label="Registrar movimiento" onClick={() => abrirCaptura()}>
        <Plus size={28} strokeWidth={2.25} />
      </button>

      <nav className="nav" aria-label="Navegación principal">
        {TABS.map(({ id, etiqueta, Icono }) => (
          <button
            key={id}
            className="nav-item"
            aria-current={pantalla === id ? 'page' : undefined}
            onClick={() => irA(id)}
          >
            <Icono size={22} strokeWidth={pantalla === id ? 2.25 : 1.75} aria-hidden="true" />
            <span>{etiqueta}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
