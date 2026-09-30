import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Alias @ → src para imports limpios: import { Button } from '@/components/ui/button'
      '@': path.resolve(__dirname, './src'),
      // Alias @shared → carpeta shared del monorepo
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },

  server: {
    port: 5173,
    // Proxy en desarrollo — elimina problemas de CORS.
    // Las peticiones a /api/* se reenvían al backend Express.
    // En producción, Nginx hace el mismo trabajo.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false, // activar en staging si es necesario
    // Dividir chunks para mejor caching del navegador
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
        },
      },
    },
  },
});
