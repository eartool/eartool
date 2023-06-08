/** @type {import('ts-jest').JestConfigWithTsJest} */
const tsJestBase = {
  preset: "ts-jest/presets/default-esm",
};

const swcBase = {
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        sourceMaps: true,
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
};

/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = {
  ...(false ? swcBase : tsJestBase),

  testPathIgnorePatterns: ["node_modules", "lib"],
  watchPathIgnorePatterns: ["lib", "log"],

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  cache: false,
  collectCoverage: false,
};

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...baseConfig,

  projects: [
    "command-refactor",
    "command-foo",
    "command-fix-namespace",
    "utils",
    "test-utils",
    "replacements",
  ].map((displayName) => [
    {
      ...baseConfig,
      displayName,
      rootDir: `<rootDir>/packages/${displayName}`,
    },
  ]),
};
