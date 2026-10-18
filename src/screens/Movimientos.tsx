import { useDeferredValue, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, ListChecks, Search, SlidersHorizontal, X } from 'lucide-react';
import { ListaMovimientos } from '../components/ListaMovimientos';
import { Segmentado } from '../components/Formularios';
import { useCategorias, useCuentas, useMapa, useMovimientosRango } from '../hooks/datos';
import { formatearMonto } from '../lib/dinero';
import { deISO, desplazarPeriodo, etiquetaPeriodo, hoyISO, rangoAnteriorComparable, rangoPeriodo, type TipoPeriodo } from '../lib/fechas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { calcularTotales, filtrarPorRango } from '../lib/movimientos';
import { compararPorCategoria, filtrarMovimientos, nombrePeriodoAnterior, type Filtros } from '../lib/analisis';

const PERIODOS: { valor: TipoPeriodo; etiqueta: string }[] = [
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'anio', etiqueta: 'Año' },
];

const CLAVE_PERIODO = 'movimientos.periodo';

function leerPeriodoGuardado(): TipoPeriodo {
  try {
    const v = localStorage.getItem(CLAVE_PERIODO) as TipoPeriodo | null;
    return v && PERIODOS.some((p) => p.valor === v) ? v : 'mes';
  } catch {
    return 'mes';
  }
}

