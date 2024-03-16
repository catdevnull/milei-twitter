import { sveltekit } from "@sveltejs/kit/vite";
import legacy from "@vitejs/plugin-legacy";

import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    sveltekit(),
    legacy({
      targets: ["defaults", "not IE 11"],
    }),
  ],
});
