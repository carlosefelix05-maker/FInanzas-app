import type { LucideIcon } from 'lucide-react';

export function Proximamente({ Icono, texto, fase }: { Icono: LucideIcon; texto: string; fase: number }) {
  return (
    <div className="tarjeta vacio">
      <Icono size={40} strokeWidth={1.5} />
      <p><strong>{texto}</strong></p>
      <p>Llega en la fase {fase}.</p>
    </div>
  );
}
