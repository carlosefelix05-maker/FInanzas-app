import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, CreditCard, DownloadCloud, Repeat, Smartphone, Wallet } from 'lucide-react';
import { useAjuste, useCuentas, useMovimientos, usePendientes, useSaldos } from '../hooks/datos';
import { formatearMonto } from '../lib/dinero';
import { diasEntre, etiquetaFechaCorta, etiquetaPeriodo, hoyISO, rangoPeriodo } from '../lib/fechas';
import { calcularTotales, compararMovimientos, filtrarPorRango } from '../lib/movimientos';
import { gastoPorDia } from '../lib/analisis';
import { ListaMovimientos } from '../components/ListaMovimientos';
import { ListaPendientes } from '../components/Pendientes';
import { FilaPresupuesto, useEstadoPresupuestos } from './Presupuestos';
import { useEstadosTarjetas } from './Tarjetas';
import { ResumenMeta, useMetaPrincipal } from './Metas';
import { AJUSTE_ULTIMO_RESPALDO } from '../db/acciones';
import type { Pantalla } from '../App';

const DIAS_AVISO_RESPALDO = 14;

function esIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}
function instalada() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function Inicio({ irA }: { irA: (p: Pantalla) => void }) {
  const movimientos = useMovimientos();
  const cuentas = useCuentas();
  const saldos = useSaldos();
  const pendientes = usePendientes();
  const presupuestos = useEstadoPresupuestos();
  const tarjetas = useEstadosTarjetas();
  const meta = useMetaPrincipal();
  const ultimoRespaldo = useAjuste<string | null>(AJUSTE_ULTIMO_RESPALDO, null);
  const hoy = hoyISO();
  const mes = rangoPeriodo('mes', hoy);

  const datos = useMemo(() => {
    if (!movimientos) return null;
    return {
      totales: calcularTotales(filtrarPorRango(movimientos, mes.inicio, mes.fin)),
      recientes: [...movimientos].sort(compararMovimientos).slice(0, 5),
      semana: gastoPorDia(movimientos, hoy, 7),
    };
  }, [movimientos, mes.inicio, mes.fin, hoy]);

  if (!datos || !saldos) return null;
  const { totales, recientes, semana } = datos;
  const activas = cuentas.filter((c) => !c.archivada);
  const total = activas.reduce((s, c) => s + (saldos.get(c.id!) ?? 0), 0);

  const enRiesgo = (presupuestos ?? []).filter((e) => e.nivel !== 'ok');
  const pagos = (tarjetas ?? []).filter((t) => t.estado.pagoProximo);
  const diasSinRespaldo = ultimoRespaldo ? diasEntre(ultimoRespaldo.slice(0, 10), hoy) : null;
  const hayDatos = (movimientos?.length ?? 0) > 0;
  const avisarRespaldo = hayDatos && (diasSinRespaldo == null || diasSinRespaldo > DIAS_AVISO_RESPALDO);
  const avisarInstalar = esIOS() && !instalada();
  const totalSemana = semana.reduce((s, d) => s + d.gasto, 0);

  return (
    <>
      <section className="tarjeta resumen-mes">
        <div className="etiqueta">{etiquetaPeriodo('mes', hoy)}</div>
        <div className={`resumen-balance num ${totales.balance < 0 ? 'monto-gasto' : ''}`}>{formatearMonto(totales.balance)}</div>
        <div className="etiqueta" style={{ marginTop: -4 }}>Balance del mes</div>
        <div className="resumen-fila">
          <div>
            <div className="etiqueta">Ingresos</div>
            <div className="num monto-ingreso resumen-cifra">{formatearMonto(totales.ingresos)}</div>
          </div>
          <div>
            <div className="etiqueta">Gastos</div>
            <div className="num monto-gasto resumen-cifra">{formatearMonto(totales.gastos)}</div>
          </div>
        </div>
      </section>

      {avisarInstalar && (
        <section className="tarjeta tarjeta-alerta">
          <p className="alerta-linea">
            <Smartphone size={20} className="icono-alerta" aria-hidden="true" />
            <span>Instala la app: en Safari toca <strong>Compartir → Agregar a inicio</strong>. Así iOS no borra tus datos.</span>
          </p>
        </section>
      )}

      {pagos.map(({ cuenta, estado }) => (
        <button key={cuenta.id} className="tarjeta tarjeta-alerta alerta-boton" onClick={() => irA('tarjetas')}>
          <CreditCard size={20} className="icono-alerta" aria-hidden="true" />
          <span>
            <strong>Pago de {cuenta.nombre} {estado.diasAlLimite === 0 ? 'hoy' : estado.diasAlLimite === 1 ? 'mañana' : `en ${estado.diasAlLimite} días`}</strong>
            <small>{formatearMonto(estado.pagoSinIntereses)} para no generar intereses · límite {etiquetaFechaCorta(estado.fechaLimitePago)}</small>
          </span>
          <ChevronRight size={18} color="var(--naranja)" aria-hidden="true" />
        </button>
      ))}

      {pendientes.length > 0 && (
        <section className="tarjeta tarjeta-alerta">
          <div className="tarjeta-titulo">
            <h2><Repeat size={18} className="icono-titulo icono-alerta" aria-hidden="true" />Por confirmar ({pendientes.length})</h2>
            {pendientes.length > 3 && <button className="enlace" onClick={() => irA('recurrentes')}>Ver todos <ChevronRight size={16} color="var(--naranja)" /></button>}
          </div>
          <ListaPendientes limite={3} />
        </section>
      )}

      {avisarRespaldo && (
        <button className="tarjeta tarjeta-alerta alerta-boton" onClick={() => irA('ajustes')}>
          <DownloadCloud size={20} className="icono-alerta" aria-hidden="true" />
          <span>
            <strong>{diasSinRespaldo == null ? 'Aún no tienes respaldo' : `Último respaldo hace ${diasSinRespaldo} días`}</strong>
            <small>Tus datos solo viven en este teléfono. Exporta un respaldo en Ajustes.</small>
          </span>
          <ChevronRight size={18} color="var(--naranja)" aria-hidden="true" />
        </button>
      )}

      {presupuestos && presupuestos.length > 0 && (
        <section className="tarjeta">
          <div className="tarjeta-titulo">
            <h2>{enRiesgo.length ? <><AlertTriangle size={18} className="icono-titulo icono-alerta" aria-hidden="true" />Presupuestos</> : 'Presupuestos'}</h2>
            <button className="enlace" onClick={() => irA('presupuestos')}>Ver todos <ChevronRight size={16} color="var(--naranja)" /></button>
          </div>
          <div className="lista-presupuestos">
            {(enRiesgo.length ? enRiesgo : presupuestos).slice(0, 3).map((e) => <FilaPresupuesto key={e.presupuesto.id} e={e} />)}
          </div>
          {enRiesgo.length === 0 && <p className="campo-ayuda">Todos tus presupuestos van bien.</p>}
        </section>
      )}

      <section className="tarjeta">
        <div className="tarjeta-titulo">
          <h2>Gasto de los últimos 7 días</h2>
          <span className="num"><strong>{formatearMonto(totalSemana, { sinCentavos: true })}</strong></span>
        </div>
        <MiniBarras dias={semana} />
      </section>

      {meta && (
        <section className="tarjeta">
          <div className="tarjeta-titulo">
            <h2>Meta principal</h2>
            <button className="enlace" onClick={() => irA('metas')}>Ver metas <ChevronRight size={16} color="var(--naranja)" /></button>
          </div>
          <ResumenMeta meta={meta} />
        </section>
      )}

      <section className="tarjeta">
        <div className="tarjeta-titulo">
          <h2>Cuentas</h2>
          <button className="enlace" onClick={() => irA('cuentas')}>Administrar <ChevronRight size={16} color="var(--naranja)" /></button>
        </div>
        <ul className="lista-cuentas">
          {activas.map((c) => {
            const s = saldos.get(c.id!) ?? 0;
            return (
              <li key={c.id}>
                <span className="punto" style={{ background: c.color }} aria-hidden="true" />
                <span className="lista-cuentas-nombre">{c.nombre}</span>
                <span className={`num ${s < 0 ? 'monto-gasto' : ''}`}>{formatearMonto(s)}</span>
              </li>
            );
          })}
          <li className="lista-cuentas-total">
            <Wallet size={16} aria-hidden="true" />
            <span className="lista-cuentas-nombre">Total</span>
            <span className={`num ${total < 0 ? 'monto-gasto' : ''}`}>{formatearMonto(total)}</span>
          </li>
        </ul>
      </section>

      <section className="tarjeta">
        <div className="tarjeta-titulo">
          <h2>Últimos movimientos</h2>
          {recientes.length > 0 && (
            <button className="enlace" onClick={() => irA('movimientos')}>Ver todos <ChevronRight size={16} color="var(--naranja)" /></button>
          )}
        </div>
        {recientes.length === 0 ? (
          <p className="vacio" style={{ padding: 'var(--esp-3) 0' }}>Toca <strong>+</strong> para registrar tu primer movimiento.</p>
        ) : (
          <ListaMovimientos movimientos={recientes} sinTotalesDia />
        )}
      </section>
    </>
  );
}

/** Barras de gasto diario. Al tocar una barra se muestra su monto. */
function MiniBarras({ dias }: { dias: { fecha: string; etiqueta: string; gasto: number }[] }) {
  const [sel, setSel] = useState(dias.length - 1);
  const max = Math.max(1, ...dias.map((d) => d.gasto));
  const elegido = dias[sel];
  return (
    <div className="mini-barras">
      <p className="mini-barras-valor num">
        {etiquetaFechaCorta(elegido.fecha)}: <strong>{formatearMonto(elegido.gasto)}</strong>
      </p>
      <div className="mini-barras-zona">
        {dias.map((d, i) => (
          <button
            key={d.fecha}
            className="mini-barra"
            aria-pressed={i === sel}
            aria-label={`${etiquetaFechaCorta(d.fecha)}: ${formatearMonto(d.gasto)}`}
            onClick={() => setSel(i)}
          >
            <span className="mini-barra-relleno" style={{ height: `${Math.max(d.gasto ? 4 : 0, (d.gasto / max) * 100)}%` }} />
            <span className="mini-barra-dia" aria-hidden="true">{d.etiqueta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
