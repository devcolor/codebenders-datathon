"use client"

import Link from "next/link"
import {
  metricGlossaryEntryHref,
  type MetricGlossarySlug,
} from "@/lib/glossary-constants"

const LINK_CLASS =
  "text-primary underline-offset-4 hover:underline text-xs font-medium"

interface GlossaryMetricEntryLinkProps {
  slug: MetricGlossarySlug
}

export function GlossaryMetricEntryLink({ slug }: GlossaryMetricEntryLinkProps) {
  return (
    <p className="mt-3">
      <Link href={metricGlossaryEntryHref(slug)} className={LINK_CLASS}>
        Full glossary entry (PDP / IPEDS cross-walk) →
      </Link>
    </p>
  )
}
