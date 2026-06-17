import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-leaflet-markercluster', 'leaflet.markercluster'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        headers: {
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        }
      },
      '/api/wdpa': {
        target: 'https://api.protectedplanet.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wdpa/, ''),
      },
      '/api/sentinel-auth': {
        target: 'https://identity.dataspace.copernicus.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sentinel-auth/, ''),
      },
      '/api/sentinel': {
        target: 'https://sh.dataspace.copernicus.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sentinel/, ''),
      },
      '/api/gfw': {
        target: 'https://data-api.globalforestwatch.org',
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/api\/gfw/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.statusCode === 308) {
              proxyRes.statusCode = 301
            }
          })
        }
      },
    }
  }
})