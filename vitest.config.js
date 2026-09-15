import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Mirrors vite.config.js. Without it every v2 component is untestable — they
  // import '@/components/ui/*' and '@/v2/icons', which vite resolves and vitest
  // did not.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // Default to node env; tests that need DOM opt-in with @vitest-environment happy-dom
    // pragma at the top of the file.
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.js'],
  },
});
