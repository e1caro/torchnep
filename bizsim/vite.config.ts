import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' so the same build runs from GitHub Pages (/bizsim/), from a file server and inside the Android app.
export default defineConfig({
  base: './',
  // the release number this build belongs to (set by CI); installed apps compare it with newer releases
  define: { __WEB_VERSION__: JSON.stringify(Number(process.env.BIZSIM_VERSION) || 0) },
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120000 },
});
