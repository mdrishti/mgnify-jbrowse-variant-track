import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Same as METT: set headers for bgzip so clients receive raw bytes (no double-decompress)
const bgzipPlugin = () => ({
  name: 'bgzip-handler',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: () => void) => {
      if (
        req.url &&
        (req.url.includes('.fa.gz') ||
          req.url.includes('.gff.gz') ||
          req.url.includes('.vcf.gz'))
      ) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Encoding', 'identity');
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), bgzipPlugin()],
  define: {
    global: 'globalThis',
  },
  build: {
    outDir: 'build',
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  publicDir: 'public',
});
