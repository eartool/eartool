/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest/presets/default-esm",

  testPathIgnorePatterns: ["node_modules", "lib"],
  watchPathIgnorePatterns: ["lib", "log"],

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
