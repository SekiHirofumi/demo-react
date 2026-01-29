import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 前端请求 /api/** 会被转发到后端
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
        // 把 /api 去掉再转发
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
