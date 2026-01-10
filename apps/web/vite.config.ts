import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "mapbox-gl": "maplibre-gl",
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // Query library
          "query-vendor": ["@tanstack/react-query"],
          // i18n libraries
          "i18n-vendor": ["i18next", "react-i18next", "i18next-browser-languagedetector"],
          // Map libraries (large)
          "map-vendor": ["maplibre-gl", "react-map-gl"],
          // Editor libraries (large, only used in admin)
          "editor-vendor": ["@tiptap/react", "@tiptap/starter-kit", "@tiptap/extension-placeholder"],
          // State management
          "state-vendor": ["zustand"],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB for better visibility
  },
});
