import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { canAccess, type Role } from "@/lib/roles"
import { fetchSensitiveMlSettings } from "@/lib/sensitive-ml-settings-db"

/** Public to all authenticated roles — used for NLQ warnings and dashboard copy (#109). */
export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/sensitive-context", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const pool = getPool()
    const settings = await fetchSensitiveMlSettings(pool)
    return NextResponse.json({
      lowSampleThreshold: settings.lowSampleThreshold,
      excludedMlFeatureKeys: settings.excludedMlFeatureKeys,
    })
  } catch (error) {
    console.error("sensitive-context GET:", error)
    return NextResponse.json(
      { error: "Failed to load context", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
