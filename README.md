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

## Estructura

- `src/lib` — lógica pura (dinero en centavos, fechas, cálculos) + pruebas.
- `src/db` — esquema Dexie, semillas y acciones.
- `src/components`, `src/screens` — interfaz.
- `src/styles/tokens.css` — sistema de diseño "Edu".
