import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/logs": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/http-logs": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
