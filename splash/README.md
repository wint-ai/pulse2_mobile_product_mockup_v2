# WINT Splash Screen — Integration Guide

Opening / launch animation for the WINT mobile app.
**Animation:** "Assemble" · **Speed:** 1.2× (locked, per design sign-off)

The letters of the WINT wordmark slide in from the sides, then the water drop
falls straight down from the middle (the gap between the n and the t) and
settles into place with a small ripple.

---

## 1. The files

Two self-contained variants — pick by theme, or ship both and switch at runtime:

| File | Look |
|------|------|
| `wint-splash-screen-light.html` | Navy wordmark on a **white** background |
| `wint-splash-screen-navy.html`  | White wordmark on a **navy** (`#1e294c`) background |

Each file is **fully self-contained**: the logo is inline SVG, there are no
external fonts, CSS, JS, or image dependencies. Drop the file in as-is.

Brand colors used: navy `#20294c` (ink) · navy `#1e294c` (navy bg) ·
water-drop blue `#0b95f8`.

---

## 2. How it signals "done"

When the animation finishes it signals **once**, so your app knows when to
move on to the first real screen. Two equivalent hooks — use whichever fits:

```js
// Option A — DOM event
window.addEventListener('wint-splash-complete', () => {
  // navigate to Home / first screen
});

// Option B — callback
window.onWintSplashComplete = () => {
  // navigate to Home / first screen
};
```

It also exposes a handle for manual control:

```js
window.wintSplash.play();      // re-trigger the animation
window.wintSplash.complete();  // force-fire the complete signal now
```

---

## 3. Integration patterns

### Web app (plain / React / Vue)
Show the splash file (e.g. in a full-screen `<iframe>` or as the initial
route), listen for the event, then unmount it and render the app.

```html
<iframe id="splash" src="wint-splash-screen-light.html"
        style="position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9999"></iframe>
<script>
  window.addEventListener('message', () => {}); // (no message needed)
  document.getElementById('splash').contentWindow.addEventListener(
    'load', function () {
      this.addEventListener('wint-splash-complete', () => {
        document.getElementById('splash').remove();
      });
    }
  );
</script>
```
> Simplest path: make the splash the app's first route/screen and navigate away
> in the `wint-splash-complete` handler.

### React Native (WebView)
Render the HTML in a `<WebView>`, and bridge the completion event:

```jsx
const INJECTED = `
  window.addEventListener('wint-splash-complete', () => {
    window.ReactNativeWebView.postMessage('splash-done');
  });
  true;
`;

<WebView
  source={require('./wint-splash-screen-navy.html')}  // bundle the file
  injectedJavaScript={INJECTED}
  onMessage={(e) => {
    if (e.nativeEvent.data === 'splash-done') goToHome();
  }}
/>
```

### Match the app theme automatically
Ship both files and pick at runtime:

```js
const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const splash = dark ? 'wint-splash-screen-navy.html'
                    : 'wint-splash-screen-light.html';
```

---

## 4. Tunables

Open the file and edit the **CONFIG block** at the top of the `<script>`:

```js
var SPEED    = 1.2;    // playback rate (1.2 = design sign-off — leave as is)
var HOLD_MS  = 650;    // pause on the finished logo before firing "complete"
var AUTOPLAY = true;   // false = don't auto-start; call window.wintSplash.play()
```

- **Make the transition snappier/slower:** lower/raise `HOLD_MS`.
- **Control start timing yourself:** set `AUTOPLAY = false`, then call
  `window.wintSplash.play()` when your assets are ready.
- **Speed** is locked at 1.2× per sign-off; change only if design re-approves.

---

## 5. Accessibility

Respects `prefers-reduced-motion: reduce` — users with that setting see the
final logo (no motion), then the `wint-splash-complete` signal fires after a
short hold. No extra work needed.

---

## 6. Notes for testing

- Screenshot/thumbnail tools that re-render the DOM (rather than capture pixels)
  show the animation as **blank** — this is expected. View the file in a real
  browser to see it play.
- The splash is full-bleed and centered; it scales to any viewport
  (`width: min(56vw, 300px)` for the logo).

---

_The shipped build uses the **Assemble** animation. (Earlier explorations—Assemble 2,
Draw, Rise, Form, Fill—lived in a separate workbench file and are not part of this kit.)_
