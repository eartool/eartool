// @ts-check

import eslint from "@eslint/js";
import eslintPlugin from "@typescript-eslint/eslint-plugin";
import typeScriptParser from "@typescript-eslint/parser";
import * as importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";
import typescriptEslint from "typescript-eslint";

const ERROR_WHEN_STRICT = process.env.ESLINT_STRICT == "true" ? "error" : "warn";

export default typescriptEslint.config(
  eslint.configs.recommended,
  {
    extends: [
      ...typescriptEslint.configs.recommended,
    ],
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    plugins: {
      "@typescript-eslint": eslintPlugin,
      "import": importPlugin,
      "unused-imports": unusedImports,
    },
    languageOptions: {
      parser: typeScriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./packages/*/tsconfig.json"],
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-import-type-side-effects": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-this-alias": "off",

      // BEGIN Imports and unused vars
      "import/no-duplicates": [ERROR_WHEN_STRICT, { "prefer-inline": false }],
      // "import/order": ["error", { groups: ["builtin", "external", "internal"] }],

      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // END Imports and unused vars

      "no-console": "error",
      "@typescript-eslint/ban-types": "off", // terribly obnoxious since we need Symbol from ts-morph
    },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
          // use a glob pattern
          project: "packages/*/tsconfig.json",
        },
        node: true,
      },
    },
  },
);
