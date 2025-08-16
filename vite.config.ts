import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // Get port from command line arguments
  const port = process.argv.includes('--port') 
    ? parseInt(process.argv[process.argv.indexOf('--port') + 1])
    : 8080;

  return {
    server: {
      host: "::",
      port: port,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
