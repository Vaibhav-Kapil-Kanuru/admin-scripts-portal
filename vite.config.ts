import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Set base for GitHub Pages deployment — change this to match your repo name
  // e.g., '/admin-scripts-portal/' for https://username.github.io/admin-scripts-portal/
  base: process.env.GITHUB_PAGES === 'true' ? '/admin-scripts-portal/' : '/',
  plugins: [react()],
  server: {
    port: 5174,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
