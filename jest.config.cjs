/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = {
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],

  testPathIgnorePatterns: ["node_modules", "lib"],
  watchPathIgnorePatterns: ["lib", "log"],

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...baseConfig,

  projects: ["fix-namespace"].map((displayName) => [
    {
      ...baseConfig,
      displayName,
      rootDir: `<rootDir>/packages/${displayName}`,
    },
  ]),
};
