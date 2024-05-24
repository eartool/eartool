// @ts-check
import {} from "@typescript-eslint/parser";

import {
  alphabeticalDependencies,
  alphabeticalScripts,
  fileContents,
  packageEntry,
  packageOrder,
  packageScript,
  requireDependency,
  standardTsconfig,
} from "@monorepolint/rules";

/** @type import("@monorepolint/config").Config */
export default {
  rules: [
    fileContents({
      options: {
        file: "vitest.config.js",
        template: `
        import { defineConfig } from 'vitest/config'

        export default defineConfig({
          test: {
            // ... Specify options here.
            include: ["src/**/*.test.{ts,js}"],
          },
        })`,
      },
    }),
    packageEntry({
      options: {
        entries: {
          type: "module",
          exports: {
            ".": {
              types: "./lib/index.d.ts",
              import: "./lib/index.js",
            },
          },
          files: ["bin", "lib"],
          publishConfig: {
            access: "public",
          },
        },
      },
    }),
    packageScript({
      options: {
        scripts: {
          clean: "rm -rf lib tsconfig.tsbuildinfo",
          deepClean: "rm -rf lib tsconfig.tsbuildinfo",
          "check:prettier": { options: [undefined], fixValue: undefined },
          "check:jest": { options: [undefined], fixValue: undefined },
          "check:eslint": { options: [undefined], fixValue: undefined },
          prepublishOnly: "tsc --build",
        },
      },
    }),
    packageOrder({}),
    standardTsconfig({
      options: {
        template: {
          extends: "../../tsconfig.base.json",
          compilerOptions: {
            outDir: "lib",
            rootDir: "src",
          },
          exclude: ["node_modules", "lib"],
        },
      },
    }),
    requireDependency({
      options: {
        devDependencies: {
          "prettier-2": "npm:prettier@^2",
        },
      },
    }),
    // These work best when last!
    alphabeticalDependencies({
      includeWorkspaceRoot: true,
    }),
    alphabeticalScripts({}),
  ],
};
