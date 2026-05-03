import { describe, expect, it } from "vitest"
import { computeUploadDiff, serializeUploadValidationReportCsv } from "@/lib/upload-validation-report"

describe("upload validation report (#110)", () => {
  it("computeUploadDiff returns null without a baseline", () => {
    expect(
      computeUploadDiff({ inserted: 10, skipped: 1, errorCount: 2 }, null)
    ).toBeNull()
  })

  it("computeUploadDiff flags large swings in inserted rows", () => {
    const diff = computeUploadDiff(
      { inserted: 100, skipped: 0, errorCount: 0 },
      {
        id: 1,
        filename: "prior.csv",
        rowsInserted: 40,
        rowsSkipped: 0,
        errorCount: 0,
        uploadedAt: "2026-05-01T12:00:00.000Z",
      }
    )
    expect(diff).not.toBeNull()
    expect(diff!.rowsInsertedDelta).toBe(60)
    expect(diff!.percentInsertedChange).toBe(150)
    expect(diff!.anomalyLargeSwing).toBe(true)
  })

  it("serializeUploadValidationReportCsv includes summary and error rows", () => {
    const csv = serializeUploadValidationReportCsv({
      filename: "t.csv",
      schemaLabel: "Student",
      uploadId: 42,
      totalRowsInFile: 100,
      inserted: 90,
      skipped: 10,
      errorCount: 1,
      errors: [{ row: 5, column: "gpa", message: "invalid" }],
      diff: null,
      reportGeneratedAt: "2026-05-03T12:00:00.000Z",
    })
    expect(csv).toContain("# Upload validation report")
    expect(csv).toContain("# Upload ID,42")
    expect(csv).toContain("row,column,message")
    expect(csv).toContain("5,gpa,invalid")
  })
})
