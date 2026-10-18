import { Delete } from 'lucide-react';
import type { TeclaMonto } from '../lib/dinero';

const TECLAS: TeclaMonto[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'borrar'];

export function Teclado({ alTeclear }: { alTeclear: (t: TeclaMonto) => void }) {
  return (
    <div className="teclado" role="group" aria-label="Teclado numérico">
      {TECLAS.map((t) => (
        <button
          key={t}
          type="button"
          className="tecla num"
          aria-label={t === 'borrar' ? 'Borrar dígito' : t === '.' ? 'Punto decimal' : t}
          onClick={() => alTeclear(t)}
        >
          {t === 'borrar' ? <Delete size={24} strokeWidth={1.75} /> : t}
        </button>
      ))}
    </div>
  );
}
