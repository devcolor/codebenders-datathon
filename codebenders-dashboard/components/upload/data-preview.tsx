"use client"

interface DataPreviewProps {
  headers: string[]
  rows: Record<string, string>[]
}

export function DataPreview({ headers, rows }: DataPreviewProps) {
  if (rows.length === 0) return null

  const displayHeaders = headers.slice(0, 8)
  const hasMore = headers.length > 8

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Data Preview</h3>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted">
              {displayHeaders.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold border-b whitespace-nowrap">
                  {h}
                </th>
              ))}
              {hasMore && (
                <th className="px-3 py-2 text-left font-semibold border-b text-muted-foreground">
                  +{headers.length - 8} more
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                {displayHeaders.map((h) => (
                  <td key={h} className="px-3 py-1.5 border-b whitespace-nowrap font-mono max-w-[200px] truncate">
                    {row[h] ?? ""}
                  </td>
                ))}
                {hasMore && (
                  <td className="px-3 py-1.5 border-b text-muted-foreground">…</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
