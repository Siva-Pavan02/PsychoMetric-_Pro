import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Only run files in __tests__ that don't need a DB
  testMatch: ["**/__tests__/**/*.test.ts"],
  // Don't try to transform node_modules
  transformIgnorePatterns: ["/node_modules/"],
};

export default config;
