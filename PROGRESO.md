# PROGRESO — finanzas.html

Checklist del loop autónomo. Cada punto marcado incluye una línea de lo hecho y bugs pendientes.

- [x] 1. Dashboard: saldo del periodo, ingresos vs egresos, balance, mini-sparkline, últimos movimientos.
  - ✔ Hero azul con balance animado (count-up), ingresos/egresos, sparkline con trazo animado, avisos y últimos 6 movimientos. Verificado 390/1280.
- [x] 2. Selector de periodo: día / semana / mes / año, con navegación anterior/siguiente.
  - ✔ Segmentado Día/Semana/Mes/Año + flechas y chip "Hoy"; compartido por Inicio, Movimientos y Análisis. Verificado.
- [x] 3. Captura rápida: botón flotante → bottom sheet con teclado numérico grande, tipo, categoría con iconos, cuenta/tarjeta, fecha, nota. ≤3 toques.
  - ✔ FAB → hoja inferior con teclado numérico, tipo, categorías con iconos, cuentas, fecha, nota; categoría/cuenta recordadas (FAB+monto+Guardar). Teclado físico en escritorio. Verificado.
- [x] 4. Categorías editables, con iconos y color (egresos e ingresos por separado).
  - ✔ Ajustes → Categorías con pestañas Egresos/Ingresos; crear, renombrar, icono (35 SVG) y color (12 tonos); duplicados rechazados; borrar reasigna a "Otros" (que no se borra). Verificado 390/1280.
- [x] 5. Movimientos: lista agrupada por día, búsqueda, filtros (tipo, categoría, cuenta), editar, eliminar con deshacer.
  - ✔ Agrupada por día, búsqueda (todo el historial), filtros tipo/categoría/cuenta, editar en hoja, eliminar con animación y Deshacer. Verificado (búsqueda "renta" = 5, delete+undo conserva total).
- [x] 6. Tarjetas de crédito y cuentas: límite, saldo usado, corte y pago, barra de utilización, aviso de pago próximo.
  - ✔ Tarjetas con utilización, corte/pago, aviso ≤5 días (se omite si ya se pagó tras el corte), pagar = transferencia; cuentas con saldo. Verificado.
- [x] 7. Metas de ahorro: objetivo, fecha, aportes, anillo de progreso, proyección.
  - ✔ Anillo animado, aportes desde cuenta, proyección "a este ritmo llegas el…" y aporte mensual necesario; confeti al cumplir. Verificado.
- [x] 8. Análisis: donut, barras por mes, tendencia, top 5, comparativo, insights.
  - ✔ Comparativo con deltas, insights en texto, donut animado, top 5 con deltas, barras 6 meses, tendencia acumulada vs periodo anterior. Verificado.
- [x] 9. Presupuestos por categoría con alerta al 80 % y 100 %.
  - ✔ Presupuestos mensuales por categoría (Ajustes + tarjeta en Inicio); toast al cruzar 80 % y 100 % al capturar; aviso en Inicio. Verificado (85 % → aviso, 105 % → excedido).
- [x] 10. Gastos recurrentes que se generan solos.
  - ✔ Motor de recurrentes (semanal/14 días/mensual/anual) que genera atrasados al abrir/volver; demo usa renta, internet, suscripciones. Verificado (5 rentas generadas).
- [x] 11. Exportar/importar JSON, exportar CSV, borrar todo con confirmación.
  - ✔ Exportar JSON y CSV (con BOM para Excel), importar con validación y confirmación (respalda lo actual), borrar todo con confirmación. Migración v0→v1 y JSON dañado respaldados. Verificado.
- [x] 12. Datos demo opcionales ("cargar ejemplo").
  - ✔ Botón "Cargar ejemplo" (estado vacío, Análisis y Ajustes) con ~4 meses ficticios deterministas; respalda datos previos. Verificado.
- [x] 13. Pulido final: estados vacíos, accesibilidad, rendimiento, sin errores en consola.
  - ✔ Auditoría automática (móvil/escritorio × claro/oscuro): todos los controles ≥44 px, todos con nombre accesible, contraste AA en texto; 6,000 movimientos → cada pestaña <20 ms. Estados vacíos revisados en las 5 pestañas. Metadatos e icono para pantalla de inicio en iPhone.

## Bitácora de iteraciones

### Iteración 1 — 2026-11-08
- Se construyó la base completa de `finanzas.html` (esquema v1 con migración segura, router de pestañas, hojas, toasts, gráficas SVG propias, modo oscuro, escritorio con barra lateral).
- Pruebas Playwright (Chrome headless) a 390×844 y 1280×800: captura, ingreso, demo, periodos, búsqueda/filtros, editar, eliminar+deshacer, análisis, cuentas, metas+confeti, ajustes, modo oscuro, captura con teclado en escritorio. 0 errores de consola.
- Corregido: colisión de nombre `cap`, desbordamiento horizontal de grids (minmax(0,1fr)), barra inferior con backdrop-filter en blanco, chip de categoría recortado, hero duplicado en escritorio, aviso de pago tras pagar, efectivo negativo en demo, comparativo truncado en móvil.
- Pendiente de verificar con prueba dedicada: 4 (editar categorías), 9 (alertas de presupuesto al capturar), 11 (exportar/importar/CSV/borrar), 13 (pulido y accesibilidad).

### Iteración 2 — 2026-11-08
- Prueba dedicada (test2.js, 18 comprobaciones × móvil y escritorio, todas PASS, 0 errores de consola) para categorías, presupuestos y datos, incluida migración de esquema y JSON dañado.
- Pulido: espacio no separable antes de "%", botones de "Tus datos" sin cortes de línea, sin botón de ajustes dentro de Ajustes.
- Siguiente: punto 13 (pulido final + accesibilidad) y pasada de refactor/pulido visual (toca en la iteración 3).

### Iteración 3 — 2026-11-08 (pulido + cierre)
- Corregido: switches y chips a 44 px, texto del CTA naranja a #0F2236 (5.7:1), deltas con más contraste, contorno de foco visible en <main>, botones de Cuentas tapados por el FAB, más espacio inferior.
- Prueba end-to-end (e2e.js) en 390 y 1280: demo → ingreso → egreso con Tarjeta Oro (saldo usado sube) → aporte a meta → exportar JSON → borrar → reimportar idéntico → persiste tras recargar. Todo PASS, 0 errores de consola. Suites anteriores siguen en verde.
- Sin bugs conocidos pendientes.
