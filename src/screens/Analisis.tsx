import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowLeft, ChevronLeft, ChevronRight, Bug, TrendingDown, TrendingUp } from 'lucide-react';
import { Segmentado } from '../components/Formularios';
import { BarraProgreso } from '../components/Barra';
import { IconoCategoria } from '../components/iconos';
import { useAjuste, useCategorias, useMapa, useMovimientos, usePresupuestos } from '../hooks/datos';
import { formatearMonto } from '../lib/dinero';
import { desplazarPeriodo, etiquetaFechaCorta, etiquetaPeriodo, hoyISO, rangoPeriodo, type TipoPeriodo } from '../lib/fechas';
import { filtrarPorRango } from '../lib/movimientos';
import {
  AJUSTE_HORMIGA, categoriaRaiz, gastosHormiga, HORMIGA_PREDETERMINADO, proyeccionFinDeMes, serieMensual, tendenciaTasa, topGastos,
  type ConfigHormiga,
} from '../lib/analisis';
import type { Categoria, Movimiento } from '../lib/tipos';


// Colores de serie (marcas, nunca texto). Balance usa un azul más claro que el de la marca para leerse como línea.
const C_INGRESO = '#2E7D5B';
const C_GASTO = '#B03A2E';
const C_BALANCE = '#3E7CB1';
const GRID = '#E3E7EB';
const EJE = { fontSize: 12, fill: '#5d6d7e' };

