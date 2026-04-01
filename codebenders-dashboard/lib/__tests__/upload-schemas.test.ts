import { describe, it, expect } from "vitest"
import {
  normalizeHeader,
  detectSchema,
  mapColumns,
  SCHEMAS,
} from "../upload-schemas"

describe("normalizeHeader", () => {
  it("lowercases and replaces spaces with underscores", () => {
    expect(normalizeHeader("Cohort Term")).toBe("cohort_term")
  })

  it("trims whitespace", () => {
    expect(normalizeHeader("  Student_GUID  ")).toBe("student_guid")
  })

  it("replaces hyphens with underscores", () => {
    expect(normalizeHeader("Co-requisite Course")).toBe("co_requisite_course")
  })

  it("collapses multiple separators", () => {
    expect(normalizeHeader("Some   Weird--Header")).toBe("some_weird_header")
  })
})

describe("detectSchema", () => {
  it("detects PDP cohort AR file from its headers", () => {
    const headers = [
      "Student_GUID", "Cohort", "Cohort_Term", "Enrollment_Type",
      "Retention", "Persistence", "GPA_Group_Year_1",
      "Gateway_Math_Status", "Gateway_English_Status",
      "Number_of_Credits_Attempted_Year_1",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("pdp_cohort_ar")
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it("detects PDP cohort submission file from spaced headers", () => {
    const headers = [
      "Student ID", "Cohort", "Cohort Term", "First Name", "Last Name",
      "Date of Birth", "Enrollment Type", "Math Placement",
      "English Placement", "Gateway Math Status",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("pdp_cohort_submission")
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it("detects course AR file", () => {
    const headers = [
      "Student_GUID", "Course_Prefix", "Course_Number", "Grade",
      "Academic_Year", "Academic_Term", "Course_Name",
      "Number_of_Credits_Attempted", "Number_of_Credits_Earned",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("course_ar")
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it("detects course submission file", () => {
    const headers = [
      "Student ID", "Academic Year", "Academic Term",
      "Course Prefix", "Course Number", "Grade",
      "Course Name", "Course CIP", "Section ID",
      "Semester/Session GPA", "Overall GPA",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("course_submission")
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it("detects ML predictions file", () => {
    const headers = [
      "student_guid", "prediction_type", "prediction_value",
      "model_version", "confidence_score",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("ml_predictions")
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it("returns null schema with low confidence for unknown headers", () => {
    const headers = ["foo", "bar", "baz", "qux"]
    const result = detectSchema(headers)
    expect(result.schema).toBeNull()
    expect(result.confidence).toBeLessThan(0.3)
  })

  it("handles mixed casing headers", () => {
    const headers = [
      "STUDENT_GUID", "cohort", "COHORT_TERM", "enrollment_type",
      "retention", "PERSISTENCE", "gpa_group_year_1",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("pdp_cohort_ar")
  })

  it("does not confidently detect schema from a small header subset", () => {
    const headers = ["student_guid", "cohort", "grade"]
    const result = detectSchema(headers)
    expect(result.confidence).toBeLessThan(0.6)
  })
})

describe("mapColumns", () => {
  it("maps matched headers to canonical column names", () => {
    const headers = ["Student_GUID", "Cohort_Term", "Unknown_Col"]
    const schema = SCHEMAS.find((s) => s.id === "pdp_cohort_ar")!
    const result = mapColumns(headers, schema)

    const matched = result.filter((c) => c.status === "matched")
    const unmapped = result.filter((c) => c.status === "unmapped")

    expect(matched.length).toBe(2)
    expect(matched[0].mappedTo).toBe("student_guid")
    expect(unmapped.length).toBe(1)
    expect(unmapped[0].header).toBe("Unknown_Col")
  })
})
