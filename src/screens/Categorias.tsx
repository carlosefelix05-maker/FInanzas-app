import { useMemo, useState } from 'react';
import { ArchiveRestore, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { HojaInferior } from '../components/HojaInferior';
import { IconoCategoria } from '../components/iconos';
import { useAviso } from '../components/Toast';
import { Campo, EncabezadoHoja, Segmentado, SelectorColor, SelectorIcono } from '../components/Formularios';
import { bajaCategoria, guardarCategoria, moverCategoria, restaurarCategoria } from '../db/acciones';
import { useCategorias } from '../hooks/datos';
import type { Categoria, TipoCategoria } from '../lib/tipos';

const TIPOS: { valor: TipoCategoria; etiqueta: string }[] = [
  { valor: 'gasto', etiqueta: 'Gastos' },
  { valor: 'ingreso', etiqueta: 'Ingresos' },
];

export function Categorias() {
  const categorias = useCategorias();
  const avisar = useAviso();
  const [tipo, setTipo] = useState<TipoCategoria>('gasto');
  const [ordenando, setOrdenando] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [verArchivadas, setVerArchivadas] = useState(false);

  const delTipo = useMemo(() => categorias.filter((c) => c.tipo === tipo), [categorias, tipo]);
  const activas = delTipo.filter((c) => !c.archivada);
  const archivadas = delTipo.filter((c) => c.archivada);
  const principales = activas.filter((c) => c.padreId == null || !activas.some((p) => p.id === c.padreId));
  const hijas = (id: number) => activas.filter((c) => c.padreId === id);

  const nueva = (padreId: number | null = null): Categoria => ({
    nombre: '', tipo, icono: 'tag', color: '#3E7CB1', padreId, orden: 0, archivada: false,
  });

  const Fila = ({ c, sub, primera, ultima }: { c: Categoria; sub?: boolean; primera: boolean; ultima: boolean }) => (
    <li className={`fila-ajuste ${sub ? 'sub' : ''}`}>
      <button className="fila-ajuste-principal" onClick={() => setEditando(c)} disabled={ordenando}>
        <IconoCategoria icono={c.icono} color={c.color} tam={sub ? 32 : 40} />
        <span className="fila-ajuste-nombre">{c.nombre}</span>
      </button>
      {ordenando && (
        <span className="flechas">
          <button className="btn-icono" aria-label={`Subir ${c.nombre}`} disabled={primera} onClick={() => moverCategoria(c.id!, -1)}>
            <ChevronUp size={20} />
          </button>
          <button className="btn-icono" aria-label={`Bajar ${c.nombre}`} disabled={ultima} onClick={() => moverCategoria(c.id!, 1)}>
            <ChevronDown size={20} />
          </button>
        </span>
      )}
    </li>
  );

  return (
    <>
      <Segmentado etiqueta="Tipo de categoría" opciones={TIPOS} valor={tipo} alCambiar={(t) => { setTipo(t); setOrdenando(false); }} />

      <div className="barra-acciones">
        <button className="btn btn-primario" onClick={() => setEditando(nueva())}>
          <Plus size={18} /> Nueva categoría
        </button>
        <button className="btn btn-secundario" onClick={() => setOrdenando((o) => !o)} aria-pressed={ordenando}>
          {ordenando ? 'Listo' : 'Reordenar'}
        </button>
      </div>

      <ul className="tarjeta lista-ajustes">
        {principales.map((p, i) => {
          const hs = hijas(p.id!);
          return (
            <li key={p.id} className="grupo-ajuste">
              <ul>
                <Fila c={p} primera={i === 0} ultima={i === principales.length - 1} />
                {hs.map((h, j) => (
                  <Fila key={h.id} c={h} sub primera={j === 0} ultima={j === hs.length - 1} />
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      {archivadas.length > 0 && (
        <section className="seccion" style={{ marginTop: 'var(--esp-4)' }}>
          <button className="enlace" onClick={() => setVerArchivadas((v) => !v)} aria-expanded={verArchivadas}>
            Archivadas ({archivadas.length}) <ChevronDown size={16} style={{ transform: verArchivadas ? 'rotate(180deg)' : undefined }} />
          </button>
          {verArchivadas && (
            <ul className="tarjeta lista-ajustes">
              {archivadas.map((c) => (
                <li key={c.id} className="fila-ajuste archivada">
                  <span className="fila-ajuste-principal">
                    <IconoCategoria icono={c.icono} color="#7B8A99" tam={32} />
                    <span className="fila-ajuste-nombre">{c.nombre}</span>
                  </span>
                  <button
                    className="btn btn-secundario"
                    onClick={async () => {
                      await restaurarCategoria(c.id!);
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

      <HojaInferior abierta={!!editando} alCerrar={() => setEditando(null)} etiqueta="Editar categoría">
        {editando && (
          <FormCategoria
            key={editando.id ?? 'nueva'}
            inicial={editando}
            principales={principales.filter((p) => p.id !== editando.id)}
            tieneHijas={editando.id != null && hijas(editando.id).length > 0}
            alCerrar={() => setEditando(null)}
            alAgregarSub={(padre) => setEditando(nueva(padre))}
          />
        )}
      </HojaInferior>
    </>
  );
}

function FormCategoria({ inicial, principales, tieneHijas, alCerrar, alAgregarSub }: {
  inicial: Categoria;
  principales: Categoria[];
  tieneHijas: boolean;
  alCerrar: () => void;
  alAgregarSub: (padreId: number) => void;
}) {
  const avisar = useAviso();
  const [c, setC] = useState(inicial);
  const cambiar = (p: Partial<Categoria>) => setC((x) => ({ ...x, ...p }));
  const valida = c.nombre.trim().length > 0;

  const guardar = async () => {
    if (!valida) return;
    await guardarCategoria({ ...c, nombre: c.nombre.trim() });
    avisar(inicial.id == null ? 'Categoría creada' : 'Categoría actualizada');
    alCerrar();
  };

  const baja = async () => {
    const extra = tieneHijas ? ' y sus subcategorías' : '';
    if (!window.confirm(`¿Eliminar "${inicial.nombre}"${extra}? Si tiene movimientos se archivará para conservar tu historial.`)) return;
    const r = await bajaCategoria(inicial.id!);
    avisar(r === 'archivada' ? `"${inicial.nombre}" archivada (tiene movimientos)` : `"${inicial.nombre}" eliminada`);
    alCerrar();
  };

  return (
    <div className="formulario">
      <EncabezadoHoja titulo={inicial.id == null ? 'Nueva categoría' : 'Editar categoría'} alCerrar={alCerrar} />
      <div className="vista-previa">
        <IconoCategoria icono={c.icono} color={c.color} tam={48} />
        <span>{c.nombre || 'Nombre'}</span>
      </div>
      <Campo etiqueta="Nombre">
        {(id) => (
          <input id={id} className="campo" value={c.nombre} maxLength={40} onChange={(e) => cambiar({ nombre: e.target.value })} />
        )}
      </Campo>
      {!tieneHijas && (
        <Campo etiqueta="Subcategoría de">
          {(id) => (
            <select
              id={id}
              className="campo"
              value={c.padreId ?? ''}
              onChange={(e) => cambiar({ padreId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Ninguna (categoría principal)</option>
              {principales.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          )}
        </Campo>
      )}
      <Campo etiqueta="Color">{() => <SelectorColor valor={c.color} alCambiar={(color) => cambiar({ color })} />}</Campo>
      <Campo etiqueta="Ícono">{() => <SelectorIcono valor={c.icono} color={c.color} alCambiar={(icono) => cambiar({ icono })} />}</Campo>

      <button className="btn btn-primario btn-bloque" disabled={!valida} onClick={guardar}>Guardar</button>
      {inicial.id != null && inicial.padreId == null && (
        <button className="btn btn-secundario btn-bloque" onClick={() => alAgregarSub(inicial.id!)}>
          <Plus size={18} /> Agregar subcategoría
        </button>
      )}
      {inicial.id != null && (
        <button className="btn btn-peligro btn-bloque" onClick={baja}>Eliminar o archivar</button>
      )}
    </div>
  );
}
