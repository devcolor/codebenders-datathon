import Papa from "papaparse"
import * as XLSX from "xlsx"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export interface ParseResult {
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
}

export function getFileType(filename: string): "csv" | "xlsx" | null {
  const ext = filename.toLowerCase().split(".").pop()
  if (ext === "csv") return "csv"
  if (ext === "xlsx" || ext === "xls") return "xlsx"
  return null
}

export function validateFileSize(bytes: number): boolean {
  return bytes < MAX_FILE_SIZE
}

export async function parseFileBuffer(
  buffer: Buffer,
  fileType: "csv" | "xlsx",
  maxRows?: number
): Promise<ParseResult> {
  if (fileType === "xlsx") {
    return parseXlsx(buffer, maxRows)
  }
  return parseCsv(buffer, maxRows)
}

function parseCsv(buffer: Buffer, maxRows?: number): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const text = buffer.toString("utf-8")

    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    })

    if (result.errors.length > 0 && result.data.length === 0) {
      reject(new Error(`CSV parse error: ${result.errors[0].message}`))
      return
    }

    const headers = result.meta.fields ?? []
    const allRows = result.data
    const rows = maxRows ? allRows.slice(0, maxRows) : allRows

    resolve({ headers, rows, totalRows: allRows.length })
  })
}

function parseXlsx(buffer: Buffer, maxRows?: number): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        reject(new Error("Excel file has no sheets"))
        return
      }

      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
        raw: false,
      })

      if (jsonData.length === 0) {
        resolve({ headers: [], rows: [], totalRows: 0 })
        return
      }

      const headers = Object.keys(jsonData[0]).map((h) => h.trim())
      const trimmedRows = jsonData.map((row) => {
        const trimmed: Record<string, string> = {}
        for (const [key, value] of Object.entries(row)) {
          trimmed[key.trim()] = String(value)
        }
        return trimmed
      })
      const rows = maxRows ? trimmedRows.slice(0, maxRows) : trimmedRows

      resolve({ headers, rows, totalRows: jsonData.length })
    } catch (err) {
      reject(new Error(`Excel parse error: ${(err as Error).message}`))
    }
  })
}
