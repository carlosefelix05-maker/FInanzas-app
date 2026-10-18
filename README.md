# SynapFinanzas

PWA de finanzas personales (MXN, es-MX). Funciona sin conexión; los datos viven solo en el dispositivo (IndexedDB).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:lan    # accesible desde el celular en la misma Wi‑Fi
npm test           # pruebas de /src/lib (Vitest)
npm run build
```

## Publicar en GitHub Pages (una sola vez)

1. Crea un repositorio en GitHub (p. ej. `synapfinanzas`).
2. Sube el código:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/synapfinanzas.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Cada `git push` a `main` corre las pruebas y publica en
   `https://<tu-usuario>.github.io/synapfinanzas/`.

## Instalar en iPhone

Abre la URL en **Safari** → botón Compartir → **Agregar a inicio**. Úsala siempre desde el ícono:
así Safari no borra los datos.

## Funciones

- Captura rápida con teclado propio; gasto, ingreso o transferencia.
- Movimientos por Día / Semana / Mes / Año con comparativa y filtros.
- Categorías con subcategorías; cuentas de efectivo, débito y crédito.
- Recurrentes: al abrir la app se generan los vencidos como "por confirmar".
- Presupuestos mensuales con alerta al 80 % (naranja) y 100 % (rojo).
- Tarjetas: uso del límite, corte, fecha límite, pago para no generar intereses y compras a MSI
  (cada cuota se carga sola como gasto en su mes).
- Metas de ahorro: las aportaciones apartan dinero de una cuenta (no son gasto).
- Análisis: dona por categoría, flujo de 12 meses, ingresos vs. gastos, tasa de ahorro, top 5,
  gastos hormiga y proyección de fin de mes.
- Respaldo JSON en Ajustes (exportar / importar). En iPhone se abre el menú Compartir → Guardar en Archivos.

## Íconos

`public/icon.svg` es la fuente. Tras cambiarlo, regenera los PNG:

```bash
npm run iconos
```

## Estructura

- `src/lib` — lógica pura (dinero en centavos, fechas, cálculos) + pruebas.
- `src/db` — esquema Dexie, semillas y acciones.
- `src/components`, `src/screens` — interfaz.
- `src/styles/tokens.css` — sistema de diseño "Edu".
