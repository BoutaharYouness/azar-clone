import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],

  define: {
    global: 'window',
  },

  server: {
    host: true,
    port: 3000,

    // 🔐 HTTPS avec certificat mkcert
    https: {
      key: fs.readFileSync('./10.203.148.87-key.pem'),
      cert: fs.readFileSync('./10.203.148.87.pem'),
    },

    // 🔁 Proxy pour backend Spring Boot
    proxy: {
      // REST API
      '/api': {
        target: 'http://10.203.148.87:8080',
        changeOrigin: true,
        secure: false,
      },

      // WebSocket (STOMP / SockJS)
      '/ws': {
        target: 'http://10.203.148.87:8080',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})