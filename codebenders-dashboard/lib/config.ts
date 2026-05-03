/**
 * Deployment flags. `FORCE_DIRECT_DB` is inlined for client bundles via `next.config.ts` `env`.
 * Default when unset: not "true" → hardened mode off (preserves legacy external API path).
 */

const SYNTEX_DATA_API = /https?:\/\/schools\.syntex-ai\.com\//i

export function isForceDirectDb(): boolean {
  return process.env.FORCE_DIRECT_DB === "true"
}

/**
 * Fail-closed guard: call before any fetch to a non-institutional analysis-ready host.
 */
export function assertExternalDataApiAllowed(url: string): void {
  if (!url) return
  if (isForceDirectDb() && SYNTEX_DATA_API.test(url)) {
    throw new Error("FORCE_DIRECT_DB is set; external data API blocked")
  }
}

let probeLogged = false

/** Server startup: log once when hardening is active (see instrumentation.ts). */
export function logForceDirectDbStartupProbe(): void {
  if (probeLogged) return
  probeLogged = true
  if (isForceDirectDb()) {
    console.log("[transparency] FORCE_DIRECT_DB=true; external data flows disabled")
  }
}
