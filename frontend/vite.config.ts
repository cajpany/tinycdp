import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/frontend/' : '/',
  plugins: [
    tailwindcss(),
    react(),
  ],
  build: {
    minify: false,
    outDir: '../backend/frontend/dist',
  }
})
