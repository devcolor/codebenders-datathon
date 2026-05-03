export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logForceDirectDbStartupProbe } = await import("./lib/config")
    logForceDirectDbStartupProbe()
  }
}
