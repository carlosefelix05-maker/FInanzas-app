// Compila toda la app en un único archivo HTML (sin service worker): npm run build:html
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  define: {
    __VERSION__: JSON.stringify(`${process.env.npm_package_version ?? 'dev'}-html`),
  },
  resolve: {
    alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/sw-stub.ts', import.meta.url)) },
  },
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: 'dist-html',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5000,
  },
});
