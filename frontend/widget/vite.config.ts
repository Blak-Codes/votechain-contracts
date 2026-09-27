import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/votechain-widget.ts"),
      name: "VotechainWidget",
      fileName: "votechain-widget",
      formats: ["iife"],
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: "esbuild",
  },
});
