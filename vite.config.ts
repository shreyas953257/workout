/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Relative base so the built app works from any path: the sandbox preview
// host, GitHub Pages, a subdirectory, or opened straight off disk.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    // The preview environment serves this app from a proxied hostname.
    allowedHosts: true,
    fs: { strict: false },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
  },
})
