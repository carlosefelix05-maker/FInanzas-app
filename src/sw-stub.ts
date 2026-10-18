// En la versión de un solo HTML no hay service worker.
export function registerSW(_opciones?: unknown) {
  return () => Promise.resolve();
}
