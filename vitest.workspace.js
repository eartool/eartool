import { defineWorkspace } from "vitest/config";

// defineWorkspace provides a nice type hinting DX
export default defineWorkspace([
  "packages/*",
  // {
  //   // add "extends" to merge two configs together
  //   extends: "./vite.config.js",
  //   test: {
  //     include: ["src/**/*.test.{ts,js}"],
  //     // it is recommended to define a name when using inline configs
  //   },
  // },
  // {
  //   test: {
  //     include: ["tests/**/*.{node}.test.{ts,js}"],
  //     name: "node",
  //     environment: "node",
  //   },
  // },
]);
