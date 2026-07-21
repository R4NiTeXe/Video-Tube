export default {
  testEnvironment: "node",
  transform: {},
  moduleFileExtensions: ["js", "mjs", "cjs", "json"],
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/index.js",
    "!src/app.js",
  ],
  coverageDirectory: "coverage",
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 30000,
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};