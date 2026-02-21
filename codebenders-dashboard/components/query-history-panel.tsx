"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { HistoryEntry } from "@/lib/types"

function relativeTime(isoTimestamp: string): string {
  const now = Date.now()
  const then = new Date(isoTimestamp).getTime()
  const diffMs = now - then

  if (diffMs < 0) return "just now"

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return seconds <= 1 ? "just now" : `${seconds} seconds ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return days === 1 ? "1 day ago" : `${days} days ago`

  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`

  const years = Math.floor(months / 12)
  return years === 1 ? "1 year ago" : `${years} years ago`
}

interface QueryHistoryPanelProps {
  entries: HistoryEntry[]
  onRerun: (entry: HistoryEntry) => void
  onClear: () => void
}

export function QueryHistoryPanel({ entries, onRerun, onClear }: QueryHistoryPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Recent Queries</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {/* Entries arrive pre-sorted: newest first from page.tsx */}
          {entries.map((entry) => {
            const truncated =
              entry.prompt.length > 60
                ? entry.prompt.slice(0, 60) + "…"
                : entry.prompt

            return (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 px-6 py-3"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(entry.timestamp)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entry.institution}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.rowCount} rows
                    </span>
                  </div>
                  <span
                    className="text-sm truncate"
                    title={entry.prompt}
                  >
                    {truncated}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRerun(entry)}
                  className="shrink-0"
                >
                  Re-run
                </Button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