export function Movimientos() {
  const categoriasLista = useCategorias();
  const cuentasLista = useCuentas();
  const categorias = useMapa(categoriasLista);
  const cuentas = useMapa(cuentasLista);

  const [tipo, setTipo] = useState<TipoPeriodo>(leerPeriodoGuardado);
  const [ref, setRef] = useState(hoyISO);
  const [filtros, setFiltros] = useState<Filtros>({ categoriaId: null, cuentaId: null, texto: '' });
  const [verFiltros, setVerFiltros] = useState(false);
  const texto = useDeferredValue(filtros.texto);

  const hoy = hoyISO();
  const actual = rangoPeriodo(tipo, ref);
  const anterior = rangoAnteriorComparable(tipo, ref, hoy);
  const datos = useMovimientosRango(anterior.inicio, actual.fin);

  const cambiarTipo = (t: TipoPeriodo) => {
    setTipo(t);
    try {
      localStorage.setItem(CLAVE_PERIODO, t);
    } catch {
      /* sin almacenamiento */
    }
  };

  const vista = useMemo(() => {
    if (!datos) return null;
    const f = { ...filtros, texto };
    const delPeriodo = filtrarMovimientos(filtrarPorRango(datos, actual.inicio, actual.fin), f, categoriasLista, cuentasLista);
    const previos = filtrarMovimientos(filtrarPorRango(datos, anterior.inicio, anterior.fin), f, categoriasLista, cuentasLista);
    return {
      movimientos: delPeriodo,
      totales: calcularTotales(delPeriodo),
      comparativa: previos.length ? compararPorCategoria(delPeriodo, previos, categoriasLista).slice(0, 3) : [],
    };
  }, [datos, filtros, texto, actual.inicio, actual.fin, anterior.inicio, anterior.fin, categoriasLista, cuentasLista]);

  const esActual = hoy >= actual.inicio && hoy <= actual.fin;
  const hayFiltros = filtros.categoriaId != null || filtros.cuentaId != null || filtros.texto !== '';
  const nFiltros = (filtros.categoriaId != null ? 1 : 0) + (filtros.cuentaId != null ? 1 : 0);
  const vsNombre =
    nombrePeriodoAnterior(tipo, anterior.inicio) +
    (anterior.recortado
      ? ` (${tipo === 'semana' ? `lun–${format(deISO(anterior.fin), 'EEE', { locale: es })}` : `al ${format(deISO(anterior.fin), "d 'de' MMM", { locale: es })}`})`
      : '');

  const gastosCats = categoriasLista.filter((c) => c.tipo === 'gasto');
  const ingresosCats = categoriasLista.filter((c) => c.tipo === 'ingreso');
  const opcionCat = (c: (typeof categoriasLista)[number]) => (
    <option key={c.id} value={c.id}>
      {c.padreId != null ? '   ↳ ' : ''}{c.nombre}{c.archivada ? ' (archivada)' : ''}
    </option>
  );
  // Principales seguidas de sus subcategorías.
  const ordenarArbol = (lista: typeof categoriasLista) =>
    lista.filter((c) => c.padreId == null).flatMap((p) => [p, ...lista.filter((h) => h.padreId === p.id)]);

  return (
    <>
      <Segmentado etiqueta="Periodo" opciones={PERIODOS} valor={tipo} alCambiar={cambiarTipo} />

      <div className="periodo-nav">
        <button className="btn-icono" aria-label="Periodo anterior" onClick={() => setRef((r) => desplazarPeriodo(tipo, r, -1))}>
          <ChevronLeft size={24} />
        </button>
        <div className="periodo-etiqueta">
          <strong>{etiquetaPeriodo(tipo, ref)}</strong>
          {!esActual && (
            <button className="enlace" onClick={() => setRef(hoy)}>Ir a hoy</button>
          )}
        </div>
        <button className="btn-icono" aria-label="Periodo siguiente" onClick={() => setRef((r) => desplazarPeriodo(tipo, r, 1))}>
          <ChevronRight size={24} />
        </button>
      </div>

      {vista && (
        <section className="tarjeta resumen-periodo">
          <div>
            <div className="etiqueta">Ingresos</div>
            <div className="num monto-ingreso">{formatearMonto(vista.totales.ingresos)}</div>
          </div>
          <div>
            <div className="etiqueta">Gastos</div>
            <div className="num monto-gasto">{formatearMonto(vista.totales.gastos)}</div>
          </div>
          <div>
            <div className="etiqueta">Balance</div>
            <div className={`num ${vista.totales.balance < 0 ? 'monto-gasto' : ''}`}>{formatearMonto(vista.totales.balance)}</div>
          </div>
        </section>
      )}

      {vista && vista.comparativa.length > 0 && (
        <section className="tarjeta comparativa">
          <h2>Gastos vs. {vsNombre}</h2>
          <ul>
            {vista.comparativa.map((c) => {
              const cat = categorias.get(c.categoriaId);
              const sube = c.diferencia > 0;
              const Flecha = sube ? ArrowUpRight : ArrowDownRight;
              return (
                <li key={c.categoriaId}>
                  <Flecha size={18} className={sube ? 'monto-gasto' : 'monto-ingreso'} aria-hidden="true" />
                  <span className="comparativa-texto">
                    {c.porcentaje == null
                      ? <>Nuevo gasto en <strong>{cat?.nombre}</strong></>
                      : <><strong className="num">{sube ? '+' : ''}{c.porcentaje} %</strong> en {cat?.nombre}</>}
                  </span>
                  <span className={`num ${sube ? 'monto-gasto' : 'monto-ingreso'}`}>{formatearMonto(c.diferencia, { signo: true, sinCentavos: true })}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="fila-busqueda">
        <div className="buscador">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar nota, categoría o cuenta"
            aria-label="Buscar movimientos"
            value={filtros.texto}
            onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
          />
          {filtros.texto && (
            <button className="btn-icono" aria-label="Limpiar búsqueda" onClick={() => setFiltros((f) => ({ ...f, texto: '' }))}>
              <X size={18} />
            </button>
          )}
        </div>
        <button
          className={`btn-filtros ${nFiltros ? 'activo' : ''}`}
          aria-label={`Filtros${nFiltros ? ` (${nFiltros} activos)` : ''}`}
          aria-expanded={verFiltros}
          onClick={() => setVerFiltros((v) => !v)}
        >
          <SlidersHorizontal size={20} />
          {nFiltros > 0 && <span className="insignia">{nFiltros}</span>}
        </button>
      </div>

      {verFiltros && (
        <div className="filtros">
          <label className="filtro">
            <span className="etiqueta">Categoría</span>
            <select
              className="campo"
              value={filtros.categoriaId ?? ''}
              onChange={(e) => setFiltros((f) => ({ ...f, categoriaId: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">Todas</option>
              <optgroup label="Gastos">{ordenarArbol(gastosCats).map(opcionCat)}</optgroup>
              <optgroup label="Ingresos">{ordenarArbol(ingresosCats).map(opcionCat)}</optgroup>
            </select>
          </label>
          <label className="filtro">
            <span className="etiqueta">Cuenta</span>
            <select
              className="campo"
              value={filtros.cuentaId ?? ''}
              onChange={(e) => setFiltros((f) => ({ ...f, cuentaId: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">Todas</option>
              {cuentasLista.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}{c.archivada ? ' (archivada)' : ''}</option>
              ))}
            </select>
          </label>
          {hayFiltros && (
            <button className="enlace" onClick={() => setFiltros({ categoriaId: null, cuentaId: null, texto: '' })}>
              Quitar filtros
            </button>
          )}
        </div>
      )}

      {!verFiltros && nFiltros > 0 && (
        <div className="chips" style={{ marginTop: 'var(--esp-2)' }}>
          {filtros.categoriaId != null && (
            <button className="chip activo" onClick={() => setFiltros((f) => ({ ...f, categoriaId: null }))} aria-label="Quitar filtro de categoría">
              {categorias.get(filtros.categoriaId)?.nombre} <X size={14} />
            </button>
          )}
          {filtros.cuentaId != null && (
            <button className="chip activo" onClick={() => setFiltros((f) => ({ ...f, cuentaId: null }))} aria-label="Quitar filtro de cuenta">
              {cuentas.get(filtros.cuentaId)?.nombre} <X size={14} />
            </button>
          )}
        </div>
      )}

      {vista && vista.movimientos.length === 0 ? (
        <div className="vacio">
          <ListChecks size={40} strokeWidth={1.5} />
          <p>{hayFiltros ? 'Sin resultados con estos filtros.' : 'Sin movimientos en este periodo.'}</p>
        </div>
      ) : vista ? (
        <>
          <p className="conteo">{vista.movimientos.length.toLocaleString('es-MX')} movimientos</p>
          <ListaMovimientos movimientos={vista.movimientos} />
        </>
      ) : null}
    </>
  );
}
