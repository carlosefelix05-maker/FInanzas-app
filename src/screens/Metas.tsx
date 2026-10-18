import { useMemo, useState } from 'react';
import { Minus, Plus, Star, Target, Trash2 } from 'lucide-react';
import { BarraProgreso } from '../components/Barra';
import { HojaInferior } from '../components/HojaInferior';
import { useAviso } from '../components/Toast';
import { Campo, CampoMonto, EncabezadoHoja, SelectorColor } from '../components/Formularios';
import { AJUSTE_META_PRINCIPAL, agregarAportacion, eliminarMeta, guardarMeta, quitarAportacion } from '../db/acciones';
import { guardarAjuste } from '../db/db';
import { useAjuste, useCuentas, useMapa, useMetas, useSaldos } from '../hooks/datos';
import { formatearMonto } from '../lib/dinero';
import { deISO, etiquetaFechaCorta, hoyISO } from '../lib/fechas';
import { planMeta } from '../lib/metas';
import type { Meta } from '../lib/tipos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/** Meta elegida como principal, o la primera sin completar. */
export function useMetaPrincipal(): Meta | undefined {
  const metas = useMetas();
  const principalId = useAjuste<number | null>(AJUSTE_META_PRINCIPAL, null);
  return useMemo(() => {
    const hoy = hoyISO();
    return metas.find((m) => m.id === principalId) ?? metas.find((m) => !planMeta(m, hoy).completada) ?? metas[0];
  }, [metas, principalId]);
}

const TEXTO_ESTADO = { adelantado: 'Adelantado', 'en tiempo': 'En tiempo', atrasado: 'Atrasado' } as const;

export function ResumenMeta({ meta, compacta }: { meta: Meta; compacta?: boolean }) {
  const p = planMeta(meta, hoyISO());
  return (
    <div className="meta-resumen">
      <div className="presupuesto-cabecera">
        <span className="punto" style={{ background: meta.color, width: 12, height: 12 }} aria-hidden="true" />
        <span className="presupuesto-nombre"><strong>{meta.nombre}</strong></span>
        <span className="num"><strong>{p.porcentaje} %</strong></span>
      </div>
      <BarraProgreso porcentaje={p.porcentaje} color={meta.color} etiqueta={`Progreso de ${meta.nombre}`} />
      <div className="presupuesto-pie num">
        <span>{formatearMonto(p.ahorrado)} de {formatearMonto(meta.montoObjetivo, { sinCentavos: true })}</span>
        {p.plan && !p.completada && (
          <span className={`estado-meta ${p.plan.estado === 'atrasado' ? 'texto-alerta' : p.plan.estado === 'adelantado' ? 'monto-ingreso' : ''}`}>
            {TEXTO_ESTADO[p.plan.estado]}
          </span>
        )}
        {p.completada && <span className="monto-ingreso">¡Meta alcanzada!</span>}
      </div>
      {!compacta && p.plan && !p.completada && (
        <p className="meta-plan">
          {p.plan.vencida ? (
            <>La fecha objetivo ({etiquetaFechaCorta(meta.fechaObjetivo!)}) ya pasó; faltan {formatearMonto(p.faltante)}.</>
          ) : (
            <>
              Para llegar el {format(deISO(meta.fechaObjetivo!), "d 'de' MMMM yyyy", { locale: es })}: ahorra{' '}
              <strong className="num">{formatearMonto(p.plan.porMes)}</strong> al mes o{' '}
              <strong className="num">{formatearMonto(p.plan.porQuincena)}</strong> por quincena.
              {p.plan.estado !== 'en tiempo' && (
                <> Vas {formatearMonto(Math.abs(p.plan.diferencia), { sinCentavos: true })} {p.plan.estado === 'adelantado' ? 'arriba' : 'abajo'} del ritmo.</>
              )}
            </>
          )}
        </p>
      )}
      {!compacta && !p.plan && !p.completada && <p className="meta-plan">Faltan {formatearMonto(p.faltante)}.</p>}
    </div>
  );
}

