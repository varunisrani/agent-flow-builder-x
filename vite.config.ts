import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: "::",
      port: 8080,
      proxy: isDevelopment ? {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      } : undefined,
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2020',
      },
    },
    build: {
      target: 'es2020',
      sourcemap: true,
    },
    define: {
      // Make environment mode available to the client code
      '__APP_MODE__': JSON.stringify(mode)
    }
  };
});
