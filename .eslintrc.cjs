const ERROR_WHEN_STRICT = process.env.ESLINT_STRICT == "true" ? "error" : "warn";

module.exports = {
  env: {
    es2021: true,
  },
  ignorePatterns: ["*.cjs", "lib", "node_modules"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/typescript",
  ],
  overrides: [],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./packages/*/tsconfig.json"],
  },
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "@typescript-eslint/consistent-type-exports": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-import-type-side-effects": "error",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-this-alias": "off",
    "@typescript-eslint/no-unused-vars": [ERROR_WHEN_STRICT, { argsIgnorePattern: "^_" }],

    "no-console": "error",
    "@typescript-eslint/ban-types": "off", // terribly obnoxious since we need Symbol from ts-morph
    "import/no-unresolved": "error",
    "import/consistent-type-specifier-style": ERROR_WHEN_STRICT,
    "import/no-duplicates": [ERROR_WHEN_STRICT, {}],
  },
  reportUnusedDisableDirectives: true,
  settings: {
    // "import/parsers": {
    //   "@typescript-eslint/parser": [".ts", ".tsx"],
    // },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
        // use a glob pattern
        project: "packages/*/tsconfig.json",
      },
      node: true,
    },
  },
};
