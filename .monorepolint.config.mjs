// @ts-check
import {} from "@typescript-eslint/parser";

import {
  alphabeticalDependencies,
  alphabeticalScripts,
  standardTsconfig,
  packageEntry,
  packageOrder,
  packageScript,
} from "@monorepolint/rules";

/** @type import("@monorepolint/config").Config */
export default {
  rules: [
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
    // These work best when last!
    alphabeticalDependencies({
      includeWorkspaceRoot: true,
    }),
    alphabeticalScripts({}),
  ],
};
