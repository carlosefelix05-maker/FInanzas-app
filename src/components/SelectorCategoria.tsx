import type { Categoria, TipoCategoria } from '../lib/tipos';

/** <select> de categorías con subcategorías indentadas. */
export function SelectorCategoria({ id, categorias, tipo, valor, alCambiar, soloPrincipales, vacio, excluir }: {
  id?: string;
  categorias: readonly Categoria[];
  tipo: TipoCategoria;
  valor: number | null;
  alCambiar: (id: number | null) => void;
  soloPrincipales?: boolean;
  vacio?: string;
  excluir?: Set<number>;
}) {
  const activas = categorias.filter((c) => c.tipo === tipo && (!c.archivada || c.id === valor) && !excluir?.has(c.id!));
  const principales = activas.filter((c) => c.padreId == null);
  const lista = soloPrincipales ? principales : principales.flatMap((p) => [p, ...activas.filter((h) => h.padreId === p.id)]);
  return (
    <select id={id} className="campo" value={valor ?? ''} onChange={(e) => alCambiar(e.target.value ? Number(e.target.value) : null)}>
      <option value="">{vacio ?? 'Elegir categoría…'}</option>
      {lista.map((c) => (
        <option key={c.id} value={c.id}>{c.padreId != null ? '   ↳ ' : ''}{c.nombre}</option>
      ))}
    </select>
  );
}
