import { describe, it, expect } from "vitest"
import { parseFileBuffer, validateFileSize, getFileType } from "../upload-parser"

describe("getFileType", () => {
  it("returns csv for .csv files", () => {
    expect(getFileType("data.csv")).toBe("csv")
  })

  it("returns xlsx for .xlsx files", () => {
    expect(getFileType("data.xlsx")).toBe("xlsx")
  })

  it("returns null for unsupported extensions", () => {
    expect(getFileType("data.pdf")).toBeNull()
    expect(getFileType("data.json")).toBeNull()
  })

  it("handles uppercase extensions", () => {
    expect(getFileType("DATA.CSV")).toBe("csv")
    expect(getFileType("DATA.XLSX")).toBe("xlsx")
  })
})

describe("validateFileSize", () => {
  it("returns true for files under 50MB", () => {
    expect(validateFileSize(1024 * 1024)).toBe(true)
    expect(validateFileSize(50 * 1024 * 1024 - 1)).toBe(true)
  })

  it("returns false for files at or over 50MB", () => {
    expect(validateFileSize(50 * 1024 * 1024)).toBe(false)
    expect(validateFileSize(100 * 1024 * 1024)).toBe(false)
  })
})

describe("parseFileBuffer", () => {
  it("parses CSV content into headers and rows", async () => {
    const csv = "Name,Age,City\nAlice,30,Mobile\nBob,25,Birmingham\n"
    const buffer = Buffer.from(csv)
    const result = await parseFileBuffer(buffer, "csv")

    expect(result.headers).toEqual(["Name", "Age", "City"])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual({ Name: "Alice", Age: "30", City: "Mobile" })
    expect(result.rows[1]).toEqual({ Name: "Bob", Age: "25", City: "Birmingham" })
  })

  it("handles CSV with quoted fields containing commas", async () => {
    const csv = 'Name,Description\nAlice,"Has, commas"\n'
    const buffer = Buffer.from(csv)
    const result = await parseFileBuffer(buffer, "csv")

    expect(result.rows[0].Description).toBe("Has, commas")
  })

  it("respects maxRows parameter", async () => {
    const csv = "X\na\nb\nc\nd\ne\n"
    const buffer = Buffer.from(csv)
    const result = await parseFileBuffer(buffer, "csv", 3)

    expect(result.rows).toHaveLength(3)
    expect(result.totalRows).toBe(5)
  })

  it("trims whitespace from headers", async () => {
    const csv = " Name , Age \nAlice,30\n"
    const buffer = Buffer.from(csv)
    const result = await parseFileBuffer(buffer, "csv")

    expect(result.headers).toEqual(["Name", "Age"])
  })
})
