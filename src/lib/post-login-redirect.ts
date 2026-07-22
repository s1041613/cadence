// Preserves the /join/<token> destination across the OAuth round-trip. sessionStorage shares the
// PKCE verifier's lifetime (same tab, survives the cross-site redirect), and the /join/ prefix
// check on consume is the open-redirect guard: no other stored value may hijack the post-login
// navigation.
const STORAGE_KEY = 'cadence.postLoginRedirect'

export function savePostLoginRedirect(path: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, path)
  } catch {
    // Storage unavailable (private mode restrictions) — the user just lands on '/' after login.
  }
}

export function consumePostLoginRedirect(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    if (value === null || !value.startsWith('/join/')) return null
    return value
  } catch {
    return null
  }
}
