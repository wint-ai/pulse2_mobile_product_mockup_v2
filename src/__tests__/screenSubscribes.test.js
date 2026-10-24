// Guarantees that every screen which displays sim-alert-driven data subscribes
// to useDataRefresh. Without this hook, the screen renders once and then never
// updates when a push fires - which is what Rami hit on Home + the drawer.
//
// We grep the source files instead of trying to render React, which would
// require jsdom + RTL. Simple, fast, catches the exact regression.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

const SCREENS_THAT_MUST_SUBSCRIBE = [
  // Home variants - all show system status that depends on sim alerts
  'src/screens/home/HomeUnified.jsx',
  'src/screens/home/HomeManager.jsx',
  'src/screens/home/HomeClear.jsx',
  'src/screens/home/HomeMultiAccount.jsx',
  'src/screens/home/TenantPropertiesList.jsx',
  // System detail surfaces
  'src/screens/systems/SystemDetail.jsx',
  'src/screens/systems/ActivityTab.jsx',
  // Alerts surface
  'src/screens/events/EventsScreen.jsx',
  // Drawer - shows multi-issue health labels per system
  'src/components/NavigationDrawer.jsx',
  // Leak/Alert detail
  'src/screens/leak/LeakDetail.jsx',
];

describe('every sim-alert-driven screen calls useDataRefresh()', () => {
  for (const rel of SCREENS_THAT_MUST_SUBSCRIBE) {
    it(`${rel} calls useDataRefresh`, () => {
      const full = path.join(REPO_ROOT, rel);
      expect(fs.existsSync(full)).toBe(true);
      const src = fs.readFileSync(full, 'utf8');
      // Must import + invoke. We grep for both: catches imports that never
      // call (dead code) AND calls without import (build error).
      expect(src).toMatch(/import \{[^}]*useDataRefresh[^}]*\}/);
      expect(src).toMatch(/useDataRefresh\(\)/);
    });
  }
});