function compacto(centavos: number): string {
  const pesos = centavos / 100;
  const abs = Math.abs(pesos);
  if (abs >= 1_000_000) return `${(pesos / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (abs >= 1000) return `${Math.round(pesos / 1000)}K`;
  return `${Math.round(pesos)}`;
}

function TooltipMontos({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="grafica-tooltip">
      {label && <div className="grafica-tooltip-titulo">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="grafica-tooltip-fila">
          <span className="clave" style={{ background: p.color }} aria-hidden="true" />
          <span>{p.name}</span>
          <strong className="num">{formatearMonto(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function Leyenda({ items }: { items: { nombre: string; color: string; punteada?: boolean }[] }) {
  return (
    <ul className="leyenda">
      {items.map((i) => (
        <li key={i.nombre}>
          <span className={`clave-linea ${i.punteada ? 'punteada' : ''}`} style={{ borderColor: i.color }} aria-hidden="true" />
          {i.nombre}
        </li>
      ))}
    </ul>
  );
}

const PERIODOS: { valor: TipoPeriodo; etiqueta: string }[] = [
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'anio', etiqueta: 'Año' },
];

export function Analisis() {
  const movs = useMovimientos();
  const categoriasLista = useCategorias();
  const categorias = useMapa(categoriasLista);
  const presupuestos = usePresupuestos();
  const hormiga = useAjuste<ConfigHormiga>(AJUSTE_HORMIGA, HORMIGA_PREDETERMINADO);
  const hoy = hoyISO();
  const [tipo, setTipo] = useState<TipoPeriodo>('mes');
  const [ref, setRef] = useState(hoy);
  const [enfoque, setEnfoque] = useState<number | null>(null);

  const periodo = rangoPeriodo(tipo, ref);
  const mesActual = rangoPeriodo('mes', hoy);

  const datos = useMemo(() => {
    if (!movs) return null;
    const delPeriodo = filtrarPorRango(movs, periodo.inicio, periodo.fin);
    const delMes = filtrarPorRango(movs, mesActual.inicio, mesActual.fin);
    const serie = serieMensual(movs, hoy, 12);
    return {
      delPeriodo,
      serie,
      tendencia: tendenciaTasa(serie),
      top: topGastos(delPeriodo, 5),
      hormiga: gastosHormiga(delPeriodo, categoriasLista, hormiga),
      proyeccion: proyeccionFinDeMes(delMes, hoy, presupuestos.reduce((s, p) => s + p.montoMensual, 0)),
    };
  }, [movs, periodo.inicio, periodo.fin, mesActual.inicio, mesActual.fin, hoy, categoriasLista, hormiga, presupuestos]);

  if (!datos) return null;
  if (movs!.length === 0) {
    return <div className="tarjeta vacio"><p>Registra movimientos para ver tus análisis.</p></div>;
  }

  const { serie, tendencia, proyeccion } = datos;
  const tasaActual = serie.at(-2)?.tasaAhorro ?? null; // último mes completo
  const mesPasado = serie.at(-2)?.etiqueta ?? '';

  return (
    <>
      <Segmentado etiqueta="Periodo" opciones={PERIODOS} valor={tipo} alCambiar={(t) => { setTipo(t); setEnfoque(null); }} />
      <div className="periodo-nav">
        <button className="btn-icono" aria-label="Periodo anterior" onClick={() => { setRef((r) => desplazarPeriodo(tipo, r, -1)); setEnfoque(null); }}>
          <ChevronLeft size={24} />
        </button>
        <div className="periodo-etiqueta"><strong>{etiquetaPeriodo(tipo, ref)}</strong></div>
        <button className="btn-icono" aria-label="Periodo siguiente" onClick={() => { setRef((r) => desplazarPeriodo(tipo, r, 1)); setEnfoque(null); }}>
          <ChevronRight size={24} />
        </button>
      </div>

      <Dona movs={datos.delPeriodo} categorias={categoriasLista} porId={categorias} enfoque={enfoque} setEnfoque={setEnfoque} />

      <section className="tarjeta">
        <h2>Top 5 gastos</h2>
        {datos.top.length === 0 ? <p className="texto-ayuda">Sin gastos en el periodo.</p> : (
          <ol className="lista-top">
            {datos.top.map((m) => {
              const c = m.categoriaId != null ? categorias.get(m.categoriaId) : undefined;
              return (
                <li key={m.id}>
                  <IconoCategoria icono={c?.icono ?? 'tag'} color={c?.color ?? '#707B87'} tam={32} />
                  <span className="lista-simple-texto">
                    {m.nota || c?.nombre}
                    <small>{c?.nombre} · {etiquetaFechaCorta(m.fecha)}</small>
                  </span>
                  <strong className="num">{formatearMonto(m.monto)}</strong>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="tarjeta">
        <h2><Bug size={18} aria-hidden="true" className="icono-titulo" />Gastos hormiga</h2>
        <p className="texto-ayuda">
          Categorías con {hormiga.minimoMovimientos} o más gastos menores a {formatearMonto(hormiga.umbral, { sinCentavos: true })} que suman al menos el {hormiga.porcentajeMinimo} % de lo gastado. Se ajusta en Ajustes.
        </p>
        {datos.hormiga.length === 0 ? <p className="texto-ayuda"><strong>Ninguna en este periodo.</strong></p> : (
          <ul className="lista-simple">
            {datos.hormiga.map((h) => {
              const c = categorias.get(h.categoriaId);
              return (
                <li key={h.categoriaId}>
                  <IconoCategoria icono={c?.icono ?? 'tag'} color={c?.color ?? '#707B87'} tam={32} />
                  <span className="lista-simple-texto">
                    {c?.nombre}
                    <small>{h.cantidad} gastos pequeños · {h.porcentaje} % del gasto</small>
                  </span>
                  <strong className="num texto-alerta">{formatearMonto(h.total)}</strong>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="tarjeta">
        <h2>Proyección a fin de mes</h2>
        <div className="cifra-grande num">{formatearMonto(proyeccion.proyectado, { sinCentavos: true })}</div>
        <p className="texto-ayuda">
          Llevas {formatearMonto(proyeccion.gastado)} en {proyeccion.diasTranscurridos} de {proyeccion.diasMes} días
          ({formatearMonto(proyeccion.ritmoDiario)} por día).
        </p>
        {proyeccion.presupuesto > 0 ? (
          <>
            <BarraProgreso
              porcentaje={(proyeccion.proyectado / proyeccion.presupuesto) * 100}
              nivel={proyeccion.diferencia > 0 ? 'excedido' : proyeccion.proyectado >= proyeccion.presupuesto * 0.8 ? 'alerta' : 'ok'}
              etiqueta="Gasto proyectado contra presupuesto total"
            />
            <p className="texto-ayuda" style={{ marginTop: 'var(--esp-2)' }}>
              {proyeccion.diferencia > 0
                ? <span className="monto-gasto">A este ritmo te pasarías {formatearMonto(proyeccion.diferencia, { sinCentavos: true })} de tu presupuesto total ({formatearMonto(proyeccion.presupuesto, { sinCentavos: true })}).</span>
                : <>A este ritmo quedarías {formatearMonto(-proyeccion.diferencia, { sinCentavos: true })} debajo de tu presupuesto total ({formatearMonto(proyeccion.presupuesto, { sinCentavos: true })}).</>}
            </p>
          </>
        ) : (
          <p className="campo-ayuda">Define presupuestos para comparar contra tu proyección.</p>
        )}
        <p className="campo-ayuda">Incluye todos los gastos registrados del mes, también los fijos como la renta.</p>
      </section>

      <section className="tarjeta">
        <h2>Flujo de los últimos 12 meses</h2>
        <Leyenda items={[{ nombre: 'Ingresos', color: C_INGRESO }, { nombre: 'Gastos', color: C_GASTO, punteada: true }, { nombre: 'Balance', color: C_BALANCE }]} />
        <div className="grafica" style={{ height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="etiqueta" tick={EJE} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" />
              <YAxis tick={EJE} tickLine={false} axisLine={false} tickFormatter={compacto} width={44} />
              <ReferenceLine y={0} stroke="#b9c2cb" />
              <Tooltip content={<TooltipMontos />} />
              <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke={C_INGRESO} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="gastos" name="Gastos" stroke={C_GASTO} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="balance" name="Balance" stroke={C_BALANCE} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="tarjeta">
        <h2>Ingresos vs. gastos por mes</h2>
        <Leyenda items={[{ nombre: 'Ingresos', color: C_INGRESO }, { nombre: 'Gastos', color: C_GASTO }]} />
        <div className="grafica" style={{ height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="etiqueta" tick={EJE} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" />
              <YAxis tick={EJE} tickLine={false} axisLine={false} tickFormatter={compacto} width={44} />
              <Tooltip content={<TooltipMontos />} cursor={{ fill: 'rgba(26,58,92,0.06)' }} />
              <Bar dataKey="ingresos" name="Ingresos" fill={C_INGRESO} radius={[4, 4, 0, 0]} maxBarSize={12} />
              <Bar dataKey="gastos" name="Gastos" fill={C_GASTO} radius={[4, 4, 0, 0]} maxBarSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="tarjeta">
        <h2>Tasa de ahorro mensual</h2>
        <div className="tasa-cabecera">
          <div className={`cifra-grande num ${tasaActual != null && tasaActual < 0 ? 'monto-gasto' : ''}`}>
            {tasaActual == null ? '—' : `${tasaActual} %`}
          </div>
          {tendencia.actual != null && tendencia.promedioPrevio != null && (
            <span className="tendencia">
              {tendencia.actual >= tendencia.promedioPrevio ? <TrendingUp size={18} className="monto-ingreso" aria-hidden="true" /> : <TrendingDown size={18} className="monto-gasto" aria-hidden="true" />}
              {tendencia.actual >= tendencia.promedioPrevio ? 'Mejor' : 'Peor'} que el promedio de los 3 meses previos ({tendencia.promedioPrevio} %)
            </span>
          )}
        </div>
        <p className="texto-ayuda">(Ingresos − gastos) ÷ ingresos de {mesPasado}, el último mes completo. La gráfica muestra solo meses completos.</p>
        <div className="grafica" style={{ height: 180 }}>
          <ResponsiveContainer>
            <LineChart data={serie.slice(0, -1)} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="etiqueta" tick={EJE} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" />
              <YAxis tick={EJE} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={44} />
              <ReferenceLine y={0} stroke="#b9c2cb" />
              <Tooltip formatter={(v) => [`${v} %`, 'Tasa de ahorro']} contentStyle={{ borderRadius: 8, border: '1px solid #e3e7eb' }} />
              <Line type="monotone" dataKey="tasaAhorro" name="Tasa de ahorro" stroke={C_BALANCE} strokeWidth={2} dot={{ r: 3, fill: C_BALANCE, stroke: '#fff', strokeWidth: 2 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}

function Dona({ movs, categorias, porId, enfoque, setEnfoque }: {
  movs: Movimiento[];
  categorias: Categoria[];
  porId: Map<number, Categoria>;
  enfoque: number | null;
  setEnfoque: (id: number | null) => void;
}) {
  const rebanadas = useMemo(() => {
    const acc = new Map<number, number>();
    for (const m of movs) {
      if (m.tipo !== 'gasto' || m.categoriaId == null) continue;
      const raiz = categoriaRaiz(porId, m.categoriaId);
      if (enfoque == null) acc.set(raiz, (acc.get(raiz) ?? 0) + m.monto);
      else if (raiz === enfoque) acc.set(m.categoriaId, (acc.get(m.categoriaId) ?? 0) + m.monto);
    }
    const total = [...acc.values()].reduce((s, v) => s + v, 0);
    return {
      total,
      items: [...acc.entries()]
        .map(([id, valor]) => ({ id, valor, cat: porId.get(id), pct: total ? Math.round((valor / total) * 1000) / 10 : 0 }))
        .sort((a, b) => b.valor - a.valor),
    };
  }, [movs, porId, enfoque]);

  const tieneSubs = (id: number) => categorias.some((c) => c.padreId === id);
  const elegir = (id: number) => { if (enfoque == null && tieneSubs(id)) setEnfoque(id); };
  const foco = enfoque != null ? porId.get(enfoque) : undefined;

  return (
    <section className="tarjeta">
      <div className="tarjeta-titulo">
        <h2>{foco ? foco.nombre : 'Gastos por categoría'}</h2>
        {foco && <button className="enlace" onClick={() => setEnfoque(null)}><ArrowLeft size={16} /> Todas</button>}
      </div>
      {rebanadas.items.length === 0 ? <p className="texto-ayuda">Sin gastos en el periodo.</p> : (
        <>
          <div className="dona">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={rebanadas.items}
                  dataKey="valor"
                  nameKey="id"
                  innerRadius="62%"
                  outerRadius="95%"
                  paddingAngle={rebanadas.items.length > 1 ? 1 : 0}
                  stroke="#fff"
                  strokeWidth={2}
                  isAnimationActive={false}
                  onClick={(d) => elegir((d as unknown as { id: number }).id)}
                >
                  {rebanadas.items.map((r) => <Cell key={r.id} fill={r.cat?.color ?? '#707B87'} style={{ cursor: 'pointer', outline: 'none' }} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="dona-centro">
              <span className="etiqueta">Total</span>
              <strong className="num">{formatearMonto(rebanadas.total, { sinCentavos: true })}</strong>
            </div>
          </div>
          <ul className="leyenda-dona">
            {rebanadas.items.map((r) => {
              const contenido = (
                <>
                  <span className="clave" style={{ background: r.cat?.color ?? '#707B87' }} aria-hidden="true" />
                  <span className="lista-simple-texto">{r.cat?.nombre ?? 'Sin categoría'}</span>
                  <span className="num pct">{r.pct} %</span>
                  <strong className="num">{formatearMonto(r.valor)}</strong>
                  {enfoque == null && tieneSubs(r.id) && <ChevronRight size={16} color="var(--naranja)" aria-hidden="true" />}
                </>
              );
              return (
                <li key={r.id}>
                  {enfoque == null && tieneSubs(r.id)
                    ? <button onClick={() => elegir(r.id)} aria-label={`Ver subcategorías de ${r.cat?.nombre}`}>{contenido}</button>
                    : <div>{contenido}</div>}
                </li>
              );
            })}
          </ul>
          {enfoque == null && rebanadas.items.some((r) => tieneSubs(r.id)) && (
            <p className="campo-ayuda">Toca una categoría con › para ver sus subcategorías.</p>
          )}
        </>
      )}
    </section>
  );
}
