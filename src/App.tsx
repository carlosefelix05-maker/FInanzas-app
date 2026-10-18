import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChartPie, CreditCard, House, List, Plus, Settings, Target } from 'lucide-react';
import { ProveedorAvisos } from './components/Toast';
import { ProveedorCaptura, useCaptura } from './components/Captura';
import { ScrollCtx } from './components/Scroll';
import { Inicio } from './screens/Inicio';
import { Movimientos } from './screens/Movimientos';
import { Ajustes } from './screens/Ajustes';
import { Proximamente } from './screens/Proximamente';

const TABS = [
  { id: 'inicio', etiqueta: 'Inicio', Icono: House },
  { id: 'movimientos', etiqueta: 'Movimientos', Icono: List },
  { id: 'analisis', etiqueta: 'Análisis', Icono: ChartPie },
  { id: 'tarjetas', etiqueta: 'Tarjetas', Icono: CreditCard },
  { id: 'metas', etiqueta: 'Metas', Icono: Target },
] as const;

type Pantalla = (typeof TABS)[number]['id'] | 'ajustes';
const PANTALLAS: Pantalla[] = [...TABS.map((t) => t.id), 'ajustes'];

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
          {pantalla === 'ajustes' && (
            <button className="btn-icono" aria-label="Regresar" onClick={() => history.back()}>
              <ArrowLeft size={22} />
            </button>
          )}
          <h1>{TITULOS[pantalla]}</h1>
          {pantalla !== 'ajustes' && (
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
          {pantalla === 'analisis' && <Proximamente Icono={ChartPie} texto="Gráficas y análisis" fase={6} />}
          {pantalla === 'tarjetas' && <Proximamente Icono={CreditCard} texto="Tarjetas de crédito y MSI" fase={4} />}
          {pantalla === 'metas' && <Proximamente Icono={Target} texto="Metas de ahorro" fase={5} />}
          {pantalla === 'ajustes' && <Ajustes />}
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
