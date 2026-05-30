import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

const repoName = 'curriculr-planner';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/${repoName}/` : '/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  // Y: is a network share; the harness churns .claude/ with temp files that
  // vanish mid-stat and crash Vite's FSWatcher (UNKNOWN errno -4094). Exclude it.
  server: {
    port: 5173,
    watch: { ignored: ['**/.claude/**'] }
  }
}));
