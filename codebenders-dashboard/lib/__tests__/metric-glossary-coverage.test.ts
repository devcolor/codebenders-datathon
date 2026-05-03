import { describe, expect, it } from "vitest"
import {
  DASHBOARD_KPI_GLOSSARY_SLUGS,
  GLOSSARY_TOPIC_SECTIONS,
} from "@/lib/glossary-constants"
import { parseGlossaryEntries, readMetricGlossaryMarkdown } from "@/lib/metric-glossary"

describe("metric glossary coverage (#105)", () => {
  it("includes every dashboard KPI slug in metric-glossary.md", () => {
    const md = readMetricGlossaryMarkdown()
    const entries = parseGlossaryEntries(md)
    for (const slug of DASHBOARD_KPI_GLOSSARY_SLUGS) {
      expect(entries[slug], `missing ## ${slug} in content/metric-glossary.md`).toBeTruthy()
      expect(entries[slug]!.length).toBeGreaterThan(20)
    }
  })

  it("topic sections list each KPI slug exactly once", () => {
    const listed = GLOSSARY_TOPIC_SECTIONS.flatMap((t) => [...t.slugOrder])
    expect(listed.length).toBe(DASHBOARD_KPI_GLOSSARY_SLUGS.length)
    for (const slug of DASHBOARD_KPI_GLOSSARY_SLUGS) {
      const n = listed.filter((s) => s === slug).length
      expect(n, `slug ${slug} should appear once in GLOSSARY_TOPIC_SECTIONS`).toBe(1)
    }
  })
})
