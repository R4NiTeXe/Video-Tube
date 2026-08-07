export default {
  testEnvironment: "node",
  transform: {},
  moduleFileExtensions: ["js", "mjs", "cjs", "json"],
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/index.js", "!src/app.js"],
  coverageDirectory: "coverage",
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 30000,
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  coverageThreshold: {
    global: {
      statements: 24,
      branches: 12,
      functions: 24,
      lines: 24,
    },
    "./src/middlewares/": {
      statements: 55,
      branches: 35,
      functions: 55,
      lines: 55,
    },
    "./src/routes/": {
      statements: 75,
      branches: 5,
      functions: 20,
      lines: 75,
    },
  },
};
