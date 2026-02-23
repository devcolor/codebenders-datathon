"use client"

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
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <span className="text-sm font-semibold">Recent Queries</span>
        <a
          href="/api/query-history/export"
          download="query-audit-log.csv"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Export
        </a>
      </div>

      {/* Scrollable list */}
      <ul className="flex-1 overflow-y-auto divide-y divide-border">
        {entries.length === 0 ? (
          <li className="px-4 py-6 text-xs text-muted-foreground text-center">
            No queries yet
          </li>
        ) : (
          entries.map((entry) => {
            const truncated = entry.prompt.length > 55
              ? entry.prompt.slice(0, 55) + "…"
              : entry.prompt

            return (
              <li key={entry.id} className="px-4 py-3">
                <button
                  onClick={() => onRerun(entry)}
                  className="w-full text-left group"
                >
                  <p
                    className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-snug"
                    title={entry.prompt}
                  >
                    {truncated}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {relativeTime(entry.timestamp)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">
                      {entry.rowCount} rows
                    </span>
                  </div>
                </button>
              </li>
            )
          })
        )}
      </ul>

      {/* Pinned footer */}
      {entries.length > 0 && (
        <div className="shrink-0 px-4 py-2 border-t">
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear history
          </button>
        </div>
      )}
    </div>
  )
}
