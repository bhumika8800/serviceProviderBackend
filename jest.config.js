module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!utils/seed.js',
  ],
  testTimeout: 30000,
  verbose: true,
  moduleNameMapper: {
    '^firebase-admin/app$': '<rootDir>/tests/__mocks__/firebase-admin.js',
    '^firebase-admin/auth$': '<rootDir>/tests/__mocks__/firebase-admin.js',
    '^firebase-admin/messaging$': '<rootDir>/tests/__mocks__/firebase-admin.js',
  },
};
