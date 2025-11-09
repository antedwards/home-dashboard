import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import electron from 'vite-plugin-electron/simple';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      svelte({
        compilerOptions: {
          runes: true,
        },
      }),
      electron({
        main: {
          entry: 'src/main/main.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: [
                  'electron',
                  'better-sqlite3',
                  'node-record-lpcm16',
                  'whisper-node',
                ],
              },
            },
            define: {
              'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
              'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
            },
          },
        },
        preload: {
          input: 'src/main/preload.ts',
        },
      }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@components': path.resolve(__dirname, './src/renderer/components'),
      '@lib': path.resolve(__dirname, './src/renderer/lib'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['crypto', 'fs', 'path', 'os'],
    },
  },
  optimizeDeps: {
    exclude: ['crypto', 'fs', 'path', 'os'],
  },
};
});
