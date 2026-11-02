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
//
// =====================================================================
// REVERSED AGAIN (owner, 2026-11-02) - THE WHOLE SYSTEM IS NOW TWO CTAs
// =====================================================================
// Verbatim: "the only CTAs i want to have is 2 - Tel us more, when water event
// is ended, and than it redirect the user into the tag leak flow; and to any
// push notification View button and then it redirect the user to the push
// content".
//
// Read the three dated decisions above in order, because the owner has now
// reversed two of them in two days:
//   2026-11-01 (a) the View BUTTON was struck ("remove the 'view' it is
//       obvious") and the body tap was wired on three surfaces to replace it;
//   2026-11-01 (b) a later pass RESTORED Assign to me + Ignore onto Ongoing,
//       after an OL_* push arrived with an empty action row;
//   2026-11-02 (c) this change: the whole system collapses to TWO CTAs.
//
// What (c) means concretely:
//   * View comes back AS A BUTTON, on every push of every type and state -
//     including the states that previously returned nothing, including an
//     ignored card, and including an unknown/future state. That universality
//     is the point: "any push notification" has no exceptions, so the default
//     branch of the switch is no longer empty. It is View that makes the
//     guarantee, and Rami's 2026-06-06 rule is in force again by a different
//     route.
//   * View appears on the LOCK-SCREEN card too (owner's follow-up answer),
//     which is the one surface that never carried it.
//   * The body tap STAYS, in addition to the button - the owner was asked and
//     said so explicitly. A notification therefore now has TWO paths into the
//     app on purpose. That deliberately overrides the Apple HIG argument
//     recorded above ("presenting an action button that does the same thing
//     clutters the detail view"); the HIG note is kept, not deleted, so the
//     next reader can see it was weighed and overridden rather than missed.
//   * 'Tell us more' REPLACES 'Tag the cause' as the End-of-Leak label. This
//     breaks no specification: src/utils/pushText.js:258 records that the
//     label was a "mockup convention - not part of the V11 push body text
//     itself". (pushText.js and en.json are another agent's in this pass.)
//   * Assign to me and Ignore leave the push ENTIRELY. 'investigate',
//     'ignore' and 'dismiss' are never returned again, from any branch.
//
// WHY THAT IS SAFE: removing those two actions from the push removes NO
// capability. The push was only ever a shortcut into them, and both flows keep
// their own homes:
//   * Claiming ("Assign to me" / 'on-it') lives at
//       src/v2/components/EventFocusOverlay.jsx:1460
//       src/v2/pages/SystemPageV2Screen.jsx:1390   (case 'on-it')
//       src/components/WaterEventDetailsWidget.jsx:159  (claimOnIt)
//     (The brief for this change cited :1432 / :1388 / :155; those are the
//     enclosing blocks or stale offsets - the actual startInvestigating calls
//     are at the lines above. Verified 2026-11-02.)
//   * Ignore keeps its own sheet on the Water Event card -
//       src/v2/pages/SystemPageV2Screen.jsx:2231 / :2246
//       src/v2/pages/HomeAllAccounts.jsx:1731 / :1745
//     which is the flow that collects the "why" summary; the push button never
//     did that.
// So nothing a user could do yesterday is unreachable today. The push simply
// stops being a shortcut.
//
// SIGNATURE IS DELIBERATELY UNCHANGED: `investigating` and `ignored` no longer
// select anything, but PushNotifications.jsx passes all three, and narrowing
// the destructure would churn a file other work is touching. They stay named
// and unused. `tagged` is still read - it is what flips 'Tell us more' to its
// '✓ Tagged' done state.
//
// The disable below is the cost of keeping them: no-unused-vars has no
// argsIgnorePattern in eslint.config.js, and that config is not this change's
// to edit. Remove the two names and the disable together, if a later pass gets
// PushNotifications.jsx to stop passing them.
// eslint-disable-next-line no-unused-vars
export function buildActions(n, { investigating, ignored, tagged }) {
  // The universal action, and now the ONLY one outside End of Leak. Every
  // type (leak and non-leak alike), every state, ignored or not, known or
  // unknown: a push always offers View. Built fresh on each call so a caller
  // that mutates an action object cannot poison the next card.
  const view = () => ({ key: 'view', label: 'View' });

  // End of Leak is the one state with a second CTA: the tag flow. The order is
  // fixed - the tag CTA first (it is the primary, Wint-blue button), View
  // second. `tagCta` drives that styling and drops once the answer is in.
  if (n?.type === 'leak' && n?.state === 'End of Leak') {
    return [
      { key: 'tag',  label: tagged ? '✓ Tagged' : 'Tell us more', primary: !tagged, done: tagged, tagCta: !tagged },
      view(),
    ];
  }

  // Everything else - including ignored cards, non-leak faults (valve error,
  // power lost, offline...), and any state this switch has never heard of.
  // This branch used to be three separate empty returns; it is now the
  // guarantee behind "any push notification".
  return [view()];
}
