import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Genera los PNG (apple-touch-icon, 192, 512, maskable) a partir de public/icon.svg.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#1A3A5C' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#1A3A5C' } },
  },
  images: ['public/icon.svg'],
});
