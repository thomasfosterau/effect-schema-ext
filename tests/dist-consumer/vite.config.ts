import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      // Type-checks the emitted declarations; depends on the package's build
      // (a workspace dependency above) so `vp run check` at the root always
      // exercises fresh `dist/` output.
      check: {
        command: "tsc -p tsconfig.json",
        dependsOn: [{ task: "build", from: "dependencies" }],
        cache: {
          input: [
            { auto: true },
            "!node_modules/**",
            { pattern: "packages/*/dist/**", base: "workspace" as const },
          ],
          output: [],
        },
      },
    },
  },
});
