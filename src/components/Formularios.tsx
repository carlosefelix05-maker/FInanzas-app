import { useId, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { ICONOS } from './iconos';
import { centavosATexto, limpiarTextoMonto, textoACentavos } from '../lib/dinero';

export const PALETA = [
  '#1A3A5C', '#3E7CB1', '#4E6E9A', '#5A7F8F', '#3B7A8C', '#2E7D5B', '#4F8A6E', '#5E7F4A',
  '#8A6A3B', '#B08A2E', '#C0703F', '#B03A2E', '#A64B5A', '#B0596F', '#9A6B7F', '#7A6FA8',
  '#6B5B95', '#707B87',
];

export function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: (id: string) => ReactNode; ayuda?: string }) {
  const id = useId();
  return (
    <div className="campo-grupo">
      <label className="etiqueta" htmlFor={id}>{etiqueta}</label>
      {children(id)}
      {ayuda && <p className="campo-ayuda">{ayuda}</p>}
    </div>
  );
}

export function SelectorColor({ valor, alCambiar }: { valor: string; alCambiar: (c: string) => void }) {
  return (
    <div className="selector-color" role="radiogroup" aria-label="Color">
      {PALETA.map((c) => {
        const activo = c.toLowerCase() === valor.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={activo}
            aria-label={`Color ${c}`}
            className="muestra-color"
            style={{ background: c }}
            onClick={() => alCambiar(c)}
          >
            {activo && <Check size={18} color="#fff" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}

export function SelectorIcono({ valor, color, alCambiar }: { valor: string; color: string; alCambiar: (i: string) => void }) {
  return (
    <div className="selector-icono" role="radiogroup" aria-label="Ícono">
      {Object.entries(ICONOS).map(([nombre, Icono]) => {
        const activo = nombre === valor;
        return (
          <button
            key={nombre}
            type="button"
            role="radio"
            aria-checked={activo}
            aria-label={`Ícono ${nombre}`}
            className="opcion-icono"
            style={activo ? { background: `${color}1f`, color, borderColor: color } : undefined}
            onClick={() => alCambiar(nombre)}
          >
            <Icono size={20} strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}

/** Campo de texto para montos en pesos; entrega centavos. */
export function CampoMonto({ id, valor, alCambiar, placeholder }: {
  id: string;
  valor: number;
  alCambiar: (centavos: number) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(() => centavosATexto(valor));
  return (
    <div className="campo-monto">
      <span aria-hidden="true">$</span>
      <input
        id={id}
        className="campo num"
        inputMode="decimal"
        placeholder={placeholder ?? '0.00'}
        value={texto}
        onChange={(e) => {
          const limpio = limpiarTextoMonto(e.target.value);
          setTexto(limpio);
          alCambiar(textoACentavos(limpio));
        }}
      />
    </div>
  );
}

export function Segmentado<T extends string>({ opciones, valor, alCambiar, etiqueta }: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  alCambiar: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div className="segmentado" role="radiogroup" aria-label={etiqueta} style={{ gridTemplateColumns: `repeat(${opciones.length}, 1fr)` }}>
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          className="segmento"
          onClick={() => alCambiar(o.valor)}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

export function EncabezadoHoja({ titulo, alCerrar, extra }: { titulo: string; alCerrar: () => void; extra?: ReactNode }) {
  return (
    <div className="hoja-encabezado">
      <h2>{titulo}</h2>
      {extra}
      <button className="btn-icono" aria-label="Cerrar" onClick={alCerrar}>
        <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>×</span>
      </button>
    </div>
  );
}
