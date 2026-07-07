import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    // Base relativa: funziona sia su github.io/<repo>/ sia su dominio custom.
    // Sovrascrivibile con VITE_BASE_URL se servisse un path assoluto.
    base: env.VITE_BASE_URL || './',

    build: {
      // Non svuota dist prima di buildare (evita conflitti con OneDrive)
      emptyOutDir: false,
    },

    server: {
      proxy: {
        // Anthropic LLM: /api/anthropic -> api.anthropic.com
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.ANTHROPIC_API_KEY
              if (apiKey) proxyReq.setHeader('x-api-key', apiKey)
              proxyReq.setHeader('anthropic-version', '2023-06-01')
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
            })
          },
        },

        // ElevenLabs TTS + STT: /api/elevenlabs -> api.elevenlabs.io
        '/api/elevenlabs': {
          target: 'https://api.elevenlabs.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/elevenlabs/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.ELEVENLABS_API_KEY
              if (apiKey) proxyReq.setHeader('xi-api-key', apiKey)
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
            })
          },
        },
      },
    },
  }
})
