import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://test:test@localhost:3306/landnest_test',
      SESSION_SECRET: 'test-session-secret-at-least-32-chars-long',
      CAPTCHA_SECRET: 'test-captcha-secret-at-least-32-chars-long',
      STORAGE_DRIVER: 'local',
      FRONTEND_URL: 'http://localhost:5173',
    },
  },
});
