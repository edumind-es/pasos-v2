/// <reference types="vitest/config" />

/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: null,
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-*.png', 'icons/apple-touch-icon.png', 'apple-touch-icon.png', 'favicon.ico'],
      manifest: {
        name: 'Pasos — Planificador educativo visual',
        short_name: 'Pasos',
        description: 'Kanban pedagógico con pictogramas ARASAAC para alumnado con NEE. Una app de EDUmind.',
        theme_color: '#1a1625',
        background_color: '#ded9d0',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Excluir logos originales pesados del precache (2.8MB + 1.2MB)
        globIgnores: ['**/pasos_logo.png', '**/edumind_logo.png'],
        globPatterns: ['**/*.{js,css,html,ico,woff2}', 'icons/icon-*.png', 'icons/apple-touch-icon.png'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB para icon-512.png
        navigateFallbackDenylist: [/^\/api\//, /^\/health$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.arasaac\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'arasaac-pictograms',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/backend/**', '**/node_modules.bak*/**', '**/e2e/**'],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities']
        }
      }
    }
  }
})
