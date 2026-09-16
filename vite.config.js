import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // AI 백엔드(server/ 폴더, 선택사항)로 요청을 프록시합니다.
      // server/를 실행하지 않으면 프론트엔드는 자동으로 로컬 시뮬레이션 모드로 동작합니다.
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
})
