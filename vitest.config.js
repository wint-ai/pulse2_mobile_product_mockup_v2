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
    /* The DOM tests mount the whole app, repeatedly, against 103 systems whose
       consumption now comes from the ported 730-day model rather than a flat
       random band. Building one profile is ~2ms, and a Home render ranks every
       system — so the first render in each test FILE pays ~230ms before React
       does anything. (Profiles are cached per module registry, so it is paid
       once per file, not per render.)
       At the 5s default these tests failed with "Test timed out in 5000ms" in
       most full runs while passing in isolation, which reads like flakiness and
       is really a budget that no longer fits the work. */
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
