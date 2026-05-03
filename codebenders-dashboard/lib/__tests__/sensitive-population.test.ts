import { describe, expect, it } from "vitest"
import { findSensitiveMlKeysReferencedInSql, normalizeExcludedKeys } from "@/lib/sensitive-population"

describe("findSensitiveMlKeysReferencedInSql", () => {
  it("detects quoted identifiers", () => {
    expect(findSensitiveMlKeysReferencedInSql(`SELECT "Race", "Cohort" FROM student_level_with_predictions`)).toEqual([
      "Race",
    ])
  })

  it("detects bare identifiers", () => {
    expect(findSensitiveMlKeysReferencedInSql(`SELECT Ethnicity FROM t`)).toEqual(["Ethnicity"])
  })

  it("returns sorted unique keys", () => {
    const sql = `WHERE "Gender" = 'F' AND Pell_Status_First_Year = 1`
    expect(findSensitiveMlKeysReferencedInSql(sql)).toEqual(["Gender", "Pell_Status_First_Year"])
  })
})

describe("normalizeExcludedKeys", () => {
  it("filters unknown keys", () => {
    expect(normalizeExcludedKeys(["Race", "NotAFeature", "Race"])).toEqual(["Race"])
  })
})
