---
name: v2-page-parity
description: Rules for building or editing screens in src/v2/pages/. Load BEFORE creating a new v2 page, editing an existing one, repointing a route in App.jsx from a v1 screen to a v2 page, or implementing any Figma node/frame as a v2 screen (get_design_context, get_screenshot, figma.com links, "build this design", "implement this frame"). Encodes the app-shell contract (scroll container, NavigationDrawer, TabBar) that a v2 page must satisfy, plus the standing rule that working functionality is never removed without the owner's explicit permission.
---

# v2 page parity

`src/v2/pages/` is the v2 UI exploration. Its pages are rebuilt from Figma and
mount into the **same app shell** as the v1 screens. A page that only reproduces
the Figma visual will look right and be functionally broken.

## Rule 0 — never silently drop functionality

**Do not remove, disable, or stub out working functionality without explicit
permission from the repo owner.** This includes the implicit removal that
happens when a route is repointed from a v1 screen to a v2 page that hasn't
reached parity yet.

If a v2 page isn't ready to carry a function, say so and ask — do not ship the
route swap and leave the function dead. Repointing a route in `App.jsx` is a
functionality change, not a cosmetic one.

This rule exists because it was broken: commits `728d674` and `5c4d404` pointed
`/` and `/system/:systemId` at v2 pages whose burger button had no `onClick`,
whose root was `min-h-screen` (unscrollable inside the phone frame), and which
never mounted `TabBar`. Three functions silently died on the default routes.

## The app-shell contract

`src/components/Phone.jsx` is a **fixed 393×852 flex column with
`overflow: hidden`**. It does not scroll. Consequences:

- `min-h-screen` / `h-screen` on a page root is **wrong** — `100vh` exceeds the
  852px frame and simply gets clipped. The page will not scroll.
- **Every screen owns its own scroll container.** Fixed chrome (top bar,
  title, tabs) are `shrink-0` siblings; exactly one body element carries
  `flex: 1; overflow-y: auto; min-height: 0`.
- `min-height: 0` is not optional — without it a flex child refuses to shrink
  below content height and the overflow never engages.

### Required page skeleton

```jsx
export default function MyV2Page() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: PAGE_BG }}>
      {/* chrome — shrink-0, NOT sticky: it's outside the scroller already */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button aria-label="Menu" onClick={() => setDrawerOpen(true)}>
          <Menu size={20} />
        </button>
      </div>

      {/* exactly one scrolling region */}
      <div className="px-4 pt-4 pb-8 flex flex-col gap-3"
           style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* content */}
      </div>

      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectLocation={() => setDrawerOpen(false)}
        currentSystemId={systemId}   // system pages only — drives row highlight
      />
      <TabBar activeTab="home" />
    </div>
  )
}
```

## Coming from Figma

Every page in `src/v2/pages/` is translated from a Figma node — see the
`Design source:` header each one carries. Use the Figma MCP skills
(`/figma-use`, `/figma-generate-design`) to read the design, then **apply this
skill on top of what they give you.**

**A Figma frame describes appearance, never behavior.** Translating one
literally produces exactly the three regressions this skill exists to prevent:

| In Figma | Translated literally | What it actually needs |
|---|---|---|
| Burger glyph in the top bar | `<Menu />` with no handler — a dead button | `onClick` + mounted `NavigationDrawer` |
| Frame with a fixed height | `min-h-screen` / `h-[852px]` | `flex:1 / overflowY:auto / minHeight:0` |
| Long frame, content runs past the fold | clipped, unscrollable | one real scroll container |
| Bottom tab bar absent from the frame | omitted entirely | `<TabBar>` still mounted |

The Figma canvas has no scroll model and no routing, so **anything interactive
in the design is a static picture until you wire it.** Before finishing a
Figma-sourced page, walk every tappable-looking element in the frame and
confirm it has a real handler, or is deliberately inert.

Keep the `Design source: Figma node <id>` header accurate when you re-derive a
page from an updated design — it is how the next person diffs design against
implementation.

## Checklist — every v2 page, before you call it done

- [ ] **Burger wired.** A `<Menu>` icon with no `onClick` is a dead button.
      `onClick={() => setDrawerOpen(true)}` **and** `<NavigationDrawer>` mounted.
- [ ] **Scrolls.** Root is `flex:1 / minHeight:0 / flex column`; body is
      `flex:1 / overflowY:auto / minHeight:0`. No `min-h-screen`.
- [ ] **TabBar mounted.** `<TabBar activeTab="…" />` as the last sibling. It is
      `flexShrink: 0` and sits in the column — it is *not* absolutely
      positioned, so it needs no spacer, but the scroll body should keep
      bottom padding (`pb-8`).
- [ ] **Drawer context passed.** On `/system/:systemId`, pass
      `currentSystemId={systemId}` or the drawer won't highlight/expand to the
      current system (see the contract note at `NavigationDrawer.jsx:783`).
- [ ] **No new lint errors.** `npx eslint <the files you touched>`. The repo has
      ~150 pre-existing problems; compare against `HEAD`, don't count the total.
- [ ] **Tests green.** `npm test` — 30 files / 360 tests at time of writing.

## Reference implementations

- v1, correct shell usage: `src/screens/home/HomeUnified.jsx:807-814` (scroll
  container) and `:965-971` (drawer + tabbar mount).
- v1 system page: `src/screens/systems/SystemDetail.jsx:753-755`.
- v1 originals stay reachable at `/v1/` and `/v1/system/:systemId` — use them to
  diff behavior when a v2 page feels wrong.

## Line endings

The repo checks out **CRLF** on Windows. Scripted edits that match multi-line
anchors with `\n` will silently fail to match. Normalize to `\n` for matching,
then write back as CRLF so the diff stays limited to real changes.
