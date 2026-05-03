/** Nav and deep links — safe to import from client components. */

export const GLOSSARY_HREF = "/glossary" as const

/**
 * Source of truth for topic groupings and KPI slug order on the glossary page.
 * `DASHBOARD_KPI_GLOSSARY_SLUGS` is derived from this list; every `##` section in
 * `content/metric-glossary.md` must stay in sync (see
 * `lib/__tests__/metric-glossary-coverage.test.ts`).
 */
const GLOSSARY_TOPIC_SECTIONS_RAW = [
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
] as const

export type DashboardKpiGlossarySlug =
  (typeof GLOSSARY_TOPIC_SECTIONS_RAW)[number]["slugOrder"][number]

export const DASHBOARD_KPI_GLOSSARY_SLUGS: readonly DashboardKpiGlossarySlug[] =
  GLOSSARY_TOPIC_SECTIONS_RAW.flatMap((topic) => [...topic.slugOrder])

export const GLOSSARY_TOPIC_SECTIONS: {
  id: string
  label: string
  slugOrder: readonly DashboardKpiGlossarySlug[]
}[] = GLOSSARY_TOPIC_SECTIONS_RAW.map((topic) => ({
  id: topic.id,
  label: topic.label,
  slugOrder: topic.slugOrder,
}))
