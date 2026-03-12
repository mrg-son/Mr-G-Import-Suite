import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "images/moov-africa.jpg", "images/yas-mixx.jpg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/],
      },
      manifest: {
        name: "Mr.G Suite — Gestion d'Import",
        short_name: "Mr.G Suite",
        description: "Application unifiée de gestion d'import professionnel. Calculez. Devisez. Suivez.",
        theme_color: "#1a3a4a",
        background_color: "#0c1e2b",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
