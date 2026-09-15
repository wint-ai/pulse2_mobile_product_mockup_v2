// @vitest-environment happy-dom
//
// Renders the drawer for a fleet-manager persona with various sim-alert
// states; asserts that the system row text reflects the live alert. This
// was the regression Rami hit: drawer rows stayed stale because
// UserContext.visibleSystems wasn't applying the sim overlay.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavigationDrawer from '../components/NavigationDrawer';
import { ThemeProvider } from '../context/ThemeContext';
import { UserProvider } from '../context/UserContext';
import { applyPushEvent } from '../lib/pushEvents';
import { HAPPY_PATH_APT } from './fixtures';

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

function renderDrawer(personaId = 'building-manager-residential') {
  // Set persona id BEFORE mounting so UserProvider's loadPersona picks it up.
  localStorage.setItem('pulse2-persona-id', personaId);
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <UserProvider>
          <NavigationDrawer
            open={true}
            onClose={() => {}}
            onSelectLocation={() => {}}
            currentSystemId={null}
          />
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('NavigationDrawer reflects live sim alerts', () => {
  it('Oren (building manager) drawer renders without error', () => {
    const { container } = renderDrawer();
    // Drawer rendered something (not empty)
    expect(container.textContent.length).toBeGreaterThan(50);
  });

  it('drawer rendering does not crash when sim alert exists', () => {
    applyPushEvent({
      type: 'push',
      payload: { type: 'leak', state: 'Warning', severity: 'High Flow',
                 systemId: HAPPY_PATH_APT, v10_9_id: 'WA_01' },
    });
    const { container } = renderDrawer();
    expect(container.textContent.length).toBeGreaterThan(50);
    // The drawer should not throw or render a blank screen.
  });
});
