import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const targetUrl = (env.VITE_API_URL || "http://127.0.0.1:8000")
    .replace(/\/api\/?$/, "")
    .replace("://localhost:", "://127.0.0.1:");

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: targetUrl,
          changeOrigin: true,
          ws: true,
        },
        "/uploads": {
          target: targetUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
