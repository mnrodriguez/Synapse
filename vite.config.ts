import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // GitHub Pages serves project sites under /<repo>/. The deploy workflow sets VITE_BASE_PATH; local dev uses '/'.
    base: process.env.VITE_BASE_PATH || '/',
    build: {
      // The Firebase SDK alone is ~560 kB; the game code itself stays well below this.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Libraries change less often than the game: separate chunks stay cached between deploys.
          manualChunks(id: string) {
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'vendor-firebase';
            if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'vendor-react';
            return undefined;
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
