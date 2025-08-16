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
        ],
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "../src"),
        "@app": path.resolve(__dirname, "./src"),
        "@root": path.resolve(__dirname, "../src"),
        "@ui": path.resolve(__dirname, "../ui"),
      },
    },
  };
});