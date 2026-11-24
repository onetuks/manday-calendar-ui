import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3009,
    strictPort: true,
    // /api 요청은 Spring Boot 서버(8089)로 넘깁니다.
    proxy: {
      '/api': 'http://localhost:8089',
    },
  },
  preview: {
    port: 3009,
    proxy: {
      '/api': 'http://localhost:8089',
    },
  },
  build: {
    // Spring Boot에 넣을 때는 outDir을 '../server/src/main/resources/static'처럼 바꾸면 됩니다.
    outDir: 'dist',
    emptyOutDir: true,
  },
})
