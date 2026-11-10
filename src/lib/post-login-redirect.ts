// Preserves a deep-link destination across the OAuth round-trip: an invite (/join/<token>) or an
// AI client's consent request (/oauth/consent?authorization_id=…). sessionStorage shares the PKCE
// verifier's lifetime (same tab, survives the cross-site redirect), and the prefix check on
// consume is the open-redirect guard: no other stored value may hijack the post-login navigation.
const STORAGE_KEY = 'cadence.postLoginRedirect'

// Both are in-app paths. The consent prefix includes the '?' so '/oauth/consent-anything' or a
// path that merely starts with the word cannot pass.
const ALLOWED_PREFIXES = ['/join/', '/oauth/consent?']

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
    if (value === null || !ALLOWED_PREFIXES.some((p) => value.startsWith(p))) return null
    return value
  } catch {
    return null
  }
}
