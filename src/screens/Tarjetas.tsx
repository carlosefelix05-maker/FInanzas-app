import { useMemo, useState } from 'react';
import { CalendarDays, CreditCard, Plus, ShoppingBag } from 'lucide-react';
import { BarraProgreso } from '../components/Barra';
import { useCaptura } from '../components/Captura';
import { HojaInferior } from '../components/HojaInferior';
import { SelectorCategoria } from '../components/SelectorCategoria';
import { useAviso } from '../components/Toast';
import { Campo, CampoMonto, EncabezadoHoja, SelectorColor } from '../components/Formularios';
import { eliminarMsi, guardarCuenta, guardarMsi, guardarTarjeta } from '../db/acciones';
import { useCategorias, useCuentas, useMovimientos, useMsis, useTarjetas } from '../hooks/datos';
import { formatearMonto } from '../lib/dinero';
import { deISO, etiquetaFechaCorta, hoyISO } from '../lib/fechas';
import { estadoTarjeta, proximoCorte, resumenMsi, type EstadoTarjeta } from '../lib/tarjetas';
import type { Cuenta, Movimiento, Msi, Tarjeta } from '../lib/tipos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/** Estado de todas las tarjetas configuradas (lo usa también Inicio). */
export function useEstadosTarjetas(): { cuenta: Cuenta; tarjeta: Tarjeta; estado: EstadoTarjeta }[] | undefined {
  const cuentas = useCuentas();
  const tarjetas = useTarjetas();
  const msis = useMsis();
  const movs = useMovimientos();
  return useMemo(() => {
    if (!movs) return undefined;
    const hoy = hoyISO();
    return tarjetas.flatMap((t) => {
      const cuenta = cuentas.find((c) => c.id === t.cuentaId && !c.archivada && c.tipo === 'credito');
      return cuenta ? [{ cuenta, tarjeta: t, estado: estadoTarjeta(t, cuenta.saldoInicial, movs, msis, hoy) }] : [];
    });
  }, [cuentas, tarjetas, msis, movs]);
}

function diasTexto(n: number): string {
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  return `en ${n} días`;
}

