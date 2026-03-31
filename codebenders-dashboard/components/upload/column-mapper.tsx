"use client"

import { useState } from "react"
import type { ColumnMapping, UploadSchema } from "@/lib/upload-schemas"

interface ColumnMapperProps {
  columns: ColumnMapping[]
  schema: UploadSchema | null
  onMappingChange: (columns: ColumnMapping[]) => void
}

export function ColumnMapper({ columns, schema, onMappingChange }: ColumnMapperProps) {
  const [showAll, setShowAll] = useState(false)

  const matched = columns.filter((c) => c.status === "matched")
  const unmapped = columns.filter((c) => c.status === "unmapped")

  const availableTargets = schema
    ? schema.columns
        .map((c) => c.name)
        .filter((name) => !columns.some((col) => col.mappedTo === name))
    : []

  function handleRemap(header: string, newTarget: string | null) {
    const updated = columns.map((col) =>
      col.header === header
        ? { ...col, mappedTo: newTarget, status: (newTarget ? "matched" : "unmapped") as "matched" | "unmapped" }
        : col
    )
    onMappingChange(updated)
  }

  return (
    <div className="border rounded-lg overflow-hidden text-sm">
      <div className="grid grid-cols-[1fr_24px_1fr_80px] gap-2 px-4 py-2.5 bg-muted font-semibold border-b">
        <span>File Column</span>
        <span />
        <span>Maps To</span>
        <span>Status</span>
      </div>

      {unmapped.map((col) => (
        <div
          key={col.header}
          className="grid grid-cols-[1fr_24px_1fr_80px] gap-2 px-4 py-2 border-b bg-amber-50/50 items-center"
        >
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate">
            {col.header}
          </code>
          <span className="text-muted-foreground">→</span>
          <select
            className="text-xs border border-amber-400 rounded px-2 py-1 bg-white"
            value={col.mappedTo ?? ""}
            onChange={(e) => handleRemap(col.header, e.target.value || null)}
          >
            <option value="">— select or skip —</option>
            {availableTargets.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-center">
            unmapped
          </span>
        </div>
      ))}

      {matched.length > 0 && !showAll && (
        <button
          className="w-full px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 text-center"
          onClick={() => setShowAll(true)}
        >
          + {matched.length} matched columns (click to expand)
        </button>
      )}

      {showAll &&
        matched.map((col) => (
          <div
            key={col.header}
            className="grid grid-cols-[1fr_24px_1fr_80px] gap-2 px-4 py-2 border-b items-center"
          >
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate">
              {col.header}
            </code>
            <span className="text-muted-foreground">→</span>
            <span className="text-xs text-green-700">{col.mappedTo}</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded text-center">
              matched
            </span>
          </div>
        ))}

      {showAll && matched.length > 0 && (
        <button
          className="w-full px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 text-center"
          onClick={() => setShowAll(false)}
        >
          Collapse matched columns
        </button>
      )}
    </div>
  )
}
