import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/frontend/index.ts'],
  format: ['iife'],
  outDir: 'dist',
  clean: false,
  minify: true,
  sourcemap: true,
  noExternal: ['monaco-editor'],
  outExtension() {
    return {
      js: '.js',
    }
  },
})