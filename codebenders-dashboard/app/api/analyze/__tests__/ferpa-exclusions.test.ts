import { describe, it, expect } from "vitest"
import { inspectSelectForFerpaExclusions } from "@/lib/sql-inspector"

const excluded = ["Student_GUID", "student_guid"] as const

describe("inspectSelectForFerpaExclusions", () => {
  it("happy path: cohort aggregate without GUID in SELECT", () => {
    const sql = `SELECT "Cohort", AVG("Retention") FROM student_level_with_predictions GROUP BY "Cohort"`
    expect(inspectSelectForFerpaExclusions(sql, excluded)).toEqual({ ok: true })
  })

  it("allows GUID only in WHERE", () => {
    const sql = `SELECT COUNT(*) FROM student_level_with_predictions WHERE "Student_GUID" = 'foo'`
    expect(inspectSelectForFerpaExclusions(sql, excluded)).toEqual({ ok: true })
  })

  it("rejects direct GUID projection", () => {
    const sql = `SELECT "Student_GUID", "Cohort" FROM student_level_with_predictions`
    const r = inspectSelectForFerpaExclusions(sql, excluded)
    expect(r).toEqual({ ok: false, violation: "Student_GUID" })
  })

  it("rejects aliased GUID projection", () => {
    const sql = `SELECT "Student_GUID" AS sid FROM student_level_with_predictions`
    const r = inspectSelectForFerpaExclusions(sql, excluded)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.violation).toBe("Student_GUID")
  })

  it("rejects SELECT *", () => {
    const sql = `SELECT * FROM student_level_with_predictions`
    const r = inspectSelectForFerpaExclusions(sql, excluded)
    expect(r).toEqual({ ok: false, violation: "*" })
  })

  it("allows SELECT * when exclusion list is empty", () => {
    expect(inspectSelectForFerpaExclusions(`SELECT * FROM t`, [])).toEqual({ ok: true })
  })
})
