import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const port = 3030;
  return {
    server: {
      host: "::",
      port,
      fs: {
        allow: [
          path.resolve(__dirname, ".."),
          "/workspace",
          "/workspace/src",
          "/workspace/ui",
        ],
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@root": "/workspace/src",
        "@ui": "/workspace/ui",
      },
    },
  };
});