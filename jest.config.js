module.exports = {
    setupFiles: ['./jest.setup.js'],
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Specify paths to your TypeScript tests
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    // Optionally, specify the path to your tsconfig.json
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.json'
      }
    }
  };
  