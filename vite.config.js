import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/patients': 'http://localhost:3000',
      '/generate-report': 'http://localhost:3000',
    },
  },
});