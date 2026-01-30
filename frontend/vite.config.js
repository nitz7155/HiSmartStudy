import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8000', // FastAPI 서버 주소
    },
    // [추가] 이미지 폴더도 백엔드(8000번)로 연결
    '/captures': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
});