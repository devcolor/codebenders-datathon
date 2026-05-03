/** Nav and deep links — safe to import from client components. */

export const GLOSSARY_HREF = "/glossary" as const

/**
 * Source of truth for topic groupings on the glossary page.
 * `METRIC_GLOSSARY_INDEX_SLUGS` (and deprecated `DASHBOARD_KPI_GLOSSARY_SLUGS`) are
 * derived from this list; every `##` section in `content/metric-glossary.md` must
 * stay in sync (see `lib/__tests__/metric-glossary-coverage.test.ts`).
 */
const METRIC_GLOSSARY_TOPIC_SECTIONS_SOURCE = [
  {
    id: "retention",
    label: "Retention, risk & predictions",
    slugOrder: [
      "overall-retention-rate",
      "avg-predicted-retention",
      "students-at-high-critical-risk",
    ] as const,
  },
  {
    id: "completion",
    label: "Completion & course success",
    slugOrder: ["avg-course-completion"] as const,
  },
  {
    id: "charts",
    label: "Charts & composite views",
    slugOrder: [
      "risk-alert-distribution",
      "retention-risk-funnel",
      "readiness-assessment",
    ] as const,
  },
] as const

export type MetricGlossarySlug =
  (typeof METRIC_GLOSSARY_TOPIC_SECTIONS_SOURCE)[number]["slugOrder"][number]

/** @deprecated Use `MetricGlossarySlug` */
export type DashboardKpiGlossarySlug = MetricGlossarySlug

export function metricGlossaryEntryHref(slug: MetricGlossarySlug): string {
  return `${GLOSSARY_HREF}#${slug}`
}

export const METRIC_GLOSSARY_INDEX_SLUGS: readonly MetricGlossarySlug[] =
  METRIC_GLOSSARY_TOPIC_SECTIONS_SOURCE.flatMap((topic) => [...topic.slugOrder])

/** @deprecated Use `METRIC_GLOSSARY_INDEX_SLUGS` */
export const DASHBOARD_KPI_GLOSSARY_SLUGS = METRIC_GLOSSARY_INDEX_SLUGS

export const GLOSSARY_TOPIC_SECTIONS: {
  id: string
  label: string
  slugOrder: readonly MetricGlossarySlug[]
}[] = METRIC_GLOSSARY_TOPIC_SECTIONS_SOURCE.map((topic) => ({
  id: topic.id,
  label: topic.label,
  slugOrder: topic.slugOrder,
}))
