# DECISIONES — finanzas.html

Decisiones tomadas de forma autónoma durante la construcción.

- **App independiente.** `finanzas.html` es un archivo nuevo y autónomo. No toca ni comparte datos con SynapFinanzas (PWA en `src/`, IndexedDB). Usa su propia clave de localStorage: `finanzas.data`.
- **Esquema versionado.** `version` en el JSON raíz. Al cargar se ejecuta `migrate()`, que rellena los campos faltantes sin borrar nada. Si la versión cambia, el JSON original se guarda en `finanzas.data.respaldo.v<N>`. Si el JSON no se puede leer, se guarda en `finanzas.data.danado.<ts>` y se arranca vacío con aviso.
- **Iconos:** set propio de iconos SVG de línea (sin emoji), para mantener un tono sobrio y no infantil.
- **CTA naranja con texto azul marino.** El blanco sobre #E67E22 da un contraste de 2.9:1, que no pasa AA. El azul #1A3A5C sobre naranja da ≈4.4:1, que pasa AA para texto grande en negrita.
- **Verde/coral ajustados por contraste:** ingresos #2F7D5D y egresos #B4513F en modo claro (≥4.5:1 sobre blanco); en modo oscuro se aclaran a #6FBF9B y #E38C7D.
- **"≤3 toques":** FAB → montos con el teclado → Guardar. La categoría y la cuenta vienen preseleccionadas con las últimas usadas. Teclear los dígitos del monto no cuenta como "toque" de navegación.
- **Pago de tarjeta = transferencia.** Es un movimiento tipo `transfer` (cuenta origen → tarjeta). No cuenta como ingreso ni como egreso en las estadísticas; solo mueve saldos.
- **Tarjeta de crédito:** el "saldo inicial" de una tarjeta es la deuda inicial. Usado = deuda inicial + egresos − pagos/abonos.
- **Aportes a metas:** pueden salir de una cuenta (reducen su saldo). No son egresos.
- **Proyección de metas:** ritmo diario = ahorrado / max(30, días desde el primer aporte). Así se evita que un solo aporte de hoy proyecte un ritmo irreal.
- **Navegación:** pestañas Inicio, Movimientos, Análisis, Cuentas y Metas. Ajustes (categorías, presupuestos, recurrentes, datos, tema) se abre con el botón de engranaje del encabezado y desde la barra lateral en escritorio.
- **Presupuestos mensuales.** Cada uno se mide sobre el mes calendario que contiene el periodo visible.
- **Recurrentes:** al crear uno con fecha de inicio en el pasado, se generan los movimientos atrasados hasta hoy. Se revisan al abrir la app y al volver a ella (visibilitychange).
- **Búsqueda en Movimientos:** sin texto, la lista respeta el periodo seleccionado; con texto, busca en todo el historial.
- **Borrar categoría:** sus movimientos pasan a "Otros" del mismo tipo. "Otros" no se puede borrar.
- **Borrar cuenta:** solo se permite si no tiene movimientos, para no dejar movimientos huérfanos.
- **Pruebas:** Playwright (`playwright-core`, en el scratchpad) usando el Google Chrome instalado (`channel: 'chrome'`), porque el proyecto no tiene Playwright como dependencia.
- **Barra inferior sólida** (sin backdrop-filter): el desenfoque se renderizaba en blanco en capturas headless a 2x; se prefirió un fondo sólido con sombra, más robusto.
- **Contraste del CTA:** se cambió el texto sobre naranja de #1A3A5C a #0F2236 (5.7:1), porque la auditoría midió 4.09:1 en tamaños medianos.
- **Instalación en el iPhone:** se agregaron metadatos `apple-mobile-web-app-*` y un icono PNG generado con canvas al cargar (iOS no acepta SVG como apple-touch-icon). Para instalarla, el archivo debe servirse por HTTPS (p. ej. GitHub Pages); abierto desde Archivos no se puede agregar a la pantalla de inicio.
