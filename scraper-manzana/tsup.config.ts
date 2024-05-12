import { defineConfig } from "tsup";

export default defineConfig({
  format: "esm",
  shims: true,
  sourcemap: true,
});
