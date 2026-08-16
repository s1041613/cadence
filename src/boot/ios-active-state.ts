import { defineBoot } from '#q-app'

/*
 * Enables CSS :active on iOS Safari.
 *
 * WebKit only dispatches the active state for elements inside a subtree that
 * carries a touch listener. Without one, every :active rule in the app is dead
 * on the phone while working normally on desktop — the styling looks correct in
 * review and does nothing in the user's hand.
 *
 * The usual shorthand for this is `<body ontouchstart="">` in index.html, but
 * the page CSP is `script-src 'self'` with no 'unsafe-inline' (see index.html),
 * so an inline handler attribute is refused by the browser and the fix silently
 * does not apply. Registering from bundled JS is the same signal to WebKit
 * without contradicting the CSP.
 *
 * The listener is deliberately empty and passive: it never blocks scrolling and
 * exists purely so the active state is delivered.
 */

export default defineBoot(() => {
  document.body.addEventListener('touchstart', () => {}, { passive: true })
})
