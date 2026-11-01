// @vitest-environment happy-dom
//
// The Push Simulator's chrome, pinned.
//
// The owner's report was that /push "still looks like the old one - old icons,
// old fonts, old descriptions". The four phone surfaces had already been
// cleaned; this screen had not. These tests lock the three things that made it
// look old, and the one thing the clean-up must not have touched.
//
// They are deliberately about the CHROME, not the layout: a px nudge should
// never fail this file, and a Material Symbol creeping back in always should.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ControlPanel from '../screens/ControlPanel';
import { ThemeProvider } from '../context/ThemeContext';
import { UserProvider } from '../context/UserContext';
import { PUSH_CATALOG } from '../data/pushCatalog';

// The bridge is the one thing these tests must not exercise: it is a real
// ntfy.sh publish on a free-tier daily quota.
const bridgePublish = vi.fn();
vi.mock('../lib/pushBridge', () => ({
  publish: (...a) => bridgePublish(...a),
  getRoom: () => 'pulse2-test',
  getOrCreatePusherRoom: () => 'pulse2-test',
  isRateLimited: () => false,
  getRateLimitReason: () => null,
  onRateLimitChange: () => () => {},
}));

beforeEach(() => {
  localStorage.clear();
  bridgePublish.mockClear();
  cleanup();
});

function renderPanel() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <UserProvider>
          <ControlPanel />
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('Push Simulator chrome', () => {
  it('draws no Material Symbols', () => {
    const { container } = renderPanel();
    expect(container.querySelectorAll('.material-symbols-outlined')).toHaveLength(0);
    // The ligature names themselves are gone from the markup too — the old
    // build printed them as the glyph span's text content.
    expect(container.textContent).not.toMatch(/water_drop|play_arrow|power_settings_new|check_circle/);
  });

  it('declares no font-family of its own, so the page inherits Figtree', () => {
    const { container } = renderPanel();
    const styled = [...container.querySelectorAll('[style]')];
    const withFamily = styled.filter(el => el.getAttribute('style').toLowerCase().includes('font'));
    expect(withFamily.map(el => el.getAttribute('style'))).toEqual([]);
  });

  it('takes every label from the catalogue and writes none of its own', () => {
    const { container } = renderPanel();
    for (const card of PUSH_CATALOG) {
      expect(container.textContent).toContain(card.id);
      expect(container.textContent).toContain(card.label);
    }
  });

  it('still puts the catalogue glyph name on the wire', () => {
    // payloadMeta + `icon: card.glyph` are what the receiving surfaces read.
    // The port changed how the pusher DRAWS a glyph, never what it sends.
    const posted = [];
    const spy = vi
      .spyOn(BroadcastChannel.prototype, 'postMessage')
      .mockImplementation(function (msg) { posted.push(msg); });

    const { container } = renderPanel();
    const fire = [...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Fire');
    expect(fire).toBeTruthy();
    fireEvent.click(fire);

    const push = posted.find(m => m?.type === 'push');
    expect(push).toBeTruthy();
    expect(push.payload.icon).toBe(PUSH_CATALOG[0].glyph);
    expect(push.payload.v10_9_id).toBe(PUSH_CATALOG[0].variants[0].id);
    spy.mockRestore();
  });
});
