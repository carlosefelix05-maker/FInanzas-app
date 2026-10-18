import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Calendar, ChevronDown, StickyNote, Trash2, Wallet, X } from 'lucide-react';
import { HojaInferior } from './HojaInferior';
import { Teclado } from './Teclado';
import { IconoCategoria } from './iconos';
import { useAviso } from './Toast';
import { db, leerAjuste } from '../db/db';
import { AJUSTE_ULTIMA_CUENTA, borrarMovimiento, guardarMovimiento, restaurarMovimiento } from '../db/acciones';
import { useCategorias, useCuentas } from '../hooks/datos';
import { aplicarTecla, centavosATexto, textoACentavos, textoTecladoVisible, type TeclaMonto } from '../lib/dinero';
import { etiquetaFechaCorta, hoyISO } from '../lib/fechas';
import { categoriasFrecuentes } from '../lib/movimientos';
import type { Categoria, Movimiento, TipoMovimiento } from '../lib/tipos';
import { useLiveQuery } from 'dexie-react-hooks';

type Abrir = (m?: Movimiento) => void;
const Ctx = createContext<Abrir>(() => {});
export const useCaptura = () => useContext(Ctx);

export function ProveedorCaptura({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<{ abierta: boolean; mov?: Movimiento; clave: number }>({ abierta: false, clave: 0 });
  const abrir = useCallback<Abrir>((mov) => setEstado((e) => ({ abierta: true, mov, clave: e.clave + 1 })), []);
  const cerrar = useCallback(() => setEstado((e) => ({ ...e, abierta: false })), []);
  return (
    <Ctx.Provider value={abrir}>
      {children}
      <HojaInferior abierta={estado.abierta} alCerrar={cerrar} etiqueta={estado.mov ? 'Editar movimiento' : 'Nuevo movimiento'}>
        <FormularioCaptura key={estado.clave} inicial={estado.mov} alCerrar={cerrar} />
      </HojaInferior>
    </Ctx.Provider>
  );
}

const TIPOS: { valor: TipoMovimiento; etiqueta: string }[] = [
  { valor: 'gasto', etiqueta: 'Gasto' },
  { valor: 'ingreso', etiqueta: 'Ingreso' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
];

const NOMBRE_TIPO: Record<TipoMovimiento, string> = { gasto: 'Gasto', ingreso: 'Ingreso', transferencia: 'Transferencia' };

function FormularioCaptura({ inicial, alCerrar }: { inicial?: Movimiento; alCerrar: () => void }) {
  const avisar = useAviso();
  const cuentas = useCuentas();
  const categorias = useCategorias();
  // Solo se usan para ordenar por frecuencia; la consulta corre una vez al abrir.
  const usos = useLiveQuery(() => db.movimientos.orderBy('fecha').reverse().limit(1000).toArray(), [], []);

  const [tipo, setTipo] = useState<TipoMovimiento>(inicial?.tipo ?? 'gasto');
  const [texto, setTexto] = useState(inicial ? centavosATexto(inicial.monto) : '');
  const [categoriaId, setCategoriaId] = useState<number | null>(inicial?.categoriaId ?? null);
  const [cuentaId, setCuentaId] = useState<number | null>(inicial?.cuentaId ?? null);
  const [destinoId, setDestinoId] = useState<number | null>(inicial?.cuentaDestinoId ?? null);
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO());
  const [nota, setNota] = useState(inicial?.nota ?? '');
  const [verNota, setVerNota] = useState(!!inicial?.nota);
  const [verTodas, setVerTodas] = useState(false);

  const activas = useMemo(() => cuentas.filter((c) => !c.archivada || c.id === inicial?.cuentaId), [cuentas, inicial]);

  // Precarga la última cuenta usada.
  useEffect(() => {
    if (cuentaId != null || activas.length === 0) return;
    leerAjuste<number | null>(AJUSTE_ULTIMA_CUENTA, null).then((id) => {
      setCuentaId(activas.some((c) => c.id === id) ? id : activas[0].id!);
    });
  }, [activas, cuentaId]);

  useEffect(() => {
    if (tipo !== 'transferencia' || destinoId != null || cuentaId == null) return;
    const otra = activas.find((c) => c.id !== cuentaId);
    if (otra) setDestinoId(otra.id!);
  }, [tipo, destinoId, cuentaId, activas]);

  const monto = textoACentavos(texto);
  const tipoCat = tipo === 'ingreso' ? 'ingreso' : 'gasto';

  const frecuentes = useMemo(() => {
    const top = categoriasFrecuentes(categorias, usos, tipoCat, 8);
    const sel = categorias.find((c) => c.id === categoriaId);
    if (sel && !top.some((c) => c.id === sel.id)) top.splice(top.length - 1, 1, sel);
    return top;
  }, [categorias, usos, tipoCat, categoriaId]);

  const valido =
    monto > 0 &&
    cuentaId != null &&
    (tipo === 'transferencia' ? destinoId != null && destinoId !== cuentaId : categoriaId != null);

  const cambiarTipo = (t: TipoMovimiento) => {
    setTipo(t);
    setVerTodas(false);
    const cat = categorias.find((c) => c.id === categoriaId);
    if (!cat || cat.tipo !== (t === 'ingreso' ? 'ingreso' : 'gasto')) setCategoriaId(null);
  };

  const guardar = async () => {
    if (!valido) return;
    const m: Movimiento = {
      ...(inicial ?? { recurrenteId: null, msiId: null, creado: Date.now() }),
      tipo,
      monto,
      fecha,
      categoriaId: tipo === 'transferencia' ? null : categoriaId,
      cuentaId: cuentaId!,
      cuentaDestinoId: tipo === 'transferencia' ? destinoId : null,
      nota: nota.trim(),
    };
    await guardarMovimiento(m);
    avisar(inicial ? 'Movimiento actualizado' : `${NOMBRE_TIPO[tipo]} registrado`);
    alCerrar();
  };

  const borrar = async () => {
    if (inicial?.id == null) return;
    const borrado = await borrarMovimiento(inicial.id);
    alCerrar();
    if (borrado) avisar('Movimiento eliminado', { etiqueta: 'Deshacer', alHacer: () => restaurarMovimiento(borrado) });
  };

  const teclear = (t: TeclaMonto) => setTexto((x) => aplicarTecla(x, t));

  const nombreCuenta = (id: number | null) => activas.find((c) => c.id === id)?.nombre ?? 'Cuenta';

  return (
    <div className="captura">
      <div className="captura-arriba">
        <div className="segmentado" role="tablist" aria-label="Tipo de movimiento">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              role="tab"
              aria-selected={tipo === t.valor}
              className="segmento"
              onClick={() => cambiarTipo(t.valor)}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
        {inicial && (
          <button className="btn-icono" aria-label="Eliminar movimiento" onClick={borrar} style={{ color: 'var(--gasto)' }}>
            <Trash2 size={20} />
          </button>
        )}
        <button className="btn-icono" aria-label="Cerrar" onClick={alCerrar}>
          <X size={22} />
        </button>
      </div>

      <div className={`captura-monto num ${tipo === 'gasto' ? 'monto-gasto' : tipo === 'ingreso' ? 'monto-ingreso' : ''}`} aria-live="polite">
        {textoTecladoVisible(texto)}
      </div>

      {tipo === 'transferencia' ? (
        <div className="transferencia">
          <SelectorCuenta etiqueta="De" valor={cuentaId} cuentas={activas} alCambiar={setCuentaId} />
          <ArrowRight size={20} aria-hidden="true" color="var(--texto-secundario)" />
          <SelectorCuenta etiqueta="A" valor={destinoId} cuentas={activas} alCambiar={setDestinoId} />
        </div>
      ) : (
        <>
          <div className="captura-titulo">
            <span className="etiqueta">Categoría</span>
            <button className="enlace" onClick={() => setVerTodas((v) => !v)} aria-expanded={verTodas}>
              {verTodas ? 'Frecuentes' : 'Todas'}
              <ChevronDown size={16} style={{ transform: verTodas ? 'rotate(180deg)' : undefined }} />
            </button>
          </div>
          {verTodas ? (
            <ListaTodas
              categorias={categorias.filter((c) => c.tipo === tipoCat && !c.archivada)}
              seleccion={categoriaId}
              alElegir={(id) => {
                setCategoriaId(id);
                setVerTodas(false);
              }}
            />
          ) : (
            <div className="rejilla-cats">
              {frecuentes.map((c) => (
                <button
                  key={c.id}
                  className="cat-opcion"
                  aria-pressed={categoriaId === c.id}
                  onClick={() => setCategoriaId(c.id!)}
                >
                  <IconoCategoria icono={c.icono} color={c.color} tam={36} />
                  <span>{c.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="chips">
        {tipo !== 'transferencia' && (
          <label className="chip">
            <Wallet size={16} aria-hidden="true" />
            <span>{nombreCuenta(cuentaId)}</span>
            <select
              aria-label="Cuenta"
              value={cuentaId ?? ''}
              onChange={(e) => setCuentaId(Number(e.target.value))}
            >
              {activas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
        )}
        <label className="chip">
          <Calendar size={16} aria-hidden="true" />
          <span>{etiquetaFechaCorta(fecha)}</span>
          <input
            type="date"
            aria-label="Fecha"
            value={fecha}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
          />
        </label>
        <button className="chip" aria-pressed={verNota} onClick={() => setVerNota((v) => !v)}>
          <StickyNote size={16} aria-hidden="true" />
          <span>{nota ? 'Nota ✓' : 'Nota'}</span>
        </button>
      </div>
      {verNota && (
        <input
          className="campo"
          placeholder="Nota (opcional)"
          aria-label="Nota"
          value={nota}
          maxLength={140}
          onChange={(e) => setNota(e.target.value)}
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      )}

      <Teclado alTeclear={teclear} />

      <button className="btn btn-primario btn-bloque btn-guardar" disabled={!valido} onClick={guardar}>
        {inicial ? 'Guardar cambios' : 'Guardar'}
      </button>
    </div>
  );
}

function SelectorCuenta({ etiqueta, valor, cuentas, alCambiar }: {
  etiqueta: string;
  valor: number | null;
  cuentas: { id?: number; nombre: string }[];
  alCambiar: (id: number) => void;
}) {
  return (
    <label className="selector-cuenta">
      <span className="etiqueta">{etiqueta}</span>
      <select value={valor ?? ''} onChange={(e) => alCambiar(Number(e.target.value))} aria-label={`Cuenta ${etiqueta === 'De' ? 'origen' : 'destino'}`}>
        <option value="" disabled>Elegir…</option>
        {cuentas.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
    </label>
  );
}

function ListaTodas({ categorias, seleccion, alElegir }: {
  categorias: Categoria[];
  seleccion: number | null;
  alElegir: (id: number) => void;
}) {
  const principales = categorias.filter((c) => c.padreId == null);
  const hijas = (id: number) => categorias.filter((c) => c.padreId === id);
  return (
    <div className="lista-todas">
      {principales.map((p) => (
        <div key={p.id}>
          <button className="fila-cat" aria-pressed={seleccion === p.id} onClick={() => alElegir(p.id!)}>
            <IconoCategoria icono={p.icono} color={p.color} tam={32} />
            <span>{p.nombre}</span>
          </button>
          {hijas(p.id!).map((h) => (
            <button key={h.id} className="fila-cat sub" aria-pressed={seleccion === h.id} onClick={() => alElegir(h.id!)}>
              <IconoCategoria icono={h.icono} color={h.color} tam={28} />
              <span>{h.nombre}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
