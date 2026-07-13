import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 開發時把 /api 代理到後端,前端就能用相對路徑呼叫 API。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3008',
        changeOrigin: true,
      },
    },
  },
});
