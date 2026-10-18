import { Component, type ErrorInfo, type ReactNode } from 'react';
import { entregarArchivo } from './archivo';

interface Estado {
  error: Error | null;
  detalle: string;
  mensaje: string;
}

/**
 * Si algo falla al dibujar la app, muestra el error en vez de una pantalla en blanco
 * y permite exportar los datos antes de intentar cualquier otra cosa.
 */
export class ErrorApp extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { error: null, detalle: '', mensaje: '' };

  static getDerivedStateFromError(error: Error): Partial<Estado> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de la app', error, info.componentStack);
    this.setState({ detalle: `${error.name}: ${error.message}\n${(info.componentStack ?? '').trim().split('\n').slice(0, 6).join('\n')}` });
  }

  exportar = async () => {
    try {
      const { exportarDatos } = await import('../db/acciones');
      const { nombreArchivoRespaldo } = await import('../lib/respaldo');
      const respaldo = await exportarDatos();
      await entregarArchivo(nombreArchivoRespaldo(), JSON.stringify(respaldo));
      this.setState({ mensaje: 'Respaldo exportado.' });
    } catch (e) {
      this.setState({ mensaje: `No se pudo exportar: ${(e as Error).message}` });
    }
  };

  reiniciarApp = async () => {
    // Quita la versión guardada de la app (no los datos) y recarga desde internet.
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
      await Promise.all(regs.map((r) => r.unregister()));
      const nombres = (await caches?.keys()) ?? [];
      await Promise.all(nombres.map((n) => caches.delete(n)));
    } finally {
      location.hash = '';
      location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-app">
        <h1>Algo salió mal</h1>
        <p>Tus datos siguen guardados en el teléfono. Antes de nada, exporta un respaldo.</p>
        <button className="btn btn-primario btn-bloque" onClick={this.exportar}>Exportar respaldo</button>
        <button className="btn btn-secundario btn-bloque" onClick={() => { location.hash = ''; location.reload(); }}>Volver a Inicio</button>
        <button className="btn btn-secundario btn-bloque" onClick={this.reiniciarApp}>Descargar de nuevo la app (no borra datos)</button>
        {this.state.mensaje && <p><strong>{this.state.mensaje}</strong></p>}
        <p className="texto-ayuda">Detalle del error (mándale una captura a quien te ayuda con la app):</p>
        <pre className="error-detalle">{this.state.detalle || String(this.state.error)}</pre>
      </div>
    );
  }
}
