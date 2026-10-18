import { useMemo } from 'react';
import { ChevronRight, Wallet } from 'lucide-react';
import { useCuentas, useMovimientos } from '../hooks/datos';
import { formatearMonto } from '../lib/dinero';
import { etiquetaPeriodo, hoyISO, rangoPeriodo } from '../lib/fechas';
import { calcularSaldos, calcularTotales, compararMovimientos, filtrarPorRango } from '../lib/movimientos';
import { ListaMovimientos } from '../components/ListaMovimientos';

export function Inicio({ irA }: { irA: (tab: 'movimientos') => void }) {
  const movimientos = useMovimientos();
  const cuentas = useCuentas();
  const hoy = hoyISO();
  const mes = rangoPeriodo('mes', hoy);

  const datos = useMemo(() => {
    if (!movimientos) return null;
    const delMes = filtrarPorRango(movimientos, mes.inicio, mes.fin);
    return {
      totales: calcularTotales(delMes),
      saldos: calcularSaldos(cuentas, movimientos),
      recientes: [...movimientos].sort(compararMovimientos).slice(0, 5),
    };
  }, [movimientos, cuentas, mes.inicio, mes.fin]);

  if (!datos) return null;
  const { totales, saldos, recientes } = datos;
  const activas = cuentas.filter((c) => !c.archivada);
  const total = activas.reduce((s, c) => s + (saldos.get(c.id!) ?? 0), 0);

  return (
    <>
      <section className="tarjeta resumen-mes">
        <div className="etiqueta">{etiquetaPeriodo('mes', hoy)}</div>
        <div className={`resumen-balance num ${totales.balance < 0 ? 'monto-gasto' : ''}`}>
          {formatearMonto(totales.balance)}
        </div>
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

      <section className="tarjeta">
        <h2>Cuentas</h2>
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
            <button className="enlace" onClick={() => irA('movimientos')}>
              Ver todos <ChevronRight size={16} color="var(--naranja)" />
            </button>
          )}
        </div>
        {recientes.length === 0 ? (
          <p className="vacio" style={{ padding: 'var(--esp-3) 0' }}>
            Toca <strong>+</strong> para registrar tu primer movimiento.
          </p>
        ) : (
          <ListaMovimientos movimientos={recientes} />
        )}
      </section>
    </>
  );
}
