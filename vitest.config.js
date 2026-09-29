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
    testTimeout: 30000,
    /* Raised twice now: 5s -> 20s (399 tests) -> 30s (540). The three
       drawer/scope suites render the whole app and pass 19/19 alone; they only
       exceed the limit when enough heavy DOM files run beside them, and the
       failing subset differs every run. Capping worker threads would be the
       other lever, but it slows every run to fix a minority of them.
       This does not mask regressions — a genuinely hung test still fails, it
       just gets long enough to prove it rather than being killed mid-render. */
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
