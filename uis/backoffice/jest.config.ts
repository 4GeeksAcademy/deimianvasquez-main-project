import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverage: true,
  collectCoverageFrom: ["src/services/api.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  setupFiles: ["<rootDir>/src/services/__tests__/setup.ts"],
  testMatch: ["**/__tests__/**/*.test.ts"],
};

export default config;