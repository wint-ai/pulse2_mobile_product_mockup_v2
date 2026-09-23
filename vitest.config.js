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
    /* 5s (the default) is not enough for the DOM tests HERE, and the failure it
       produces is a lie: the three drawer/scope suites pass 19/19 when run on
       their own and time out only under full-suite contention, with a
       different subset failing on every run. A gate that goes red at random is
       a gate people learn to push past — which happened twice on this repo.
       This does not mask regressions: a test that genuinely hangs still fails,
       it just gets long enough to prove it. */
    testTimeout: 20000,
    setupFiles: ['./src/__tests__/setup.js'],
  },
});
