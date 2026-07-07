import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

const repoName = 'curriculr-planner';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/${repoName}/` : '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'csp',
      transformIndexHtml(_, ctx) {
        if (ctx.server !== undefined) return []; // skip in dev
        // VITE_WP_ORIGIN=https://schule.example.de setzen, um CSP zu härten.
        const wpOrigin = process.env.VITE_WP_ORIGIN;
        const connectSrc = wpOrigin
          ? `connect-src 'self' https://openholidaysapi.org ${wpOrigin}`
          : "connect-src 'self' https://openholidaysapi.org https:";
        return [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                connectSrc,
                "font-src 'self'",
              ].join('; '),
            },
            injectTo: 'head',
          },
        ];
      },
    },
  ],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  // Y: is a network share; the harness churns .claude/ with temp files that
  // vanish mid-stat and crash Vite's FSWatcher (UNKNOWN errno -4094). Exclude it.
  server: {
    port: 5173,
    watch: { ignored: ['**/.claude/**'] }
  }
}));
