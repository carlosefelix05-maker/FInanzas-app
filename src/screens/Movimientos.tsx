import { useDeferredValue, useMemo, useState } from 'react';
import { ListChecks, Search, X } from 'lucide-react';
import { ListaMovimientos } from '../components/ListaMovimientos';
import { useCategorias, useCuentas, useMapa, useMovimientos } from '../hooks/datos';

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function Movimientos() {
  const movimientos = useMovimientos();
  const categorias = useMapa(useCategorias());
  const cuentas = useMapa(useCuentas());
  const [busqueda, setBusqueda] = useState('');
  const q = useDeferredValue(normalizar(busqueda.trim()));

  const filtrados = useMemo(() => {
    if (!movimientos) return [];
    if (!q) return movimientos;
    return movimientos.filter((m) => {
      const texto = [
        m.nota,
        m.categoriaId != null ? categorias.get(m.categoriaId)?.nombre : 'transferencia',
        cuentas.get(m.cuentaId)?.nombre,
      ].join(' ');
      return normalizar(texto).includes(q);
    });
  }, [movimientos, q, categorias, cuentas]);

  if (!movimientos) return null;

  return (
    <>
      <div className="buscador">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          placeholder="Buscar por nota, categoría o cuenta"
          aria-label="Buscar movimientos"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button className="btn-icono" aria-label="Limpiar búsqueda" onClick={() => setBusqueda('')}>
            <X size={18} />
          </button>
        )}
      </div>
      {filtrados.length === 0 ? (
        <div className="vacio">
          <ListChecks size={40} strokeWidth={1.5} />
          <p>{movimientos.length === 0 ? 'Aún no hay movimientos.' : 'Sin resultados.'}</p>
          {movimientos.length === 0 && <p>Toca <strong>+</strong> para registrar el primero.</p>}
        </div>
      ) : (
        <>
          <p className="conteo">{filtrados.length.toLocaleString('es-MX')} movimientos</p>
          <ListaMovimientos movimientos={filtrados} />
        </>
      )}
    </>
  );
}
