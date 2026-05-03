import type { MetricGlossarySlug } from "@/lib/glossary-constants"

/**
 * Plain-English lines from `content/metric-glossary.md` (## sections).
 * Keep in sync when glossary changes; used for chart PNG/PDF captions.
 */
export const CHART_EXPORT_GLOSSARY_PLAIN: Record<MetricGlossarySlug, string> = {
  "overall-retention-rate":
    'Share of students in the selected cohort who are still enrolled (or completed) one year later — a common "year-to-year" retention view for the students you are filtering.',
  "avg-predicted-retention":
    "Average of the model's estimated probability (0-100%) that each student in the filtered set will retain — not the same as historical retention above.",
  "students-at-high-critical-risk":
    "Count of students whose composite risk score places them in the HIGH or URGENT alert bands used for intervention triage.",
  "avg-course-completion":
    "Credits successfully completed divided by credits attempted, expressed as a percentage, aggregated across students in the filter.",
  "risk-alert-distribution":
    "Pie chart of students grouped by composite risk alert band (LOW, MODERATE, HIGH, URGENT) used for triage — not the same as the retention-probability-only funnel chart.",
  "retention-risk-funnel":
    "Horizontal bar chart of students by model retention risk category (Critical / High / Moderate / Low) from predicted retention probability alone.",
  "readiness-assessment":
    "PDP-aligned readiness index — composite score and High / Medium / Low bands summarizing academic, engagement, and ML-risk components for the filtered cohort.",
}

const SENTENCE_END = /(?<=[.!?])\s+/

/** Up to two sentences for slide-friendly captions. */
export function getChartExportBlurb(slug: MetricGlossarySlug): string {
  const text = CHART_EXPORT_GLOSSARY_PLAIN[slug]
  const parts = text.split(SENTENCE_END).filter(Boolean)
  return parts.slice(0, 2).join(" ")
}
