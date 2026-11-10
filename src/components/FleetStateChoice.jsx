/**
 * FleetStateChoice — "what you'll see": the all-clear fleet, or the one with
 * leaks and faults.
 *
 * ── WHY THIS IS A SHARED COMPONENT AND NOT AN INLINE BLOCK ────────────────
 * Owner, 2026-11-10: "every time I'm logged out, and I'm choosing the user
 * roles, I want to see this flag if I want to see clear or with error. And
 * currently it's not the situation."
 *
 * He is describing TWO screens, and the control only ever existed on one of
 * them:
 *
 *   src/App.jsx LoginGate   the cold sign-in picker (no `pulse2-auth`).
 *                           Has had an inline `FleetStatePicker` since
 *                           2026-11-04. This component replaces that block;
 *                           the markup below is it, moved.
 *   src/screens/PersonaSelect.jsx at /select   the screen "Sign out"
 *                           actually lands on (AccountScreenV2.switchProfile
 *                           clears the persona and navigates here; it does
 *                           NOT clear `pulse2-auth`), and the one the
 *                           sidebar's profile row opens. It had no control at
 *                           all, which is the "currently it's not the
 *                           situation" half of the complaint.
 *
 * One component, both screens, for the same reason PersonaPicker.jsx is
 * shared: they were near-duplicates once already and drifted.
 *
 * ── WHAT IT ACTUALLY WRITES ───────────────────────────────────────────────
 * `chooseFleetState()` (src/data/fleetState.js), which writes BOTH demo flags
 * so a deliberate choice always leaves a consistent pair behind. The reason
 * that function exists, and why the displayed state is
 * `readEffectiveFleetState()` rather than `readFleetState()`, is written out
 * there — short version: the pusher's `pulse2-mock-suppressed` empties the
 * fleet too, it is sticky in localStorage forever, and until today no screen
 * in the app said so.
 *
 * ── WHY IT RELOADS ────────────────────────────────────────────────────────
 * Unchanged from the block it replaces. src/data/upstream/buildTree.js reads
 * the mode at module scope and builds the whole tree once, at import.
 * Flipping the flag without a reload would leave a stale in-memory fleet
 * beside a changed flag — the worst of the three outcomes, because it looks
 * like it worked. Nothing is lost: both screens that mount this keep their
 * state in sessionStorage (`pulse2-demo-pw-ok`, `pulse2-auth`,
 * `pulse2-deep-link`, `pulse2-pair-code`), and all of it survives a reload.
 *
 * ── COPY ──────────────────────────────────────────────────────────────────
 * Every string is an EXISTING key — `login.fleet_state_label` / `_clear` /
 * `_live` / `_hint`, already in en.json and he.json. They are still marked
 * NEW COPY at their source (proposed 2026-11-04, never approved), and this
 * change does not approve them or add to them: naming a third fleet concept
 * here would be exactly the invention wint-ui-copy §0 forbids. "All clear"
 * and "Leaks and faults" are also the two phrases the owner's own sentence
 * uses ("clear or with error"), so they are transcription rather than
 * authorship.
 *
 * ── NOT A SEGMENTED-CONTROL COMPONENT ─────────────────────────────────────
 * There is still no shared one in src/v2, and LoginGate renders before the
 * app gate, so this uses the same token set as the persona cards beside it
 * (`bg-surface-card`, `border-card`, `bg-secondary`/`text-primary` for the
 * selected seat). No raw hex: check it with `?theme=contrast`, where every
 * colour here has to move.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  chooseFleetState,
  isMockSuppressed,
  readEffectiveFleetState,
  FLEET_CLEAR,
  FLEET_LIVE,
} from '../data/fleetState';
import { cn } from '@/lib/utils';

export default function FleetStateChoice({ variant = 'card', className }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(readEffectiveFleetState);

  const pick = (next) => {
    /* NOT `if (next === mode) return`.
       That guard was correct while one flag decided everything; it is a trap
       now. With `pulse2-mock-suppressed` set, the control shows "All clear"
       and a tap on "All clear" is the user asking for a clean fleet WITH its
       history — a different stored state from the one they are looking at.
       Early-returning there would leave the pusher's flag standing under a
       control that claims to have just set the fleet, which is the exact
       class of bug this screen is being changed to remove.

       So the comparison is against what is STORED, via the same function the
       initial state came from, and the write happens whenever the stored pair
       is not already the pair this tap asks for. */
    const settled = readEffectiveFleetState() === next && !isMockSuppressed();
    chooseFleetState(next);
    setMode(next);
    if (!settled) window.location.reload();
  };

  const options = [
    { value: FLEET_CLEAR, label: t('login.fleet_state_clear') },
    { value: FLEET_LIVE, label: t('login.fleet_state_live') },
  ];

  return (
    <div
      className={cn(
        variant === 'card' &&
          'rounded-[12px] border border-solid border-card bg-surface-card px-3 py-[10px]',
        className,
      )}
      data-name="fleet-state-choice"
      data-fleet-state={mode}
    >
      <div className="font-bold text-slate-900 text-[12.5px] leading-[17px]">
        {t('login.fleet_state_label')}
      </div>
      <div
        role="radiogroup"
        aria-label={t('login.fleet_state_label')}
        className="mt-2 flex gap-2"
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={mode === o.value}
            onClick={() => pick(o.value)}
            className={cn(
              'flex-1 cursor-pointer rounded-[9px] border border-solid px-2 py-[7px] text-center font-bold text-[12.5px] leading-[17px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              mode === o.value
                ? 'border-primary bg-secondary text-primary'
                : 'border-border-strong bg-transparent text-slate-500',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="mt-[6px] text-slate-500 text-[11px] leading-[15px]">
        {t('login.fleet_state_hint')}
      </div>
    </div>
  );
}
