import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  assetsInclude: ["assets/**/*.*"],
  server: {
    port: 8078,
    open: true,
  },
});
