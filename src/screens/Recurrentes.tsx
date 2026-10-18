import { useMemo, useState } from 'react';
import { CalendarClock, Plus, Repeat } from 'lucide-react';
import { HojaInferior } from '../components/HojaInferior';
import { IconoCategoria } from '../components/iconos';
import { ListaPendientes } from '../components/Pendientes';
import { SelectorCategoria } from '../components/SelectorCategoria';
import { useAviso } from '../components/Toast';
import { Campo, CampoMonto, EncabezadoHoja, Segmentado } from '../components/Formularios';
import { eliminarRecurrente, guardarRecurrente } from '../db/acciones';
import { useCategorias, useCuentas, useMapa, usePendientes, useRecurrentes } from '../hooks/datos';
import { formatearMonto } from '../lib/dinero';
import { etiquetaFechaCorta, hoyISO } from '../lib/fechas';
import { describirFrecuencia, NOMBRE_FRECUENCIA, ocurrencia, proximasOcurrencias } from '../lib/recurrentes';
import type { Frecuencia, Recurrente, TipoMovimiento } from '../lib/tipos';

export function Recurrentes() {
  const recurrentes = useRecurrentes();
  const pendientes = usePendientes();
  const categorias = useMapa(useCategorias());
  const cuentas = useMapa(useCuentas());
  const [editando, setEditando] = useState<Recurrente | null>(null);
  const hoy = hoyISO();

  const proximos = useMemo(
    () =>
      recurrentes
        .flatMap((r) => proximasOcurrencias(r, hoy, 30).map((fecha) => ({ r, fecha })))
        .sort((a, b) => (a.fecha < b.fecha ? -1 : 1)),
    [recurrentes, hoy],
  );

  const nombre = (r: Recurrente) =>
    r.plantilla.nota || (r.plantilla.categoriaId != null ? categorias.get(r.plantilla.categoriaId)?.nombre : null) || 'Transferencia';
  const claseMonto = (r: Recurrente) => (r.plantilla.tipo === 'ingreso' ? 'monto-ingreso' : r.plantilla.tipo === 'gasto' ? 'monto-gasto' : '');
  const icono = (r: Recurrente) => {
    const c = r.plantilla.categoriaId != null ? categorias.get(r.plantilla.categoriaId) : undefined;
    return <IconoCategoria icono={c?.icono ?? 'repeat'} color={c?.color ?? '#4E6E9A'} tam={36} />;
  };

  return (
    <>
      {pendientes.length > 0 && (
        <section className="tarjeta tarjeta-alerta">
          <h2>Por confirmar ({pendientes.length})</h2>
          <ListaPendientes />
        </section>
      )}

      <section className="tarjeta">
        <h2><CalendarClock size={18} aria-hidden="true" className="icono-titulo" />Próximos 30 días</h2>
        {proximos.length === 0 ? (
          <p className="texto-ayuda">Nada programado.</p>
        ) : (
          <ul className="lista-simple">
            {proximos.map(({ r, fecha }) => (
              <li key={`${r.id}-${fecha}`}>
                <span className="fecha-chica">{etiquetaFechaCorta(fecha)}</span>
                <span className="lista-simple-texto">{nombre(r)}</span>
                <span className={`num ${claseMonto(r)}`}>{formatearMonto(r.plantilla.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="barra-acciones">
        <button className="btn btn-primario" onClick={() => setEditando(nuevoRecurrente(hoy, cuentas.keys().next().value ?? 1))}>
          <Plus size={18} /> Nuevo recurrente
        </button>
      </div>

      {recurrentes.length === 0 ? (
        <div className="tarjeta vacio">
          <Repeat size={40} strokeWidth={1.5} />
          <p>Registra aquí tu sueldo, renta, suscripciones o cualquier pago que se repite.</p>
          <p>Al abrir la app te pediré confirmarlos cuando venzan.</p>
        </div>
      ) : (
        <ul className="tarjeta lista-ajustes">
          {recurrentes.map((r) => (
            <li key={r.id} className={`fila-ajuste ${r.activo ? '' : 'archivada'}`}>
              <button className="fila-ajuste-principal" onClick={() => setEditando(r)}>
                {icono(r)}
                <span className="fila-ajuste-nombre">
                  {nombre(r)}
                  <small>
                    {describirFrecuencia(r)} · {r.activo ? `próximo ${etiquetaFechaCorta(r.proximaFecha)}` : 'pausado'}
                  </small>
                </span>
                <span className={`num fila-ajuste-monto ${claseMonto(r)}`}>{formatearMonto(r.plantilla.monto)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <HojaInferior abierta={!!editando} alCerrar={() => setEditando(null)} etiqueta="Movimiento recurrente">
        {editando && <FormRecurrente key={editando.id ?? 'nuevo'} inicial={editando} alCerrar={() => setEditando(null)} />}
      </HojaInferior>
    </>
  );
}

function nuevoRecurrente(hoy: string, cuentaId: number): Recurrente {
  return {
    plantilla: { tipo: 'gasto', monto: 0, categoriaId: null, cuentaId, cuentaDestinoId: null, nota: '' },
    frecuencia: 'mensual',
    inicio: hoy,
    generadas: 0,
    proximaFecha: hoy,
    activo: true,
  };
}

const TIPOS: { valor: TipoMovimiento; etiqueta: string }[] = [
  { valor: 'gasto', etiqueta: 'Gasto' },
  { valor: 'ingreso', etiqueta: 'Ingreso' },
  { valor: 'transferencia', etiqueta: 'Transf.' },
];

function FormRecurrente({ inicial, alCerrar }: { inicial: Recurrente; alCerrar: () => void }) {
  const avisar = useAviso();
  const categorias = useCategorias();
  const cuentas = useCuentas().filter((c) => !c.archivada || c.id === inicial.plantilla.cuentaId);
  const [r, setR] = useState(inicial);
  const p = r.plantilla;
  const nuevo = inicial.id == null;
  const cambiarP = (x: Partial<Recurrente['plantilla']>) => setR((v) => ({ ...v, plantilla: { ...v.plantilla, ...x } }));
  const valido =
    p.monto > 0 && (p.tipo === 'transferencia' ? p.cuentaDestinoId != null && p.cuentaDestinoId !== p.cuentaId : p.categoriaId != null);

  const guardar = async () => {
    if (!valido) return;
    // Si cambia el calendario de una regla existente, se salta las fechas pasadas
    // para no volver a pedir confirmación de lo ya registrado.
    const calendarioCambio =
      !nuevo && (r.inicio !== inicial.inicio || r.frecuencia !== inicial.frecuencia || r.cadaNDias !== inicial.cadaNDias);
    let generadas = r.generadas;
    if (calendarioCambio) {
      const hoy = hoyISO();
      generadas = 0;
      while (ocurrencia(r.inicio, r.frecuencia, generadas, r.cadaNDias) < hoy) generadas++;
    }
    const base = { ...r, generadas };
    const proximaFecha = ocurrencia(base.inicio, base.frecuencia, base.generadas, base.cadaNDias);
    await guardarRecurrente({
      ...base,
      plantilla: { ...p, nota: p.nota.trim(), categoriaId: p.tipo === 'transferencia' ? null : p.categoriaId, cuentaDestinoId: p.tipo === 'transferencia' ? p.cuentaDestinoId : null },
      proximaFecha,
    });
    avisar(nuevo ? 'Recurrente creado' : 'Recurrente actualizado');
    alCerrar();
  };

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar este recurrente? Los movimientos que ya confirmaste se conservan.')) return;
    await eliminarRecurrente(inicial.id!);
    avisar('Recurrente eliminado');
    alCerrar();
  };

  return (
    <div className="formulario">
      <EncabezadoHoja titulo={nuevo ? 'Nuevo recurrente' : 'Editar recurrente'} alCerrar={alCerrar} />
      <Segmentado etiqueta="Tipo" opciones={TIPOS} valor={p.tipo} alCambiar={(tipo) => cambiarP({ tipo, categoriaId: null })} />
      <Campo etiqueta="Monto">{(id) => <CampoMonto id={id} valor={p.monto} alCambiar={(monto) => cambiarP({ monto })} />}</Campo>
      <Campo etiqueta="Descripción" ayuda="p. ej. Renta, Netflix, Quincena">
        {(id) => <input id={id} className="campo" value={p.nota} maxLength={60} onChange={(e) => cambiarP({ nota: e.target.value })} />}
      </Campo>
      {p.tipo !== 'transferencia' && (
        <Campo etiqueta="Categoría">
          {(id) => (
            <SelectorCategoria id={id} categorias={categorias} tipo={p.tipo === 'ingreso' ? 'ingreso' : 'gasto'} valor={p.categoriaId} alCambiar={(categoriaId) => cambiarP({ categoriaId })} />
          )}
        </Campo>
      )}
      <div className="dos-columnas">
        <Campo etiqueta={p.tipo === 'transferencia' ? 'De' : 'Cuenta'}>
          {(id) => (
            <select id={id} className="campo" value={p.cuentaId} onChange={(e) => cambiarP({ cuentaId: Number(e.target.value) })}>
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}
        </Campo>
        {p.tipo === 'transferencia' && (
          <Campo etiqueta="A">
            {(id) => (
              <select id={id} className="campo" value={p.cuentaDestinoId ?? ''} onChange={(e) => cambiarP({ cuentaDestinoId: Number(e.target.value) })}>
                <option value="" disabled>Elegir…</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            )}
          </Campo>
        )}
      </div>
      <div className="dos-columnas">
        <Campo etiqueta="Frecuencia">
          {(id) => (
            <select id={id} className="campo" value={r.frecuencia} onChange={(e) => setR({ ...r, frecuencia: e.target.value as Frecuencia, cadaNDias: r.cadaNDias ?? 10 })}>
              {(Object.keys(NOMBRE_FRECUENCIA) as Frecuencia[]).map((f) => <option key={f} value={f}>{NOMBRE_FRECUENCIA[f]}</option>)}
            </select>
          )}
        </Campo>
        {r.frecuencia === 'dias' ? (
          <Campo etiqueta="Cada (días)">
            {(id) => (
              <input id={id} className="campo" type="number" inputMode="numeric" min={1} max={365} value={r.cadaNDias ?? 10}
                onChange={(e) => setR({ ...r, cadaNDias: Math.max(1, Math.min(365, Number(e.target.value) || 1)) })} />
            )}
          </Campo>
        ) : <span />}
      </div>
      <Campo
        etiqueta={nuevo ? 'Primera fecha' : 'Fecha de inicio'}
        ayuda={r.frecuencia === 'quincenal' ? 'Quincenal: se repite el mismo día y 15 días después cada mes (p. ej. 15 y 30).' : undefined}
      >
        {(id) => <input id={id} className="campo" type="date" value={r.inicio} onChange={(e) => e.target.value && setR({ ...r, inicio: e.target.value })} />}
      </Campo>
      <label className="casilla">
        <input type="checkbox" checked={r.activo} onChange={(e) => setR({ ...r, activo: e.target.checked })} />
        Activo
      </label>
      <button className="btn btn-primario btn-bloque" disabled={!valido} onClick={guardar}>Guardar</button>
      {!nuevo && <button className="btn btn-peligro btn-bloque" onClick={eliminar}>Eliminar</button>}
    </div>
  );
}
