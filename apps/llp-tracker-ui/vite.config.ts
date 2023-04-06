import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import unocss from 'unocss/vite';

export default defineConfig({
  plugins: [react(), unocss({
    theme: {
      colors: {
        primary: '#ff6bd5'
      }
    }
  }), svgr()],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      process: 'process/browser',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          ethers: ['ethers'],
          'date-fns': ['date-fns'],
          recharts: ['recharts'],
        },
      },
    },
  },
});
