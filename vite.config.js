import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // This maps '~' to the root directory of your project
      "~": path.resolve(__dirname, "./"),
      // If you specifically want it to point to a 'src' folder, use:
      // '~': path.resolve(__dirname, './src'),
    },
  },
});