export function Metas() {
  const metas = useMetas();
  const principal = useMetaPrincipal();
  const [editando, setEditando] = useState<Meta | null>(null);
  const [movimiento, setMovimiento] = useState<{ meta: Meta; signo: 1 | -1 } | null>(null);

  return (
    <>
      <div className="barra-acciones" style={{ marginTop: 0 }}>
        <button
          className="btn btn-primario"
          onClick={() => setEditando({ nombre: '', montoObjetivo: 0, fechaObjetivo: null, color: '#2E7D5B', aportaciones: [], creada: hoyISO() })}
        >
          <Plus size={18} /> Nueva meta
        </button>
      </div>

      {metas.length === 0 && (
        <div className="tarjeta vacio">
          <Target size={40} strokeWidth={1.5} />
          <p>Crea una meta (fondo de emergencia, viaje, congreso…) y aparta dinero de tus cuentas para ella.</p>
          <p>El dinero apartado deja de contar en el saldo de la cuenta, pero no es un gasto.</p>
        </div>
      )}

      {metas.map((m) => (
        <section key={m.id} className="tarjeta">
          <div className="meta-acciones-superiores">
            <button
              className="btn-icono"
              aria-label={principal?.id === m.id ? `${m.nombre} es la meta principal` : `Marcar ${m.nombre} como meta principal`}
              aria-pressed={principal?.id === m.id}
              onClick={() => guardarAjuste(AJUSTE_META_PRINCIPAL, m.id)}
            >
              <Star size={20} fill={principal?.id === m.id ? 'var(--naranja)' : 'none'} color={principal?.id === m.id ? 'var(--naranja)' : 'var(--texto-terciario)'} />
            </button>
            <button className="enlace" onClick={() => setEditando(m)}>Editar</button>
          </div>
          <ResumenMeta meta={m} />
          <div className="botones" style={{ marginTop: 'var(--esp-3)' }}>
            <button className="btn btn-primario" onClick={() => setMovimiento({ meta: m, signo: 1 })}><Plus size={16} /> Aportar</button>
            <button className="btn btn-secundario" onClick={() => setMovimiento({ meta: m, signo: -1 })} disabled={planMeta(m, hoyISO()).ahorrado <= 0}>
              <Minus size={16} /> Retirar
            </button>
          </div>
        </section>
      ))}

      <HojaInferior abierta={!!editando} alCerrar={() => setEditando(null)} etiqueta="Meta de ahorro">
        {editando && <FormMeta key={editando.id ?? 'nueva'} inicial={editando} alCerrar={() => setEditando(null)} />}
      </HojaInferior>
      <HojaInferior abierta={!!movimiento} alCerrar={() => setMovimiento(null)} etiqueta="Aportación">
        {movimiento && <FormAportacion {...movimiento} alCerrar={() => setMovimiento(null)} />}
      </HojaInferior>
    </>
  );
}

function FormAportacion({ meta, signo, alCerrar }: { meta: Meta; signo: 1 | -1; alCerrar: () => void }) {
  const avisar = useAviso();
  const cuentas = useCuentas().filter((c) => !c.archivada && c.tipo !== 'credito');
  const saldos = useSaldos();
  const [monto, setMonto] = useState(0);
  const [eleccion, setCuentaId] = useState<number | null>(null);
  // Las cuentas llegan de forma asíncrona: si no hay elección, se usa débito (o la primera).
  const cuentaId = eleccion ?? cuentas.find((c) => c.tipo === 'debito')?.id ?? cuentas[0]?.id ?? null;
  const [fecha, setFecha] = useState(hoyISO());
  const ahorrado = planMeta(meta, hoyISO()).ahorrado;
  const excede = signo === -1 && monto > ahorrado;

  return (
    <div className="formulario">
      <EncabezadoHoja titulo={`${signo === 1 ? 'Aportar a' : 'Retirar de'} ${meta.nombre}`} alCerrar={alCerrar} />
      <Campo etiqueta="Monto" ayuda={signo === -1 ? `Disponible en la meta: ${formatearMonto(ahorrado)}` : undefined}>
        {(id) => <CampoMonto id={id} valor={monto} alCambiar={setMonto} />}
      </Campo>
      <Campo etiqueta={signo === 1 ? 'Sale de la cuenta' : 'Regresa a la cuenta'}>
        {(id) => (
          <select id={id} className="campo" value={cuentaId ?? ''} onChange={(e) => setCuentaId(Number(e.target.value))}>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre} ({formatearMonto(saldos?.get(c.id!) ?? 0)})</option>
            ))}
          </select>
        )}
      </Campo>
      <Campo etiqueta="Fecha">{(id) => <input id={id} className="campo" type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />}</Campo>
      {excede && <p className="campo-ayuda texto-alerta">No puedes retirar más de lo ahorrado.</p>}
      <button
        className="btn btn-primario btn-bloque"
        disabled={monto <= 0 || cuentaId == null || excede}
        onClick={async () => {
          await agregarAportacion(meta.id!, { fecha, monto: signo * monto, cuentaId: cuentaId! });
          avisar(signo === 1 ? `Apartaste ${formatearMonto(monto)} para ${meta.nombre}` : `Retiraste ${formatearMonto(monto)} de ${meta.nombre}`);
          alCerrar();
        }}
      >
        {signo === 1 ? 'Aportar' : 'Retirar'}
      </button>
    </div>
  );
}