export function Tarjetas() {
  const cuentas = useCuentas();
  const tarjetas = useTarjetas();
  const msis = useMsis();
  const estados = useEstadosTarjetas();
  const abrirCaptura = useCaptura();
  const [formTarjeta, setFormTarjeta] = useState<{ cuenta: Cuenta | null; tarjeta: Tarjeta | null } | null>(null);
  const [formMsi, setFormMsi] = useState<Msi | null>(null);

  const credito = cuentas.filter((c) => c.tipo === 'credito' && !c.archivada);
  const sinConfigurar = credito.filter((c) => !tarjetas.some((t) => t.cuentaId === c.id));
  const hoy = hoyISO();

  if (!estados) return null;

  return (
    <>
      <div className="barra-acciones" style={{ marginTop: 0 }}>
        <button className="btn btn-primario" onClick={() => setFormTarjeta({ cuenta: null, tarjeta: null })}>
          <Plus size={18} /> Nueva tarjeta
        </button>
      </div>

      {credito.length === 0 && (
        <div className="tarjeta vacio">
          <CreditCard size={40} strokeWidth={1.5} />
          <p>Agrega tus tarjetas de crédito para ver tu límite disponible, fechas de corte y pago, y tus compras a meses sin intereses.</p>
        </div>
      )}

      {sinConfigurar.map((c) => (
        <section key={c.id} className="tarjeta">
          <h2>{c.nombre}</h2>
          <p className="texto-ayuda">Falta configurar el límite y las fechas de corte y pago.</p>
          <button className="btn btn-secundario" onClick={() => setFormTarjeta({ cuenta: c, tarjeta: null })}>Configurar</button>
        </section>
      ))}

      {estados.map(({ cuenta, tarjeta, estado: e }) => {
        const susMsi = msis.filter((m) => m.tarjetaId === cuenta.id);
        const activos = susMsi.filter((m) => m.cuotasPagadas < m.meses);
        const nivelUso = e.porcentajeUso >= 100 ? 'excedido' : e.porcentajeUso >= 80 ? 'alerta' : 'ok';
        return (
          <section key={cuenta.id} className="tarjeta tarjeta-credito">
            <button className="tarjeta-credito-cabecera" onClick={() => setFormTarjeta({ cuenta, tarjeta })} aria-label={`Editar ${cuenta.nombre}`}>
              <span className="punto" style={{ background: cuenta.color, width: 12, height: 12 }} aria-hidden="true" />
              <h2>{cuenta.nombre}</h2>
              <span className={`num nivel-${nivelUso}`}>{e.porcentajeUso} % usado</span>
            </button>
            <BarraProgreso porcentaje={e.porcentajeUso} nivel={nivelUso} etiqueta={`Uso de ${cuenta.nombre}`} />
            <div className="presupuesto-pie num">
              <span>Usado {formatearMonto(e.usado)}</span>
              <span>Límite {formatearMonto(tarjeta.limite, { sinCentavos: true })}</span>
            </div>

            <dl className="datos-tarjeta">
              <div>
                <dt>Disponible</dt>
                <dd className={`num ${e.disponible < 0 ? 'monto-gasto' : ''}`}>{formatearMonto(e.disponible)}</dd>
              </div>
              <div>
                <dt>Deuda cargada</dt>
                <dd className="num">{formatearMonto(e.deuda)}</dd>
              </div>
              <div>
                <dt>Corte</dt>
                <dd>{diasTexto(e.diasAlCorte)} <small>({etiquetaFechaCorta(e.proximoCorte)})</small></dd>
              </div>
              <div>
                <dt>Fecha límite de pago</dt>
                <dd className={e.pagoProximo ? 'texto-alerta' : ''}>
                  {diasTexto(e.diasAlLimite)} <small>({etiquetaFechaCorta(e.fechaLimitePago)})</small>
                </dd>
              </div>
              <div>
                <dt>Compras del periodo</dt>
                <dd className="num">{formatearMonto(e.montoPeriodo)}</dd>
              </div>
              <div>
                <dt>Pago para no generar intereses</dt>
                <dd className="num"><strong>{formatearMonto(e.pagoSinIntereses)}</strong></dd>
              </div>
            </dl>
            {e.pendienteMsi > 0 && (
              <p className="campo-ayuda">Incluye en "usado" {formatearMonto(e.pendienteMsi)} de MSI por cargar.</p>
            )}

            <div className="botones" style={{ marginTop: 'var(--esp-3)' }}>
              <button
                className="btn btn-secundario"
                onClick={() =>
                  abrirCaptura({
                    tipo: 'transferencia',
                    monto: e.pagoSinIntereses || undefined,
                    cuentaDestinoId: cuenta.id!,
                    cuentaId: cuentas.find((c) => c.tipo === 'debito' && !c.archivada)?.id,
                    nota: `Pago ${cuenta.nombre}`,
                  } as Partial<Movimiento>)
                }
              >
                Registrar pago
              </button>
              <button
                className="btn btn-secundario"
                onClick={() =>
                  setFormMsi({
                    tarjetaId: cuenta.id!, descripcion: '', montoTotal: 0, meses: 12,
                    fechaPrimeraCuota: hoy, cuotasPagadas: 0, categoriaId: null,
                  })
                }
              >
                <ShoppingBag size={16} /> Compra a MSI
              </button>
            </div>

            {activos.length > 0 && (
              <div className="msi-lista">
                <h3>Meses sin intereses</h3>
                {activos.map((m) => {
                  const r = resumenMsi(m);
                  return (
                    <button key={m.id} className="msi" onClick={() => setFormMsi(m)}>
                      <div className="msi-cabecera">
                        <strong>{m.descripcion}</strong>
                        <span className="num">{formatearMonto(r.cuota)}/mes</span>
                      </div>
                      <BarraProgreso porcentaje={(m.cuotasPagadas / m.meses) * 100} color={cuenta.color} etiqueta={`Cuotas de ${m.descripcion}`} />
                      <div className="presupuesto-pie num">
                        <span>{m.cuotasPagadas} de {m.meses} · faltan {r.restantes}</span>
                        <span>Resta {formatearMonto(r.pendiente)}</span>
                      </div>
                      {r.proximaFecha && <small className="campo-ayuda">Siguiente cuota: {etiquetaFechaCorta(r.proximaFecha)}</small>}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <HojaInferior abierta={!!formTarjeta} alCerrar={() => setFormTarjeta(null)} etiqueta="Tarjeta de crédito">
        {formTarjeta && <FormTarjeta {...formTarjeta} alCerrar={() => setFormTarjeta(null)} />}
      </HojaInferior>
      <HojaInferior abierta={!!formMsi} alCerrar={() => setFormMsi(null)} etiqueta="Compra a meses sin intereses">
        {formMsi && <FormMsi key={formMsi.id ?? 'nueva'} inicial={formMsi} alCerrar={() => setFormMsi(null)} />}
      </HojaInferior>
    </>
  );
}

function CampoDia({ id, valor, alCambiar }: { id: string; valor: number; alCambiar: (d: number) => void }) {
  return (
    <select id={id} className="campo" value={valor} onChange={(e) => alCambiar(Number(e.target.value))}>
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
    </select>
  );
}

function FormTarjeta({ cuenta, tarjeta, alCerrar }: { cuenta: Cuenta | null; tarjeta: Tarjeta | null; alCerrar: () => void }) {
  const avisar = useAviso();
  const [nombre, setNombre] = useState(cuenta?.nombre ?? '');
  const [color, setColor] = useState(cuenta?.color ?? '#1A3A5C');
  const [deuda, setDeuda] = useState(cuenta ? Math.max(0, -cuenta.saldoInicial) : 0);
  const [limite, setLimite] = useState(tarjeta?.limite ?? 0);
  const [diaCorte, setDiaCorte] = useState(tarjeta?.diaCorte ?? 5);
  const [diaPago, setDiaPago] = useState(tarjeta?.diaLimitePago ?? 25);
  const valido = nombre.trim() && limite > 0;

  const guardar = async () => {
    if (!valido) return;
    const cuentaId = await guardarCuenta({
      ...(cuenta ?? { tipo: 'credito', archivada: false, orden: 0 }),
      nombre: nombre.trim(),
      color,
      saldoInicial: -deuda,
    } as Cuenta);
    await guardarTarjeta({ ...(tarjeta ?? {}), cuentaId, limite, diaCorte, diaLimitePago: diaPago });
    avisar('Tarjeta guardada');
    alCerrar();
  };

  return (
    <div className="formulario">
      <EncabezadoHoja titulo={tarjeta ? 'Editar tarjeta' : cuenta ? 'Configurar tarjeta' : 'Nueva tarjeta'} alCerrar={alCerrar} />
      <Campo etiqueta="Nombre">
        {(id) => <input id={id} className="campo" value={nombre} maxLength={40} placeholder="p. ej. BBVA Azul" onChange={(e) => setNombre(e.target.value)} />}
      </Campo>
      <Campo etiqueta="Límite de crédito">{(id) => <CampoMonto id={id} valor={limite} alCambiar={setLimite} />}</Campo>
      <div className="dos-columnas">
        <Campo etiqueta="Día de corte">{(id) => <CampoDia id={id} valor={diaCorte} alCambiar={setDiaCorte} />}</Campo>
        <Campo etiqueta="Día límite de pago">{(id) => <CampoDia id={id} valor={diaPago} alCambiar={setDiaPago} />}</Campo>
      </div>
      <Campo etiqueta="Deuda al empezar a usar la app" ayuda="Lo que debías antes de registrar movimientos en la app (sin MSI pendientes).">
        {(id) => <CampoMonto id={id} valor={deuda} alCambiar={setDeuda} />}
      </Campo>
      <Campo etiqueta="Color">{() => <SelectorColor valor={color} alCambiar={setColor} />}</Campo>
      <button className="btn btn-primario btn-bloque" disabled={!valido} onClick={guardar}>Guardar</button>
      {cuenta && <p className="campo-ayuda">Para archivar o eliminar la tarjeta, usa Ajustes → Cuentas.</p>}
    </div>
  );
}

const PLAZOS = [3, 6, 9, 10, 12, 13, 15, 18, 20, 24];

function FormMsi({ inicial, alCerrar }: { inicial: Msi; alCerrar: () => void }) {
  const avisar = useAviso();
  const categorias = useCategorias();
  const tarjetas = useTarjetas();
  const [m, setM] = useState(inicial);
  const cambiar = (p: Partial<Msi>) => setM((x) => ({ ...x, ...p }));
  const nueva = inicial.id == null;
  // Una vez cargadas cuotas, el calendario no se puede cambiar sin descuadrar lo ya registrado.
  const bloqueado = !nueva && inicial.cuotasPagadas > 0;
  const valido = m.descripcion.trim() && m.montoTotal > 0 && m.meses >= 2 && m.cuotasPagadas < m.meses;
  const t = tarjetas.find((x) => x.cuentaId === m.tarjetaId);

  const guardar = async () => {
    if (!valido) return;
    await guardarMsi({ ...m, descripcion: m.descripcion.trim() });
    avisar(nueva ? 'Compra a MSI registrada' : 'Compra actualizada');
    alCerrar();
  };

  const eliminar = async () => {
    const conCuotas = inicial.cuotasPagadas > 0
      ? window.confirm('¿Borrar también las cuotas ya cargadas como gastos?\n\nAceptar: borra la compra y sus cuotas.\nCancelar: conserva las cuotas como gastos normales.')
      : false;
    if (!window.confirm(`¿Eliminar la compra "${inicial.descripcion}"?`)) return;
    await eliminarMsi(inicial.id!, conCuotas);
    avisar('Compra eliminada');
    alCerrar();
  };

  return (
    <div className="formulario">
      <EncabezadoHoja titulo={nueva ? 'Compra a meses sin intereses' : 'Editar compra a MSI'} alCerrar={alCerrar} />
      <Campo etiqueta="Descripción">
        {(id) => <input id={id} className="campo" value={m.descripcion} maxLength={60} placeholder="p. ej. Laptop" onChange={(e) => cambiar({ descripcion: e.target.value })} />}
      </Campo>
      <div className="dos-columnas">
        <Campo etiqueta="Monto total">{(id) => bloqueado
          ? <input id={id} className="campo num" value={formatearMonto(m.montoTotal)} disabled />
          : <CampoMonto id={id} valor={m.montoTotal} alCambiar={(montoTotal) => cambiar({ montoTotal })} />}
        </Campo>
        <Campo etiqueta="Meses">
          {(id) => (
            <select id={id} className="campo" value={m.meses} disabled={bloqueado} onChange={(e) => cambiar({ meses: Number(e.target.value) })}>
              {[...new Set([...PLAZOS, m.meses])].sort((a, b) => a - b).map((p) => <option key={p} value={p}>{p} meses</option>)}
            </select>
          )}
        </Campo>
      </div>
      {m.montoTotal > 0 && <p className="campo-ayuda num">Cuota mensual: {formatearMonto(Math.floor(m.montoTotal / m.meses))}</p>}
      <Campo
        etiqueta="Fecha de la primera cuota"
        ayuda={t ? `Normalmente se carga en tu próximo corte (${format(deISO(proximoCorte(t.diaCorte, hoyISO())), "d 'de' MMMM", { locale: es })}).` : undefined}
      >
        {(id) => <input id={id} className="campo" type="date" value={m.fechaPrimeraCuota} disabled={bloqueado} onChange={(e) => e.target.value && cambiar({ fechaPrimeraCuota: e.target.value })} />}
      </Campo>
      {nueva && (
        <Campo etiqueta="Cuotas ya pagadas antes de usar la app" ayuda="Estas no se registran como gastos.">
          {(id) => (
            <select id={id} className="campo" value={m.cuotasPagadas} onChange={(e) => cambiar({ cuotasPagadas: Number(e.target.value) })}>
              {Array.from({ length: m.meses }, (_, i) => i).map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          )}
        </Campo>
      )}
      <Campo etiqueta="Categoría de las cuotas" ayuda="Cada cuota cuenta como gasto en su mes.">
        {(id) => <SelectorCategoria id={id} categorias={categorias} tipo="gasto" valor={m.categoriaId} alCambiar={(categoriaId) => cambiar({ categoriaId })} />}
      </Campo>
      <button className="btn btn-primario btn-bloque" disabled={!valido} onClick={guardar}>Guardar</button>
      {!nueva && <button className="btn btn-peligro btn-bloque" onClick={eliminar}>Eliminar compra</button>}
      <p className="campo-ayuda"><CalendarDays size={14} style={{ verticalAlign: '-2px' }} /> Las cuotas vencidas se cargan solas a la tarjeta al abrir la app.</p>
    </div>
  );
}
