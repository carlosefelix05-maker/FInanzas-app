// Entrega de archivos al usuario (respaldo).

/** Comparte el archivo (iPhone: "Guardar en Archivos") o lo descarga. Devuelve false si el usuario canceló. */
export async function entregarArchivo(nombre: string, contenido: string): Promise<boolean> {
  const archivo = new File([contenido], nombre, { type: 'application/json' });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
      // Si compartir falla por otra razón, intentamos descargar.
    }
  }
  const url = URL.createObjectURL(archivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
