import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const proxyTarget = process.env.VITE_DEV_PROXY_TARGET || "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
        secure: false
      },
      "^/auth/(login|signup)$": {
        target: proxyTarget,
        changeOrigin: true,
        secure: false
      },
      "/users": {
        target: proxyTarget,
        changeOrigin: true,
        secure: false
      },
      "/budget": {
        target: proxyTarget,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
