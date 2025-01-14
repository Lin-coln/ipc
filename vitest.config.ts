import { configDefaults, defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const exclude = [...configDefaults.exclude, "scripts/**"];

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [...exclude, "test/**"],
    },
    exclude,
    typecheck: {
      enabled: true,
    },
  },
  plugins: [tsconfigPaths()],
});
