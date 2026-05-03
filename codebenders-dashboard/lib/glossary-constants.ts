/** Nav and deep links — safe to import from client components. */

export const GLOSSARY_HREF = "/glossary" as const

/**
 * Every slug under `##` in `content/metric-glossary.md` for dashboard KPIs must stay in sync
 * (see `lib/__tests__/metric-glossary-coverage.test.ts`).
 */
export const DASHBOARD_KPI_GLOSSARY_SLUGS = [
  "overall-retention-rate",
  "avg-predicted-retention",
  "students-at-high-critical-risk",
  "avg-course-completion",
] as const

export type DashboardKpiGlossarySlug = (typeof DASHBOARD_KPI_GLOSSARY_SLUGS)[number]

export const GLOSSARY_TOPIC_SECTIONS: {
  id: string
  label: string
  slugOrder: readonly DashboardKpiGlossarySlug[]
}[] = [
  {
    id: "retention",
    label: "Retention, risk & predictions",
    slugOrder: [
      "overall-retention-rate",
      "avg-predicted-retention",
      "students-at-high-critical-risk",
    ],
  },
  {
    id: "completion",
    label: "Completion & course success",
    slugOrder: ["avg-course-completion"],
  },
]