function FormMeta({ inicial, alCerrar }: { inicial: Meta; alCerrar: () => void }) {
  const avisar = useAviso();
  const cuentas = useMapa(useCuentas());
  const [m, setM] = useState(inicial);
  const [conFecha, setConFecha] = useState(inicial.fechaObjetivo != null);
  const cambiar = (p: Partial<Meta>) => setM((x) => ({ ...x, ...p }));
  const nueva = inicial.id == null;
  const valido = m.nombre.trim() && m.montoObjetivo > 0 && (!conFecha || (m.fechaObjetivo && m.fechaObjetivo > m.creada));
  // Las aportaciones se leen del estado guardado para reflejar borrados al instante.
  const aportaciones = inicial.aportaciones.map((a, i) => ({ ...a, i })).reverse();

  return (
    <div className="formulario">
      <EncabezadoHoja titulo={nueva ? 'Nueva meta' : 'Editar meta'} alCerrar={alCerrar} />
      <Campo etiqueta="Nombre">
        {(id) => <input id={id} className="campo" value={m.nombre} maxLength={40} placeholder="p. ej. Fondo de emergencia" onChange={(e) => cambiar({ nombre: e.target.value })} />}
      </Campo>
      <Campo etiqueta="Monto objetivo">{(id) => <CampoMonto id={id} valor={m.montoObjetivo} alCambiar={(montoObjetivo) => cambiar({ montoObjetivo })} />}</Campo>
      <label className="casilla">
        <input type="checkbox" checked={conFecha} onChange={(e) => setConFecha(e.target.checked)} />
        Tiene fecha objetivo
      </label>
      {conFecha && (
        <Campo etiqueta="Fecha objetivo">
          {(id) => <input id={id} className="campo" type="date" min={m.creada} value={m.fechaObjetivo ?? ''} onChange={(e) => cambiar({ fechaObjetivo: e.target.value || null })} />}
        </Campo>
      )}
      <Campo etiqueta="Color">{() => <SelectorColor valor={m.color} alCambiar={(color) => cambiar({ color })} />}</Campo>
      <button
        className="btn btn-primario btn-bloque"
        disabled={!valido}
        onClick={async () => {
          await guardarMeta({ ...m, nombre: m.nombre.trim(), fechaObjetivo: conFecha ? m.fechaObjetivo : null, aportaciones: inicial.aportaciones });
          avisar(nueva ? 'Meta creada' : 'Meta actualizada');
          alCerrar();
        }}
      >
        Guardar
      </button>

      {!nueva && aportaciones.length > 0 && (
        <div>
          <h3 className="subtitulo">Historial</h3>
          <ul className="lista-simple">
            {aportaciones.map((a) => (
              <li key={a.i}>
                <span className="fecha-chica">{etiquetaFechaCorta(a.fecha)}</span>
                <span className="lista-simple-texto">{cuentas.get(a.cuentaId)?.nombre ?? 'Cuenta'}</span>
                <span className={`num ${a.monto < 0 ? 'monto-gasto' : 'monto-ingreso'}`}>{formatearMonto(a.monto, { signo: true })}</span>
                <button
                  className="btn-icono"
                  aria-label="Borrar aportación"
                  onClick={async () => {
                    if (!window.confirm('¿Borrar esta aportación? El dinero vuelve a contar en el saldo de la cuenta.')) return;
                    await quitarAportacion(inicial.id!, a.i);
                    alCerrar();
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!nueva && (
        <button
          className="btn btn-peligro btn-bloque"
          onClick={async () => {
            if (!window.confirm(`¿Eliminar la meta "${inicial.nombre}"? Lo apartado vuelve a contar en el saldo de sus cuentas.`)) return;
            await eliminarMeta(inicial.id!);
            avisar('Meta eliminada');
            alCerrar();
          }}
        >
          Eliminar meta
        </button>
      )}
    </div>
  );
}
