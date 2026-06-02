import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3003,
    host: true,
    allowedHosts: ['anvil.taildcdf4e.ts.net'],
  },
})
