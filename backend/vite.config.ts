/// <reference types="vitest" />
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "~encore": path.resolve(__dirname, "./encore.gen") },
  },
  test: {
    environment: "node",
    pool: "forks",
    fileParallelism: false,
  },
});
