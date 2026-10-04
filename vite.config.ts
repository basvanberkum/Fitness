import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Op GitHub Pages draait de app onder /Fitness/, lokaal/anders gewoon op /.
  base: process.env.GITHUB_PAGES ? '/Fitness/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
  },
})
