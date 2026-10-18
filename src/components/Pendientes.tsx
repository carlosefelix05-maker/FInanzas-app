import { Check, Pencil, X } from 'lucide-react';
import { useCaptura } from './Captura';
import { useAviso } from './Toast';
import { IconoCategoria } from './iconos';
import { borradorDePendiente, confirmarPendiente, omitirPendiente } from '../db/acciones';
import { useCategorias, useMapa, usePendientes, useRecurrentes } from '../hooks/datos';
import { formatearMonto } from '../lib/dinero';
import { etiquetaFechaCorta } from '../lib/fechas';
import { db } from '../db/db';

/** Lista de recurrentes por confirmar: confirmar, editar monto u omitir. */
export function ListaPendientes({ limite }: { limite?: number }) {
  const pendientes = usePendientes();
  const recurrentes = useMapa(useRecurrentes());
  const categorias = useMapa(useCategorias());
  const abrirCaptura = useCaptura();
  const avisar = useAviso();
  const visibles = limite ? pendientes.slice(0, limite) : pendientes;

  return (
    <ul className="lista-pendientes">
      {visibles.map((p) => {
        const r = recurrentes.get(p.recurrenteId);
        const cat = r?.plantilla.categoriaId != null ? categorias.get(r.plantilla.categoriaId) : undefined;
        const nombre = r?.plantilla.nota || cat?.nombre || 'Transferencia';
        const esIngreso = r?.plantilla.tipo === 'ingreso';
        return (
          <li key={p.id} className="pendiente">
            <IconoCategoria icono={cat?.icono ?? 'repeat'} color={cat?.color ?? '#4E6E9A'} tam={36} />
            <div className="pendiente-texto">
              <strong>{nombre}</strong>
              <small>{etiquetaFechaCorta(p.fecha)} · <span className={`num ${esIngreso ? 'monto-ingreso' : r?.plantilla.tipo === 'gasto' ? 'monto-gasto' : ''}`}>{formatearMonto(p.monto)}</span></small>
            </div>
            <button
              className="btn-icono"
              aria-label={`Omitir ${nombre} del ${p.fecha}`}
              onClick={async () => {
                await omitirPendiente(p.id!);
                avisar('Omitido', { etiqueta: 'Deshacer', alHacer: () => db.pendientes.add(p) });
              }}
            >
              <X size={20} />
            </button>
            <button
              className="btn-icono"
              aria-label={`Editar ${nombre} antes de confirmar`}
              onClick={async () => {
                const borrador = await borradorDePendiente(p.id!);
                if (borrador) abrirCaptura(borrador, { alGuardar: () => omitirPendiente(p.id!) });
              }}
            >
              <Pencil size={18} />
            </button>
            <button
              className="btn-icono confirmar"
              aria-label={`Confirmar ${nombre} por ${formatearMonto(p.monto)}`}
              onClick={async () => {
                await confirmarPendiente(p.id!);
                avisar('Movimiento registrado');
              }}
            >
              <Check size={20} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
