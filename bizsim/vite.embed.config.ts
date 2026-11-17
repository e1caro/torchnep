import { defineConfig } from 'vite';

// Builds the engine alone into Analyst Path's vendor folder (see src/embed.ts).
export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: false, outDir: '../data-analyst-path/vendor/bizsim',
    lib: { entry: 'src/embed.ts', formats: ['iife'], name: 'BizSimBundle', fileName: () => 'engine.js' },
  },
});
