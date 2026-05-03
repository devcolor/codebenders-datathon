import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { assertExternalDataApiAllowed, isForceDirectDb } from "../config"

describe("FORCE_DIRECT_DB config", () => {
  const prev = process.env.FORCE_DIRECT_DB

  beforeEach(() => {
    delete process.env.FORCE_DIRECT_DB
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.FORCE_DIRECT_DB
    else process.env.FORCE_DIRECT_DB = prev
  })

  it("isForceDirectDb is false when unset", () => {
    expect(isForceDirectDb()).toBe(false)
  })

  it("isForceDirectDb is true only for exact \"true\"", () => {
    process.env.FORCE_DIRECT_DB = "true"
    expect(isForceDirectDb()).toBe(true)
    process.env.FORCE_DIRECT_DB = "1"
    expect(isForceDirectDb()).toBe(false)
  })

  it("assertExternalDataApiAllowed allows syntex URL when not forced", () => {
    process.env.FORCE_DIRECT_DB = "false"
    expect(() =>
      assertExternalDataApiAllowed("https://schools.syntex-ai.com/bscc/analysis-ready?limit=1"),
    ).not.toThrow()
  })

  it("assertExternalDataApiAllowed throws when forced and URL is syntex", () => {
    process.env.FORCE_DIRECT_DB = "true"
    expect(() =>
      assertExternalDataApiAllowed("https://schools.syntex-ai.com/bscc/analysis-ready?limit=1"),
    ).toThrow("FORCE_DIRECT_DB is set; external data API blocked")
  })

  it("assertExternalDataApiAllowed allows http scheme", () => {
    process.env.FORCE_DIRECT_DB = "true"
    expect(() =>
      assertExternalDataApiAllowed("http://schools.syntex-ai.com/bscc/analysis-ready"),
    ).toThrow()
  })

  it("assertExternalDataApiAllowed no-ops on empty url", () => {
    process.env.FORCE_DIRECT_DB = "true"
    expect(() => assertExternalDataApiAllowed("")).not.toThrow()
  })
})
