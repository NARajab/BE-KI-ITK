module.exports = {
  testEnvironment: "node",
  verbose: true,
  coveragePathIgnorePatterns: ["<rootDir>/config/", "<rootDir>/node_modules/"],
  coverageReporters: ["json", "lcov", "text", "clover"],
};
