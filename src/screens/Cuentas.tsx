import { useState } from 'react';
import { ArchiveRestore, ChevronDown, ChevronUp, CreditCard, Landmark, Plus, Wallet } from 'lucide-react';
import { HojaInferior } from '../components/HojaInferior';
import { useAviso } from '../components/Toast';
import { Campo, CampoMonto, EncabezadoHoja, Segmentado, SelectorColor } from '../components/Formularios';
import { bajaCuenta, guardarCuenta, moverCuenta, restaurarCuenta } from '../db/acciones';
import { useCuentas, useSaldos } from '../hooks/datos';
import { formatearMonto } from '../lib/dinero';
import type { Cuenta, TipoCuenta } from '../lib/tipos';

export const NOMBRE_TIPO_CUENTA: Record<TipoCuenta, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
};

const ICONO_TIPO = { efectivo: Wallet, debito: Landmark, credito: CreditCard };

export function Cuentas() {
  const cuentas = useCuentas();
  const avisar = useAviso();
  const [editando, setEditando] = useState<Cuenta | null>(null);
  const [ordenando, setOrdenando] = useState(false);
  const [verArchivadas, setVerArchivadas] = useState(false);

  const saldos = useSaldos() ?? new Map<number, number>();
  const activas = cuentas.filter((c) => !c.archivada);
  const archivadas = cuentas.filter((c) => c.archivada);
  const total = activas.reduce((s, c) => s + (saldos.get(c.id!) ?? 0), 0);

  return (
    <>
      <div className="barra-acciones" style={{ marginTop: 0 }}>
        <button
          className="btn btn-primario"
          onClick={() => setEditando({ nombre: '', tipo: 'debito', saldoInicial: 0, color: '#3E7CB1', archivada: false, orden: 0 })}
        >
          <Plus size={18} /> Nueva cuenta
        </button>
        <button className="btn btn-secundario" onClick={() => setOrdenando((o) => !o)} aria-pressed={ordenando}>
          {ordenando ? 'Listo' : 'Reordenar'}
        </button>
      </div>

      <ul className="tarjeta lista-ajustes">
        {activas.map((c, i) => {
          const Icono = ICONO_TIPO[c.tipo];
          const s = saldos.get(c.id!) ?? 0;
          return (
            <li key={c.id} className="fila-ajuste">
              <button className="fila-ajuste-principal" onClick={() => setEditando(c)} disabled={ordenando}>
                <span className="icono-cat" style={{ background: `${c.color}1f`, color: c.color }} aria-hidden="true">
                  <Icono size={20} strokeWidth={1.75} />
                </span>
                <span className="fila-ajuste-nombre">
                  {c.nombre}
                  <small>{NOMBRE_TIPO_CUENTA[c.tipo]}</small>
                </span>
                {!ordenando && <span className={`num fila-ajuste-monto ${s < 0 ? 'monto-gasto' : ''}`}>{formatearMonto(s)}</span>}
              </button>
              {ordenando && (
                <span className="flechas">
                  <button className="btn-icono" aria-label={`Subir ${c.nombre}`} disabled={i === 0} onClick={() => moverCuenta(c.id!, -1)}>
                    <ChevronUp size={20} />
                  </button>
                  <button className="btn-icono" aria-label={`Bajar ${c.nombre}`} disabled={i === activas.length - 1} onClick={() => moverCuenta(c.id!, 1)}>
                    <ChevronDown size={20} />
                  </button>
                </span>
              )}
            </li>
          );
        })}
        <li className="fila-ajuste total">
          <span className="fila-ajuste-nombre">Total</span>
          <span className={`num fila-ajuste-monto ${total < 0 ? 'monto-gasto' : ''}`}>{formatearMonto(total)}</span>
        </li>
      </ul>
      <p className="texto-ayuda" style={{ marginTop: 'var(--esp-3)' }}>
        En tarjetas de crédito, un saldo negativo es lo que debes. Pagar la tarjeta desde débito se registra como
        transferencia y no cuenta como gasto.
      </p>

      {archivadas.length > 0 && (
        <section className="seccion">
          <button className="enlace" onClick={() => setVerArchivadas((v) => !v)} aria-expanded={verArchivadas}>
            Archivadas ({archivadas.length}) <ChevronDown size={16} style={{ transform: verArchivadas ? 'rotate(180deg)' : undefined }} />
          </button>
          {verArchivadas && (
            <ul className="tarjeta lista-ajustes">
              {archivadas.map((c) => (
                <li key={c.id} className="fila-ajuste archivada">
                  <span className="fila-ajuste-nombre">{c.nombre}</span>
                  <button
                    className="btn btn-secundario"
                    onClick={async () => {
                      await restaurarCuenta(c.id!);
                      avisar(`"${c.nombre}" restaurada`);
                    }}
                  >
                    <ArchiveRestore size={16} /> Restaurar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <HojaInferior abierta={!!editando} alCerrar={() => setEditando(null)} etiqueta="Editar cuenta">
        {editando && <FormCuenta key={editando.id ?? 'nueva'} inicial={editando} alCerrar={() => setEditando(null)} />}
      </HojaInferior>
    </>
  );
}

const TIPOS: { valor: TipoCuenta; etiqueta: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'debito', etiqueta: 'Débito' },
  { valor: 'credito', etiqueta: 'Crédito' },
];

function FormCuenta({ inicial, alCerrar }: { inicial: Cuenta; alCerrar: () => void }) {
  const avisar = useAviso();
  const [c, setC] = useState(inicial);
  // En crédito capturamos la deuda como positivo y la guardamos negativa.
  const [montoInicial, setMontoInicial] = useState(Math.abs(inicial.saldoInicial));
  const [negativo, setNegativo] = useState(inicial.saldoInicial < 0);
  const cambiar = (p: Partial<Cuenta>) => setC((x) => ({ ...x, ...p }));
  const esCredito = c.tipo === 'credito';
  const valida = c.nombre.trim().length > 0;

  const guardar = async () => {
    if (!valida) return;
    const saldoInicial = esCredito ? -montoInicial : negativo ? -montoInicial : montoInicial;
    await guardarCuenta({ ...c, nombre: c.nombre.trim(), saldoInicial });
    avisar(inicial.id == null ? 'Cuenta creada' : 'Cuenta actualizada');
    alCerrar();
  };

  const baja = async () => {
    if (!window.confirm(`¿Eliminar "${inicial.nombre}"? Si tiene movimientos se archivará para conservar tu historial.`)) return;
    const r = await bajaCuenta(inicial.id!);
    avisar(r === 'archivada' ? `"${inicial.nombre}" archivada (tiene movimientos)` : `"${inicial.nombre}" eliminada`);
    alCerrar();
  };

  return (
    <div className="formulario">
      <EncabezadoHoja titulo={inicial.id == null ? 'Nueva cuenta' : 'Editar cuenta'} alCerrar={alCerrar} />
      <Campo etiqueta="Nombre">
        {(id) => (
          <input id={id} className="campo" value={c.nombre} maxLength={40} placeholder="p. ej. BBVA nómina" onChange={(e) => cambiar({ nombre: e.target.value })} />
        )}
      </Campo>
      <Campo etiqueta="Tipo">{() => <Segmentado etiqueta="Tipo de cuenta" opciones={TIPOS} valor={c.tipo} alCambiar={(tipo) => cambiar({ tipo })} />}</Campo>
      <Campo
        etiqueta={esCredito ? 'Deuda al empezar a usar la app' : 'Saldo al empezar a usar la app'}
        ayuda={
          esCredito
            ? 'Lo que debías en la tarjeta antes de tu primer movimiento registrado.'
            : 'El saldo actual se calcula sumando tus movimientos a este monto.'
        }
      >
        {(id) => (
          <>
            <CampoMonto id={id} valor={montoInicial} alCambiar={setMontoInicial} />
            {!esCredito && (
              <label className="casilla">
                <input type="checkbox" checked={negativo} onChange={(e) => setNegativo(e.target.checked)} />
                Saldo negativo (sobregiro)
              </label>
            )}
          </>
        )}
      </Campo>
      <Campo etiqueta="Color">{() => <SelectorColor valor={c.color} alCambiar={(color) => cambiar({ color })} />}</Campo>

      <button className="btn btn-primario btn-bloque" disabled={!valida} onClick={guardar}>Guardar</button>
      {inicial.id != null && (
        <button className="btn btn-peligro btn-bloque" onClick={baja}>Eliminar o archivar</button>
      )}
    </div>
  );
}
