import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// In Docker: injected via docker-compose environment.
// Locally:   falls back to localhost:80 (Nginx port).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || "http://localhost:80";

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        // All backend traffic goes through the api-gateway via Nginx (auth, users, budget, expense, analysis...)
        "/api": { target: proxyTarget, changeOrigin: true, secure: false },
        "/auth/login": { target: proxyTarget, changeOrigin: true, secure: false },
        "/auth/signup": { target: proxyTarget, changeOrigin: true, secure: false },
        "/users": { target: proxyTarget, changeOrigin: true, secure: false },
        "/budget": { target: proxyTarget, changeOrigin: true, secure: false },
        "/expense": { target: proxyTarget, changeOrigin: true, secure: false },
        "/analysis": { target: proxyTarget, changeOrigin: true, secure: false },
        "/notification": { target: proxyTarget, changeOrigin: true, secure: false },
      },
    },
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
  };
});

