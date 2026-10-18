import { useMemo, useState } from 'react';
import { PiggyBank, Plus } from 'lucide-react';
import { BarraProgreso } from '../components/Barra';
import { HojaInferior } from '../components/HojaInferior';
import { IconoCategoria } from '../components/iconos';
import { SelectorCategoria } from '../components/SelectorCategoria';
import { useAviso } from '../components/Toast';
import { Campo, CampoMonto, EncabezadoHoja } from '../components/Formularios';
import { eliminarPresupuesto, guardarPresupuesto } from '../db/acciones';
import { useCategorias, useMapa, useMovimientosRango, usePresupuestos } from '../hooks/datos';
import { formatearMonto } from '../lib/dinero';
import { etiquetaPeriodo, hoyISO, rangoPeriodo } from '../lib/fechas';
import { estadoPresupuestos, type EstadoPresupuesto } from '../lib/presupuestos';
import type { Presupuesto } from '../lib/tipos';

export function useEstadoPresupuestos(): EstadoPresupuesto[] | undefined {
  const presupuestos = usePresupuestos();
  const categorias = useCategorias();
  const mes = rangoPeriodo('mes', hoyISO());
  const movs = useMovimientosRango(mes.inicio, mes.fin);
  return useMemo(() => (movs ? estadoPresupuestos(presupuestos, movs, categorias) : undefined), [presupuestos, movs, categorias]);
}

export function FilaPresupuesto({ e, alTocar }: { e: EstadoPresupuesto; alTocar?: () => void }) {
  const categorias = useMapa(useCategorias());
  const c = categorias.get(e.presupuesto.categoriaId);
  const contenido = (
    <>
      <div className="presupuesto-cabecera">
        <IconoCategoria icono={c?.icono ?? 'tag'} color={c?.color ?? '#707B87'} tam={32} />
        <span className="presupuesto-nombre">{c?.nombre ?? 'Categoría'}</span>
        <span className={`presupuesto-pct num nivel-${e.nivel}`}>{e.porcentaje} %</span>
      </div>
      <BarraProgreso porcentaje={e.porcentaje} nivel={e.nivel} etiqueta={`Presupuesto de ${c?.nombre}`} />
      <div className="presupuesto-pie num">
        <span>{formatearMonto(e.gastado)} de {formatearMonto(e.presupuesto.montoMensual, { sinCentavos: true })}</span>
        <span className={e.restante < 0 ? 'monto-gasto' : ''}>
          {e.restante < 0 ? `Excedido ${formatearMonto(-e.restante)}` : `Quedan ${formatearMonto(e.restante)}`}
        </span>
      </div>
    </>
  );
  return alTocar ? <button className="presupuesto" onClick={alTocar}>{contenido}</button> : <div className="presupuesto">{contenido}</div>;
}

export function Presupuestos() {
  const estados = useEstadoPresupuestos();
  const categorias = useCategorias();
  const [editando, setEditando] = useState<Presupuesto | null>(null);
  const hoy = hoyISO();
  if (!estados) return null;

  const total = estados.reduce((s, e) => s + e.presupuesto.montoMensual, 0);
  const gastado = estados.reduce((s, e) => s + e.gastado, 0);
  const pct = total ? Math.round((gastado / total) * 100) : 0;
  const conPresupuesto = new Set(estados.map((e) => e.presupuesto.categoriaId));

  return (
    <>
      {estados.length > 0 && (
        <section className="tarjeta">
          <div className="etiqueta">{etiquetaPeriodo('mes', hoy)} · total presupuestado</div>
          <div className="cifra-grande num">{formatearMonto(gastado)} <small>de {formatearMonto(total, { sinCentavos: true })}</small></div>
          <BarraProgreso porcentaje={pct} nivel={pct >= 100 ? 'excedido' : pct >= 80 ? 'alerta' : 'ok'} etiqueta="Presupuesto total" />
        </section>
      )}

      <div className="barra-acciones">
        <button
          className="btn btn-primario"
          disabled={categorias.filter((c) => c.tipo === 'gasto' && !c.archivada && !conPresupuesto.has(c.id!)).length === 0}
          onClick={() => setEditando({ categoriaId: 0, montoMensual: 0 })}
        >
          <Plus size={18} /> Nuevo presupuesto
        </button>
      </div>

      {estados.length === 0 ? (
        <div className="tarjeta vacio">
          <PiggyBank size={40} strokeWidth={1.5} />
          <p>Define cuánto quieres gastar al mes por categoría.</p>
          <p>Te avisaré en naranja al llegar al 80 % y en rojo al pasarte.</p>
        </div>
      ) : (
        <section className="tarjeta lista-presupuestos">
          {estados.map((e) => (
            <FilaPresupuesto key={e.presupuesto.id} e={e} alTocar={() => setEditando(e.presupuesto)} />
          ))}
        </section>
      )}

      <HojaInferior abierta={!!editando} alCerrar={() => setEditando(null)} etiqueta="Presupuesto">
        {editando && (
          <FormPresupuesto key={editando.id ?? 'nuevo'} inicial={editando} excluir={conPresupuesto} alCerrar={() => setEditando(null)} />
        )}
      </HojaInferior>
    </>
  );
}

function FormPresupuesto({ inicial, excluir, alCerrar }: { inicial: Presupuesto; excluir: Set<number>; alCerrar: () => void }) {
  const avisar = useAviso();
  const categorias = useCategorias();
  const [categoriaId, setCategoriaId] = useState<number | null>(inicial.categoriaId || null);
  const [monto, setMonto] = useState(inicial.montoMensual);
  const nuevo = inicial.id == null;
  const otras = new Set([...excluir].filter((id) => id !== inicial.categoriaId));

  return (
    <div className="formulario">
      <EncabezadoHoja titulo={nuevo ? 'Nuevo presupuesto' : 'Editar presupuesto'} alCerrar={alCerrar} />
      <Campo etiqueta="Categoría" ayuda="Incluye los gastos de sus subcategorías.">
        {(id) => <SelectorCategoria id={id} categorias={categorias} tipo="gasto" valor={categoriaId} alCambiar={setCategoriaId} excluir={otras} />}
      </Campo>
      <Campo etiqueta="Monto mensual">{(id) => <CampoMonto id={id} valor={monto} alCambiar={setMonto} />}</Campo>
      <button
        className="btn btn-primario btn-bloque"
        disabled={!categoriaId || monto <= 0}
        onClick={async () => {
          if (!nuevo && categoriaId !== inicial.categoriaId) await eliminarPresupuesto(inicial.id!);
          await guardarPresupuesto(categoriaId!, monto);
          avisar('Presupuesto guardado');
          alCerrar();
        }}
      >
        Guardar
      </button>
      {!nuevo && (
        <button
          className="btn btn-peligro btn-bloque"
          onClick={async () => {
            await eliminarPresupuesto(inicial.id!);
            avisar('Presupuesto eliminado');
            alCerrar();
          }}
        >
          Eliminar
        </button>
      )}
    </div>
  );
}
