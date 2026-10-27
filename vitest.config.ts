import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    // Operational tools use node:test and run separately in test:buffer.
    exclude: [...configDefaults.exclude, "tools/**/*.test.mjs"],
  },
});
