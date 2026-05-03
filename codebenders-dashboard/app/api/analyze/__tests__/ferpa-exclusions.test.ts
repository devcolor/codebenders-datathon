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

  const rejections: { title: string; sql: string; violation: string }[] = [
    {
      title: "direct GUID projection",
      sql: `SELECT "Student_GUID", "Cohort" FROM student_level_with_predictions`,
      violation: "Student_GUID",
    },
    {
      title: "aliased GUID projection",
      sql: `SELECT "Student_GUID" AS sid FROM student_level_with_predictions`,
      violation: "Student_GUID",
    },
    {
      title: "SELECT *",
      sql: `SELECT * FROM student_level_with_predictions`,
      violation: "*",
    },
  ]

  for (const { title, sql, violation } of rejections) {
    it(`rejects ${title}`, () => {
      expect(inspectSelectForFerpaExclusions(sql, excluded)).toEqual({
        ok: false,
        violation,
      })
    })
  }

  it("allows SELECT * when exclusion list is empty", () => {
    expect(inspectSelectForFerpaExclusions(`SELECT * FROM t`, [])).toEqual({ ok: true })
  })
})
