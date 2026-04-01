"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

interface UploadSummaryProps {
  filename: string
  schemaLabel: string
  inserted: number
  skipped: number
  errorCount: number
  onUploadAnother: () => void
  onViewHistory: () => void
}

export function UploadSummary({
  filename,
  schemaLabel,
  inserted,
  skipped,
  errorCount,
  onUploadAnother,
  onViewHistory,
}: UploadSummaryProps) {
  return (
    <div className="text-center space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-xl p-8">
        <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-3" />
        <h2 className="text-lg font-bold">Upload Complete</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {filename} — {schemaLabel}
        </p>
        <div className="flex justify-center gap-8 mt-6 text-sm">
          <div>
            <span className="text-2xl font-bold text-green-600">{inserted}</span>
            <br />
            <span className="text-muted-foreground">inserted</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-amber-600">{skipped}</span>
            <br />
            <span className="text-muted-foreground">skipped</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-red-600">{errorCount}</span>
            <br />
            <span className="text-muted-foreground">errors</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={onUploadAnother}>
          Upload Another File
        </Button>
        <Button variant="outline" onClick={onViewHistory}>
          View Upload History
        </Button>
      </div>
    </div>
  )
}
