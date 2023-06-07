module.exports = {
  env: {
    es2021: true,
  },
  ignorePatterns: ["*.cjs", "lib", "node_modules"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  overrides: [],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./packages/*/tsconfig.json"],
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/consistent-type-exports": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-import-type-side-effects": "error",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-this-alias": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-console": "error",
    "@typescript-eslint/ban-types": "off", // terribly obnoxious since we need Symbol from ts-morph
  },
  reportUnusedDisableDirectives: true,
};
