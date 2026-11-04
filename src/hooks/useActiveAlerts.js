import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { computeAllActiveAlerts, scopeActiveAlerts } from '../data/events';
import { useUserContext } from '../context/UserContext';

/**
 * The active-alerts list, scoped to what the signed-in user can actually see.
 *
 * ONE DERIVATION, TWO SURFACES. /alerts builds its Active list, its
 * "N need attention" sub-line and its "Showing X of Y" headline from this, and
 * the bottom tab bar's count badge reads the same hook. The badge and the page
 * it points at therefore cannot disagree - that property is the point of this
 * module and the reason the scope rule is not re-implemented at either site.
 *
 * SCOPED, NOT FLEET-WIDE. Changed 2026-11-04 on the owner's explicit ruling,
 * reversing the note that used to sit in EventsScreen:164-167 ("Unfiltered
 * totals ... MUST stay independent", with an Inbox unread-count analogy). The
 * old behaviour shipped a visible contradiction: on `tenant-1apt` the Alerts
 * header read "Total 1 system - 15 need attention" and the new tab badge said
 * 21, for a user who owns one apartment. The owner chose "what the user can
 * actually see" over the Inbox analogy.
 *
 * WHAT DID NOT CHANGE: the four category pills, and the water high/low
 * sub-filter, still shrink the LIST only. That half of the old rule survives
 * and is why "Showing X of Y" still has two different numbers in it - Y is now
 * the scoped total rather than the fleet total. Scope and filter are different
 * axes and only the scope axis moved.
 */
export function useAlertScope() {
  const [searchParams] = useSearchParams();
  const scopeParam = searchParams.get('scope');
  const { visibleSystems = [], selectedScope } = useUserContext() || {};

  const scopeIds = useMemo(
    () => (scopeParam ? new Set(scopeParam.split(',')) : null),
    [scopeParam],
  );

  const visibleIds = useMemo(
    () => new Set(visibleSystems.map(s => s.id)),
    [visibleSystems],
  );

  /* Drawer-selected scope. When the user picks a location from the navigation
     drawer (e.g. "Henrietta House") the scoped systems narrow the events list,
     not just the page title - the two had drifted once and are now locked
     together. */
  const selectedScopeIds = useMemo(() => {
    const ids = selectedScope?.systemIds;
    if (!ids || ids.length === 0) return null;
    return new Set(ids);
  }, [selectedScope]);

  return useMemo(
    () => ({ visibleIds, scopeIds, selectedScopeIds }),
    [visibleIds, scopeIds, selectedScopeIds],
  );
}

/**
 * The list itself. Deliberately NOT memoised on the alert data: computeActive-
 * Events() reads the simulated-alert overlay out of localStorage on every call,
 * which is how a push fired from the pusher or another tab reaches this screen
 * at all. Memoising it on [] would freeze the badge at its first value.
 */
export function useScopedActiveAlerts() {
  const scope = useAlertScope();
  return scopeActiveAlerts(computeAllActiveAlerts(), scope);
}
