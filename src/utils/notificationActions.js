// NOTE FOR THE OWNER (2026-11-01): removing the View BUTTON exposed that the
// notification body was never tappable on any of the four surfaces - View was
// the only thing that dispatched 'view'. So the tap was wired in the same pass
// on the three surfaces that carried the button (shade, in-app banner,
// other-app heads-up); without it, striking View would have left no path at
// all from a notification into the app. The lock card is deliberately not
// tappable-to-navigate: it expands, and its expanded state says "Unlock to
// take action", which is the lock-screen idiom and what it did before.
//
// Pure function: given a notification payload + the persisted action state
// (investigating, ignored, tagged), return the action button set to render
// on a notification card. Extracted from PushNotifications.jsx so it can be
// unit-tested - the per-state action set is critical (e.g. Dismiss was
// removed from Ongoing, Tag CTA only on End of Leak, etc.).

// Rule (Rami 2026-06-06): every notification, no matter its type or state,
// must offer at least a 'View' action that navigates to the system page.
// Specific states layer additional actions on top (Tag, Ignore, On it, etc.)
// but View is the constant - the user always has a way out of the notification
// into the source system.
//
// OVERRULED (owner, 2026-11-01): "remove the 'view' it is obvious / keep only
// the ignore and assign to me". Rami's rule above is kept, not deleted, so the
// next reader can see what was traded away and by whom.
//
// Apple's HIG arrives at the same place independently: "Avoid providing an
// action that merely opens your app... When people tap a notification or its
// preview, they expect your app to display related content, so presenting an
// action button that does the same thing clutters the detail view and can be
// confusing." Tapping the notification body is the navigation path - which is
// exactly the owner's "it is obvious" - so the BUTTON goes and the 'view'
// action key stays: PushNotifications.jsx still handles it, now dispatched by
// the body tap rather than by a button.
//
// The set is now at most TWO actions, which is the only count that is safe on
// both platforms: Apple's HIG says up to four but its own UNNotificationCategory
// reference says at most two when space is constrained, and Android caps at three.
// LABEL, NOT IDENTITY (owner, 2026-10-31): the claim action reads "Assign to
// me" wherever a user sees it. The action key stays 'investigate' and the
// timeline step id stays 'on-it' -- PushNotifications.jsx:644 and the timeline
// config switch on those, and renaming them would be churn with a real chance
// of breaking a switch.
export function buildActions(n, { investigating, ignored, tagged }) {
  // Non-water notifications: NO actions. These alert types (valve error,
  // power lost, offline, etc.) never had an actionable state beyond
  // navigating, and navigating is now the body tap. NotifActions returns null
  // on an empty set, so the card draws no action row at all rather than an
  // empty strip.
  if (n.type !== 'leak') return [];
  // Once ignored, every action collapses - and with View gone that is an
  // EMPTY set, not an orphaned single control. The "Ignored" status pill on
  // the card is what still says so; re-opening is the body tap. Subsequent
  // pushes for the SAME event respect this (a NEW Warning push clears the
  // ignored flag via applyPushEvent).
  if (ignored) return [];
  switch (n.state) {
    case 'Warning':
      // The owner's set, exactly: "keep only the ignore and assign to me".
      return [
        ...(investigating ? [] : [{ key: 'investigate', label: 'Assign to me' }]),
        { key: 'ignore',      label: 'Ignore' },
      ];
    case 'Ongoing':
      // RESTORED 2026-11-01 (owner: "why do I don't see any ignore or assign
      // to me and view? ... I want to make sure all there. Only for the
      // relevant stuff."). What they saw was an OL_* Ongoing push with an
      // empty action row: View had been this state's ONLY action, so striking
      // it left nothing behind. The fix is NOT to bring View back - it is that
      // the two actions Warning offers were always relevant here as well. An
      // Ongoing water event is live and unresolved: a person can still take
      // it, and can still decide it is expected. There is no reason those are
      // relevant at Warning and irrelevant thirty minutes later.
      //
      // Gated exactly as Warning is - the claim action hides once somebody
      // holds the claim, leaving Ignore alone. Still no Dismiss action:
      // swipe-to-dismiss is native on iOS / Android.
      return [
        ...(investigating ? [] : [{ key: 'investigate', label: 'Assign to me' }]),
        { key: 'ignore',      label: 'Ignore' },
      ];
    case 'Shutoff':
      // No Ignore on Critical state, so this is a SINGLE-action row. It renders
      // correctly as one: the buttons are flex-[1_1_0] with a min width, so one
      // action fills the row rather than leaving a gap where View used to be.
      //
      // ONCE CLAIMED, THE SET IS EMPTY - and stays that way, reviewed in the
      // same 2026-11-01 pass that gave Ongoing its two actions back. Ongoing
      // was empty because View had been struck out from under it; Shutoff +
      // investigating is empty because both of its actions are genuinely
      // spent. Ignore is withheld from Critical on purpose (the auto-shutoff
      // has already fired - "this is expected" is not a thing left to say),
      // and the claim is spent because this person already holds it. Filling
      // the row would mean minting a label, and the vocabulary is the owner's
      // to extend. An empty row is the honest answer; the body tap still opens
      // the event, and the "On it - X" pill still says who has it.
      return [
        ...(investigating ? [] : [{ key: 'investigate', label: 'Assign to me' }]),
      ];
    case 'End of Leak':
      // PRD 15 § 7.1 - readable label, no Dismiss (swipe-to-dismiss native).
      // 'tagCta' flag marks this as the Wint-blue primary CTA on the push.
      // Tag survives the View removal: the owner struck View, not the Tag CTA,
      // and Tag is not a "merely opens your app" action.
      return [
        { key: 'tag',  label: tagged ? '✓ Tagged' : 'Tag the cause', primary: !tagged, done: tagged, tagCta: !tagged },
      ];
    default:
      return [];
  }
}
