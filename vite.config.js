import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/pulse2_mobile_product_mockup_v2/',
  server: {
    host: true,
    port: 5173,
  },
})
