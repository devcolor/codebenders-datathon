import { describe, expect, it } from "vitest"
import { GLOSSARY_TOPIC_SECTIONS, METRIC_GLOSSARY_INDEX_SLUGS } from "@/lib/glossary-constants"
import { CHART_EXPORT_GLOSSARY_PLAIN } from "@/lib/chart-export-glossary"
import { parseGlossaryEntries, readMetricGlossaryMarkdown } from "@/lib/metric-glossary"

describe("metric glossary coverage (#105 / #124)", () => {
  it("includes every indexed slug in metric-glossary.md", () => {
    const md = readMetricGlossaryMarkdown()
    const entries = parseGlossaryEntries(md)
    for (const slug of METRIC_GLOSSARY_INDEX_SLUGS) {
      expect(entries[slug], `missing ## ${slug} in content/metric-glossary.md`).toBeTruthy()
      expect(entries[slug]!.length).toBeGreaterThan(20)
    }
  })

  it("topic sections list each indexed slug exactly once in index order", () => {
    const listedSlugs = GLOSSARY_TOPIC_SECTIONS.flatMap((t) => [...t.slugOrder])
    expect(listedSlugs).toEqual([...METRIC_GLOSSARY_INDEX_SLUGS])
  })

  it("chart export blurbs cover every indexed glossary slug (#106)", () => {
    for (const slug of METRIC_GLOSSARY_INDEX_SLUGS) {
      const plain = CHART_EXPORT_GLOSSARY_PLAIN[slug]
      expect(plain, `add Plain English to chart-export-glossary for ${slug}`).toBeTruthy()
      expect(plain!.length).toBeGreaterThan(20)
    }
  })
})
