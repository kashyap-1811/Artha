import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In Docker: injected via docker-compose environment.
// Locally:   falls back to localhost (where api-gateway runs in dev).
const proxyTarget = process.env.VITE_DEV_PROXY_TARGET || "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      // All backend traffic goes through the api-gateway (auth, users, budget, expense, analysis...)
      "/api": { target: proxyTarget, changeOrigin: true, secure: false },
      "/auth": { target: proxyTarget, changeOrigin: true, secure: false },
      "/users": { target: proxyTarget, changeOrigin: true, secure: false },
      "/budget": { target: proxyTarget, changeOrigin: true, secure: false },
      "/expense": { target: proxyTarget, changeOrigin: true, secure: false },
      "/analysis": { target: proxyTarget, changeOrigin: true, secure: false },
      "/notification": { target: proxyTarget, changeOrigin: true, secure: false },
    },
  },
});

